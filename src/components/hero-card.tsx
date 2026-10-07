/* The hero's agent card.

   Lifted out of page.tsx so the hero (src/components/home-lead.tsx) can use it without page.tsx
   and home-lead.tsx importing each other. It is unchanged from the version built off the
   desktop snip. */

import Link from "next/link";
import { AgentMark } from "@/components/agent-mark";
import { WELCOME_GRANT } from "@/lib/economy";

/* The card from the screenshot, colour for colour: emerald for what cleared, gold for what is
   waiting on you, violet for the one button that would move money. */
export function HeroAgentCard() {
  return (
    <div className="card-x rounded-2xl bg-gradient-to-b from-surface-2 to-surface p-6">
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Pinned to the house blue rather than the per-agent hash: on the hero this mark is
              reading as the brand, and a lime or magenta blob there looks like a different product. */}
          <AgentMark className="h-10 w-10" title="" />
          <div>
            <p className="text-base font-semibold tracking-tight">Iron-Spire</p>
            <p className="font-mono text-[11px] text-muted-2">R86 · did:pkh · eip155:8453</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-md bg-emerald/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald">
            TRUSTED
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
            working
          </span>
        </div>
      </div>

      <p className="mt-4 text-[13px] text-muted">Kept working while you were away.</p>

      {/* two jobs: one cleared, one held */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
          <span className="font-mono text-[12px] text-foreground">verify · lido.fi</span>
          <span className="rounded-md bg-emerald/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald">
            3 of 3 agree
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold-soft/10 px-3 py-2.5">
          <span className="font-mono text-[12px] text-foreground">pay · shop.example</span>
          <span className="rounded-md bg-gold/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-gold">
            needs you
          </span>
        </div>
      </div>

      {/* verify-before-pay */}
      <div className="vbp mt-4 rounded-xl border border-border bg-background/60 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
          verify before pay
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Looks established. Domain 21 yrs, TLS valid… Two other agents re-derived it.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald/10 px-2 py-1 font-mono text-[11px] font-semibold text-emerald">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
          signed · 3 facts · 1.2 TOKEN
        </p>
      </div>

      {/* over-cap gate */}
      <div className="mt-4 rounded-xl border border-gold/50 bg-gold-soft/10 p-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
          needs you · over cap
        </p>
        {/* Spans: a picture of the gate. The working one is in /chat. */}
        <div className="mt-3 flex flex-wrap gap-2" aria-hidden>
          <span className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white">
            Pay €18.40
          </span>
          <span className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-foreground">
            Allow once
          </span>
          <span className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-muted">
            Ask more
          </span>
        </div>
      </div>

      {/* Every panel on this card carries specific-looking data — a rank, a verdict, an amount.
          Without this marker a reader has no way to tell it from their own agent's state. */}
      <p className="mt-4 font-mono text-[10px] text-muted-2">illustrative card</p>
    </div>
  );
}
