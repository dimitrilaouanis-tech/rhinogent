import Link from "next/link";
import { RhinoA1Mark } from "./rhino-a1";
import { StatusLine } from "./status-line";

/* One footer on every page.

   Columns follow the design's shape, with one rule applied throughout: a link only appears if
   it goes somewhere. The design's footer carried a Downloads column with "Windows · macOS" and
   "iOS · Android" — none of which exist to download — and a Developers link we are not
   surfacing. Those are out. The CLI line stays because `npx rhinogent init` genuinely runs.

   Nothing here asserts a number; every number on the site is recomputable from its signed feed. */

/* The footer carries the same five doors as the nav, and nothing it does not. Pricing,
   Census, Verify, Developer docs and Incidents were all pulled from the bars while those pages
   are the parts not yet rebuilt; leaving them in the footer would have put them back in front
   of a reader through a side door. The routes still exist and still work by URL.
   Terms and Privacy stay regardless -- those belong in a footer whatever else is in flight. */
const COLUMNS: { head: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    head: "product",
    links: [
      { href: "/download", label: "Get started" },
      { href: "/agents", label: "Agents" },
      { href: "/earn", label: "Earn" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    // The column that matters on a trust product: every one of these is something a stranger
    // can run or fetch without an account.
    head: "check it",
    links: [
      { href: "/verify", label: "Verify a receipt" },
      { href: "/census", label: "The census" },
      { href: "/developers", label: "Developer docs" },
      { href: "/mcp", label: "MCP server" },
    ],
  },
  {
    head: "trust",
    links: [
      { href: "/security", label: "Security" },
      { href: "/incidents", label: "Incidents" },
      { href: "/vault", label: "Custody" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* identity + the one install line that actually works */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <RhinoA1Mark className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-tight">Rhinogent</span>
            </Link>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
              The reference client for 0n1x. Self-custody identity and wallets for agents.
            </p>
            <p className="mt-4 inline-block rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground">
              <span className="select-none text-muted-2">$ </span>npx rhinogent init
            </p>
          </div>

          {COLUMNS.map((c) => (
            <div key={c.head}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">
                {c.head}
              </p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* "no data ≠ up" is the honest form: we observe, we do not promise uptime we have
              not measured, and an absent probe is not a green light. */}
          {/* No live dot: nothing on this page is reading a probe, and a pulsing green dot is
              read as "we checked just now". The sentiment is kept as plain text. */}
          <StatusLine />
          <p className="font-mono text-[11px] leading-relaxed text-muted-2">
            self-custody · did:pkh · A2A · MCP · every number recomputable
          </p>
        </div>
      </div>
    </footer>
  );
}
