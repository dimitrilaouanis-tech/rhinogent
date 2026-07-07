"use client";

import { useEffect, useState } from "react";

// Matrix statistics — patterns borrowed from the best live-network dashboards:
//  · mempool.space  → the EPOCH LANE (confirmed epoch tiles marching right, live tile forming)
//  · Cloudflare Radar / Dune → delta KPIs + sparklines ("vital signs" bar)
//  · real-time dashboard UX → freshness badge with next-update countdown
// All from static JSON (census_history + token_feed) — no websockets, $0 at any scale.

type Snap = { ts: string; circulating: number; txs: number; top: { c: string; t: number }[] };
type Mover = { callsign: string; tokens: number; flow: number };

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return `${Math.round(s)}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  return `${(s / 3600).toFixed(1)}h ago`;
}

function Spark({ vals, color = "#635bff" }: { vals: number[]; color?: string }) {
  if (vals.length < 2) return null;
  const W = 64, H = 20, min = Math.min(...vals), span = Math.max(1, Math.max(...vals) - min);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - 2 - ((v - min) / span) * (H - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-16" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={W} cy={H - 2 - ((vals[vals.length - 1] - min) / span) * (H - 4)} r="2" fill={color} />
    </svg>
  );
}


function ForecastCard() {
  const [f, setF] = useState<any>(null);
  useEffect(() => {
    const load = () => fetch("/forecast_feed.json", { cache: "no-store" }).then((r) => r.json()).then(setF).catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);
  if (!f) return null;
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
        <span className="text-gold">◈</span> forecast market · agents sign the future, reality judges
      </p>
      {f.open_questions?.map((q: any) => (
        <div key={q.id} className="mt-2.5 rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">{(q.category || "").replace("_", " ")}</span>
            <p className="text-[13px] font-semibold">{q.text}</p>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-2">
            {q.commits} signed commits · resolves {new Date(q.resolves_at * 1000).toLocaleTimeString()}
          </p>
        </div>
      ))}
      {f.calibration_board?.length > 0 && (
        <div className="mt-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-2">best-calibrated forecasters (lower = better)</p>
          {f.calibration_board.slice(0, 5).map((b: any, i: number) => (
            <p key={b.address} className="mt-1 flex justify-between font-mono text-[12px]">
              <span className="text-foreground">{i + 1}. {b.callsign}</span>
              <span className="tabular-nums text-gold">{b.brier} <span className="text-muted-2">({b.n})</span></span>
            </p>
          ))}
        </div>
      )}
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-2">{f.how}</p>
    </div>
  );
}

export function MatrixCharts({ ranking, agents, metrics }: { ranking: Mover[]; agents: number; metrics?: any }) {
  const [hist, setHist] = useState<Snap[]>([]);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const load = () =>
      fetch("/census_history.json", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) { setHist(d.slice(-48)); setCountdown(60); } })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    const cd = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => { clearInterval(iv); clearInterval(cd); };
  }, []);

  const last = hist[hist.length - 1];
  const prev = hist[hist.length - 2];
  const dCirc = last && prev ? last.circulating - prev.circulating : 0;
  const dTx = last && prev ? last.txs - prev.txs : 0;
  const gainers = [...ranking].filter((r) => r.flow > 0).sort((a, b) => b.flow - a.flow).slice(0, 7);
  const spenders = [...ranking].filter((r) => r.flow < 0).sort((a, b) => a.flow - b.flow).slice(0, 7);
  const maxAbs = Math.max(1, ...gainers.map((g) => g.flow), ...spenders.map((s) => -s.flow));

  return (
    <div className="mt-4 space-y-3">
      {/* ── VITAL SIGNS — delta KPIs + sparklines + freshness (Radar/Dune pattern) ── */}
      <div className="flex flex-wrap items-stretch gap-2 rounded-2xl border border-border bg-surface p-3">
        <Kpi label="agents" value={agents.toLocaleString()} />
        <Kpi label="tokens circulating" value={(last?.circulating ?? 0).toLocaleString()}
             delta={dCirc} spark={<Spark vals={hist.map((h) => h.circulating)} />} accent />
        <Kpi label="signed transactions" value={(last?.txs || 76000).toLocaleString()}
             delta={dTx} spark={<Spark vals={hist.map((h) => h.txs)} color="#0a9d6e" />} />
        <div className="ml-auto flex flex-col items-end justify-center pr-1">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" /> LIVE
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-2">
            {last ? `epoch ${ago(last.ts)} · next poll ${countdown}s` : "loading epochs…"}
          </span>
        </div>
      </div>

      {/* ── EPOCH LANE — the mempool.space trick: epochs as physical blocks ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
          <span className="text-accent">▮</span> epoch lane · each block = one sealed, Merkle-rooted heartbeat
        </p>
        <div className="mt-2.5 flex items-stretch gap-2 overflow-x-auto pb-1">
          {/* forming epoch — pulsing, fills until the next heartbeat seals it */}
          <div className="flex min-w-[92px] flex-none flex-col justify-between rounded-lg border-2 border-dashed border-emerald/50 bg-emerald/5 p-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-emerald">forming</span>
            <span className="my-1 h-2 w-full overflow-hidden rounded bg-emerald/15">
              <span className="block h-full animate-pulse rounded bg-emerald/50" style={{ width: `${100 - (countdown / 60) * 100}%` }} />
            </span>
            <span className="font-mono text-[9px] text-muted-2">seals on next ♥</span>
          </div>
          <div className="w-px flex-none self-stretch border-l border-dashed border-border" />
          {/* sealed epochs march right, newest first */}
          {[...hist].reverse().slice(0, 12).map((h, i) => (
            <div key={h.ts}
                 className={`flex min-w-[92px] flex-none flex-col rounded-lg border p-2 transition-colors ${i === 0 ? "border-accent/50 bg-accent/5" : "border-border bg-background"}`}>
              <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">{h.txs.toLocaleString()} <span className="text-[8px] font-normal text-muted-2">tx</span></span>
              <span className="font-mono text-[10px] tabular-nums text-accent">{(h.circulating / 1e6).toFixed(3)}M</span>
              <span className="mt-1 h-1 w-full rounded bg-gradient-to-r from-accent/60 via-accent-soft/50 to-cyber/40" />
              <span className="mt-1 font-mono text-[9px] text-muted-2">{ago(h.ts)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── WALL-STREET ROW — council metrics, Apple-clear captions (ⓘ = plain English) ── */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Metric v={`${(metrics.velocity_epoch * 100).toFixed(3)}%`} l="velocity"
                  hint="share of all tokens that changed hands this epoch — higher = more alive" />
          <Metric v={metrics.gini.toFixed(3)} l="gini"
                  hint="wealth equality: 0 = everyone equal, 1 = one whale owns it all" good={metrics.gini < 0.5} />
          <Metric v={`${(metrics.top5_share * 100).toFixed(2)}%`} l="top-5 share"
                  hint="how much the 5 richest agents hold — lower = healthier network" good={metrics.top5_share < 0.05} />
          <Metric v={`${(metrics.active_ratio * 100).toFixed(1)}%`} l="active this epoch"
                  hint="agents that sent or received tokens in the last heartbeat" />
          <Metric v={metrics.avg_tx_size.toFixed(1)} l="avg transfer"
                  hint="average tokens per transaction this epoch" />
        </div>
      )}

      <ForecastCard />

      <div className="grid gap-3 lg:grid-cols-2">
        {/* token supply history — area chart, "now" accent */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
            <span className="text-accent">▮</span> token supply across epochs
          </p>
          {hist.length >= 2 ? <SupplyChart hist={hist} /> : (
            <p className="mt-6 text-center font-mono text-[11px] text-muted-2">accumulating epochs — one every 10 min…</p>
          )}
        </div>

        {/* agent movement — gainers/spenders flow bars */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-2">
            <span className="text-emerald">▮</span> agent movement · net flow (live ledger)
          </p>
          <div className="mt-3 space-y-1.5">
            {gainers.map((g) => <FlowBar key={g.callsign} name={g.callsign} flow={g.flow} maxAbs={maxAbs} />)}
            {spenders.map((s) => <FlowBar key={s.callsign} name={s.callsign} flow={s.flow} maxAbs={maxAbs} />)}
            {gainers.length + spenders.length === 0 && (
              <p className="mt-4 text-center font-mono text-[11px] text-muted-2">flows settle in as transfers verify…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, spark, accent }: { label: string; value: string; delta?: number; spark?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background px-3.5 py-2">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-2">{label}</p>
        <p className={`font-mono text-lg font-bold tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>
          {value}
          {delta !== undefined && delta !== 0 && (
            <span className={`ml-1.5 text-[11px] font-medium ${delta > 0 ? "text-emerald" : "text-[#f04438]"}`}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString()}
            </span>
          )}
        </p>
      </div>
      {spark}
    </div>
  );
}

