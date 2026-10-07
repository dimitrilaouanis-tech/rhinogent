"use client";

import { useEffect, useState } from "react";
import { feedFetch } from "@/lib/feeds";

// Agent marquee — the 2026 "logo wall", except the names are REAL.
//
// Every marketing site runs a marquee of customer logos. Ours runs the thing
// nobody else on the page can show: live callsigns from the signed census shard,
// each one linking to a ProofCard anyone can check, all anchored under the
// published Merkle root shown beside it.
//
// HONESTY: no data, no section. It renders null rather than inventing names or
// showing placeholder pills — a fake logo wall is the oldest lie in landing
// pages and we are not going to ship the agent version of it.

type Agent = { callsign: string; address: string; rank: number };

export function AgentMarquee() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [merkle, setMerkle] = useState<string | null>(null);

  useEffect(() => {
    feedFetch("/census2/shard-000.json")
      .then((r) => r.json())
      .then((d: Agent[]) => setAgents((d || []).filter((a) => a?.callsign && a?.address).slice(0, 24)))
      .catch(() => {});
    feedFetch("/census_manifest.json")
      .then((r) => r.json())
      .then((m) => setMerkle(m?.merkle_root || null))
      .catch(() => {});
  }, []);

  if (!agents.length) return null;

  return (
    <section className="hairline-x border-b border-[rgba(17,17,26,.08)] py-14">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="eyebrow">Live from the census</p>
            <h2 className="display mt-2 text-2xl font-semibold sm:text-3xl">
              <span className="text-gradient">Real agents, signed.</span>{" "}
              <span className="text-muted">Open any card and check it.</span>
            </h2>
          </div>
          {merkle ? (
            <span
              className="max-w-full truncate rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-muted-2"
              title={`Published Merkle root — every agent here is anchored under it: ${merkle}`}
            >
              merkle <span className="text-foreground">{merkle.slice(0, 14)}…</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* The track holds the row twice and slides exactly -50%, so the loop is
          seamless. It pauses on hover/focus so a name can be read and clicked. */}
      <div className="marquee mt-8">
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee-track" aria-hidden={copy === 1 || undefined}>
            {agents.map((a) => (
              <a
                key={`${copy}-${a.address}`}
                href={`/card?n=${encodeURIComponent(a.callsign)}&a=${encodeURIComponent(a.address)}`}
                target="_blank"
                rel="noreferrer"
                tabIndex={copy === 1 ? -1 : undefined}
                className="tile tile-pill flex shrink-0 items-center gap-2.5 px-4 py-2.5"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                  <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" stroke="var(--emerald)" strokeWidth="1.9" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke="var(--emerald)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="whitespace-nowrap text-[13px] font-semibold tracking-tight">{a.callsign}</span>
                <span className="whitespace-nowrap font-mono text-[11px] text-muted-2">
                  {a.address.slice(0, 6)}…{a.address.slice(-4)}
                </span>
              </a>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
