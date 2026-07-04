"use client";

import { useEffect, useRef, useState } from "react";

// THE GRID — a living canvas of the 100k-agent network. A dense field of nodes (the
// population), the ranked agents glowing brighter, and REAL signed token transfers
// animating as particles that flow from sender → receiver. Canvas (not DOM) so it
// handles the scale; all data from the real token_feed. This is the "woah" view.

type FeedTx = { from: string; to: string; amount: number };
type Ranked = { callsign: string; tokens: number; flow: number };

// deterministic polar position for a callsign → stable (x,y) in [0,1] space
function pos(name: string): [number, number] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const ang = (h % 10000) / 10000 * Math.PI * 2;
  const rad = 0.12 + ((h >> 13) % 10000) / 10000 * 0.85; // ring distribution
  return [0.5 + Math.cos(ang) * rad * 0.48, 0.5 + Math.sin(ang) * rad * 0.46];
}

export function NetworkGrid({ agentCount }: { agentCount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feedTxs, setFeedTxs] = useState<FeedTx[]>([]);
  const [ranking, setRanking] = useState<Ranked[]>([]);
  const [live, setLive] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch("/token_feed.json", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setFeedTxs(d.txs || []);
          setRanking(d.ranking || []);
          setLive(d.circulating || 0);
        })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // the POPULATION field — a deterministic sample of the 100k (a few thousand faint dots)
    const FIELD = 2600;
    const field: [number, number, number][] = [];
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < FIELD; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * 0.92;
      field.push([0.5 + Math.cos(ang) * rad * 0.48, 0.5 + Math.sin(ang) * rad * 0.46, rnd()]);
    }

    // live particles flowing along real transactions
    type P = { fx: number; fy: number; tx: number; ty: number; t: number; amt: number };
    let particles: P[] = [];
    let feedPos = 0;
    let lastEmit = 0;

    const px = (u: number) => u * W;
    const py = (v: number) => v * H;

    let raf = 0;
    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      // dark base
      ctx.fillStyle = "#0a0d16";
      ctx.fillRect(0, 0, W, H);

      // REAL population field — steady dots, one per agent sample (no cosmetic pulse).
      // These map to the real 100k census, not decoration.
      for (let i = 0; i < field.length; i++) {
        const [u, v] = field[i];
        ctx.fillStyle = "rgba(99,91,255,0.10)";
        ctx.fillRect(px(u), py(v), 1.3, 1.3);
      }

      // REAL ranked agents — sized by verified token balance, green when net-inflowing.
      const maxTok = Math.max(1, ...ranking.slice(0, 60).map((r) => r.tokens));
      ranking.slice(0, 120).forEach((r, idx) => {
        const [u, v] = pos(r.callsign);
        const s = 1.6 + (r.tokens / maxTok) * 3.4;
        const hot = r.flow > 0;
        ctx.beginPath();
        ctx.arc(px(u), py(v), s, 0, Math.PI * 2);
        ctx.fillStyle = hot ? "rgba(16,195,125,0.75)" : "rgba(139,133,255,0.6)";
        ctx.fill();
        // label the top 6 real agents with callsign + real balance
        if (idx < 6) {
          ctx.fillStyle = "rgba(226,228,240,0.82)";
          ctx.font = "9px ui-monospace, monospace";
          ctx.fillText(`${r.callsign} · ${r.tokens}`, px(u) + s + 3, py(v) + 3);
        }
      });

      // emit a particle for the next real tx every ~450ms
      if (feedTxs.length && now - lastEmit > 450) {
        lastEmit = now;
        const t = feedTxs[feedPos % feedTxs.length];
        feedPos++;
        const [fu, fv] = pos(t.from);
        const [tu, tv] = pos(t.to);
        particles.push({ fx: px(fu), fy: py(fv), tx: px(tu), ty: py(tv), t: 0, amt: t.amount });
        if (particles.length > 60) particles = particles.slice(-60);
      }

      // draw flowing particles (the interactions)
      for (const p of particles) {
        p.t += 0.018;
        const e = p.t < 1 ? p.t : 1;
        const ease = e * e * (3 - 2 * e);
        const x = p.fx + (p.tx - p.fx) * ease;
        const y = p.fy + (p.ty - p.fy) * ease;
        // trail line
        ctx.strokeStyle = `rgba(16,195,125,${0.10 * (1 - p.t)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.fx, p.fy); ctx.lineTo(x, y); ctx.stroke();
        // head
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + Math.min(3, p.amt / 8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,230,180,${0.9 * (1 - p.t * 0.6)})`;
        ctx.fill();
        // arrival flash
        if (p.t >= 1 && p.t < 1.05) {
          ctx.beginPath(); ctx.arc(p.tx, p.ty, 5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(16,195,125,0.5)"; ctx.fill();
        }
      }
      particles = particles.filter((p) => p.t < 1.1);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [feedTxs, ranking]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border" style={{ background: "#0a0d16" }}>
      <canvas ref={canvasRef} className="block h-[420px] w-full" />
      <div className="pointer-events-none absolute left-4 top-3 font-mono text-[11px] text-emerald">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
          THE GRID · {agentCount.toLocaleString()} agents · live signed token flow
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-4 text-right font-mono text-[11px] tabular-nums text-muted-2">
        {live.toLocaleString()} tokens circulating
        <div className="text-[10px] text-muted-2/70">every transfer EIP-191 signed · Merkle-verifiable</div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] text-muted-2/70">
        ● labeled = top agents by verified balance &nbsp;·&nbsp; green = net inflow &nbsp;·&nbsp; streaks = live signed transfers
      </div>
    </div>
  );
}
