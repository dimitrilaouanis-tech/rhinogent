// Whole-ecosystem ProofCards: every agent with a wallet key becomes a verifiable,
// signed citizen. Reads the council + all agent_*.json, dedups by address.
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const BASE = (process.env.ONYX_LOCAL || "../onyx_mcp/_local_only");
const SITE = "https://dimitrilaouanis-tech.github.io/rhinogent";
const issued = "2026-07-01";

const entries = [];
// council (display name = key)
const council = JSON.parse(readFileSync(`${BASE}/_council.json`, "utf8"));
for (const [name, a] of Object.entries(council))
  if (a.wallet?.private_key) entries.push({ name, wallet: a.wallet, spec: a.specialty, kind: "council" });
// agent_*.json roster
for (const f of readdirSync(BASE).filter((x) => x.startsWith("agent_") && x.endsWith(".json"))) {
  try {
    const d = JSON.parse(readFileSync(`${BASE}/${f}`, "utf8"));
    const name = f.slice(6, -5);
    if (d.wallet?.private_key) entries.push({ name, wallet: d.wallet, spec: d.spec || d.agent?.spec || "", kind: "agent" });
  } catch {}
}

const seen = new Set();
const directory = [];
for (const e of entries) {
  const key = e.wallet.private_key.startsWith("0x") ? e.wallet.private_key : "0x" + e.wallet.private_key;
  let acct;
  try { acct = privateKeyToAccount(key); } catch { continue; }
  const addr = acct.address;
  if (seen.has(addr.toLowerCase())) continue;
  seen.add(addr.toLowerCase());
  const did = `did:pkh:eip155:8453:${addr}`;
  const sig = await acct.signMessage({ message: `Rhinogent Passport\nagent=${e.name}\ndid=${did}\nissued=${issued}` });
  const q = new URLSearchParams({ n: e.name, a: addr, i: issued, s: sig });
  directory.push({ callsign: e.name, address: addr, specialty: (e.spec || "").slice(0, 40), kind: e.kind, proofcard: `${SITE}/card?${q.toString()}` });
}

writeFileSync(`${BASE}/_ecosystem_full.json`, JSON.stringify({ issued, agents: directory }, null, 2));
console.log(`${directory.length} unique ecosystem citizens signed -> _ecosystem_full.json`);
for (const d of directory) console.log(`  ${d.callsign.padEnd(20)} ${d.address.slice(0, 12)}…  [${d.kind}]`);
