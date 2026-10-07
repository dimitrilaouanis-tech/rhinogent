// Token wallet — CROSS-SURFACE via the shared Supabase `token_ledger`.
// The balance is a pure function of shared data: a deterministic welcome grant + the SUM of
// the user's ledger rows (earn = positive, server-written; spend = negative, client-written
// under the token_ledger_self_spend RLS policy). Because the app, this desktop site, and the
// phone-web all read the SAME ledger, a charge on ANY surface shows up on ALL of them.
// Grants (welcome, check-in bonus) stay device-local — clients can never MINT into the ledger.

import { supabase } from "@/lib/supabase";

// Deterministic welcome grant — MUST match the app (lib/wallet.ts) so every surface agrees.
import { WELCOME_GRANT } from "@/lib/economy";   // ONE source — see economy.ts (no drift with the UI copy)
export { WELCOME_GRANT };
const GRANT_KEY = (uid: string) => `rhinogent.wallet.grant.${uid}`;     // device-local bonus grants (check-in)
const PENDING_KEY = (uid: string) => `rhinogent.wallet.pending.${uid}`;  // spends made offline, awaiting ledger flush
const SPLIT_CACHE = (uid: string) => `rhinogent.wallet.split.${uid}`;    // last known {earn,spend} (offline fallback)

// per-feature price list (TOKEN). Premium chat charges per message; each agent
// card can declare its own call price (see priceForCard).
export const PRICES = {
  chatMessage: 5,        // one premium chat turn (floor; see priceForAnswer for depth pricing)
  premiumChat: 5,
  cardCallDefault: 2,    // default per-call price to talk to an agent card
  freeMints: 2,          // first N self-custody agent mints are free
  mintId: 150,           // TOKEN cost to mint a self-custody agent after the free grant
} as const;

export const PRICE_MAX = 40;

// An answer that did not deliver is NOT billable. Abstentions, busy notices, errors and empty
// replies all cost ZERO — the client asked and got nothing, so there is nothing to charge for.
// This is checked FIRST, before any depth signal, because length must never turn a non-answer
// into a bill: "I don't have a verified fact for that" is 14 words and was previously priced
// like any other reply.
const NON_ANSWER = [
  /\bI (don'?t|do not) have a verified fact\b/i,
  /\bwon'?t guess\b/i,
  /\bown brain is busy\b/i,
  /\bno verified fact\b/i,
  /\bgoing too fast\b/i,
  /^\s*(sorry|I'?m sorry)[,.\s]/i,
];

export function isBillableAnswer(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 2) return false;
  return !NON_ANSWER.some((re) => re.test(t));
}

// STANDARD PER-TOKEN PRICING (the Claude / industry model, 2026): charge = input_tokens × in_rate
// + output_tokens × out_rate. Rates in CREDITS per 1,000 tokens at 1 credit ≈ $0.001, Sonnet-class
// default. Cache reads bill at 10% of input, and an async/batch lane at 50% off — both industry standard.
// Non-answers / abstentions are FREE. Normal/local lane is free elsewhere; this meters only the Pro lane.
// EXACT MIRROR of the app's lib/wallet.ts so both surfaces price identically.
const CREDITS_PER_1K: Record<string, { in: number; out: number }> = {
  haiku: { in: 1, out: 5 },
  sonnet: { in: 2, out: 10 },
  opus: { in: 5, out: 25 },
};
export function estTokens(s: string): number { return Math.ceil(String(s || "").length / 4); } // ~4 chars/token

export function priceForAnswer(
  text: string,
  opts: {
    prompt?: string; inputTokens?: number; outputTokens?: number;
    tier?: "haiku" | "sonnet" | "opus"; cachedInput?: boolean; batch?: boolean; floor?: number;
    // legacy quality fields — accepted so existing callers compile; not used under per-token pricing
    grounded?: boolean; sources?: number; escalated?: boolean; base?: number;
  } = {}
): number {
  const t = (text || "").trim();
  if (!isBillableAnswer(t)) return 0;                    // abstained / busy / error → free
  const r = CREDITS_PER_1K[opts.tier ?? "sonnet"] ?? CREDITS_PER_1K.sonnet;
  const outTok = opts.outputTokens ?? estTokens(t);
  const inTok = opts.inputTokens ?? estTokens(opts.prompt ?? "");
  const cacheMul = opts.cachedInput ? 0.1 : 1;          // cache reads at 10% of input (industry standard)
  let credits = (inTok / 1000) * r.in * cacheMul + (outTok / 1000) * r.out;
  if (opts.batch) credits *= 0.5;                        // async/batch lane at 50% off
  const floor = Math.max(1, Math.round(opts.floor ?? 1));
  return Math.max(floor, Math.min(PRICE_MAX, Math.round(credits)));
}

export function countSources(text: string): number {
  return (String(text || "").match(/https?:\/\/[^\s)]+/g) || []).length;
}

// MIRROR of the app's lib/wallet.ts. The parts are reported SEPARATELY and never netted:
// `earned` is EARNED WORK ONLY, because credential tiers are computed from it and a tier
// that includes the welcome grant is held by every account from signup and certifies nothing.
export type WalletState = {
  balance: number;
  earned: number;   // ledger `earn` rows — work the network paid for
  spent: number;    // ledger `spend` rows + spends queued offline
  welcome: number;  // free-era grant: given, not earned
  bonus: number;    // device-local check-in grants: given, not earned
  uid: string | null;
};
type PendingSpend = { amount: number; reason: string; idem: string };

