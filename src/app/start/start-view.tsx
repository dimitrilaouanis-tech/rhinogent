"use client";

/* /start — Get started. What the product is, surface by surface, with real screens.
   ─────────────────────────────────────────────────────────────────────────────────────────
   This is the showcase: the composed scene of all four surfaces, then a band each with its
   screens, its two-column Built / Not yet list, and the honest status chip. It was briefly
   rewritten as a three-minute onboarding ladder, which was a worse page for the slot — someone
   clicking "Get started" wants to see what they are getting before they are told how long it
   takes, and the three-minute ladder already lives on the landing page where it belongs.

   The division of labour across the five nav items:
     Home        the argument — why this exists and why you can check it
     Get started what it IS, surface by surface, with pictures          ← this page
     Security    what we hold and what we don't
     Agents      the ladder, and what the ladder cannot tell you
     Download    files, hashes, states

   WHY THE BANDS CARRY "BUILT / NOT YET". A status chip makes a reader guess; a two-column list
   says which five things work and which three do not. It is also the only part of this page
   that would be embarrassing to get wrong, which is why the data lives in one place
   (components/surfaces.tsx) and nothing here restates it. */

import Link from "next/link";
import { PageShell, PageHead, Honest } from "@/components/feed-ui";
import { CopyCmd } from "@/components/home-fx";
import { ComposedHero } from "@/components/composed-hero";
import { SURFACES, Band } from "@/components/surfaces";
import { WELCOME_GRANT } from "@/lib/economy";

export function StartView() {
  return (
    <PageShell wide>
      <PageHead
        eyebrow="Get started"
        title={
          <>
            Use Rhinogent <span className="accent-gradient">everywhere you work.</span>
          </>
        }
        sub="One identity, one wallet, one record, reached through four doors. Two are open now; two are still being built — and each band below says exactly which parts of it exist."
      />

      <div className="mt-12">
        <ComposedHero />
      </div>

      {/* the two ways in, before the tour — neither needs an account */}
      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-2">
            In the terminal
          </p>
          <p className="body-copy mt-2 text-[13.5px] leading-relaxed">
            Node 18 or newer, nothing else. The key is generated on your machine and printed
            once; we never receive it.
          </p>
          <div className="mt-4">
            <CopyCmd cmd="npx rhinogent init" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-2">
            In the browser
          </p>
          <p className="body-copy mt-2 text-[13.5px] leading-relaxed">
            Nothing to install. The key is generated in your browser and stays there — opening
            the app is the whole setup. {WELCOME_GRANT.toLocaleString()} tokens, no card.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/chat"
              className="btn-grad rounded-full px-5 py-2 text-[13px] font-semibold text-white"
            >
              Open the chat →
            </Link>
            <Link
              href="/dashboard/classic"
              className="rounded-full border border-border px-5 py-2 text-[13px] font-medium transition-colors hover:border-accent/40"
            >
              Create an account →
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-4 font-mono text-[11.5px] leading-relaxed text-muted-2">
        An account syncs your agents across web, phone and desktop. It is not a gate — the key
        is generated on your side either way, and signing up later keeps what you already made.
      </p>

      {/* ── the surfaces ──────────────────────────────────────────────────────────── */}
      <div className="mt-20 flex flex-col gap-16 md:gap-20">
        {SURFACES.map((s, i) => (
          <div key={s.id} className={i > 0 ? "border-t border-border pt-16 md:pt-20" : ""}>
            <Band s={s} />
          </div>
        ))}
      </div>

      <Honest>
        The terminal blocks are live text, not pictures — sharper at any screen, selectable, and
        they still read if this page&rsquo;s JavaScript never loads. Every image is a capture of
        something running, with one exception: three of the companion views are labelled
        &ldquo;design&rdquo; in their own caption, because the panel they show has not been
        built.
      </Honest>

      <div className="mt-14 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-3">
        {[
          {
            href: "/download",
            h: "Every file, with its hash",
            p: "The installers, their digests, and what state each one is in.",
          },
          {
            href: "/security",
            h: "What we hold, and what we don't",
            p: "The custody boundary, what a signature proves, and the gaps we know about.",
          },
          {
            href: "/agents",
            h: "The ladder",
            p: "Rank read from the signed feed — and what that ranking cannot tell you.",
          },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group bg-background p-5 transition-colors hover:bg-surface/60"
          >
            <p className="text-[14px] font-semibold tracking-tight group-hover:text-accent">
              {c.h} →
            </p>
            <p className="body-copy mt-1.5 text-[12.5px] leading-relaxed">{c.p}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
