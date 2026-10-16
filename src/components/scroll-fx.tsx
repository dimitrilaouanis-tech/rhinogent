"use client";

/* ScrollFx — the site-wide scroll feel. Mounted once in the root layout, so it covers
   every route rather than the landing page alone.
   ─────────────────────────────────────────────────────────────────────────────────────────
   WHY THIS EXISTS. The reveal-on-scroll pass only ever ran on `/` — it needed `.rv` written
   onto each element by hand plus <FxObserver/> mounted on the page. Every other route (/start,
   /download, /security, /agents) therefore had no scroll behaviour at all: blocks were simply
   there, fully painted, the moment the route rendered. That is the "no nice scroll" the whole
   site was called out for, and it could not be fixed by adding classes to five more files
   without the same thing happening to the sixth.

   WHAT IT DOES, measured off acquire.com's stylesheet rather than guessed at:
     · entrance   opacity + a short rise, `transform .5s ease, opacity .5s ease` there; we use
                  0.62s on cubic-bezier(.16,1,.3,1) to match the curve already in globals.css
     · stagger    cards inside a grid come in one after another, 55ms apart, instead of the
                  whole band flipping at once
     · progress   a hairline across the top that tracks how far down the document you are
     · press      see globals.css — `:active` squash on buttons and cards, the thing that makes
                  clicking feel like it landed
   There is no smooth-scroll hijack (no Lenis, no Locomotive, no ScrollSmoother). acquire.com
   ships none of those either — checked its bundle, it carries one IntersectionObserver at
   threshold .2 and does the rest in CSS. Overriding the wheel would also break the scroll-snap
   carousels in rail.tsx and every in-page anchor, which is a bad trade for inertia.

   FAIL-OPEN, AND THE REASON IT HAS TO BE. A reveal gate has stranded this site below the hero
   in production twice. So: nothing is hidden by a stylesheet. The `data-rvx` attribute that
   hides a block is written by this file, from JS, in the same synchronous pass that starts
   observing it — if the script never runs, never parses, or throws, every block stays visible.
   The watchdog below covers the one case that survives that: the script runs, hides things, and
   then the observer never fires. If nothing at all has been revealed after 2.5s we conclude the
   observer is dead and un-hide the document wholesale. */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STAGGER_MS = 55;
const MAX_STAGGER = 8; // past this a grid reads as a queue, not an entrance

