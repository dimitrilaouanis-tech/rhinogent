"use client";

import { useEffect } from "react";

/** Static-export-safe forward for folded pages: keeps the query string, so old
 *  shared links (e.g. ProofCard ?n=&a=&i=&s=) still resolve on the new page. */
export function Forward({ to, label }: { to: string; label: string }) {
  useEffect(() => {
    window.location.replace(to + window.location.search + window.location.hash);
  }, [to]);
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-muted">
      <p>
        {label} moved — <a className="underline" href={to}>continue →</a>
      </p>
    </main>
  );
}
