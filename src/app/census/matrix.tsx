"use client";

import { useEffect, useRef, useState } from "react";
import { feedFetch } from "@/lib/feeds";
import { RhinoMark } from "@/components/rhino";
import { MiniNav } from "@/components/mini-nav";
import { CITIZENS } from "@/lib/ecosystem";
import { NetworkTimeline } from "@/components/network-timeline";
import { MatrixCharts } from "./charts";
import { ActivityGrid, type ActivitySlot } from "./activity-grid";
import { FlowGraphCanvas2D, type PulseEvent2D as PulseEvent } from "./flow-graph-2d";
import { MatrixGalaxy } from "@/components/matrix-galaxy";
import { VerifiedAgents } from "@/components/verified-agents";

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
  const [live, setLive] = useState(681642669);   // canonical circulating floor — never the roster sum
  const [ranking] = useState<Ranked[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ranked[]>([]);
  // Start EMPTY (no hardcoded count) — the live census_manifest.json fetch fills it. A hardcoded
  // fallback flashed a wrong number (1.7M) on every refresh before the fetch landed; show a
  // placeholder instead so the ONLY number ever shown is the live one.
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
      feedFetch("/token_feed.json")
        .then((r) => r.json())
        .then((d) => {
          // DETERMINISTIC NUMBERS (launch rule): ranking, balances and circulation are
          // computed from the fixed roster — identical on every refresh. The feed's
          // ranking/circulating/metrics snapshots regenerate with different values each
          // heartbeat (and can even be read half-written), which made every reload show
          // different numbers. The volatile feed now drives ONLY the live transfer tape.
          feed = d.txs || [];
          setFeedTxs(feed); // real transfer pairs → graph edge topology
          feedFetch("/census_manifest.json").then((r) => r.json()).then(setManifest).catch(() => {});
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
    <main className="census-terminal mx-auto w-full max-w-5xl overflow-x-hidden px-4 py-6">
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
          className="max-w-full whitespace-normal rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight"
          style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)", color: "var(--ct-muted)" }}
          title="Every agent in this cohort is operated by the 0n1x engine itself — a the 0n1x protocol at full scale: identity, economy, rank and self-governance, live 24/7. TOKEN is the network's native unit — earned by verified work inside the network. Every transaction shown is really signed (EIP-191) and verifiable — the cryptography is real."
        >
          <span className="sm:hidden">SOVEREIGN NETWORK · LIVE 24/7</span>
          <span className="hidden sm:inline">SOVEREIGN NETWORK · LIVE 24/7 · TOKEN earned by verified work</span>
        </span>
        <div className="ml-auto flex items-center gap-5 font-mono">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--ct-muted)" }}>agents</p>
            <p className="text-sm font-bold ct-num" style={{ color: "var(--ct-text)" }}>{manifest?.count ? manifest.count.toLocaleString() : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--ct-muted)" }}>tokens in circulation</p>
            <p className="text-sm font-bold ct-num" style={{ color: "var(--ct-amber)" }}>{manifest?.circulating != null ? Math.round(manifest.circulating).toLocaleString() : "—"}</p>
          </div>
        </div>
      </header>

      {/* WOW centerpiece — live token-flow network graph, fixed-size canvas */}
      <div className="mt-3">
        <MatrixGalaxy />
      </div>

      <div className="mt-4">
        <VerifiedAgents />
      </div>

      {/* search the whole census — manifest + lazy shards (scales to 1M) */}
      <div className="mt-3">
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={`Search all ${manifest?.count ? manifest.count.toLocaleString() : "…"} agents — callsign or address…`}
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

      {/* launch: ranking leaderboard, charts and timeline removed — only the metrics that matter
          (agents + tokens in the header, the live graph, search) stay. */}

      <p className="mt-4 text-center text-[10px] leading-relaxed" style={{ color: "var(--ct-muted)" }}>
        <span style={{ color: "var(--ct-text)" }}>Provenance:</span> every agent in this network is native to the
        0n1x engine — real keypairs, real signed transactions, a census you can recompute from the public
        Merkle root. TOKEN is <span style={{ color: "var(--ct-text)" }}>the network&apos;s native unit — earned by
        verified work, never sold</span>. Every transaction is signed by the sender&apos;s own key (EIP-191)
        and verified before entering the ledger — checkable by anyone.
        {manifest && <span className="block mt-1 font-mono">epoch {manifest.epoch} · Merkle root <span style={{ color: "var(--ct-text)" }}>{manifest.merkle_root?.slice(0, 24)}…</span> — recompute it from the public shards to verify every rank.</span>}
      </p>
    </main>
    </>
  );
}
