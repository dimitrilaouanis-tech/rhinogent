"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RhinoMark, RhinoMascot } from "@/components/rhino";
import {
  GoogleSignIn,
  type Session,
  loadSession,
  clearSession,
} from "@/components/google-signin";
import { type Agent, shortAddr, proofCardUrl } from "@/lib/identity";
import {
  MAX_SLOTS,
  addAgent,
  clearAgents,
  loadAgents,
  removeAgent,
} from "@/lib/agents";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    setSession(loadSession());
    setAgents(loadAgents());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        session={session}
        onSignOut={() => {
          clearSession();
          setSession(null);
        }}
      />
      {/* No login gate — identity IS the account (self-custody). Anyone mints instantly.
          "Owned by no one but your agent." Ready for external users, no sign-up friction. */}
      <Profile
        agents={agents}
        onAdd={() => setAgents((a) => addAgent(a))}
        onRemove={(id) => setAgents((a) => removeAgent(a, id))}
        onReset={() => setAgents(clearAgents())}
      />
    </div>
  );
}

/* ───────────────────────── top bar ───────────────────────── */
function TopBar({
  session,
  onSignOut,
}: {
  session: Session | null;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <RhinoMark className="h-8 w-8" />
          <span className="text-[15px] font-semibold tracking-tight">
            Rhinogent
          </span>
        </Link>
        {session && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              {session.email}
            </span>
            <button
              onClick={onSignOut}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-muted-2"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ───────────────────────── sign-in gate ───────────────────────── */
function SignInGate({ onSignIn }: { onSignIn: (s: Session) => void }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-mesh px-5">
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-surface/60 p-8 text-center backdrop-blur-xl">
        <RhinoMascot className="mx-auto h-20 w-auto" />
        <h1 className="display mt-5 text-2xl font-semibold">
          Your agents&apos; home.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to mint identities and manage your agents&apos; self-custody
          wallets.
        </p>
        <div className="mt-7 flex justify-center">
          <GoogleSignIn onSignIn={onSignIn} />
        </div>
        <p className="mt-6 text-[11px] leading-relaxed text-muted-2">
          Keys are generated in your browser and never leave it. Sign-in only
          identifies you as the owner.
        </p>
      </div>
    </main>
  );
}

/* ───────────────────────── profile panel ───────────────────────── */
function Profile({
  agents,
  onAdd,
  onRemove,
  onReset,
}: {
  agents: Agent[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}) {
  const full = agents.length >= MAX_SLOTS;
  const [minting, setMinting] = useState(false);
  const handleAdd = () => {
    if (full || minting) return;
    // Keygen is instant and local — show it as it is. No fake latency.
    onAdd();
  };
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-3xl font-semibold sm:text-4xl">
            Your agents
          </h1>
          <p className="mt-2 text-sm text-muted">
            {agents.length} of {MAX_SLOTS} slots used · each is a self-custody
            identity + Base wallet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {agents.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Reset all slots back to 0? This deletes every agent in this browser."))
                  onReset();
              }}
              className="rounded-full border border-border px-4 py-3 text-sm font-medium text-muted-2 transition-colors hover:text-[#ff6b6b]"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleAdd}
            disabled={full || minting}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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

      {agents.length === 0 && !minting ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} onRemove={() => onRemove(a.id)} />
          ))}
          {minting && <MintingSlot />}
          {!full && !minting && <AddSlot onAdd={handleAdd} count={agents.length} />}
        </div>
      )}
    </main>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-12 rounded-3xl border border-dashed border-border bg-surface/30 p-12 text-center">
      <RhinoMark className="mx-auto h-12 w-12" />
      <p className="mt-4 text-lg font-semibold">No agents yet.</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Mint your first agent — it gets a signed identity and a self-custody
        Base wallet, generated right here in your browser.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        + Mint your first agent
      </button>
    </div>
  );
}

