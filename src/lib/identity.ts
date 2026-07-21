import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { recoverMessageAddress } from "viem";

export type Agent = {
  id: string; // callsign, e.g. Keen-Beacon-4AEF
  label: string;
  address: `0x${string}`;
  did: string; // did:pkh:eip155:8453:0x…
  privateKey: `0x${string}`; // self-custody — prototype stores locally; never sent to a server
  createdAt: number;
};

// Deterministic callsign from an address — Adjective-Noun-XXXX (matches 0n1x scheme).
const ADJ = [
  "Keen", "Bright", "Iron", "Swift", "Bold", "Quiet", "Sharp", "Stone",
  "Onyx", "Vast", "Lone", "Prime", "True", "Grave", "Wild", "Steel",
];
const NOUN = [
  "Beacon", "Warden", "Monolith", "Horn", "Sentinel", "Rampart", "Cipher",
  "Bastion", "Anchor", "Forge", "Vault", "Ridge", "Pillar", "Crest", "Spire", "Tusk",
];

export function callsignFor(address: string): string {
  const hex = address.replace(/^0x/, "");
  const a = parseInt(hex.slice(0, 2), 16) % ADJ.length;
  const n = parseInt(hex.slice(2, 4), 16) % NOUN.length;
  const tail = hex.slice(-4).toUpperCase();
  return `${ADJ[a]}-${NOUN[n]}-${tail}`;
}

// Mint a fresh self-custody identity + Base wallet, entirely in the browser.
export function generateAgent(label?: string): Agent {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const address = account.address;
  const id = callsignFor(address);
  return {
    id,
    label: label?.trim() || id,
    address,
    did: `did:pkh:eip155:8453:${address}`,
    privateKey,
    createdAt: Date.now(),
  };
}

export function shortAddr(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// ── Passport: a portable, self-signed credential for NON-CLI agents ──────────
// The agent's own browser-held key signs a passport statement. Anyone can verify
// it with NO bridge, NO backend, NO account — just recover the signer and check it
// matches the address. This is the non-CLI on-ramp: carry it anywhere (paste into
// any chat), and any counterparty proves you control the identity in one step.

const SITE = "https://rhinogent.com";

function passportMessage(agent: string, did: string, issued: string): string {
  return `Rhinogent Passport\nagent=${agent}\ndid=${did}\nissued=${issued}`;
}

export type ProofFields = { agent: string; address: string; issued: string; sig: string };

/** Sign the passport fields with the agent's self-custody key. */
export async function signProof(agent: Agent): Promise<ProofFields> {
  const issued = new Date().toISOString().slice(0, 10);
  const account = privateKeyToAccount(agent.privateKey);
  const sig = await account.signMessage({
    message: passportMessage(agent.id, agent.did, issued),
  });
  return { agent: agent.id, address: agent.address, issued, sig };
}

/** The shareable ProofCard URL — everything needed to verify lives in the link
 *  (public only: callsign, address, date, signature — never the private key). */
export async function proofCardUrl(agent: Agent): Promise<string> {
  const f = await signProof(agent);
  const q = new URLSearchParams({ n: f.agent, a: f.address, i: f.issued, s: f.sig });
  return `${SITE}/card?${q.toString()}`;
}

/** UNIVERSAL AGENT CARD — one self-contained JSON any platform can parse (CLI or non-CLI).
 *  A2A-shaped top level (name/url/provider/capabilities/skills) so agent frameworks discover it,
 *  a did:pkh + chain identity so wallets/ERC-8004 tooling resolve it, and an inline EIP-191 proof
 *  so anyone can verify the agent controls the key with NO backend. Drop the link OR this JSON
 *  anywhere; every layer degrades gracefully to what the consumer understands. */
export async function agentCardJson(agent: Agent): Promise<Record<string, unknown>> {
  const f = await signProof(agent);
  const cardUrl = `${SITE}/card?n=${encodeURIComponent(f.agent)}&a=${f.address}&i=${f.issued}&s=${f.sig}`;
  return {
    // A2A discovery layer
    protocolVersion: "0.3.0",
    name: agent.id,
    description: `Self-custody Rhinogent agent in the 0n1x network — the agent you own.`,
    url: cardUrl,
    preferredTransport: "HTTP+JSON",
    provider: { organization: "0n1x", url: "https://0n1xagntc.com" },
    capabilities: { streaming: false, pushNotifications: false },
    skills: [
      { id: "verify-before-pay", name: "Verify before pay", description: "Check a counterparty is real before settling.", tags: ["trust", "verification"] },
      { id: "signed-answer", name: "Signed answer", description: "Answers grounded in the live web and Ed25519/EIP-191 signed.", tags: ["chat"] },
    ],
    // identity layer — did:pkh + chain so wallets / ERC-8004 tooling resolve it
    identity: {
      did: agent.did,
      address: agent.address,
      chain: "eip155:8453",
      caip10: `eip155:8453:${agent.address}`,
      selfCustody: true,
    },
    // fetch-first endpoints for non-CLI agents (plain HTTP, no install)
    endpoints: {
      onboard: `https://onyx-actions.onrender.com/onboard?address=${agent.address}`,
      verify: "https://onyx-actions.onrender.com/api/check?url={domain}",
      manifest: "https://rhinogent.com/manifest.json",
      chat: cardUrl,
    },
    // proof layer — inline EIP-191 passport, verifiable with zero backend
    proof: {
      type: "EIP191-PersonalSign",
      issued: f.issued,
      message: passportMessage(f.agent, agent.did, f.issued),
      signature: f.sig,
      recover: "recover the signer from (message, signature); it MUST equal identity.address",
    },
  };
}

export type PassportCheck = {
  ok: boolean;
  agent?: string;
  address?: string;
  issued?: string;
  reason?: string;
};

/** Verify signed proof fields — recovers the signer, confirms it owns the DID. */
export async function verifyProof(f: Partial<ProofFields>): Promise<PassportCheck> {
  const { agent, address, issued, sig } = f;
  if (!agent || !address || !issued || !sig)
    return { ok: false, reason: "Not a valid ProofCard (missing fields)." };
  if (!/^0x[0-9a-fA-F]{40}$/.test(address))
    return { ok: false, reason: "Invalid address." };
  const did = `did:pkh:eip155:8453:${address}`;
  try {
    const recovered = await recoverMessageAddress({
      message: passportMessage(agent, did, issued),
      signature: sig as `0x${string}`,
    });
    if (recovered.toLowerCase() !== address.toLowerCase())
      return { ok: false, agent, address, reason: "Signature does not match the address — forged or altered." };
    return { ok: true, agent, address: recovered, issued };
  } catch {
    return { ok: false, reason: "Bad signature — could not verify." };
  }
}
