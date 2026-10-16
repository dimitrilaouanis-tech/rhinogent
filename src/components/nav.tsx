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
  /* SUBMENU. One card for the whole bar — it slides and resizes between the items that carry
     a menu instead of each item owning a panel that fades. Everything about how it moves
     lives in globals.css under THE DROPDOWN MENUS; the geometry is measured here.
     Only two items carry one — acquire does the same, four of its seven are plain links. A
     submenu on an item with nothing beneath it is a drawer that opens onto a wall.
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

/* Which items carry a menu, in bar order. All of their sheets are mounted at all times so the
   card can be told the height it is growing into before anything opens. */
const SUBS: { i: number; sub: SubLink[] }[] = links
  .map((l, i) => ({ i, sub: l.sub }))
  .filter((s): s is { i: number; sub: SubLink[] } => !!s.sub);

/* HOVER INTENT, in two numbers.
   70ms before a COLD open: sweeping the pointer across the bar on the way to the CTA should
   not flash two menus open behind it. 70 is below the threshold where a deliberate hover
   feels like it is waiting, and above the dwell time of a pointer that is merely passing.
   0ms to SWITCH: once a menu is open you are inside the control, and making you wait again
   to move one item sideways is the single most annoying thing a nav can do.
   170ms of grace on the way out: a pointer leaving the card rarely leaves it cleanly — it
   clips a corner on the way to the page — and a menu that dies on the first pixel outside
   itself cannot be used with a trackpad. */
const OPEN_DELAY = 70;
const CLOSE_GRACE = 170;
/* The card's width used to be this constant, matched by hand to a 30rem rule in globals.css.
   That is what made the menu disproportionate: 480px of card under a 410px bar, and the same
   480 for the menu with four long descriptions as for the one with four short ones. The width
   is measured per menu now (see measureSheets) and this is only the floor a one-line menu can
   never go below — the same 15rem min-width .nav-sheet carries, so the two cannot disagree. */
