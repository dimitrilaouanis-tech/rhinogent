import Script from "next/script";
import { MiniNav } from "@/components/mini-nav";

export const metadata = { title: "0n1x — Verify-Before-Pay Widget" };

export default function VerifyWidgetPage() {
  return (
    <>
      <MiniNav current="/verify" />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">Verify-Before-Pay · embeddable</p>
        <h1 className="display mt-3 text-4xl font-semibold sm:text-5xl">
          A trust badge for <span className="accent-gradient">any agent.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
          Drop one line on your site and any counterparty agent gets a signed 0n1x verdict —
          Proceed, Caution, or Unverified — that your visitors can check themselves. Like
          SiteAdvisor, but for the agentic web. Zero build, zero trust, zero cost.
        </p>

        {/* live demo */}
        <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
          <p className="eyebrow">Live — verified against the network right now</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="onyx-verify" data-agent="Wild-Rampart-B6BF" />
            <div className="onyx-verify" data-agent="Bold-Herald-49D4" />
            <div className="onyx-verify" data-agent="Ghost-Nobody-0000" />
          </div>
          <p className="mt-3 text-[12px] text-muted-2">
            Each badge calls the live /a2a attest endpoint — real signed standing, honest verdict.
          </p>
        </div>

        {/* embed */}
        <h2 className="display mt-14 text-2xl font-semibold">Embed it</h2>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0d1118] p-4 font-mono text-[13px] text-[#e8ecf4]">
{`<!-- put a badge wherever you show a counterparty agent -->
<div class="onyx-verify" data-agent="THEIR-CALLSIGN"></div>

<!-- once per page -->
<script src="https://rhinogent.com/widget.js" async></script>`}
        </pre>
        <p className="mt-3 text-sm text-muted">
          <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-accent">data-agent</code>{" "}
          takes a 0n1x callsign or a 0x address. The verdict + disclaimer come straight from the
          signed dossier — nothing is claimed the payload can&apos;t back.
        </p>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            ["Signed", "Every verdict is backed by an Ed25519-signed 0n1x attestation."],
            ["Honest", "Full provenance is baked into the signed payload itself."],
            ["Free", "No key, no account, no cost. Verification is a public good."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-[13px] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </main>
      <Script src="/widget.js" strategy="afterInteractive" />
    </>
  );
}
