"use client";

import { useEffect, useRef } from "react";

// WOW CENTERPIECE — live token-flow network graph. Nodes = ranked agents (size = balance),
// edges pulse as animated light node→node exactly when a tape tick fires. Deterministic
// polar layout (no physics jitter = no reflow risk); panel is a FIXED-SIZE canvas — only
// pixels inside it move, the page never shifts. No npm dep: a hand-rolled canvas renderer
// keyed off the same real feed data already on the page (fastest, zero build risk).
// Aesthetic: quiet/precise (Linear-network / Stripe-globe / mempool.space) — smaller,
// thinner, dimmer, sharper. Retina-scaled backing store.

type Node = { callsign: string; tokens: number; flow: number };
export type PulseEvent = { from: string; to: string; amount: number; key: number };

function pos(name: string): [number, number] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const ang = (h % 10000) / 10000 * Math.PI * 2;
  const rad = 0.16 + ((h >> 13) % 10000) / 10000 * 0.8;
  return [0.5 + Math.cos(ang) * rad * 0.47, 0.5 + Math.sin(ang) * rad * 0.42];
}

export function FlowGraph({ nodes, pulse }: { nodes: Node[]; pulse: PulseEvent | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ fx: number; fy: number; tx: number; ty: number; t: number; amt: number }[]>([]);
  const lastKeyRef = useRef(-1);
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const flareRef = useRef<Map<string, number>>(new Map()); // callsign -> flare start ts
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

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

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => { mouseRef.current = null; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const px = (u: number) => u * W;
    const py = (v: number) => v * H;
    // slight curvature: control point offset perpendicular to the chord (~0.15)
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
      // depth: subtle radial vignette — floats in deep space, not a flat card
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72);
      bg.addColorStop(0, "#0d0d0f");
      bg.addColorStop(1, "#060607");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const ranked = nodesRef.current.slice(0, 120);
      const maxTok = Math.max(1, ...ranked.map((r) => r.tokens));
      const cx0 = px(0.5), cy0 = py(0.5);

      // hairline curved edges, near-invisible at rest
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < ranked.length; i++) {
        const [u, v] = pos(ranked[i].callsign);
        const x = px(u), y = py(v);
        const [qx, qy] = curveCtrl(cx0, cy0, x, y);
        ctx.beginPath();
        ctx.moveTo(cx0, cy0);
        ctx.quadraticCurveTo(qx, qy, x, y);
        ctx.stroke();
      }

      // nodes — restrained: small core dot + soft radial halo + thin rim.
      // Steel/graphite base; amber reserved for top-10 only. No saturated green/red here.
      const now = performance.now();
      const flares = flareRef.current;
      ranked.forEach((r, idx) => {
        const [u, v] = pos(r.callsign);
        const x = px(u), y = py(v);
        // endpoint flare: quick ramp, ~1s decay — subtle, max +20% radius
        let flare = 0;
        const ft = flares.get(r.callsign);
        if (ft !== undefined) {
          const age = (now - ft) / 1000;
          if (age >= 1) flares.delete(r.callsign);
          else flare = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
        }
        const s = (2.5 + (r.tokens / maxTok) * 4.5) * (1 + 0.2 * flare);
        const amber = idx < 10;
        const cr = amber ? 245 : 160, cg = amber ? 166 : 170, cb = amber ? 35 : 185;

        // halo — radial gradient fading to 0
        const haloR = s * 3;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, `rgba(${cr},${cg},${cb},${0.20 + 0.22 * flare})`);
        halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();

        // core
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${amber ? 0.9 : 0.8})`;
        ctx.fill();
        // thin 1px rim
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.3 + 0.25 * flare})`;
        ctx.stroke();

        if (idx < 8) {
          ctx.fillStyle = "rgba(138,143,152,0.85)";
          ctx.font = "9px var(--font-jetbrains-mono), monospace";
          ctx.fillText(r.callsign, x + s + 4, y + 3);
        }
      });

      // pulse particles — near-white warm tint, short fading tail (motion blur), curved path
      const particles = particlesRef.current;
      for (const p of particles) {
        p.t += 0.02;
        const [qx, qy] = curveCtrl(p.fx, p.fy, p.tx, p.ty);
        const head = Math.min(1, p.t);
        const size = 1.2 + Math.min(1.8, p.amt / 30);
        // edge lights up faintly while the particle travels
        if (p.t < 1) {
          ctx.strokeStyle = `rgba(255,246,230,${0.10 * (1 - p.t)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.fx, p.fy);
          ctx.quadraticCurveTo(qx, qy, p.tx, p.ty);
          ctx.stroke();
        }
        // tail: trailing samples with decaying alpha and size
        for (let k = 4; k >= 0; k--) {
          const tt = Math.max(0, head - k * 0.03);
          const [x, y] = qPoint(tt, p.fx, p.fy, qx, qy, p.tx, p.ty);
          const a = (k === 0 ? 0.9 : 0.25 * (1 - k / 5)) * Math.max(0, 1 - p.t * 0.6);
          ctx.beginPath();
          ctx.arc(x, y, k === 0 ? size : size * (1 - k * 0.12), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,246,230,${a})`;
          ctx.fill();
        }
      }
      particlesRef.current = particles.filter((p) => p.t < 1.15);

      // hover tooltip — crisp 11px mono, panel-raised bg, 1px border, 4px padding
      const m = mouseRef.current;
      if (m) {
        let hit: Node | null = null;
        for (let i = ranked.length - 1; i >= 0; i--) {
          const r = ranked[i];
          const [u, v] = pos(r.callsign);
          const s = 2.5 + (r.tokens / maxTok) * 4.5;
          const dx = m.x - px(u), dy = m.y - py(v);
          if (dx * dx + dy * dy <= (s + 4) * (s + 4)) { hit = r; break; }
        }
        if (hit) {
          const label = `${hit.callsign} · ${hit.tokens.toLocaleString("en-US")}`;
          ctx.font = "11px var(--font-jetbrains-mono), monospace";
          const tw = ctx.measureText(label).width;
          const bw = tw + 8, bh = 19; // 4px padding
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
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // fire a new particle whenever a real tape tick lands
  useEffect(() => {
    if (!pulse || pulse.key === lastKeyRef.current) return;
    lastKeyRef.current = pulse.key;
    const ts = performance.now();
    flareRef.current.set(pulse.from, ts);
    flareRef.current.set(pulse.to, ts);
    const canvas = ref.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const [fu, fv] = pos(pulse.from);
    const [tu, tv] = pos(pulse.to);
    particlesRef.current = [
      ...particlesRef.current,
      { fx: fu * r.width, fy: fv * r.height, tx: tu * r.width, ty: tv * r.height, t: 0, amt: pulse.amount },
    ].slice(-60);
  }, [pulse]);

  return (
    <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: "var(--ct-border)", background: "#060607" }}>
      <canvas ref={ref} className="block h-[420px] w-full" />
      <div className="pointer-events-none absolute left-4 top-3 font-mono text-[11px]" style={{ color: "var(--ct-green)" }}>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--ct-green)" }} />
          LIVE TOKEN-FLOW NETWORK · node size = balance · pulses = real signed transfers
        </span>
      </div>
    </div>
  );
}
