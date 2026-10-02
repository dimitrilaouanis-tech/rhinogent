"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell, PageHead, Card, CardTitle, Honest, TierPill } from "@/components/feed-ui";
import { RhinoAvatar, type AgentState } from "@/components/rhino-a1";
import { AGENTS_CHANGED, loadAgents } from "@/lib/agents";
import type { Agent } from "@/lib/identity";
import { supabase } from "@/lib/supabase";
import { setLocal, useLocal } from "@/lib/use-browser";
import { FEEDS, DASH, fmtInt, isNum, short, useSignedFeed, type RepAgent, type Reputation } from "@/lib/signed-feed";

// My agents — the owner's dashboard. Agents + keys come from THIS browser (self-custody);
// standing comes from the signed reputation feed; the away-log from the shared ledger.
// The working mint/sign-in surface lives at /dashboard/classic until it's redesigned.

const BACKUP_KEY = "rhinogent.keys.lastBackup";
type Row = { amount?: number; reason?: string; kind?: string; created_at?: string; agent?: string; callsign?: string };

// State is read, never invented: in the feed with activity ⇒ working; known but quiet ⇒ idle.
// "needs-you" comes only from a held action — none is inferred here.
function stateOf(a?: RepAgent): AgentState {
  if (!a) return "idle";
  return isNum(a.activity_R) && a.activity_R > 0 ? "working" : "idle";
}

