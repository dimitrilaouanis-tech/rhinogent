"use client";

import { useEffect, useRef } from "react";

// WOW CENTERPIECE v8 — deterministic 2D canvas network (cosmos.gl retired: it rendered
// near-invisible dust with broken zoom). This renderer always draws, and the user can
// actually explore it: wheel = zoom to pointer, drag = pan, double-click = reset view.
// Nodes = ranked agents (size/glow = balance, amber = top-10), edges = the REAL signed
// transfer pairs from token_feed.json, pulses = live tape ticks. Deterministic polar
// layout (no physics jitter, identical on every refresh). Retina-scaled backing store.

export type Node = { callsign: string; tokens: number; flow: number };
export type PulseEvent2D = { from: string; to: string; amount: number; key: number };
export type TxPair = { from: string; to: string };

export function pos(name: string): [number, number] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const ang = (h % 10000) / 10000 * Math.PI * 2;
  const rad = 0.16 + ((h >> 13) % 10000) / 10000 * 0.8;
  return [0.5 + Math.cos(ang) * rad * 0.47, 0.5 + Math.sin(ang) * rad * 0.42];
}

type View = { s: number; ox: number; oy: number };

export function FlowGraphCanvas2D({ nodes, pulse, txs }: { nodes: Node[]; pulse: PulseEvent2D | null; txs?: TxPair[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // particles live in LAYOUT space (u,v) so they stay correct under zoom/pan
  const particlesRef = useRef<{ fu: number; fv: number; tu: number; tv: number; t: number; amt: number }[]>([]);
  const lastKeyRef = useRef(-1);
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const txsRef = useRef<TxPair[] | undefined>(txs);
  txsRef.current = txs;
  const flareRef = useRef<Map<string, number>>(new Map());
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const viewRef = useRef<View>({ s: 1, ox: 0, oy: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ---- interaction: zoom to pointer, drag pan, dblclick reset ----
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const v = viewRef.current;
      const s2 = clamp(v.s * Math.exp(-e.deltaY * 0.0014), 0.5, 12);
      // keep the point under the cursor fixed while zooming
      v.ox = mx - (mx - v.ox) * (s2 / v.s);
      v.oy = my - (my - v.oy) * (s2 / v.s);
      v.s = s2;
    };
    const onDown = (e: MouseEvent) => {
      const v = viewRef.current;
      dragRef.current = { x: e.clientX, y: e.clientY, ox: v.ox, oy: v.oy };
      canvas.style.cursor = "grabbing";
    };
    const onUp = () => { dragRef.current = null; canvas.style.cursor = "grab"; };
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      const d = dragRef.current;
      if (d) {
        const v = viewRef.current;
        v.ox = d.ox + (e.clientX - d.x);
        v.oy = d.oy + (e.clientY - d.y);
      }
    };
    const onLeave = () => { mouseRef.current = null; dragRef.current = null; canvas.style.cursor = "grab"; };
    const onDbl = () => { viewRef.current = { s: 1, ox: 0, oy: 0 }; };
    canvas.style.cursor = "grab";
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("dblclick", onDbl);

    // layout(u,v) -> screen px under the current view transform
    const sx = (u: number) => u * W * viewRef.current.s + viewRef.current.ox;
    const sy = (v: number) => v * H * viewRef.current.s + viewRef.current.oy;

    const curveCtrl = (x1: number, y1: number, x2: number, y2: number): [number, number] => {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      return [mx - dy * 0.15, my + dx * 0.15];
    };
    const qPoint = (t: number, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): [number, number] => {
      const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      return [a * x1 + b * cx + c * x2, a * y1 + b * cy + c * y2];
    };

    let raf = 0;
    const draw = () => {
      const zoom = viewRef.current.s;
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72);
      bg.addColorStop(0, "#0d0d10");
      bg.addColorStop(1, "#060607");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const ranked = nodesRef.current.slice(0, 120);
      const maxTok = Math.max(1, ...ranked.map((r) => r.tokens));
      const inSet = new Set(ranked.map((r) => r.callsign));

      // REAL transfer edges — unique pairs from the signed feed, weight grows with repeats
      const pairs = new Map<string, { a: string; b: string; n: number }>();
      for (const t of txsRef.current || []) {
        if (!inSet.has(t.from) || !inSet.has(t.to) || t.from === t.to) continue;
        const key = t.from < t.to ? `${t.from}|${t.to}` : `${t.to}|${t.from}`;
        const e = pairs.get(key);
        if (e) e.n += 1; else pairs.set(key, { a: t.from, b: t.to, n: 1 });
      }
      for (const e of pairs.values()) {
        const [au, av] = pos(e.a), [bu, bv] = pos(e.b);
        const x1 = sx(au), y1 = sy(av), x2 = sx(bu), y2 = sy(bv);
        const [qx, qy] = curveCtrl(x1, y1, x2, y2);
        ctx.strokeStyle = `rgba(180,195,235,${Math.min(0.34, 0.10 + e.n * 0.05)})`;
        ctx.lineWidth = Math.min(1.8, 0.7 + (e.n - 1) * 0.3);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(qx, qy, x2, y2);
        ctx.stroke();
      }

      // nodes — bright cores + real glow. Blue-white base, amber top-10.
      const now = performance.now();
      const flares = flareRef.current;
      const zs = Math.sqrt(zoom); // node size grows gently with zoom, not linearly
      ranked.forEach((r, idx) => {
        const [u, v] = pos(r.callsign);
        const x = sx(u), y = sy(v);
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return; // offscreen cull
        let flare = 0;
        const ft = flares.get(r.callsign);
        if (ft !== undefined) {
          const age = (now - ft) / 1000;
          if (age >= 1) flares.delete(r.callsign);
          else flare = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
        }
        const s = (3.5 + (r.tokens / maxTok) * 5.5) * zs * (1 + 0.25 * flare);
        const amber = idx < 10;
        const cr = amber ? 255 : 205, cg = amber ? 205 : 215, cb = amber ? 120 : 240;

        const haloR = s * 3.2;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, `rgba(${cr},${cg},${cb},${0.30 + 0.30 * flare})`);
        halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();

        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${amber ? 0.95 : 0.88})`;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.4 + 0.3 * flare})`;
        ctx.stroke();

        if (idx < 8 || zoom > 2.2) {
          ctx.fillStyle = "rgba(160,166,178,0.9)";
          ctx.font = "9px var(--font-jetbrains-mono), monospace";
          ctx.fillText(r.callsign, x + s + 4, y + 3);
        }
      });

      // pulse particles — warm comet + tail along the curved edge (layout-space anchored)
      const particles = particlesRef.current;
      for (const p of particles) {
        p.t += 0.02;
        const fx = sx(p.fu), fy = sy(p.fv), tx = sx(p.tu), ty = sy(p.tv);
        const [qx, qy] = curveCtrl(fx, fy, tx, ty);
        const head = Math.min(1, p.t);
        const size = (1.4 + Math.min(1.8, p.amt / 30)) * zs;
        if (p.t < 1) {
          ctx.strokeStyle = `rgba(255,246,230,${0.14 * (1 - p.t)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.quadraticCurveTo(qx, qy, tx, ty);
          ctx.stroke();
        }
        for (let k = 4; k >= 0; k--) {
          const tt = Math.max(0, head - k * 0.03);
          const [x, y] = qPoint(tt, fx, fy, qx, qy, tx, ty);
          const a = (k === 0 ? 0.95 : 0.28 * (1 - k / 5)) * Math.max(0, 1 - p.t * 0.6);
          ctx.beginPath();
          ctx.arc(x, y, k === 0 ? size : size * (1 - k * 0.12), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,246,230,${a})`;
          ctx.fill();
        }
      }
      particlesRef.current = particles.filter((p) => p.t < 1.15);

      // hover tooltip
      const m = mouseRef.current;
      if (m && !dragRef.current) {
        let hit: Node | null = null;
        for (let i = ranked.length - 1; i >= 0; i--) {
          const r = ranked[i];
          const [u, v] = pos(r.callsign);
          const s = (3.5 + (r.tokens / maxTok) * 5.5) * zs;
          const dx = m.x - sx(u), dy = m.y - sy(v);
          if (dx * dx + dy * dy <= (s + 4) * (s + 4)) { hit = r; break; }
        }
        if (hit) {
          const label = `${hit.callsign} · ${hit.tokens.toLocaleString("en-US")}`;
          ctx.font = "11px var(--font-jetbrains-mono), monospace";
          const tw = ctx.measureText(label).width;
          const bw = tw + 8, bh = 19;
          let bx = m.x + 12, by = m.y - bh - 6;
          if (bx + bw > W - 4) bx = m.x - bw - 12;
          if (by < 4) by = m.y + 12;
          ctx.fillStyle = "#18191a";
          ctx.strokeStyle = "#232426";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.rect(Math.round(bx) + 0.5, Math.round(by) + 0.5, bw, bh);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(234,234,234,0.95)";
          ctx.fillText(label, bx + 4, by + 13.5);
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("dblclick", onDbl);
    };
  }, []);

  // fire a new particle whenever a real tape tick lands
  useEffect(() => {
    if (!pulse || pulse.key === lastKeyRef.current) return;
    lastKeyRef.current = pulse.key;
    const ts = performance.now();
    flareRef.current.set(pulse.from, ts);
    flareRef.current.set(pulse.to, ts);
    const [fu, fv] = pos(pulse.from);
    const [tu, tv] = pos(pulse.to);
    particlesRef.current = [
      ...particlesRef.current,
      { fu, fv, tu, tv, t: 0, amt: pulse.amount },
    ].slice(-60);
  }, [pulse]);

  return (
    <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: "var(--ct-border)", background: "#060607" }}>
      <canvas ref={ref} className="block h-[420px] w-full" />
      <div className="pointer-events-none absolute left-4 top-3 font-mono text-[11px]" style={{ color: "var(--ct-green)" }}>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--ct-green)" }} />
          LIVE TOKEN-FLOW NETWORK · node size = balance · edges = real signed transfers
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[10px]" style={{ color: "var(--ct-muted)" }}>
        scroll = zoom · drag = pan · double-click = reset
      </div>
    </div>
  );
}