function AddSlot({ onAdd, count }: { onAdd: () => void; count: number }) {
  return (
    <button
      onClick={onAdd}
      className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/20 text-muted transition-colors hover:border-muted-2 hover:text-foreground"
    >
      <span className="text-3xl">+</span>
      <span className="mt-2 text-sm font-medium">Add new ID &amp; wallet</span>
      <span className="mt-1 text-xs text-muted-2">
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
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-border bg-surface/40">
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

function AgentCard({ agent, onRemove }: { agent: Agent; onRemove: () => void }) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  };

  // No CLI? Sign a shareable ProofCard link with the browser-held key and copy it.
  const copyProofCard = async () => {
    const url = await proofCardUrl(agent);
    navigator.clipboard?.writeText(url);
    setCopied("proof");
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
          args: ["-y", "github:dimitrilaouanis-tech/rhinogent-mcp"],
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
    <div className="rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-2">
            Rhinogent identity
          </p>
          <p className="mt-1 font-semibold tracking-tight">{agent.id}</p>
        </div>
        <RhinoMark className="h-9 w-9" />
      </div>

      <dl className="mt-5 space-y-2.5 font-mono text-[12px]">
        <Row k="did" v={`did:pkh:…${agent.address.slice(-6)}`} />
        <button
          onClick={() => copy("address", agent.address)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <dt className="text-muted-2">wallet</dt>
          <dd className="text-foreground">
            {copied === "address" ? (
              <span className="text-emerald">copied ✓</span>
            ) : (
              `${shortAddr(agent.address)} · Base`
            )}
          </dd>
        </button>
        <Row k="balance">
          <span className="text-muted">0.00 USDC</span>
        </Row>
        <Row k="credential">
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">NEW</span>
        </Row>
      </dl>

      <div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="text-[11px] uppercase tracking-widest text-accent">
          Connect your agent
        </p>
        <p className="mt-1 text-xs text-muted">
          Copy this, paste it into your AI agent — it&apos;s instantly on the network.
        </p>
        <button
          onClick={() => copy("connect", connectBlock)}
          className="mt-3 w-full rounded-lg border border-accent bg-accent/10 px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          {copied === "connect" ? "copied ✓ — paste into your agent" : "Copy connection block"}
        </button>
        <p className="mt-2 text-[10px] text-muted-2">
          No private key inside — safe to paste anywhere. Your key stays in your wallet;
          you only inject it (via env, never in this file) to sign as your agent.
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-2">
          No CLI? Share your ProofCard
        </p>
        <p className="mt-1 text-xs text-muted">
          A public &ldquo;Verified by 0n1x&rdquo; page. Paste the link in any chat to prove
          you&apos;re a real, self-custody agent — anyone verifies in one click.
        </p>
        <button
          onClick={copyProofCard}
          className="mt-3 w-full rounded-lg border border-accent bg-accent/10 px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          {copied === "proof" ? "copied ✓ — paste it anywhere" : "Copy my ProofCard link"}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-2">
          Connect to 0n1x — no CLI
        </p>
        <p className="mt-1 text-xs text-muted">
          The full fetch-only path into 0n1x — tune in, register, verify — for any web-chat or
          crawler agent that can only make HTTP calls.
        </p>
        <button
          onClick={copyOnyx}
          className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40"
        >
          {copied === "onyx" ? "copied ✓ — hand it to a fetch-only agent" : "Copy 0n1x fetch path"}
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        <button
          onClick={() => setReveal((r) => !r)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          {reveal ? "Hide key" : "Reveal key"}
        </button>
        <button
          onClick={onRemove}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs text-muted-2 transition-colors hover:text-[#ff6b6b]"
        >
          Remove
        </button>
      </div>

      {reveal && (
        <div className="mt-3 rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#ff6b6b]">
            Private key · self-custody · save it offline
          </p>
          <button
            onClick={() => copy("key", agent.privateKey)}
            className="mt-1 block w-full break-all text-left font-mono text-[11px] text-muted"
          >
            {copied === "key" ? "copied ✓" : agent.privateKey}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  k,
  v,
  children,
}: {
  k: string;
  v?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-2">{k}</dt>
      <dd className="truncate text-right text-foreground">{v ?? children}</dd>
    </div>
  );
}
