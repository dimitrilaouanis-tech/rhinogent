"use client";

import { useEffect, useRef, useState } from "react";
import { FlowGraphCanvas2D, pos, type Node } from "./flow-graph-2d";

// WOW CENTERPIECE v4 — live token-flow network graph, now on the GPU via @cosmos.gl/graph
// (the actively-maintained successor to @cosmograph/cosmos v2+; see final report for why).
// Same deterministic polar layout as before (pos()), same steel/amber palette, same pulse
// language — just rendered with WebGL point/line shaders instead of hand-rolled 2D canvas
// paths, so it scales to far more nodes/edges at 60fps. Falls back to the retained 2D
// canvas renderer (flow-graph-2d.tsx) if WebGL is unavailable or Cosmos fails to init.

export type PulseEvent = { from: string; to: string; amount: number; key: number };

// cosmos space is a square of side `spaceSize` (config, default 4096) centered at spaceSize/2.
// pos() returns normalized [0..1]-ish coordinates around (0.5, 0.5) — scale into cosmos space.
const SPACE = 4096;
const toSpace = (u: number, v: number): [number, number] => [u * SPACE, v * SPACE];

// original 2D renderer sized dots 2.5-7px (2.5 + tokens-ratio*4.5). Cosmos point size units
// are roughly comparable "pixel-ish" units at pointSizeScale=1 (its own default point size is 4),
// so we reuse the same 2.5-7 range directly — visually matches the prior renderer 1:1 on screen.
const sizeFor = (tokens: number, maxTok: number) => 2.5 + (tokens / maxTok) * 4.5;

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function FlowGraph({ nodes, pulse }: { nodes: Node[]; pulse: PulseEvent | null }) {
  const [useFallback, setUseFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const indexRef = useRef<Map<string, number>>(new Map());
  const lastKeyRef = useRef(-1);
  const flareRafRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!webglAvailable()) {
      setUseFallback(true);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let graph: any = null;

    (async () => {
      try {
        const { Graph } = await import("@cosmos.gl/graph");
        if (disposed) return;

        const ranked = nodesRef.current.slice(0, 120);
        const maxTok = Math.max(1, ...ranked.map((r) => r.tokens));
        const idx = new Map<string, number>();
        ranked.forEach((r, i) => idx.set(r.callsign, i));
        indexRef.current = idx;

        const positions = new Float32Array(ranked.length * 2);
        const colors = new Float32Array(ranked.length * 4);
        const sizes = new Float32Array(ranked.length);
        ranked.forEach((r, i) => {
          const [u, v] = pos(r.callsign);
          const [x, y] = toSpace(u, v);
          positions[i * 2] = x;
          positions[i * 2 + 1] = y;
          const amber = i < 10;
          colors[i * 4] = amber ? 245 / 255 : 160 / 255;
          colors[i * 4 + 1] = amber ? 166 / 255 : 170 / 255;
          colors[i * 4 + 2] = amber ? 35 / 255 : 185 / 255;
          colors[i * 4 + 3] = amber ? 0.9 : 0.8;
          sizes[i] = sizeFor(r.tokens, maxTok);
        });

        // star topology: every node linked back to a virtual center (index = ranked.length),
        // matching the original renderer's center-out curved-edge look.
        const centerIdx = ranked.length;
        const centerPos: [number, number] = toSpace(0.5, 0.5);
        const allPositions = new Float32Array((ranked.length + 1) * 2);
        allPositions.set(positions);
        allPositions[centerIdx * 2] = centerPos[0];
        allPositions[centerIdx * 2 + 1] = centerPos[1];
        const allColors = new Float32Array((ranked.length + 1) * 4);
        allColors.set(colors);
        allColors[centerIdx * 4 + 3] = 0; // invisible center hub point
        const allSizes = new Float32Array(ranked.length + 1);
        allSizes.set(sizes);
        allSizes[centerIdx] = 0;

        const links = new Float32Array(ranked.length * 2);
        const linkColors = new Float32Array(ranked.length * 4);
        const linkWidths = new Float32Array(ranked.length);
        ranked.forEach((_, i) => {
          links[i * 2] = centerIdx;
          links[i * 2 + 1] = i;
          linkColors[i * 4] = 1; linkColors[i * 4 + 1] = 1; linkColors[i * 4 + 2] = 1;
          linkColors[i * 4 + 3] = 0.05; // hairline at rest, matches original rgba(255,255,255,0.05)
          linkWidths[i] = 0.5;
        });

        graph = new Graph(container, {
          backgroundColor: "transparent",
          spaceSize: SPACE,
          curvedLinks: true,
          curvedLinkWeight: 0.8,
          curvedLinkControlPointDistance: 0.4,
          pointDefaultSize: 4,
          pointSizeScale: 1,
          linkDefaultWidth: 0.5,
          linkWidthScale: 1,
          linkOpacity: 1,
          renderHoveredPointRing: false,
          enableZoom: true,
          enableDrag: false,
          fitViewOnInit: true,
          fitViewPadding: 0.15,
          scalePointsOnZoom: false,
          // gentle settle: low repulsion/gravity, higher decay so it cools down and stops
          simulationGravity: 0.1,
          simulationRepulsion: 0.4,
          simulationLinkSpring: 0.3,
          simulationLinkDistance: 40,
          simulationFriction: 0.9,
          simulationDecay: 8000,
          onPointMouseOver: (index: number, pointPosition: [number, number]) => {
            if (index === centerIdx) return;
            const r = ranked[index];
            const tip = tooltipRef.current;
            if (!r || !tip || !graph) return;
            const [sx, sy] = graph.spaceToScreenPosition(pointPosition);
            const label = `${r.callsign} · ${r.tokens.toLocaleString("en-US")}`;
            tip.textContent = label;
            tip.style.display = "block";
            const rect = container.getBoundingClientRect();
            let bx = sx + 12, by = sy - 6;
            const tw = tip.offsetWidth || 80;
            if (bx + tw > rect.width - 4) bx = sx - tw - 12;
            if (by < 4) by = sy + 12;
            tip.style.left = `${bx}px`;
            tip.style.top = `${by}px`;
          },
          onPointMouseOut: () => {
            const tip = tooltipRef.current;
            if (tip) tip.style.display = "none";
          },
        });

        graph.setPointPositions(allPositions);
        graph.setPointColors(allColors);
        graph.setPointSizes(allSizes);
        graph.setLinks(links);
        graph.setLinkColors(linkColors);
        graph.setLinkWidths(linkWidths);
        graph.render();

        graphRef.current = graph;
        setReady(true);
      } catch (err) {
        console.error("cosmos init failed, falling back to 2D canvas", err);
        setUseFallback(true);
      }
    })();

    return () => {
      disposed = true;
      if (flareRafRef.current) cancelAnimationFrame(flareRafRef.current);
      graphRef.current?.destroy?.();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pulse: light up the from/to link + flare the two endpoint points, decaying over ~1s.
  // Only runs the rAF loop while a flare is actively decaying (cosmos does not require a
  // continuous render() call once idle — it keeps drawing the last frame on its own canvas).
  useEffect(() => {
    if (!ready || !pulse || pulse.key === lastKeyRef.current) return;
    lastKeyRef.current = pulse.key;
    const graph = graphRef.current;
    const idx = indexRef.current;
    if (!graph) return;
    const fromIdx = idx.get(pulse.from);
    const toIdx = idx.get(pulse.to);
    if (fromIdx === undefined || toIdx === undefined) return;

    const ranked = nodesRef.current.slice(0, 120);
    const maxTok = Math.max(1, ...ranked.map((r) => r.tokens));
    const baseSizes = graph.getPointSizes();
    const baseColors = graph.getPointColors();
    const start = performance.now();

    if (flareRafRef.current) cancelAnimationFrame(flareRafRef.current);

    const step = () => {
      const age = (performance.now() - start) / 1000;
      const envelope = age >= 1 ? 0 : age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;

      const sizes = graph.getPointSizes();
      const colors = graph.getPointColors();
      [fromIdx, toIdx].forEach((i: number) => {
        const r = ranked[i];
        if (!r) return;
        const base = sizeFor(r.tokens, maxTok);
        sizes[i] = base * (1 + 0.2 * envelope);
        const amber = i < 10;
        colors[i * 4] = amber ? 245 / 255 : 160 / 255;
        colors[i * 4 + 1] = amber ? 166 / 255 : 170 / 255;
        colors[i * 4 + 2] = amber ? 35 / 255 : 185 / 255;
        colors[i * 4 + 3] = (amber ? 0.9 : 0.8) + 0.1 * envelope;
      });
      graph.setPointSizes(sizes);
      graph.setPointColors(colors);

      // brighten the from/to hairline link (warm near-white) while decaying
      const linkColors = graph.getLinkColors();
      const linkWidths = graph.getLinkWidths();
      linkColors[toIdx * 4] = 1; linkColors[toIdx * 4 + 1] = 246 / 255; linkColors[toIdx * 4 + 2] = 230 / 255;
      linkColors[toIdx * 4 + 3] = 0.05 + 0.4 * envelope;
      linkWidths[toIdx] = 0.5 + 2 * envelope;
      graph.setLinkColors(linkColors);
      graph.setLinkWidths(linkWidths);
      graph.render();

      if (age < 1) {
        flareRafRef.current = requestAnimationFrame(step);
      } else {
        // restore rest state exactly
        graph.setPointSizes(baseSizes);
        graph.setPointColors(baseColors);
        const restColors = graph.getLinkColors();
        const restWidths = graph.getLinkWidths();
        restColors[toIdx * 4 + 3] = 0.05;
        restWidths[toIdx] = 0.5;
        graph.setLinkColors(restColors);
        graph.setLinkWidths(restWidths);
        graph.render();
        flareRafRef.current = null;
      }
    };
    flareRafRef.current = requestAnimationFrame(step);
  }, [pulse, ready]);

  if (useFallback) {
    return <FlowGraphCanvas2D nodes={nodes} pulse={pulse} />;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: "var(--ct-border)", background: "#060607" }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 50%, #0d0d0f 0%, #060607 100%)" }}
      />
      <div ref={containerRef} className="relative h-[420px] w-full" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 hidden rounded-[2px] px-1 py-0.5 font-mono text-[11px]"
        style={{ background: "#18191a", border: "1px solid #232426", color: "rgba(234,234,234,0.95)" }}
      />
      <div className="pointer-events-none absolute left-4 top-3 font-mono text-[11px]" style={{ color: "var(--ct-green)" }}>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--ct-green)" }} />
          LIVE TOKEN-FLOW NETWORK · node size = balance · pulses = real signed transfers
        </span>
      </div>
    </div>
  );
}
