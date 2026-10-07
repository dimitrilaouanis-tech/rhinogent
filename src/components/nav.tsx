"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RhinoA1Mark } from "./rhino-a1";
import { supabase } from "@/lib/supabase";
import { AccountMenu } from "./account-menu";

// ONE top nav for every page (design-approved): the 7 inner pages + 0n1x.
/* Four items, down from eight. Chat, Verify, Developers and the 0n1x cross-link came out:
   the first three are destinations you reach from inside the product or from a CTA, not
   things a first-time visitor is choosing between, and the cross-link sent people off the
   site from the top-level nav. The routes all still exist and are still linked in context —
   only the menu entries are gone. */
/* `external` is declared even though nothing sets it today — the 0n1x cross-link was the only
   one, and the rendering code below still handles the case. Typing it keeps that path alive
   for the next off-site link instead of deleting working behaviour to satisfy inference. */
type NavLink = { href: string; label: string; external?: boolean };

// Every item is its own page. Menu links were briefly in-page anchors; clicking one dropped
// you back onto the landing page mid-scroll, which is disorienting and makes the nav feel like
// a table of contents rather than a map of the product.
//
// Six flat items. Both scrapes found nav size splits by AUDIENCE, not category, and splits
// hard: consumer products run 2-3 items (phantom 2, rainbow 3) and enterprise platforms run
// mega-menus (auth0 69, fireblocks 28, coinbase 25). Nothing sits in the middle by accident,
// so 6 is a choice: enough to show there are surfaces, few enough to read in one pass.
const links: NavLink[] = [
  // Home is spelled out as well as being the logo. The logo-is-home convention assumes a
  // visitor who already knows the convention, and it costs one word to not assume it.
  // The active test below is pathname === href || pathname.startsWith(href + "/"), which stays
  // correct for "/" -- the second half becomes startsWith("//") and never matches.
  { href: "/", label: "Home" },
  { href: "/download", label: "Get started" },
  // SECURITY IN THE NAV, and that position is the argument. The 2026-10-05 custody scrape split
  // 43 sites cleanly: a named Security item appears in 8 navs and every one of them is a custody
  // product (safe.global and litprotocol at #1, dynamic at #4, trustwallet at #7; turnkey calls
  // its version "Verifiable Cloud"). Across the 12 generic auth/SaaS platforms in the same set
  // the count is ZERO -- they all push it to /security plus a trust.* subdomain. For a
  // self-custody product the nav is the first custody claim.
  { href: "/security", label: "Security" },
  { href: "/agents", label: "Agents" },
  // Last, and the only item that opens nothing — the shape 13 of 16 comparable sites use.
  { href: "/pricing", label: "Pricing" },
];

export function Nav() {
  const raw = usePathname() || "/";
  const pathname = raw.length > 1 ? raw.replace(/\/$/, "") : raw; // trailingSlash export
  // auth-aware: reflect the persisted Supabase session consistently on every page
  const [authed, setAuthed] = useState<boolean | null>(null);
  // condense: stronger border + shadow once the page scrolls past 24px
  const [scrolled, setScrolled] = useState(false);
  // mobile menu (no nav links show on phones otherwise — critical for phone use)
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="h-px w-full hairline opacity-60" />
      <div
        className={`border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled
            ? "border-[rgba(17,17,26,.08)] bg-background/85 shadow-[0_1px_2px_rgba(17,17,26,.05),0_8px_24px_-12px_rgba(17,17,26,.12)]"
            : "border-border/40 bg-background/70"
        }`}
      >
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 md:h-16">
          <Link href="/" className="group flex items-center gap-2.5">
            <RhinoA1Mark className="h-8 w-8 transition-transform duration-300 group-hover:scale-[1.04]" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Rhinogent</span>
          </Link>

          <div className="hidden items-center gap-0.5 lg:flex">
            {links.map((l) => {
              const active = !l.external && !l.href.includes("#") && (pathname === l.href || pathname.startsWith(l.href + "/"));
              return (
                <a
                  key={l.href}
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-current={active ? "page" : undefined}
                  className={`group relative rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150 ${
                    active ? "text-foreground" : "text-muted hover:bg-accent/[.06] hover:text-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-accent/[.08] ring-1 ring-inset ring-accent/20" aria-hidden />
                  )}
                  <span className="relative">{l.label}</span>
                  {l.external && (
                    <span className="relative ml-0.5 text-[10px] opacity-50" aria-hidden>↗</span>
                  )}
                  <span
                    className={`absolute bottom-0.5 left-1/2 h-px -translate-x-1/2 bg-accent transition-all duration-300 ${
                      active ? "w-0" : "w-0 group-hover:w-[60%]"
                    }`}
                    aria-hidden
                  />
                </a>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="lg:hidden rounded-lg border border-border p-2 text-muted transition-colors hover:text-foreground"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
              </svg>
            </button>
            {authed === null ? (
              // resolving — hold space so the bar doesn't flicker layout
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-2" aria-hidden />
            ) : authed ? (
              <AccountMenu />
            ) : (
              <>
                {/* Ghost sign-in drops on phones; the filled CTA never does. The filled one is
                    the NO-ACCOUNT door on purpose: an account is for syncing agents across web,
                    phone and desktop, and asking for it before someone has an agent is asking
                    them to pay a cost before they have seen the thing it buys. */}
                <Link
                  href="/dashboard/classic"
                  className="hidden rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-foreground sm:block"
                >
                  Sign in
                </Link>
                <Link
                  href="/chat"
                  className="btn-grad rounded-full px-4 py-2 text-[13px] font-semibold text-white"
                >
                  Chat with Rhinogent
                </Link>
              </>
            )}
          </div>
        </nav>
        {menuOpen && (
          <div className="motion-safe:animate-rise lg:hidden border-t border-border/40 bg-background/95 px-5 pb-3 pt-2 shadow-[0_12px_24px_-16px_rgba(17,17,26,.18)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {links.map((l) => {
                const active = !l.external && !l.href.includes("#") && (pathname === l.href || pathname.startsWith(l.href + "/"));
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
                      active
                        ? "bg-accent/[.08] font-medium text-foreground ring-1 ring-inset ring-accent/20"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    <span>{l.label}</span>
                    {l.external && <span className="text-[10px] opacity-50" aria-hidden>↗</span>}
                  </a>
                );
              })}
              {authed && (
                <button
                  onClick={() => { supabase.auth.signOut(); setMenuOpen(false); }}
                  className="mt-1 rounded-lg border border-border px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