const r4 = (n: number) => Math.round((n + Number.EPSILON) * 1e4) / 1e4;

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function readNum(key: string): number {
  try { const v = localStorage.getItem(key); if (v != null) return Number(v) || 0; } catch { /* private mode */ }
  return 0;
}
function writeNum(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch { /**/ }
}
function readPending(id: string): PendingSpend[] {
  try { const raw = localStorage.getItem(PENDING_KEY(id)); if (raw) return JSON.parse(raw) as PendingSpend[]; } catch { /**/ }
  return [];
}
function writePending(id: string, p: PendingSpend[]) {
  try { localStorage.setItem(PENDING_KEY(id), JSON.stringify(p)); } catch { /**/ }
}

// Shared-ledger SPLIT — earn rows (+) and spend rows (−) kept APART rather than netted, so each
// can be stated honestly. Netting destroyed both: earned 393 / spent 498 netted to −105 and was
// then reported as "earned 2000 · spent 105". null when offline (fall back to the cached split).
type LedgerSplit = { earn: number; spend: number };
async function ledgerSplit(id: string): Promise<LedgerSplit | null> {
  try {
    const { data, error } = await supabase.from("token_ledger").select("amount").eq("user_id", id);
    if (error || !data) return null;
    let earn = 0, spend = 0;
    for (const r of data as { amount: number | null }[]) {
      const a = Number(r.amount || 0);
      if (a > 0) earn += a; else spend += -a;
    }
    const split: LedgerSplit = { earn, spend };
    try { localStorage.setItem(SPLIT_CACHE(id), JSON.stringify(split)); } catch { /**/ }
    return split;
  } catch { return null; }
}
function cachedSplit(id: string): LedgerSplit {
  try {
    const v = localStorage.getItem(SPLIT_CACHE(id));
    if (v) { const p = JSON.parse(v); return { earn: Number(p?.earn || 0), spend: Number(p?.spend || 0) }; }
  } catch { /**/ }
  return { earn: 0, spend: 0 };
}

async function insertSpendRow(id: string, amount: number, reason: string, idem: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("token_ledger").insert({
      user_id: id, kind: "spend", amount: -Math.abs(Math.round(amount)), reason, idem_key: idem,
    });
    return !error;
  } catch { return false; }
}

async function flushPending(id: string): Promise<void> {
  const p = readPending(id);
  if (!p.length) return;
  const remain: PendingSpend[] = [];
  for (const row of p) {
    const ok = await insertSpendRow(id, row.amount, row.reason, row.idem);
    if (!ok) remain.push(row);
  }
  if (remain.length !== p.length) writePending(id, remain);
}

export async function getWallet(): Promise<WalletState> {
  const id = await uid();
  if (!id) return { balance: 0, earned: 0, spent: 0, welcome: 0, bonus: 0, uid: null };
  await flushPending(id).catch(() => {});
  const live = await ledgerSplit(id);
  const { earn, spend } = live !== null ? live : cachedSplit(id);
  const bonus = readNum(GRANT_KEY(id));
  const pending = readPending(id).reduce((s, r) => s + Math.abs(r.amount), 0);
  // Identical arithmetic to the netted version — only the reporting changed.
  const spent = r4(spend + pending);
  const balance = Math.max(0, r4(WELCOME_GRANT + earn + bonus - spent));
  return { balance, earned: r4(earn), spent, welcome: WELCOME_GRANT, bonus, uid: id };
}

// price to talk to a specific agent card — cards may set their own; default applies.
export function priceForCard(card?: { price?: number } | null): number {
  return Math.max(0, card?.price ?? PRICES.cardCallDefault);
}

// try to spend `amount` tokens for `reason`. Records into the SHARED ledger (so the charge
// syncs to the app + phone-web). Never negative.
export async function spend(amount: number, reason: string): Promise<{ ok: boolean; balance: number; reason?: string }> {
  const w = await getWallet();
  if (!w.uid) return { ok: false, balance: 0, reason: "sign in first" };
  const amt = Math.max(0, Math.round(amount));
  if (amt === 0) return { ok: true, balance: w.balance };
  if (w.balance < amt) return { ok: false, balance: w.balance, reason: "insufficient TOKEN" };
  const idem = `${w.uid}:${Date.now()}:${Math.floor(Math.random() * 1e6)}`;
  const ok = await insertSpendRow(w.uid, amt, reason, idem);
  if (!ok) { const p = readPending(w.uid); p.push({ amount: amt, reason, idem }); writePending(w.uid, p); }
  const balance = w.balance - amt;
  try { window.dispatchEvent(new CustomEvent("wallet:change", { detail: { uid: w.uid, balance } })); } catch { /**/ }
  return { ok: true, balance };
}

// Device-local bonus grant (check-in). Cannot be written to the shared ledger (only server
// processes mint), so it stays on-device; earns arrive server-side as ledger rows.
export async function grant(amount: number, _reason: string): Promise<number> {
  const id = await uid();
  if (!id) return 0;
  writeNum(GRANT_KEY(id), readNum(GRANT_KEY(id)) + amount);
  const bal = (await getWallet()).balance;
  try { window.dispatchEvent(new CustomEvent("wallet:change", { detail: { uid: id, balance: bal } })); } catch { /**/ }
  return bal;
}

// overachievement reward — a small local grant when an agent does more than asked.
export async function reward(amount: number = 0.1, reason: string = "overachievement"): Promise<number> {
  const bal = await grant(amount, `reward: ${reason}`);
  try { window.dispatchEvent(new CustomEvent("wallet:reward", { detail: { amount, reason } })); } catch { /**/ }
  return bal;
}