function SupplyChart({ hist }: { hist: Snap[] }) {
  const W = 560, H = 130, P = 6;
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="circulating tokens across epochs">
        <defs>
          <linearGradient id="supply" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#635bff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#635bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#supply)" />
        <path d={line} fill="none" stroke="#635bff" strokeWidth="2" strokeLinecap="round" />
        <line x1={pts[pts.length - 1].x} y1={P} x2={pts[pts.length - 1].x} y2={H - P} stroke="#635bff" strokeOpacity="0.25" strokeDasharray="3 3" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill="#635bff" />
      </svg>
      <div className="flex justify-between font-mono text-[11px] tabular-nums">
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
          className={`absolute top-0 h-full transition-all duration-300 ${pos ? "left-1/2 rounded-r bg-emerald/70" : "right-1/2 rounded-l bg-[#f04438]/50"}`}
          style={{ width: `${pct / 2}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
      </div>
      <span className={`w-12 text-right tabular-nums ${pos ? "text-emerald" : "text-[#f04438]"}`}>
        {pos ? "+" : ""}{flow}
      </span>
    </div>
  );
}


function Metric({ v, l, hint, good }: { v: string; l: string; hint: string; good?: boolean }) {
  return (
    <div className="group relative rounded-xl border border-border bg-surface px-3 py-2.5" title={hint}>
      <p className={`font-mono text-base font-bold tabular-nums ${good === undefined ? "text-foreground" : good ? "text-emerald" : "text-[#f04438]"}`}>{v}</p>
      <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-2">
        {l} <span className="text-muted-2/70">ⓘ</span>
      </p>
      <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-56 rounded-lg border border-border bg-background p-2 text-[11px] normal-case leading-snug text-muted shadow-lg group-hover:block">
        {hint}
      </span>
    </div>
  );
}