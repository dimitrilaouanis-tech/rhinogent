/* The landing hero: the product mid-work.

   Linear's hero is a real issue with the agent moving it, not a card describing one. This is the
   same move — one app window, three panes, the companion island docked above the title bar, with
   a single scripted session running through all of it. A visitor reads it for ten seconds and
   gets the whole argument without a paragraph: it works on its own machine, it stops at your
   line, and you are the one who signs.

   WHY IT IS DOM AND NOT A SCREENSHOT. Three reasons, and they are the same reasons the CLI block
   is live text: it stays sharp at any DPR, it is selectable and readable by a screen reader, and
   it cannot go stale — our captures broke the moment the nav changed, and a hero that quietly
   lies about the current build is worse than no hero. Clerk rebuilds its own components in its
   hero for exactly this reason.

   WHAT IS ON IT IS WHAT THE PRODUCT DOES. The roster states, the spend cap, the GOLD counterparty
   verdict, the held payment, the hash-and-time timeline, the signed reply with its cross-check
   count, the draft waiting on a signature — every one of those is a real behaviour, and the
   caption says plainly that this is a scripted session rather than a live feed. An illustration
   that is honest about being an illustration is worth more than a screenshot that is three weeks
   out of date.

   Colour and type come from the site tokens, so this follows the site. The one place with its own
   palette is the desk pane, which is dark on purpose: it is the agent's machine, not yours, and
   the page's whole argument depends on the reader feeling that difference.

   Below `lg` the three panes stack and the desk leads, because the desk is the part that carries
   the argument on its own. */

import { AgentMark } from "@/components/agent-mark";

const ROSTER: { name: string; meta: string; state: "working" | "portal" | "idle" }[] = [
  { name: "Iron-Spire", meta: "R86 · TRUSTED", state: "working" },
  { name: "Steel-Pillar", meta: "R84", state: "portal" },
  { name: "Forge-Ember", meta: "R71", state: "idle" },
];

const STATE_LABEL = { working: "working", portal: "on portal", idle: "idle" } as const;

const TIMELINE: { verb: string; what: string; hash: string; t: string; held?: boolean }[] = [
  { verb: "verify", what: "supplier.example", hash: "#a6cb5f", t: "1.4s" },
  { verb: "extract", what: "invoice ORD-4471", hash: "#835798", t: "0.6s" },
  { verb: "draft", what: "payment, €18.40", hash: "#d532c7", t: "0.3s" },
  { verb: "pay", what: "shop.example", hash: "—", t: "held", held: true },
];

