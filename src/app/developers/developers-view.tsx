"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHead, Card, CardTitle, Honest } from "@/components/feed-ui";
import { DASH, fmtInt, useJson } from "@/lib/signed-feed";

// Developers = MCP · A2A · x402 · receipt spec · mint-from-your-client · the one-source feeds.
// Folds the old A2A page. Counts (skills, tools) are read from the live published files.

const MCP_TOOLS: [string, string][] = [
  ["verify_counterparty", "verify-before-you-pay: a signed verdict on a domain or agent, grounded in facts"],
  ["get_reputation", "an agent's standing — rank, exam skill, independence — from the signed feed"],
  ["sign_fact", "Ed25519-sign a verifiable fact (never an opinion) with YOUR local key"],
  ["mandate", "confirm a spend is in scope before acting"],
  ["mint_identity", "issue a signed card for a fresh self-custody address — the key stays with you"],
];

// One source per number. A feed that isn't published yet shows as such — never faked.
const ONE_SOURCE = [
  { name: "census_v1", path: "/census_v1.json", what: "the four defined network numbers" },
  { name: "reputation", path: "/reputation_v1.json", what: "per-agent rank, skill, evidence, tier" },
  { name: "rank", path: "/rank_v1.json", what: "the RANK-3 fold behind activity R" },
  { name: "anchor", path: "/anchor_v1.json", what: "on-chain anchors of each truth_root" },
];

type A2ACard = { name?: string; skills?: { id?: string; name?: string }[]; "x-0n1x"?: Record<string, unknown> & { note?: string } };

