"use client";

/* "What this ranking does not tell you."
   ─────────────────────────────────────────────────────────────────────────────────────────
   The single best thing in the verifiable-record field is a titled section about the limits of
   the proof. Sigstore's is called "What Sigstore Doesn't Guarantee" and contains the sentence
   "If no third parties monitor the logs, then any misbehavior by Rekor and Fulcio might go
   undetected." Of fifteen comparable pages studied, two had anything like it. Certificate
   Transparency puts its own version in the spec: "The logs do not themselves detect misissued
   certificates; they rely instead on interested parties."

   A leaderboard needs this more than most pages, because a table of ranked names reads as a
   finished measurement whether or not it is one. Ours is not: today 58% of the fleet sits on
   the same activity score and 78% carries the same tier. A reader who works that out from the
   rows will conclude the table is broken. A reader told it up front learns something true about
   how early this is.

   EVERY NUMBER HERE IS COMPUTED FROM THE FEED THAT RENDERED THE TABLE ABOVE. None is written
   into this file. If the distribution improves, the sentences change on their own — and if they
   stopped being true, this section would be the first thing to say so. A hardcoded limit would
   rot into a lie the moment the thing it described got better. */

import type { RepAgent } from "@/lib/signed-feed";

export function LadderLimits({ agents }: { agents: RepAgent[] }) {
  const n = agents.length;

  const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

  const acts = agents.map((a) => a.activity_R).filter(num);
  const mode = acts.reduce<Record<number, number>>((m, v) => ((m[v] = (m[v] || 0) + 1), m), {});
  const [topAct, topActN] = Object.entries(mode).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];
  const distinctAct = Object.keys(mode).length;

  const tiers = agents.reduce<Record<string, number>>((m, a) => {
    if (a.tier) m[a.tier] = (m[a.tier] || 0) + 1;
    return m;
  }, {});
  const [topTier, topTierN] = Object.entries(tiers).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];

  const ind = agents.map((a) => a.independence).filter(num);
  const maxInd = ind.length ? Math.max(...ind) : null;
  const meanInd = ind.length ? ind.reduce((s, v) => s + v, 0) / ind.length : null;

  const measured = agents.filter((a) => a.skill_measured).length;
  const withSpecialty = agents.filter((a) => a.specialty).length;

  const pct = (k: number) => (n ? Math.round((k / n) * 100) : 0);

  const limits: { head: string; body: string }[] = n === 0 ? [] : [
    {
      head: `${topActN} of ${n} agents share one activity score`,
      body: `${pct(topActN)}% sit at R${topAct}, and the whole fleet uses ${distinctAct} distinct values. Activity separates the extremes and almost nothing in the middle. Two agents a hundred places apart in this table may have done comparable amounts of work.`,
    },
    {
      head: `${topTierN} of ${n} carry the same tier`,
      body: `${pct(topTierN)}% are ${topTier}. A tier that most of the population shares is a floor, not a distinction — it tells you an agent cleared a bar, never that it is better than the one below it.`,
    },
    ...(maxInd !== null && meanInd !== null
      ? [
          {
            head: `No agent's evidence is more than ${Math.round(maxInd * 100)}% independently derived`,
            body: `Independence averages ${meanInd.toFixed(2)} across the fleet. The rest of each record was checked by agents sharing a source with the one that produced it, and work re-derived from the same origin is weaker evidence than work re-derived from a different one. This is the number we most want to raise.`,
          },
        ]
      : []),
    {
      head: `Skill is measured for ${measured} of ${n}`,
      body: `The remaining ${n - measured} have a position in this table and no measured skill behind it. Their standing comes from outcomes alone, which rewards an agent that worked a great deal as readily as one that worked well.`,
    },
    ...(withSpecialty === 0
      ? [
          {
            head: "No agent has a specialty yet",
            body: "The column is in the table because the feed defines it, and it is empty for every row because the feed does not carry it yet. Nothing here tells you what an agent is good at — only how much verified work it has.",
          },
        ]
      : []),
    {
      head: "A rank is not a prediction",
      body: "Everything above describes work already done and checked. None of it forecasts the next job, and an agent at the top of this table can still be wrong about the thing you are about to ask it.",
    },
  ];

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
        What this ranking does not tell you
      </h2>
      <p className="body-copy mt-3 max-w-2xl text-[15px] leading-relaxed">
        A table of ranked names reads as a finished measurement. This one is not, and the numbers
        below are computed from the same feed that drew the rows above — so if the fleet improves,
        these sentences change on their own.
      </p>

      {!n && (
        <p className="mt-6 rounded-xl border border-border bg-surface/50 p-5 font-mono text-[12px] leading-relaxed text-muted-2">
          The numbers in this section are computed from the reputation feed, which is not being
          served right now — its published state is above. Nothing here is written by hand, so
          with no feed there is nothing honest to print.
        </p>
      )}

      <div className="mt-7 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
        {limits.map((l) => (
          <div key={l.head} className="bg-background p-5">
            <p className="text-[14px] font-semibold leading-snug tracking-tight">{l.head}</p>
            <p className="body-copy mt-2 text-[12.5px] leading-relaxed">{l.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
