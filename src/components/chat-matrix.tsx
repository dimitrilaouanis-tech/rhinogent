"use client";

import { useEffect, useRef, useState } from "react";
import { getWallet, spend, grant, PRICES } from "@/lib/wallet";
import { RhinoMark } from "@/components/rhino";

// Lightweight, safe markdown → structured HTML (bold, `code`, ### headings,
// bullet/numbered lists). No deps, escapes HTML first so answers render ordered
// and advanced like a real assistant.
function mdToHtml(src: string): string {
  // escape quotes too — the link href lands inside an attribute, and an unescaped " in a
  // portal reply would break out of it (attribute-injection XSS on an untrusted upstream)
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const inline = (t: string) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code style="background:rgba(127,127,127,.16);padding:1px 5px;border-radius:4px;font-size:.9em">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_all, label, href) =>
      /["'<>`]/.test(href) ? `${label} (${href})` : `<a href="${href}" target="_blank" rel="noreferrer noopener" style="color:#3fdda0">${label}</a>`);
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

const GUEST_FREE_MESSAGES = 3;

export function ChatMatrix({ guest = false }: { guest?: boolean } = {}) {
  const [gate, setGate] = useState(false);   // guest hit the free-message limit
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [pro, setPro] = useState<boolean>(false);   // Pro = burn token, full tools + web; Normal = free
  const [history, setHistory] = useState<{ id: string; title: string; msgs: Msg[]; agent?: { callsign: string; address: string } }[]>([]);
  const [sidebar, setSidebar] = useState(false);   // mobile drawer open
  const [rail, setRail] = useState(false);         // desktop sidebar collapsed to icon rail (Gemini-style)
  const [copied, setCopied] = useState(-1);        // which message index was just copied
  const [agent, setAgent] = useState<{ callsign: string; address: string; nick?: string } | null>(null);   // the verified agent handling THIS chat (renameable, persisted)
  const poolRef = useRef<{ callsign: string; address: string }[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const loadHistory = () => { try { setHistory(JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]")); } catch { setHistory([]); } };
  // pull a pool of REAL verified agents from the signed census, assign one per chat.
  // The identity PERSISTS across refreshes (localStorage) and can be renamed (nick).
  const saveAgent = (a: { callsign: string; address: string; nick?: string } | null) => {
    try { if (a) localStorage.setItem("rhinogent.chat.agent", JSON.stringify(a)); } catch { /**/ }
  };
  const assignAgent = () => {
    const pool = poolRef.current;
    if (pool.length) { const a = pool[Math.floor((Date.now() / 1000) % pool.length)]; setAgent(a); saveAgent(a); return a; }
    return null;
  };
  const renameAgent = () => {
    if (!agent) return;
    const nick = window.prompt("Name your agent", agent.nick || agent.callsign);
    if (nick && nick.trim()) { const a = { ...agent, nick: nick.trim().slice(0, 24) }; setAgent(a); saveAgent(a); }
  };
  useEffect(() => {
    // restore the persisted identity first — same agent after refresh
    try { const s = localStorage.getItem("rhinogent.chat.agent"); if (s) setAgent(JSON.parse(s)); } catch { /**/ }
    fetch("/census2/shard-000.json", { cache: "no-store" }).then((r) => r.json()).then((arr) => {
      poolRef.current = (arr || []).slice(0, 400).map((x: { callsign: string; address: string }) => ({ callsign: x.callsign, address: x.address }));
      setAgent((cur) => cur || assignAgent());
    }).catch(() => {});
  }, []);

  useEffect(() => { resolvePortal(); }, []);
  useEffect(() => {
    getWallet().then((w) => setBalance(w.balance));
    const onCh = (e: Event) => setBalance((e as CustomEvent).detail.balance);
    window.addEventListener("wallet:change", onCh);
    return () => window.removeEventListener("wallet:change", onCh);
  }, []);
  // ODOMETER: the shown balance COUNTS to the real one (fast digit ticking, Claude-style)
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const from = shown, to = balance;
    if (from === to) return;
    const t0 = performance.now(), dur = 550;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);                     // ease-out cubic — fast start, soft land
      setShown(Math.round((from + (to - from) * e) * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);
  // DAILY CHECK-IN — first message of the day earns TOKEN (streaks: d3+15, d7+25)
  function dailyCheckin() {
    if (guest) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const last = localStorage.getItem("rhinogent.checkin.last");
      if (last === today) return;
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      let streak = parseInt(localStorage.getItem("rhinogent.checkin.streak") || "0", 10) || 0;
      streak = last === yesterday ? streak + 1 : 1;
      localStorage.setItem("rhinogent.checkin.last", today);
      localStorage.setItem("rhinogent.checkin.streak", String(streak));
      const amt = streak >= 7 ? 25 : streak >= 3 ? 15 : 10;
      grant(amt, `daily check-in day ${streak}`).then(setBalance);
    } catch { /**/ }
  }
  useEffect(() => { scroller.current?.scrollTo(0, scroller.current.scrollHeight); }, [msgs, busy]);
  useEffect(() => { loadHistory(); }, []);   // populate the sidebar chat list

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
        hist.unshift({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, title, msgs: msgs.slice(-100), agent });
        localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.slice(0, 30)));
      }
    } catch { /**/ }
    setMsgs([]);
    assignAgent();   // fresh chat → a new verified agent takes it
    try { localStorage.removeItem("rhinogent.chat.current"); } catch { /**/ }
  }

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    // GUEST PREVIEW: 3 free Normal messages, then the soft create-account gate.
    // The credit is only CONSUMED on a successful answer (a network hiccup shouldn't eat a preview).
    let consumeGuest = false;
    if (guest) {
      let used = 0;
      try { used = parseInt(localStorage.getItem("rhinogent.chat.guestUsed") || "0", 10) || 0; } catch { /**/ }
      if (pro || used >= GUEST_FREE_MESSAGES) { setGate(true); return; }
      consumeGuest = true;
    }
    // PRO burns a token (full tools + web + signed). NORMAL is free (clean conversational).
    if (pro) {
      const pay = await spend(PRICES.chatMessage, "pro chat");
      if (!pay.ok) {
        setMsgs((m) => [...m, { role: "assistant", text: `Pro mode costs ${PRICES.chatMessage} TOKEN per message and your balance is ${pay.balance}. Switch to **Normal** (free) or tap **Top up**.` }]);
        return;
      }
    }
    setInput(""); setMsgs((m) => [...m, { role: "user", text: q }]); setBusy(true);
    dailyCheckin();   // first message of the day earns TOKEN — the balance visibly climbs
    async function ask(): Promise<string> {
      const portal = await resolvePortal();
      const r = await fetch(`${portal}/v1/chat`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, tier: pro ? "pro" : "free" }),
      });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      let out = d.reply || d.reason || "…";
      // strip any leaked tool-call syntax the model emits as text (never show raw tags)
      out = out.replace(/<\/?(web_search|tool_call|function|tool|invoke)[^>]*>/gi, "")
               .replace(/\{"query"\s*:\s*"[^"]*"\}/g, "")
               .replace(/^\s*[\r\n]+/, "").trim();
      return out || "…";
    }
    try {
      let text = "";
      try { text = await ask(); }
      catch { await new Promise((z) => setTimeout(z, 600)); text = await ask(); } // re-resolve + retry once
      if (consumeGuest) {
        try {
          const used = parseInt(localStorage.getItem("rhinogent.chat.guestUsed") || "0", 10) || 0;
          localStorage.setItem("rhinogent.chat.guestUsed", String(used + 1));
        } catch { /**/ }
      }
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
      // refund the Pro token — no answer means no charge
      if (pro && !guest) { try { grant(PRICES.chatMessage, "pro chat refund (no answer)").then(setBalance); } catch { /**/ } }
      setMsgs((m) => [...m, { role: "assistant", text: "Connection hiccup reaching the network brain — one more try usually gets it." }]);
      setBusy(false);
    }
  }

  // Gemini-style: the ☰ toggles the rail between a slim icon strip and the full panel
  const Sidebar = (
    <div className={`flex h-full ${rail ? "w-[60px]" : "w-64"} shrink-0 flex-col border-r border-border/60 bg-gradient-to-b from-surface/50 to-surface/20 backdrop-blur-sm transition-all duration-300 ease-out`}>
      <div className={rail ? "flex flex-col items-center gap-1 p-2.5" : "flex items-center gap-1.5 p-3"}>
        <button onClick={() => setRail((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] text-muted transition-colors hover:bg-surface hover:text-foreground"
          title={rail ? "Expand menu" : "Collapse menu"}>☰</button>
        <button onClick={() => { newChat(); setSidebar(false); loadHistory(); }}
          className={rail
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] text-muted transition-colors hover:bg-surface hover:text-foreground"
            : "flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-muted-2"}
          title="New chat">
          <span className="text-[16px]">＋</span>{!rail && "New chat"}
        </button>
      </div>
      {!rail && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-2">Recent</p>
          {history.length === 0 && <p className="px-2 py-2 text-[12px] text-muted-2">No saved chats yet.</p>}
          {history.map((h) => (
            <button key={h.id} onClick={() => { setMsgs(h.msgs); if (h.agent) setAgent(h.agent); setSidebar(false); }}
              className="group/item mb-0.5 block w-full rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-border/60 hover:bg-surface/70">
              <span className="block truncate text-[13px] text-foreground">{h.title}</span>
              {h.agent && <span className="block truncate text-[10px] text-muted-2 transition-colors group-hover/item:text-muted">◆ {h.agent.callsign} <span style={{ color: "#3fdda0" }}>✓</span></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full">
      {/* GUEST soft gate — shown after the free preview messages */}
      {gate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setGate(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-background p-7 text-center shadow-2xl">
            <RhinoMark className="mx-auto h-11 w-11" />
            <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-foreground">Keep {agent ? (agent.nick || agent.callsign) : "your agent"}.</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              You&apos;ve met your agent. Create a free account and it stays <b className="text-foreground">yours</b> —
              same agent, its memory kept, plus <b className="text-foreground">500 tokens</b> and ⚡ Pro answers.
            </p>
            <a href="/dashboard" className="mt-5 block w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">Create free account</a>
            <button onClick={() => setGate(false)} className="mt-2.5 text-[12px] text-muted-2 transition-colors hover:text-foreground">Not now</button>
          </div>
        </div>
      )}
      {/* desktop sidebar */}
      <aside className="hidden md:flex">{Sidebar}</aside>
      {/* mobile drawer */}
      {sidebar && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebar(false)} />
          <div className="relative z-50 h-full bg-background">{Sidebar}</div>
        </div>
      )}

      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-3 sm:px-4">
      {/* header — 0n1x network + Pro/Normal tier toggle */}
      <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-2 py-3">
        <div className="relative flex items-center gap-2.5">
          <button onClick={() => setSidebar(true)} className="rounded-lg border border-border px-2 py-1 text-[13px] text-muted transition-colors hover:text-foreground hover:border-muted-2 md:hidden" title="Chats">☰</button>
          <span className="flex h-2 w-2 rounded-full" style={{ background: "#3fdda0", boxShadow: "0 0 10px #3fdda0" }} />
          {agent ? (
            <button onClick={renameAgent} className="group/name flex items-center gap-1.5" title="Rename your agent">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">{agent.nick || agent.callsign}</span>
              <span className="text-[12px]" style={{ color: "#3fdda0" }} title="verified agent">✓</span>
              <span className="text-[11px] text-muted-2 opacity-0 transition-opacity group-hover/name:opacity-100">✎</span>
            </button>
          ) : (
            <span className="text-[15px] font-semibold tracking-tight text-foreground">0n1x network</span>
          )}
        </div>
        {/* tier toggle — CENTERED, Gemini-style */}
        <div className="order-3 flex w-full justify-center sm:absolute sm:left-1/2 sm:order-none sm:w-auto sm:-translate-x-1/2">
          <div className="flex items-center gap-0.5 rounded-full border border-border/70 bg-surface/60 p-[3px] text-[11px] shadow-inner backdrop-blur">
            <button onClick={() => setPro(false)}
              className={`rounded-full px-3.5 py-[5px] tracking-wide transition-all duration-200 ${!pro ? "bg-background font-semibold text-foreground shadow-[0_1px_4px_rgba(0,0,0,.12)]" : "font-medium text-muted-2 hover:text-muted"}`}>
              Normal
            </button>
            <button onClick={() => setPro(true)}
              className={`rounded-full px-3.5 py-[5px] tracking-wide transition-all duration-200 ${pro ? "pro-badge font-semibold shadow-[0_1px_8px_rgba(63,221,160,.35)]" : "font-medium text-muted-2 hover:text-muted"}`}>
              <span className={pro ? "" : "opacity-60"}>⚡</span> Pro
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="tabular-nums text-muted-2">{shown.toLocaleString()}</span>
          <button onClick={() => grant(250, "demo top-up").then(setBalance)} className="rounded-lg px-2 py-1 text-[11px] text-muted-2 transition-colors hover:text-foreground">Top up</button>
        </div>
      </div>

      {/* conversation — Gemini/Kimi calm: soft user bubble, clean assistant text, roomy */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <RhinoMark className="mb-5 h-11 w-11 opacity-90" />
            <h2 className="text-[25px] font-medium tracking-tight text-foreground sm:text-[30px]">How can I help?</h2>
            {agent && <p className="mt-1.5 text-[13px]"><span className="text-muted-2">You're talking with </span><span className="text-foreground">{agent.callsign}</span> <span style={{ color: "#3fdda0" }}>✓ verified agent</span></p>}
            <p className="mt-2.5 max-w-sm text-[14px] leading-relaxed text-muted-2">Ask anything. Switch to <span className="text-foreground">Pro</span> for signed, web-grounded answers.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3fdda0" }} /> Guardrails on · safe &amp; signed
            </span>
          </div>
        )}
        <div className="space-y-6 sm:space-y-7">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "group flex flex-col items-start"}>
              {m.role === "user"
                ? <div className="max-w-[80%] rounded-[18px] rounded-br-[6px] border border-border/50 bg-surface/80 px-4 py-2.5 text-[15px] leading-relaxed text-foreground shadow-[0_1px_3px_rgba(0,0,0,.06)]">{m.text}</div>
                : <>
                    {/* identity chip on the FIRST reply — the named-verified-agent moment, felt */}
                    {agent && i === msgs.findIndex((x) => x.role === "assistant") && (
                      <a href="/census" className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-2 transition-colors hover:border-muted-2 hover:text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3fdda0" }} />
                        Answered by <span className="text-foreground">{agent.nick || agent.callsign}</span>
                        <span style={{ color: "#3fdda0" }}>✓</span>
                        <span className="hidden sm:inline">· verified on the live network →</span>
                      </a>
                    )}
                    <div className="chat-md max-w-[90%] text-[15px] leading-[1.75] text-foreground" dangerouslySetInnerHTML={{ __html: mdToHtml(m.text) }} />
                    {m.text && (
                      <button
                        onClick={() => { navigator.clipboard?.writeText(m.text); setCopied(i); setTimeout(() => setCopied(-1), 1400); }}
                        className="mt-1.5 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-2 opacity-70 transition-all hover:bg-surface hover:text-foreground hover:opacity-100"
                        aria-label="Copy"
                      >
                        {copied === i ? "✓ Copied" : "⧉ Copy"}
                      </button>
                    )}
                  </>}
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
        <div className={`flex items-end gap-2 rounded-[24px] px-3.5 py-2 transition-all ${pro ? "pro-composer" : "border border-border bg-surface"}`}>
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
    </div>
  );
}