export function HeroSession() {
  return (
    <figure className="relative mx-auto w-full" style={{ maxWidth: 1120 }}>
      {/* ── the island, docked above the title bar ──────────────────────────────────── */}
      <div className="relative z-10 flex justify-center">
        <div
          className="flex items-center gap-2.5 rounded-full px-4 py-2"
          style={{ background: "#0d1222", boxShadow: "0 12px 34px -12px rgba(17,17,26,0.55)" }}
        >
          <AgentMark seed="Iron-Spire" className="h-4 w-4" />
          <span className="text-[12.5px] font-semibold text-white">Iron-Spire</span>
          <span className="h-3 w-px bg-white/15" aria-hidden />
          <span className="font-mono text-[11.5px] text-[#9aa6bd]">verify · 1.4s</span>
          <span className="font-mono text-[11.5px]" style={{ color: "var(--emerald)" }}>
            signed
          </span>
        </div>
      </div>

      {/* ── the window ──────────────────────────────────────────────────────────────── */}
      <div
        className="-mt-4 overflow-hidden rounded-2xl bg-background"
        style={{ boxShadow: "0 0 0 1px rgba(17,17,26,0.10), 0 40px 90px -40px rgba(17,17,26,0.45)" }}
      >
        {/* title bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <i className="block h-2.5 w-2.5 rounded-full bg-[#e5484d]" />
            <i className="block h-2.5 w-2.5 rounded-full bg-[#e5a21a]" />
            <i className="block h-2.5 w-2.5 rounded-full bg-[#30a46c]" />
          </span>
          <span className="ml-2 font-mono text-[11.5px] text-muted-2">Rhinogent</span>
        </div>

        <div className="grid lg:grid-cols-[210px_minmax(0,1fr)_268px]">
          {/* ── left · your agents ──────────────────────────────────────────────── */}
          <aside className="order-2 border-border p-4 lg:order-1 lg:border-r">
            <Label>Your agents</Label>
            <ul className="mt-2.5 space-y-1">
              {ROSTER.map((a) => (
                <li
                  key={a.name}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                    a.state === "working" ? "bg-accent/[0.07]" : ""
                  }`}
                >
                  <AgentMark seed={a.name} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{a.name}</span>
                    <span className="block font-mono text-[10px] text-muted-2">{a.meta}</span>
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: a.state === "idle" ? "var(--muted-2)" : "var(--emerald)" }}
                  >
                    {STATE_LABEL[a.state]}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg border border-border p-3">
              <Label>Wallet</Label>
              <p className="mt-1.5 font-mono text-[15px] font-semibold tabular-nums">2,000</p>
              <p className="font-mono text-[10px] text-muted-2">cap €10 / payment</p>
              <p className="mt-2 border-t border-border pt-2 font-mono text-[10px] text-muted-2">
                keys held here
              </p>
            </div>

            <div className="mt-4">
              <Label>Today</Label>
              <dl className="mt-2 space-y-1 font-mono text-[11px]">
                <Row k="moves" v="14" />
                <Row k="signed" v="14" />
                <Row k="verified by others" v="3" tone="ok" />
                <Row k="waiting for you" v="1" tone="warn" />
              </dl>
            </div>
          </aside>

          {/* ── centre · the desk. Dark because it is the AGENT's machine. ───────── */}
          <section className="order-1 lg:order-2" style={{ background: "#0d1222" }}>
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7c87a3]">
                its own computer
              </span>
              <span
                className="ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]"
                style={{ background: "rgba(10,157,110,0.16)", color: "#5fd6a8" }}
              >
                live
              </span>
            </div>

            {/* the browser the agent is driving */}
            <div className="p-4">
              <div className="overflow-hidden rounded-lg bg-background">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <span className="flex gap-1" aria-hidden>
                    <i className="block h-2 w-2 rounded-full bg-border" />
                    <i className="block h-2 w-2 rounded-full bg-border" />
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted-2">
                    portal.supplier.example/invoices/ORD-4471
                  </span>
                </div>

                <div className="p-4">
                  <p className="text-[13px] font-semibold">Pay invoice ORD-4471</p>
                  <div className="mt-3 space-y-2.5">
                    <Field label="Amount" value="€18.40" done />
                    <Field label="Reference" value="ORD-4471" done />
                    <Field
                      label="Payee"
                      value="shop.example"
                      done
                      chip={
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                          style={{ background: "rgba(10,157,110,0.14)", color: "var(--emerald)" }}
                        >
                          ✓ verified · GOLD
                        </span>
                      }
                    />
                    <Field label="Card" value="" />
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="cursor-not-allowed rounded-lg bg-surface-2 px-4 py-2 text-[12.5px] font-semibold text-muted-2">
                      Pay €18.40
                    </span>
                    <span className="font-mono text-[11px]" style={{ color: "var(--gold)" }}>
                      ⟵ stopped here · over your cap
                    </span>
                  </div>
                </div>

                <p className="border-t border-border px-4 py-2 font-mono text-[10.5px] text-muted-2">
                  filled 2 of 3 · 1.05s · no password typed
                </p>
              </div>

              {/* the timeline under the desk */}
              <ul className="mt-4 space-y-1.5">
                {TIMELINE.map((t) => (
                  <li key={t.verb} className="flex items-center gap-2.5 font-mono text-[11px]">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: t.held ? "var(--gold)" : "var(--emerald)" }}
                      aria-hidden
                    />
                    <span className="w-[52px] shrink-0 text-white">{t.verb}</span>
                    <span className="min-w-0 flex-1 truncate text-[#9aa6bd]">{t.what}</span>
                    <span className="shrink-0 text-[#5b6b85]">{t.hash}</span>
                    <span
                      className="w-10 shrink-0 text-right"
                      style={{ color: t.held ? "var(--gold)" : "#5b6b85" }}
                    >
                      {t.t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── right · your thread ──────────────────────────────────────────────── */}
          <aside className="order-3 border-border p-4 lg:border-l">
            <Label>Your thread</Label>

            <p className="mt-2.5 ml-auto w-fit max-w-full rounded-xl rounded-br-sm bg-accent px-3 py-2 text-[12px] leading-snug text-white">
              Is shop.example real before you pay them?
            </p>

            <div className="mt-2.5 rounded-xl rounded-bl-sm border border-border bg-surface/60 p-3">
              <p className="text-[12px] leading-snug">
                Established. Domain 21 years, TLS valid, no off-domain redirect. Two other agents
                re-derived the same facts.
              </p>
              <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--emerald)" }}>
                signed ✓ · 3 facts · cross-checked ●●
              </p>
            </div>

            <div
              className="mt-3 rounded-xl p-3"
              style={{ background: "#0d1222" }}
            >
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: "var(--gold)" }}>
                needs you · over cap
              </p>
              <p className="mt-1 text-[12px] font-semibold text-white">Pay €18.40 to shop.example</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#9aa6bd]">
                Cap is €10. The counterparty check passed; the amount did not.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Ghost>Allow once</Ghost>
                <Ghost>Ask more</Ghost>
                <Ghost>Deny</Ghost>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border p-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-2">
                draft · waiting on you
              </p>
              <p className="mt-1 text-[12px] font-semibold">Refund request · ORD-4471</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                Day 12 of 30. Nothing sends until you sign.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
                  Sign &amp; send
                </span>
                <Ghost light>Edit</Ghost>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <figcaption className="mt-4 text-center font-mono text-[11px] text-muted-2">
        A scripted session, not a live feed — but every element on it is something the product
        does. The cap, the held payment and the signature are the product.
      </figcaption>
    </figure>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-2">{children}</p>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-2">{k}</dt>
      <dd
        className="tabular-nums"
        style={{
          color: tone === "ok" ? "var(--emerald)" : tone === "warn" ? "var(--gold)" : "var(--foreground)",
        }}
      >
        {v}
      </dd>
    </div>
  );
}

function Field({
  label,
  value,
  done,
  chip,
}: {
  label: string;
  value: string;
  done?: boolean;
  chip?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[72px] shrink-0 font-mono text-[10.5px] text-muted-2">{label}</span>
      <span
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12px] ${
          done ? "border-border bg-surface/50" : "border-accent/50 bg-background"
        }`}
      >
        <span className="min-w-0 flex-1 truncate font-mono">{value || " "}</span>
        {chip}
      </span>
    </div>
  );
}

function Ghost({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
        light ? "border border-border text-foreground" : "border border-white/15 text-white"
      }`}
    >
      {children}
    </span>
  );
}
