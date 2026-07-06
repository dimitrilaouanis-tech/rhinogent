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
  const [pro, setPro] = useState<boolean>(false);   // Pro = burn token, full tools + web; Normal = free
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { resolvePortal(); }, []);
  useEffect(() => {
    getWallet().then((w) => setBalance(w.balance));
    const onCh = (e: Event) => setBalance((e as CustomEvent).detail.balance);
    window.addEventListener("wallet:change", onCh);
    return () => window.removeEventListener("wallet:change", onCh);
  }, []);
  useEffect(() => { scroller.current?.scrollTo(0, scroller.current.scrollHeight); }, [msgs, busy]);

  // SAVE CHATS (Gemini/Claude style) — restore the last conversation on load, persist on change
  useEffect(() => {
    try { const s = localStorage.getItem("rhinogent.chat.current"); if (s) setMsgs(JSON.parse(s)); } catch { /**/ }
  }, []);
  useEffect(() => {
    try {
      if (msgs.length) localStorage.setItem("rhinogent.chat.current", JSON.stringify(msgs.slice(-100)));
    } catch { /**/ }
  }, [msgs]);
  function newChat() {
    // archive the current thread into history before clearing
    try {
      if (msgs.length) {
        const hist = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
        const title = (msgs.find((m) => m.role === "user")?.text || "Chat").slice(0, 48);
        hist.unshift({ id: `${msgs.length}-${title.length}`, title, msgs: msgs.slice(-100) });
        localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.slice(0, 30)));
      }
    } catch { /**/ }
    setMsgs([]);
    try { localStorage.removeItem("rhinogent.chat.current"); } catch { /**/ }
  }

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    // PRO burns a token (full tools + web + signed). NORMAL is free (clean conversational).
    if (pro) {
      const pay = await spend(PRICES.chatMessage, "pro chat");
      if (!pay.ok) {
        setMsgs((m) => [...m, { role: "assistant", text: `Pro mode costs ${PRICES.chatMessage} TOKEN per message and your balance is ${pay.balance}. Switch to **Normal** (free) or tap **Top up**.` }]);
        return;
      }
    }
    setInput(""); setMsgs((m) => [...m, { role: "user", text: q }]); setBusy(true);
    async function ask(): Promise<string> {
      const portal = await resolvePortal();
      const r = await fetch(`${portal}/v1/chat`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, tier: pro ? "pro" : "free" }),
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
      {/* header — 0n1x network + Pro/Normal tier toggle */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full" style={{ background: "#3fdda0", boxShadow: "0 0 10px #3fdda0" }} />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">0n1x network</span>
          <button onClick={newChat} className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:text-foreground hover:border-muted-2" title="New chat">+ New</button>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          {/* tier toggle — quiet, clear */}
          <div className="flex items-center rounded-full bg-surface p-0.5 text-[11px]">
            <button onClick={() => setPro(false)} className={`rounded-full px-2.5 py-1 font-medium transition-all ${!pro ? "bg-background text-foreground shadow-sm" : "text-muted-2"}`}>Normal</button>
            <button onClick={() => setPro(true)} className={`rounded-full px-2.5 py-1 font-medium transition-all ${pro ? "text-white shadow-sm" : "text-muted-2"}`} style={pro ? { background: "#3fdda0" } : undefined}>Pro</button>
          </div>
          <span className="text-muted-2">{balance.toLocaleString()}</span>
          <button onClick={() => grant(250, "demo top-up").then(setBalance)} className="rounded-lg px-2 py-1 text-[11px] text-muted-2 transition-colors hover:text-foreground">Top up</button>
        </div>
      </div>

      {/* conversation — Gemini/Kimi calm: soft user bubble, clean assistant text, roomy */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl text-[22px] text-accent" style={{ background: "rgba(63,221,160,.10)" }}>◇</div>
            <h2 className="text-[25px] font-medium tracking-tight text-foreground sm:text-[30px]">How can I help?</h2>
            <p className="mt-2.5 max-w-sm text-[14px] leading-relaxed text-muted-2">Ask anything. Switch to <span className="text-foreground">Pro</span> for signed, web-grounded answers.</p>
          </div>
        )}
        <div className="space-y-6 sm:space-y-7">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {m.role === "user"
                ? <div className="max-w-[80%] rounded-[20px] bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-foreground">{m.text}</div>
                : <div className="chat-md max-w-[90%] text-[15px] leading-[1.75] text-foreground" dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} />}
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <span className="inline-flex items-center gap-1.5 pt-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* composer — clean & professional; Pro mode adds a quiet jade cue */}
      <div className="shrink-0 pb-3 pt-1" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className={`flex items-end gap-2 rounded-[24px] border bg-surface px-3.5 py-2 transition-all ${pro ? "border-accent/40" : "border-border"}`}
             style={pro ? { boxShadow: "0 0 0 3px rgba(63,221,160,.07)" } : undefined}>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1} placeholder={pro ? "Ask for a signed, web-grounded answer…" : "Message 0n1x…"}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] text-foreground outline-none placeholder:text-muted-2"
          />
          <button
            onClick={send} disabled={busy || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-25"
            style={{ background: "#3fdda0" }}
            aria-label="Send"
          >↑</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-2">
          {pro
            ? <><span style={{ color: "#3fdda0" }}>Pro</span> · signed + web-grounded · {PRICES.chatMessage} TOKEN per message</>
            : <>Normal · free · general answers</>}
        </p>
      </div>
    </div>
  );
}
