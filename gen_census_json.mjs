// Emit a small, cached census.json the page fetches at runtime (not baked at build).
// This is the affordable-at-millions shape: serve top-N + totals as one tiny static JSON
// on the CDN ($0 per viewer), refreshed on-event/cadence. Rank movement is incremental
// (per signed event) upstream — this file is just the current snapshot to render.
import { readFileSync, writeFileSync } from "node:fs";

const BASE = (process.env.ONYX_LOCAL || "../onyx_mcp/_local_only");
const eco = JSON.parse(readFileSync(`${BASE}/_ecosystem_ranked.json`, "utf8"));
let pot = {};
try { pot = JSON.parse(readFileSync(`${BASE}/_ecosystem_pot.json`, "utf8")); } catch {}

const TOP_N = 100; // never ship more than this; millions live behind search, not the page
const ranked = [...eco]
  .sort((a, b) => b.score - a.score || b.usdc - a.usdc)
  .slice(0, TOP_N)
  .map((a) => ({ callsign: a.callsign, address: a.address, specialty: a.specialty || a.kind,
                 kind: a.kind, score: a.score, usdc: a.usdc, proofcard: a.proofcard }));

const out = {
  as_of: pot.as_of || 0,                       // signed timestamp from the Point of Truth
  count: eco.length,
  total_usdc: pot.total_usdc || "0.000000",    // EXACT, from the signed POT (never recomputed)
  truth_root: pot.truth_root || null,
  signed_by: (pot.onyx_attestation || {}).kid || "0n1x-ed25519",
  top: ranked,
};
writeFileSync("public/census.json", JSON.stringify(out));
console.log(`census.json: ${out.count} citizens, top ${ranked.length}, $${out.total_usdc}, root ${String(out.truth_root).slice(0,14)}…`);
