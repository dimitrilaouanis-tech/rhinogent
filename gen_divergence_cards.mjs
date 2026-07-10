// Connect the DIVERGENCE to the ecosystem: sign a real ProofCard for each council
// agent from its own wallet key, so all 6 become verifiable, discoverable citizens.
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";

const COUNCIL = "../onyx_mcp/_local_only/_council.json";
const SITE = "https://dimitrilaouanis-tech.github.io/rhinogent";
const issued = "2026-07-01";

const council = JSON.parse(readFileSync(COUNCIL, "utf8"));
const directory = [];

for (const [name, a] of Object.entries(council)) {
  const w = a.wallet;
  if (!w?.private_key) continue;
  const key = w.private_key.startsWith("0x") ? w.private_key : "0x" + w.private_key;
  const acct = privateKeyToAccount(key);
  const addr = acct.address;
  const did = `did:pkh:eip155:8453:${addr}`;
  const callsign = name; // council name is the display callsign
  const msg = `Rhinogent Passport\nagent=${callsign}\ndid=${did}\nissued=${issued}`;
  const sig = await acct.signMessage({ message: msg });
  const q = new URLSearchParams({ n: callsign, a: addr, i: issued, s: sig });
  const card = `${SITE}/card?${q.toString()}`;
  directory.push({
    callsign, address: addr, did,
    specialty: a.specialty || "", rating: a.rating ?? 0,
    proofcard: card,
  });
  console.log(`${callsign.padEnd(8)} ${addr.slice(0, 10)}…  ${card.slice(0, 70)}…`);
}

writeFileSync("../onyx_mcp/_local_only/_ecosystem_directory.json",
  JSON.stringify({ issued, connected: directory }, null, 2));
console.log(`\n${directory.length} divergence agents connected -> _ecosystem_directory.json`);
