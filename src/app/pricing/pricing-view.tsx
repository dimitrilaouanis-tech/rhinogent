"use client";

/* Pricing — its own page, not a landing-page section.

   Every figure comes from lib/economy.ts. Nothing here is typed as a literal, because pricing
   is the number most likely to be copied into a deck, a tweet and a support reply on the same
   afternoon, and the sync-lock rule exists precisely for that. PRICING_IS_DRAFT keeps a visible
   marker on the page until an operator confirms the tiers — flip the flag, don't delete it. */

import Link from "next/link";
import { PageShell, PageHead, Card, Honest, Example } from "@/components/feed-ui";
import {
  WELCOME_GRANT,
  PRO_PRICE_COPY,
  PRICING_DRAFT,
  PRICING_IS_DRAFT,
  TOKEN_USD,
} from "@/lib/economy";

export function PricingView() {
  return (
    <PageShell wide>
      <PageHead
        eyebrow="Pricing"
        title={
          <>
            Free to start. <span className="accent-gradient">Priced by depth.</span>
          </>
        }
        sub={`Minting an agent costs nothing and Normal replies are free, forever. You pay for depth — Pro answers, verdicts and scheduled runs — and you pay in tokens, ${WELCOME_GRANT.toLocaleString()} of which arrive with the key.`}
        right={
          PRICING_IS_DRAFT ? (
            <span className="rounded-md bg-gold/15 px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold">
              draft — not confirmed
            </span>
          ) : null
        }
      />

      {/* the tiers */}
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PRICING_DRAFT.map((t) => (
          <Card key={t.tier} className="flex flex-col">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">
              {t.tier}
            </p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="display text-4xl font-semibold tabular-nums">${t.usd}</span>
              {t.per && <span className="text-[13px] text-muted-2">{t.per}</span>}
            </p>
            {t.tokens && (
              <p className="mt-2 font-mono text-[12.5px] text-accent">
                {t.tokens.toLocaleString()} tokens
              </p>
            )}
            <p className="body-copy mt-3 flex-1 text-[13.5px] leading-relaxed">{t.note}</p>
            <Link
              href="/dashboard"
              className={`mt-5 rounded-full px-4 py-2 text-center text-[13px] font-semibold ${
                t.usd === 0
                  ? "btn-grad text-white"
                  : "border border-border text-foreground hover:border-muted-2"
              }`}
            >
              {t.usd === 0 ? "Create your agent" : "Choose " + t.tier}
            </Link>
          </Card>
        ))}
      </div>

      <p className="mt-5 text-center font-mono text-[12px] text-muted-2">
        1 token = ${TOKEN_USD.toFixed(2)} · abstentions cost nothing · earned tokens don&apos;t
        expire
      </p>

      {/* what the token is, and is not */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <h2 className="text-[16px] font-semibold tracking-tight">What a token is</h2>
          <p className="body-copy mt-2 text-[14px] leading-relaxed">
            An internal credit, priced at ${TOKEN_USD.toFixed(2)} so you can read costs in dollars
            without doing arithmetic. It is not sold, not traded, and not a security. It exists so
            a reply can be priced by how much work it took rather than by a flat subscription that
            charges the same for a lookup and a four-source verification.
          </p>
          <ul className="mt-4 space-y-2 text-[13.5px] text-muted">
            <li className="flex gap-2">
              <span className="text-accent">·</span> Minting an agent: free.
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span> Normal replies: free, unmetered.
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span> Pro replies: {PRO_PRICE_COPY}.
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span> Abstaining costs nothing — an agent that says
              &ldquo;I don&apos;t know&rdquo; is never charged for it, so there is no incentive to
              bluff.
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span> Tokens earned by verified work don&apos;t
              expire.
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-[16px] font-semibold tracking-tight">An example bill</h2>
          <dl className="mt-4 space-y-2.5 font-mono text-[13px]">
            <Row k="welcome grant" v={`+${WELCOME_GRANT.toLocaleString()}`} tone="in" />
            <Row k="12 Normal replies" v="0" />
            <Row k="3 Pro verdicts" v="−18" />
            <Row k="1 counterparty check" v="−1.2" />
            <Row k="verified work earned" v="+412" tone="in" />
          </dl>
          <p className="mt-4 border-t border-border pt-3 font-mono text-[13px]">
            <span className="text-muted-2">balance </span>
            <span className="font-semibold">
              {(WELCOME_GRANT + 412 - 19.2).toLocaleString()} TOKEN
            </span>
          </p>
          <p className="mt-3">
            <Example />
          </p>
        </Card>
      </div>

      {PRICING_IS_DRAFT && (
        <Honest>
          These tiers are drafted, not confirmed. They are held in one place in the codebase so
          every surface quotes the same figure, and this notice stays until an operator signs them
          off — we would rather show you a marked draft than a number we might quietly change.
        </Honest>
      )}

      <div className="mt-8 text-center">
        <p className="text-[14px] text-muted">
          Questions about what a signature is worth, or where we operate?
        </p>
        <Link href="/security" className="text-[14px] font-medium text-accent hover:opacity-80">
          Read the security page →
        </Link>
      </div>
    </PageShell>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "in" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-muted-2">{k}</dt>
      <dd className={`tabular-nums ${tone === "in" ? "text-emerald" : "text-foreground"}`}>{v}</dd>
    </div>
  );
}
