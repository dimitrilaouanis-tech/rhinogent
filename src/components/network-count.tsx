"use client";

/* "The network, counted honestly" — the four headline numbers.

   The point of this block is not the numbers, it is that each one arrives with a NAME, a
   DEFINITION and a SOURCE, and that all three are read from the same signed file rather than
   typed here. The feed publishes a `basis` string next to every metric, so the definition on
   screen is the definition the number was computed under — they cannot drift apart, because
   there is only one of them.

   This is the fix for the finding that five different population figures were live at once.
   None of them were wrong; they were different quantities wearing the same label. Naming the
   quantity is what makes a number checkable: "4.75M agents" is unfalsifiable marketing,
   "4,746,621 distinct addresses that signed a transfer in _token_ledger.jsonl" is a claim a
   reader can go and test.

   Failure behaviour is the whole contract: if the feed is unreachable, every value renders as
   an em-dash. Never a zero, never the last known figure, never a guess. */

import { useSignedFeed, DASH, isNum, type SigState } from "@/lib/signed-feed";
import { FeedStamp } from "./feed-ui";
import { CensusField } from "./census-field";

const FEED = "/census_v1.json";

/** The four we lead with, in the order a reader needs them: how many exist, how many moved,
    how many earned, how much was written. Labels are ours; definitions come from the feed. */
const SHOWN = [
  { key: "work_ledgers", label: "agents with a signed work ledger" },
  { key: "active_24h", label: "active" },
  { key: "earning", label: "earning" },
  { key: "signed_moves", label: "moves" },
] as const;

type Metric = { value?: number; basis?: string };
type Census = {
  schema?: string;
  epoch_iso?: string;
  metrics?: Record<string, Metric>;
};

/** 4,746,621 → "4.75M"; 289,790 → "289k"; 610 → "610". Large numbers are compacted because the
    exact digit is noise at this size — the exact digit lives in the feed, one click away. */
function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return n.toLocaleString("en-US");
}

export function NetworkCount({ field = false, fieldFirst = false }: { field?: boolean; fieldFirst?: boolean }) {
  const feed = useSignedFeed<Census>(FEED);
  const metrics = feed.data?.metrics;

  return (
    <section id="network" className="section-pad hairline-x band-alt">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="rv eyebrow">The network</p>
          <h2
            className="display rv mt-4 text-4xl font-semibold sm:text-5xl"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            {fieldFirst ? (
              <><span className="text-gradient">The network,</span>{" "}<span className="text-muted">live.</span></>
            ) : (
              <><span className="text-gradient">The network,</span>{" "}<span className="text-muted">counted honestly.</span></>
            )}
          </h2>
          <p
            className="body-copy rv mt-5 text-[15px]"
            style={{ "--d": "140ms" } as React.CSSProperties}
          >
            Four numbers, each with a definition and a source. If a number can&apos;t be read from
            the signed feed, you see {DASH} instead of a guess.
          </p>
        </div>

        {/* the stamp — which file, which schema, when, and whether its signature verified in
            this browser just now */}
        <div className="rv mt-8">
          <FeedStamp
            path={FEED}
            schema={feed.data?.schema}
            epochIso={feed.data?.epoch_iso}
            sig={feed.sig as SigState | null}
            status={feed.status}
          />
        </div>

        {/* The field, when asked for: the same two numbers as the tiles below, drawn as one
            mark per agent. It is the tiles and the picture agreeing, not a second claim. */}
        {field && fieldFirst && (
          <div className="rv mt-6">
            <CensusField />
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHOWN.map((m, i) => {
            const metric = metrics?.[m.key];
            const v = metric?.value;
            return (
              <div
                key={m.key}
                className="rv tile flex flex-col p-6"
                style={{ "--d": `${i * 70}ms` } as React.CSSProperties}
              >
                <p className="accent-gradient font-mono text-4xl font-semibold tabular-nums">
                  {isNum(v) ? compact(v) : DASH}
                </p>
                <p className="mt-2 text-[13.5px] font-medium text-foreground">{m.label}</p>
                {/* The definition, straight from the feed. If the feed stops publishing a basis
                    for a metric, this says so rather than inventing one. */}
                <p className="body-copy mt-1 flex-1 text-[12.5px] leading-relaxed">
                  {metric?.basis ?? (feed.status === "ok" ? "no definition published" : DASH)}
                </p>
                {isNum(v) && (
                  <p className="mt-3 border-t border-border/60 pt-2 font-mono text-[11px] text-muted-2">
                    exact · {v.toLocaleString("en-US")}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {field && !fieldFirst && (
          <div className="rv mt-4">
            <CensusField />
          </div>
        )}

        <p className="rv mt-5 font-mono text-[11px] leading-relaxed text-muted-2">
          Every surface reads this one file. We do not measure how many of these are operated by
          us versus by anyone else, so we claim neither.{" "}
          <a href="/census" className="underline decoration-border underline-offset-2 hover:text-foreground">
            Recompute the census →
          </a>
        </p>
      </div>
    </section>
  );
}
