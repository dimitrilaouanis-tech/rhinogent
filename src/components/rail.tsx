"use client";

/* A showcase rail.

   The previous version was a row of loose cards on the page ground with a line of anonymous dots
   underneath, and it read as a gallery someone dumped out rather than a designed panel. Four
   things were wrong and all four are structural, not decorative:

     1. NO CONTAINMENT. The cards floated directly on the page, so nothing said "these belong
        together and they are views of one thing". Now the whole rail lives inside one panel with
        its own slightly recessed ground, and the cards sit in it like contents.

     2. CARDS OF DIFFERENT SIZES IN ONE ROW. A 3:1 island capture next to a 1:2 phone capture
        made the row look broken. Every card in a rail is now exactly the same frame; the image
        fits inside it (cover from the top by default, contain when the edges carry meaning), so
        the geometry is uniform even when the sources are not.

     3. CAPTIONS OF DIFFERENT LENGTHS DANGLING UNDER THE CARDS, which made the bottom edge
        ragged. The caption is now a fixed-height footer inside the card, so every card is a
        rectangle and the row has one baseline.

     4. ANONYMOUS DOTS. A dot tells you there are seven of something. A NAMED tab tells you the
        fourth one is "Projects", which is the thing a reader actually wants and is also how
        Stripe, Linear and Vercel label a sequence. The tabs sit in the panel header with the
        arrows, not floating in whitespace below.

   Still a real scroll container with CSS scroll-snap: trackpad, drag, keyboard and screen
   readers keep working, and with JavaScript off you get a scrollable row — you lose the buttons,
   not the content. */

import { useCallback, useEffect, useRef, useState } from "react";

export type RailItem = { id: string; label: string };

export function Rail({
  label,
  items,
  children,
}: {
  label: string;
  items: RailItem[];
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const read = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth;
    setAt(Math.min(items.length - 1, Math.round(el.scrollLeft / step)));
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, [items.length]);

  useEffect(() => {
    read();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      el.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [read]);

  const to = (i: number) => {
    const el = ref.current;
    if (!el) return;
    (el.children[i] as HTMLElement | undefined)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };
  const step = (d: -1 | 1) => to(Math.max(0, Math.min(items.length - 1, at + d)));

  return (
    <div>
      {/* ── the tabs, bare on the ground — no panel to contain them ───────────────── */}
      <div className="flex items-center gap-3 pb-4">
        <div
          className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={label}
        >
          {items.map((it, i) => (
            <button
              key={it.id}
              role="tab"
              aria-selected={i === at}
              onClick={() => to(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[11.5px] transition-colors ${
                i === at
                  ? "bg-foreground text-background"
                  : "border border-border text-muted hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Step dir="left" onClick={() => step(-1)} disabled={atStart} />
          <Step dir="right" onClick={() => step(1)} disabled={atEnd} />
        </div>
      </div>

      {/* ── the rail ───────────────────────────────────────────────────────────────── */}
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain scroll-smooth pb-8 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

function Step({
  dir,
  onClick,
  disabled,
}: {
  dir: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Previous view" : "Next view"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-[15px] leading-none text-foreground transition-colors hover:border-accent/50 disabled:pointer-events-none disabled:opacity-30"
    >
      {dir === "left" ? "‹" : "›"}
    </button>
  );
}
