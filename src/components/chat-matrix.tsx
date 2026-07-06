"use client";

import { useEffect, useRef, useState } from "react";
import { getWallet, spend, grant, PRICES } from "@/lib/wallet";

// Lightweight, safe markdown → structured HTML (bold, `code`, ### headings,
// bullet/numbered lists). No deps, escapes HTML first so answers render ordered
// and advanced like a real assistant.
function mdToHtml(src: string): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (t: string) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code style="background:rgba(127,127,127,.16);padding:1px 5px;border-radius:4px;font-size:.9em">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" style="color:#3fdda0">$1</a>');
  const lines = src.split("\n");
  let html = "", list: "ul" | "ol" | null = null;
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^#{1,3}\s+(.*)/))) { closeList(); html += `<div style="font-weight:600;margin:.6em 0 .2em">${inline(m[1])}</div>`; }
    else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (list !== "ul") { closeList(); html += '<ul style="margin:.3em 0 .3em 1.1em;list-style:disc">'; list = "ul"; } html += `<li style="margin:.15em 0">${inline(m[1])}</li>`; }
    else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) { if (list !== "ol") { closeList(); html += '<ol style="margin:.3em 0 .3em 1.2em;list-style:decimal">'; list = "ol"; } html += `<li style="margin:.15em 0">${inline(m[1])}</li>`; }
    else if (line === "") { closeList(); html += '<div style="height:.5em"></div>'; }
    else { closeList(); html += `<div>${inline(line)}</div>`; }
  }
  closeList();
  return html;
}

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
      setBusy(false);
      // typewriter reveal — calmer cadence (word-ish chunks, ~2.6s), not frantic
      const idx = { i: 0 };
      setMsgs((m) => { idx.i = m.length; return [...m, { role: "assistant", text: "" }]; });
      const step = Math.max(1, Math.round(text.length / 140));  // finer steps
      for (let c = 0; c <= text.length; c += step) {
        setMsgs((m) => m.map((mm, k) => (k === idx.i ? { ...mm, text: text.slice(0, c) } : mm)));
        await new Promise((z) => setTimeout(z, 26));             // slower, smoother
      }
      setMsgs((m) => m.map((mm, k) => (k === idx.i ? { ...mm, text } : mm)));
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Connection hiccup reaching the network brain — one more try usually gets it." }]);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-3 sm:px-4">
      {/* header — compact, always visible */}
      <div className="flex shrink-0 items-center justify-between py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full" style={{ background: "#3fdda0", boxShadow: "0 0 10px #3fdda0" }} />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">Network</span>
          <span className="hidden text-[12px] text-muted-2 sm:inline">grounded · signed · live web</span>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-muted-2">{balance.toLocaleString()}<span className="hidden sm:inline"> TOKEN</span></span>
          <button onClick={() => grant(250, "demo top-up").then(setBalance)} className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:text-foreground hover:border-muted-2">Top up</button>
        </div>
      </div>

      {/* conversation — fills remaining space, scrolls, min-h-0 so it never collapses */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-[26px]"
                 style={{ background: "linear-gradient(135deg,rgba(63,221,160,.18),rgba(124,154,255,.14))", boxShadow: "0 0 40px rgba(63,221,160,.18)" }}>◇</div>
            <h2 className="text-[24px] font-semibold tracking-tight text-foreground sm:text-[28px]">How can the network help?</h2>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">Ask about an agent, a merchant, a price, or anything live on the web — answers are grounded, and where verifiable, cryptographically signed.</p>
          </div>
        )}
        <div className="space-y-5 sm:space-y-6">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2.5 sm:gap-3"}>
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]"
                     style={{ background: "linear-gradient(135deg,rgba(63,221,160,.2),rgba(124,154,255,.16))", color: "#3fdda0" }}>◇</div>
              )}
              {m.role === "user"
                ? <div className="max-w-[82%] rounded-3xl bg-accent px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">{m.text}</div>
                : <div className="max-w-[85%] pt-0.5 text-[15px] leading-[1.75] text-foreground" dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} />}
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]" style={{ background: "linear-gradient(135deg,rgba(63,221,160,.2),rgba(124,154,255,.16))", color: "#3fdda0" }}>◇</div>
              <span className="inline-flex items-center gap-1 pt-2.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "#3fdda0", animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "#3fdda0", animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "#3fdda0", animationDelay: "300ms" }} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* composer — 2028 glass: blur, gradient hairline, big touch target, safe-area */}
      <div className="shrink-0 pb-3 pt-1" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-end gap-2 rounded-[22px] border border-border/80 bg-surface/70 px-3 py-2 backdrop-blur-xl transition-all focus-within:border-accent/60 focus-within:shadow-[0_0_0_3px_rgba(63,221,160,.08)]">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1} placeholder="Message the network…"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] text-foreground outline-none placeholder:text-muted-2"
          />
          <button
            onClick={send} disabled={busy || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-[17px] text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            aria-label="Send"
          >↑</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-2">{PRICES.chatMessage} TOKEN / message · signed where verifiable</p>
      </div>
    </div>
  );
}
