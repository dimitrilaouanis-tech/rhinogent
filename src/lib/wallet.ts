// Token wallet — per-user token accounting for premium features.
// MVP tier: balances persist client-side keyed by the signed-in Supabase user id
// (so each account has its own wallet on this device), with a signed-on-open grant.
// The same TOKEN unit the ecosystem uses (internal, non-monetary). A durable
// server-side ledger (Supabase table `wallets` with RLS) is the next tier; this
// interface stays identical so the swap is a one-file change.

import { supabase } from "@/lib/supabase";

const STARTING_GRANT = 500;          // welcome grant on first login
const KEY = (uid: string) => `rhinogent.wallet.${uid}`;

// per-feature price list (TOKEN). Premium chat charges per message; each agent
// card can declare its own call price (see priceForCard).
export const PRICES = {
  chatMessage: 5,        // one premium chat turn
  premiumChat: 5,
  cardCallDefault: 2,    // default per-call price to talk to an agent card
} as const;

export type WalletState = { balance: number; spent: number; earned: number; uid: string | null };

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function read(uid: string): { balance: number; spent: number; earned: number } {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch { /* private mode */ }
  const seed = { balance: STARTING_GRANT, spent: 0, earned: STARTING_GRANT };
  try { localStorage.setItem(KEY(uid), JSON.stringify(seed)); } catch { /**/ }
  return seed;
}

function write(uid: string, s: { balance: number; spent: number; earned: number }) {
  try { localStorage.setItem(KEY(uid), JSON.stringify(s)); } catch { /**/ }
  window.dispatchEvent(new CustomEvent("wallet:change", { detail: { uid, ...s } }));
}

export async function getWallet(): Promise<WalletState> {
  const id = await uid();
  if (!id) return { balance: 0, spent: 0, earned: 0, uid: null };
  return { ...read(id), uid: id };
}

// price to talk to a specific agent card — cards may set their own; default applies.
export function priceForCard(card?: { price?: number } | null): number {
  return Math.max(0, card?.price ?? PRICES.cardCallDefault);
}

// try to spend `amount` tokens for `reason`. Returns {ok, balance}. Never negative.
export async function spend(amount: number, reason: string): Promise<{ ok: boolean; balance: number; reason?: string }> {
  const id = await uid();
  if (!id) return { ok: false, balance: 0, reason: "sign in first" };
  const s = read(id);
  if (s.balance < amount) return { ok: false, balance: s.balance, reason: "insufficient TOKEN" };
  s.balance -= amount; s.spent += amount;
  write(id, s);
  return { ok: true, balance: s.balance };
}

// grant tokens (top-up / reward). Kept explicit so the audit is clear.
export async function grant(amount: number, _reason: string): Promise<number> {
  const id = await uid();
  if (!id) return 0;
  const s = read(id);
  s.balance += amount; s.earned += amount;
  write(id, s);
  return s.balance;
}
