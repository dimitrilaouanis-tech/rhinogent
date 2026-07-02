"use client";

import { useEffect, useState } from "react";

// Matrix statistics — the visual heart of the census. Token movement (circulating supply
// over epochs, from census_history.json — real heartbeat snapshots) and agent movement
// (biggest gainers/spenders this epoch, from the live ledger-driven ranking).
// Pure SVG, zero libraries, reads the same public signed data anyone can verify.

type Snap = { ts: string; circulating: number; txs: number; top: { c: string; t: number }[] };
type Mover = { callsign: string; tokens: number; flow: number };

export function MatrixCharts({ ranking }: { ranking: Mover[] }) {
  const [hist, setHist] = useState<Snap[]>([]);

  useEffect(() => {
    fetch("/census_history.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setHist(Array.isArray(d) ? d.slice(-60) : []))
      .catch(() => {});
  }, []);

  const gainers = [...ranking].filter((r) => r.flow > 0).sort((a, b) => b.flow - a.flow).slice(0, 8);
  const spenders = [...ranking].filter((r) => r.flow < 0).sort((a, b) => a.flow - b.flow).slice(0, 8);
  const maxAbs = Math.max(1, ...gainers.map((g) => g.flow), ...spenders.map((s) => -s.flow));

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {/* ── token movement: circulating supply per epoch ── */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
          <span className="text-accent">▮</span> token movement · circulating supply per epoch
        </p>
        {hist.length >= 2 ? <SupplyChart hist={hist} /> : (
          <p className="mt-6 text-center font-mono text-[11px] text-muted-2">accumulating epochs — the heartbeat adds one every 10 min…</p>
        )}
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-2">
          <span>{hist[0]?.ts?.slice(5, 16).replace("T", " ")}</span>
          <span>{hist.length} epochs</span>
          <span>{hist[hist.length - 1]?.ts?.slice(5, 16).replace("T", " ")}</span>
        </div>
      </div>

      {/* ── agent movement: who's earning, who's spending ── */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
          <span className="text-emerald">▮</span> agent movement · net token flow (live ledger)
        </p>
        <div className="mt-3 space-y-1.5">
          {gainers.map((g) => (
            <FlowBar key={g.callsign} name={g.callsign} flow={g.flow} maxAbs={maxAbs} />
          ))}
          {spenders.map((s) => (
            <FlowBar key={s.callsign} name={s.callsign} flow={s.flow} maxAbs={maxAbs} />
          ))}
          {gainers.length + spenders.length === 0 && (
            <p className="mt-4 text-center font-mono text-[11px] text-muted-2">flows settle in as transfers verify…</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SupplyChart({ hist }: { hist: Snap[] }) {
  const W = 560, H = 140, P = 6;
  const vals = hist.map((h) => h.circulating);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const pts = vals.map((v, i) => ({
    x: P + (i / (vals.length - 1)) * (W - 2 * P),
    y: H - P - ((v - min) / span) * (H - 2 * P),
  }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="circulating tokens over time">
        <defs>
          <linearGradient id="supply" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#635bff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#635bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#supply)" />
        <path d={line} fill="none" stroke="#635bff" strokeWidth="2" strokeLinecap="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill="#635bff" />
      </svg>
      <div className="flex justify-between font-mono text-[11px]">
        <span className="text-muted-2">{min.toLocaleString()}</span>
        <span className="font-semibold text-accent">{vals[vals.length - 1].toLocaleString()} TOKEN</span>
        <span className="text-muted-2">{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

function FlowBar({ name, flow, maxAbs }: { name: string; flow: number; maxAbs: number }) {
  const pct = Math.min(100, (Math.abs(flow) / maxAbs) * 100);
  const pos = flow > 0;
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      <span className="w-36 truncate text-muted">{name}</span>
      <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-surface-2">
        <div
          className={`absolute top-0 h-full ${pos ? "left-1/2 rounded-r bg-emerald/70" : "right-1/2 rounded-l bg-[#ff6b6b]/60"}`}
          style={{ width: `${pct / 2}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
      </div>
      <span className={`w-12 text-right tabular-nums ${pos ? "text-emerald" : "text-[#ff6b6b]"}`}>
        {pos ? "+" : ""}{flow}
      </span>
    </div>
  );
}
