"use client";

/* Render a feed's published state instead of spinning forever.
   ─────────────────────────────────────────────────────────────────────────────────────────
   /agents sat on "Reading the signed feed…" indefinitely, because reputation_v1.json is not
   served: the network's Angeal is its sole writer and this build must not publish fleet state.
   A spinner that never resolves is the worst of the options — it says "working on it" when
   nothing is working on it, and a reader waits, then leaves, then tells people the site is
   broken.

   The fix is the one the transparency-log world settled on. Across twelve surfaces studied
   2026-10-08 — Sigstore, Rekor, Certificate Transparency, Trillian, Let's Encrypt — the words
   "behind", "lagging" and "not yet included" appear nowhere as product copy. What they publish
   is an ENUMERATED STATE WITH A TIMESTAMP: CT's log list carries `pending | qualified | usable
   | readonly | retired | rejected`, each an object whose one required member is the moment the
   feed entered it, under a schema field titled "the state from the distributor's perspective".

   So this component reads /feed-state.json, which the build generates from the same held-feeds
   list the deploy uses, and renders the state by name. `pending` is not an error and is not
   styled as one: it says who writes the feed and that they have not yet. */

import { useEffect, useState } from "react";

type StateName = "usable" | "pending" | "readonly" | "retired" | "rejected";
type Entry = {
  path: string;
  what?: string;
  writer?: string;
  state: Partial<Record<StateName, { timestamp: string; reason?: string }>>;
};

const TONE: Record<StateName, { label: string; cls: string }> = {
  usable: { label: "usable", cls: "bg-emerald/12 text-emerald" },
  pending: { label: "pending", cls: "bg-gold/15 text-gold" },
  readonly: { label: "read-only", cls: "bg-accent/10 text-accent" },
  retired: { label: "retired", cls: "bg-surface-2 text-muted-2" },
  rejected: { label: "rejected", cls: "bg-surface-2 text-muted" },
};

export function useFeedState(path: string) {
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetch("/feed-state.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live) return;
        const f = (d?.feeds ?? []).find((x: Entry) => x.path === path) ?? null;
        setEntry(f);
      })
      .catch(() => live && setEntry(null));
    return () => {
      live = false;
    };
  }, [path]);
  return entry;
}

/** The named state of one feed. Renders nothing while the state document itself is loading,
 *  and nothing at all when the feed is usable — a working feed needs no banner. */
export function FeedState({ path }: { path: string }) {
  const entry = useFeedState(path);
  if (entry === undefined || entry === null) return null;

  const name = (Object.keys(entry.state)[0] ?? "pending") as StateName;
  if (name === "usable") return null;
  const detail = entry.state[name];
  const tone = TONE[name] ?? TONE.pending;

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${tone.cls}`}
        >
          {tone.label}
        </span>
        <code className="font-mono text-[12.5px] text-accent">{entry.path}</code>
        {detail?.timestamp && (
          <span className="font-mono text-[11px] text-muted-2">
            since {detail.timestamp.replace("T", " ").replace("Z", " UTC")}
          </span>
        )}
      </div>

      <p className="body-copy mt-3 text-[13.5px] leading-relaxed">
        {entry.what}{" "}
        {detail?.reason && <span className="text-muted">{detail.reason}.</span>}
      </p>

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-2">
        This is a published state, not a failure — read it yourself at{" "}
        <a href="/feed-state.json" className="text-accent hover:underline">
          /feed-state.json
        </a>
        . Nothing on this page guesses a number while the feed it comes from is unavailable.
      </p>
    </div>
  );
}
