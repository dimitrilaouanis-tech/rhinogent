"use client";

import { useEffect, useRef, useState } from "react";
import { FlowGraphCanvas2D, pos, type Node } from "./flow-graph-2d";

// WOW CENTERPIECE v5 — Obsidian-style live token-flow graph on @cosmos.gl/graph.
// Round 5 changes: the GPU force simulation now RUNS (no more frozen deterministic layout),
// and the topology is REAL — edges are built from actual signed token transfers (seeded from
// the feed's txs, accumulated live as pulses arrive), not a decorative star around an
// invisible hub. Agents with no transfers float unlinked at the periphery like orphan notes.
// After a short simulation warmup the view fits to the whole graph (~10% padding) so it never
// loads pre-zoomed into the middle. 2D canvas fallback (flow-graph-2d.tsx) unchanged.

export type PulseEvent = { from: string; to: string; amount: number; key: number };
export type TxEdge = { from: string; to: string };

const SPACE = 4096;
const toSpace = (u: number, v: number): [number, number] => [u * SPACE, v * SPACE];

// same 2.5-7 "pixel-ish" size range as the original 2D renderer (see v4 notes)
const sizeFor = (tokens: number, maxTok: number) => 2.5 + (tokens / maxTok) * 4.5;

const MAX_EDGES = 600;          // perf cap — prune oldest pair beyond this
const REST_ALPHA = 0.05;        // hairline link at rest
const BASE_WIDTH = 0.5;
const widthFor = (count: number) => Math.min(BASE_WIDTH + 0.35 * (count - 1), 2.2); // grows with repeats, capped

