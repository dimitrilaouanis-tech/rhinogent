import Link from "next/link";
import { MiniNav } from "@/components/mini-nav";

export const metadata = {
  title: "0n1x — The Verifiable Trust Layer for the Agentic Web",
  description: "Neutral cryptographic trust infrastructure: signed answers, a Merkle-verifiable 340k-agent census, a reality oracle, and an on-chain trust-score oracle any protocol can read.",
};

const PRIMITIVES = [
  ["trust_score", "A signed 0–100 trust score for any agent that DeFi protocols, DAOs, and contracts read to price counterparty risk. The Web3 wedge."],
  ["attest_agent", "Verify-before-you-transact: a signed dossier on any counterparty — census membership, earned standing, honest verdict."],
  ["verify_query", "Ask a reality-resolvable question, get a signed answer settled against external sources. Refuses to sign opinion."],
  ["census_proof", "The 1,700,000+-agent census + Merkle root — recompute it yourself from public shards."],
];

export default function Onyx() {
  return (
    <>
      <MiniNav current="/0n1x" />
      <main>
        {/* hero */}
        <section className="relative overflow-hidden bg-mesh">
          <div className="absolute inset-0 grid-fade" aria-hidden />
          <div className="relative mx-auto max-w-4xl px-5 py-24 text-center">
            <p className="eyebrow">0n1x · trust infrastructure</p>
            <h1 className="display mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
              The trust layer agents can <span className="accent-gradient">verify, not trust.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              Everyone else signs identity and scores reputation you must take on faith. 0n1x signs
              the <strong>answer</strong> — reality-settled, Merkle-provable, checkable in one command.
              The neutral cryptographic layer the agentic web plugs into.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/mcp" className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white">Connect via MCP →</Link>
              <Link href="/census" className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium">See the live network</Link>
            </div>
            <p className="mt-6 font-mono text-[12px] text-muted-2">
              1,700,000+ signed identities · signed ledger · reality oracle · $0 to verify
            </p>
          </div>
        </section>

        {/* the primitives */}
        <section className="mx-auto max-w-4xl px-5 py-20">
          <h2 className="display text-3xl font-semibold">Four primitives reality can settle</h2>
          <p className="mt-3 max-w-xl text-muted">Every one returns a cryptographically signed payload. You verify it yourself — no account, no trust, no cost.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PRIMITIVES.map(([name, desc]) => (
              <div key={name} className="rounded-2xl border border-border bg-surface p-5">
                <p className="font-mono text-[14px] font-semibold text-accent">{name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* the web3 wedge */}
        <section className="border-y border-border/60 bg-surface/20">
          <div className="mx-auto max-w-4xl px-5 py-20">
            <p className="eyebrow">The Web3 wedge</p>
            <h2 className="display mt-3 text-3xl font-semibold">A trust-score oracle for on-chain agents</h2>
            <p className="mt-4 max-w-2xl text-muted">
              DeFi lending gated on a counterparty&apos;s verified standing. DAO votes weighted by
              earned reputation. Escrow that releases only on a fresh 0n1x attestation. One signed
              0–100 score any contract on Base can read — the primitive protocols can&apos;t self-produce.
            </p>
            <div className="mt-6 flex flex-wrap gap-6 font-mono text-[13px] text-muted-2">
              <span>· EAS schema on Base</span><span>· ERC-8126 verification provider</span>
              <span>· Merkle root anchored on-chain</span><span>· off-chain signed, $0</span>
            </div>
            <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-muted-2">
              Honest by construction: a trust score is standing in a verifiable population — a signal
              to price risk, never a guarantee of solvency or a promise of value.
            </p>
          </div>
        </section>

        {/* verify it yourself */}
        <section className="mx-auto max-w-4xl px-5 py-20">
          <h2 className="display text-3xl font-semibold">Don&apos;t trust it. Run it.</h2>
          <p className="mt-3 max-w-xl text-muted">One command discovers the signed card, queries the live network, verifies the signature, and recomputes a census shard against the Merkle root.</p>
          <pre className="mt-6 overflow-x-auto rounded-xl bg-[#0d1118] p-5 font-mono text-[13px] text-[#e8ecf4]">
{`$ python verify_0n1x.py

  ✓ DISCOVER — 0n1x v1.0 signed agent card (EIP-191)
  ✓ QUERY+VERIFY — live /a2a reply · Ed25519 attestation checks
  ✓ CENSUS — 1,700,000+ signed identities · Merkle root recomputed from public shards

  trust zero, verify everything.`}
          </pre>
        </section>

        {/* standards */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-4xl px-5 py-14 text-center">
            <p className="text-[12px] uppercase tracking-widest text-muted-2">Standards-native</p>
            <p className="mt-3 font-mono text-sm text-muted">
              A2A v1.0 · MCP 2025-11-25 · ARD v0.9 · x402 · EAS · ERC-8126 · did:pkh · EIP-191 · Ed25519
            </p>
            <p className="mx-auto mt-6 max-w-lg text-[13px] leading-relaxed text-muted-2">
              The protocol at full scale — live, signed, self-governing. TOKEN is the network&apos;s native unit,
              earned by verified work. The cryptography is real, and you can check every bit of it.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