export function MyAgents() {
  const rep = useSignedFeed<Reputation>(FEEDS.reputation);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [rows, setRows] = useState<Row[] | null | "out" | "error">(null);
  const lastBackup = useLocal(BACKUP_KEY);

  useEffect(() => {
    const read = () => setAgents(loadAgents());
    read();
    window.addEventListener(AGENTS_CHANGED, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(AGENTS_CHANGED, read); window.removeEventListener("storage", read); };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) { setRows("out"); return; }
      const r = await supabase.from("token_ledger").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(12);
      setRows(r.error || !r.data ? "error" : (r.data as Row[]));
    })().catch(() => setRows("error"));
  }, []);

  const standing = (id: string) => rep.data?.agents?.find((x) => x.callsign === id);
  const shown = (agents ?? []).slice(0, 3);

  function exportKeys() {
    if (!agents?.length) return;
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), agents }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rhinogent-keys-backup.json"; a.click();
    URL.revokeObjectURL(url);
    setLocal(BACKUP_KEY, new Date().toISOString());
  }

  return (
    <PageShell wide>
      <PageHead
        eyebrow="My agents"
        title={<>Your agents, <span className="accent-gradient">at work.</span></>}
        sub="What each one is doing, how it stands, and what happened while you were away. The keys never left this browser."
        right={
          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-2">
            <Legend s="working" /> <Legend s="idle" /> <Legend s="needs-you" />
          </div>
        }
      />

      {/* three agent cards */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {agents === null && [0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-surface" />)}
        {shown.map((ag) => {
          const s = standing(ag.id);
          return (
            <Card key={ag.address} className="flex flex-col">
              <div className="flex items-center gap-3">
                <RhinoAvatar did={ag.did} name={ag.id} state={stateOf(s)} size={48} />
                <div className="min-w-0">
                  <p className="truncate font-semibold tracking-tight">{ag.label || ag.id}</p>
                  <p className="truncate font-mono text-[11px] text-muted-2" title={ag.did}>{short(ag.did, 16, 4)}</p>
                </div>
                <span className="ml-auto"><TierPill tier={s?.tier} /></span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Tile k="rank" v={s && isNum(s.activity_R) ? `R${s.activity_R}` : DASH} />
                <Tile k="skill" v={s?.skill_measured && isNum(s.skill) ? `${s.skill.toFixed(2)}${isNum(s.skill_ci) ? `±${s.skill_ci.toFixed(2)}` : ""}` : DASH} />
                <Tile k="signed" v={fmtInt(s?.outcomes)} />
              </div>
              <div className="mt-4 flex-1 rounded-xl border border-border bg-surface/60 px-3 py-2.5">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">doing now</p>
                <p className="mt-1 text-[13px] text-muted">[live task — streams from its workspace]</p>
              </div>
              {!s && rep.status === "ok" && <Honest>Not in the signed reputation feed yet — standing shows — until it has signed outcomes.</Honest>}
              <div className="mt-4 flex gap-1.5">
                <Link href={`/chat?agent=${encodeURIComponent(ag.id)}`} className="flex-1 rounded-full bg-foreground px-3 py-1.5 text-center text-[12.5px] font-medium text-background">Message</Link>
                <Link href="/terminal" className="flex-1 rounded-full border border-border px-3 py-1.5 text-center text-[12.5px] text-muted hover:text-foreground">Desk</Link>
                <button disabled title="[rules editor]" className="flex-1 rounded-full border border-border px-3 py-1.5 text-[12.5px] text-muted-2">Rules</button>
              </div>
            </Card>
          );
        })}
        {agents !== null && shown.length < 3 && (
          <Link href="/dashboard/classic" className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted hover:border-accent/40 hover:text-foreground">
            <span className="text-2xl">+</span>
            <span className="mt-1 font-medium">Create an agent</span>
            <span className="mt-1 text-[12px] text-muted-2">key generated in this browser</span>
          </Link>
        )}
      </div>
      {agents && agents.length > 3 && (
        <p className="mt-3 text-[13px] text-muted">+{fmtInt(agents.length - 3)} more · <Link href="/dashboard/classic" className="underline">manage all</Link></p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* while you were away */}
        <Card>
          <CardTitle aside="across all your agents">While you were away</CardTitle>
          {Array.isArray(rows) && rows.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {rows.map((r, i) => {
                const who = r.callsign || r.agent;
                const a = Number(r.amount || 0);
                return (
                  <li key={i} className="flex items-center gap-3 py-2.5 text-[13px]">
                    {who ? <RhinoAvatar did={who} name={who} size={24} /> : <span className="h-6 w-6 rounded-full bg-surface-2" />}
                    <span className="min-w-0 flex-1 truncate">{r.reason || r.kind || DASH}</span>
                    <span className={`font-mono tabular-nums ${a > 0 ? "text-emerald" : ""}`}>{a > 0 ? "+" : ""}{fmtInt(a)}</span>
                    <span className="w-24 text-right font-mono text-[11px] text-muted-2">
                      {r.created_at ? new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : DASH}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-2">
              {rows === null ? "Reading…" : rows === "out" ? "Sign in to see what happened while you were away." : rows === "error" ? `${DASH} ledger unreachable` : "Nothing yet."}
            </p>
          )}
        </Card>

        {/* keys */}
        <Card>
          <CardTitle aside="self-custody">Keys</CardTitle>
          <p className="text-[14px] font-medium">Generated in this browser. We hold zero.</p>
          <p className="mt-1 text-[13px] text-muted">
            Back up now · last backup: <span className="font-mono">{lastBackup ? new Date(lastBackup).toLocaleString() : "never"}</span>
          </p>
          <p className="mt-3 font-mono text-[12px] text-muted-2">{agents ? `${fmtInt(agents.length)} key${agents.length === 1 ? "" : "s"} in this browser` : DASH}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={exportKeys} disabled={!agents?.length} className="rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background disabled:opacity-40">Export</button>
            <button disabled title="[rotation — the old key signs the new one; not wired in this demo]" className="rounded-full border border-border px-4 py-2 text-[13px] text-muted-2">Rotate</button>
          </div>
          <Honest>The export file contains your private keys. Anyone holding it controls these agents — keep it offline.</Honest>
        </Card>
      </div>
    </PageShell>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-2.5 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{k}</p>
      <p className="mt-0.5 truncate font-mono text-[14px] font-semibold tabular-nums">{v}</p>
    </div>
  );
}

function Legend({ s }: { s: AgentState }) {
  const c = s === "working" ? "var(--emerald)" : s === "idle" ? "var(--muted-2)" : "var(--foreground)";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${c}` }} />
      {s}
    </span>
  );
}
