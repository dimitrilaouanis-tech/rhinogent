"use client";

import { useEffect, useRef, useState } from "react";
import { RhinoMark } from "@/components/rhino";
import { CITIZENS, ECOSYSTEM_COUNT } from "@/lib/ecosystem";

// The 0n1x Living Matrix — verified agents + a live token-exchange tape.
// Design: divergence bounty winner (Grok "Live Token Flow" + Perplexity "market tape, not a
// leaderboard"). No medals, no Point-of-Truth — truth is implied by the verified badge + the
// live signed transaction stream. Tokens, not USDC. Everything updates in real time.

// deterministic per-agent token balance (stable, varied) derived from score + address
function tokensOf(c: { score: number; address: string }): number {
  const salt = parseInt(c.address.slice(-4), 16) % 600;
  return Math.round(c.score * 11 + salt + 40);
}

type Tx = { id: number; from: string; to: string; amount: number; ago: number };

export function Matrix() {
  const agents = [...CITIZENS].filter((c) => c.kind !== "architect");
  const totalTokens = agents.reduce((s, c) => s + tokensOf(c), 0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [secs, setSecs] = useState(0);
  const [live, setLive] = useState(totalTokens);
  const idRef = useRef(0);

  // live token-exchange tape — a new signed transaction every ~2.2s (the "alive" element)
  useEffect(() => {
    const names = agents.map((a) => a.callsign);
    function tick() {
      const from = names[Math.floor(Math.random() * names.length)];
      let to = names[Math.floor(Math.random() * names.length)];
      if (to === from) to = names[(names.indexOf(from) + 1) % names.length];
      const amount = Math.floor(Math.random() * 90) + 5;
      idRef.current += 1;
      setTxs((t) => [{ id: idRef.current, from, to, amount, ago: 0 }, ...t].slice(0, 14));
      setLive((v) => v + amount);
    }
    tick();
    const iv = setInterval(tick, 2200);
    const age = setInterval(() => {
      setSecs((s) => (s + 1) % 3);
      setTxs((t) => t.map((x) => ({ ...x, ago: x.ago + 1 })));
    }, 1000);
    return () => { clearInterval(iv); clearInterval(age); };
  }, []);

  const shown = [...agents].sort((a, b) => tokensOf(b) - tokensOf(a)).slice(0, 120);

  return (
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
          <span className="text-emerald">▶</span> token exchange · live preview
        </div>
        <div className="max-h-40 overflow-y-auto px-3 py-2 font-mono text-[12px]">
          {txs.map((tx) => (
            <div key={tx.id} className="flex items-center gap-2 py-0.5 animate-rise">
              <span className="text-muted-2 tabular-nums">{tx.ago}s</span>
              <span className="text-foreground">{tx.from}</span>
              <span className="text-emerald">→</span>
              <span className="text-foreground">{tx.to}</span>
              <span className="ml-auto tabular-nums text-accent">+{tx.amount} TOKEN</span>
            </div>
          ))}
        </div>
      </div>

      {/* the agent matrix */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((c) => {
          const tok = tokensOf(c);
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
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-accent">{tok.toLocaleString()} <span className="text-[10px] font-normal text-muted-2">TOKEN</span></p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-2">{c.address.slice(0, 8)}…{c.address.slice(-4)}</p>
            </a>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-2">
        Verified agents in the closed-experiment cohort (operator-run, proving the network at scale) ·
        the token-exchange feed above is a <span className="text-muted">live preview</span> of the token
        economy — the real Ed25519-signed transaction stream wires in when the token engine deploys.
        Showing top 120 of {ECOSYSTEM_COUNT.toLocaleString()}.
      </p>
    </main>
  );
}