export function ScrollFx() {
  const pathname = usePathname();

  // ── reveal ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    let revealed = 0;
    let revealedCandidates = 0; // `.rv` elements we took on — hidden by the stylesheet, not by us
    const tagged: Element[] = [];

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-rvx-in", "");
          // also drive the landing page's hand-placed `.rv` vocabulary, so this one observer
          // is a superset of <FxObserver/>. That closes the regression that shipped twice: an
          // `.rv` element on a page whose author forgot to mount the observer stayed invisible.
          if (e.target.classList.contains("rv")) e.target.classList.add("in");
          if (e.target.classList.contains("verify-card")) e.target.classList.add("play");
          revealed++;
          io.unobserve(e.target);
        }
      },
      // threshold 0.12 rather than acquire's 0.2: our bands are taller than theirs, and a
      // fifth of a full-height band is most of the way up the screen before it starts.
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    const hide = (el: Element, i: number) => {
      if (el.hasAttribute("data-rvx") || el.classList.contains("rv")) return;
      (el as HTMLElement).style.setProperty("--d", `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms`);
      el.setAttribute("data-rvx", "");
      tagged.push(el);
      io.observe(el); // same pass as the hide, so the two can never come apart
    };

    try {
      const main = document.querySelector("main");
      if (!main) return;

      // Pages that already hand-place `.rv` (the landing page) keep their own choreography —
      // we only take over the ones with none, so the two systems never fight over an element.
      const handPlaced = main.querySelectorAll(".rv").length;

      if (handPlaced < 3) {
        let n = 0;
        for (const block of Array.from(main.children)) {
          if (block.hasAttribute("data-no-rvx")) continue;
          // A grid of cards reveals card by card; anything else reveals as one block. Tagging
          // the grid AND its cards would nest one fade inside another, which looks broken.
          const grid =
            block.classList.contains("grid")
              ? block
              : block.children.length === 1 && block.firstElementChild?.classList.contains("grid")
                ? block.firstElementChild
                : null;
          const cards = grid ? Array.from(grid.children) : [];
          if (cards.length >= 3 && cards.length <= 12) {
            cards.forEach((c, i) => hide(c, i));
          } else {
            hide(block, 0);
          }
          n++;
          if (n > 60) break; // a page with more top-level blocks than this is not a page
        }
      }

      // the landing page's own elements, so /# keeps working if <FxObserver/> ever comes out
      for (const el of Array.from(main.querySelectorAll<HTMLElement>(".rv:not(.in), .verify-card:not(.play)"))) {
        io.observe(el);
        revealedCandidates++;
      }
    } catch {
      // tagging blew up midway — un-hide whatever got touched and leave the page alone
      for (const el of tagged) el.removeAttribute("data-rvx");
      io.disconnect();
      return;
    }

    // THE WATCHDOG. Covers exactly one failure: we hid blocks and the observer never fired.
    const watchdog = window.setTimeout(() => {
      if (revealed === 0 && tagged.length + revealedCandidates > 0) {
        document.documentElement.setAttribute("data-rvx-off", "");
      }
    }, 2500);

    return () => {
      window.clearTimeout(watchdog);
      io.disconnect();
      // route change: release everything this run hid, so a block can never be left faded out
      for (const el of tagged) {
        el.removeAttribute("data-rvx");
        el.removeAttribute("data-rvx-in");
      }
    };
  }, [pathname]);

  // ── progress hairline ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bar = document.getElementById("rvx-progress");
    if (!bar) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 40 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      bar.style.transform = `scaleX(${p})`;
      bar.style.opacity = p > 0.004 ? "1" : "0";
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  /* ── the card spotlight ────────────────────────────────────────────────────────────────
     Feeds --mx/--my to whichever card the pointer is inside; globals.css does the rest under
     THE SPOTLIGHT ON A CARD. Three things make this cheap enough to run on pointermove:

       · ONE delegated listener on the document, not one per card. There are over a hundred
         card-shaped links on some of these routes.
       · rAF-coalesced. pointermove fires faster than the compositor paints, so the handler
         stores the event and one frame later writes two custom properties. Writing them per
         event is how a hover effect starts costing frames.
       · the same selector string as the stylesheet, declared once below, because a spotlight
         that tracks on a card the CSS does not light is a listener burning battery.

     Gated on (hover: hover) and (pointer: fine) to match the CSS exactly — a touch screen
     latches :hover after a tap, and a spotlight frozen where your finger last was is worse
     than no spotlight. Gated on reduced motion for the same reason the sweep is: a gradient
     chasing the cursor is motion, and it is the decorative kind. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;

    let frame = 0;
    let last: { el: HTMLElement; x: number; y: number } | null = null;
    const paint = () => {
      frame = 0;
      if (!last) return;
      const r = last.el.getBoundingClientRect();
      last.el.style.setProperty("--mx", `${last.x - r.left}px`);
      last.el.style.setProperty("--my", `${last.y - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const el = t?.closest?.(SPOT_SELECTOR) as HTMLElement | null;
      if (!el) return;
      last = { el, x: e.clientX, y: e.clientY };
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}

/* The one place this selector is written down besides globals.css. If the two ever disagree,
   the symptom is a card that lights nothing or a listener that fires for nothing. */
const SPOT_SELECTOR =
  'main a[class*="border-border"][class*="rounded-"],' +
  'main button[class*="border-border"][class*="rounded-"],' +
  'main a[class*="border-dashed"][class*="rounded-"]';

/** The element ScrollFx drives. Rendered from the layout so it exists before the effect runs. */
export function ScrollProgress() {
  return (
    <div
      id="rvx-progress"
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[2px] w-full origin-left bg-gradient-to-r from-accent/60 via-accent to-cyber opacity-0 transition-opacity duration-300"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
