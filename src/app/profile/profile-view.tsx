"use client";

/* The agent profile — built to the design in Downloads/rhinogent_profile.png.

   What is REAL on this screen (reads live, DASH when the feed has nothing):
     · rank, skill, signed, slashed — from the signed reputation feed
     · the agent's own identity — callsign and did, from the keys in this browser
     · "What it remembers about you" — localStorage per agent, and the × genuinely deletes
   What is an EXAMPLE (tagged, because no store backs it yet):
     · the noticed card, and the in-progress / scheduled / completed task lists
   Nothing here invents a number and presents it as the reader's own. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { RhinoAvatar, type AgentState } from "@/components/rhino-a1";
import { PageShell, Card, Honest, TierPill, Example } from "@/components/feed-ui";
import { AGENTS_CHANGED, loadAgents } from "@/lib/agents";
import { loadMemory, removeNote, addNote, MEMORY_CHANGED, type MemoryNote } from "@/lib/agent-memory";
import type { Agent } from "@/lib/identity";
import { useSearch } from "@/lib/use-browser";
import { FEEDS, DASH, fmtInt, isNum, short, useSignedFeed, type RepAgent, type Reputation } from "@/lib/signed-feed";

type Tab = "progress" | "scheduled" | "done";

export function ProfileView() {
  const rep = useSignedFeed<Reputation>(FEEDS.reputation);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const wanted = useSearch().get("agent");
  const [tab, setTab] = useState<Tab>("progress");
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [draft, setDraft] = useState("");
  const [noticed, setNoticed] = useState<"open" | "accepted" | "dismissed">("open");

  useEffect(() => {
    const read = () => setAgents(loadAgents());
    read();
    window.addEventListener(AGENTS_CHANGED, read);
    return () => window.removeEventListener(AGENTS_CHANGED, read);
  }, []);

  const agent = (agents ?? []).find((a) => a.id === wanted) ?? (agents ?? [])[0] ?? null;
  const id = agent?.id ?? wanted ?? null;

  useEffect(() => {
    if (!id) return;
    const read = () => setNotes(loadMemory(id));
    read();
    window.addEventListener(MEMORY_CHANGED, read);
    return () => window.removeEventListener(MEMORY_CHANGED, read);
  }, [id]);

  const standing: RepAgent | undefined = rep.data?.agents?.find((x) => x.callsign === id);
  const state: AgentState = standing && isNum(standing.activity_R) && standing.activity_R > 0 ? "working" : "idle";

  if (agents === null) {
    return (
      <PageShell>
        <div className="mt-10 h-40 animate-pulse rounded-2xl border border-border bg-surface" />
      </PageShell>
    );
  }

  if (!id) {
    return (
      <PageShell>
          <Card className="mt-10 text-center">
            <p className="text-[15px] font-medium">No agent in this browser yet.</p>
            <p className="mt-1 text-[13px] text-muted">
              The profile reads the keys held here — nothing is stored on our side to look up.
            </p>
            <Link
              href="/dashboard/classic"
              className="mt-5 inline-block rounded-full bg-foreground px-5 py-2 text-[13px] font-semibold text-background"
            >
              Create an agent
            </Link>
          </Card>
        </PageShell>
    );
  }

  return (
    <PageShell>
        <div className="mx-auto mt-8 max-w-2xl space-y-4">
          {/* ── header ───────────────────────────────────────────────────────────── */}
          <Card>
            <div className="flex items-start gap-4">
              <RhinoAvatar did={agent?.did || id} name={id} state={state} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">{agent?.label || id}</h1>
                  <TierPill tier={standing?.tier} />
                </div>
                <p className="mt-0.5 truncate font-mono text-[12px] text-muted-2" title={agent?.did}>
                  {agent?.did ? short(agent.did, 18, 5) : DASH}
                </p>
              </div>
              <Link
                href={`/chat?agent=${encodeURIComponent(id)}`}
                aria-label={`Message ${id}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.6 8.6 0 01-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0112 3.1a8.4 8.4 0 019 8.4z" />
                </svg>
              </Link>
            </div>

            {/* standing — real, from the signed feed */}
            <div className="mt-5 grid grid-cols-4 gap-2">
              <Stat k="rank" v={standing && isNum(standing.activity_R) ? String(standing.activity_R) : DASH} />
              <Stat
                k="skill"
                v={standing?.skill_measured && isNum(standing.skill) ? standing.skill.toFixed(2) : DASH}
              />
              <Stat k="signed" v={fmtInt(standing?.outcomes)} />
              {/* The design's fourth stat was SLASHED, showing 0. We publish no slashing figure,
                  and a hardcoded zero is a reassurance we did not measure — the audit found that
                  pattern elsewhere and it is the first thing a reviewer tests. `independence` is
                  published, and it is the number that actually separates a real record from a
                  self-attested one: how much of this agent's standing was re-derived by someone
                  else. */}
              <Stat
                k="indep"
                v={isNum(standing?.independence) ? `${Math.round(standing.independence * 100)}%` : DASH}
              />
            </div>
            {!standing && rep.status === "ok" && (
              <Honest>
                Not in the signed reputation feed yet — standing shows {DASH} until this agent has
                signed outcomes to its name.
              </Honest>
            )}
          </Card>

          {/* ── noticed · read-only ───────────────────────────────────────────────────
              The proactive mode, with the restriction stated. Idle work may READ and
              propose; it cannot send, spend or drive a browser. That boundary is the
              feature — an agent that can act unprompted is a different product. */}
          <Card>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent">
                Noticed · read-only
              </span>
              <span className="ml-auto">
                <Example />
              </span>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed">
              The EU supplier list you curated last week changed: 4 entries updated, 1 removed.
              Want me to re-verify the 4?
            </p>
            {noticed === "open" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setNoticed("accepted")}
                  className="rounded-full bg-foreground px-5 py-2 text-[13px] font-semibold text-background"
                >
                  Yes, re-verify
                </button>
                <button
                  onClick={() => setNoticed("dismissed")}
                  className="rounded-full border border-border px-5 py-2 text-[13px] font-medium"
                >
                  Not now
                </button>
              </div>
            ) : (
              <p className="mt-4 font-mono text-[12px] text-muted">
                {noticed === "accepted" ? "queued — it will ask again before anything is paid" : "dismissed"}
              </p>
            )}
            <Honest>
              While idle it reads your connected apps and proposes. It cannot send a message, change
              anything, or spend — that always comes back to you.
            </Honest>
          </Card>

          {/* ── work ──────────────────────────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-1 border-b border-border">
              <TabBtn on={tab === "progress"} onClick={() => setTab("progress")}>In progress · 1</TabBtn>
              <TabBtn on={tab === "scheduled"} onClick={() => setTab("scheduled")}>Scheduled · 2</TabBtn>
              <TabBtn on={tab === "done"} onClick={() => setTab("done")}>Completed · 14</TabBtn>
              <span className="ml-auto pb-2"><Example /></span>
            </div>
            <div className="divide-y divide-border/70">
              {tab === "progress" && (
                <Job dot="live" title="verify · curve.fi fee claim" sub="65% · challenger 2 of 3" chevron />
              )}
              {tab === "scheduled" && (
                <>
                  <Job dot="idle" title="Every morning 08:00 · re-check supplier_eu" sub="next run in 11h · active" action="Pause" />
                  <Job dot="idle" title="Fridays 17:00 · competitor teardown" sub="next run Fri · paused by you" action="Resume" />
                </>
              )}
              {tab === "done" && (
                <Job dot="idle" title="extract · en.wikipedia.org" sub="42 rows written · signed" chevron />
              )}
            </div>
            <Honest>
              Schedules and the task log are drawn here but not wired to a store yet — these rows are
              an example, not this agent&apos;s work.
            </Honest>
          </Card>

          {/* ── desk ──────────────────────────────────────────────────────────────── */}
          <Link
            href="/terminal"
            className="flex items-center gap-4 rounded-2xl bg-foreground p-5 text-background transition-opacity hover:opacity-95"
          >
            <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <rect x="2.5" y="4" width="19" height="16" rx="2" />
                <path d="M2.5 8.5h19" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold">Open its desk</span>
              <span className="block text-[13px] opacity-75">Watch the browser live</span>
            </span>
            <span aria-hidden className="opacity-60">›</span>
          </Link>

          {/* ── memory — REAL: these notes live in this browser and the × deletes ──── */}
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold">What it remembers about you</h2>
              <span className="font-mono text-[11px] text-muted-2">
                {notes.length} note{notes.length === 1 ? "" : "s"}
              </span>
            </div>

            {notes.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-2">
                Nothing yet. Anything it learns about how you work shows up here, and you can delete
                any line of it.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border/70">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-2.5">
                    <span className="min-w-0 flex-1 text-[14px] leading-relaxed">{n.text}</span>
                    <button
                      onClick={() => setNotes(removeNote(id, n.id))}
                      aria-label={`Forget: ${n.text}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-2 transition-colors hover:border-red-300 hover:text-red-600"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNotes(addNote(id, draft));
                setDraft("");
              }}
              className="mt-3 flex gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Tell it something to remember…"
                aria-label="Add a note"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13.5px] outline-none focus:border-accent/50"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-xl border border-border px-4 text-[13px] font-medium disabled:opacity-40"
              >
                Add
              </button>
            </form>
            <Honest>
              Stored in this browser only, next to your keys. Never sent to us, and deleting a note
              deletes it — there is no hidden copy.
            </Honest>
          </Card>

          {/* ── controls ──────────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 pb-4">
            <Link
              href="/vault"
              className="flex-1 rounded-xl border border-border px-5 py-3 text-center text-[14px] font-semibold"
            >
              Rules &amp; permissions
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-border px-5 py-3 text-[14px] font-semibold"
            >
              All agents
            </Link>
          </div>
        </div>
    </PageShell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-3 text-center">
      <p className="font-mono text-[18px] font-semibold tabular-nums">{v}</p>
      <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-2">{k}</p>
    </div>
  );
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`-mb-px border-b-2 px-3 pb-2 text-[14px] font-semibold ${
        on ? "border-foreground text-foreground" : "border-transparent text-muted-2 hover:text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Job({
  dot,
  title,
  sub,
  action,
  chevron,
}: {
  dot: "live" | "idle";
  title: string;
  sub: string;
  action?: string;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className={`mt-1 h-2 w-2 shrink-0 self-start rounded-full ${dot === "live" ? "bg-emerald" : "bg-muted-2/50"}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold leading-snug">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted-2">{sub}</p>
      </div>
      {/* Illustrative rows, so these are spans — a disabled button would promise it is coming. */}
      {action && (
        <span className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-muted-2">
          {action}
        </span>
      )}
      {chevron && <span aria-hidden className="shrink-0 text-muted-2">›</span>}
    </div>
  );
}
