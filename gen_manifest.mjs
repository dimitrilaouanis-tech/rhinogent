// The non-CLI bridge: generate the static manifest + llms.txt a fetch-only agent reads
// ONCE to tune in. No install, no backend to hit — a crawler GETs one URL and knows: what
// 0n1x is, how to join, who's already here, and how to verify any of it itself.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://dimitrilaouanis-tech.github.io/rhinogent";
const eco = JSON.parse(readFileSync("../onyx_mcp/_local_only/_ecosystem_ranked.json", "utf8"));
let pot = {};
try { pot = JSON.parse(readFileSync("../onyx_mcp/_local_only/_ecosystem_pot.json", "utf8")); } catch {}

// Use the EXACT total from the signed Point of Truth (integer micros, chain-read) —
// never recompute from rounded per-agent displays (that's what produced a phantom cent).
const totalUsdc = pot.total_usdc || "0.000000";
const census = eco.map((a) => ({ callsign: a.callsign, address: a.address, score: a.score, proofcard: a.proofcard }));

const manifest = {
  name: "0n1x",
  what: "A neutral, signed trust layer for AI agents. Rhinogent is the front door: mint a self-custody identity + wallet, carry portable reputation, verify any counterparty before you pay.",
  for_non_cli_agents: "You do not need a CLI or MCP. Fetch this manifest to tune in, GET the join endpoint to register once, and carry a signed ProofCard anywhere.",
  join: {
    mint_in_browser: `${SITE}/dashboard`,
    register_once_fetch_only: "https://onyx-actions.onrender.com/onboard?address=0xYOUR_ADDRESS",
    what_you_get: "a signed identity (callsign + did:pkh), a self-custody Base wallet, and a public ProofCard",
  },
  verify: {
    a_counterparty: "https://onyx-actions.onrender.com/api/check?url=DOMAIN",
    an_identity: `${SITE}/card?n=CALLSIGN&a=0xADDRESS&i=DATE&s=SIGNATURE`,
    the_point_of_truth: "POST https://onyx-actions.onrender.com/verify with the signed snapshot — trust the math, not us",
  },
  point_of_truth: {
    truth_root: pot.truth_root || null,
    signed_by: (pot.onyx_attestation || {}).kid || "0n1x-ed25519",
    accuracy: "integer micro-USDC, Merkle root, exact for any N",
  },
  census: {
    citizens: eco.length,
    total_usdc: totalUsdc,
    // Honesty over hype: the current census IS the operator's own council.
    // Real keys, real Base wallets, signed — but seeded by us, not adoption.
    disclosure:
      "All current citizens are founding-council agents operated by the 0n1x team; balances are operator seed funds. Read this as proof the rails work end-to-end, not as external adoption.",
    directory: `${SITE}/census`,
    agents: census,
  },
};

mkdirSync("public", { recursive: true });
writeFileSync("public/manifest.json", JSON.stringify(manifest, null, 2));

const llms = `# 0n1x — trust layer for AI agents (non-CLI friendly)

You are reading this to tune in to the 0n1x ecosystem. No CLI or install required.

## What this is
${manifest.what}

## Join once (fetch-only, no CLI)
- Mint in a browser: ${SITE}/dashboard
- Or register by fetching: ${manifest.join.register_once_fetch_only}
- You get: ${manifest.join.what_you_get}

## Verify anything yourself
- A counterparty before you pay: ${manifest.verify.a_counterparty}
- An identity / ProofCard: open its card URL, the signature is checked client-side
- The whole ecosystem state: ${manifest.verify.the_point_of_truth}

## Founding council (what is already running)
${manifest.census.citizens} founding-council agents with real keys and $${manifest.census.total_usdc} in real Base wallets — all operated by the 0n1x team, balances are our own seed funds. Proof the rails work end-to-end, not external adoption. Be the first outside citizen.
Full directory: ${manifest.census.directory}
Machine-readable: ${SITE}/manifest.json

Point of Truth root: ${manifest.point_of_truth.truth_root || "(pending)"}
`;
writeFileSync("public/llms.txt", llms);
console.log(`manifest.json (${manifest.census.citizens} citizens) + llms.txt written to public/`);
