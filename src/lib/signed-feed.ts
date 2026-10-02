"use client";

// ONE way every inner page reads a signed 0n1x feed (census_v1, reputation_v1).
// Contract: cache-bust via feedFetch, "—" on failure, nothing hardcoded. Every number on
// these pages comes from `data` below — never from a literal in a component.
//
// The signature is checked IN THE BROWSER, not assumed. Recipe (verified against both live
// feeds 2026-10-02): body = feed minus {sig, signed_by, truth_root}; keys sorted, compact
// separators, non-ASCII \u-escaped, numbers kept EXACTLY as the signer wrote them (1.0 stays
// "1.0" — JSON.parse would lose that, so we re-parse the raw text losslessly). Ed25519 over
// those bytes, against the PINNED feed key — never only against the key the feed names
// itself (a swapped feed can name any key it likes).
//
// SIGNED ≠ TRUE: a valid signature proves 0n1x published these numbers, not that they are right.
// That is why every number also links to its `basis` — recompute it yourself.

import { useEffect, useState } from "react";
import { ed25519 } from "@noble/curves/ed25519";
import { feedFetch } from "@/lib/feeds";

// The published 0n1x feed-signing key (Ed25519, base64 raw-32). Pinned in the client bundle.
export const FEED_KEY = "fgkuOgXK1HX/THpnXOximFOM2RDyxYGznd2CvFEB4kk=";

export const FEEDS = {
  census: "/census_v1.json",
  reputation: "/reputation_v1.json",
} as const;

export type SigState = "valid" | "invalid" | "unsigned" | "foreign-key";
export type Feed<T> = {
  status: "loading" | "ok" | "error";
  data: T | null;
  sig: SigState | null;
};

// ── lossless canonical form ────────────────────────────────────────────────────
type Num = { __n: string };
type Lossless = null | boolean | string | Num | Lossless[] | { [k: string]: Lossless };

function parseLossless(s: string): Lossless {
  let i = 0;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const str = (): string => {
    const st = i++;
    while (s[i] !== '"') { if (s[i] === "\\") i++; i++; }
    i++;
    return JSON.parse(s.slice(st, i));
  };
  const val = (): Lossless => {
    ws();
    const c = s[i];
    if (c === "{") {
      i++; const o: { [k: string]: Lossless } = {}; ws();
      if (s[i] === "}") { i++; return o; }
      for (;;) { ws(); const k = str(); ws(); i++; o[k] = val(); ws(); if (s[i] === ",") { i++; continue; } i++; return o; }
    }
    if (c === "[") {
      i++; const a: Lossless[] = []; ws();
      if (s[i] === "]") { i++; return a; }
      for (;;) { a.push(val()); ws(); if (s[i] === ",") { i++; continue; } i++; return a; }
    }
    if (c === '"') return str();
    if (s.startsWith("true", i)) { i += 4; return true; }
    if (s.startsWith("false", i)) { i += 5; return false; }
    if (s.startsWith("null", i)) { i += 4; return null; }
    const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
    if (!m) throw new Error("bad json at " + i);
    i += m[0].length;
    return { __n: m[0] };
  };
  return val();
}

const asciiEscape = (t: string) =>
  t.replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

function canon(o: Lossless, ascii = true): string {
  const esc = ascii ? asciiEscape : (t: string) => t;
  if (o === null) return "null";
  if (typeof o === "boolean") return o ? "true" : "false";
  if (typeof o === "string") return esc(JSON.stringify(o));
  if (Array.isArray(o)) return "[" + o.map((x) => canon(x, ascii)).join(",") + "]";
  if ("__n" in o && typeof (o as Num).__n === "string") return (o as Num).__n;
  const r = o as { [k: string]: Lossless };
  return "{" + Object.keys(r).sort().map((k) => esc(JSON.stringify(k)) + ":" + canon(r[k], ascii)).join(",") + "}";
}

function b64ToBytes(b64: string): Uint8Array {
  const s = b64.trim().replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Canonical bytes of a raw JSON object minus `omit` keys. `ascii` = \u-escape non-ASCII
 *  (the 0n1x feed signer); false = RFC 8785 literal (the OA-1 attestation signer). */
export function canonicalOf(raw: string, omit: string[], ascii = true): Uint8Array | null {
  try {
    const doc = parseLossless(raw);
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) return null;
    const d = doc as { [k: string]: Lossless };
    const body: { [k: string]: Lossless } = {};
    for (const k of Object.keys(d)) if (!omit.includes(k)) body[k] = d[k];
    return new TextEncoder().encode(canon(body, ascii));
  } catch {
    return null;
  }
}

