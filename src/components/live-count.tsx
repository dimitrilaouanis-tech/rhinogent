"use client";

import { useEffect, useState } from "react";
import { feedFetch } from "@/lib/feeds";

// Live agent count — the SAME Merkle-rooted manifest the 0n1x matrix reads, so
// rhinogent and 0n1x always show one truth in real time. NEVER shows a stale
// build-time constant: until the manifest syncs, it shows a "synchronizing"
// state, so the only number ever displayed is the live one.
export function LiveCount({ suffix = "signed agents" }: { suffix?: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const load = () =>
      feedFetch("/census_manifest.json")
        .then((r) => r.json())
        .then((d) => { if (d?.count) setN(d.count); })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);
  if (n === null) return <>Live network · synchronizing…</>;
  return <>Live network · {n.toLocaleString()}+ {suffix}</>;
}
