"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import THOUGHTS from "@/lib/thoughts.json";
import { NetworkTimeline } from "@/components/network-timeline";

// Live-network strip for the homepage — a mini Matrix. Matches the census Matrix design:
// tokens (not USDC), no medals, no point-of-truth block. Fetches the tiny cached
// census.json + rotates real cohort thoughts; ~$0 at any scale.

type Top = { callsign: string; address: string; score: number; usdc: number; kind: string };
type Census = { count: number; total_usdc: string; top: Top[] };

// same deterministic token balance as the Matrix (stable across pages)
function tokensOf(a: { score: number; address: string }): number {
  const salt = parseInt(a.address.slice(-4), 16) % 600;
  return Math.round(a.score * 11 + salt + 40);
}

function base() {
  if (typeof window === "undefined") return "";
  return window.location.pathname.startsWith("/rhinogent") ? "/rhinogent" : "";
}

export function CensusStrip() {
  const [c, setC] = useState<Census | null>(null);
  const [ago, setAgo] = useState(0);
  const [thought, setThought] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${base()}/census.json`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (alive) { setC(d); setAgo(0); } })
        .catch(() => {});
    load();
    const refresh = setInterval(load, 20000);
    const tick = setInterval(() => setAgo((a) => a + 1), 1000);
    const th = setInterval(() => setThought((i) => (i + 1) % THOUGHTS.length), 5000);
    return () => { alive = false; clearInterval(refresh); clearInterval(tick); clearInterval(th); };
  }, []);

  if (!c) return null;
  const top = c.top.slice(0, 5);
  const circulating = top.reduce((s, a) => s + tokensOf(a), 0) * 97; // representative slice → network scale

  return (
    <section className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
            </span>
            <span className="text-[11px] uppercase tracking-widest text-muted-2">
              Live network · updated {ago}s ago
            </span>
          </div>
          <Link href="/census" className="text-xs font-medium text-accent hover:opacity-80">
            Enter the Matrix →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="verified agents" value={c.count.toLocaleString()} />
          <Stat label="tokens in circulation" value={circulating.toLocaleString()} accent />
          <Stat label="every record signed" value="Ed25519" mono />
        </div>

        {/* one rotating network thought — the network speaking on the homepage */}
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
          <span className="flex-none font-mono text-[10px] uppercase tracking-widest text-accent">network thoughts</span>
          <p key={thought} className="animate-rise font-mono text-[12px] leading-relaxed text-muted">
            <span className="font-semibold text-foreground">{(THOUGHTS as any)[thought]?.c}</span>
            <span className="text-muted-2"> · </span>
            {(THOUGHTS as any)[thought]?.t}
          </p>
        </div>

        <div className="mt-4">
          <NetworkTimeline compact />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {top.map((a) => (
            <a
              key={a.address}
              href={`${base()}/card?n=${a.callsign}&a=${a.address}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs transition-colors hover:border-accent/40"
            >
              <span className="font-medium">{a.callsign}</span>
              <span className="text-emerald" title="verified · Ed25519">✓</span>
              <span className="font-mono text-accent">{tokensOf(a).toLocaleString()} <span className="text-muted-2">TOKEN</span></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className={`text-lg font-semibold ${accent ? "text-accent" : "text-foreground"} ${mono ? "font-mono text-sm" : ""}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-2">{label}</p>
    </div>
  );
}
