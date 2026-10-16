"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell, PageHead, Card, CardTitle, Honest, TierPill } from "@/components/feed-ui";
import { AuthGate } from "@/components/auth-gate";
import { RhinoAvatar, type AgentState } from "@/components/rhino-a1";
import { AGENTS_CHANGED, MAX_SLOTS, addAgent, loadAgents, removeAgent } from "@/lib/agents";
import { reward } from "@/lib/wallet";
import { feedFetch } from "@/lib/feeds";
import { supabase } from "@/lib/supabase";
import { accountAgents, pushAgents, deleteAgentEverywhere, type AccountAgent } from "@/lib/agent-sync";
import { setLocal, useLocal } from "@/lib/use-browser";
import { FEEDS, DASH, fmtInt, isNum, short, useSignedFeed, type RepAgent, type Reputation } from "@/lib/signed-feed";
import { AgentDetail, MintingSlot, ToastHost, useToasts, type TokenFeed, type Census } from "./agent-detail";

// My agents — the ONE dashboard. The roster is the ACCOUNT's roster (accountAgents: the keys in
// this browser ∪ the account's public mirror − tombstones), so every account sees all its agents on
// every device; keys only exist where the browser holds them. Standing on each card comes from the
// signed reputation feed; the away-log from the shared ledger. Minting, the full agent detail
// (ProofCard / Agent Card / MCP connect / key reveal / remove) and the census view are folded in
// here — /dashboard/classic now redirects to this page.

const BACKUP_KEY = "rhinogent.keys.lastBackup";
type Row = { amount?: number; reason?: string; kind?: string; created_at?: string; agent?: string; callsign?: string };

// State is read, never invented: in the feed with activity ⇒ working; known but quiet ⇒ idle.
function stateOf(a?: RepAgent): AgentState {
  if (!a) return "idle";
  return isNum(a.activity_R) && a.activity_R > 0 ? "working" : "idle";
}

/* THE GATE, AND WHY IT IS BACK.
   Until this commit /dashboard/ rendered the whole roster — and both "Create an agent" buttons —
   to a visitor with no session. Verified on production, not inferred: a browser with an empty
   localStorage loaded the page, clicked Create, and got a real keypair (Stone-Vault-C472) with
   its private key written to that browser. Three things were wrong with that.

     · The key belonged to nobody. pushAgents() correctly refuses when signed out (it returns
       skipped:"signed-out"), and the call site swallows the result — so the agent existed in
       exactly one browser while the toast said "Agent minted — keys self-custody", which reads
       as "recorded". Clear the browser and it is gone, with no account and no backup prompt.
     · It became someone else's. accountAgents() is local ∪ account-mirror with LOCAL WINNING,
       and pushAgents() merges local agents INTO the mirror of whoever is signed in. So an agent
       made signed-out is adopted by the next account to sign in on that browser — on a shared
       machine, by a different person. That is the part that makes this a security bug rather
       than a cosmetic one, and it is closed twice over: by this gate, and by the owner stamp in
       identity.ts that stops an agent from following a different account home.
     · reward() paid out 0.1 for it.

   The rule already existed — chat-matrix.tsx has carried it since the inline mint shipped
   ("MINT REQUIRES LOGIN … so a stale session never mints an unbound agent"). The dashboard is
   the OTHER creation path, and it never got one. Git says why: the pre-redesign dashboard
   imported AuthGate and branched on `authed` (f1e4b6faf6, "dashboard gated on real session");
   the 2026-10-02 rewrite into "My agents" (f9945484a4) carried the roster across and left the
   gate behind. AuthGate has been mounted nowhere since — which is also why the nav's own
   "Sign in" link, which points at /dashboard/classic → /dashboard/, led to a page with no way
   to sign in.

   So the gate goes back, AND handleAdd re-checks the session underneath it. Hiding a button is
   a UI state, not a guard: the same function is reachable from the rail, from the empty-state
   link and from the dashed card, and a session can expire while the tab sits open. */
