/* The feeds this build must NOT publish — one list, read by everything that needs it.
   ─────────────────────────────────────────────────────────────────────────────────────────
   These exist in public/ because the app reads them locally in development, but the deploy
   deliberately does not write them to the live branch: the network's data Angeal is the sole
   writer of fleet state, and shipping a build snapshot would put an operator write on the live
   surface.

   This file exists because the list was duplicated once and immediately drifted. feed-state.mjs
   checked whether a file was present in public/ and reported all five feeds "usable" — while
   three of them 404 on the live site, because the deploy had held them back. A state document
   that describes the build rather than the deployment is worse than none: it is a confident,
   machine-readable lie. Same failure as the first SHA256SUMS, which hashed our copy of files
   the deploy does not write.

   Anything that decides what the live site contains reads THIS. */

export const HELD_FEEDS = ["census_v1.json", "reputation_v1.json", "rates_v1.json"];

/** True when the deploy will not write this path, so the live site will not serve it. */
export const isHeld = (p) => HELD_FEEDS.includes(p.replace(/^\//, ""));
