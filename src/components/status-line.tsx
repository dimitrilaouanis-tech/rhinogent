"use client";

/* The footer status line, read from /status.json rather than asserted.

   This replaced a hardcoded line with a pulsing green dot, which told every visitor "we checked
   just now" while checking nothing. The rule the component encodes: no probes, no claim.

   Four states, and three of them are honest refusals:
   - file unreachable        → "status unknown"
   - file present, probes 0  → "no probes reporting"   (our situation today)
   - probes reporting, ok    → "N probes · all observed ok", with the observation time
   - probes reporting, not ok→ "N probes · something is reporting a fault"

   Absence of a signal is never rendered as a green light. */

import { useEffect, useState } from "react";

type Status = {
  observed_at?: string | null;
  probes?: number | null;
  all_ok?: boolean | null;
};

export function StatusLine() {
  const [s, setS] = useState<Status | null | "error">(null);

  useEffect(() => {
    let live = true;
    fetch("/status.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: Status) => live && setS(j))
      .catch(() => live && setS("error"));
    return () => {
      live = false;
    };
  }, []);

  let text = "status unknown";
  let dot: string | null = null;

  if (s === "error") {
    text = "status unknown — no data ≠ up";
  } else if (s && typeof s === "object") {
    const probes = typeof s.probes === "number" ? s.probes : 0;
    if (probes < 1) {
      text = "no probes reporting — no data ≠ up";
    } else if (s.all_ok === true) {
      const when = s.observed_at ? new Date(s.observed_at).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "time unknown";
      text = `${probes} external probe${probes === 1 ? "" : "s"} · all observed ok · ${when}`;
      dot = "var(--emerald)";
    } else if (s.all_ok === false) {
      text = `${probes} external probe${probes === 1 ? "" : "s"} · a fault is reporting`;
      dot = "var(--gold)";
    } else {
      text = `${probes} external probe${probes === 1 ? "" : "s"} · result not stated`;
    }
  }

  return (
    <p className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-2">
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden />}
      {text}
    </p>
  );
}
