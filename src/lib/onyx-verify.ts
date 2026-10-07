// onyx-verify.ts — REAL client-side verification of a 0n1x signed attestation (OA-1 / OATP).
//
// This is the trust-critical core behind the "✓ Verified" badge. It does NOT trust the chat
// reply, the server, or any embedded key. It independently fetches 0n1x's PUBLISHED authority
// key (/.well-known/onyx-pubkey) and the signed merchant attestation (/api/check), then
// recomputes the RFC-8785 (JCS) canonical body, checks the observed_hash, and verifies the
// Ed25519 signature in the browser.
//
// SAFETY PROPERTY (by construction): the signature is verified over the canonical bytes WE
// recompute. If our JCS differs from the signer's by even one byte, the hash check and the
// signature check fail — so a canonicalization bug can only ever produce a false NEGATIVE
// (red "couldn't verify"), never a false POSITIVE (green ✓ on an unsigned/forged claim).
//
// SIGNED ≠ TRUE. A green badge means: 0n1x really published this signed verdict for this
// domain, and it verifies against 0n1x's published key. It does NOT mean the verdict is
// correct — that honesty line stays in the UI. This proves provenance, not truth.
//
// Recipe is a faithful port of the network's own independent verifier (spec/verify_example.py,
// §4.2 of https://onyx-actions.onrender.com/.well-known/onyx-attestation/v1).

import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha2";

const ACTIONS = "https://onyx-actions.onrender.com";
const PUBKEY_URL = `${ACTIONS}/.well-known/onyx-pubkey`;

// ── RFC 8785 (JCS) canonical JSON ──────────────────────────────────────────────
// Ported to match the signer exactly. Numbers follow RFC 8785 §3.2.2.3: integral
// values (incl. integral floats like 1.0) serialize as integers. Strings use
// JSON.stringify, which — like Python json.dumps(ensure_ascii=false) — minimally
// escapes and keeps non-ASCII literal, matching the reference verifier.
function jcsNum(n: number): string {
  if (!Number.isFinite(n)) throw new Error("NaN/Infinity not permitted in JCS");
  return Number.isInteger(n) ? String(n) : String(n);
}
export function jcs(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number") return jcsNum(obj);
  if (Array.isArray(obj)) return "[" + obj.map(jcs).join(",") + "]";
  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + jcs(o[k])).join(",") + "}";
  }
  throw new TypeError("not JCS-serializable");
}

function b64uToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

type Attestation = { alg?: string; kid?: string; public_key?: string; observed_hash?: string; sig?: string };
type Envelope = Record<string, unknown> & { onyx_attestation?: Attestation };

export type EnvelopeResult =
  | { ok: true; kid?: string; alg?: string }
  | { ok: false; reason: "no_attestation" | "hash_mismatch" | "sig_verify_failed" };

// Offline-style verify of a single envelope against a KNOWN-GOOD public key (base64url raw-32).
// The caller pins `pubKeyB64u` to the PUBLISHED authority key — never to the envelope's own key.
export function verifyEnvelope(env: Envelope, pubKeyB64u: string): EnvelopeResult {
  const att = env.onyx_attestation;
  if (!att || typeof att !== "object" || !att.sig || !att.observed_hash) return { ok: false, reason: "no_attestation" };
  const body: Record<string, unknown> = {};
  for (const k of Object.keys(env)) if (k !== "onyx_attestation" && k !== "attestation") body[k] = (env as Record<string, unknown>)[k];
  const canonical = new TextEncoder().encode(jcs(body));
  const digest = "sha256:" + toHex(sha256(canonical));
  if (att.observed_hash !== digest) return { ok: false, reason: "hash_mismatch" };
  try {
    const good = ed25519.verify(b64uToBytes(att.sig), canonical, b64uToBytes(pubKeyB64u));
    return good ? { ok: true, kid: att.kid, alg: att.alg } : { ok: false, reason: "sig_verify_failed" };
  } catch {
    return { ok: false, reason: "sig_verify_failed" };
  }
}

