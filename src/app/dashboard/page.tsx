"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RhinoMark, RhinoMascot } from "@/components/rhino";
type Session = { email: string };
import { AuthGate } from "@/components/auth-gate";
import { supabase } from "@/lib/supabase";
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
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    setAgents(loadAgents());
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


  const session = authed ? ({ email } as Session) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        session={session}
        onSignOut={async () => { await supabase.auth.signOut(); setAuthed(false); }}
      />
      {authed ? (
        <Profile
          agents={agents}
          onAdd={() => setAgents((a) => addAgent(a))}
          onRemove={(id) => setAgents((a) => removeAgent(a, id))}
          onReset={() => setAgents(clearAgents())}
        />
      ) : (
        <AuthGate />
      )}
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
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/15">
          <RhinoMark className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">{agent.id}</p>
          <p className="font-mono text-[11px] text-muted-2">{shortAddr(agent.address)} · Base</p>
        </div>
        <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">new</span>
      </div>

      {/* detail rows — clean, uniform */}
      <dl className="mt-4 space-y-2 border-y border-border/60 py-3 font-mono text-[12px]">
        <button onClick={() => copy("address", agent.address)} className="flex w-full items-center justify-between text-left">
          <dt className="text-muted-2">wallet</dt>
          <dd>{copied === "address" ? <span className="text-emerald">copied ✓</span> : <span className="text-foreground">{shortAddr(agent.address)}</span>}</dd>
        </button>
        <div className="flex items-center justify-between"><dt className="text-muted-2">balance</dt><dd className="text-muted">0.00 USDC</dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted-2">did</dt><dd className="text-muted">…{agent.address.slice(-6)}</dd></div>
      </dl>

      {/* ONE primary action */}
      <button
        onClick={() => copy("connect", connectBlock)}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {copied === "connect" ? "Copied ✓ — paste into your agent" : "Connect your agent"}
      </button>

      {/* secondary — tidy pill row (Google-style) */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <button onClick={copyProofCard} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent">
          {copied === "proof" ? "✓" : "ProofCard"}
        </button>
        <button onClick={copyOnyx} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent">
          {copied === "onyx" ? "✓" : "Fetch path"}
        </button>
        <button onClick={() => setReveal((r) => !r)} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent">
          {reveal ? "Hide key" : "Show key"}
        </button>
      </div>

      {reveal && (
        <div className="mt-2.5 rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#ff6b6b]">Private key · save it offline</p>
          <button onClick={() => copy("key", agent.privateKey)} className="mt-1 block w-full break-all text-left font-mono text-[11px] text-muted">
            {copied === "key" ? "copied ✓" : agent.privateKey}
          </button>
        </div>
      )}

      <button onClick={onRemove} className="mt-3 self-end text-[11px] text-muted-2 transition-colors hover:text-[#ff6b6b]">
        Remove
      </button>
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
