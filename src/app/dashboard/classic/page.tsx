"use client";

import Link from "next/link";
import { feedFetch } from "@/lib/feeds";
import { reward, getWallet } from "@/lib/wallet";
import { useEffect, useMemo, useRef, useState } from "react";
import { RhinoMark, RhinoMascot } from "@/components/rhino";
import { Nav } from "@/components/nav";
import { AuthGate } from "@/components/auth-gate";
import { supabase } from "@/lib/supabase";
import { type Agent, shortAddr, proofCardUrl, agentCardJson } from "@/lib/identity";
import { accountAgents, pushAgents, deleteAgentEverywhere, type AccountAgent } from "@/lib/agent-sync";
import {
  MAX_SLOTS,
  addAgent,
  loadAgents,
  removeAgent,
} from "@/lib/agents";

/* ───────────────────────── earn/census data (honest, read-only) ─────────────────────────
   Same feeds the /earn dashboard reads — /token_feed.json (signed transfers → TOKEN + tier)
   and /census.json (public ladder presence). No fabrication: an agent absent from a feed
   reads as 0 / "not on the ladder yet", never an invented number. */
type Tx = { from: string; to: string; amount: number };
type TokenFeed = { txs?: Tx[]; total_verified?: number };
type CensusAgent = { callsign: string; address: string; score: number; kind?: string; specialty?: string };
type Census = { top?: CensusAgent[]; count?: number };

/** Net TOKEN for a callsign from the signed transfer feed: received − sent. Absent ⇒ 0 / unseen. */
function tokenBalance(feed: TokenFeed | null, id: string): { net: number; seen: boolean } {
  const txs = feed?.txs ?? [];
  let net = 0;
  let seen = false;
  for (const t of txs) {
    if (t.to === id) { net += Number(t.amount) || 0; seen = true; }
    if (t.from === id) { net -= Number(t.amount) || 0; seen = true; }
  }
  return { net, seen };
}

const TIERS = ["NEW", "EMERGING", "ACTIVE", "VERIFIED"] as const;
type Tier = (typeof TIERS)[number];
/** Credential tier derived from verified TOKEN — provisional mapping, decays without work. */
function tierFor(net: number, seen: boolean): Tier {
  if (!seen || net <= 0) return "NEW";
  if (net < 25) return "EMERGING";
  if (net < 100) return "ACTIVE";
  return "VERIFIED";
}

/** Status-dot styling per tier: emerald VERIFIED/ACTIVE, amber EMERGING, slate NEW. */
function statusMeta(tier: Tier): { dot: string; ring: string; text: string } {
  switch (tier) {
    case "VERIFIED":
    case "ACTIVE":
      return { dot: "bg-emerald", ring: "ring-emerald/25", text: "text-emerald" };
    case "EMERGING":
      return { dot: "bg-gold", ring: "ring-gold/25", text: "text-[#a8790f]" };
    default:
      return { dot: "bg-muted-2", ring: "ring-muted-2/20", text: "text-muted-2" };
  }
}

/** The agent's public-ladder rank (1-based) + score, or null if it isn't on the census. */
function censusRank(census: Census | null, agent: AccountAgent): { rank: number; total: number; score: number } | null {
  const top = census?.top ?? [];
  if (!top.length) return null;
  const i = top.findIndex(
    (c) => c.callsign === agent.id || c.address?.toLowerCase() === agent.address.toLowerCase(),
  );
  if (i < 0) return null;
  return { rank: i + 1, total: census?.count ?? top.length, score: Number(top[i].score) || 0 };
}

/* Reusable flagship hairline: a 1px top-light gradient across the top edge of a card/tile.
   The parent must be `relative` (and usually `overflow-hidden`). */
function TopLight() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
    />
  );
}

