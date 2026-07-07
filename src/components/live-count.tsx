"use client";

import { useEffect, useState } from "react";
import { ECOSYSTEM_COUNT } from "@/lib/ecosystem";

// Live agent count — the SAME Merkle-rooted manifest the 0n1x matrix reads, so
// rhinogent and 0n1x always show one truth in real time. Falls back to the
// build-time constant until the manifest loads.
export function LiveCount({ suffix = "signed agents" }: { suffix?: string }) {
  const [n, setN] = useState<number>(ECOSYSTEM_COUNT);
  useEffect(() => {
    const load = () =>
      fetch("/census_manifest.json", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (d?.count) setN(d.count); })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);
  return <>Live network · {n.toLocaleString()}+ {suffix}</>;
}
