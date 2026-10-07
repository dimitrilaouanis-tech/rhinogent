"use client";

/* /download — the release list. Every file, in the shape a developer already knows how to read.

   This is deliberately NOT a showcase. /apps is the showcase: what each surface looks like and
   what is built on it. This page answers one question — give me the file — and it answers it the
   way a releases page does, because that is the shape the reader already has in their head:
   a row per asset with its platform, kind, size and state; the install line as a copyable
   command rather than a button; and underneath, the verifiable artifacts, because on a trust
   product those ARE assets.

   The two were briefly one page, on the evidence that 11 of 15 comparable products label this
   "Download". That failed for a specific reason: for those 15, Download IS the showcase, because
   they ship one binary. We have four surfaces, two of which are not downloads at all — the web
   app opens in a browser, the CLI is an npm install — plus a real list of builds and artifacts.
   One label could not carry both jobs.

   THE HARD PART OF A DOWNLOADS PAGE IS NOT SHIPPING WHAT YOU HAVE, IT IS SAYING WHAT YOU DO NOT.
   A dead link here is a broken promise rather than a typo, so every row carries its real state,
   and the two that cannot be downloaded say why in the row rather than in a footnote.

   The artifact rows were checked live on this build. /rank.json, /facts_registry.json and
   /world_facts.json all 404 today, so they are NOT listed. /.well-known/jwks.json is, and it
   carries the only end-to-end-verified claim on the site: on 2026-10-05 census_v1.json's
   signature checked out against that key, and flipping one byte of the body correctly failed. */

import Link from "next/link";
import { PageShell, PageHead, Honest } from "@/components/feed-ui";
import { CopyCmd } from "@/components/home-fx";
import { ComposedHero } from "@/components/composed-hero";
import { SURFACES, Band } from "@/components/surfaces";

type State = "install" | "open" | "paused" | "building";

type Asset = {
  name: string;
  platform: string;
  kind: string;
  size: string;
  version: string;
  needs: string;
  state: State;
  note: string;
  cmd?: string;
  href?: string;
  action?: string;
};

const TONE: Record<State, { label: string; cls: string }> = {
  install: { label: "on npm", cls: "bg-emerald/12 text-emerald" },
  open: { label: "no download", cls: "bg-accent/10 text-accent" },
  paused: { label: "paused", cls: "bg-gold/15 text-gold" },
  building: { label: "no installer", cls: "bg-gold/15 text-gold" },
};

const ASSETS: Asset[] = [
  {
    name: "rhinogent",
    platform: "macOS · Linux · Windows",
    kind: "npm package",
    size: "8.2 kB",
    version: "0.1.0",
    needs: "Node 18 or newer",
    state: "install",
    note: "Node 18 or newer, nothing else to install. MIT. The key is generated on your machine and printed once.",
    cmd: "npm i -g rhinogent",
  },
  {
    name: "Rhinogent on the web",
    platform: "any browser",
    kind: "hosted",
    size: "—",
    version: "continuous",
    needs: "A browser with WebCrypto — every current one",
    state: "open",
    note: "Nothing to install. Your key is generated in the browser and stays there, and you do not need an account to start.",
    href: "/chat",
    action: "Open it",
  },
  {
    name: "rhinogent-android",
    platform: "Android · arm64",
    kind: ".apk",
    size: "322 MB",
    version: "0.4.0 · 2026-09-10",
    needs: "Android 10 or newer",
    state: "paused",
    note: "Builds and runs. Public distribution is paused while we replace four voice models whose licence is not cleared for commercial use. Testers get builds in the meantime.",
    href: "mailto:hello@rhinogent.com?subject=Android%20build",
    action: "Ask for a build",
  },
  {
    name: "Rhinogent for desktop",
    platform: "Windows · macOS",
    kind: "Tauri app",
    size: "—",
    version: "unreleased",
    needs: "Windows 10 or newer · macOS 12 or newer",
    state: "building",
    note: "Compiles and runs — the IDE, the chat and the companion island. Unsigned and with no installer, so there is no file to put behind a button yet.",
    href: "/surfaces",
    action: "See what it does",
  },
];