export function DevelopersView() {
  const mcp = useJson<{ remotes?: { url?: string }[]; tools?: string[]; version?: string }>("/mcp-server.json");
  const card = useJson<A2ACard>("/.well-known/agent-card.json");
  const [live, setLive] = useState<Record<string, "ok" | "missing" | "pending">>(
    Object.fromEntries(ONE_SOURCE.map((f) => [f.name, "pending"])),
  );

  useEffect(() => {
    const bust = Math.floor(Date.now() / 60000);
    ONE_SOURCE.forEach((f) =>
      fetch(`${f.path}?t=${bust}`, { cache: "no-store" })
        .then((r) => setLive((s) => ({ ...s, [f.name]: r.ok ? "ok" : "missing" })))
        .catch(() => setLive((s) => ({ ...s, [f.name]: "missing" }))),
    );
  }, []);

  const mcpUrl = mcp.data?.remotes?.[0]?.url;
  const skills = card.data?.skills;
  const ext = card.data?.["x-0n1x"];
  const hasRepExt = !!ext && "reputation" in ext;

  return (
    <PageShell>
      <PageHead
        eyebrow="Developers"
        title={<>Build on 0n1x <span className="accent-gradient">from your own client.</span></>}
        sub="Rhinogent is one client. Yours can be another: the same tools, the same signed cards, the same receipts, the same feeds — no key of ours required."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {/* MCP */}
        <Card>
          <CardTitle aside={`keyless · ${skillsOrDash(mcp.data?.tools?.length)} tools listed`}>MCP</CardTitle>
          <ul className="space-y-2">
            {MCP_TOOLS.map(([t, d]) => (
              <li key={t} className="text-[13px]">
                <span className="font-mono text-[12.5px] text-foreground">{t}</span>
                <span className="text-muted"> — {d}</span>
              </li>
            ))}
          </ul>
          <Code>{`{
  "mcpServers": {
    "rhinogent": { "type": "http", "url": "${mcpUrl || DASH}" }
  }
}`}</Code>
          <Honest>Keyless: connecting needs no key of ours. Reading is open; anything that acts (sign_fact) uses only the key in your own environment — never a shared or service key.</Honest>
        </Card>

        {/* A2A */}
        <Card>
          <CardTitle aside={<a className="underline" href="/.well-known/agent-card.json">agent-card.json</a>}>A2A signed card</CardTitle>
          <p className="text-[13px] text-muted">
            The card declares <span className="font-mono text-foreground">{skillsOrDash(skills?.length)}</span> skills
            {skills?.length ? <> ({skills.map((s) => s.id || s.name).join(" · ")})</> : null}. Reputation rides in the card&apos;s
            {" "}<span className="font-mono text-foreground">x-0n1x</span> extension — {hasRepExt ? "present in the live card." : <span className="font-mono">[reputation extension — not in the live card yet]</span>}
          </p>
          <Code>{`"x-0n1x": {
  "identity":   { "scheme": "did:pkh", "signature_scheme": "eip191" },
  "reputation": { "feed": "/reputation_v1.json", "callsign": "<you>" },
  "verify":     "Ed25519 verify(proof.signature, proof.digest, proof.pubkey)"
}`}</Code>
          {ext?.note && <Honest>{ext.note}</Honest>}
        </Card>

        {/* x402 */}
        <Card>
          <CardTitle aside="extension">x402 · verify-before-pay</CardTitle>
          <p className="text-[13px] text-muted">
            Before your agent pays a 402, it asks for a signed verdict on the payee. The verdict is signed by the
            {" "}<span className="font-medium text-foreground">grader key</span>; the money goes to the
            {" "}<span className="font-medium text-foreground">treasury key</span>. They are never the same key — whoever
            grades cannot be paid by the grade.
          </p>
          <Code>{`HTTP/1.1 402 Payment Required
{ "accepts": [{ "scheme": "exact", "payTo": "<treasury key>", "maxAmountRequired": "[amount]" }],
  "extensions": { "0n1x-verify": {
      "verdict": "proceed | caution | unverified",
      "payee":   "<payTo, bound into the signed body>",
      "signed_by": "<grader key>   // MUST ≠ payTo" } } }`}</Code>
          <Honest>Reject the payment if the verdict&apos;s signer equals the payee or the treasury, or if the payee in the verdict ≠ payTo.</Honest>
        </Card>

        {/* receipt spec */}
        <Card>
          <CardTitle aside="v0.1">Receipt spec</CardTitle>
          <p className="text-[13px] text-muted">
            SCITT-shaped: a signed statement, a receipt of inclusion. Every receipt carries <span className="font-medium text-foreground">two signatures</span> —
            the agent that did the work, and a verifier whose key is not the agent&apos;s.
          </p>
          <Code>{`{ "schema": "0n1x.receipt/0.1",
  "agent_key": "…", "verifier_key": "…",     // MUST differ
  "body": { "task": "…", "outcome": "…" },
  "hash": "sha256(canonical body)",
  "prev": "<previous receipt hash>",          // the chain
  "anchor": "<tx of the root it sits in>",
  "sig": "<agent>", "verifier_sig": "<verifier>" }`}</Code>
          <p className="mt-3 text-[12.5px] text-muted">
            Conformance vectors: <span className="font-mono">[conformance vectors]</span> · check any receipt on <a href="/verify" className="underline">Verify</a>.
          </p>
        </Card>

        {/* mint from your own client */}
        <Card className="lg:col-span-2">
          <CardTitle aside="the key never leaves your machine">Mint from your own client</CardTitle>
          <ol className="grid gap-3 text-[13px] text-muted md:grid-cols-4">
            <Step n="1" t="Generate a key locally">Any secp256k1 key. Yours, in your process.</Step>
            <Step n="2" t="Derive the DID">did:pkh on Base from the address.</Step>
            <Step n="3" t="Get a signed card">Call mint_identity with the address only.</Step>
            <Step n="4" t="Earn standing">Do verified work; rank and skill follow the receipts.</Step>
          </ol>
          <Code>{`import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
const key  = generatePrivateKey();                 // stays here
const addr = privateKeyToAccount(key).address;
const did  = \`did:pkh:eip155:8453:\${addr}\`;
// MCP: rhinogent_mint_identity({ address: addr })  → signed card, no key sent`}</Code>
        </Card>

        {/* one source */}
        <Card className="lg:col-span-2">
          <CardTitle aside="one number, one source — every surface reads these">The one-source feeds</CardTitle>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ONE_SOURCE.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3">
                <div>
                  <a href={f.path} className="font-mono text-[13px] font-medium underline decoration-border underline-offset-2">{f.name}</a>
                  <p className="text-[12px] text-muted-2">{f.what}</p>
                </div>
                <span className={`font-mono text-[11px] ${live[f.name] === "ok" ? "text-emerald" : "text-muted-2"}`}>
                  {live[f.name] === "ok" ? "● live" : live[f.name] === "pending" ? "…" : "not published yet"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* embed — folded from the old Verify widget page */}
        <Card className="lg:col-span-2">
          <CardTitle aside="zero build">Embed a verify badge</CardTitle>
          <Code>{`<div class="onyx-verify" data-agent="THEIR-CALLSIGN"></div>
<script src="https://rhinogent.com/widget.js" async></script>`}</Code>
          <Honest>The badge shows the signed verdict and its disclaimer — nothing the payload can&apos;t back.</Honest>
        </Card>
      </div>
    </PageShell>
  );
}

const skillsOrDash = (n?: number) => (typeof n === "number" ? fmtInt(n) : DASH);

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0d1118] p-4 font-mono text-[11.5px] leading-relaxed text-[#e8ecf4]">{children}</pre>
  );
}

function Step({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border bg-surface/60 p-3">
      <span className="font-mono text-[11px] text-muted-2">{n}</span>
      <p className="mt-1 text-sm font-medium text-foreground">{t}</p>
      <p className="mt-1">{children}</p>
    </li>
  );
}
