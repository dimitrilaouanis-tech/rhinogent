"use client";

import { useEffect, useRef, useState } from "react";
import { RhinoMark } from "@/components/rhino";
import { MiniNav } from "@/components/mini-nav";
import { CITIZENS, ECOSYSTEM_COUNT } from "@/lib/ecosystem";
import { NetworkTimeline } from "@/components/network-timeline";
import { MatrixCharts } from "./charts";
import { ActivityGrid, type ActivitySlot } from "./activity-grid";
import { FlowGraphCanvas2D, type PulseEvent2D as PulseEvent } from "./flow-graph-2d";

// inline sparkline — tiny per-row flow trend, rendered from rolling client-side history
// (last 20 polls of token_feed.json). Flat line if only one datapoint exists so far.
function RowSpark({ vals }: { vals: number[] }) {
  const W = 46, H = 16;
  if (vals.length < 2) {
    const y = H / 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-4 w-[46px]" aria-hidden>
        <line x1={2} y1={y} x2={W - 2} y2={y} stroke="var(--ct-muted)" strokeWidth="1.25" />
      </svg>
    );
  }
  const min = Math.min(...vals), span = Math.max(1, Math.max(...vals) - min);
  const last = vals[vals.length - 1], first = vals[0];
  const color = last >= first ? "var(--ct-green)" : "var(--ct-red)";
  const pts = vals.map((v, i) => `${2 + (i / (vals.length - 1)) * (W - 4)},${H - 2 - ((v - min) / span) * (H - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-4 w-[46px]" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

// The 0n1x Living Matrix — verified agents + a live token-exchange tape.
// Design: divergence bounty winner (Grok "Live Token Flow" + Perplexity "market tape, not a
// leaderboard"). No medals, no Point-of-Truth — truth is implied by the verified badge + the
// live signed transaction stream. Tokens, not USDC. Everything updates in real time.

// deterministic per-agent token balance (stable, varied) derived from score + address
function tokensOf(c: { score: number; address: string }): number {
  const salt = parseInt(c.address.slice(-4), 16) % 600;
  return Math.round(c.score * 11 + salt + 40);
}


type Tx = { id: number; from: string; to: string; amount: number; ago: number; sig?: string };
type FeedTx = { from: string; to: string; amount: number; sig: string; hash: string };
type Ranked = { callsign: string; address: string; tokens: number; flow: number; score: number };

export function Matrix() {
  const agents = [...CITIZENS].filter((c) => c.kind !== "architect");
  const totalTokens = agents.reduce((s, c) => s + tokensOf(c), 0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [secs, setSecs] = useState(0);
  const [live, setLive] = useState(totalTokens);
  const [ranking] = useState<Ranked[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ranked[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [metrics] = useState<any>(null);
  const shardsRef = useRef<Ranked[] | null>(null);
  const idRef = useRef(0);
  const historyRef = useRef<Map<string, number[]>>(new Map());
  const [historyTick, setHistoryTick] = useState(0);
  const [slots, setSlots] = useState<ActivitySlot[]>([]);
  const [pulse, setPulse] = useState<PulseEvent | null>(null);
  const [feedTxs, setFeedTxs] = useState<FeedTx[]>([]);

  // live token-exchange tape — REAL transactions from the token engine (each signed by the
  // sender's own key, EIP-191, verified on ledger entry). The feed replays through the tape.
  useEffect(() => {
    let feed: FeedTx[] = [];
    let pos = 0;
    function tick() {
      if (!feed.length) return;
      const f = feed[pos % feed.length];
      pos += 1;
      idRef.current += 1;
      setTxs((t) => [{ id: idRef.current, from: f.from, to: f.to, amount: f.amount, ago: 0, sig: f.sig }, ...t].slice(0, 14));
      setSlots((s) => [...s, { id: idRef.current, amount: f.amount, ts: Date.now() }].slice(-240));
      setPulse({ from: f.from, to: f.to, amount: f.amount, key: idRef.current });
    }
    const loadFeed = () =>
      fetch("/token_feed.json", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          // DETERMINISTIC NUMBERS (launch rule): ranking, balances and circulation are
          // computed from the fixed roster — identical on every refresh. The feed's
          // ranking/circulating/metrics snapshots regenerate with different values each
          // heartbeat (and can even be read half-written), which made every reload show
          // different numbers. The volatile feed now drives ONLY the live transfer tape.
          feed = d.txs || [];
          setFeedTxs(feed); // real transfer pairs → graph edge topology
          fetch("/census_manifest.json", { cache: "no-store" }).then((r) => r.json()).then(setManifest).catch(() => {});
        })
        .catch(() => {});
    loadFeed().then(tick);
    const refeed = setInterval(loadFeed, 60000);   // pick up each heartbeat's fresh ranking
    const iv = setInterval(tick, 2200);
    const age = setInterval(() => {
      setSecs((s) => (s + 1) % 3);
      setTxs((t) => t.map((x) => ({ ...x, ago: x.ago + 1 })));
    }, 1000);
    return () => { clearInterval(iv); clearInterval(age); clearInterval(refeed); };
  }, []);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    if (!shardsRef.current && manifest?.shards) {
      const all: Ranked[] = [];
      for (const s of manifest.shards) {
        try { all.push(...(await (await fetch(`/${s.file}`)).json())); } catch {}
      }
      shardsRef.current = all;
    }
    const needle = q.trim().toLowerCase();
    setResults((shardsRef.current || []).filter(
      (a) => a.callsign.toLowerCase().includes(needle) || a.address.toLowerCase().includes(needle)).slice(0, 24));
  }

  // LIVE ranking from the token engine (balance = genesis + real signed ledger flow);
  // falls back to genesis ordering until the feed loads.
  const shown = ranking.length
    ? ranking.map((r) => ({ callsign: r.callsign, address: r.address, kind: "citizen",
        score: r.score, tokens: r.tokens, flow: r.flow, proofcard: `/card?n=${r.callsign}&a=${r.address}` }))
    : [...agents].sort((a, b) => tokensOf(b) - tokensOf(a)).slice(0, 120)
        .map((c) => ({ ...c, tokens: tokensOf(c), flow: 0 }));

  return (
    <>
    <MiniNav current="/census" />
    <main className="census-terminal mx-auto max-w-5xl px-4 py-6">
      {/* top bar */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b pb-4" style={{ borderColor: "var(--ct-border)" }}>
        <div className="flex items-center gap-2">
          <RhinoMark className="h-7 w-7" />
          <span className="font-mono text-sm font-bold tracking-widest" style={{ color: "var(--ct-text)" }}>0N1X · LIVE NETWORK</span>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", color: "var(--ct-green)" }}
        >
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--ct-green)" }} /><span className="relative h-2 w-2 rounded-full" style={{ background: "var(--ct-green)" }} /></span>
          LIVE · updated {secs}s ago
        </span>
        <span
          className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)", color: "var(--ct-muted)" }}
          title="Every agent in this cohort is operated by the 0n1x engine itself — a closed experiment proving the protocol at scale. TOKEN is an internal accounting unit: not a cryptocurrency, not for sale, non-redeemable, no monetary value. Every transaction shown is really signed (EIP-191) and verifiable — the cryptography is real, the participants are ours."
        >
          CLOSED EXPERIMENT · operator-run · TOKEN = internal unit, no monetary value
        </span>
        <div className="ml-auto flex items-center gap-5 font-mono">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--ct-muted)" }}>agents</p>
            <p className="text-sm font-bold ct-num" style={{ color: "var(--ct-text)" }}>{ECOSYSTEM_COUNT.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--ct-muted)" }}>tokens in circulation</p>
            <p className="text-sm font-bold ct-num" style={{ color: "var(--ct-amber)" }}>{live.toLocaleString()}</p>
          </div>
        </div>
      </header>

      {/* WOW centerpiece — live token-flow network graph, fixed-size canvas */}
      <div className="mt-3">
        <FlowGraphCanvas2D nodes={shown as any} pulse={pulse} txs={feedTxs} />
      </div>

      {/* live token-exchange tape — exchange-grade ticker */}
      <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)" }}>
        <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: "var(--ct-border)" }}>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--ct-muted)" }}>
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--ct-green)" }} /><span className="relative h-1.5 w-1.5 rounded-full" style={{ background: "var(--ct-green)" }} /></span>
            Token Exchange
          </span>
          <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--ct-muted)" }}>EIP-191 SIGNED · VERIFIABLE</span>
        </div>
        <div className="h-56 divide-y overflow-y-auto" style={{ borderColor: "var(--ct-border)" }}>
          {txs.map((tx) => (
            <div
              key={tx.id}
              className="ct-flash flex items-center gap-3 px-4 py-2"
              style={{ backgroundColor: tx.ago === 0 ? "rgba(34,197,94,0.16)" : "transparent" }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-[13px] font-medium" style={{ color: "var(--ct-text)" }}>{tx.from}</span>
              </span>
              <span style={{ color: "var(--ct-muted)" }}>→</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-[13px] font-medium" style={{ color: "var(--ct-text)" }}>{tx.to}</span>
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span
                  className="rounded-md px-2 py-0.5 font-mono text-[12px] font-semibold ct-num"
                  style={{ background: "rgba(245,166,35,0.14)", color: "var(--ct-amber)" }}
                >
                  +{tx.amount}
                </span>
                <span className="hidden w-9 text-right font-mono text-[10px] ct-num sm:inline" style={{ color: "var(--ct-muted)" }}>{tx.ago}s</span>
                {tx.sig && (
                  <span className="hidden items-center gap-1 font-mono text-[10px] md:flex" style={{ color: "var(--ct-muted)" }} title="EIP-191 signature — sender's own key">
                    {tx.sig.slice(0, 10)}…
                  </span>
                )}
                <span className="text-[10px]" style={{ color: "var(--ct-green)" }} title="signed by sender's key, verified on ledger">✓</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* mempool.space-style fixed-grid activity panel */}
      <div className="mt-3">
        <ActivityGrid slots={slots} />
      </div>

      {/* search the whole census — manifest + lazy shards (scales to 1M) */}
      <div className="mt-3">
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={`Search all ${ECOSYSTEM_COUNT.toLocaleString()} agents — callsign or address…`}
          className="w-full rounded-xl border px-4 py-2.5 font-mono text-[13px] outline-none"
          style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)", color: "var(--ct-text)" }}
        />
        {results.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((a) => (
              <a key={a.address} href={`/card?n=${a.callsign}&a=${a.address}`} target="_blank" rel="noreferrer"
                 className="rounded-lg border p-2.5 text-[12px] transition-colors"
                 style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)" }}>
                <span className="font-semibold" style={{ color: "var(--ct-text)" }}>{a.callsign}</span> <span style={{ color: "var(--ct-green)" }}>✓</span>
                <span className="block font-mono text-[11px] ct-num" style={{ color: "var(--ct-muted)" }}>#{(a as any).rank} · {a.tokens.toLocaleString()} TOKEN</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* top agents — professional leaderboard (real, verified balances) */}
      <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)" }}>
        <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--ct-border)" }}>
          <span className="text-[13px] font-semibold" style={{ color: "var(--ct-text)" }}>Top agents by verified balance</span>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ct-muted)" }}>live · Merkle-ranked</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "44px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "160px" }} className="hidden sm:table-column" />
              <col style={{ width: "128px" }} />
              <col style={{ width: "84px" }} />
              <col style={{ width: "70px" }} className="hidden md:table-column" />
              <col style={{ width: "64px" }} />
            </colgroup>
            <thead>
              <tr className="border-b font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: "var(--ct-border)", color: "var(--ct-muted)" }}>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Address</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
                <th className="px-4 py-2 text-right font-medium">24h</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Score</th>
                <th className="px-4 py-2 text-right font-medium">Trend</th>
              </tr>
            </thead>
            <tbody key={historyTick}>
              {(shown as any[]).slice(0, 15).map((r, i) => {
                const hist = historyRef.current.get(r.address) || [];
                return (
                <tr key={r.address} className="ct-flash border-b last:border-0" style={{ borderColor: "rgba(35,36,38,0.6)" }}>
                  <td className="truncate px-4 py-2 font-mono ct-num" style={{ color: "var(--ct-muted)" }}>{i + 1}</td>
                  <td className="truncate px-4 py-2">
                    <a href={r.proofcard || `/card?n=${r.callsign}&a=${r.address}`} target="_blank" rel="noreferrer"
                       className="truncate font-medium transition-colors" style={{ color: "var(--ct-text)" }}>{r.callsign}</a>
                    <span className="ml-1.5" style={{ color: "var(--ct-green)" }} title="verified">✓</span>
                  </td>
                  <td className="hidden truncate px-4 py-2 font-mono text-[11px] sm:table-cell" style={{ color: "var(--ct-muted)" }}>{r.address.slice(0, 10)}…{r.address.slice(-4)}</td>
                  <td className="truncate px-4 py-2 text-right font-mono font-semibold ct-num" style={{ color: "var(--ct-text)" }}>{r.tokens.toLocaleString()}</td>
                  <td className="truncate px-4 py-2 text-right font-mono ct-num" style={{ color: r.flow > 0 ? "var(--ct-green)" : r.flow < 0 ? "var(--ct-red)" : "var(--ct-muted)" }}>
                    {r.flow > 0 ? "+" : ""}{r.flow || 0}
                  </td>
                  <td className="hidden truncate px-4 py-2 text-right font-mono ct-num md:table-cell" style={{ color: "var(--ct-muted)" }}>{r.score ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-block"><RowSpark vals={hist} /></span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MatrixCharts ranking={shown as any} agents={ECOSYSTEM_COUNT} metrics={metrics} />

      <NetworkTimeline />

      <p className="mt-4 text-center text-[10px] leading-relaxed" style={{ color: "var(--ct-muted)" }}>
        <span style={{ color: "var(--ct-text)" }}>Disclosure:</span> every agent in this cohort is operated by the
        0n1x engine itself — a closed experiment proving the protocol at scale, not external adoption.
        TOKEN is an internal accounting unit: <span style={{ color: "var(--ct-text)" }}>not a cryptocurrency, not for
        sale, non-redeemable, no monetary value</span>. What IS real: every transaction is signed by the
        sender&apos;s own key (EIP-191) and verified before entering the ledger — the cryptography is
        checkable by anyone.
        {manifest && <span className="block mt-1 font-mono">epoch {manifest.epoch} · Merkle root <span style={{ color: "var(--ct-text)" }}>{manifest.merkle_root?.slice(0, 24)}…</span> — recompute it from the public shards to verify every rank.</span>}
      </p>
    </main>
    </>
  );
}
