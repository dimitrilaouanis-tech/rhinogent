#!/usr/bin/env node
/* verify-feed.mjs — check a 0n1x signed feed against the published key, from scratch.
   ────────────────────────────────────────────────────────────────────────────────────────
   Usage:
     node verify-feed.mjs                       # verifies census_v1.json from rhinogent.com
     node verify-feed.mjs <url-or-path>         # verifies any 0n1x signed feed
     node verify-feed.mjs --key <base64>        # pin a different authority key

   Node 18+. No dependencies — Ed25519 comes from node:crypto.

   WHAT IT ACTUALLY CHECKS, and why each part matters:

   1. It fetches the key from /.well-known/jwks.json rather than carrying one inside itself.
      A verifier that checks a signature against a key it ships is checking that we can sign
      with our own key, which nobody doubted. Pass --key to pin a value you obtained elsewhere;
      that is the stronger check and the flag exists so you can make it.

   2. It rebuilds the signed body exactly: the feed minus `sig`, `signed_by` and `truth_root`,
      keys sorted, compact separators, non-ASCII escaped, and NUMBERS KEPT AS THE SIGNER WROTE
      THEM. That last part is the one that catches people out — JSON.parse turns 1.0 into 1, and
      a signature over the original bytes then cannot verify. This file carries its own lossless
      parser for that reason.

   3. It runs a NULL TEST before reporting success: flip one byte of the body and the signature
      must fail. A checker that only ever passes is not a checker, and exiting 0 without having
      proven you can fail is the defect this file exists to avoid.

   Exit codes: 0 verified · 1 signature invalid · 2 could not fetch or parse · 3 null test
   failed, meaning the verifier itself is broken and its PASS means nothing. */

import { createHash, createPublicKey, verify as edVerify } from "node:crypto";
import { readFileSync } from "node:fs";

const ORIGIN = "https://rhinogent.com";
const args = process.argv.slice(2);
const keyFlag = args.indexOf("--key");
const pinned = keyFlag >= 0 ? args[keyFlag + 1] : null;
const jwksFlag = args.indexOf("--jwks");
const jwksAt = jwksFlag >= 0 ? args[jwksFlag + 1] : null;
const skips = new Set([keyFlag >= 0 ? keyFlag + 1 : -1, jwksFlag >= 0 ? jwksFlag + 1 : -1]);
const target = args.find((a, i) => !a.startsWith("--") && !skips.has(i)) || `${ORIGIN}/census_v1.json`;

class Fail extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const die = (code, msg) => { throw new Fail(code, msg); };

async function load(src) {
  if (/^https?:/.test(src)) {
    const r = await fetch(src);
    if (!r.ok) die(2, `fetch ${src} -> HTTP ${r.status}`);
    return await r.text();
  }
  try { return readFileSync(src, "utf8"); } catch (e) { die(2, `read ${src} -> ${e.message}`); }
}

/* ── lossless JSON: numbers keep their original lexeme ──────────────────────────────── */
function parseLossless(s) {
  let i = 0;
  const ws = () => { while (i < s.length && " \t\n\r".includes(s[i])) i++; };
  function val() {
    ws();
    const c = s[i];
    if (c === "{") {
      i++; const o = {}; ws();
      if (s[i] === "}") { i++; return o; }
      for (;;) { ws(); const k = val(); ws(); i++; o[k] = val(); ws();
        if (s[i] === ",") { i++; continue; } i++; return o; }
    }
    if (c === "[") {
      i++; const a = []; ws();
      if (s[i] === "]") { i++; return a; }
      for (;;) { a.push(val()); ws(); if (s[i] === ",") { i++; continue; } i++; return a; }
    }
    if (c === '"') {
      const st = i; i++;
      while (s[i] !== '"' || s[i - 1] === "\\") i++;
      i++; return JSON.parse(s.slice(st, i));
    }
    const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
    if (m) { i += m[0].length; return { __num: m[0] }; }
    for (const [lit, v] of [["true", true], ["false", false], ["null", null]]) {
      if (s.startsWith(lit, i)) { i += lit.length; return v; }
    }
    throw new Error(`bad JSON at offset ${i}`);
  }
  return val();
}

const U = "\\" + "u";
const esc = (str) =>
  JSON.stringify(str).replace(/[\u007f-￿]/g, (c) =>
    U + c.charCodeAt(0).toString(16).padStart(4, "0"));

function canon(v) {
  if (v && typeof v === "object" && "__num" in v) return v.__num;
  if (v === null || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "string") return esc(v);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => esc(k) + ":" + canon(v[k])).join(",") + "}";
}

const toKey = (b64) =>
  createPublicKey({
    key: Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      Buffer.from(b64.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
    ]),
    format: "der",
    type: "spki",
  });

/* ── run ────────────────────────────────────────────────────────────────────────────── */
async function run() {
const raw = await load(target);
let doc, lossless;
try { doc = JSON.parse(raw); lossless = parseLossless(raw); }
catch (e) { die(2, `parse ${target} -> ${e.message}`); }

if (!doc.sig || !doc.signed_by) die(2, `${target} carries no sig/signed_by — it is not a signed feed`);

/* the authority key: published, or pinned by you */
let authority = pinned;
let keySource = pinned ? "--key (pinned by you)" : null;
if (!authority) {
  const base = /^https?:/.test(target) ? new URL(target).origin : ORIGIN;
  const where = jwksAt || `${base}/.well-known/jwks.json`;
  const jwks = JSON.parse(await load(where));
  const k = (jwks.keys || []).find((x) => x.kty === "OKP" && x.crv === "Ed25519");
  if (!k) die(2, "no Ed25519 key in /.well-known/jwks.json");
  authority = k.x;
  keySource = `${where} (kid ${k.kid || "—"})`;
}

const norm = (b) => Buffer.from(b.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("base64");
if (norm(authority) !== norm(doc.signed_by)) {
  console.log(`feed       ${target}`);
  console.log(`authority  ${keySource}`);
  console.log(`signed_by  ${doc.signed_by}`);
  die(1, "FOREIGN KEY — the feed is signed by a key that is not the published authority.");
}

const body = {};
for (const k of Object.keys(lossless)) {
  if (!["sig", "signed_by", "truth_root"].includes(k)) body[k] = lossless[k];
}
const msg = Buffer.from(canon(body), "utf8");
const key = toKey(authority);
const sig = Buffer.from(doc.sig, "base64");

const ok = edVerify(null, msg, key, sig);

/* NULL TEST — prove this program can fail before trusting that it passed */
const tampered = Buffer.from(msg);
tampered[tampered.length - 3] ^= 0x01;
const nullOk = !edVerify(null, tampered, key, sig);

console.log(`feed         ${target}`);
console.log(`authority    ${keySource}`);
console.log(`alg          Ed25519 over JCS-style canonical body (minus sig, signed_by, truth_root)`);
console.log(`body         ${msg.length} bytes · sha256 ${createHash("sha256").update(msg).digest("hex").slice(0, 16)}…`);
console.log(`null test    ${nullOk ? "pass — a tampered body is rejected" : "FAILED — this verifier cannot detect tampering"}`);
console.log(`signature    ${ok ? "VERIFIED" : "INVALID"}`);

if (!nullOk) die(3, "\nThe null test failed, so the result above means nothing. Do not trust this run.");
if (!ok) die(1, "\nThe signature did not verify against the published key.");
console.log("\nSigned by 0n1x. Note that signed means provably-said, not true.");

}

try {
  await run();
} catch (e) {
  if (e instanceof Fail) { console.error(e.message); process.exitCode = e.code; }
  else { console.error(e.stack || String(e)); process.exitCode = 2; }
}
