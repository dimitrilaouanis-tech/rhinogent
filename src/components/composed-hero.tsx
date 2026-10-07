/* The composed hero.

   Taken from the 2026-10-06 light-stage download drop, which opens with all four surfaces
   overlapping in one arrangement instead of a heading on an empty field. It is the "hero IS the
   product" pattern the 89-site scrape found at every good site in the set, and it does something
   a row of four cards cannot: it shows in one glance that these are one thing seen four ways.

   What is different here from the drop:

   - COLOUR AND TYPE ARE OURS. The drop carries its own near-black and its own greys; everything
     below reads from the site tokens, so changing --accent or --page in globals.css moves this
     too and there is no second palette to keep in sync.

   - THE PICTURES ARE OURS AND THEY ARE REAL. The drop rebuilds each surface as a DOM mock-up.
     These are the captures of the running builds — the Rhinogent IDE, the phone, the companion
     island with our mascot and its callsign. The one exception is the CLI, which is live text
     rather than an image, because mono type is sharper at any DPR, selectable, about 1KB, and
     still readable if the page's JavaScript never loads.

   - IT DEGRADES. The whole composition is absolutely positioned inside one aspect-locked box, so
     on a narrow screen it scales rather than reflowing into a pile. Below `sm` it drops to the
     single clearest frame, because four overlapping windows at 380px wide is noise. */

import { AgentMark } from "@/components/agent-mark";

export function ComposedHero() {
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: 1080 }} aria-hidden={false}>
      {/* ── narrow: one frame, not four ─────────────────────────────────────────────── */}
      <div className="sm:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image loader */}
        <img
          src="/shots/desktop-ide.png"
          alt="The Rhinogent IDE: explorer, editor, terminal panel, and the agent docked down the right"
          className="w-full rounded-xl shadow-[0_0_0_1px_rgba(17,17,26,0.10),0_24px_60px_-28px_rgba(17,17,26,0.35)]"
        />
      </div>

      {/* ── wide: the composition ───────────────────────────────────────────────────── */}
      <div className="relative hidden sm:block" style={{ aspectRatio: "1080 / 560" }}>
        {/* the IDE, back-left */}
        <figure
          className="absolute overflow-hidden rounded-xl bg-background"
          style={{
            left: 0,
            top: "6%",
            width: "68%",
            boxShadow: "0 0 0 1px rgba(17,17,26,0.10), 0 28px 70px -34px rgba(17,17,26,0.40)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
          <img
            src="/shots/desktop-ide.png"
            alt="The Rhinogent IDE, with 0n1x MCP connected as an extension"
            className="block w-full"
          />
        </figure>

        {/* the signed pill, floating over the seam — the thing the companion actually does */}
        <div
          className="absolute flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            left: "27%",
            top: 0,
            background: "#0d1222",
            boxShadow: "0 10px 30px -10px rgba(17,17,26,0.55)",
          }}
        >
          <AgentMark seed="Iron-Spire" className="h-4 w-4" />
          <span className="text-[12px] font-semibold text-white">Iron-Spire</span>
          <span
            className="font-mono text-[11px]"
            style={{ color: "var(--emerald)" }}
          >
            +13 TOKEN
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--emerald)" }}
            aria-hidden
          />
        </div>

        {/* the phone, front-right */}
        <figure
          className="absolute overflow-hidden rounded-[22px] bg-background"
          style={{
            right: "2%",
            top: 0,
            width: "22%",
            boxShadow: "0 0 0 1px rgba(17,17,26,0.10), 0 30px 70px -28px rgba(17,17,26,0.45)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
          <img
            src="/shots/app-chat-transcript.png"
            alt="Rhinogent on a phone: three drafts waiting on your signature"
            className="block w-full"
          />
        </figure>

        {/* the CLI, front-bottom — live text, not a picture */}
        <figure
          className="absolute overflow-hidden rounded-xl"
          style={{
            right: "6%",
            bottom: 0,
            width: "40%",
            background: "#0c111c",
            boxShadow: "0 0 0 1px rgba(17,17,26,0.14), 0 26px 60px -26px rgba(17,17,26,0.55)",
          }}
        >
          <div className="border-b border-white/[0.07] px-4 py-2">
            <span className="font-mono text-[11px] text-[#5b6b85]">rhinogent</span>
          </div>
          <pre className="overflow-hidden px-4 py-3 font-mono text-[11.5px] leading-[1.75] text-[#c6d3e6]">
            <span className="text-[#5b6b85]">$</span> rhinogent init{"\n"}
            <span style={{ color: "#4ade80" }}>✓ Identity created</span>
            <span className="text-[#53607a]"> · on this machine</span>
            {"\n"}
            <span className="text-[#53607a]">  did </span> did:pkh:eip155:8453:0x9011…{"\n"}
            <span style={{ color: "var(--gold)" }}>! key</span>
            <span className="text-[#53607a]"> shown once · never sent</span>
          </pre>
        </figure>
      </div>
    </div>
  );
}
