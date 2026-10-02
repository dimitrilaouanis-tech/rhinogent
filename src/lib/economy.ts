// ONE source for economy constants shown to users. Both the wallet math and every piece of
// grant/price COPY import from here, so a number can never drift between the wallet and the
// marketing/chat surfaces (audit 2026-09, finding: home said "500" while the grant is 2000).
export const WELCOME_GRANT = 2000;            // free tokens at signup (must equal wallet.ts)
export const PRO_PRICE_COPY = "priced by answer depth (from 1 TOKEN)"; // Pro is depth-priced, not flat
