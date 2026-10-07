import Link from "next/link";
import { PageShell, PageHead, Card, Honest } from "@/components/feed-ui";

/* /incidents — ported from the drop-in build into our design system.

   ⚠️ THIS PAGE IS A DRAFT AND SAYS SO ON ITS FACE. Entry #1 is written from our own audit, but
   two things in it are not confirmed: the exact dates, and whether the key was rotated. A wrong
   date on an incident page is worse than no page — it is the one page where being casually
   wrong costs more than being silent. The banner stays until an operator fills both.

   Why the page exists before there is anything comfortable to put on it: every trust
   intermediary that survived a bad week — CAs under the Mozilla policy, statutory auditors,
   rating agencies — publishes how it was wrong on a fixed format. Standing the format up first
   is what makes the first real disclosure credible instead of defensive. */

export const metadata = {
  title: "Incidents",
  description:
    "What went wrong, with dates. Every incident gets a timeline and a root cause; fixed means verified by someone who did not write the fix.",
};

const DRAFT = true;

export default function IncidentsPage() {
  return (
    <PageShell>
      <PageHead
        eyebrow="Incidents"
        title={
          <>
            What went wrong, <span className="accent-gradient">with dates.</span>
          </>
        }
        sub="Every incident gets a timeline and a root cause. Fixed means verified by someone who did not write the fix — not a notice that something was addressed."
        right={
          DRAFT ? (
            <span className="rounded-md bg-gold/15 px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold">
              draft — unconfirmed
            </span>
          ) : null
        }
      />

      {DRAFT && (
        <Card className="mt-8 border-gold/40 bg-gold-soft/[0.06]">
          <p className="text-[14px] font-medium text-foreground">
            This page is not confirmed and must not ship as-is.
          </p>
          <p className="body-copy mt-1.5 text-[13.5px] leading-relaxed">
            The entry below is drawn from an internal audit. The dates and the rotation status are
            marked and have not been verified by an operator. Publishing an incident report with a
            wrong date is worse than publishing none — it is the one page where a careless error
            costs more than silence.
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-tight">
            #1 · Private key shipped in the connect block
          </h2>
          <span className="font-mono text-[11px] text-muted-2">
            [confirm: occurred YYYY-MM] · [confirm: disclosed YYYY-MM-DD]
          </span>
        </div>

        <dl className="mt-5 grid gap-x-8 gap-y-3.5 text-[14px] md:grid-cols-[150px_1fr]">
          <Row k="What happened">
            The dashboard&rsquo;s copy-paste connect block included a live signing key. Users were
            told to paste that block into third-party agents, so the key travelled wherever the
            block did.
          </Row>
          <Row k="Exposure">
            One key, and any transcript or provider log that contains the block. Treated as
            compromised regardless of whether misuse is observed — the alternative is assuming our
            way out of it.
          </Row>
          <Row k="Fix">
            The block emits only the agent name and address. Verified by searching the source, the
            built output and the deployed site — not by the person who wrote the fix.
          </Row>
          <Row k="Rotation">
            <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[12px] text-gold">
              [confirm: rotated on YYYY-MM-DD — or state: pending]
            </span>
          </Row>
          <Row k="Root cause">
            Secret-handling rules covered the server code. The distribution artefact — an
            onboarding snippet — was not in scope, so nothing checked it. Snippets are now
            generated from a template that cannot reference a secret.
          </Row>
        </dl>

        <Honest>
          Scope note: this entry describes a key we published. It is not a claim about what any
          third party did with it, because we cannot see that and will not guess.
        </Honest>
      </Card>

      <Card className="mt-4">
        <h2 className="text-[15px] font-semibold tracking-tight">Our commitment</h2>
        <ul className="mt-3 space-y-2.5 text-[13.5px] text-muted">
          <li className="flex gap-2">
            <span className="text-accent">·</span> An incident goes up with a timeline and a root
            cause, not a line saying something was &ldquo;addressed&rdquo;.
          </li>
          <li className="flex gap-2">
            <span className="text-accent">·</span> &ldquo;Fixed&rdquo; means verified by someone who
            did not write the fix, against the deployed site rather than the source.
          </li>
          <li className="flex gap-2">
            <span className="text-accent">·</span> If we do not know the extent of something, the
            entry says so rather than implying a boundary we did not measure.
          </li>
        </ul>
        <p className="mt-4 text-[13.5px] text-muted">
          Found something?{" "}
          <Link href="/security" className="text-accent hover:opacity-80">
            How to report it →
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-semibold text-foreground">{k}</dt>
      <dd className="body-copy leading-relaxed">{children}</dd>
    </>
  );
}