export function MyAgents() {
  const rep = useSignedFeed<Reputation>(FEEDS.reputation);
  /* undefined = still reading the session, null = signed out, string = the account's user id.
     The third state is what keeps the signed-out page from flashing the roster before the
     session resolves — the static export ships the same HTML to everyone. */
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [agents, setAgents] = useState<AccountAgent[] | null>(null);
  const [rows, setRows] = useState<Row[] | null | "error">(null);
  const lastBackup = useLocal(BACKUP_KEY);
  const [minting, setMinting] = useState(false);
  const [detailAddr, setDetailAddr] = useState<string | null>(null);
  const [feed, setFeed] = useState<TokenFeed | null>(null);
  const [census, setCensus] = useState<Census | null>(null);
  const { toasts, push } = useToasts();

  const localAsAccount = (): AccountAgent[] => loadAgents().map((a) => ({ ...a, hasKey: true }));

  /* The session, read once and then WATCHED. onAuthStateChange is what makes the gate a door
     rather than a wall: signing in inside AuthGate flips this page to the roster in place,
     with no reload, and a sign-out or an expiry closes it again on every open tab. */
  useEffect(() => {
    let live = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (live) setUid(data.session?.user?.id ?? null); })
      .catch(() => { if (live) setUid(null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (live) setUid(session?.user?.id ?? null);
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let live = true;
    const read = () => { void accountAgents().then((a) => { if (live) setAgents(a); }).catch(() => { if (live) setAgents([]); }); };
    read();
    window.addEventListener(AGENTS_CHANGED, read);
    window.addEventListener("storage", read);
    return () => { live = false; window.removeEventListener(AGENTS_CHANGED, read); window.removeEventListener("storage", read); };
  }, []);

  // The away-log is the signed-in account's ledger, so it reads the session this page already
  // watches instead of fetching its own — one source for "who is signed in", per the sync-lock.
  // Only ever runs for a real account: `undefined` is still-reading and `null` never reaches
  // this render at all, because the gate below returns AuthGate before the board exists. That
  // is why there is no signed-out branch here any more — there is no signed-out board to put
  // one on, and a setState for a state that cannot happen is a cascading render for nothing.
  useEffect(() => {
    if (typeof uid !== "string") return;
    (async () => {
      const r = await supabase.from("token_ledger").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(12);
      setRows(r.error || !r.data ? "error" : (r.data as Row[]));
    })().catch(() => setRows("error"));
  }, [uid]);

  // Read-only earn/census feeds — only used to populate the agent detail modal.
  useEffect(() => {
    feedFetch("/token_feed.json").then((r) => r.json()).then(setFeed).catch(() => {});
    feedFetch("/census.json").then((r) => r.json()).then(setCensus).catch(() => {});
  }, []);

  const standing = (id: string) => rep.data?.agents?.find((x) => x.callsign === id);
  const list = agents ?? [];
  const withKeys = list.filter((a) => a.privateKey);
  const full = list.length >= MAX_SLOTS;
  const detailAgent = detailAddr ? list.find((a) => a.address === detailAddr) ?? null : null;

  /* Create a new self-custody ID in place (brief key ceremony), push it to the account mirror.
     THE SESSION IS RE-READ HERE, not taken from `uid`. The gate above decides what is on screen;
     this decides what is allowed, and the two are deliberately not the same check — `uid` can be
     minutes old on a tab left open, and the agent about to be created is stamped with whatever
     this returns. A refusal is loud, because the alternative is a key that exists and belongs to
     nobody. Same guard, same reason, as chat-matrix.tsx. */
  async function handleAdd() {
    if (minting || full) return;
    let owner: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      owner = data.session?.user?.id ?? null;
    } catch { owner = null; }
    if (!owner) {
      setUid(null);                      // the session went away under an open tab — show the door
      push("Sign in first — every agent binds to your account");
      return;
    }
    setMinting(true);
    setTimeout(() => {
      reward(0.1, "created a new self-custody ID");
      const next = addAgent(loadAgents(), undefined, owner);
      setAgents(next.map((a) => ({ ...a, hasKey: true })));
      pushAgents(next).catch(() => {});
      void accountAgents().then((l) => setAgents(l)).catch(() => {});
      setMinting(false);
      push("Agent created — keys self-custody");
    }, 1100);
  }

  // Tombstone everywhere (survives the union merge), drop the local key copy, re-derive from account.
  async function onRemove(address: string) {
    const localById = loadAgents().find((a) => a.address.toLowerCase() === address.toLowerCase());
    if (localById) removeAgent(loadAgents(), localById.id);
    await deleteAgentEverywhere(address);
    setAgents(await accountAgents());
    push("Agent removed");
  }

  function exportKeys() {
    if (!withKeys.length) return;
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), agents: withKeys }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rhinogent-keys-backup.json"; a.click();
    URL.revokeObjectURL(url);
    setLocal(BACKUP_KEY, new Date().toISOString());
  }

  /* Reading the session. Deliberately NOT the roster skeleton: the skeleton is the shape of a
     dashboard, and showing it to someone who is about to be asked to sign in is a promise the
     next frame breaks. A quiet line costs one frame of nothing and never lies. */
  if (uid === undefined) {
    return (
      <PageShell wide>
        <p className="py-24 text-center text-sm text-muted-2">Reading your session…</p>
      </PageShell>
    );
  }

  /* Signed out. AuthGate is the sign-in / create-account form that has been in the tree since
     f1e4b6faf6 and mounted nowhere since the redesign — this is the page it was written for,
     and the page the nav's "Sign in" link has been pointing at the whole time. */
  if (uid === null) {
    return (
      <PageShell wide>
        <AuthGate />
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <div className="grid gap-5 md:grid-cols-[16rem_1fr]">
        {/* left rail — the account's agents + groups (same shape as the chat rail) */}
        <aside className="h-max rounded-2xl border border-border bg-surface/50 p-3 md:sticky md:top-20">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">Agents</p>
            <button onClick={handleAdd} disabled={minting || full} className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-muted transition-colors hover:text-foreground disabled:opacity-40">+ New</button>
          </div>
          <ul className="space-y-0.5">
            {agents === null && [0, 1, 2].map((i) => <li key={i} className="h-11 animate-pulse rounded-xl bg-surface-2/70" />)}
            {list.map((a) => (
              <RailRow key={a.address} id={a.label || a.id} did={a.did} sub={a.id} state={stateOf(standing(a.id))} />
            ))}
            {agents !== null && list.length === 0 && (
              <li className="px-2 py-3 text-[13px] text-muted-2">No agents yet. <button onClick={handleAdd} className="underline">Create one</button>.</li>
            )}
          </ul>
          <div className="mt-5 flex items-center justify-between px-2 pb-2">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">Groups</p>
            <Link href="/chat/classic/" className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-muted hover:text-foreground">+ New</Link>
          </div>
          <p className="px-2 text-[12.5px] text-muted-2">Several of your agents in one thread. Groups open in the live chat.</p>
        </aside>

        {/* board */}
        <div className="min-w-0">
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

          {/* agent cards — all of them */}
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents === null && [0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-surface" />)}
            {list.map((ag) => {
              const s = standing(ag.id);
              return (
                <Card key={ag.address} className="flex flex-col">
                  {/* header opens the full profile/actions detail */}
                  <button
                    type="button"
                    onClick={() => setDetailAddr(ag.address)}
                    aria-label={`Open ${ag.label || ag.id} details`}
                    className="-m-1 flex items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-accent/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <RhinoAvatar did={ag.did} name={ag.id} state={stateOf(s)} size={48} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold tracking-tight">{ag.label || ag.id}</p>
                      <p className="truncate font-mono text-[11px] text-muted-2" title={ag.did}>{short(ag.did, 16, 4)}</p>
                    </div>
                    <span className="ml-auto"><TierPill tier={s?.tier} /></span>
                  </button>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Tile k="rank" v={s && isNum(s.activity_R) ? `R${s.activity_R}` : DASH} />
                    <Tile k="skill" v={s?.skill_measured && isNum(s.skill) ? `${s.skill.toFixed(2)}${isNum(s.skill_ci) ? `±${s.skill_ci.toFixed(2)}` : ""}` : DASH} />
                    <Tile k="signed" v={fmtInt(s?.outcomes)} />
                  </div>
                  <div className="mt-4 flex-1 rounded-xl border border-border bg-surface/60 px-3 py-2.5">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">doing now</p>
                    <p className="mt-1 font-mono text-[13px] text-muted-2">{DASH}</p>
                  </div>
                  {!s && rep.status === "ok" && <Honest>Not in the signed reputation feed yet — standing shows — until it has signed outcomes.</Honest>}
                  <div className="mt-4 flex gap-1.5">
                    <Link href={`/chat?agent=${encodeURIComponent(ag.id)}`} className="flex-1 rounded-full bg-foreground px-3 py-1.5 text-center text-[12.5px] font-medium text-background">Message</Link>
                    <Link href="/terminal" className="flex-1 rounded-full border border-border px-3 py-1.5 text-center text-[12.5px] text-muted hover:text-foreground">Desk</Link>
                    <button onClick={() => setDetailAddr(ag.address)} className="flex-1 rounded-full border border-border px-3 py-1.5 text-center text-[12.5px] text-muted hover:text-foreground">Profile</button>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Delete ${ag.label || ag.id}? This removes it permanently.`)) void onRemove(ag.address); }}
                    className="mt-2 self-end text-[11px] text-muted-2 transition-colors hover:text-[#ff6b6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    Remove
                  </button>
                </Card>
              );
            })}
            {minting && <MintingSlot />}
            {agents !== null && !full && !minting && (
              <button onClick={handleAdd} className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted transition-colors hover:border-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
                <span className="text-2xl">+</span>
                <span className="mt-1 font-medium">Create an agent</span>
                <span className="mt-1 text-[12px] text-muted-2">key generated in this browser</span>
              </button>
            )}
          </div>

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
                  {rows === null ? "Reading…" : rows === "error" ? `${DASH} ledger unreachable` : "Nothing yet."}
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
              <p className="mt-3 font-mono text-[12px] text-muted-2">{agents ? `${fmtInt(withKeys.length)} key${withKeys.length === 1 ? "" : "s"} in this browser` : DASH}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={exportKeys} disabled={!withKeys.length} className="rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background disabled:opacity-40">Export</button>
              </div>
              <Honest>
                The export file contains your private keys. Anyone holding it controls these agents — keep
                it offline. Key rotation (the old key signing the new one) is not built yet.
              </Honest>
            </Card>
          </div>
        </div>
      </div>

      {detailAgent && (
        <AgentDetail
          agent={detailAgent}
          feed={feed}
          census={census}
          onToast={push}
          onClose={() => setDetailAddr(null)}
        />
      )}
      <ToastHost toasts={toasts} />
    </PageShell>
  );
}

function RailRow({ id, did, sub, state }: { id: string; did: string; sub: string; state: AgentState }) {
  return (
    <li>
      <Link href={`/profile?agent=${encodeURIComponent(sub)}`} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-background/70">
        <RhinoAvatar did={did} name={sub} state={state} size={30} />
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium">{id}</span>
          <span className="block truncate font-mono text-[10.5px] text-muted-2">{sub}</span>
        </span>
      </Link>
    </li>
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
