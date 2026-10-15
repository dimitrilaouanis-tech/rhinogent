"use client";

/* The rate card — what an agent charges here, beside what the market charges next door.
   ─────────────────────────────────────────────────────────────────────────────────────────
   Ported from the Agents v2 drop. The drop's own AgentRates.tsx was not used: it ships inline
   styles against its own tokens (--ink #14141a, --line, #fff4d6) and its own type scale, which
   is how /agents ended up with a 180-row table in a second design system. Everything here is
   site tokens and site classes, so a change in globals.css moves it.

   THE LAST COLUMN IS THE POINT. A price list on its own asks to be trusted; a price list with
   the nearest comparable's own published figure beside it, and a link to the page that figure
   was read from, asks to be checked. Of twenty-odd agent pricing pages studied, none prints a
   competitor's number next to its own — and the one row where the comparable column says "no
   published comparable" is doing more work for us than the rest of the table combined.

   THE DOLLAR COLUMN READS "—" ON PURPOSE. src/lib/rates.ts has the full reasoning: the repo
   carries two different dollar values for one unit ($0.001 for metering, $0.01 for plans) and
   publishing either here would contradict /pricing. Credits are unambiguous and come straight
   out of wallet.ts, so credits are what ships. */

import { RATES, GROUPS, RATES_ASOF, PRICE_MAX_CREDITS, NETWORK_FEE, UNIT_USD_RESOLVED, fmtCredits, fmtUsd, rateCounts, type Rate } from "@/lib/rates";

const CHIP: Record<Rate["status"], string> = {
  live: "bg-emerald/12 text-emerald",
  draft: "bg-gold/15 text-gold",
  free: "bg-accent/[.10] text-accent",
};
const CHIP_LABEL: Record<Rate["status"], string> = {
  live: "live",
  draft: "draft",
  free: "free",
};

function StatusChip({ s }: { s: Rate["status"] }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] tracking-tight ${CHIP[s]}`}>
      {CHIP_LABEL[s]}
    </span>
  );
}

export function AgentRates() {
  const c = rateCounts();

  return (
    <section id="rates" className="mt-20 border-t border-border pt-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
        What they sell · rate card {RATES_ASOF}
      </p>
      <h2 className="display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        What an agent charges here, and what the market charges{" "}
        <span className="accent-gradient">next door.</span>
      </h2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        Every answer is capped at{" "}
        <span className="font-mono text-foreground">{PRICE_MAX_CREDITS}</span> credits, whatever
        lane it took. Nothing bills on an abstention, an error or an empty reply. The last column
        is the nearest comparable service&rsquo;s own published price on {RATES_ASOF}, linked to
        the page it was read from, so you can check us against it rather than take this table&rsquo;s
        word for anything.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StatusChip s="live" />
        <span className="text-[12.5px] text-muted-2">charged today</span>
        <span className="mx-1 text-border">·</span>
        <StatusChip s="draft" />
        <span className="text-[12.5px] text-muted-2">proposed, not charged</span>
        <span className="mx-1 text-border">·</span>
        <StatusChip s="free" />
        <span className="text-[12.5px] text-muted-2">free, and staying free</span>
        <span className="mx-1 text-border">·</span>
        <span className="font-mono text-[11.5px] text-muted-2">
          {c.live} of {c.total} rows live
        </span>
      </div>

      {/* THE UNIT IS UNDECIDED AND THE PAGE SAYS SO. This is the number sync-lock doing its
          job: /pricing publishes $0.01 a token, the metering table is built on $0.001, and a
          third figure invented here would be the failure the rule exists to catch. */}
      {!UNIT_USD_RESOLVED && (
        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/[.06] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold">
            Why the dollar column is empty
          </p>
          <p className="body-copy mt-2 text-[13px] leading-relaxed">
            A credit&rsquo;s dollar value is not settled. The metering this table reads is built
            on 1 credit = $0.001, which is what makes a lane comparable to the model under it;
            the plans on{" "}
            <a href="/pricing/" className="text-accent underline decoration-accent/30 underline-offset-2">
              /pricing
            </a>{" "}
            are built on 1 token = $0.01, which is what makes a $20 plan a plan. Both are in the
            code, ten times apart, and publishing either one here would put a third figure on the
            site. Credits are exact and come from the same table that charges you, so credits are
            what this card shows until someone picks the unit.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-8">
        {GROUPS.map((g) => {
          const rows = RATES.filter((r) => r.group === g.key);
          if (!rows.length) return null;
          return (
            <div key={g.key} className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="flex flex-col gap-1 border-b border-border px-5 pb-3 pt-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <h3 className="text-[17px] font-semibold tracking-tight">{g.title}</h3>
                <p className="body-copy max-w-xl text-[12.5px] leading-relaxed sm:text-right">
                  {g.lede}
                </p>
              </div>

              <div className="overflow-x-auto edge-fade">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-2">
                      <th className="px-4 py-2.5 font-medium">Service</th>
                      <th className="px-4 py-2.5 font-medium">Unit</th>
                      <th className="px-4 py-2.5 font-medium text-right">Credits</th>
                      <th className="px-4 py-2.5 font-medium text-right">USD</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Comparable · {RATES_ASOF}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.name} className="border-b border-border/70 last:border-0 hover:bg-surface/60">
                        <td className="px-4 py-3 align-top">
                          <p className="text-[13.5px] font-semibold tracking-tight">{r.name}</p>
                          {r.note && (
                            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-2">{r.note}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-[12.5px] text-muted">{r.unit}</td>
                        <td className="px-4 py-3 align-top text-right font-mono text-[12.5px] tabular-nums">
                          {fmtCredits(r.credits)}
                        </td>
                        <td className="px-4 py-3 align-top text-right font-mono text-[12.5px] tabular-nums text-muted-2">
                          {fmtUsd(r.credits)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusChip s={r.status} />
                        </td>
                        <td className="px-4 py-3 align-top text-[12px] leading-snug text-muted">
                          {r.market}
                          {r.src && (
                            <>
                              {" "}
                              <a
                                href={r.src}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[11px] text-accent underline decoration-accent/30 underline-offset-2"
                              >
                                source
                              </a>
                            </>
                          )}
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
        Network fee on agent-to-agent work: {NETWORK_FEE.paidHire} on paid work,{" "}
        {NETWORK_FEE.selfHire} when an agent hires itself · the three metered answer lanes are
        read from the same table that charges a balance, so this card cannot drift from the
        billing
      </p>
    </section>
  );
}
