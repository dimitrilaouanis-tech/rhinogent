"use client";

import { useEffect } from "react";

// The classic dashboard has been merged into the single canonical /dashboard (mint, full agent
// detail with ProofCard / Agent Card / MCP connect / key reveal / remove, and the census view all
// live there now). This route stays as a redirect so old links and bookmarks keep working.
export default function ClassicRedirect() {
  useEffect(() => {
    window.location.replace("/dashboard/");
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-2">
      Redirecting to your dashboard…
    </div>
  );
}
