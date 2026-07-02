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
