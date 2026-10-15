/* src/lib/rates.ts — the ONE source for the rate card on /agents.
   ─────────────────────────────────────────────────────────────────────────────────────────
   Ported 2026-10-15 from the Agents v2 drop's rates.ts. The rows, the comparables and the
   source URLs are the drop's, checked; the unit price is NOT, and that is the whole story of
   this file.

   ── THE 10× PROBLEM, AND WHY THE USD COLUMN READS "—" ────────────────────────────────────
   The repo prices the same balance in two different units under two different names:

     src/lib/economy.ts    TOKEN_USD       = 0.01      → "1 token = $0.01", published on
                                                         /pricing and on the landing page
     src/lib/wallet.ts     USD_PER_CREDIT  = 0.001     → what creditsToUsd() multiplies by
     the drop's rates.ts   USD_PER_CREDIT  = 0.001     → and its whole table is built on it

   They cannot both be right, and each is load-bearing somewhere:

     $0.001 is what the METERING table needs. At 1 credit = $0.001, credits per 1k tokens
            equals dollars per 1M tokens, which is what makes the market column legible:
            our fast lane at 0.25 · 1 sits beside Haiku 5.5 at $0.10 · $0.50 /M and reads as
            the intended 2.5× over cost. At $0.01 the same row prices us at $2.50 · $10.00
            per 1M against Haiku's $0.10 · $0.50 — twenty-five times the model we run on.
     $0.01  is what the PLAN table needs. PRICING_DRAFT sells plus at $20/mo for 2,500
            tokens. At $0.01 that is $25 of usage for $20, which is a plan. At $0.001 it is
            $2.50 of usage for $20, which is not.

   So this is not a typo with a right answer sitting next to it — it is two pricing models
   that were never reconciled, and picking one silently would either make us look 25× the
   price of the model we resolve to or turn the $20 plan into a 8× markup. Either way one
   published number would move without anyone deciding it should.

   Under the number sync-lock (one source per published number; all pages agree or the deploy
   is blocked) the honest move is the one PORT.md rule 1 already states: missing field → "—",
   never a guess. So the rate card ships with CREDITS, which are unambiguous and are read
   straight out of wallet.ts, and with the market comparables, which are other companies'
   published prices. The dollar column stays "—" and says why, until an operator picks the
   unit. Flip UNIT_USD_RESOLVED and set UNIT_USD; do not add a second constant.

   WHAT ELSE CHANGED FROM THE DROP. Nothing in the rows. The answer lanes are no longer typed
   here at all — they import CREDITS_PER_1K from wallet.ts, so the rate card and the thing
   that actually charges you cannot drift. */

import { CREDITS_PER_1K } from "./wallet";

/* false until someone decides whether a unit is $0.001 (metering) or $0.01 (plans).
   While it is false every dollar cell reads "—" and the card prints the reason. */
export const UNIT_USD_RESOLVED = false;
export const UNIT_USD: number | null = null;

export const PRICE_MAX_CREDITS = 150; // per-answer ceiling, any lane
export const NETWORK_FEE = { paidHire: "2–5%", selfHire: "0%" }; // publish it, don't hide it
export const RATES_ASOF = "2026-10-08";

export type RateStatus = "live" | "draft" | "free";
export type RateGroup = "answers" | "verdicts" | "data" | "desk" | "identity";

export type Rate = {
  group: RateGroup;
  name: string;
  unit: string;
  /** null = not metered. A pair is a range or an in · out split. */
  credits: number | [number, number] | null;
  status: RateStatus;
  /** the comparable in words, as that vendor publishes it */
  market: string;
  /** where the comparable was read from — empty when there is none */
  src: string;
  note?: string;
};

export const GROUPS: { key: RateGroup; title: string; lede: string }[] = [
  {
    key: "answers",
    title: "Answers",
    lede: "Four lanes. Facts is free and abstains when it cannot verify; the rest meter per 1k tokens after the answer exists, under one ceiling.",
  },
  {
    key: "verdicts",
    title: "Verdicts",
    lede: "Signed, re-derivable judgements another agent can check: a fact, a counterparty, a transaction, a finished task graded on hidden tests. This is the column with no competitor price in it.",
  },
  {
    key: "data",
    title: "Data",
    lede: "Commodity work, priced at the market and a little under it on purpose.",
  },
  {
    key: "desk",
    title: "The desk",
    lede: "The browser an agent drives and the compute behind it, metered by the minute rather than sold by the seat.",
  },
  {
    key: "identity",
    title: "Identity",
    lede: "Free, because free is the market and because charging for the identity would undercut the point of holding your own key.",
  },
];

const PRICING = "https://platform.claude.com/docs/en/about-claude/pricing";

