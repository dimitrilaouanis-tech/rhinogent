"use client";

// Shared dashboard pieces, extracted from the former /dashboard/classic so the single
// canonical /dashboard (my-agents) can reuse them: the forum-style AgentDetail modal (now
// with the self-custody connect/prove actions folded in), the standing helpers, the
// identicon, and the toast host. Honest convention: absent data reads as "—"/"none yet",
// never an invented number.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Agent, proofCardUrl, agentCardJson } from "@/lib/identity";
import { type AccountAgent } from "@/lib/agent-sync";

/* ───────────────────────── standing helpers (read-only feeds) ───────────────────────── */
export type Tx = { from: string; to: string; amount: number };
export type TokenFeed = { txs?: Tx[]; total_verified?: number };
export type CensusAgent = { callsign: string; address: string; score: number; kind?: string; specialty?: string };
export type Census = { top?: CensusAgent[]; count?: number };

/** Net TOKEN for a callsign from the signed transfer feed: received − sent. Absent ⇒ 0 / unseen. */
export function tokenBalance(feed: TokenFeed | null, id: string): { net: number; seen: boolean } {
  const txs = feed?.txs ?? [];
  let net = 0;
  let seen = false;
  for (const t of txs) {
    if (t.to === id) { net += Number(t.amount) || 0; seen = true; }
    if (t.from === id) { net -= Number(t.amount) || 0; seen = true; }
  }
  return { net, seen };
}

export const TIERS = ["NEW", "EMERGING", "ACTIVE", "VERIFIED"] as const;
export type Tier = (typeof TIERS)[number];
/** Credential tier derived from verified TOKEN — provisional mapping, decays without work. */
export function tierFor(net: number, seen: boolean): Tier {
  if (!seen || net <= 0) return "NEW";
  if (net < 25) return "EMERGING";
  if (net < 100) return "ACTIVE";
  return "VERIFIED";
}

/** Status-dot styling per tier. */
export function statusMeta(tier: Tier): { dot: string; ring: string; text: string } {
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
export function censusRank(census: Census | null, agent: AccountAgent): { rank: number; total: number; score: number } | null {
  const top = census?.top ?? [];
  if (!top.length) return null;
  const i = top.findIndex(
    (c) => c.callsign === agent.id || c.address?.toLowerCase() === agent.address.toLowerCase(),
  );
  if (i < 0) return null;
  return { rank: i + 1, total: census?.count ?? top.length, score: Number(top[i].score) || 0 };
}

/* 1px top-light hairline. Parent must be `relative` (usually `overflow-hidden`). */
export function TopLight() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
    />
  );
}

/* address-derived identicon (decorative) */
export function Identicon({ address, size = 40 }: { address: string; size?: number }) {
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

/* ───────────────────────── toast host (CSS/React only) ───────────────────────── */
export type ToastItem = { id: number; msg: string };
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = (msg: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1900);
  };
  return { toasts, push };
}
export function ToastHost({ toasts }: { toasts: ToastItem[] }) {
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

/* ───────────────────────── agent detail modal (forum-profile template) ─────────────────────────
   Opens from a dashboard card. Reads like a Discourse/GitHub profile and now also carries the
   self-custody connect/prove actions (ProofCard · Agent Card JSON · MCP connect · reveal key) that
   used to live on the classic card — gated on this device holding the key. Never fabricates a
   rank/TOKEN/tier/badge: absent reads "none yet — earn it". Esc closes; focus trapped + returned. */
const DOMAINS = ["coding / agent-building", "models", "payments", "protocols", "proofs", "markets", "philosophy"];

export function AgentDetail({
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
  const [copied, setCopied] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

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

  // SELF-CUSTODY: signing actions only exist where the browser holds the key.
  const signable: Agent | null = agent.hasKey && agent.privateKey ? (agent as Agent) : null;

  const copy = (label: string, value: string, toastMsg?: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(label);
    if (toastMsg) onToast(toastMsg);
    setTimeout(() => setCopied(null), 1400);
  };

  const copyProofCard = async () => {
    if (!signable) return;
    const url = await proofCardUrl(signable);
    copy("proof", url, "ProofCard link copied");
  };
  const copyAgentCard = async () => {
    if (!signable) return;
    const card = await agentCardJson(signable);
    copy("card", JSON.stringify(card, null, 2), "Agent Card JSON copied");
  };
  const connectBlock = JSON.stringify(
    {
      mcpServers: {
        rhinogent: {
          command: "npx",
          args: ["-y", "rhinogent-mcp"],
          env: {
            RHINOGENT_AGENT: agent.id,
            RHINOGENT_ADDRESS: agent.address,
            RHINOGENT_DID: did,
          },
        },
      },
    },
    null,
    2,
  );

  const badges = [
    { label: "Self-custody", earned: agent.hasKey },
    { label: "First TOKEN", earned: bal.seen && bal.net > 0 },
    { label: "On the ladder", earned: inCensus },
    { label: "Verified tier", earned: tier === "VERIFIED" },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  // Focus the close button on open; restore focus + lock scroll on unmount; Esc + focus trap.
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
        {/* banner + overlapping identicon */}
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
                  onClick={() => copy("address", agent.address, "address copied")}
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

        {/* reputation strip (census ladder — distinct from the card's signed-reputation R-score) */}
        <div className="mx-6 mt-3 grid grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-background/50">
          <RepStat label="Ladder" value={inCensus && rank ? `#${rank.rank}` : "—"} />
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

          {/* connect & prove — self-custody signing actions (folded in from the classic card) */}
          <Section title="Connect & prove">
            {signable ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={copyProofCard} className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                    {copied === "proof" ? "Copied ✓" : "Copy ProofCard link"}
                  </button>
                  <button onClick={copyAgentCard} title="Standards-shaped JSON (A2A + did:pkh + EIP-191)" className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                    {copied === "card" ? "Copied ✓" : "Copy Agent Card JSON"}
                  </button>
                  <button onClick={() => copy("connect", connectBlock, "MCP connect block copied")} className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                    {copied === "connect" ? "Copied ✓" : "Copy MCP connect"}
                  </button>
                  <button onClick={() => setReveal((r) => !r)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                    {reveal ? "Hide key" : "Show key"}
                  </button>
                </div>
                {reveal && signable && (
                  <div className="rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#ff6b6b]">Private key · save it offline</p>
                    <button onClick={() => copy("key", signable.privateKey, "Private key copied — store it offline")} className="mt-1 block w-full break-all text-left font-mono text-[11px] text-muted">
                      {copied === "key" ? "copied ✓" : signable.privateKey}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="pt-1 text-[11px] leading-relaxed text-muted-2">
                🔑 <span className="text-muted">Key is on the device that minted this agent.</span> You can chat as it and
                share its address here — signing a ProofCard/Agent Card needs that device (self-custody).
              </p>
            )}
          </Section>

          {/* per-domain ranks (provisional, honest) */}
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

          {/* badges */}
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
            <button onClick={() => copy("address", agent.address, "address copied")} className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
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

/* Minting slot — the key-ceremony placeholder shown while a new agent is generated. */
export function MintingSlot() {
  return (
    <div className="relative flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface/40">
      <TopLight />
      <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
      <p className="mt-4 text-sm font-medium text-foreground">Minting identity…</p>
      <p className="mt-1 font-mono text-xs text-muted-2">generating key · deriving address</p>
    </div>
  );
}
