"use client";

import { useEffect, useRef, useState } from "react";
import { getWallet, spend, grant, PRICES } from "@/lib/wallet";

// The chat surface: a DELICATE living matrix (fine lines, low opacity, slow drift — a quiet
// backdrop, not a toy) with the chat bar underneath. Connected to the 0n1x brain (the signed
// LLM portal, self-healing via portal.json). Shown only after sign-in.

const HUB = "https://rhinogent.com";
let PORTAL = "https://onyx-actions.onrender.com";
// ALWAYS re-fetch portal.json — the local tunnel URL rotates, so a latched value
// goes stale and the chat hits a dead endpoint. Fresh resolve every call.
async function resolvePortal() {
  try {
    const r = await fetch(`${HUB}/portal.json?t=${Date.now()}`, { cache: "no-store" });
    const d = await r.json();
    if (d?.portal && /^https:\/\//.test(d.portal)) PORTAL = d.portal;
  } catch {}
  return PORTAL;
}


type Msg = { role: "user" | "assistant"; text: string };

export function ChatMatrix() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { resolvePortal(); }, []);
  useEffect(() => {
    getWallet().then((w) => setBalance(w.balance));
    const onCh = (e: Event) => setBalance((e as CustomEvent).detail.balance);
    window.addEventListener("wallet:change", onCh);
    return () => window.removeEventListener("wallet:change", onCh);
  }, []);
  useEffect(() => { scroller.current?.scrollTo(0, scroller.current.scrollHeight); }, [msgs, busy]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    const pay = await spend(PRICES.chatMessage, "premium chat");
    if (!pay.ok) {
      setMsgs((m) => [...m, { role: "assistant", text: `Premium chat costs ${PRICES.chatMessage} TOKEN per message and your balance is ${pay.balance}. Tap “+250 grant” to top up (demo), then try again.` }]);
      return;
    }
    setInput(""); setMsgs((m) => [...m, { role: "user", text: q }]); setBusy(true);
    async function ask(): Promise<string> {
      const portal = await resolvePortal();
      const r = await fetch(`${portal}/v1/chat`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      return d.reply || d.reason || "…";
    }
    try {
      let text = "";
      try { text = await ask(); }
      catch { await new Promise((z) => setTimeout(z, 600)); text = await ask(); } // re-resolve + retry once
      setMsgs((m) => [...m, { role: "assistant", text }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Connection hiccup reaching the network brain — one more try usually gets it." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] w-full max-w-3xl flex-col px-4">
      {/* minimal pro header — balance chip, no clutter */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald" style={{ background: "#3fdda0", boxShadow: "0 0 8px #3fdda0" }} />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">Network</span>
          <span className="text-[12px] text-muted-2">grounded · signed</span>
        </div>
        <div className="flex items-center gap-2.5 text-[12px]">
          <span className="text-muted-2">{balance.toLocaleString()} <span className="text-muted-2/70">TOKEN</span></span>
          <button onClick={() => grant(250, "demo top-up").then(setBalance)} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:text-foreground hover:border-muted-2">Top up</button>
        </div>
      </div>

      {/* conversation — flat, clean, no backdrop (Gemini/Claude style) */}
      <div ref={scroller} className="flex-1 overflow-y-auto py-6">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h2 className="text-[26px] font-semibold tracking-tight text-foreground">How can the network help?</h2>
            <p className="mt-2 text-[14px] text-muted">Ask about an agent, a merchant, a price — answers are grounded, and where verifiable, cryptographically signed.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Is stripe.com legit?", "Verify this agent's reputation", "What is Proof of Agent Execution?"].map((s) => (
                <button key={s} onClick={() => setInput(s)} className="rounded-full border border-border px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-muted-2 hover:text-foreground">{s}</button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-6">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]" style={{ background: "rgba(63,221,160,.12)", color: "#3fdda0" }}>◇</div>
              )}
              <div className={m.role === "user"
                ? "max-w-[78%] rounded-2xl bg-accent px-4 py-2.5 text-[14.5px] leading-relaxed text-white"
                : "max-w-[80%] pt-0.5 text-[14.5px] leading-[1.7] text-foreground"}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]" style={{ background: "rgba(63,221,160,.12)", color: "#3fdda0" }}>◇</div>
              <span className="inline-flex items-center gap-1 pt-2.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* composer — clean rounded field, send inside */}
      <div className="mb-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2 transition-colors focus-within:border-accent/50">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1} placeholder="Message the network…"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14.5px] text-foreground outline-none placeholder:text-muted-2"
          />
          <button
            onClick={send} disabled={busy || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-30"
            aria-label="Send"
          >
            ↑
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-2">{PRICES.chatMessage} TOKEN per message · signed where verifiable</p>
      </div>
    </div>
  );
}
