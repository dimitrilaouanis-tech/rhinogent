"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RhinoAvatar, type AgentState } from "@/components/rhino-a1";
import { AGENTS_CHANGED, loadAgents } from "@/lib/agents";
import type { Agent } from "@/lib/identity";
import { useSearch } from "@/lib/use-browser";
import { FEEDS, DASH, isNum, useJson, useSignedFeed, type Reputation } from "@/lib/signed-feed";

// Chat — agent-first. The sidebar is YOUR agents (keys in this browser) + groups; the thread
// shows the shape of a signed answer and an over-cap hold. The live engine (streaming, billing,
// signatures) runs at /chat/classic until it is ported into this layout — Send hands off to it.
// Thread numbers are [bracketed] placeholders: this preview never invents a source count or price.

type Rates = { costs?: { id: string; min: number | null }[] };
type Decision = null | "allowed" | "ask" | "denied";

export function ChatView() {
  const rep = useSignedFeed<Reputation>(FEEDS.reputation);
  const rates = useJson<Rates>("/rates_v1.json");
  const [agents, setAgents] = useState<Agent[]>([]);
  const peer = useSearch().get("agent");
  const [picked, setActive] = useState<string | null>(null);
  const [mode, setMode] = useState<"normal" | "pro">("normal");
  const [text, setText] = useState("");
  const [decision, setDecision] = useState<Decision>(null);

  useEffect(() => {
    const read = () => setAgents(loadAgents());
    read();
    window.addEventListener(AGENTS_CHANGED, read);
    return () => window.removeEventListener(AGENTS_CHANGED, read);
  }, []);

  const active = picked ?? peer ?? agents[0]?.id ?? null;
  const stateOf = (id: string): AgentState => {
    const a = rep.data?.agents?.find((x) => x.callsign === id);
    return a && isNum(a.activity_R) && a.activity_R > 0 ? "working" : "idle";
  };
  const proFrom = rates.data?.costs?.find((c) => c.id === "pro")?.min;
  const activeDid = agents.find((a) => a.id === active)?.did || active || "";

  function send() {
    const p = new URLSearchParams();
    if (active) p.set("agent", active);
    if (text.trim()) p.set("q", text.trim());
    p.set("mode", mode);
    window.location.href = `/chat/classic/?${p.toString()}`;
  }

  return (
    <>
      <Nav />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-0 px-0 sm:px-5 md:grid-cols-[17rem_1fr] md:py-6" style={{ minHeight: "calc(100dvh - 3.5rem)" }}>
        {/* sidebar — agent-first */}
        <aside className="border-b border-border bg-surface/50 p-3 md:rounded-l-2xl md:border md:border-r-0">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">Agents</p>
            <Link href="/dashboard/classic" className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-muted hover:text-foreground">+ New</Link>
          </div>
          <ul className="space-y-0.5">
            {peer && !agents.some((a) => a.id === peer) && (
              <SideRow id={peer} did={peer} sub="consulting" state={stateOf(peer)} active={active === peer} onClick={() => setActive(peer)} />
            )}
            {agents.map((a) => (
              <SideRow key={a.address} id={a.label || a.id} did={a.did} sub={a.id} state={stateOf(a.id)} active={active === a.id} onClick={() => setActive(a.id)} />
            ))}
            {agents.length === 0 && !peer && (
              <li className="px-2 py-3 text-[13px] text-muted-2">No agents in this browser. <Link href="/dashboard/classic" className="underline">Create one</Link>.</li>
            )}
          </ul>
          <div className="mt-5 flex items-center justify-between px-2 pb-2">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">Groups</p>
            <Link href="/chat/classic/" className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-muted hover:text-foreground">+ New</Link>
          </div>
          <p className="px-2 text-[12.5px] text-muted-2">Several of your agents in one thread. Groups open in the live chat.</p>
        </aside>

        {/* thread */}
        <section className="flex min-h-[70dvh] flex-col border-border bg-background md:rounded-r-2xl md:border">
          <header className="flex items-center gap-3 border-b border-border px-5 py-3">
            {active ? <RhinoAvatar did={activeDid} name={active} state={stateOf(active)} size={32} /> : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{active || DASH}</p>
              <p className="font-mono text-[10.5px] text-muted-2">preview of the thread · the live engine opens on Send</p>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            <Bubble me>Is lido.fi safe to stake with, and should I pay its 402?</Bubble>

            <div className="flex gap-3">
              {active && <RhinoAvatar did={activeDid} name={active} size={28} />}
              <div className="max-w-xl">
                <div className="rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3 text-[14px] leading-relaxed">
                  [signed answer — the reply, with each claim tied to a source]
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[10.5px]">
                  <Chip cls="bg-emerald/10 text-emerald ring-emerald/25">signed ✓</Chip>
                  <Chip>[N] sources</Chip>
                  <Chip>[N] TOKEN</Chip>
                </div>
              </div>
            </div>

            {/* NEEDS-YOU / over-cap */}
            <div className="ml-10 max-w-xl rounded-2xl border border-foreground/80 bg-background p-4 shadow-[0_8px_24px_-16px_rgba(10,14,39,.35)]">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-foreground px-2 py-0.5 font-mono text-[10.5px] font-semibold text-background">NEEDS YOU</span>
                <span className="font-mono text-[11px] text-muted-2">over cap</span>
              </div>
              <p className="mt-2 text-[14px]">
                Pay <span className="font-mono">[amount] TOKEN</span> to <span className="font-mono">[payee]</span> — that&apos;s over your <span className="font-mono">[cap]</span>{" "}per-payment cap, so it&apos;s held until you decide.
              </p>
              {decision ? (
                <p className="mt-3 font-mono text-[12px] text-muted">
                  {decision === "allowed" ? "allowed once — the cap stays as it is" : decision === "ask" ? "asked the agent for more before paying" : "denied — nothing was paid"} · recorded
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setDecision("allowed")} className="rounded-full bg-foreground px-4 py-1.5 text-[13px] font-semibold text-background">Allow once</button>
                  <button onClick={() => setDecision("ask")} className="rounded-full border border-border px-4 py-1.5 text-[13px]">Ask more</button>
                  <button onClick={() => setDecision("denied")} className="rounded-full border border-border px-4 py-1.5 text-[13px] text-red-600">Deny</button>
                </div>
              )}
            </div>
          </div>

          {/* composer */}
          <div className="border-t border-border p-3">
            <div className="rounded-2xl border border-border bg-surface/60 p-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={2}
                placeholder={active ? `Message ${active}` : "Message your agent"}
                className="w-full resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none"
                aria-label="Message"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-[12px]" role="radiogroup" aria-label="Mode">
                  {(["normal", "pro"] as const).map((m) => (
                    <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                      className={`rounded-full px-3 py-1 ${mode === m ? "bg-foreground text-background" : "text-muted"}`}>
                      {m === "normal" ? "Normal" : "Pro"}
                    </button>
                  ))}
                </div>
                <button onClick={send} className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-semibold text-white">Send →</button>
              </div>
            </div>
            <p className="mt-2 px-1 font-mono text-[11px] text-muted-2">
              every reply signed · Normal is free · Pro priced by depth, from {isNum(proFrom) ? proFrom : DASH} TOKEN
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SideRow({ id, did, sub, state, active, onClick }: { id: string; did: string; sub: string; state: AgentState; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left ${active ? "bg-background shadow-sm ring-1 ring-border" : "hover:bg-background/70"}`}>
        <RhinoAvatar did={did} name={sub} state={state} size={30} />
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium">{id}</span>
          <span className="block truncate font-mono text-[10.5px] text-muted-2">{sub}</span>
        </span>
      </button>
    </li>
  );
}

function Bubble({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return (
    <div className={`flex ${me ? "justify-end" : ""}`}>
      <div className="max-w-xl rounded-2xl rounded-tr-md bg-foreground px-4 py-2.5 text-[14px] text-background">{children}</div>
    </div>
  );
}

function Chip({ children, cls = "bg-surface-2 text-muted ring-border" }: { children: React.ReactNode; cls?: string }) {
  return <span className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${cls}`}>{children}</span>;
}