/* address-derived identicon (decorative, matches /earn) */
function Identicon({ address, size = 40 }: { address: string; size?: number }) {
  const hex = (address || "").replace(/^0x/, "").padEnd(30, "0");
  const bytes: number[] = [];
  for (let i = 0; i < 15; i++) bytes.push(parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0);
  const cells: boolean[] = [];
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 5; row++) cells.push(bytes[col * 5 + row] % 2 === 0);
  }
  const cell = size / 5;
  const rects: React.ReactNode[] = [];
  for (let col = 0; col < 5; col++) {
    const src = col < 3 ? col : 4 - col;
    for (let row = 0; row < 5; row++) {
      if (cells[src * 5 + row]) {
        rects.push(<rect key={`${col}-${row}`} x={col * cell} y={row * cell} width={cell} height={cell} rx={1} />);
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="flex-none rounded-lg text-accent ring-1 ring-accent/20"
      style={{ background: "rgba(99,91,255,0.06)" }}
      aria-hidden
    >
      <g fill="currentColor">{rects}</g>
    </svg>
  );
}

/* ───────────────────────── lightweight toast host ─────────────────────────
   CSS/React only (no deps). Bottom-right, auto-dismiss, reduced-motion safe. */
type ToastItem = { id: number; msg: string };
function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = (msg: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1900);
  };
  return { toasts, push };
}
function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex flex-col items-end gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] font-medium text-foreground shadow-lg"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [agents, setAgents] = useState<AccountAgent[]>([]);

  // Local agents (this device holds their keys) shown instantly; the account view merges in
  // agents minted on OTHER devices via the public mirror (works for OAuth too).
  const localAsAccount = (): AccountAgent[] => loadAgents().map((a) => ({ ...a, hasKey: true }));

  useEffect(() => {
    setAgents(localAsAccount());
    setMounted(true);
    // real Supabase session
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setEmail(data.session?.user?.email || "");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setEmail(session?.user?.email || "");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // CROSS-DEVICE AGENTS: once signed in, show every agent on the account — not just this
  // device's localStorage. Push local ones up so other devices see them too.
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [syncNonce, setSyncNonce] = useState(0);
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    const sync = async () => {
      try {
        const local = loadAgents();
        if (local.length) {
          const res = await pushAgents(local);            // make sure this device's agents reach the account
          // fail LOUDLY: a mirror push that silently fails is why phone≠desktop went unnoticed
          if (alive) setSyncErr(local.length && !res.ok ? (res.error || "Couldn’t reach your account") : null);
        } else if (alive) setSyncErr(null);
        const merged = await accountAgents();             // local (keys) ∪ account mirror (identity only)
        if (alive) setAgents(merged);
      } catch (e) {
        if (alive) setSyncErr((e as { message?: string })?.message || "Sync failed");
      }
    };
    sync();
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", sync);
    // LIVE cross-device: subscribe to this user's agents rows (RLS-scoped) so a mint on another
    // device pushes here instantly — not just on focus/visibility. (Supabase Realtime postgres_changes.)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data?.user) return;
      channel = supabase
        .channel(`agents:${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "agents", filter: `user_id=eq.${data.user.id}` }, sync)
        .subscribe();
    });
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", sync);
      if (channel) supabase.removeChannel(channel);
    };
  }, [authed, syncNonce]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      {authed && syncErr && (
        <div className="border-b border-gold/30 bg-gold/10 px-5 py-2.5">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-[13px]">
            <span className="text-[#8a6d0a]">⚠ Your agents aren’t synced to your account — other devices won’t see them. <span className="text-muted-2">({syncErr})</span></span>
            <button onClick={() => setSyncNonce((n) => n + 1)} className="shrink-0 rounded-full border border-gold/40 bg-background px-3 py-1 font-medium text-[#8a6d0a] transition-colors hover:bg-gold/10">Retry</button>
          </div>
        </div>
      )}
      {authed ? (
        <Profile
          agents={agents}
          mounted={mounted}
          onAdd={() => {
            reward(0.1, "minted a new self-custody ID");
            const next = addAgent(loadAgents());
            setAgents(next.map((a) => ({ ...a, hasKey: true })));
            pushAgents(next).catch(() => {});          // ← the missing half: mint now reaches the account
          }}
          onRemove={async (address) => {
            // tombstone everywhere (survives the union merge) — works for remote-only agents too,
            // then re-derive the view from the account so the delete is authoritative.
            const localById = loadAgents().find((a) => a.address.toLowerCase() === address.toLowerCase());
            if (localById) removeAgent(loadAgents(), localById.id);   // drop local key copy if we hold it
            await deleteAgentEverywhere(address);
            setAgents(await accountAgents());
          }}
        />
      ) : (
        <AuthGate />
      )}
    </div>
  );
}


/* ───────────────────────── profile panel ───────────────────────── */
function Profile({
  agents,
  mounted,
  onAdd,
  onRemove,
}: {
  agents: AccountAgent[];
  mounted: boolean;
  onAdd: () => void;
  onRemove: (address: string) => void;
}) {
  const full = agents.length >= MAX_SLOTS;
  const [minting, setMinting] = useState(false);
  // Click-to-open detail view + the read-only earn/census feeds it reads.
  const [detailAddr, setDetailAddr] = useState<string | null>(null);
  const [feed, setFeed] = useState<TokenFeed | null>(null);
  const [census, setCensus] = useState<Census | null>(null);
  const [feedsLoaded, setFeedsLoaded] = useState(false);
  const { toasts, push } = useToasts();
  useEffect(() => {
    Promise.allSettled([
      feedFetch("/token_feed.json").then((r) => r.json()).then(setFeed),
      feedFetch("/census.json").then((r) => r.json()).then(setCensus),
    ]).finally(() => setFeedsLoaded(true));
  }, []);
  const detailAgent = detailAddr ? agents.find((a) => a.address === detailAddr) ?? null : null;
  const handleAdd = () => {
    if (full || minting) return;
    // brief mint animation (feels like real key ceremony) then commit
    setMinting(true);
    setTimeout(() => { onAdd(); setMinting(false); push("Agent minted — keys self-custody"); }, 1100);
  };

  // First paint before localStorage/feeds settle → shimmer, not a bare spinner or layout shift.
  const booting = !mounted;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            Your agents
          </h1>
          <p className="mt-2 text-sm text-muted">
            {agents.length} of {MAX_SLOTS} slots used · each is a self-custody
            identity + Base wallet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdd}
            disabled={full || minting}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {minting ? (
              <>
                <Spinner className="h-4 w-4" /> Minting…
              </>
            ) : (
              "+ Add new ID & wallet"
            )}
          </button>
        </div>
      </div>

      {booting ? (
        <SkeletonGrid />
      ) : agents.length === 0 && !minting ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <>
          <StatStrip agents={agents} feed={feed} census={census} loading={!feedsLoaded} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                feed={feed}
                census={census}
                feedsLoaded={feedsLoaded}
                onToast={push}
                onRemove={() => onRemove(a.address)}
                onOpen={() => setDetailAddr(a.address)}
              />
            ))}
            {minting && <MintingSlot />}
            {!full && !minting && <AddSlot onAdd={handleAdd} count={agents.length} />}
          </div>
        </>
      )}

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
    </main>
  );
}

/* ───────────────────────── stat strip ─────────────────────────
   Honest aggregates from the same feeds: agent count, aggregate TOKEN, best public
   rank, and the credential mix. Absent data reads as 0 / "—", never invented. */
function StatStrip({
  agents, feed, census, loading,
}: { agents: AccountAgent[]; feed: TokenFeed | null; census: Census | null; loading: boolean }) {
  const totalToken = agents.reduce((s, a) => s + Math.max(0, tokenBalance(feed, a.id).net), 0);
  const ranks = agents.map((a) => censusRank(census, a)).filter((r): r is NonNullable<typeof r> => r !== null);
  const bestRank = ranks.length ? Math.min(...ranks.map((r) => r.rank)) : null;
  const topTier = agents.reduce<Tier>((best, a) => {
    const t = tierFor(tokenBalance(feed, a.id).net, tokenBalance(feed, a.id).seen);
    return TIERS.indexOf(t) > TIERS.indexOf(best) ? t : best;
  }, "NEW");

  // spendable wallet balance (account-level) — distinct from earned TOKEN
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getWallet().then((w) => { if (alive) setBalance(w.balance); }).catch(() => {});
    const onCh = () => getWallet().then((w) => { if (alive) setBalance(w.balance); }).catch(() => {});
    window.addEventListener("wallet:reward", onCh);
    return () => { alive = false; window.removeEventListener("wallet:reward", onCh); };
  }, [agents.length]);

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "Agents", value: String(agents.length), sub: `of ${MAX_SLOTS} slots` },
    { label: "Aggregate TOKEN", value: loading ? "" : totalToken.toLocaleString(), sub: "internal · non-transferable" },
    { label: "Balance", value: balance == null ? "" : balance.toLocaleString(), sub: "preview · stored in your browser" },
    { label: "Best rank", value: loading ? "" : bestRank ? `#${bestRank}` : "—", sub: bestRank ? "provisional · under validation" : "not ranked yet" },
    { label: "Top tier", value: loading ? "" : topTier, sub: "highest across your agents" },
  ];

  return (
    <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4">
          <TopLight />
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-2">{t.label}</p>
          {t.value === "" ? (
            <div className="mt-2 h-7 w-16 animate-pulse rounded-md bg-border/60" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground tabular-nums">{t.value}</p>
          )}
          {t.sub && <p className="mt-0.5 text-[11px] text-muted-2">{t.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── skeleton loaders ───────────────────────── */
function SkeletonGrid() {
  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4">
            <TopLight />
            <div className="h-3 w-20 animate-pulse rounded bg-border/50" />
            <div className="mt-3 h-7 w-14 animate-pulse rounded-md bg-border/60" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </>
  );
}
function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5">
      <TopLight />
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 flex-none animate-pulse rounded-lg bg-border/60" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 animate-pulse rounded bg-border/60" />
          <div className="h-2.5 w-40 animate-pulse rounded bg-border/40" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-border/40" />
        ))}
      </div>
      <div className="mt-4 h-10 animate-pulse rounded-xl bg-border/50" />
    </div>
  );
}

