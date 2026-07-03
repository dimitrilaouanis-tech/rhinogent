"use client";

import { useEffect, useRef } from "react";

// WOW CENTERPIECE — live token-flow network graph. Nodes = ranked agents (size = balance),
// edges pulse as animated light node→node exactly when a tape tick fires. Deterministic
// polar layout (no physics jitter = no reflow risk); panel is a FIXED-SIZE canvas — only
// pixels inside it move, the page never shifts. No npm dep: a hand-rolled canvas renderer
// keyed off the same real feed data already on the page (fastest, zero build risk).

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
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const px = (u: number) => u * W;
    const py = (v: number) => v * H;

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      const ranked = nodesRef.current.slice(0, 120);
      const maxTok = Math.max(1, ...ranked.map((r) => r.tokens));

      // faint edges from center density ring (structural, not decorative motion)
      ctx.strokeStyle = "rgba(90,95,102,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < ranked.length; i++) {
        const [u, v] = pos(ranked[i].callsign);
        ctx.beginPath();
        ctx.moveTo(px(0.5), py(0.5));
        ctx.lineTo(px(u), py(v));
        ctx.stroke();
      }

      // nodes — size by balance, amber flash tone reserved for pulses, base = accent grays
      ranked.forEach((r, idx) => {
        const [u, v] = pos(r.callsign);
        const s = 2 + (r.tokens / maxTok) * 7;
        ctx.beginPath();
        ctx.arc(px(u), py(v), s, 0, Math.PI * 2);
        ctx.fillStyle = r.flow > 0 ? "rgba(34,197,94,0.75)" : r.flow < 0 ? "rgba(239,68,68,0.55)" : "rgba(234,234,234,0.35)";
        ctx.fill();
        if (idx < 8) {
          ctx.fillStyle = "rgba(234,234,234,0.75)";
          ctx.font = "9px var(--font-jetbrains-mono), monospace";
          ctx.fillText(r.callsign, px(u) + s + 3, py(v) + 3);
        }
      });

      // animate active pulse particles
      const particles = particlesRef.current;
      for (const p of particles) {
        p.t += 0.02;
        const e = Math.min(1, p.t);
        const ease = e * e * (3 - 2 * e);
        const x = p.fx + (p.tx - p.fx) * ease;
        const y = p.fy + (p.ty - p.fy) * ease;
        ctx.strokeStyle = `rgba(245,166,35,${0.35 * (1 - p.t)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.fx, p.fy); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2 + Math.min(3, p.amt / 20), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,166,35,${0.95 * (1 - p.t * 0.5)})`;
        ctx.fill();
      }
      particlesRef.current = particles.filter((p) => p.t < 1.15);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  // fire a new particle whenever a real tape tick lands
  useEffect(() => {
    if (!pulse || pulse.key === lastKeyRef.current) return;
    lastKeyRef.current = pulse.key;
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
    <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: "var(--ct-border)", background: "#0a0a0a" }}>
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
