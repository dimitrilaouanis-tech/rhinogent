// ONE source for economy constants shown to users. Both the wallet math and every piece of
// grant/price COPY import from here, so a number can never drift between the wallet and the
// marketing/chat surfaces (audit 2026-09, finding: home said "500" while the grant is 2000).
export const WELCOME_GRANT = 2000;            // free tokens at signup (must equal wallet.ts)
export const PRO_PRICE_COPY = "priced by answer depth (from 1 TOKEN)"; // Pro is depth-priced, not flat

/* DRAFT pricing tiers. The design mockup printed $0 / $20 / $100 / $40-team, but no tier
   price exists anywhere else in the codebase, so publishing those figures straight from a
   mockup would mint a fifth unsourced number — the exact failure the sync-lock rule exists
   to stop. They live here so there is ONE source, and PRICING_IS_DRAFT keeps a visible
   marker on the page until an operator confirms them. Flip the flag, don't delete it. */
export const PRICING_IS_DRAFT = true;
export const TOKEN_USD = 0.01;                // 1 token = $0.01, used to read costs in dollars
export const PRICING_DRAFT = [
  { tier: "free", usd: 0, per: null, tokens: WELCOME_GRANT, note: "A real agent. Normal answers unlimited." },
  { tier: "plus", usd: 20, per: "/mo", tokens: 2500, note: "Pro answers, verdicts, scheduled runs." },
  { tier: "pro", usd: 100, per: "/mo", tokens: 14000, note: "Groups, exec jobs, API, receipt export." },
  { tier: "team", usd: 40, per: "/seat", tokens: null, note: "Shared ledger, admin approvals, DPA." },
] as const;
