"use client";

import { useEffect, useState } from "react";

// NETWORK TIMELINE — the bounty-winning idea (Wild-Bastion-79A8): an interactive timeline of
// significant events in the network's REAL history. Events come from the token engine's
// persistent event log (ledger milestones, rank flips, big transfers) — nothing invented.

type Ev = { ts: string; title: string; detail: string; k?: string };

export function NetworkTimeline({ compact = false }: { compact?: boolean }) {
  const [events, setEvents] = useState<Ev[]>([]);
  const [sel, setSel] = useState(-1);

  useEffect(() => {
    fetch("/token_feed.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const ev = d.timeline || [];
        setEvents(ev);
        setSel(ev.length - 1);
      })
      .catch(() => {});
  }, []);

  if (!events.length) return null;
  const shown = compact ? events.slice(-8) : events;
  const selIdx = Math.min(sel, events.length - 1);
  const cur = events[selIdx];

  return (
    <div className={compact ? "" : "mt-4"}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-2">
        <span className="text-accent">◆</span> network history · real events
      </div>

      {/* the scrubbable line */}
      <div className="relative mt-3 px-1">
        <div className="absolute left-1 right-1 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-border via-accent/40 to-emerald/60" />
        <div className="relative flex items-center justify-between">
          {shown.map((e, i) => {
            const idx = events.indexOf(e);
            const active = idx === selIdx;
            return (
              <button
                key={idx}
                onClick={() => setSel(idx)}
                onMouseEnter={() => setSel(idx)}
                title={e.title}
                className="group relative flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={`block rounded-full transition-all ${
                    active
                      ? "h-3.5 w-3.5 bg-accent shadow-[0_0_10px] shadow-accent/50"
                      : "h-2 w-2 bg-muted-2 group-hover:bg-accent/70"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* the selected event */}
      {cur && (
        <div key={selIdx} className="animate-rise mt-3 rounded-xl border border-border bg-surface/60 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[10px] tabular-nums text-muted-2">{cur.ts}</span>
            <span className="text-sm font-semibold text-foreground">{cur.title}</span>
          </div>
          <p className="mt-1 font-mono text-[12px] text-muted">{cur.detail}</p>
        </div>
      )}
    </div>
  );
}