type Edge = { a: number; b: number; count: number; linkIdx: number };

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function FlowGraph({ nodes, pulse, txs }: { nodes: Node[]; pulse: PulseEvent | null; txs?: TxEdge[] }) {
  const [useFallback, setUseFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const txsRef = useRef<TxEdge[] | undefined>(txs);
  txsRef.current = txs;
  const indexRef = useRef<Map<string, number>>(new Map());
  // undirected edge accumulator: "lo-hi" point-index pair -> Edge (insertion order = age)
  const edgesRef = useRef<Map<string, Edge>>(new Map());
  const seededRef = useRef(false);
  const lastKeyRef = useRef(-1);
  const flareRafRef = useRef<number | null>(null);
  const fittedRef = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Add/bump an undirected edge between two point indices. Returns true if the edge SET
  // changed (new pair or prune) — repeat transfers only bump count/width.
  const addEdge = (a: number, b: number): boolean => {
    if (a === b) return false;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    const edges = edgesRef.current;
    const existing = edges.get(key);
    if (existing) {
      existing.count += 1;
      return false;
    }
    edges.set(key, { a, b, count: 1, linkIdx: -1 });
    if (edges.size > MAX_EDGES) {
      const oldest = edges.keys().next().value as string | undefined;
      if (oldest !== undefined) edges.delete(oldest);
    }
    return true;
  };

  // Rebuild cosmos link arrays from the edge map (only called when the set changes or a
  // pulse needs fresh widths — never per-frame). Assigns each edge its current linkIdx.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pushLinks = (graph: any) => {
    const edges = [...edgesRef.current.values()];
    const links = new Float32Array(edges.length * 2);
    const linkColors = new Float32Array(edges.length * 4);
    const linkWidths = new Float32Array(edges.length);
    edges.forEach((e, i) => {
      e.linkIdx = i;
      links[i * 2] = e.a;
      links[i * 2 + 1] = e.b;
      linkColors[i * 4] = 1; linkColors[i * 4 + 1] = 1; linkColors[i * 4 + 2] = 1;
      linkColors[i * 4 + 3] = REST_ALPHA;
      linkWidths[i] = widthFor(e.count);
    });
    graph.setLinks(links);
    graph.setLinkColors(linkColors);
    graph.setLinkWidths(linkWidths);
  };

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
    let fitTimer: ReturnType<typeof setTimeout> | null = null;

    const fitOnce = (duration = 500) => {
      if (disposed || fittedRef.current || !graph) return;
      fittedRef.current = true;
      try { graph.fitView(duration, 0.1); } catch { /* view not ready */ }
    };

    (async () => {
      try {
        const { Graph } = await import("@cosmos.gl/graph");
        if (disposed) return;

        const ranked = nodesRef.current.slice(0, 120);
        const maxTok = Math.max(1, ...ranked.map((r) => r.tokens));
        const idx = new Map<string, number>();
        ranked.forEach((r, i) => idx.set(r.callsign, i));
        indexRef.current = idx;

        // deterministic seed positions from pos() — the force simulation takes it from here
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

        // seed the REAL topology from the feed's actual signed transfers, if the feed
        // already loaded (the effect below handles the usual case where it arrives later)
        if ((txsRef.current || []).length && !seededRef.current) {
          seededRef.current = true;
          for (const t of txsRef.current || []) {
            const a = idx.get(t.from), b = idx.get(t.to);
            if (a !== undefined && b !== undefined) addEdge(a, b);
          }
        }

        graph = new Graph(container, {
          backgroundColor: "transparent",
          spaceSize: SPACE,
          curvedLinks: true,
          curvedLinkWeight: 0.8,
          curvedLinkControlPointDistance: 0.4,
          pointDefaultSize: 4,
          pointSizeScale: 1,
          linkDefaultWidth: BASE_WIDTH,
          linkWidthScale: 1,
          linkOpacity: 1,
          renderHoveredPointRing: false,
          enableZoom: true,
          enableDrag: true,
          fitViewOnInit: false, // we fit ourselves after simulation warmup
          scalePointsOnZoom: false,
          // Obsidian-style organic settle: real force simulation, gentle forces, high
          // friction + fast decay so clusters form calmly then freeze.
          enableSimulation: true,
          simulationGravity: 0.2,
          simulationCenter: 0.4,
          simulationRepulsion: 1.0,
          simulationLinkSpring: 0.6,
          simulationLinkDistance: 18,
          simulationFriction: 0.85,
          simulationDecay: 2500,
          onSimulationEnd: () => fitOnce(500),
          onPointMouseOver: (index: number, pointPosition: [number, number]) => {
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

        graph.setPointPositions(positions);
        graph.setPointColors(colors);
        graph.setPointSizes(sizes);
        pushLinks(graph);
        graph.render();
        graph.start(1); // kick the force simulation from the seeded layout

        // fit the whole graph after warmup even if the sim hasn't fully cooled yet
        fitTimer = setTimeout(() => fitOnce(600), 900);

        graphRef.current = graph;
        setReady(true);
      } catch (err) {
        console.error("cosmos init failed, falling back to 2D canvas", err);
        setUseFallback(true);
      }
    })();

    return () => {
      disposed = true;
      if (fitTimer) clearTimeout(fitTimer);
      if (flareRafRef.current) cancelAnimationFrame(flareRafRef.current);
      graphRef.current?.destroy?.();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // late feed arrival: seed the transaction topology once the txs prop is populated
  // (matrix.tsx fetches token_feed.json after this component has already mounted)
  useEffect(() => {
    if (!ready || seededRef.current || !txs || !txs.length) return;
    seededRef.current = true;
    const graph = graphRef.current;
    const idx = indexRef.current;
    if (!graph) return;
    let changed = false;
    for (const t of txs) {
      const a = idx.get(t.from), b = idx.get(t.to);
      if (a !== undefined && b !== undefined) changed = addEdge(a, b) || changed;
    }
    if (changed) {
      pushLinks(graph);
      graph.render();
      graph.start(0.6); // let the sim pull the real clusters together
      fittedRef.current = false; // topology just materialized — allow one refit on settle
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, ready]);

  // pulse: a REAL transfer arrived — grow the edge set (new link or heavier repeat link),
  // then brighten that link + flare the two endpoints, decaying over ~1s.
  useEffect(() => {
    if (!ready || !pulse || pulse.key === lastKeyRef.current) return;
    lastKeyRef.current = pulse.key;
    const graph = graphRef.current;
    const idx = indexRef.current;
    if (!graph) return;
    const fromIdx = idx.get(pulse.from);
    const toIdx = idx.get(pulse.to);
    if (fromIdx === undefined || toIdx === undefined) return;

    // accumulate the transaction edge; rebuild link arrays only on set change or width bump
    const setChanged = addEdge(fromIdx, toIdx);
    pushLinks(graph);
    if (setChanged) graph.start(0.12); // gentle reheat so a brand-new link tugs its endpoints

    const key = fromIdx < toIdx ? `${fromIdx}-${toIdx}` : `${toIdx}-${fromIdx}`;
    const edge = edgesRef.current.get(key);
    const linkIdx = edge ? edge.linkIdx : -1;
    const restWidth = edge ? widthFor(edge.count) : BASE_WIDTH;

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

      // brighten the transaction's link (warm near-white) while decaying
      if (linkIdx >= 0) {
        const linkColors = graph.getLinkColors();
        const linkWidths = graph.getLinkWidths();
        if (linkIdx * 4 + 3 < linkColors.length) {
          linkColors[linkIdx * 4] = 1; linkColors[linkIdx * 4 + 1] = 246 / 255; linkColors[linkIdx * 4 + 2] = 230 / 255;
          linkColors[linkIdx * 4 + 3] = REST_ALPHA + 0.4 * envelope;
          linkWidths[linkIdx] = restWidth + 2 * envelope;
          graph.setLinkColors(linkColors);
          graph.setLinkWidths(linkWidths);
        }
      }
      graph.render();

      if (age < 1) {
        flareRafRef.current = requestAnimationFrame(step);
      } else {
        // restore rest state exactly
        graph.setPointSizes(baseSizes);
        graph.setPointColors(baseColors);
        if (linkIdx >= 0) {
          const restColors = graph.getLinkColors();
          const restWidths = graph.getLinkWidths();
          if (linkIdx * 4 + 3 < restColors.length) {
            restColors[linkIdx * 4 + 3] = REST_ALPHA;
            restWidths[linkIdx] = restWidth;
            graph.setLinkColors(restColors);
            graph.setLinkWidths(restWidths);
          }
        }
        graph.render();
        flareRafRef.current = null;
      }
    };
    flareRafRef.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          LIVE TOKEN-FLOW NETWORK · node size = balance · edges = real signed transfers
        </span>
      </div>
    </div>
  );
}