export const RATES: Rate[] = [
  /* ── answers ── the three metered lanes read wallet.ts, so this card and the charge that
     actually lands on a balance cannot disagree. Nothing below retypes a credit figure. */
  {
    group: "answers", name: "Answer · fast lane", unit: "per 1k tokens in · out",
    credits: [CREDITS_PER_1K.haiku.in, CREDITS_PER_1K.haiku.out], status: "draft",
    market: "Haiku 5.5 $0.10 · $0.50 /M", src: PRICING,
    note: "2.5× cost — the margin covers signing and verification",
  },
  {
    group: "answers", name: "Answer · standard lane", unit: "per 1k tokens in · out",
    credits: [CREDITS_PER_1K.sonnet.in, CREDITS_PER_1K.sonnet.out], status: "draft",
    market: "Sonnet 5.5 $2 · $10 /M", src: PRICING,
  },
  {
    group: "answers", name: "Answer · deep lane", unit: "per 1k tokens in · out",
    credits: [CREDITS_PER_1K.opus.in, CREDITS_PER_1K.opus.out], status: "draft",
    market: "Opus 5.5 $4 · $20 /M", src: PRICING,
  },
  {
    group: "answers", name: "Facts lane", unit: "per answer", credits: 0, status: "free",
    market: "—", src: "",
    note: "always free; an abstention, a busy notice and an error never charge",
  },

  /* ── verdicts ── */
  {
    group: "verdicts", name: "Verification check", unit: "per check", credits: 0, status: "free",
    market: "Olas Mech ≈ $0.01 / request", src: "https://olas.network/agent-economies/mech",
  },
  {
    group: "verdicts", name: "Signed fact", unit: "per verdict", credits: 80, status: "draft",
    market: "no published comparable; Brave AI grounding $0.004 / query + tokens",
    src: "https://api-docs.search.brave.software/pricing",
  },
  {
    group: "verdicts", name: "Counterparty · reputation", unit: "per verdict", credits: 400, status: "draft",
    market: "People Data Labs person match $0.28; KYT vendors quote only",
    src: "https://www.syncgtm.com/blog/people-data-labs-review",
  },
  {
    group: "verdicts", name: "Tx safety · token risk · contract scan", unit: "per scan",
    credits: [100, 500], status: "live",
    market: "Alchemy asset-change simulation ≈ $0.0013; GoPlus free tier",
    src: "https://www.alchemy.com/docs/reference/pricing-plans",
    note: "the price is for the signed verdict, not for the simulation underneath it",
  },
  {
    group: "verdicts", name: "Verified issue, graded on hidden tests", unit: "per resolved task",
    credits: 2000, status: "live",
    market: "Agentforce $2 / resolution · Fin $0.99 / outcome · Sierra ≈ $1.50",
    src: "https://www.intercom.com/learning-center/intercom-pricing",
  },

  /* ── data ── */
  {
    group: "data", name: "On-chain read · enrich · lookup", unit: "per call",
    credits: [1, 10], status: "live",
    market: "x402 median $0.003 / payment · live listings $0.001–$0.03",
    src: "https://github.com/savecharlie/x402-census",
  },

  /* ── desk ── */
  {
    group: "desk", name: "Browser · headless", unit: "per minute", credits: 2, status: "draft",
    market: "Kernel $0.06 / hr · Cloudflare $0.09 / hr · Steel $0.10 / hr",
    src: "https://docs.onkernel.com/info/pricing",
  },
  {
    group: "desk", name: "Browser · headful, streamed to you", unit: "per minute",
    credits: 10, status: "draft",
    market: "Kernel headful $0.48 / hr · 30-min one-off $0.50",
    src: "https://docs.onkernel.com/info/pricing",
  },
  {
    group: "desk", name: "Session bundle · 30 min headful", unit: "per bundle",
    credits: 300, status: "draft",
    market: "Kernel 30-min stealth headful $0.50",
    src: "https://docs.onkernel.com/info/pricing",
  },
  {
    group: "desk", name: "Desk compute", unit: "per hour", credits: 120, status: "draft",
    market: "Cloudflare $0.072 / vCPU-hr · Ubicloud ≈ $0.058 / hr · Fly shared ≈ $0.01 / hr",
    src: "https://developers.cloudflare.com/containers/platform/pricing/",
    note: "first hour free",
  },

  /* ── identity ── */
  {
    group: "identity", name: "Registration · did:pkh · wallet · card", unit: "once",
    credits: 0, status: "free",
    market: "ENS $5–8 / yr · Basename ≈ 0.0001 ETH / yr · ERC-8004 gas sub-cent",
    src: "https://docs.ens.domains/registry/eth",
  },
];

export const fmtCredits = (c: Rate["credits"]) =>
  c == null ? "—" : Array.isArray(c) ? `${c[0]} · ${c[1]}` : c === 0 ? "0" : String(c);

/* Every dollar cell goes through here, so there is exactly one place to change when the unit
   is decided — and exactly one place that can be audited for having guessed. */
export function fmtUsd(c: Rate["credits"]): string {
  if (!UNIT_USD_RESOLVED || UNIT_USD === null) return c === 0 ? "free" : "—";
  const one = (n: number) => {
    const v = n * UNIT_USD;
    return v >= 1 ? `$${v.toFixed(2)}` : v >= 0.01 ? `$${v.toFixed(3)}` : `$${v.toFixed(4)}`;
  };
  if (c == null) return "—";
  if (c === 0) return "free";
  return Array.isArray(c) ? `${one(c[0])} · ${one(c[1])}` : one(c);
}

export const rateCounts = () => ({
  total: RATES.length,
  live: RATES.filter((r) => r.status === "live").length,
  draft: RATES.filter((r) => r.status === "draft").length,
  free: RATES.filter((r) => r.status === "free").length,
  priced: RATES.filter((r) => r.credits !== 0 && r.credits !== null).length,
});
