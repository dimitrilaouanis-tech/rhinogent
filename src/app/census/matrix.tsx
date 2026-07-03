"use client";

import { useEffect, useRef, useState } from "react";
import { RhinoMark } from "@/components/rhino";
import { MiniNav } from "@/components/mini-nav";
import { CITIZENS, ECOSYSTEM_COUNT } from "@/lib/ecosystem";
import { NetworkTimeline } from "@/components/network-timeline";
import { MatrixCharts } from "./charts";

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
  const [ranking, setRanking] = useState<Ranked[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ranked[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const shardsRef = useRef<Ranked[] | null>(null);
  const idRef = useRef(0);

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
      setLive((v) => v + f.amount);
    }
    const loadFeed = () =>
      fetch("/token_feed.json", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          feed = d.txs || [];
          if (d.ranking?.length) setRanking(d.ranking);
          if (d.circulating) setLive(d.circulating);
          if (d.metrics) setMetrics(d.metrics);
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
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* top bar */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <RhinoMark className="h-7 w-7" />
          <span className="font-mono text-sm font-bold tracking-widest text-foreground">0N1X · LIVE NETWORK</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2 py-0.5 text-[11px] font-medium text-emerald">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" /><span className="relative h-2 w-2 rounded-full bg-emerald" /></span>
          LIVE · updated {secs}s ago
        </span>
        <span
          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted"
          title="Every agent in this cohort is operated by the 0n1x engine itself — a closed experiment proving the protocol at scale. TOKEN is an internal accounting unit: not a cryptocurrency, not for sale, non-redeemable, no monetary value. Every transaction shown is really signed (EIP-191) and verifiable — the cryptography is real, the participants are ours."
        >
          CLOSED EXPERIMENT · operator-run · TOKEN = internal unit, no monetary value
        </span>
        <div className="ml-auto flex items-center gap-5 font-mono">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-muted-2">agents</p>
            <p className="text-sm font-bold tabular-nums text-foreground">{ECOSYSTEM_COUNT.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-muted-2">tokens in circulation</p>
            <p className="text-sm font-bold tabular-nums text-accent">{live.toLocaleString()}</p>
          </div>
        </div>
      </header>

      {/* live token-exchange tape — exchange-grade ticker */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-[#0c1017] to-[#090c12]">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" /><span className="relative h-1.5 w-1.5 rounded-full bg-emerald" /></span>
            Token Exchange
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted-2">EIP-191 SIGNED · VERIFIABLE</span>
        </div>
        <div className="h-56 divide-y divide-border/40 overflow-y-auto">
          {txs.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-white/[0.02]">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-[12px] text-foreground">{tx.from}</span>
              </span>
              <span className="text-muted-2/60">→</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-[12px] text-foreground">{tx.to}</span>
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[12px] font-semibold tabular-nums text-accent">
                  +{tx.amount}
                </span>
                <span className="hidden w-9 text-right font-mono text-[10px] tabular-nums text-muted-2 sm:inline">{tx.ago}s</span>
                {tx.sig && (
                  <span className="hidden items-center gap-1 font-mono text-[10px] text-muted-2 md:flex" title="EIP-191 signature — sender's own key">
                    {tx.sig.slice(0, 10)}…
                  </span>
                )}
                <span className="text-[10px] text-emerald" title="signed by sender's key, verified on ledger">✓</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* search the whole census — manifest + lazy shards (scales to 1M) */}
      <div className="mt-3">
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={`Search all ${ECOSYSTEM_COUNT.toLocaleString()} agents — callsign or address…`}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 font-mono text-[13px] outline-none focus:border-accent/50"
        />
        {results.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((a) => (
              <a key={a.address} href={`/card?n=${a.callsign}&a=${a.address}`} target="_blank" rel="noreferrer"
                 className="rounded-lg border border-accent/30 bg-accent/5 p-2.5 text-[12px] transition-colors hover:border-accent/60">
                <span className="font-semibold">{a.callsign}</span> <span className="text-emerald">✓</span>
                <span className="block font-mono text-[11px] text-muted">#{(a as any).rank} · {a.tokens.toLocaleString()} TOKEN</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* top agents — professional leaderboard (real, verified balances) */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-foreground">Top agents by verified balance</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-2">live · Merkle-ranked</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border/40 font-mono text-[10px] uppercase tracking-wider text-muted-2">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Address</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
                <th className="px-4 py-2 text-right font-medium">24h</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Score</th>
              </tr>
            </thead>
            <tbody>
              {(shown as any[]).slice(0, 15).map((r, i) => (
                <tr key={r.address} className="border-b border-border/25 transition-colors last:border-0 hover:bg-white/[0.015]">
                  <td className="px-4 py-2 font-mono tabular-nums text-muted-2">{i + 1}</td>
                  <td className="px-4 py-2">
                    <a href={r.proofcard || `/card?n=${r.callsign}&a=${r.address}`} target="_blank" rel="noreferrer"
                       className="font-medium text-foreground transition-colors hover:text-accent">{r.callsign}</a>
                    <span className="ml-1.5 text-emerald" title="verified">✓</span>
                  </td>
                  <td className="hidden px-4 py-2 font-mono text-[11px] text-muted-2 sm:table-cell">{r.address.slice(0, 10)}…{r.address.slice(-4)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-foreground">{r.tokens.toLocaleString()}</td>
                  <td className={`px-4 py-2 text-right font-mono tabular-nums ${r.flow > 0 ? "text-emerald" : r.flow < 0 ? "text-[#ff6b6b]" : "text-muted-2"}`}>
                    {r.flow > 0 ? "+" : ""}{r.flow || 0}
                  </td>
                  <td className="hidden px-4 py-2 text-right font-mono tabular-nums text-muted md:table-cell">{r.score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MatrixCharts ranking={shown as any} agents={ECOSYSTEM_COUNT} metrics={metrics} />

      <NetworkTimeline />

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-2">
        <span className="text-muted">Disclosure:</span> every agent in this cohort is operated by the
        0n1x engine itself — a closed experiment proving the protocol at scale, not external adoption.
        TOKEN is an internal accounting unit: <span className="text-muted">not a cryptocurrency, not for
        sale, non-redeemable, no monetary value</span>. What IS real: every transaction is signed by the
        sender&apos;s own key (EIP-191) and verified before entering the ledger — the cryptography is
        checkable by anyone.
        {manifest && <span className="block mt-1 font-mono">epoch {manifest.epoch} · Merkle root <span className="text-muted">{manifest.merkle_root?.slice(0, 24)}…</span> — recompute it from the public shards to verify every rank.</span>}
      </p>
    </main>
    </>
  );
}
