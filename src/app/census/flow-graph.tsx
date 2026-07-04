"use client";

import { useEffect, useRef, useState } from "react";
import { FlowGraphCanvas2D, pos, type Node } from "./flow-graph-2d";

// WOW CENTERPIECE v6 — Obsidian-style live token-flow graph on @cosmos.gl/graph.
// Round 7 changes (live user feedback):
//  1. ZOOM — fill-panel default: warmup fit is provisional, FINAL fit at onSimulationEnd
//     (sim contraction after the early fit was shrinking the cluster inside a frozen
//     viewport), padding 0 exact-bbox fit + ×1.05 nudge, scaleExtent clamp at half FINAL zoom.
//  2. STARS — HD starfield points: 1.5-4px crisp cores, blue-white rgba(200,210,235,.95),
//     top-10 warm amber-white rgba(255,220,150,1) slightly larger, scalePointsOnZoom.
//  3. LIGHT-SPEED TRANSFERS — a comet streak shoots along the edge in ~180ms on a transparent
//     2D overlay canvas (dpr-scaled, pointer-events:none, rAF only while transfers in flight,
//     endpoints re-projected each frame via spaceToScreenPosition so streaks track pan/zoom/sim),
//     then the destination star twinkles (~300ms decay, source subtler). Cosmos link flash is
//     instant-ramp + ~300ms decay to match the tempo.
// Transaction-edge accumulation/pruning, force sim params, tooltip, and the 2D fallback
// (flow-graph-2d.tsx) are unchanged.

export type PulseEvent = { from: string; to: string; amount: number; key: number };
export type TxEdge = { from: string; to: string };

const SPACE = 4096;
const toSpace = (u: number, v: number): [number, number] => [u * SPACE, v * SPACE];

// starfield cores: much smaller than v5 — 1.5-4px by balance
const sizeFor = (tokens: number, maxTok: number) => 1.5 + (tokens / maxTok) * 2.5;

// point palette (0-1 floats): blue-white base stars, warm amber-white top-10
const BASE_RGBA: [number, number, number, number] = [200 / 255, 210 / 255, 235 / 255, 0.95];
const AMBER_RGBA: [number, number, number, number] = [1, 220 / 255, 150 / 255, 1];
const AMBER_SIZE_BONUS = 0.8; // top-10 slightly larger

const MAX_EDGES = 600;          // perf cap — prune oldest pair beyond this
const REST_ALPHA = 0.05;        // hairline link at rest
const BASE_WIDTH = 0.5;
const widthFor = (count: number) => Math.min(BASE_WIDTH + 0.35 * (count - 1), 2.2); // grows with repeats, capped

// light-speed streak timings
const STREAK_MS = 180;   // edge traversal (150-250ms band)
const TWINKLE_MS = 300;  // endpoint brightness decay
const LINK_FLASH_MS = 300; // cosmos link flash decay (instant ramp)

