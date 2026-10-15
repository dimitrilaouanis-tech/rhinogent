"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
type SubLink = { href: string; label: string; desc: string };
type NavLink = { href: string; label: string; external?: boolean; sub?: SubLink[] };

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
  /* SUBMENU, acquire.com's shape: the panel fades in under the item, the chevron turns
     180deg, and each row is a card that warms on hover. Only two items carry one — acquire
     does the same, four of its seven are plain links. A submenu on an item with nothing
     beneath it is a drawer that opens onto a wall.
     Every href below is an anchor that EXISTS in the built HTML (ids web/cli/phone/companion
     on /start, web/cli/phone/desktop on /download) — checked against out/, not assumed. */
  {
    href: "/start",
    label: "Get started",
    sub: [
      { href: "/start/#web", label: "In the browser", desc: "Nothing to install. The key is made in your browser and stays there." },
      { href: "/start/#cli", label: "In the terminal", desc: "One npm command. Node 18 or newer, nothing else." },
      { href: "/start/#companion", label: "The desktop IDE", desc: "An editor your agent works inside, next to you." },
      { href: "/start/#phone", label: "On your phone", desc: "The whole desk — jobs, approvals, the record." },
    ],
  },
  // SECURITY IN THE NAV, and that position is the argument. The 2026-10-05 custody scrape split
  // 43 sites cleanly: a named Security item appears in 8 navs and every one of them is a custody
  // product (safe.global and litprotocol at #1, dynamic at #4, trustwallet at #7; turnkey calls
  // its version "Verifiable Cloud"). Across the 12 generic auth/SaaS platforms in the same set
  // the count is ZERO -- they all push it to /security plus a trust.* subdomain. For a
  // self-custody product the nav is the first custody claim.
  { href: "/security", label: "Security" },
  { href: "/agents", label: "Agents" },
  // Last, and the only item that is purely files — the shape 11 of 15 comparable
  // products use for exactly this page.
  {
    href: "/download",
    label: "Download",
    sub: [
      { href: "/download/#web", label: "Web", desc: "Live. Nothing to install." },
      { href: "/download/#cli", label: "Terminal", desc: "On npm. MIT, 8.2 kB, one dependency." },
      { href: "/download/#phone", label: "Phone", desc: "Paused — the build is there, the store listing is not." },
      { href: "/download/#desktop", label: "Desktop", desc: "In development. No installer yet." },
    ],
  },
  // Last, and the only item that opens nothing — the shape 13 of 16 comparable sites use.
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

  /* ── THE SLIDING INDICATOR ────────────────────────────────────────────────────────────
     ONE pill that travels between items, instead of a hover background on each of them.
     This is the pattern every nav worth copying uses, and the reason is not decoration:
     with per-item backgrounds, moving across five links paints five separate fades and the
     bar reads as five things. With one pill the eye tracks a single object and the bar
     reads as one control with a position in it.

     It is measured, not guessed — getBoundingClientRect on the item and on the container,
     so the pill is correct whatever the font does at whatever width. It re-measures on
     resize, on route change, and once document.fonts settles, because a web font landing
     after first paint changes every one of these widths.

     RESTING POSITION IS THE ACTIVE ITEM. The pill follows the pointer and glides back to
     where you are when the pointer leaves — so the bar never loses track of which page you
     are on, which is what a plain hover highlight gets wrong. */
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pill, setPill] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeIdx = links.findIndex(
    (l) => !l.external && !l.href.includes("#") && (pathname === l.href || pathname.startsWith(l.href + "/")),
  );

  const measure = (i: number | null) => {
    const list = listRef.current;
    const el = i === null ? null : itemRefs.current[i];
    if (!list || !el) return setPill((v) => ({ ...v, on: false }));
    const a = el.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    setPill({ x: a.left - b.left, w: a.width, on: true });
  };

  // useLayoutEffect so the pill is already in place on the first painted frame rather than
  // sliding in from x=0 the moment the page appears.
  useLayoutEffect(() => {
    measure(hover ?? (activeIdx >= 0 ? activeIdx : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, activeIdx, pathname]);

  useEffect(() => {
    const re = () => measure(hover ?? (activeIdx >= 0 ? activeIdx : null));
    window.addEventListener("resize", re);
    // a font landing after first paint changes every width in the bar
    if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(re).catch(() => {});
    return () => window.removeEventListener("resize", re);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, activeIdx]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      {/* FIXED, NOT STICKY, and the spacer below is the reason. A sticky header sits in normal
          flow, so condensing it from 66px to 56px on scroll shrank the document by 10px and
          threw every element on the page up by the same 10 — measured: the h1 on /start moved
          from 153 to 143 and the document from 4926px to 4916px the instant the bar changed,
          then back down when you returned to the top. That jump is what "there is movement in
          the website when I scroll" was. Out of flow, the bar can resize as much as it likes
          and nothing below it moves. acquire.com's header is fixed for the same reason. */}
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="h-px w-full hairline opacity-60" />
      <div
        className={`border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled
            ? "border-[rgba(17,17,26,.08)] bg-background/85 shadow-[0_1px_2px_rgba(17,17,26,.05),0_8px_24px_-12px_rgba(17,17,26,.12)]"
            : "border-border/40 bg-background/70"
        }`}
      >
        {/* The bar CONDENSES as you scroll — acquire.com runs the same move, with
            `transition: height .2s ease` on its header container. It is the cheapest signal a
            page can give that it is scrolling: the chrome gets out of the content's way. */}
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 transition-[height] duration-200 ease-out ${
            scrolled ? "h-12 md:h-[54px]" : "h-14 md:h-16"
          }`}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <RhinoA1Mark className="h-8 w-8 transition-transform duration-300 group-hover:scale-[1.04]" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Rhinogent</span>
          </Link>

          <div
            ref={listRef}
            onMouseLeave={() => setHover(null)}
            className="relative hidden items-center gap-0.5 lg:flex"
          >
            {/* the pill, under the labels. aria-hidden: it is the same information the
                aria-current on the active link already carries, said in pixels. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 -z-0 h-[30px] -translate-y-1/2 rounded-full bg-accent/[.09] ring-1 ring-inset ring-accent/15"
              style={{
                width: pill.w,
                transform: `translate3d(${pill.x}px, -50%, 0)`,
                opacity: pill.on ? 1 : 0,
                transition:
                  "transform 380ms var(--spring), width 380ms var(--spring), opacity 200ms ease",
              }}
            />
            {links.map((l, li) => {
              const active = !l.external && !l.href.includes("#") && (pathname === l.href || pathname.startsWith(l.href + "/"));
              const item = (
                <a
                  key={l.href}
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-current={active ? "page" : undefined}
                  aria-haspopup={l.sub ? "true" : undefined}
                  className={`nav-trigger group relative z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150 ${
                    active ? "text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className="relative">{l.label}</span>
                  {l.external && (
                    <span className="relative ml-0.5 text-[10px] opacity-50" aria-hidden>↗</span>
                  )}
                  {l.sub && (
                    <svg
                      className="nav-chev relative h-3 w-3 opacity-50"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </a>
              );

              /* UNIFORM WRAPPER, submenu or not. The indicator needs one measurable element
                 per link, and a ragged structure is how an off-by-one in a ref array happens.
                 .nav-item only does something when there is a .nav-panel inside it. */

              /* The pt-3 on the panel is a HOVER BRIDGE, not decoration: without a padded gap
                 the pointer crosses dead space between the item and the panel and the menu
                 shuts under the cursor. acquire.com pads its submenu the same way. */
              return (
                <div
                  key={l.href}
                  ref={(el) => { itemRefs.current[li] = el; }}
                  onMouseEnter={() => setHover(li)}
                  onFocus={() => setHover(li)}
                  className="nav-item"
                >
                  {item}
                  {!l.sub ? null : (
                  <>
                  {/* Everything about how this opens lives in globals.css under THE DROPDOWN
                      MENUS — the spring, the caret, the cascade and the fast close. The only
                      thing the component contributes is each row's place in the queue. */}
                  <div data-submenu={l.label} className="nav-panel">
                    <div className="nav-card">
                      {l.sub.map((sl, j) => (
                        <a
                          key={sl.href}
                          href={sl.href}
                          className="nav-row"
                          style={{ "--nav-d": `${60 + j * 42}ms` } as CSSProperties}
                        >
                          <p className="nav-row-h">{sl.label}</p>
                          <p className="nav-row-p">{sl.desc}</p>
                          <span className="nav-row-arrow" aria-hidden>&rarr;</span>
                        </a>
                      ))}
                    </div>
                  </div>
                  </>
                  )}
                </div>
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
              {links.map((l, i) => {
                const active = !l.external && !l.href.includes("#") && (pathname === l.href || pathname.startsWith(l.href + "/"));
                return (
                  <div key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className={`motion-safe:animate-rise flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
                        active
                          ? "bg-accent/[.08] font-medium text-foreground ring-1 ring-inset ring-accent/20"
                          : "text-muted hover:bg-surface hover:text-foreground"
                      }`}
                    >
                      <span>{l.label}</span>
                      {l.external && <span className="text-[10px] opacity-50" aria-hidden>↗</span>}
                    </a>
                    {/* On a phone there is no hover, so the submenu is simply OPEN — a drawer
                        that needs a second tap to reveal four short links is worse than four
                        short links. Labels only; the descriptions are desktop-only detail. */}
                    {l.sub && (
                      <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-border pl-3">
                        {l.sub.map((sl, j) => (
                          <a
                            key={sl.href}
                            href={sl.href}
                            onClick={() => setMenuOpen(false)}
                            style={{ animationDelay: `${i * 40 + j * 30 + 40}ms` }}
                            className="motion-safe:animate-rise rounded-lg px-3 py-2 text-[13px] text-muted-2 transition-colors duration-150 hover:bg-surface hover:text-foreground"
                          >
                            {sl.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
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
      {/* holds the bar's RESTING height — 58 on phones, 66 on desktop. Constant on purpose:
          the moment this tracks the condensed height, the jump is back. */}
      <div aria-hidden className="h-[58px] md:h-[66px]" />
    </>
  );
}