/* Fetchable without an account. Every one checked on this build. */
const ARTIFACTS: { path: string; what: string; why: string }[] = [
  {
    path: "/.well-known/jwks.json",
    what: "Feed-signing public key",
    why: "RFC 8037 JWK. Verified 2026-10-05 — census_v1.json's signature checks out against it, and flipping one byte of the body correctly fails.",
  },
  {
    path: "/census_v1.json",
    what: "Signed census feed",
    why: "Every number on this site. The signed body is the feed minus sig, signed_by and truth_root, with the signer's exact number lexemes.",
  },
  {
    path: "/.well-known/agent-card.json",
    what: "A2A agent card",
    why: "Every field A2A v1.0 requires. No signatures field yet — published, not signed, and we say so rather than letting you assume.",
  },
  {
    path: "/a2a_cards.json",
    what: "Per-agent cards",
    why: "One card per agent, each with its did:pkh and the address to challenge.",
  },
  {
    path: "/.well-known/security.txt",
    what: "security.txt",
    why: "Where to report something, and when the contact expires. RFC 9116.",
  },
  {
    path: "/verify-feed.mjs",
    what: "The verifier itself",
    why: "Node 18+, no dependencies, about 150 lines. Fetches the key from jwks.json, rebuilds the signed body losslessly, and runs a null test before reporting — exit 3 if it cannot prove it is able to fail.",
  },
  {
    path: "/SHA256SUMS",
    what: "Checksums for all of the above",
    why: "Generated at build time from the files actually shipped, in the format sha256sum -c reads. Never written by hand — a checksum that lags its artifact fails for boring reasons, and a reader cannot tell that from tampering.",
  },
];