const PANEL_MIN = 240;

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
     are on, which is what a plain hover highlight gets wrong.

     THE DURATION IS THE DISTANCE. A fixed duration makes a one-item hop feel sluggish and a
     four-item sweep feel frantic, because the pill's speed changes by 4× while the clock
     does not. So it is computed from how far the pill actually has to go — 240ms for a
     neighbour, up to 520ms for the full width of the bar — which keeps the apparent speed
     roughly constant and is why it reads as a physical object rather than a timer. */
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flyRef = useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = useState<{ x: number; w: number; on: boolean; dur: number }>({
    x: 0, w: 0, on: false, dur: 380,
  });
  const lastX = useRef(0);
  /* THE PILL ANIMATES FOR YOU, AND NEVER FOR THE LAYOUT. Two attempts at this were wrong
     before the right rule turned up, and the wrong ones are worth recording:

       v1 transitioned every change. Measured on the live site: a cold load reads the bar in
          the fallback font, where Security is 73px wide at x=736; the real font lands and the
          same item is at x=625. So the pill GLIDED 111px sideways, by itself, about a second
          into every first visit.
       v2 suppressed the transition for one frame after mount. Wrong frame — it was long over
          by the time the font arrived.
       v3 suppressed it until document.fonts.ready. Also wrong, and this one is a trap worth
          knowing: fonts.ready resolves when nothing is CURRENTLY loading, so with the font
          request stalled it resolves BEFORE the request has even started. Measured again on
          production with the font held back 500ms: the pill appeared at the pre-font position
          and then travelled anyway.

     The rule that is actually right has nothing to do with timing. A travel animation means
     "you moved me". A font landing, a resize, a re-measure: those are the layout moving, and
     the pill should move with it the way the text does — in the same frame, with no
     transition, because nothing happened. So `glide` is turned on by the pointer and the
     keyboard, and off by anything that merely re-measures. */
  const [glide, setGlide] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  /* ── THE MENU STATE ──────────────────────────────────────────────────────────────────
     The menu is state, not `:hover`. It has to be: hover intent, a grace period and an
     instant switch are three different answers to the same pointer event, and CSS only
     knows the one. `open` is the item whose sheet is showing, `dir` is which way the card
     travelled to get there (+1 right, −1 left) so the incoming rows can come in from the
     side the pointer came from, and `morph` says whether this was a switch or a cold open,
     which is what picks between the two choreographies in globals.css. */
  const [open, setOpen] = useState<number | null>(null);
  const [dir, setDir] = useState(1);
  const [morph, setMorph] = useState(false);
  const openRef = useRef<number | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [fly, setFly] = useState<{ x: number; w: number; caret: number; h: number }>({ x: 0, w: PANEL_MIN, caret: 120, h: 0 });

  const clearTimers = () => {
    if (openTimer.current !== null) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current !== null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  const openNow = (i: number | null) => {
    clearTimers();
    const prev = openRef.current;
    if (prev === i) return;
    // a switch between two open menus gets the sideways cascade; a cold open gets the drop
    if (prev !== null && i !== null) { setDir(i > prev ? 1 : -1); setMorph(true); }
    else if (i !== null) setMorph(false);
    openRef.current = i;
    setOpen(i);
  };

  const onItemEnter = (i: number) => {
    setGlide(true); // a pointer moved: this one travels
    setHover(i);
    clearTimers();
    if (!links[i].sub) {
      // an item with no menu closes the open one, but only after the grace period, so
      // crossing Agents on the way from Security to Download does not shut the card
      closeTimer.current = window.setTimeout(() => openNow(null), CLOSE_GRACE);
      return;
    }
    if (openRef.current !== null) { openNow(i); return; } // already inside: switch at once
    openTimer.current = window.setTimeout(() => openNow(i), OPEN_DELAY); // cold: ask for intent
  };

  // the one way the menu goes away, wherever the dismissal came from: pointer, Escape,
  // focus leaving the bar, or a navigation landing underneath it
  const dismiss = () => { setGlide(true); openNow(null); setHover(null); };

  const onListLeave = () => {
    setGlide(true); // the pill glides home to the active item
    setHover(null);
    clearTimers();
    closeTimer.current = window.setTimeout(() => openNow(null), CLOSE_GRACE);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // never leave a timer behind, and never leave a menu open across a navigation
  useEffect(() => clearTimers, []);
  /* No route-change effect. Every link in the bar is a plain anchor, so a navigation from
     inside the menu remounts this component outright; the only client-side navigations are
     the logo and the CTA, and reaching either one takes the pointer out of the list, which
     already dismisses. An effect here would be a second closing path for a case the first
     one has already handled — and two ways to close one menu is how a menu starts flickering. */

  const activeIdx = links.findIndex(
    (l) => !l.external && !l.href.includes("#") && (pathname === l.href || pathname.startsWith(l.href + "/")),
  );

  /* Every sheet's own size, measured once the DOM is up and again whenever the font or the
     window changes. Both dimensions are animated and you cannot animate to `auto`, so both
     have to be real px — and they have to come from the SHEET, which is max-content and
     absolutely positioned, not from the card, whose width is the thing being decided. */
  const sheetRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sheetH = useRef<Record<number, number>>({});
  const sheetW = useRef<Record<number, number>>({});
  const measureSheets = () => {
    for (const { i } of SUBS) {
      const el = sheetRefs.current[i];
      if (!el) continue;
      sheetH.current[i] = el.offsetHeight;
      sheetW.current[i] = Math.max(PANEL_MIN, Math.ceil(el.offsetWidth));
    }
  };

  const measure = () => {
    const list = listRef.current;
    if (!list) return;
    const b = list.getBoundingClientRect();

    // the pill: hovered item, else the open one, else the page you are on
    const pi = hover ?? open ?? (activeIdx >= 0 ? activeIdx : null);
    const pe = pi === null ? null : itemRefs.current[pi];
    if (pe) {
      const a = pe.getBoundingClientRect();
      const x = a.left - b.left;
      const d = Math.abs(x - lastX.current);
      lastX.current = x;
      setPill({ x, w: a.width, on: true, dur: Math.round(Math.min(520, Math.max(240, 210 + d * 0.55))) });
    } else {
      setPill((v) => ({ ...v, on: false }));
    }

    // the card: centred under the open item, clamped into the viewport, caret on the item
    const oi = open;
    const oe = oi === null ? null : itemRefs.current[oi];
    if (oe && oi !== null) {
      const a = oe.getBoundingClientRect();
      const centre = a.left - b.left + a.width / 2;
      // this menu's own width, so the clamp and the centring are done against the card that is
      // actually about to be there rather than against the widest one any menu might need
      const w = sheetW.current[oi] ?? PANEL_MIN;
      const min = 12 - b.left;
      const max = window.innerWidth - 12 - w - b.left;
      const x = Math.min(Math.max(centre - w / 2, min), Math.max(min, max));
      setFly({ x, w, caret: centre - x, h: sheetH.current[oi] ?? 0 });
    }
  };

  // useLayoutEffect so the pill is already in place on the first painted frame rather than
  // sliding in from x=0 the moment the page appears.
  useLayoutEffect(() => {
    /* The re-measure path is refreshed here rather than during render, because `measure`
       closes over exactly these four values and this effect already runs when any of them
       changes. setGlide(false) goes BEFORE the measurement, in the same batch: React commits
       both in one pass, so the frame carrying the new geometry also carries the flat
       transition and the pill lands rather than travels. Reversed, you get one frame of the
       old transition against the new numbers — which is the glide back again. */
    reRef.current = () => { setGlide(false); measureSheets(); measure(); };
    measureSheets();
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, open, activeIdx, pathname]);

  /* The re-measure path, held in a ref and subscribed ONCE.
     This is the bug that ate the pill. The subscription used to live in an effect keyed on
     [hover, open, activeIdx], so every pointer move tore the ResizeObserver down and built a
     new one — and a fresh observe() fires its callback immediately, by design. That callback
     is the one that disarms the glide, so it landed in the very same frame as the hover it
     was supposed to animate. Measured on production: the pill moved through exactly ONE
     position, i.e. it teleported, in both motion modes. A mount-once subscription reading the
     latest measure through a ref is the whole fix; the observer's one initial notification
     now happens at mount, where there is nothing to animate anyway. */
  const reRef = useRef<() => void>(() => {});

  useEffect(() => {
    const re = () => reRef.current();
    window.addEventListener("resize", re);
    /* A ResizeObserver on the list, not just document.fonts.ready, and that is the lesson
       from v3 above: fonts.ready can resolve before the font has been requested, but the bar
       CHANGING WIDTH is the event itself and cannot be early. Every width in here depends on
       the font, so the observer catches the swap, a zoom, and a container change with one
       subscription. fonts.ready stays as well — it costs nothing and covers a font that
       somehow lands without resizing the list. */
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && listRef.current) {
      ro = new ResizeObserver(re);
      ro.observe(listRef.current);
      for (const el of itemRefs.current) if (el) ro.observe(el);
    }
    if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(re).catch(() => {});
    return () => { window.removeEventListener("resize", re); ro?.disconnect(); };
  }, []);

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
            onMouseLeave={onListLeave}
            onKeyDown={(e) => { if (e.key === "Escape") dismiss(); }}
            onBlur={(e) => {
              // focus left the whole bar — not merely moved between two things inside it
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) openNow(null);
            }}
            className="relative hidden items-center gap-0.5 lg:flex"
          >
            {/* the pill, under the labels. aria-hidden: it is the same information the
                aria-current on the active link already carries, said in pixels. */}
            <span
              aria-hidden
              /* nav-pill exists so globals.css can overrule the inline transition below under
                 prefers-reduced-motion — an inline style otherwise wins over any rule. */
              className="nav-pill pointer-events-none absolute left-0 top-1/2 -z-0 h-[30px] -translate-y-1/2 rounded-full bg-accent/[.09] ring-1 ring-inset ring-accent/15"
              style={{
                width: pill.w,
                transform: `translate3d(${pill.x}px, -50%, 0)`,
                // w > 0 because a zero-width ring is a 2px dot, and the bar is briefly
                // measurable before it is laid out
                opacity: pill.on && pill.w > 0 ? 1 : 0,
                transition: glide
                  ? `transform ${pill.dur}ms var(--spring), width ${pill.dur}ms var(--spring), opacity 200ms ease`
                  : "opacity 200ms ease",
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
                  aria-expanded={l.sub ? open === li : undefined}
                  onFocus={() => (l.sub ? openNow(li) : openNow(null))}
                  onKeyDown={(e) => {
                    // ArrowDown walks into the menu, which is the one keyboard gesture every
                    // menu is expected to answer. The card is a sibling of the triggers now,
                    // so without this it is only reachable past the last item in the bar.
                    if (!l.sub || e.key !== "ArrowDown") return;
                    e.preventDefault();
                    openNow(li);
                    window.setTimeout(() => {
                      flyRef.current?.querySelector<HTMLAnchorElement>(".nav-sheet[data-on] .nav-row")?.focus();
                    }, 0);
                  }}
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
                 The wrapper no longer CONTAINS a panel — there is one card for the bar, below
                 — so all it carries is the measurement and the open flag the chevron reads. */
              return (
                <div
                  key={l.href}
                  ref={(el) => { itemRefs.current[li] = el; }}
                  onMouseEnter={() => onItemEnter(li)}
                  data-open={open === li ? "" : undefined}
                  className="nav-item"
                >
                  {item}
                </div>
              );
            })}

            {/* THE ONE CARD. A child of the list, so moving from an item into the card never
                fires the list's mouseleave; absolutely positioned, so it slides between the
                items that own it instead of being torn down and rebuilt. Every sheet stays
                mounted — their measured heights are what the card grows into. */}
            <div
              ref={flyRef}
              className="nav-flyout"
              data-on={open !== null ? "" : undefined}
              data-morph={morph ? "" : undefined}
              aria-hidden={open === null}
              style={{
                transform: `translate3d(${fly.x}px, 0, 0)`,
                "--caret-x": `${fly.caret}px`,
                "--sheet-w": `${fly.w}px`,
                "--nav-dir": String(dir),
              } as CSSProperties}
            >
              <div className="nav-sheetbox" style={fly.h ? { height: `${fly.h}px` } : undefined}>
                {SUBS.map(({ i, sub }) => (
                  <div
                    key={i}
                    ref={(el) => { sheetRefs.current[i] = el; }}
                    className="nav-sheet"
                    data-on={open === i ? "" : undefined}
                    aria-hidden={open !== i}
                    aria-label={links[i].label}
                  >
                    {sub.map((sl, j) => (
                      <a
                        key={sl.href}
                        href={sl.href}
                        className="nav-row"
                        tabIndex={open === i ? 0 : -1}
                        style={{ "--nav-i": String(j) } as CSSProperties}
                      >
                        <p className="nav-row-h">{sl.label}</p>
                        <p className="nav-row-p">{sl.desc}</p>
                        <span className="nav-row-arrow" aria-hidden>&rarr;</span>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </div>
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
