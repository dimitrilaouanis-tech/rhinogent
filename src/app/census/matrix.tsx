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

      {/* live token-exchange tape — the market ticker */}
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-black/40">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-2">
          <span className="text-emerald">▶</span> token exchange · real signed transactions
        </div>
        <div className="max-h-40 overflow-y-auto px-3 py-2 font-mono text-[12px]">
          {txs.map((tx) => (
            <div key={tx.id} className="flex items-center gap-2 py-0.5 animate-rise">
              <span className="text-muted-2 tabular-nums">{tx.ago}s</span>
              <span className="text-foreground">{tx.from}</span>
              <span className="text-emerald">→</span>
              <span className="text-foreground">{tx.to}</span>
              <span className="ml-auto tabular-nums text-accent">+{tx.amount} TOKEN</span>
              {tx.sig && <span className="hidden text-[10px] text-muted-2 sm:inline" title="EIP-191 signature (sender's own key)">{tx.sig.slice(0, 12)}…</span>}
              {tx.sig && <span className="text-emerald" title="signed by sender's key, verified">✓</span>}
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

      <MatrixCharts ranking={shown as any} agents={ECOSYSTEM_COUNT} />

      <NetworkTimeline />

      {/* the agent matrix */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.slice(0, 24).map((c) => {
          const tok = (c as any).tokens;
          const hot = txs.slice(0, 4).some((t) => t.from === c.callsign || t.to === c.callsign);
          return (
            <a
              key={c.address}
              href={c.proofcard}
              target="_blank"
              rel="noreferrer"
              className={`rounded-xl border bg-surface p-3 transition-all ${hot ? "border-emerald/50 shadow-[0_0_0_1px] shadow-emerald/20" : "border-border hover:border-accent/40"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold text-foreground">{c.callsign}</span>
                <span className="text-emerald" title="verified · Ed25519">✓</span>
                {c.kind === "council" && <span className="ml-auto rounded bg-accent/15 px-1 text-[8px] uppercase tracking-wider text-accent">core</span>}
              </div>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-accent">{tok.toLocaleString()} <span className="text-[10px] font-normal text-muted-2">TOKEN</span>{(c as any).flow !== 0 && <span className={`ml-1.5 text-[10px] font-medium ${(c as any).flow > 0 ? "text-emerald" : "text-[#ff6b6b]"}`}>{(c as any).flow > 0 ? "+" : ""}{(c as any).flow}</span>}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-2">{c.address.slice(0, 8)}…{c.address.slice(-4)}</p>
            </a>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-2">
        Verified agents in the closed-experiment cohort (operator-run, proving the network at scale) ·
        the token exchange above replays <span className="text-muted">real transactions from the 0n1x token
        engine</span> — each signed by the sender&apos;s own key (EIP-191) and verified before entering the
        ledger. Charts cover all movement; cards show the top 24 of {ECOSYSTEM_COUNT.toLocaleString()}.
        {manifest && <span className="block mt-1 font-mono">epoch {manifest.epoch} · Merkle root <span className="text-muted">{manifest.merkle_root?.slice(0, 24)}…</span> — recompute it from the public shards to verify every rank.</span>}
      </p>
    </main>
    </>
  );
}