// ── Published authority key (pinned, cached) ────────────────────────────────────
let _pubCache: { kid: string; public_key: string } | null = null;
async function publishedKey(signal?: AbortSignal): Promise<{ kid: string; public_key: string }> {
  if (_pubCache) return _pubCache;
  const r = await fetch(PUBKEY_URL, { signal });
  if (!r.ok) throw new Error("pubkey http " + r.status);
  const d = await r.json();
  if (!d?.public_key || !d?.kid) throw new Error("pubkey malformed");
  _pubCache = { kid: String(d.kid), public_key: String(d.public_key) };
  return _pubCache;
}

export type MerchantVerdict = {
  ok: true;
  domain: string;
  verdict: string;
  trust_score: number | null;
  band: string | null;
  kid: string;
  checked_at?: string;
};
export type MerchantFail = {
  ok: false;
  domain: string;
  reason: "key_mismatch" | "hash_mismatch" | "sig_verify_failed" | "no_attestation" | "unreachable";
};
export type MerchantResult = MerchantVerdict | MerchantFail;

// THE PUBLIC ENTRY POINT the UI calls. Given a domain, fetch 0n1x's signed verdict and the
// published key, PIN the envelope's key to the published one, then cryptographically verify.
// Returns a green result only on a genuine Ed25519 pass against the published key.
export async function verifyMerchant(domain: string, signal?: AbortSignal): Promise<MerchantResult> {
  const dom = domain.trim().toLowerCase();
  try {
    const pub = await publishedKey(signal);
    const r = await fetch(`${ACTIONS}/api/check?url=${encodeURIComponent(dom)}`, { signal });
    if (!r.ok) return { ok: false, domain: dom, reason: "unreachable" };
    const env: Envelope = await r.json();
    const att = env.onyx_attestation;
    if (!att || !att.sig) return { ok: false, domain: dom, reason: "no_attestation" };
    // PIN to the PUBLISHED key — the rule: never verify against a key the payload carries.
    // The envelope's own key is only allowed to CONFIRM it equals what 0n1x publishes.
    if (att.public_key !== pub.public_key || att.kid !== pub.kid) return { ok: false, domain: dom, reason: "key_mismatch" };
    const res = verifyEnvelope(env, pub.public_key);
    if (!res.ok) return { ok: false, domain: dom, reason: res.reason };
    return {
      ok: true,
      domain: dom,
      verdict: String(env.verdict ?? ""),
      trust_score: typeof env.trust_score === "number" ? env.trust_score : null,
      band: typeof env.band === "string" ? env.band : null,
      kid: pub.kid,
      checked_at: typeof env.checked_at_iso === "string" ? env.checked_at_iso : undefined,
    };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return { ok: false, domain: dom, reason: "unreachable" };
  }
}

// Pull the merchant/domain a turn is ABOUT out of free text. Conservative: real hostnames only,
// skips 0n1x's own infra and common noise so the badge only fires on an actual counterparty.
const SKIP_DOMAINS = new Set([
  "rhinogent.com", "onyx-actions.onrender.com", "onyxagntc.workers.dev", "onyx-pro.onyxagntc.workers.dev",
  "github.com", "github.io", "google.com", "wikipedia.org", "en.wikipedia.org", "example.com",
]);
const DOMAIN_RE = /\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|io|co|net|org|ai|xyz|app|dev|us|shop|store|finance|exchange|money|pay|cc|biz|online|site))\b/gi;
export function extractDomain(...texts: string[]): string | null {
  for (const t of texts) {
    if (!t) continue;
    const seen = new Set<string>();
    for (const m of t.matchAll(DOMAIN_RE)) {
      const d = m[1].toLowerCase().replace(/^www\./, "");
      if (seen.has(d)) continue;
      seen.add(d);
      if (SKIP_DOMAINS.has(d)) continue;
      // skip a bare 0n1x subdomain / anything under our skip set
      if ([...SKIP_DOMAINS].some((s) => d === s || d.endsWith("." + s))) continue;
      return d;
    }
  }
  return null;
}
