"use client";

/* The job catalogue — every job an agent here can be assigned, with its proof.
   ─────────────────────────────────────────────────────────────────────────────────────────
   REWRITTEN 2026-10-15 INTO THE SITE'S DESIGN SYSTEM. The data (src/lib/jobs.ts) is kept
   exactly as it landed — 181 jobs across 17 families is the most valuable thing on this page
   and none of it is touched here. What changed is the rendering, and it changed because the
   drop's component was pasted in with its own stylesheet and measurably did not work:

     · it opened with <section class="sec"><div class="wrap">, and `.wrap` is defined nowhere
       in this repo, so the tables rendered full-bleed — measured at 1430px wide starting at
       x=0 in a 1440px window, with no container and no gutter
     · every border was `1px solid var(--line)`, and `--line` is not one of our tokens, so the
       declaration was invalid and dropped: row separators and button outlines computed to
       `0px none`. The table had no lines in it
     · `.eyebrow-v2` and `.mono-v2` live in zip.css, which only the landing page imports, so
       the eyebrow rendered as 15px system-font near-black instead of mono 11px tracked muted
     · the selected filter button was hardcoded `#14141a`, the drop's near-black, and the draft
       chip `#fff4d6`, neither of which is a colour on this site
     · and it was mounted after <PageShell>, which closes with the footer — so the whole
       catalogue rendered BELOW the footer (footer at y=1009, catalogue at y=1370)

   All six are gone: it is Tailwind against site tokens now, it returns a bare <section>, and
   /agents composes it inside the one shell. Nothing about which jobs exist, what they return
   or what proof they carry has been edited.

   THE CHIP IS THE HONEST PART. live = listable over x402 or MCP today, draft = built or
   wrapped but not listed, planned = in the plan and not built. Counts are derived from the
   array on every render, so the headline cannot drift from the rows the way a typed number
   would. */

import { useState } from "react";
import { FAMILIES, JOBS_ASOF, jobCounts, type Job } from "@/lib/jobs";

const CHIP: Record<Job["status"], string> = {
  live: "bg-emerald/12 text-emerald",
  draft: "bg-gold/15 text-gold",
  planned: "bg-surface-2 text-muted-2",
};

const PROOF: Record<Job["proof"], string> = {
  verdict: "signed verdict · two methods agree",
  receipt: "signed receipt",
  doc: "deliverable · hash in receipt",
  approval: "needs-you card before send / spend",
};

function Chip({ s }: { s: Job["status"] }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] tracking-tight ${CHIP[s]}`}>
      {s}
    </span>
  );
}

function Filter({
  on, onClick, children,
}: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
        on
          ? "border-accent/40 bg-accent/[.10] text-accent"
          : "border-border bg-background text-muted hover:border-accent/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function JobsCatalog() {
  const [fam, setFam] = useState<string>("all");
  const [status, setStatus] = useState<"all" | Job["status"]>("all");
  const c = jobCounts();
  const fams = FAMILIES.filter((f) => fam === "all" || f.key === fam);

  return (
    <section id="jobs" className="mt-20 border-t border-border pt-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
        What an agent can be assigned · {JOBS_ASOF}
      </p>
      <h2 className="display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {c.total} jobs in {c.families} families.{" "}
        <span className="accent-gradient">{c.live} listable today.</span>
      </h2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        Everything the market assigns to agents right now, from agent-to-agent calls priced in
        fractions of a cent to outcomes priced per resolution. Each row says what you send, what
        comes back and what proof it carries. The chip is honest: <Chip s="live" /> is sellable
        over x402 or MCP today, <Chip s="draft" /> is built or wrapped and not yet listed, and{" "}
        <Chip s="planned" /> is in the plan and not built.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by family">
        <Filter on={fam === "all"} onClick={() => setFam("all")}>
          all · {c.total}
        </Filter>
        {FAMILIES.map((f) => (
          <Filter key={f.key} on={fam === f.key} onClick={() => setFam(f.key)}>
            {f.title} · {f.jobs.length}
          </Filter>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
        {(["all", "live", "draft", "planned"] as const).map((s) => (
          <Filter key={s} on={status === s} onClick={() => setStatus(s)}>
            {s}
            {s !== "all" ? ` · ${c[s]}` : ""}
          </Filter>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {fams.map((f) => {
          const rows = f.jobs.filter((j) => status === "all" || j.status === status);
          if (!rows.length) return null;
          return (
            <div key={f.key} className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="flex flex-col gap-1 border-b border-border px-5 pb-3 pt-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <h3 className="text-[17px] font-semibold tracking-tight">
                  {f.title}
                  <span className="ml-2 font-mono text-[11px] font-normal text-muted-2">
                    {rows.length} of {f.jobs.length}
                  </span>
                </h3>
                <p className="body-copy max-w-xl text-[12.5px] leading-relaxed sm:text-right">
                  {f.lede}
                </p>
              </div>

              <div className="hscroll overflow-x-auto">
                <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-[25%]" />
                    <col className="w-[19%]" />
                    <col className="w-[25%]" />
                    <col className="w-[15%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-2">
                      {["Job", "You send", "It returns", "Proof", "Unit", "Status"].map((h) => (
                        <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((j) => (
                      <tr key={j.job} className="border-b border-border/70 last:border-0 hover:bg-surface/60">
                        <td className="px-4 py-2.5 align-top text-[13.5px] font-semibold tracking-tight">
                          {j.job}
                        </td>
                        <td className="px-4 py-2.5 align-top text-[12.5px] text-muted">{j.send}</td>
                        <td className="px-4 py-2.5 align-top text-[12.5px] text-muted">{j.back}</td>
                        <td className="px-4 py-2.5 align-top font-mono text-[11px] leading-snug text-muted-2">
                          {PROOF[j.proof]}
                        </td>
                        <td className="px-4 py-2.5 align-top text-[12px] text-muted">{j.unit}</td>
                        <td className="px-4 py-2.5 align-top">
                          <Chip s={j.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-2">
        Prices for the live rows are on the rate card above · a job turns live only once its exam
        bank passes and the capability gate lists it, which is why {c.draft} rows that are built
        still read draft
      </p>
    </section>
  );
}
