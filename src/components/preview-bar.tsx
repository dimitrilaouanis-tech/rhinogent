"use client";

/* The preview route strip, in our colours.

   Taken from the built-site preview chrome (desktop snip, 2026-10-05 02:44) — a dark bar across
   the top with every route as a pill and the active one filled. Recoloured from that preview's
   near-black/indigo to our own tokens: the navy slab we already use for dark panels, our violet
   accent, our mono for the meta line.

   It renders ONLY on localhost. This is a reviewing tool — we have been opening /apps,
   /download, /security and /mix by hand all session — and a route switcher is exactly the thing
   that must never reach a visitor. The check runs client-side after mount, so the static export
   ships nothing and there is no flash of it on the real site.

   Deliberately not a nav: it does not use <Nav>'s styling, it is not in the tab order ahead of
   the real header, and it is labelled so nobody mistakes it for product chrome. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ROUTES: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/download", label: "Get started" },
  { href: "/security", label: "Security" },
  { href: "/incidents", label: "Incidents" },
  { href: "/agents", label: "Agents" },
];

export function PreviewBar() {
  const [local, setLocal] = useState(false);
  const raw = usePathname() || "/";
  const path = raw.length > 1 ? raw.replace(/\/$/, "") : raw;

  useEffect(() => {
    const h = window.location.hostname;
    setLocal(h === "localhost" || h === "127.0.0.1" || h === "::1");
  }, []);

  if (!local) return null;

  return (
    <div
      style={{
        background: "#0d1222",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "7px 14px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {ROUTES.map((r) => {
          const active = path === r.href;
          return (
            <Link
              key={r.href}
              href={r.href}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                lineHeight: 1.6,
                textDecoration: "none",
                color: active ? "#fff" : "#9aa6bd",
                background: active ? "var(--accent, #635bff)" : "transparent",
              }}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      <span
        style={{
          marginLeft: "auto",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          fontSize: 11,
          color: "#5b6b85",
          whiteSpace: "nowrap",
        }}
      >
        local preview · not shipped · this bar never renders off localhost
      </span>
    </div>
  );
}