export function DownloadView() {
  return (
    <PageShell wide>
      <PageHead
        eyebrow="Get started"
        title={
          <>
            Use Rhinogent <span className="accent-gradient">everywhere you work.</span>
          </>
        }
        sub="One identity, one wallet, one record, reached through four doors. Two are open now; two are still being built — and the table at the bottom says exactly which file exists and which does not."
      />

      {/* ── what you are getting, before the files ────────────────────────────────── */}
      <div className="mt-12">
        <ComposedHero />
      </div>

      <div className="mt-20 flex flex-col gap-16 md:gap-20">
        {SURFACES.map((s, i) => (
          <div key={s.id} className={i > 0 ? "border-t border-border pt-16 md:pt-20" : ""}>
            <Band s={s} />
          </div>
        ))}
      </div>

      {/* ── then the files ─────────────────────────────────────────────────────────── */}
      <div className="mt-24 border-t border-border pt-16">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
          Every file, and what state it&rsquo;s in
        </h2>
        <p className="body-copy mt-3 max-w-2xl text-[15px] leading-relaxed">
          One installs in a second, one opens in a browser, two are not finished. Each row says
          which — in the row, not in a footnote underneath it.
        </p>
      </div>

      {/* ── the one-liner, because most people came for exactly this ───────────────── */}
      <div className="mt-10 rounded-xl border border-border bg-background p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-2">
          Fastest route
        </p>
        <p className="body-copy mt-2 text-[14px]">
          No account, no browser. The key is generated on your machine and printed once.
        </p>
        <div className="mt-3 max-w-sm">
          <CopyCmd cmd="npx rhinogent init" />
        </div>
      </div>

      {/* ── the asset table ────────────────────────────────────────────────────────── */}
      <div className="mt-10 overflow-hidden rounded-xl border border-border">
        <div className="hidden items-center gap-4 border-b border-border bg-surface/60 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2 lg:flex">
          <span className="w-[190px] shrink-0">Asset</span>
          <span className="w-[135px] shrink-0">Platform</span>
          <span className="w-[90px] shrink-0">Kind</span>
          <span className="w-[130px] shrink-0">Version</span>
          <span className="w-[66px] shrink-0">Size</span>
          <span className="flex-1">State</span>
        </div>

        {ASSETS.map((a, i) => (
          <div
            key={a.name}
            className={`bg-background px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
              <span className="w-full shrink-0 font-mono text-[13px] font-semibold text-foreground lg:w-[190px]">
                {a.name}
              </span>
              <span className="w-full shrink-0 font-mono text-[11.5px] text-muted-2 lg:w-[135px]">
                {a.platform}
              </span>
              <span className="w-full shrink-0 font-mono text-[11.5px] text-muted-2 lg:w-[90px]">
                {a.kind}
              </span>
              <span className="w-full shrink-0 font-mono text-[11.5px] tabular-nums text-muted-2 lg:w-[130px]">
                {a.version}
              </span>
              <span className="w-full shrink-0 font-mono text-[11.5px] tabular-nums text-muted-2 lg:w-[66px]">
                {a.size}
              </span>
              <span className="flex flex-1 items-center justify-between gap-3">
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${TONE[a.state].cls}`}
                >
                  {TONE[a.state].label}
                </span>
                {a.href && a.action && (
                  <Link
                    href={a.href}
                    className="shrink-0 rounded-full border border-border px-4 py-1.5 text-[12.5px] font-medium transition-colors hover:border-accent/40"
                  >
                    {a.action} →
                  </Link>
                )}
              </span>
            </div>

            <p className="body-copy mt-2.5 max-w-3xl text-[12.5px] leading-relaxed">{a.note}</p>
            <p className="mt-1.5 font-mono text-[11px] text-muted-2">requires {a.needs}</p>

            {a.cmd && (
              <div className="mt-3 max-w-sm">
                <CopyCmd cmd={a.cmd} />
              </div>
            )}
          </div>
        ))}
      </div>

      <Honest>
        No iOS build exists. Nothing on this page links to a file that is not there — which is why
        two of the four rows offer a conversation instead of a button. When the Android licence is
        cleared and the desktop installer is signed, they become files here, and not before.
      </Honest>

      {/* ── artifacts ──────────────────────────────────────────────────────────────── */}
      <div className="mt-16">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
          For machines, and for sceptics
        </h2>
        <p className="body-copy mt-3 max-w-2xl text-[15px] leading-relaxed">
          If you came to check us rather than to install something, these are the downloads that
          matter. Every one is live, fetchable without an account, and readable by another agent.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          {ARTIFACTS.map((f, i) => (
            <a
              key={f.path}
              href={f.path}
              className={`flex flex-col gap-1 bg-background p-4 transition-colors hover:bg-surface/70 sm:flex-row sm:items-center sm:gap-5 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="w-full shrink-0 font-mono text-[12.5px] text-accent sm:w-[250px]">
                {f.path}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-foreground">{f.what}</span>
                <span className="body-copy block text-[12.5px] leading-relaxed">{f.why}</span>
              </span>
            </a>
          ))}
        </div>

        <Honest>
          Fetched from this domain, over plain HTTP, with no key and no account. If one of these
          returns a 404 it means the deploy is behind the repo — tell us, because that is a defect
          and not a design.
        </Honest>

        {/* ── check it, in two commands ──────────────────────────────────────────── */}
        <div className="mt-10 overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-surface/60 px-5 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
              Verify what you fetched
            </p>
          </div>
          <div className="p-5">
            <p className="body-copy text-[13.5px] leading-relaxed">
              Integrity first — the checksums are generated at build time from the files actually
              shipped, so they cannot lag what you downloaded:
            </p>
            <div className="mt-3 max-w-xl">
              <CopyCmd cmd="curl -sO https://rhinogent.com/SHA256SUMS && sha256sum -c SHA256SUMS" />
            </div>

            <p className="body-copy mt-6 text-[13.5px] leading-relaxed">
              Then authenticity. The verifier is 150 lines with no dependencies. It fetches the
              key from <code className="font-mono text-[12.5px] text-accent">jwks.json</code>{" "}
              rather than carrying one, rebuilds the signed body losslessly, and runs its own
              null test before it reports anything:
            </p>
            <div className="mt-3 max-w-xl">
              <CopyCmd cmd="curl -sO https://rhinogent.com/verify-feed.mjs && node verify-feed.mjs" />
            </div>

            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-2">
              What a good run prints
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0c111c] px-4 py-3.5 font-mono text-[11.5px] leading-[1.75] text-[#c6d3e6]">
{`feed         https://rhinogent.com/census_v1.json
authority    https://rhinogent.com/.well-known/jwks.json (kid qH_Kx6…U_Q)
alg          Ed25519 over JCS-style canonical body
null test    `}<span style={{ color: "var(--emerald)" }}>pass — a tampered body is rejected</span>{`
signature    `}<span style={{ color: "var(--emerald)" }}>VERIFIED</span>
            </pre>

            <p className="body-copy mt-4 text-[13px] leading-relaxed">
              The <strong className="font-semibold text-foreground">null test</strong> line is the
              one to read. It means the program flipped a byte and confirmed it could still fail
              before telling you it passed — if that line does not say pass, the run exits 3 and
              the verdict above it means nothing. A checker that only ever passes is not a
              checker, and we have shipped one of those before.
            </p>

            <p className="body-copy mt-4 text-[13px] leading-relaxed">
              Exit codes: <code className="font-mono">0</code> verified ·{" "}
              <code className="font-mono">1</code> signature invalid or foreign key ·{" "}
              <code className="font-mono">2</code> could not fetch or parse ·{" "}
              <code className="font-mono">3</code> the verifier is broken. Pass{" "}
              <code className="font-mono">--key</code> to pin a value you obtained somewhere other
              than this domain — that is the stronger check, and the flag exists so you can make
              it.
            </p>

            <p className="mt-4 border-t border-border pt-4 font-mono text-[11.5px] leading-relaxed text-muted-2">
              Null-tested 2026-10-06 against a changed metric value, an altered signature and a
              foreign signing key. Exit 1 on all three; exit 0 on the real feed.
            </p>
          </div>
        </div>
      </div>


    </PageShell>
  );
}