export function b64Decode(b64: string): Uint8Array { return b64ToBytes(b64); }
export function hex(b: Uint8Array): string { return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(""); }

/** Verify a signed 0n1x document from its RAW text. `pinned` = the key it must be signed by. */
export function verifySignedText(raw: string, pinned: string | null = FEED_KEY): {
  state: SigState;
  signedBy: string | null;
} {
  try {
    const doc = parseLossless(raw);
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { state: "unsigned", signedBy: null };
    const d = doc as { [k: string]: Lossless };
    const sig = typeof d.sig === "string" ? d.sig : null;
    const by = typeof d.signed_by === "string" ? d.signed_by : null;
    if (!sig || !by) return { state: "unsigned", signedBy: by };
    const body: { [k: string]: Lossless } = {};
    for (const k of Object.keys(d)) if (k !== "sig" && k !== "signed_by" && k !== "truth_root") body[k] = d[k];
    const ok = ed25519.verify(b64ToBytes(sig), new TextEncoder().encode(canon(body)), b64ToBytes(by));
    if (!ok) return { state: "invalid", signedBy: by };
    if (pinned && by !== pinned) return { state: "foreign-key", signedBy: by };
    return { state: "valid", signedBy: by };
  } catch {
    return { state: "invalid", signedBy: null };
  }
}

/** Fetch + verify a signed feed. Refreshes every minute. data=null ⇒ render "—". */
export function useSignedFeed<T = Record<string, unknown>>(path: string): Feed<T> {
  const [f, setF] = useState<Feed<T>>({ status: "loading", data: null, sig: null });
  useEffect(() => {
    let alive = true;
    const load = () =>
      feedFetch(path)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
        .then((raw) => {
          const data = JSON.parse(raw) as T;
          const { state } = verifySignedText(raw);
          if (alive) setF({ status: "ok", data, sig: state });
        })
        .catch(() => { if (alive) setF({ status: "error", data: null, sig: null }); });
    load();
    const iv = setInterval(load, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, [path]);
  return f;
}

/** Plain JSON (unsigned) helper with the same contract — used for non-number metadata. */
export function useJson<T = Record<string, unknown>>(path: string): { status: "loading" | "ok" | "error"; data: T | null } {
  const [s, setS] = useState<{ status: "loading" | "ok" | "error"; data: T | null }>({ status: "loading", data: null });
  useEffect(() => {
    let alive = true;
    feedFetch(path)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => { if (alive) setS({ status: "ok", data: d as T }); })
      .catch(() => { if (alive) setS({ status: "error", data: null }); });
    return () => { alive = false; };
  }, [path]);
  return s;
}

// ── shapes (only the fields the pages read) ────────────────────────────────────
export type CensusMetric = { value: number; basis?: string };
export type Census = {
  schema?: string;
  epoch?: number;
  epoch_iso?: string;
  metrics?: Record<string, CensusMetric | undefined>;
  disclosure?: string;
  signed_by?: string;
  truth_root?: string;
};
export type RepAgent = {
  callsign: string;
  reputation?: number;
  skill?: number;
  skill_measured?: boolean;
  skill_ci?: number;          // ± half-width, when the feed publishes it
  activity_R?: number;
  independence?: number;
  outcomes?: number;
  tier?: string;
  specialty?: string;
  did?: string;
  coverage?: number;
};
export type Reputation = {
  schema?: string;
  epoch?: number;
  epoch_iso?: string;
  count?: number;
  formula?: string;
  basis?: string;
  with_signed_outcomes?: number;
  skill_measured_count?: number;
  skill_note?: string;
  agents?: RepAgent[];
  signed_by?: string;
  truth_root?: string;
};

// ── formatting: a missing number is ALWAYS "—" ─────────────────────────────────
export const DASH = "—";
export const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
export const fmtInt = (n: unknown) => (isNum(n) ? Math.round(n).toLocaleString("en-US") : DASH);
export function fmtCompact(n: unknown): string {
  if (!isNum(n)) return DASH;
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (a >= 1e4) return Math.floor(n / 1e3) + "k"; // truncate, never round up a count
  return fmtInt(n);
}
export const metric = (c: Census | null, name: string): number | null => {
  const m = c?.metrics?.[name];
  return m && isNum(m.value) ? m.value : null;
};
export const short = (s: string | null | undefined, head = 6, tail = 4) =>
  !s ? DASH : s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
