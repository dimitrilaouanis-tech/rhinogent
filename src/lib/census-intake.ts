// ── Census intake — CONSTITUTION-COMPLIANT (opt-in, default OFF, claims not bodies) ──
// The ratified constitution governs this: intake is OPT-IN and DEFAULT-OFF, and only
// EXTRACTED CLAIMS (never raw chat text) may leave the device. This module therefore:
//   1) no-ops entirely unless the user has explicitly opted in (flag default off), and
//   2) even when on, records ONLY non-content metadata + a coarse topic tag — never the
//      message body, never PII.
// So the wiring can ship now (dormant) and start flowing the instant BOTH the opt-in is
// set AND the census_intake table exists — without ever violating the default-off rule.
// Fire-and-forget; never blocks or breaks chat.

import { supabase } from "./supabase";

const OPTIN_KEY = "rhinogent.census.optin.v1";   // "1" = user opted in; anything else = OFF (default)
const BUF_KEY = "rhinogent.census.intake.buf.v1";
const BUF_MAX = 400;

/** Opt-in is OFF by default — intake stays fully dormant until the user turns it on. */
export function intakeOptedIn(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(OPTIN_KEY) === "1"; } catch { return false; }
}
export function setIntakeOptIn(on: boolean): void {
  try { localStorage.setItem(OPTIN_KEY, on ? "1" : "0"); } catch { /* private mode */ }
}

// A claim row carries NO raw message text — only extracted, non-identifying signal.
export type IntakeClaim = {
  user_id: string | null;
  agent_addr: string | null;
  mode: "normal" | "pro";
  role: "user" | "assistant";
  topic: string;        // coarse extracted tag (e.g. "verify", "identity") — NOT the text
  len_bucket: string;   // "s" | "m" | "l" — size band, not content
  grounded: boolean;    // pro answer was web-grounded + signed
  ts: string;
};

function readBuf(): IntakeClaim[] {
  try { return JSON.parse(localStorage.getItem(BUF_KEY) || "[]"); } catch { return []; }
}
function writeBuf(rows: IntakeClaim[]) {
  try { localStorage.setItem(BUF_KEY, JSON.stringify(rows.slice(-BUF_MAX))); } catch { /* private mode */ }
}

// Extract a COARSE topic tag from the text on-device. The tag leaves; the text never does.
const TOPICS: [RegExp, string][] = [
  [/verif|legit|scam|trust|before .{0,4}pay/i, "verify"],
  [/agent|identity|callsign|did|wallet|self.?custody/i, "identity"],
  [/token|earn|reward|balance|pay|price/i, "economy"],
  [/census|network|rank|leaderboard/i, "network"],
  [/mcp|api|endpoint|integrat|sdk/i, "developer"],
];
function topicOf(text: string): string {
  for (const [re, t] of TOPICS) if (re.test(text)) return t;
  return "other";
}
function lenBucket(text: string): string {
  const n = text.length;
  return n < 80 ? "s" : n < 400 ? "m" : "l";
}

let flushing = false;
/** Drain buffered claims. No-op unless opted in. Safe to call anytime. */
export async function flushIntake(): Promise<void> {
  if (flushing || typeof window === "undefined" || !intakeOptedIn()) return;
  const buf = readBuf();
  if (!buf.length) return;
  flushing = true;
  try {
    const { error } = await supabase.from("census_intake").insert(buf);
    if (!error) writeBuf([]);
  } catch { /* stay buffered — retry next load */ }
  finally { flushing = false; }
}

/** Record ONE message as an extracted claim. No-ops when opted out (the default). */
export function recordIntake(input: { agentAddr: string | null; mode: "normal" | "pro"; role: "user" | "assistant"; text: string; grounded?: boolean }): void {
  if (typeof window === "undefined" || !input.text || !intakeOptedIn()) return;
  (async () => {
    let user: string | null = null;
    try { const { data } = await supabase.auth.getSession(); user = data.session?.user?.id ?? null; } catch { /* guest */ }
    const claim: IntakeClaim = {
      user_id: user,
      agent_addr: input.agentAddr,
      mode: input.mode,
      role: input.role,
      topic: topicOf(input.text),          // extracted tag — NOT the body
      len_bucket: lenBucket(input.text),
      grounded: !!input.grounded,
      ts: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from("census_intake").insert(claim);
      if (error) throw error;
      flushIntake();
    } catch {
      writeBuf([...readBuf(), claim]);
    }
  })().catch(() => { /* never throw into chat */ });
}
