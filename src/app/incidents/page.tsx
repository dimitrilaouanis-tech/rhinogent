import Link from "next/link";
import { PageShell, PageHead, Card, Honest } from "@/components/feed-ui";

/* /incidents — ported from the drop-in build into our design system.

   THE DATES ARE NOW CONFIRMED, FROM THE REPOSITORY RATHER THAN FROM MEMORY (2026-10-15).
   Two commits bound the whole thing, and their diffs say what the prose could only assert:

     5f2e669cfa  2026-06-30 22:42:50 +0300  the connect block ships
     24760cb9e9  2026-06-30 22:56:09 +0300  the fix — the removed line is literally
                                            `RHINOGENT_KEY: agent.privateKey,`

   Thirteen minutes and nineteen seconds, on one evening. A separate drop-in page circulating
   internally dates this incident to 2026-09 with a one-hour fix; that is wrong by three months
   and by the duration, and it was not written from the history. Dates on this page come from
   commits, not from a document.

   WHAT IS STILL OPEN, and why it is written as open rather than resolved: whether a BUILD went
   out inside those thirteen minutes. The gh-pages history reachable here begins 2026-07-06, six
   days after the incident, so the deploy record for that evening is simply not in hand. That is
   missing evidence, not evidence of absence, and the entry says so. Key rotation is also still
   unconfirmed. The banner now names those two rather than the dates.

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
              dates confirmed · two items open
            </span>
          ) : null
        }
      />

      {DRAFT && (
        <Card className="mt-8 border-gold/40 bg-gold-soft/[0.06]">
          <p className="text-[14px] font-medium text-foreground">
            Two things in this entry are still open, and they are named rather than smoothed over.
          </p>
          <p className="body-copy mt-1.5 text-[13.5px] leading-relaxed">
            The timings below are read from the two commits that bound the incident, so they are
            as exact as the repository is. What is <em>not</em> established is whether a build went
            out during the thirteen minutes — the deploy history available to us starts six days
            later — and whether the exposed key was afterwards rotated. Both are written as open.
            An incident page that resolves what it has not checked is worth less than no page.
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-tight">
            #1 · Private key shipped in the connect block
          </h2>
          <span className="font-mono text-[11px] text-muted-2">
            2026-06-30 22:42:50 → 22:56:09 +03 · open 13m 19s
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
            way out of it.{" "}
            <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[12px] text-gold">
              open: whether a build shipped inside the 13 minutes
            </span>{" "}
            — the deploy history we hold begins 2026-07-06, six days later, so the record for that
            evening is missing. Missing, not empty: we will not read it either way.
          </Row>
          <Row k="Fix">
            The block emits only the agent name and address; the key is injected from the
            environment at launch and never written into a config file. Commit{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px]">24760cb9e9</code>,
            which removes the line{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px]">RHINOGENT_KEY: agent.privateKey</code>.
            Verified against the source, the built output and the deployed site — not by the person
            who wrote the fix.
          </Row>
          <Row k="Rotation">
            <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[12px] text-gold">
              open: rotation of the exposed key not confirmed
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
