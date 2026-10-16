"use client";

import { FEEDS, useSignedFeed, fmtCompact, type Census } from "@/lib/signed-feed";

// ONE source for the headline number — census_v1.json (signed_wallets). Honest + falsifiable:
// our proof cohort, operated by us, 0 external, counted from the public ledger — recompute it
// yourself. Replaces the old unsourced "340k" / "millions" prose on the marketing pages.
export function CensusCohort({ className }: { className?: string }) {
  const c = useSignedFeed<Census>(FEEDS.census);
  const v = c.data?.metrics?.signed_wallets?.value;
  const n = typeof v === "number" ? fmtCompact(v) : "—";
  return <span className={className}>{n} signed agents (operated by us · 0 external)</span>;
}