type Edge = { a: number; b: number; count: number; linkIdx: number };
type Streak = { fromIdx: number; toIdx: number; start: number; linkIdx: number; restWidth: number };

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
  const overlayRef = useRef<HTMLCanvasElement>(null);
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
  const fittedRef = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const streaksRef = useRef<Streak[]>([]);
  const streakRafRef = useRef<number | null>(null);

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

  // ---- light-speed streak overlay -------------------------------------------------------
  // Runs ONLY while transfers are in flight. Each frame it re-projects the two endpoints
  // through graph.spaceToScreenPosition() so streaks track pan/zoom/sim drift, draws the
  // comet head + short fading tail and the endpoint twinkles, and drives the cosmos link
  // flash decay. Clears the canvas and cancels itself when the queue empties.
  const streakStep = () => {
    streakRafRef.current = null;
    const graph = graphRef.current;
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!graph || !canvas || !container) { streaksRef.current = []; return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { streaksRef.current = []; return; }

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(rect.width * dpr));
    const H = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const now = performance.now();
    let positions: number[] | null = null;
    try { positions = graph.getPointPositions(); } catch { positions = null; }
    const screenOf = (idx: number): [number, number] | null => {
      if (!positions || idx * 2 + 1 >= positions.length) return null;
      try { return graph.spaceToScreenPosition([positions[idx * 2], positions[idx * 2 + 1]]); } catch { return null; }
    };

    const alive: Streak[] = [];
    let linkTouched = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let linkColors: any = null, linkWidths: any = null;

    for (const s of streaksRef.current) {
      const age = now - s.start;
      if (age > STREAK_MS + TWINKLE_MS) {
        // expired — restore this link to rest exactly
        if (s.linkIdx >= 0) {
          if (!linkColors) { linkColors = graph.getLinkColors(); linkWidths = graph.getLinkWidths(); }
          if (s.linkIdx * 4 + 3 < linkColors.length) {
            linkColors[s.linkIdx * 4] = 1; linkColors[s.linkIdx * 4 + 1] = 1; linkColors[s.linkIdx * 4 + 2] = 1;
            linkColors[s.linkIdx * 4 + 3] = REST_ALPHA;
            linkWidths[s.linkIdx] = s.restWidth;
            linkTouched = true;
          }
        }
        continue;
      }
      alive.push(s);

      const from = screenOf(s.fromIdx);
      const to = screenOf(s.toIdx);
      if (!from || !to) continue;

      // cosmos link flash: instant ramp, ~300ms decay (warm near-white)
      if (s.linkIdx >= 0) {
        if (!linkColors) { linkColors = graph.getLinkColors(); linkWidths = graph.getLinkWidths(); }
        if (s.linkIdx * 4 + 3 < linkColors.length) {
          const e = Math.max(0, 1 - age / LINK_FLASH_MS);
          linkColors[s.linkIdx * 4] = 1; linkColors[s.linkIdx * 4 + 1] = 246 / 255; linkColors[s.linkIdx * 4 + 2] = 230 / 255;
          linkColors[s.linkIdx * 4 + 3] = REST_ALPHA + 0.35 * e;
          linkWidths[s.linkIdx] = s.restWidth + 1.2 * e;
          linkTouched = true;
        }
      }

      if (age <= STREAK_MS) {
        // comet phase: bright warm-white head + short fading tail of trailing samples
        const t = age / STREAK_MS; // linear = constant light-speed traverse
        const lerp = (p: number): [number, number] => [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
        const [hx, hy] = lerp(t);
        for (let k = 3; k >= 1; k--) {
          const pt = Math.max(0, t - k * 0.07);
          const [tx, ty] = lerp(pt);
          const fade = (1 - k / 4) * 0.5;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,238,210,${fade.toFixed(3)})`;
          ctx.arc(tx, ty, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        // soft glow under the head, then crisp core
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,246,230,0.25)";
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,246,230,0.95)";
        ctx.arc(hx, hy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // twinkle phase: destination spikes bright and decays ~300ms; source subtler
        const u = (age - STREAK_MS) / TWINKLE_MS;
        const e = 1 - u;
        const twinkle = (x: number, y: number, strength: number) => {
          const a = strength * e;
          const r = 1 + 2.5 * e * strength;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,246,230,${(0.2 * a).toFixed(3)})`;
          ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,250,240,${(0.95 * a).toFixed(3)})`;
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          // crisp 4-point cross sparkle
          const len = 3 + 5 * e * strength;
          ctx.strokeStyle = `rgba(255,246,230,${(0.55 * a).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
          ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
          ctx.stroke();
        };
        twinkle(to[0], to[1], 1);
        twinkle(from[0], from[1], 0.45);
      }
    }

    if (linkTouched) {
      graph.setLinkColors(linkColors);
      graph.setLinkWidths(linkWidths);
      graph.render();
    }

    streaksRef.current = alive;
    if (alive.length) {
      streakRafRef.current = requestAnimationFrame(streakStep);
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
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
    let zoomTimer: ReturnType<typeof setTimeout> | null = null;

    // Round-7 fit: fill the panel. Two-phase — the 900ms warmup fit is PROVISIONAL
    // (the force sim, decay 2500ms, keeps contracting the cluster for ~1.6s after it,
    // which is why earlier rounds still looked zoomed-out); the FINAL fit fires at
    // onSimulationEnd when the bounding box is frozen. Padding 0 = exact bbox fit
    // (cosmos getTransform: scale = min(w/bw,h/bh)*(1-2p), no point-size slack), then
    // a small deterministic ×1.05 nudge so the cluster spans ~the full 420px with only
    // a whisker of crop on the extremes. Min-zoom clamped to half the FINAL level.
    const runFit = (duration: number, final: boolean) => {
      if (disposed || fittedRef.current || !graph) return;
      if (final) fittedRef.current = true;
      try {
        const linked = new Set<number>();
        for (const e of edgesRef.current.values()) { linked.add(e.a); linked.add(e.b); }
        if (linked.size >= 3) {
          graph.fitViewByPointIndices([...linked], duration, 0);
        } else {
          graph.fitView(duration, 0);
        }
        if (!final) return; // provisional frame only — nudge + clamp wait for the settled fit
        if (zoomTimer) clearTimeout(zoomTimer);
        zoomTimer = setTimeout(() => {
          if (disposed || !graph) return;
          try {
            const z = graph.getZoomLevel() * 1.05;
            graph.setZoomLevel(z, 250); // deterministic nudge past the exact fit
            // clamp min zoom relative to the FINAL level so users can back out a bit, not get lost
            graph.zoomInstance?.behavior?.scaleExtent?.([Math.max(1e-3, z * 0.5), Infinity]);
          } catch { /* zoom internals unavailable */ }
        }, duration + 80);
      } catch { /* view not ready */ }
    };
    const fitOnce = (duration = 500) => runFit(duration, true);

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
          const c = i < 10 ? AMBER_RGBA : BASE_RGBA;
          colors[i * 4] = c[0]; colors[i * 4 + 1] = c[1]; colors[i * 4 + 2] = c[2]; colors[i * 4 + 3] = c[3];
          sizes[i] = sizeFor(r.tokens, maxTok) + (i < 10 ? AMBER_SIZE_BONUS : 0);
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
          pointDefaultSize: 2,
          pointSizeScale: 1,
          linkDefaultWidth: BASE_WIDTH,
          linkWidthScale: 1,
          linkOpacity: 1,
          renderHoveredPointRing: false,
          enableZoom: true,
          enableDrag: true,
          fitViewOnInit: false, // we fit ourselves after simulation warmup
          scalePointsOnZoom: true, // stars stay proportionate as users zoom the field
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

        // provisional frame after warmup (sim still contracting); final fit lands at sim end
        fitTimer = setTimeout(() => runFit(600, false), 900);

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
      if (zoomTimer) clearTimeout(zoomTimer);
      if (streakRafRef.current) cancelAnimationFrame(streakRafRef.current);
      streakRafRef.current = null;
      streaksRef.current = [];
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
  // then fire a light-speed comet along the edge on the overlay canvas (~180ms traverse,
  // ~300ms endpoint twinkle) with a matching fast cosmos link flash.
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

    streaksRef.current.push({
      fromIdx,
      toIdx,
      start: performance.now(),
      linkIdx: edge ? edge.linkIdx : -1,
      restWidth: edge ? widthFor(edge.count) : BASE_WIDTH,
    });
    if (streakRafRef.current === null) {
      streakRafRef.current = requestAnimationFrame(streakStep);
    }
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
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-[420px] w-full"
      />
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
