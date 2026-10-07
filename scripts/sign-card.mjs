#!/usr/bin/env node
// Sign the A2A Agent Card with the 0n1x signing key (0x4d64f2…), EIP-191 (personal_sign).
// The signature covers the CANONICAL JSON of the card with the `signatures` field EXCLUDED
// (RFC 8785 / JCS: deterministic key sort). Anyone verifies by re-canonicalizing (minus
// `signatures`) and recovering the signer — it MUST equal identity.address.
//
//   RUN:  PRIVATE_KEY=0x<64hex> node scripts/sign-card.mjs
//   (never paste the key into a chat; export it in the shell for this one command)
//
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { privateKeyToAccount } from "viem/accounts";

const CARD = join(dirname(fileURLToPath(import.meta.url)), "..", "public", ".well-known", "agent-card.json");
const EXPECTED_SIGNER = "0x4d64f274D8C3D535B44A07452BB9A7eAEce497b1"; // the 0n1x card key

// RFC 8785-ish canonicalization: recursively sort object keys, compact separators.
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

const pk = process.env.PRIVATE_KEY;
if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  console.error("Set PRIVATE_KEY=0x<64 hex>. Example: PRIVATE_KEY=0x… node scripts/sign-card.mjs");
  process.exit(1);
}
const account = privateKeyToAccount(pk);
if (account.address.toLowerCase() !== EXPECTED_SIGNER.toLowerCase()) {
  console.error(`Key mismatch: this key is ${account.address}, expected ${EXPECTED_SIGNER}. Refusing to sign with the wrong key.`);
  process.exit(1);
}

const card = JSON.parse(readFileSync(CARD, "utf-8"));
delete card.signatures; // never sign over an old signature
const message = canon(card);
const signature = await account.signMessage({ message });

card.signatures = [{
  scheme: "eip191-personal-sign",
  signer: account.address,
  signature,
  canonicalization: "rfc8785-jcs; signatures field excluded",
  verify: "recover personal_sign(canonical-json-minus-signatures); MUST equal signer",
}];
writeFileSync(CARD, JSON.stringify(card, null, 1) + "\n");
console.log("✅ Card signed by", account.address);
console.log("   signature:", signature.slice(0, 20) + "…");
console.log("   Next: rebuild + deploy (the card ships in out/.well-known).");
