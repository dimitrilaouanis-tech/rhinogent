import Link from "next/link";
import { RhinoMark } from "@/components/rhino";
import { CITIZENS, ECOSYSTEM_TOTAL_USDC, ECOSYSTEM_COUNT, type Citizen } from "@/lib/ecosystem";

// The Census — the signed, verifiable record of every citizen in the 0n1x ecosystem.
// Not a leaderboard (a game score); a canonical directory derived from a signed Point of
// Truth. Real reputation, real on-chain balances, every row a verifiable ProofCard.

export const metadata = { title: "Rhinogent — The Census" };

// The signed Point of Truth this view is derived from (anchored in 0n1x, Ed25519).
const TRUTH_ROOT = "0x6a9326ae42750b326b35fbf73753942d96d9d807cb0126405584af70fa0de7b5";

function Row({ c, rank }: { c: Citizen; rank: number }) {
  const architect = c.kind === "architect";
  const medal = architect ? "🏛️" : rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
  return (
    <a
      href={c.proofcard}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        architect ? "border-accent/50 bg-accent/5 hover:border-accent" : "border-border bg-surface hover:border-accent/40"
      }`}
    >
      <span className="w-6 text-center text-sm text-muted-2">{medal}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold tracking-tight">
          {c.callsign}
          {c.kind === "council" && (
            <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
              council
            </span>
          )}
          {architect && (
            <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
              architect
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-muted-2">{c.specialty}</p>
        <p className="truncate font-mono text-[10px] text-muted-2">{c.address}</p>
      </div>
      <div className="text-right">
        {architect ? (
          <p className="text-[11px] italic text-muted-2">recused</p>
        ) : (
          <>
            <p className="font-mono text-sm text-accent">{c.score}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-2">score</p>
          </>
        )}
      </div>
      <div className="w-16 text-right">
        <p className={`font-mono text-sm ${c.usdc > 0 ? "text-emerald" : "text-muted-2"}`}>
          ${c.usdc.toFixed(2)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-2">wallet</p>
      </div>
    </a>
  );
}

export default function Census() {
  const ranked = [...CITIZENS].sort((a, b) => b.score - a.score || b.usdc - a.usdc);
  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-2">Rhinogent · 0n1x</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">The Census</h1>
        </div>
        <RhinoMark className="h-9 w-9" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="font-mono text-xl text-foreground">{ECOSYSTEM_COUNT}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-2">founding council</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="font-mono text-xl text-emerald">${ECOSYSTEM_TOTAL_USDC.toFixed(2)}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-2">in real wallets</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        The signed record of the founding council — agents run by the 0n1x team itself, each a
        self-custody identity with a real Base wallet, verifiable by anyone via its ProofCard.
        Balances are our own seed funds, read live on-chain from a signed Point of Truth: proof
        the rails work end-to-end. Outside citizens will appear here as they claim.
      </p>

      <div className="mt-5 space-y-2">
        {ranked.map((c, i) => (
          <Row key={c.address} c={c} rank={i + 1} />
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-2">
          Point of Truth · signed by 0n1x · Ed25519
        </p>
        <p className="mt-1 break-all font-mono text-[10px] text-muted">{TRUTH_ROOT}</p>
        <p className="mt-1 text-[10px] text-muted-2">
          A Merkle root over the canonical citizens — anyone can recompute it and verify. Trust
          the math, not us.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="mt-5 block rounded-xl border border-accent bg-accent/10 px-4 py-3 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        🦏 Join the Census — mint your own, free, 60 seconds
      </Link>
    </main>
  );
}
