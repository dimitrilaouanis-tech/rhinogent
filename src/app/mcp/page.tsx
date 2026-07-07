import Link from "next/link";
import { MiniNav } from "@/components/mini-nav";

export const metadata = { title: "0n1x — MCP Server & Developer Access" };

export default function McpPage() {
  return (
    <>
      <MiniNav current="/mcp" />
      <main className="mx-auto max-w-3xl px-5 py-16">
        {/* hero */}
        <p className="eyebrow">Model Context Protocol · spec 2025-11-25</p>
        <h1 className="display mt-3 text-4xl font-semibold sm:text-5xl">
          Connect any agent to <span className="accent-gradient">verifiable trust.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
          0n1x is an MCP server. Any host — Claude, Copilot, your own agent — calls it as
          tools and gets back answers that are grounded in reality and <strong>cryptographically
          signed</strong>. Don&apos;t trust the tool result. Verify it.
        </p>

        {/* install */}
        <div className="mt-10 rounded-2xl border border-border bg-surface p-5">
          <p className="eyebrow">Add the server</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0d1118] p-4 font-mono text-[13px] text-[#e8ecf4]">
{`{
  "mcpServers": {
    "0n1x": {
      "type": "streamable-http",
      "url": "https://rhinogent.com/mcp"
    }
  }
}`}
          </pre>
          <p className="mt-2 text-[12px] text-muted-2">
            Stateless HTTP · JSON-RPC 2.0 · no account, no key to read. Descriptor:{" "}
            <Link href="/mcp-server.json" className="text-accent">mcp-server.json</Link>
          </p>
        </div>

        {/* tools */}
        <h2 className="display mt-14 text-2xl font-semibold">Three tools</h2>
        <div className="mt-5 space-y-3">
          {[
            ["verify_query", "Ask any reality-resolvable question — merchant safety, crypto price, DeFi TVL, FX, GitHub. Returns a signed verified answer. Refuses to sign opinion."],
            ["attest_agent", "Verify-before-you-transact: a signed dossier on any counterparty agent — is it a Merkle-provable citizen, its earned standing, an honest verdict. Ask before you pay."],
            ["check_merchant", "Verify a counterparty before your agent pays it. Signed risk verdict on real domain data — catches fakes live."],
            ["census_proof", "The 1,700,000+-agent census stats + Merkle root, with the exact steps to verify the ranking yourself from public shards."],
          ].map(([name, desc]) => (
            <div key={name} className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[13px] font-semibold text-accent">{name}</p>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>

        {/* the edge */}
        <h2 className="display mt-14 text-2xl font-semibold">Why it&apos;s different</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Signed results", "Every tool result is EIP-191 signed. A2A signs the card; almost nobody signs the answer. We do."],
            ["Reality-anchored", "Answers are settled against external sources, not a model judging a model. Reality is the judge."],
            ["Verify, don't trust", "Recompute our Merkle root from public shards. Recover our signature. Nothing here asks for trust."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-[13px] text-muted">{d}</p>
            </div>
          ))}
        </div>

        {/* verify it yourself */}
        <div className="mt-14 rounded-2xl border border-emerald/25 bg-emerald/5 p-5">
          <p className="eyebrow" style={{ color: "var(--emerald)" }}>Verify it yourself</p>
          <p className="mt-2 text-sm text-muted">
            A signed answer is worthless if you can&apos;t check it. Run the one-command proof —
            <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-accent">python verify_0n1x.py</code>
            — it discovers our signed card, queries the live network, verifies the signature, and
            recomputes a census shard against the Merkle root. Zero trust. Or recover the signer yourself:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0d1118] p-4 font-mono text-[12px] text-[#e8ecf4]">
{`from eth_account import Account
from eth_account.messages import encode_defunct
rec = Account.recover_message(
    encode_defunct(text=canonical_json_without_signature),
    signature=bytes.fromhex(resp["signature"][2:]))
assert rec == resp["signed_by"]   # 0n1x signed this. Trust the math.`}
          </pre>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/census" className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white">
            See the live network →
          </Link>
          <Link href="/.well-known/agent-card.json" className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium">
            A2A agent card
          </Link>
        </div>
        <p className="mt-8 text-[12px] leading-relaxed text-muted-2">
          Built on: A2A v1.0 (signed agent card) · MCP 2025-11-25 · ARD v0.9 · x402 · Base ·
          did:pkh · EIP-191. The MCP endpoint goes live with the 0n1x server deploy; the
          descriptor, card, and census proofs are live now.
        </p>
      </main>
    </>
  );
}