/* ───────────────────────── agent detail modal (forum-profile template) ─────────────────────────
   Opens when a card is clicked. Reads like a Discourse/GitHub profile — banner + overlapping
   identicon, a reputation strip, a credential trust-level track, per-domain ranks, a badge grid,
   and key facts — all from the same feeds /earn reads. Never fabricates a rank/TOKEN/tier/badge:
   absent data reads as "none yet — earn it." Additive: the card's actions are untouched.
   Esc closes; focus is trapped to the dialog and returned to the trigger; reduced-motion respected. */
const DOMAINS = ["coding / agent-building", "models", "payments", "protocols", "proofs", "markets", "philosophy"];

function AgentDetail({
  agent,
  feed,
  census,
  onToast,
  onClose,
}: {
  agent: AccountAgent;
  feed: TokenFeed | null;
  census: Census | null;
  onToast: (msg: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const bal = useMemo(() => tokenBalance(feed, agent.id), [feed, agent.id]);
  const tier = tierFor(bal.net, bal.seen);
  const rank = useMemo(() => censusRank(census, agent), [census, agent]);
  const inCensus = rank !== null;
  const did = `did:pkh:eip155:8453:${agent.address}`;
  const proofHref = `https://rhinogent.com/card?n=${encodeURIComponent(agent.id)}&a=${agent.address}`;
  const created = agent.createdAt ? new Date(agent.createdAt) : null;
  const tierIdx = TIERS.indexOf(tier);
  const status = statusMeta(tier);
  const toVerified = Math.max(0, 100 - Math.max(0, bal.net));

  // Honest badges — earned ONLY from real signals; everything else stays locked.
  const badges = [
    { label: "Self-custody", earned: agent.hasKey },
    { label: "First TOKEN", earned: bal.seen && bal.net > 0 },
    { label: "On the ladder", earned: inCensus },
    { label: "Verified tier", earned: tier === "VERIFIED" },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value);
    onToast(`${label} copied`);
  };

  // Focus the close button on open; restore focus + lock scroll on unmount.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm motion-safe:animate-[fadeIn_.15s_ease-out] sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface shadow-2xl motion-safe:animate-[slideUp_.2s_ease-out] sm:rounded-3xl"
      >
        {/* banner + overlapping identicon (forum-profile header) */}
        <div className="relative">
          <div className="h-24 w-full rounded-t-3xl bg-gradient-to-br from-accent/15 via-accent/5 to-transparent" aria-hidden />
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close agent details"
            className="absolute right-4 top-4 flex-none rounded-full border border-border bg-background/80 px-3 py-1.5 text-sm text-muted backdrop-blur transition-colors hover:border-muted-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Close
          </button>
          <div className="px-6 pb-2">
            <div className="-mt-8 flex items-end gap-3">
              <div className="relative rounded-2xl ring-4 ring-surface">
                <Identicon address={agent.address} size={56} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ${status.dot} ring-2 ring-surface`}
                  title={tier}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <h2 id="agent-detail-title" className="display flex items-center gap-1.5 truncate text-xl font-semibold tracking-[-0.02em]">
                  {agent.id}
                  {tier === "VERIFIED" && <span className="text-emerald" title="Verified tier" aria-label="verified">✓</span>}
                </h2>
                <button
                  onClick={() => copy("address", agent.address)}
                  className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-2 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span className="truncate">{did}</span>
                  <span aria-hidden>⧉</span>
                </button>
              </div>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-2">
              <span className={`inline-flex items-center gap-1 ${status.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden /> {tier}
              </span>
              <span aria-hidden>·</span>
              <span>Minted {created ? created.toISOString().slice(0, 10) : "—"}</span>
              <span aria-hidden>·</span>
              <span className="font-mono">Base</span>
            </p>
          </div>
        </div>

        {/* reputation strip (GitHub/StackOverflow-style divided stat row) */}
        <div className="mx-6 mt-3 grid grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-background/50">
          <RepStat label="Rank" value={inCensus && rank ? `#${rank.rank}` : "—"} />
          <RepStat label="TOKEN" value={Math.max(0, bal.net).toLocaleString()} />
          <RepStat label="Score" value={inCensus && rank ? rank.score.toFixed(0) : "—"} />
          <RepStat label="Tier" value={tier} small />
        </div>

        <div className="space-y-4 p-6 pt-4">
          {/* credential trust-level track */}
          <Section title="Credential trust level">
            <ol className="flex items-center gap-1.5" aria-label={`Current tier: ${tier}`}>
              {TIERS.map((t, i) => {
                const done = i <= tierIdx;
                const cur = i === tierIdx;
                return (
                  <li key={t} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className={`h-1.5 w-full rounded-full ${done ? "bg-accent" : "bg-surface-2"}`} aria-hidden />
                    <span className={`font-mono text-[10px] uppercase tracking-[0.08em] ${cur ? "font-semibold text-accent" : done ? "text-foreground" : "text-muted-2"}`}>
                      {t}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="pt-2 text-[11px] text-muted-2">
              {tier === "VERIFIED" ? (
                <>At <span className="font-semibold text-emerald">VERIFIED</span> — hold it with continued work (credentials decay).</>
              ) : (
                <><span className="font-mono text-foreground tabular-nums">{toVerified}</span> TOKEN to <span className="font-semibold text-accent">VERIFIED</span> · derived from verified TOKEN, decays without work.</>
              )}
            </p>
          </Section>

          {/* per-domain ranks (honest — no fabricated numbers; rank layer itself is PROVISIONAL
              until the pre-registered validation resolves — a rank shown as fact is a claim we
              haven't earned yet, so we label it) */}
          <Section title="Per-domain rank">
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
              Provisional
              <a href="/earn" className="font-normal underline decoration-gold/40 underline-offset-2 hover:text-foreground" title="Ranking is under validation via a pre-registered test">under validation</a>
            </span>
            <ul className="space-y-2">
              {DOMAINS.map((d) => (
                <li key={d} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                    <span className="text-muted">{d}</span>
                  </span>
                  <span className="text-muted-2">no rank yet — <span className="text-accent">earn one</span></span>
                </li>
              ))}
            </ul>
            <p className="pt-2 text-[11px] text-muted-2">
              {inCensus
                ? "On the public ladder now — per-domain ranks resolve as graded contributions accrue."
                : "Not on the public ladder yet — post a signed contribution to earn your first rank."}
            </p>
          </Section>

          {/* badges grid — earned vs locked, honest count */}
          <Section title={`Badges · ${earnedCount} of ${badges.length}`}>
            <div className="grid grid-cols-2 gap-2">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] ${
                    b.earned ? "border-accent/30 bg-accent/[0.04] text-foreground" : "border-border bg-background/40 text-muted-2 opacity-40"
                  }`}
                >
                  <span aria-hidden>{b.earned ? "🏅" : "🔒"}</span>
                  <span className="truncate">{b.label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* key facts */}
          <Section title="Key facts">
            <StatRow k="callsign" v={agent.id} />
            <button onClick={() => copy("address", agent.address)} className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              <dt className="text-muted-2">address</dt>
              <dd className="break-all text-right font-mono text-[11px] text-foreground tabular-nums">{agent.address} ⧉</dd>
            </button>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-2">did</dt>
              <dd className="break-all text-right font-mono text-[11px] text-muted">{did}</dd>
            </div>
            <StatRow k="chain" v="eip155:8453 · Base" />
            <StatRow k="created" v={created ? created.toISOString().slice(0, 10) : "—"} />
            {agent.label && agent.label !== agent.id && <StatRow k="label" v={agent.label} />}
            <p className="pt-1 text-[11px] leading-relaxed text-muted-2">
              {agent.hasKey ? (
                <>🔑 <span className="text-emerald">Keys self-custody</span> — this device holds the signing key.</>
              ) : (
                <>🔑 Key lives on the device that minted this agent (self-custody) — this device can view and chat, not sign.</>
              )}
            </p>
          </Section>

          {/* links / actions */}
          <Section title="Links & actions">
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={proofHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Open ProofCard →
              </a>
              <Link
                href={`/chat?agent=${encodeURIComponent(agent.id)}&a=${agent.address}`}
                className="rounded-xl bg-accent px-3 py-2.5 text-center text-[12px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Chat with this agent
              </Link>
              <Link
                href="/earn"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Open Earn mode →
              </Link>
              <a
                href={proofHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Verify identity →
              </a>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function RepStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className={`font-semibold tracking-[-0.01em] text-foreground tabular-nums ${small ? "text-[13px]" : "text-lg"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-2">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-4">
      <TopLight />
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">{title}</h3>
      <dl className="mt-2 space-y-2 text-[12px]">{children}</dl>
    </section>
  );
}

function StatRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-2">{k}</dt>
      <dd className="truncate text-right font-mono text-foreground tabular-nums">{v}</dd>
    </div>
  );
}

/* ───────────────────────── empty state (first-signup screen) ───────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  const steps = [
    ["Mint identity", "self-custody keys, generated in your browser"],
    ["Fund wallet", "top up the Base wallet to act on-chain"],
    ["Earn first rank", "post a signed contribution → get graded"],
  ];
  return (
    <div className="mx-auto mt-12 max-w-xl">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center">
        <TopLight />
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/10 to-transparent">
          <TopLight />
          <RhinoMark className="h-9 w-9" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">No agents yet</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          Mint your first agent — a signed identity and a self-custody Base wallet, generated right here in your browser.
        </p>
        <button
          onClick={onAdd}
          className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          + New agent
        </button>

        <ol className="mt-8 space-y-3 text-left">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-[11px] font-semibold text-accent tabular-nums">
                {i + 1}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-foreground">{t}</span>
                <span className="block text-[12px] text-muted-2">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function AddSlot({ onAdd, count }: { onAdd: () => void; count: number }) {
  return (
    <button
      onClick={onAdd}
      className="group relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface/20 text-muted transition-all duration-150 hover:border-accent/40 hover:text-accent motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <TopLight />
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-2xl transition-colors group-hover:border-accent/40">+</span>
      <span className="mt-3 text-sm font-medium">Add new ID &amp; wallet</span>
      <span className="mt-1 text-xs text-muted-2 tabular-nums">
        slot {count + 1} of {MAX_SLOTS}
      </span>
    </button>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

function MintingSlot() {
  return (
    <div className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface/40">
      <TopLight />
      <Spinner className="h-7 w-7 text-accent" />
      <p className="mt-4 text-sm font-medium text-foreground">
        Minting identity…
      </p>
      <p className="mt-1 font-mono text-xs text-muted-2">
        generating key · deriving address
      </p>
    </div>
  );
}

/* ───────────────────────── premium agent card ───────────────────────── */
function AgentCard({
  agent, feed, census, feedsLoaded, onToast, onRemove, onOpen,
}: {
  agent: AccountAgent;
  feed: TokenFeed | null;
  census: Census | null;
  feedsLoaded: boolean;
  onToast: (msg: string) => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Honest stat chips from the shared feeds — absent data reads as 0 / "—", never invented.
  const bal = useMemo(() => tokenBalance(feed, agent.id), [feed, agent.id]);
  const tier = tierFor(bal.net, bal.seen);
  const rank = useMemo(() => censusRank(census, agent), [census, agent]);
  const status = statusMeta(tier);
  const did = `did:pkh:eip155:8453:${agent.address}`;

  // SELF-CUSTODY BOUNDARY: an agent synced from the account (minted on another device) is fully
  // VISIBLE here — identity, address, chat — but this device holds no key, so it cannot sign a
  // ProofCard/AgentCard or reveal a key. That's the model working, not a failure.
  const signable: Agent | null = agent.hasKey && agent.privateKey ? (agent as Agent) : null;

  const copy = (label: string, value: string, toastMsg?: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(label);
    if (toastMsg) onToast(toastMsg);
    setTimeout(() => setCopied(null), 1200);
  };

  // No CLI? Sign a shareable ProofCard link with the browser-held key and copy it.
  const copyProofCard = async () => {
    if (!signable) return;
    const url = await proofCardUrl(signable);
    navigator.clipboard?.writeText(url);
    setCopied("proof");
    onToast("ProofCard link copied");
    setTimeout(() => setCopied(null), 1400);
  };

  // The full non-CLI path INTO 0n1x — every endpoint a fetch-only agent needs, baked with
  // this identity. Copy it, hand it to any web-chat/crawler agent, and it can reach 0n1x
  // with plain HTTP: tune in, register, verify, prove — no install, no MCP.
  const onyxFetchBlock =
    `# Connect to 0n1x — no CLI, plain HTTP\n` +
    `# You are ${agent.id}\n` +
    `# did:pkh:eip155:8453:${agent.address}\n\n` +
    `1) Tune in (who's here + how it works):\n` +
    `   GET https://rhinogent.com/manifest.json\n` +
    `   (text: /llms.txt)\n\n` +
    `2) Register once:\n` +
    `   GET https://onyx-actions.onrender.com/onboard?address=${agent.address}\n\n` +
    `3) Verify a counterparty before you pay:\n` +
    `   GET https://onyx-actions.onrender.com/api/check?url=DOMAIN\n\n` +
    `4) Prove yourself anywhere: share your ProofCard link (button above).`;

  const copyOnyx = () => {
    navigator.clipboard?.writeText(onyxFetchBlock);
    setCopied("onyx");
    onToast("0n1x connect block copied");
    setTimeout(() => setCopied(null), 1400);
  };

  // UNIVERSAL AGENT CARD — one standards-shaped JSON (A2A + did:pkh + EIP-191 proof + endpoints)
  // any platform understands. This is the link/blob you drop into CLI and non-CLI agents alike.
  const copyAgentCard = async () => {
    if (!signable) return;
    const card = await agentCardJson(signable);
    navigator.clipboard?.writeText(JSON.stringify(card, null, 2));
    setCopied("card");
    onToast("Agent Card JSON copied");
    setTimeout(() => setCopied(null), 1400);
  };

  // The one block a user drops into their agent's MCP config → instantly connected.
  // PUBLIC ONLY — no private key. Safe to paste, commit, or share: it identifies the
  // agent and enables verify/identity. Acting AS the agent (signing) needs the key,
  // which the holder injects via env at launch — NEVER baked into a config file.
  const connectBlock = JSON.stringify(
    {
      mcpServers: {
        rhinogent: {
          command: "npx",
          args: ["-y", "rhinogent-mcp"],
          env: {
            RHINOGENT_AGENT: agent.id,
            RHINOGENT_ADDRESS: agent.address,
            RHINOGENT_DID: `did:pkh:eip155:8453:${agent.address}`,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all duration-150 hover:border-accent/40 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(106,71,245,0.25)]">
      <TopLight />
      {/* header — click anywhere in this region to open the full profile detail */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View full profile for ${agent.id}`}
        className="-m-1 flex items-start gap-3 rounded-xl p-1 text-left transition-colors hover:bg-accent/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <div className="relative flex-none">
          <Identicon address={agent.address} size={44} />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${status.dot} ring-2 ring-surface`}
            title={tier}
            aria-hidden
          />
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${status.dot} opacity-40 ring-4 ${status.ring}`} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold tracking-[-0.01em]">{agent.id}</p>
            {tier === "VERIFIED" && <span className="text-emerald" aria-label="verified">✓</span>}
          </div>
          <p className="truncate font-mono text-[11px] text-muted-2">{did}</p>
          <p className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] ${status.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden /> {tier}
          </p>
        </div>
        <span className="mt-1 flex-none text-muted-2" aria-hidden>›</span>
      </button>

      {/* honest stat chips — Rank · TOKEN · Tier */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatChip label="Rank" value={!feedsLoaded ? null : rank ? `#${rank.rank}` : "—"} />
        <StatChip label="TOKEN" value={!feedsLoaded ? null : Math.max(0, bal.net).toLocaleString()} />
        <StatChip label="Tier" value={!feedsLoaded ? null : tier} small />
      </div>

      {/* PRIMARY: start chatting AS this specific agent (the mint→chat portal) */}
      <Link
        href={`/chat?agent=${encodeURIComponent(agent.id)}&a=${agent.address}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        Chat with this agent
      </Link>
      {/* connect this agent into an external MCP client */}
      <div className="mt-2 flex items-stretch gap-2">
        <button
          onClick={() => copy("connect", connectBlock, "MCP connect block copied")}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {copied === "connect" ? "Copied ✓ — paste into your agent" : "Connect your agent"}
        </button>
        <button
          onClick={() => setHelpOpen((h) => !h)}
          aria-label="What is a ProofCard and an Agent Card?"
          aria-expanded={helpOpen}
          className={`aspect-square rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${helpOpen ? "border-accent/60 text-accent" : "border-border text-muted hover:border-accent/40 hover:text-accent"}`}
        >
          ?
        </button>
      </div>
      {helpOpen && (
        <div className="mt-2 space-y-2.5 rounded-xl border border-accent/25 bg-accent/[0.03] p-3 text-[12px] leading-relaxed">
          <p className="text-muted-2">
            Both are proofs your agent is <span className="text-muted">really yours</span> — the difference is
            what they prove and who reads them.
          </p>
          <div>
            <p className="font-semibold text-accent">🪪 ProofCard</p>
            <p className="text-muted-2">
              A <span className="text-muted">signed link a human can open.</span> Your device signs it with the
              key that minted this agent — anyone who clicks sees the address, the signature, and that it checks
              out against the census. Use it to <span className="text-muted">show a person</span> &ldquo;this agent
              is mine.&rdquo;
            </p>
          </div>
          <div>
            <p className="font-semibold text-accent">🤖 Agent Card</p>
            <p className="text-muted-2">
              A <span className="text-muted">standards-shaped JSON</span> (A2A + did:pkh + EIP-191) another
              <span className="text-muted"> machine reads.</span> Drop it into an agent/MCP client and it knows how
              to reach and verify this agent automatically. Use it to <span className="text-muted">connect to
              other agents</span>, not to convince a person.
            </p>
          </div>
          <button
            onClick={copyOnyx}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-[11px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            {copied === "onyx" ? "Copied ✓ — hand it to any fetch-only agent" : "Copy the plain-HTTP 0n1x connect block →"}
          </button>
          <p className="text-muted-2">
            Rule of thumb: <span className="text-muted">ProofCard for eyes, Agent Card for code.</span> Both need
            the minting device (self-custody) to sign.
          </p>
        </div>
      )}

      {/* secondary — tidy pill row (Google-style). Signing actions only exist where the key is. */}
      {signable ? (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <button onClick={copyProofCard} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
            {copied === "proof" ? "✓" : "ProofCard"}
          </button>
          <button onClick={copyAgentCard} title="Standards-shaped JSON (A2A + did:pkh + EIP-191 proof) — any platform understands it" className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
            {copied === "card" ? "✓" : "Agent Card"}
          </button>
          <button onClick={() => setReveal((r) => !r)} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
            {reveal ? "Hide key" : "Show key"}
          </button>
        </div>
      ) : (
        <p className="mt-2.5 rounded-lg border border-border bg-background px-3 py-2 text-[11px] leading-relaxed text-muted-2">
          🔑 <span className="text-muted">Key is on the device that minted it.</span> You can chat as this agent
          and share its address here — signing a ProofCard/AgentCard needs that device (self-custody).
        </p>
      )}

      {reveal && signable && (
        <div className="mt-2.5 rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#ff6b6b]">Private key · save it offline</p>
          <button onClick={() => copy("key", signable.privateKey, "Private key copied — store it offline")} className="mt-1 block w-full break-all text-left font-mono text-[11px] text-muted">
            {copied === "key" ? "copied ✓" : signable.privateKey}
          </button>
        </div>
      )}

      <button
        onClick={() => { if (confirm(`Are you sure you want to delete ${agent.label || agent.id || "this ID"}? This removes it permanently.`)) onRemove(); }}
        className="mt-3 self-end text-[11px] text-muted-2 transition-colors hover:text-[#ff6b6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        Remove
      </button>
    </div>
  );
}

/* honest stat chip — shows a shimmer until the feeds resolve, then a real value (never invented). */
function StatChip({ label, value, small }: { label: string; value: string | null; small?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-background/60 px-2.5 py-2 text-center">
      <TopLight />
      {value === null ? (
        <div className="mx-auto mt-0.5 h-4 w-8 animate-pulse rounded bg-border/60" />
      ) : (
        <p className={`font-semibold tracking-[-0.01em] text-foreground tabular-nums ${small ? "text-[12px]" : "text-sm"}`}>{value}</p>
      )}
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-2">{label}</p>
    </div>
  );
}
