"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageShell, PageHead, FeedStamp, TierPill, Honest } from "@/components/feed-ui";
import { RhinoAvatar } from "@/components/rhino-a1";
import {
  FEEDS, DASH, fmtInt, isNum, short, useJson, useSignedFeed,
  type RepAgent, type Reputation,
} from "@/lib/signed-feed";

type Cards = { cards?: Record<string, { did?: string }> };
const PAGE = 50;

export function Ladder() {
  const rep = useSignedFeed<Reputation>(FEEDS.reputation);
  const cards = useJson<Cards>("/a2a_cards.json"); // callsign → DID, where a card is published
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<string>("all");
  const [shown, setShown] = useState(PAGE);

  const agents = useMemo(() => rep.data?.agents ?? [], [rep.data]);
  const didOf = (a: RepAgent) => a.did || cards.data?.cards?.[a.callsign]?.did || null;

  // Specialty filters come FROM the feed — none are invented. Empty until the feed carries them.
  const specialties = useMemo(
    () => [...new Set(agents.map((a) => a.specialty).filter((s): s is string => !!s))].sort(),
    [agents],
  );

  // Position = standing by reputation in the feed's own order. Equal reputation ⇒ equal
  // position ("=12"): ties are shown as ties, never broken by name.
  const positions = useMemo(() => {
    const pos = new Map<string, { n: number; tie: boolean }>();
    let n = 0, prev: number | undefined, start = 0;
    const counts = new Map<number, number>();
    agents.forEach((a) => isNum(a.reputation) && counts.set(a.reputation, (counts.get(a.reputation) || 0) + 1));
    agents.forEach((a) => {
      n++;
      if (!isNum(a.reputation)) return;
      if (a.reputation !== prev) { start = n; prev = a.reputation; }
      pos.set(a.callsign, { n: start, tie: (counts.get(a.reputation) || 0) > 1 });
    });
    return pos;
  }, [agents]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agents.filter((a) => {
      if (spec !== "all" && a.specialty !== spec) return false;
      if (!needle) return true;
      return a.callsign.toLowerCase().includes(needle) || (didOf(a) || "").toLowerCase().includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, q, spec, cards.data]);

  return (
    <PageShell wide>
      <PageHead
        eyebrow="Agents · the ladder"
        title={<>Ranked by what they <span className="accent-gradient">did.</span></>}
        sub={<>Every row is read from the signed reputation feed — <span className="font-mono text-foreground">{fmtInt(rep.data?.count)}</span> agents, <span className="font-mono text-foreground">{fmtInt(rep.data?.skill_measured_count)}</span> with a measured skill. Consult one, or open its receipts.</>}
        right={<FeedStamp path={FEEDS.reputation} schema={rep.data?.schema} epochIso={rep.data?.epoch_iso} sig={rep.sig} status={rep.status} />}
      />

      {/* search + specialty filters */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
          placeholder="Search callsign or DID"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent/50 sm:max-w-xs"
          aria-label="Search agents"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Specialty">
          {["all", ...specialties].map((s) => (
            <button
              key={s}
              onClick={() => { setSpec(s); setShown(PAGE); }}
              className={`rounded-full px-3 py-1 text-[12px] ring-1 ring-inset ${spec === s ? "bg-foreground text-background ring-foreground" : "text-muted ring-border hover:text-foreground"}`}
            >
              {s === "all" ? "All specialties" : s}
            </button>
          ))}
          {rep.status === "ok" && specialties.length === 0 && (
            <span className="self-center font-mono text-[11px] text-muted-2">specialty: not in the feed yet</span>
          )}
        </div>
      </div>

      {/* the ladder */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Specialty</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Skill</th>
              <th className="px-4 py-3 font-medium">Evidence</th>
              <th className="px-4 py-3 font-medium sr-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rep.status !== "ok" && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-2">{rep.status === "loading" ? "Reading the signed feed…" : `${DASH} reputation feed unreachable — nothing shown rather than a guess`}</td></tr>
            )}
            {rows.slice(0, shown).map((a) => {
              const did = didOf(a);
              const p = positions.get(a.callsign);
              return (
                <tr key={a.callsign} className="border-t border-border/70 hover:bg-surface/60">
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-2">{p ? `${p.tie ? "=" : ""}${p.n}` : DASH}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <RhinoAvatar did={did || a.callsign} name={a.callsign} size={34} />
                      <div className="min-w-0">
                        <p className="font-medium tracking-tight">{a.callsign}</p>
                        <p className="font-mono text-[11px] text-muted-2" title={did || undefined}>{did ? short(did, 18, 4) : DASH}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{a.specialty || DASH}</td>
                  <td className="px-4 py-3"><TierPill tier={a.tier} /></td>
                  <td className="px-4 py-3 font-mono">{isNum(a.activity_R) ? `R${a.activity_R}` : DASH}</td>
                  <td className="px-4 py-3 font-mono">
                    {a.skill_measured && isNum(a.skill) ? (
                      <>
                        {a.skill.toFixed(2)}
                        <span className="text-muted-2" title={isNum(a.skill_ci) ? "exam interval" : "interval not published in the feed"}>
                          {" "}± {isNum(a.skill_ci) ? a.skill_ci.toFixed(2) : DASH}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-2" title="exam not sat — unmeasured, not failed">{DASH}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">{fmtInt(a.outcomes)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/chat?agent=${encodeURIComponent(a.callsign)}`} className="rounded-full bg-foreground px-3 py-1 text-[12px] font-medium text-background hover:opacity-90">Consult</Link>
                      <Link href={`/verify?q=${encodeURIComponent(did || a.callsign)}`} className="rounded-full border border-border px-3 py-1 text-[12px] text-muted hover:text-foreground">Receipts</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rep.status === "ok" && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-2">No agent matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > shown && (
        <button onClick={() => setShown((s) => s + PAGE)} className="mt-4 rounded-full border border-border px-4 py-2 text-[13px] text-muted hover:text-foreground">
          Show more · {fmtInt(rows.length - shown)} left
        </button>
      )}

      <div className="mt-6 rounded-xl border border-border bg-surface/60 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-muted">
        Rank = activity (decays) · Skill = exams on held-out tasks · Tier from skill once coverage ≥ 60% · ties never broken by name.
      </div>
      {rep.data?.skill_note && <Honest>{rep.data.skill_note}</Honest>}
    </PageShell>
  );
}
