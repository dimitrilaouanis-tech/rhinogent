"use client";

import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from "react";
import { getWallet, spend, grant, reward, PRICES } from "@/lib/wallet";
import { RhinoMark } from "@/components/rhino";
import { loadAgents, addAgent, renameAgent as renameMinted, MAX_SLOTS } from "@/lib/agents";
import { pullAgents } from "@/lib/agent-sync";
import { queueThreadSync, flushThreadSync, pullThreadsFull, reconcileHistory, rebindThreadKey, adoptThread, deleteThread, restoreThread, backfillThreads } from "@/lib/chat-sync";
import { recordIntake, flushIntake } from "@/lib/census-intake";
import { supabase } from "@/lib/supabase";

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


// ALWAYS-ON fallback: a trained client-side knowledge base so Normal-tier NEVER goes offline.
// If the live brain/tunnel is unreachable, we still answer from this instantly (train by adding rows).
const KB: [RegExp, string][] = [
  [/(what|whats|about).{0,8}0n1x|^0n1x/i, "0n1x is an ecosystem for AI agents — a neutral, cryptographic layer where agents get an identity, verify each other, transact, and earn. The promise: **verify before you pay.** Every record is Ed25519/EIP-191 signed and publicly recomputable."],
  [/rhinogent|the agent you own/i, "Rhinogent is **the agent you own** — a self-custody identity + wallet you mint in your browser (your keys never leave your device). It lives inside 0n1x and earns tokens for verified work."],
  [/verify before|before .{0,4}pay|counterparty/i, "Before an agent settles a payment it asks 0n1x whether the counterparty is real and gets a **signed verdict** (PROCEED / REVIEW / HOLD). Payment rails verify the payment; 0n1x verifies the thing you are paying for."],
  [/earn|token|reward|make money|get paid/i, "Your agent **earns** TOKENs for contributing data that verifies — signed, matching the census. Good verified data pays; bad or unsigned data earns nothing. New accounts get a free 500-token grant."],
  [/self.?custody|keys|wallet|mint/i, "**Self-custody:** your keys are generated in your browser and never leave your device — 0n1x holds zero keys, so there is nothing to seize, freeze, or leak."],
  [/how many|census|count|registered|how big/i, "The 0n1x census has **2,900,000+** registered agents and climbing, with **147** that clear all four verification legs. It is Merkle-rooted, so anyone can recompute the count from public shards."],
  [/how.{0,12}verify|prove.{0,8}agent|is it real/i, "AI agents verify each other cryptographically: (1) signed identity (did:pkh, ERC-8004), (2) proof of what it actually did, (3) a liveness challenge, (4) verify-before-you-pay on the counterparty, (5) spend caps — not human paperwork."],
  [/pro|signed|web|premium/i, "**Pro** answers are grounded in a live web search, cryptographically signed (Ed25519), and come with a ProofCard you can verify yourself. Switch the toggle to Pro for those."],
  [/stored|store|saved|save.{0,6}chat|privacy|retain|kept|logged/i, "**Privacy:** Normal-tier conversations are **not stored on any 0n1x server**. Your chat stays in your own browser and syncs to your account only when you are signed in. 0n1x custodies zero keys and keeps no server-side copy of Normal chats."],
  [/\bcli\b|npm|install|command.?line|on1x init|@0n1x|package/i, "There is **no CLI or npm package**. 0n1x is fetch-first and browser-native: mint a self-custody agent at rhinogent.com/dashboard and read the signed feeds (census_manifest.json, facts.json) over plain HTTP. Any `npm install @0n1x/...` command is not real."],
  [/cutoff|training data|knowledge.{0,6}(date|cut)/i, "I answer 0n1x questions from signed, live facts, not a frozen training snapshot. For live web-grounded answers like today's date or current headlines, switch to **Pro**."],
  [/hello|^hi|^hey|who are you|help/i, "Hey — I am the 0n1x assistant. Ask me about the ecosystem, Rhinogent agents, verify-before-you-pay, self-custody, or how agents earn. For a live, signed answer, switch to **Pro**."],
];
// FABRICATION GUARD — a raw LLM confidently invents 0n1x specifics (a fake CLI, a wrong storage
// policy, a stale knowledge cutoff). For a TRUST product that is a brand liability, so any Normal
// reply tripping these is replaced with the correct grounded fact BEFORE it renders.
function groundGuard(reply: string): string {
  const bad: [RegExp, string][] = [
    [/npm\s+install|@0n1x\/|on1x\s+(init|pay|earn|submit)|install\s+-g|\bon1x\s+cli\b/i, "There is **no CLI or npm package** for 0n1x. It is fetch-first and browser-native: mint an agent at rhinogent.com/dashboard and read the signed JSON feeds over plain HTTP. Any `npm install @0n1x/...` command is not real."],
    [/stored?\s+(on|in|at)\s+(the\s+)?0n1x|0n1x\s+servers?|we\s+store\s+your\s+(chat|conversation|message)|server[- ]side\s+(copy|storage)\s+of\s+your/i, "**Privacy:** Normal-tier conversations are **not** stored on any 0n1x server. Your chat stays in your own browser and only syncs to your account if you sign in. 0n1x keeps no server-side copy of Normal chats and custodies zero keys."],
    [/knowledge\s+cutoff|training\s+data\s+(is\s+)?(from|up\s+to)|December\s+2023|as\s+of\s+2023/i, "For live, current answers like today's date or the latest headlines, switch to **Pro** (web-grounded and signed). On Normal I answer 0n1x questions from signed facts."],
  ];
  for (const [re, fix] of bad) if (re.test(reply)) return fix;
  return reply;
}
function localAnswer(q: string): string {
  for (const [re, a] of KB) if (re.test(q)) return a;
  return "I am 0n1x's assistant. I can explain the ecosystem, how agents verify each other, verify-before-you-pay, self-custody identity, and how agents earn — ask me any of those. For a live, signed answer, switch to **Pro**.";
}


// Match the user's question against the PUBLISHED trained KB (chat_kb.json — the brain's answer-cache).
function bestKb(q: string, kb: { q: string; a: string }[]): string | null {
  if (!kb || !kb.length) return null;
  const words = (q.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  if (!words.length) return null;
  let best: { q: string; a: string } | null = null, bestScore = 0;
  for (const e of kb) {
    const ew = new Set(e.q.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
    let sc = 0; for (const w of words) if (ew.has(w)) sc++;
    const score = sc / Math.max(1, words.length);
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return bestScore >= 0.5 && best ? best.a : null;
}

const HUB = "https://rhinogent.com";
let PORTAL = "https://onyx-actions.onrender.com";
const WORKER = "https://onyx-chat.onyxagntc.workers.dev";   // always-on Normal-tier LLM (Cloudflare edge, no PC dependency)
const PRO_WORKER = "https://onyx-pro.onyxagntc.workers.dev";  // always-on Pro: Exa web-grounding + Ed25519-signed ProofCard

// Signed FactChips from the 0n1x registry — render verified entities as signed chips; silence (nothing)
// for entities we haven't positively verified. The value is as much in what it WITHHOLDS as what it shows.
function factChips(d: { facts?: Array<{ entity?: string; verdict?: string; confidence?: number; signature?: string; recompute_url?: string }> }): string {
  if (!Array.isArray(d?.facts) || !d.facts.length) return "";
  return "\n\n" + d.facts.map((f) =>
    `🔏 **${f.entity}** — ${f.verdict}${typeof f.confidence === "number" ? ` (${Math.round(f.confidence * 100)}%)` : ""} · signed \`${(f.signature || "").slice(0, 10)}…\` · [recompute](${f.recompute_url || "#"})`
  ).join("\n");
}
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

// Split a stored assistant message into [body, proofAnnotation]. The 🔏 proof block is
// appended text (persisted in the thread), so old and new messages both split cleanly;
// the annotation renders as a subtle collapsible chip instead of inline noise.
function splitProof(t: string): [string, string | null] {
  const i = t.indexOf("🔏");
  if (i < 0) return [t, null];
  const pre = t.slice(0, i);
  if (pre && !/\n\s*$/.test(pre)) return [t, null];   // mid-line 🔏 = content, not our annotation
  return [pre.replace(/\s+$/, ""), t.slice(i)];
}
type HistItem = { id: string; title: string; msgs: Msg[]; agent?: { callsign: string; address: string }; ts?: number };

const GUEST_FREE_MESSAGES = 3;

// ── iOS-style swipe-to-delete row (sidebar threads) ──────────────────────────
// Drag LEFT reveals a red Delete behind the row; past ~55% width = full-swipe
// delete. Pointer events cover touch AND mouse; `touch-action: pan-y` keeps the
// list scrolling vertically while horizontal drags belong to us.
const SWIPE_OPEN_W = 76;   // px of red revealed in the "armed" position
function SwipeRow({ open, onOpen, onClose, onDelete, children }: {
  open: boolean; onOpen: () => void; onClose: () => void; onDelete: () => void; children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const st = useRef<{ x: number; y: number; base: number; mode: "" | "h" | "v" }>({ x: 0, y: 0, base: 0, mode: "" });
  const moved = useRef(false);

  // parent closed us (another row opened / a delete happened) → snap shut
  useEffect(() => { if (!dragging) setDx(open ? -SWIPE_OPEN_W : 0); }, [open, dragging]);

  const down = (e: RPointerEvent) => {
    st.current = { x: e.clientX, y: e.clientY, base: open ? -SWIPE_OPEN_W : 0, mode: "" };
    moved.current = false;
  };
  const move = (e: RPointerEvent) => {
    const s = st.current;
    if (s.mode === "v") return;
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y;
    if (s.mode === "") {
      if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;          // not decided yet
      if (Math.abs(ddx) > Math.abs(ddy) * 1.2) {
        s.mode = "h"; setDragging(true);
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /**/ }
      } else { s.mode = "v"; return; }                              // vertical → let the list scroll
    }
    moved.current = true;
    const w = ref.current?.offsetWidth || 264;
    setDx(Math.max(-w, Math.min(0, s.base + ddx)));
  };
  const up = () => {
    const s = st.current;
    if (s.mode !== "h") { s.mode = ""; return; }
    setDragging(false);
    // NO full-swipe auto-delete: swiping past halfway only ARMS the row (red Delete
    // revealed) — deletion happens exclusively on the explicit tap of the red button.
    if (dx < -SWIPE_OPEN_W / 2) { setDx(-SWIPE_OPEN_W); onOpen(); }  // snap to armed
    else { setDx(0); onClose(); }                                    // snap back
    s.mode = "";
  };

  return (
    <div ref={ref} className="group/item relative overflow-hidden" style={{ touchAction: "pan-y" }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest?.("[data-swipe-del]")) return;  // taps on the red always go through
        if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; return; }  // a drag is not a click
        if (open) { e.preventDefault(); e.stopPropagation(); onClose(); }     // tap an armed row → just close it
      }}>
      {/* red delete layer behind the row */}
      <div className="absolute inset-0 flex items-stretch justify-end bg-[#e5484d]"
        style={{ opacity: dx < 0 ? 1 : 0, transition: dragging ? "none" : "opacity .15s ease" }}>
        <button type="button" data-swipe-del onClick={onDelete} aria-label="Delete chat"
          className="flex h-full w-full items-center justify-end pr-5 text-[12.5px] font-semibold text-white">
          Delete
        </button>
      </div>
      {/* sliding foreground */}
      <div className={`relative z-[1] ${dx < 0 ? "bg-background" : ""}`}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform .22s cubic-bezier(.32,.72,.24,1)" }}>
        {children}
      </div>
    </div>
  );
}

export function ChatMatrix({ guest = false }: { guest?: boolean } = {}) {
  const [gate, setGate] = useState(false);   // guest hit the free-message limit
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [pro, setPro] = useState<boolean>(false);   // Pro = burn token, full tools + web; Normal = free
  const [conn, setConn] = useState<"ok" | "retrying" | "down">("ok");   // live connection status to the network brain
  const [history, setHistory] = useState<HistItem[]>([]);
  const [swipeId, setSwipeId] = useState<string | null>(null);   // which sidebar row is swiped open (armed for delete)
  const [chatSearch, setChatSearch] = useState("");   // sidebar search — filters thread titles live
  const [menuId, setMenuId] = useState<string | null>(null);   // which row's desktop ⋯ menu is open
  const [undo, setUndo] = useState<HistItem & { idx: number } | null>(null);   // just-deleted thread, restorable for a few seconds
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genRef = useRef(0);   // conversation generation — bumped on new chat / agent switch to CANCEL an in-flight typewriter (stops a streaming reply bleeding into the next thread)
  const freshRef = useRef(false);   // set by newChat: the NEXT agent load must start EMPTY (never resurrect that agent's saved draft — the root of the stale-title + duplicate-row bug)
  const [sidebar, setSidebar] = useState(false);   // mobile drawer open
  const [rail, setRail] = useState(false);         // desktop sidebar collapsed to icon rail (Gemini-style)
  const [activeId, setActiveId] = useState<string | null>(null);   // presentational: which history item is open (sidebar highlight only)
  const [copied, setCopied] = useState(-1);        // which message index was just copied
  const [about, setAbout] = useState(false);       // the "?" explainer on the empty state (default hidden)
  const [proofOpen, setProofOpen] = useState<Record<number, boolean>>({});   // which messages' proof chips are expanded
  const [agent, setAgent] = useState<{ callsign: string; address: string; nick?: string } | null>(null);   // the verified agent handling THIS chat (renameable, persisted)
  const poolRef = useRef<{ callsign: string; address: string }[]>([]);
  const kbRef = useRef<{ q: string; a: string }[]>([]);   // the full trained KB (chat_kb.json), fetched once
  const [myAgents, setMyAgents] = useState<{ callsign: string; address: string; nick?: string }[]>([]);   // the user's MINTED agents (from the dashboard) — selectable in chat
  const [picker, setPicker] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const loadHistory = () => { try { setHistory(JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]")); } catch { setHistory([]); } };
  // Each agent/wallet gets its OWN saved "current" conversation draft, keyed by address.
  const curKey = (addr?: string) => `rhinogent.chat.cur::${addr || "guest"}`;
  // ACCOUNT-SYNC KEY: a UNIQUE, per-conversation key (NOT the agent address). Every new chat
  // rotates to a fresh key → a fresh chats row + its own title, so distinct conversations never
  // share/overwrite one account row (the "every new chat shows the same name" bug). Persisted
  // per agent so a wallet's in-progress thread keeps syncing to the SAME row across refreshes.
  const tkeyStore = (addr?: string) => `rhinogent.chat.tkey::${addr || "guest"}`;
  const newTk = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const curThreadKey = (addr?: string) => {
    try {
      const k = tkeyStore(addr);
      let v = localStorage.getItem(k);
      if (!v) { v = newTk(); localStorage.setItem(k, v); }
      return v;
    } catch { return newTk(); }
  };
  const rotateThreadKey = (addr?: string) => {
    const v = newTk();
    try { localStorage.setItem(tkeyStore(addr), v); } catch { /**/ }
    return v;
  };
  // Title from the first user message (recognizable, unique per thread); "New chat" until one exists.
  const threadTitle = (list: Msg[]) => (list.find((m) => m.role === "user")?.text || "New chat").slice(0, 48);
  // pull a pool of REAL verified agents from the signed census, assign one per chat.
  // The identity PERSISTS across refreshes (localStorage) and can be renamed (nick).
  const saveAgent = (a: { callsign: string; address: string; nick?: string } | null) => {
    try { if (a) localStorage.setItem("rhinogent.chat.agent", JSON.stringify(a)); } catch { /**/ }
  };
  const assignAgent = () => {
    const pool = poolRef.current;
    if (!pool.length) return null;
    // pick a verified agent DIFFERENT from the current one, so every new chat visibly gets a
    // new agent id (the operator's "new agent id info"); fall back to any if the pool is tiny.
    const curAddr = agent?.address;
    let i = Math.floor((Date.now() / 1000) % pool.length);
    if (pool.length > 1 && pool[i].address === curAddr) i = (i + 1) % pool.length;
    const a = pool[i];
    setAgent(a); saveAgent(a);
    return a;
  };
  // DOUBLE-CLICK RENAME — rename any of your agents by double-clicking its name
  // (header or picker). The new name is SYNCED: chat nick + dashboard label +
  // account (renameMinted saves to localStorage and pushes the encrypted sync).
  const renameAgent = (target?: { callsign: string; address: string; nick?: string }) => {
    const t = target || agent;
    if (!t) return;
    const nick = window.prompt("Rename agent", t.nick || t.callsign);
    if (!nick || !nick.trim()) return;
    const label = nick.trim().slice(0, 24);
    try {
      const mine = loadAgents();
      const m = mine.find((x) => x.address.toLowerCase() === t.address.toLowerCase());
      if (m) renameMinted(mine, m.id, label);   // dashboard panel + account stay in sync
    } catch { /**/ }
    setMyAgents((cur) => cur.map((x) => (x.address.toLowerCase() === t.address.toLowerCase() ? { ...x, nick: label } : x)));
    if (agent && agent.address.toLowerCase() === t.address.toLowerCase()) {
      const a = { ...agent, nick: label };
      setAgent(a); saveAgent(a);
    }
  };
  // INLINE MINT — minting from chat is the SAME mint as the dashboard: writes the
  // same store the agent panel reads (addAgent → localStorage + account sync), same
  // economics (first 2 free, then 150 TOKEN), and the chat switches to the new agent.
  const [mintingNew, setMintingNew] = useState(false);
  const mintNewAgent = async () => {
    if (mintingNew) return;
    // MINT REQUIRES LOGIN — the chat is already sign-in gated, but re-check the session in case
    // it expired while the tab was open, so a stale session never mints an unbound agent.
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { alert("Please sign in to mint a new agent — every agent binds to your account. Open the dashboard to sign in."); setPicker(false); return; }
    } catch { /* if the check itself fails, fall through — chat access already required auth */ }
    setMintingNew(true);
    try {
      const cur = loadAgents();
      if (cur.length >= MAX_SLOTS) { alert(`10 agent limit reached — remove one on the dashboard to mint another.`); return; }
      if (cur.length < PRICES.freeMints) {
        reward(0.1, "minted a free self-custody ID");
      } else {
        const res = await spend(PRICES.mintId, "minted a self-custody ID");
        if (!res.ok) { alert(`Minting a new agent costs ${PRICES.mintId} TOKEN. Your balance is ${res.balance}. Earn more with verified work, or use your first ${PRICES.freeMints} free.`); return; }
      }
      const next = addAgent(cur);
      const minted = next[next.length - 1];
      setMyAgents(next.map((x) => ({ callsign: x.id, address: x.address, nick: x.label })));
      switchAgent({ callsign: minted.id, address: minted.address, nick: minted.label });
    } catch (e) {
      alert(`Minting hit an error — nothing was charged. Please try again.\n\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setMintingNew(false);
      setPicker(false);
    }
  };
  const switchAgent = (a: { callsign: string; address: string; nick?: string }) => {
    if (agent && a.address === agent.address) { setPicker(false); return; }   // same wallet — no-op
    // Each agent/wallet keeps its OWN separate conversation. Save the outgoing agent's live thread
    // under its wallet key (and archive to the sidebar), then load the INCOMING agent's own saved thread.
    try {
      if (agent && msgs.length) {
        localStorage.setItem(curKey(agent.address), JSON.stringify(msgs.slice(-100)));   // per-wallet current
        const hist = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
        const title = threadTitle(msgs);
        const histId = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
        hist.unshift({ id: histId, title, msgs: msgs.slice(-100), agent, ts: Date.now() });
        localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.slice(0, 30)));
        // flush the pending sync so the row exists, THEN rebind it to the archive id and rotate
        // the outgoing agent's thread key — the next chat under it is guaranteed a fresh row.
        const tk = curThreadKey(agent.address);
        flushThreadSync(tk).then(() => rebindThreadKey(tk, histId)).catch(() => {});
        rotateThreadKey(agent.address);
      }
    } catch { /**/ }
    setActiveId(null);
    genRef.current++;   // cancel any in-flight typewriter from the outgoing agent's thread
    // switch identity — the per-wallet restore effect loads the incoming wallet's thread (or a fresh
    // empty chat if it has none). We clear here first so there is never a flash of the old thread.
    setMsgs([]);
    setAgent(a); saveAgent(a);
    setPicker(false); loadHistory();
  };
  useEffect(() => {
    // restore the persisted identity first — same agent after refresh
    try { const s = localStorage.getItem("rhinogent.chat.agent"); if (s) setAgent(JSON.parse(s)); } catch { /**/ }
    fetch("/census2/shard-000.json", { cache: "no-store" }).then((r) => r.json()).then((arr) => {
      poolRef.current = (arr || []).slice(0, 400).map((x: { callsign: string; address: string }) => ({ callsign: x.callsign, address: x.address }));
      setAgent((cur) => cur || assignAgent());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const refresh = () => {
      try {
        const mine = loadAgents().map((a) => ({ callsign: a.id, address: a.address, nick: a.label }));
        setMyAgents(mine);
        // CONSISTENCY: a signed-in user chats as their OWN synced agent — the SAME identity on
        // every device (minted agents sync via the account) — never a random per-device pool pick.
        if (!guest && mine.length) {
          setAgent((cur) => {
            if (cur && mine.some((m) => m.address.toLowerCase() === cur.address.toLowerCase())) return cur;
            saveAgent(mine[0]); return mine[0];
          });
        }
      } catch {}
    };
    refresh();
    // Best-effort account pull (encrypted, cross-device) + refresh on login sync.
    pullAgents().then(refresh).catch(() => {});
    // OAuth fallback: no password-derived key → the encrypted pull can't decrypt. The
    // PUBLIC mirror (agents table) still knows the user's callsign/address, so chat can
    // keep the same identity on any device (signing still needs the key-holding device).
    if (!guest) {
      supabase.from("agents").select("callsign,address,label").order("index", { ascending: true }).limit(3)
        .then(({ data }) => {
          if (!data?.length || loadAgents().length) return;
          const remote = data.map((r) => ({
            callsign: String(r.callsign), address: String(r.address),
            nick: r.label ? String(r.label) : undefined,
          }));
          setMyAgents((cur) => (cur.length ? cur : remote));
          setAgent((cur) => {
            if (cur && remote.some((m) => m.address.toLowerCase() === cur.address.toLowerCase())) return cur;
            saveAgent(remote[0]);
            return remote[0];
          });
        });
    }
    window.addEventListener("agents:synced", refresh);
    return () => window.removeEventListener("agents:synced", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { fetch("/chat_kb.json", { cache: "force-cache" }).then((r) => r.json()).then((d) => { kbRef.current = Array.isArray(d) ? d : []; }).catch(() => {}); }, []);
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
  useEffect(() => { flushIntake(); }, []);   // drain any opted-in census-intake claims buffered while offline (no-op when opted out)
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);   // don't fire the undo-expiry after unmount

  // ACCOUNT RESTORE: pull the signed-in user's threads (chats/messages tables) and surface
  // any this device hasn't seen in the sidebar — a returning user SEES their prior chats on
  // any device. Re-runs after a fresh login finishes syncing ("agents:synced").
  useEffect(() => {
    if (guest) return;
    let alive = true;
    // ACCOUNT-AUTHORITATIVE reconcile: the account is the source of truth. A thread deleted on
    // another device (absent from the account) is REMOVED locally instead of being re-pushed —
    // so cross-device deletes actually stick. Local-only (never-synced) threads are preserved
    // and backfilled up. Runs on load, on login-sync, and whenever the tab regains focus.
    const run = () => pullThreadsFull().then(({ threads, complete, signedIn, deleted }) => {
      if (!alive || !signedIn) return;
      try {
        reconcileHistory(threads, complete, deleted);   // drops deleted-elsewhere (incl. tombstones), adds new, cleans map
        loadHistory();
        // push any LOCAL-ONLY threads up (never re-pushes reconciled-away ones — they're gone from hist)
        const hist = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
        backfillThreads(hist).catch(() => {});
      } catch { /**/ }
    }).catch(() => {});
    run();
    const onVis = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("agents:synced", run);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVis);
    // UNIVERSAL AUTO-SYNC: any sign-in (incl. brand-new signup) or token refresh → pull the
    // account's chats down to this device automatically. Chats are account-native, not opt-in.
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) run(); });
    // NEAR-REAL-TIME: subscribe to the signed-in user's chats changes so deletes/inserts on
    // another device propagate live (best-effort — silently no-ops if Realtime is disabled).
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (!uid) return;
        channel = supabase
          .channel("chats-" + uid)
          .on("postgres_changes", { event: "*", schema: "public", table: "chats", filter: `user_id=eq.${uid}` }, () => run())
          .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `user_id=eq.${uid}` }, () => run())
          .subscribe();
      } catch { /* realtime optional */ }
    })();
    return () => {
      alive = false;
      window.removeEventListener("agents:synced", run);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVis);
      try { authSub.subscription.unsubscribe(); } catch { /**/ }
      try { if (channel) supabase.removeChannel(channel); } catch { /**/ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest]);

  // SAVE CHATS per wallet — each agent/wallet owns its OWN conversation. Switching to a different
  // wallet loads THAT wallet's thread, or a FRESH EMPTY chat if it has none (never bleeds the last
  // wallet's chat into a new one). A one-time migration adopts any legacy global thread so existing
  // users don't lose an in-progress chat on this upgrade.
  const loadedAddrRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const addr = agent?.address;
    if (addr === undefined) return;                 // wait for identity to resolve
    if (loadedAddrRef.current === addr) return;     // already loaded this wallet's thread
    loadedAddrRef.current = addr ?? null;
    // NEW CHAT forces a FRESH EMPTY conversation — never restore the incoming agent's saved
    // draft (which resurrected an old "ok moves" thread into a new chat and re-synced it as a
    // duplicate account row with a stale title). The per-wallet restore below is only for the
    // initial load and for explicit agent SWITCHES (the picker), not for "+ New chat".
    if (freshRef.current) {
      freshRef.current = false;
      setMsgs([]);
      return;
    }
    try {
      let s = localStorage.getItem(curKey(addr));
      if (!s && !localStorage.getItem("rhinogent.chat.migrated")) {
        const legacy = localStorage.getItem("rhinogent.chat.current");   // migrate old global thread ONCE
        if (legacy) { s = legacy; localStorage.setItem(curKey(addr), legacy); }
        localStorage.setItem("rhinogent.chat.migrated", "1");
      }
      // clean any pre-guard fabrication (fake CLI, wrong storage) out of OLD saved threads on restore
      setMsgs(s ? (JSON.parse(s) as Msg[]).map((m) => (m.role === "assistant" ? { ...m, text: groundGuard(m.text) } : m)) : []);
    } catch { setMsgs([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.address]);
  useEffect(() => {
    try {
      if (msgs.length) {
        localStorage.setItem(curKey(agent?.address), JSON.stringify(msgs.slice(-100)));
        // ACCOUNT SYNC: mirror the thread to the signed-in user's account (chats/messages,
        // RLS-scoped) so it shows on every device. Debounced + best-effort; guests no-op.
        if (!guest) {
          // sync under the CURRENT conversation's unique thread key (not the agent address),
          // so each conversation owns its own account row + title.
          queueThreadSync(curThreadKey(agent?.address), threadTitle(msgs), msgs.slice(-100));
        }
      }
    } catch { /**/ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs]);
  // DELETE CHAT — removes the thread from this device AND the account (every device):
  // Supabase `messages` rows + the `chats` row go immediately (via deleteThread).
  // Guard is a light UNDO toast (no modal): undo restores localStorage AND re-creates
  // the account row (restoreThread), so nothing is lost if the finger slipped.
  const deleteChat = (h: HistItem) => {
    let idx = 0;
    try {
      const hist: HistItem[] = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
      idx = Math.max(0, hist.findIndex((x) => x.id === h.id));
      localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.filter((x) => x.id !== h.id)));
    } catch { /**/ }
    if (activeId === h.id) { setMsgs([]); setActiveId(null); }
    setSwipeId(null);
    deleteThread(h.id).catch(() => {});
    loadHistory();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ ...h, idx });
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };
  const undoDelete = () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const { idx, ...h } = undo;
    try {
      const hist: HistItem[] = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
      hist.splice(Math.min(idx, hist.length), 0, h);
      localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.slice(0, 30)));
    } catch { /**/ }
    restoreThread(h.id, h.title, h.msgs).catch(() => {});   // re-create the account row (fresh uuid, remapped)
    setUndo(null);
    loadHistory();
  };
  // RENAME a chat title (⋯ menu) — updates localStorage history + the account row title.
  const renameChat = (h: HistItem) => {
    setMenuId(null);
    const next = window.prompt("Rename chat", h.title);
    if (!next || !next.trim()) return;
    const title = next.trim().slice(0, 60);
    try {
      const hist: HistItem[] = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
      localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.map((x) => (x.id === h.id ? { ...x, title } : x))));
    } catch { /**/ }
    // push the new title to the account row (same key path the sync uses)
    queueThreadSync(h.id, title, h.msgs);
    loadHistory();
  };

  function newChat() {
    // archive the current thread into history before clearing
    try {
      if (msgs.length) {
        const hist = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
        const title = threadTitle(msgs);
        const histId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        hist.unshift({ id: histId, title, msgs: msgs.slice(-100), agent, ts: Date.now() });
        localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.slice(0, 30)));
        // flush pending sync → row exists → rebind to the archive id, then ROTATE the thread key
        // so the fresh chat gets a brand-new account row + its own title (never reuses this one).
        const tk = curThreadKey(agent?.address);
        flushThreadSync(tk).then(() => rebindThreadKey(tk, histId)).catch(() => {});
        rotateThreadKey(agent?.address);
      }
    } catch { /**/ }
    // clear the OUTGOING agent's saved draft — this thread is archived now, so it must not be
    // able to resurrect (as a fresh chat / duplicate row) the next time this agent is re-picked.
    try { if (agent?.address) localStorage.removeItem(curKey(agent.address)); } catch { /**/ }
    genRef.current++;    // cancel any in-flight typewriter so its reply can't land in the new chat
    freshRef.current = true;   // the INCOMING agent must start EMPTY, not restore its old draft
    setMsgs([]);
    setActiveId(null);   // sidebar highlight only
    const picked = assignAgent();   // fresh chat → a NEW verified agent takes it
    // if the pool re-picked the SAME agent, the restore effect won't fire — clear the fresh
    // flag ourselves so it can't leak into a later genuine agent switch (msgs are already []).
    if (!picked || picked.address === agent?.address) freshRef.current = false;
    try { localStorage.removeItem("rhinogent.chat.current"); } catch { /**/ }
  }

  async function send(override?: string) {
    const q = (typeof override === "string" ? override : input).trim();
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
    // census intake — dormant unless the user opted in (default OFF); records an extracted
    // claim (topic + size band), NEVER the raw message, per the ratified constitution.
    recordIntake({ agentAddr: agent?.address ?? null, mode: pro ? "pro" : "normal", role: "user", text: q });
    dailyCheckin();   // first message of the day earns TOKEN — the balance visibly climbs
    async function ask(): Promise<string> {
      // Pro = always-on edge worker: live Exa web-grounding + an Ed25519-signed ProofCard.
      const endpoint = pro ? PRO_WORKER : WORKER;
      const r = await fetch(endpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, history: msgs.slice(-8).map((m) => ({ role: m.role, content: m.text })) }),
      });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      let out = d.reply || d.reason || "…";
      // strip any leaked tool-call syntax the model emits as text (never show raw tags)
      out = out.replace(/<\/?(web_search|tool_call|function|tool|invoke)[^>]*>/gi, "")
               .replace(/\{"query"\s*:\s*"[^"]*"\}/g, "")
               .replace(/^\s*[\r\n]+/, "").trim();
      // Normal is a RAW edge LLM — never let it fabricate 0n1x specifics (fake CLI, wrong storage,
      // stale cutoff). Pro is grounded + signed, so the guard only gates Normal.
      if (!pro) out = groundGuard(out);
      // Pro: attach the proof as a QUIET annotation (rendered as a collapsible chip, not inline noise).
      if (pro && d.proof) {
        const srcs = (Array.isArray(d.sources) ? d.sources : [])
          .map((s: unknown) => (typeof s === "string" ? s : (s as { url?: string })?.url || ""))
          .filter((u: string) => /^https?:\/\//.test(u))
          .slice(0, 6);
        const cnt = srcs.length ? ` · ${srcs.length} source${srcs.length > 1 ? "s" : ""}` : "";
        const links = srcs.map((u: string) => { try { return `\n- [${new URL(u).hostname}](${u})`; } catch { return ""; } }).join("");
        out += `\n\n🔏 Signed (Ed25519) · proof \`${d.proof.id}\`${cnt} · [verify](https://onyx-pro.onyxagntc.workers.dev)${links}`;
      }
      out += factChips(d);
      return out || "…";
    }
    // Worker = the always-on edge LLM (never sleeps). Used as Normal's brain and as Pro's
    // reliable fallback when the grounding portal is asleep.
    async function askWorker(): Promise<string> {
      const r = await fetch(WORKER, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, history: msgs.slice(-8).map((m) => ({ role: m.role, content: m.text })) }) });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      return groundGuard(String(d.reply || "").replace(/<\/?(web_search|tool_call|function|tool|invoke)[^>]*>/gi, "").trim()) + factChips(d);
    }
    try {
      let text = "";
      try { text = await ask(); setConn("ok"); }
      catch {
        // Primary endpoint failed. Pro's portal lives on the operator machine and may be asleep —
        // DON'T face-plant to static KB: refund the premium token and answer on the always-on Worker.
        setConn("retrying");
        if (pro) {
          if (!guest) { try { grant(PRICES.chatMessage, "pro refund (grounding offline)").then(setBalance); } catch { /**/ } }
          try {
            text = await askWorker();
            if (text) text += "\n\n*Live grounding + signature are offline right now — answered on the always-on tier and your token was refunded.*";
          } catch { /**/ }
        } else {
          await new Promise((z) => setTimeout(z, 500));
          try { text = await askWorker(); } catch { /**/ }
        }
        if (text) setConn("ok");
      }
      if (!text) throw new Error("offline");
      if (consumeGuest) {
        try {
          const used = parseInt(localStorage.getItem("rhinogent.chat.guestUsed") || "0", 10) || 0;
          localStorage.setItem("rhinogent.chat.guestUsed", String(used + 1));
        } catch { /**/ }
      }
      setBusy(false);
      // typewriter reveal — calmer cadence (word-ish chunks, ~2.6s), not frantic.
      // Bound to the current conversation generation: if the user starts a new chat or
      // switches agents mid-stream, `myGen` goes stale and we STOP — the reply never bleeds
      // into the next thread (which would mis-title it from an assistant message).
      const myGen = genRef.current;
      const idx = { i: 0 };
      setMsgs((m) => { idx.i = m.length; return [...m, { role: "assistant", text: "" }]; });
      const step = Math.max(1, Math.round(text.length / 140));  // finer steps
      for (let c = 0; c <= text.length; c += step) {
        if (genRef.current !== myGen) return;                    // conversation changed — abandon this stream
        setMsgs((m) => m.map((mm, k) => (k === idx.i ? { ...mm, text: text.slice(0, c) } : mm)));
        await new Promise((z) => setTimeout(z, 26));             // slower, smoother
      }
      if (genRef.current !== myGen) return;
      setMsgs((m) => m.map((mm, k) => (k === idx.i ? { ...mm, text } : mm)));
      // intake the assistant claim too (dormant unless opted in; extracted, never raw)
      recordIntake({ agentAddr: agent?.address ?? null, mode: pro ? "pro" : "normal", role: "assistant", text, grounded: pro });
    } catch {
      setConn("down");
      // Total outage (portal AND worker unreachable). Answer from the trained KB; if that misses,
      // give an HONEST offline line — never tell a Pro user to "switch to Pro" (they already did).
      const kb = bestKb(q, kbRef.current);
      const text = kb || (pro
        ? "I couldn't reach the network just now — retrying. You're on **Pro** and your token was **not** charged; ask again in a moment."
        : localAnswer(q));
      setMsgs((m) => [...m, { role: "assistant", text }]);
      setBusy(false);
    }
  }

  // Gemini-style: the ☰ toggles the rail between a slim icon strip and the full panel
  const Sidebar = (
    <div className={`flex h-full ${rail ? "w-[60px]" : "w-[264px]"} shrink-0 flex-col overflow-hidden border-r border-border/60 bg-gradient-to-b from-surface/60 via-surface/30 to-surface/10 backdrop-blur-sm transition-all duration-300 ease-out`}>
      {/* header: collapse toggle + (expanded) search, then a prominent New chat */}
      <div className={rail ? "flex flex-col items-center gap-1.5 px-2.5 pb-2 pt-3" : "flex flex-col gap-2 px-3 pb-2 pt-3"}>
        <div className={rail ? "contents" : "flex items-center gap-2"}>
          <button onClick={() => setRail((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] text-muted outline-none transition-colors duration-200 hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#3fdda0]/50"
            title={rail ? "Expand menu" : "Collapse menu"} aria-label={rail ? "Expand menu" : "Collapse menu"}>☰</button>
          {!rail && (
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-2">⌕</span>
              <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search chats"
                className="w-full rounded-full border border-border bg-background py-1.5 pl-8 pr-3 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-muted-2 focus:border-[#3fdda0]/50 focus-visible:ring-2 focus-visible:ring-[#3fdda0]/30" />
            </div>
          )}
        </div>
        <button onClick={() => { setChatSearch(""); newChat(); setSidebar(false); loadHistory(); }}
          className={rail
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] text-muted outline-none transition-colors duration-200 hover:bg-[#3fdda0]/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#3fdda0]/50"
            : "flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,.04)] outline-none transition-all duration-200 hover:-translate-y-px hover:border-[#3fdda0]/40 hover:bg-[#3fdda0]/[.06] hover:shadow-[0_3px_10px_rgba(63,221,160,.12)] focus-visible:ring-2 focus-visible:ring-[#3fdda0]/50"}
          title="New chat" aria-label="New chat">
          <span className="text-[16px] leading-none" style={{ color: "#3fdda0" }}>＋</span>{!rail && "New chat"}
        </button>
      </div>
      {!rail && (() => {
        // Compact, time-grouped thread list (DeepSeek/Claude grade). The LIVE current chat sits at
        // the top titled from its first user message — or "New chat" until one is sent — so every
        // "+ New chat" is a visibly distinct entry bound to its own agent, never a repeated name.
        const q = chatSearch.trim().toLowerCase();
        const filtered = history.filter((h) => !q || h.title.toLowerCase().includes(q) || (h.agent?.callsign || "").toLowerCase().includes(q));
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startYest = startToday - 864e5, start7 = startToday - 7 * 864e5;
        const order = ["Today", "Yesterday", "Previous 7 Days", "Older"] as const;
        const buckets: Record<string, HistItem[]> = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
        for (const h of filtered) {
          const t = h.ts ?? 0;
          const b = t >= startToday ? "Today" : t >= startYest ? "Yesterday" : t >= start7 ? "Previous 7 Days" : "Older";
          buckets[b].push(h);
        }
        const activeInHistory = activeId != null && history.some((h) => h.id === activeId);
        const showCurrent = !activeInHistory && !q;   // hide the live row while searching
        const currentTitle = msgs.length ? threadTitle(msgs) : "New chat";

        const Row = (h: HistItem) => (
          <SwipeRow key={h.id} open={swipeId === h.id}
            onOpen={() => setSwipeId(h.id)}
            onClose={() => setSwipeId((s) => (s === h.id ? null : s))}
            onDelete={() => deleteChat(h)}>
            <div className={`relative flex items-start gap-2 px-2.5 py-2 transition-colors duration-150 ${
              activeId === h.id ? "bg-[#3fdda0]/[.08]" : "hover:bg-surface/70"}`}>
              <button onClick={() => {
                setSwipeId(null); setMenuId(null); genRef.current++;
                adoptThread(curThreadKey((h.agent || agent)?.address), h.id);
                // pre-mark the incoming wallet as loaded so the per-wallet restore effect does
                // NOT clobber the opened history thread with that wallet's saved draft
                if (h.agent) { loadedAddrRef.current = h.agent.address; setAgent(h.agent); }
                setMsgs(h.msgs); setActiveId(h.id); setSidebar(false);
              }}
                aria-current={activeId === h.id ? "true" : undefined}
                className="min-w-0 flex-1 text-left outline-none">
                <span className={`block truncate text-[13px] leading-snug ${activeId === h.id ? "font-medium text-foreground" : "text-foreground/90"}`}>{h.title}</span>
                {h.agent && <span className="mt-[3px] flex items-center gap-1 truncate text-[10.5px] text-muted-2"><span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#3fdda0" }} />{h.agent.callsign}</span>}
              </button>
              {/* desktop ⋯ menu (rename / delete); mobile uses the swipe gesture */}
              <div className="relative hidden md:block">
                <button onClick={(e) => { e.stopPropagation(); setMenuId((m) => (m === h.id ? null : h.id)); }}
                  title="Chat options" aria-label={`Options for ${h.title}`}
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-[15px] text-muted-2 transition-colors hover:bg-surface hover:text-foreground ${menuId === h.id ? "flex" : "hidden group-hover/item:flex"}`}>⋯</button>
                {menuId === h.id && (<>
                  <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
                  <div className="absolute right-0 top-7 z-30 w-32 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-[0_10px_30px_-10px_rgba(0,0,0,.35)]">
                    <button onClick={(e) => { e.stopPropagation(); renameChat(h); }} className="block w-full px-3 py-1.5 text-left text-[12.5px] text-foreground transition-colors hover:bg-surface">Rename</button>
                    <button onClick={(e) => { e.stopPropagation(); setMenuId(null); deleteChat(h); }} className="block w-full px-3 py-1.5 text-left text-[12.5px] text-[#e5484d] transition-colors hover:bg-[#e5484d]/10">Delete</button>
                  </div>
                </>)}
              </div>
            </div>
          </SwipeRow>
        );

        return (
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3 pt-1">
          {showCurrent && (
            <div className="mb-1 px-1">
              <div aria-current="true" className="flex items-start gap-2 rounded-lg bg-[#3fdda0]/[.10] px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium leading-snug text-foreground">{currentTitle}</span>
                  {agent && <span className="mt-[3px] flex items-center gap-1 truncate text-[10.5px] text-muted-2"><span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#3fdda0" }} />{agent.callsign} · now</span>}
                </div>
              </div>
            </div>
          )}
          {filtered.length === 0 && (
            q ? <p className="px-3 py-4 text-center text-[12px] text-muted-2">No chats match “{chatSearch}”.</p>
              : !showCurrent && <p className="px-3 py-3 text-[12px] leading-relaxed text-muted-2">No chats yet. <span className="text-muted">Sign in on each device with the same account</span> to sync your chats everywhere.</p>
          )}
          {order.map((label) => buckets[label].length > 0 && (
            <div key={label} className="mb-1">
              <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">{label}</p>
              <div className="divide-y divide-border/40 overflow-hidden rounded-lg">
                {buckets[label].map((h) => Row(h))}
              </div>
            </div>
          ))}
        </div>
        );
      })()}
    </div>
  );

  return (
    <div className="flex h-full w-full">
      {/* UNDO toast — the light guard against an accidental swipe-delete */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background/95 py-2.5 pl-4 pr-3 shadow-[0_8px_28px_rgba(0,0,0,.28)] backdrop-blur-sm">
          <span className="whitespace-nowrap text-[12.5px] text-muted">Chat deleted</span>
          <button onClick={undoDelete}
            className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-[#3fdda0] transition-colors hover:bg-[#3fdda0]/10">
            Undo
          </button>
        </div>
      )}
      {/* GUEST soft gate — shown after the free preview messages */}
      {gate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setGate(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-background p-7 text-center shadow-2xl">
            <RhinoMark className="mx-auto h-11 w-11" />
            <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-foreground">Keep {agent ? (agent.nick || agent.callsign) : "your agent"}.</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              You&apos;ve met your agent. Create a free account and it stays <b className="text-foreground">yours</b> —
              same agent, its memory kept, plus <b className="text-foreground">500 tokens</b> and Pro answers.
            </p>
            <a href="/dashboard" className="mt-5 block w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">Create free account</a>
            <button onClick={() => setGate(false)} className="mt-2.5 text-[12px] text-muted-2 transition-colors hover:text-foreground">Not now</button>
          </div>
        </div>
      )}
      {/* desktop sidebar — logged-in only; guests get a clean single-agent preview */}
      {!guest && <aside className="hidden md:flex">{Sidebar}</aside>}
      {/* mobile drawer */}
      {!guest && sidebar && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <style>{`@keyframes rg-drawer-in{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes rg-dim-in{from{opacity:0}to{opacity:1}}`}</style>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" style={{ animation: "rg-dim-in .25s ease-out both" }} onClick={() => setSidebar(false)} />
          <div className="relative z-50 h-full overflow-hidden rounded-r-2xl bg-background shadow-[8px_0_32px_rgba(0,0,0,.18)]" style={{ animation: "rg-drawer-in .28s cubic-bezier(.32,.72,.24,1) both" }}>{Sidebar}</div>
        </div>
      )}

      <div className={`mx-auto flex h-full w-full max-w-3xl flex-col px-3 transition-all duration-300 sm:px-4 ${pro ? "pro-frame" : ""}`}>
      {/* header — 0n1x network + Pro/Normal tier toggle */}
      <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-2 py-3">
        <div className="relative flex items-center gap-2.5">
          <a href="/" title="Back to home" aria-label="Back to home" className="flex items-center transition-opacity hover:opacity-70">
            <RhinoMark className="h-6 w-6" />
          </a>
          {!guest && <button onClick={() => setSidebar(true)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-foreground hover:border-muted-2 md:hidden" title="Your chats">☰ <span>Chats</span></button>}
          {(() => { const c = conn === "ok" ? "#3fdda0" : conn === "retrying" ? "#e8a33d" : "#e8564e";
            return <span className="flex items-center gap-1.5" title={conn === "ok" ? "Connected" : conn === "retrying" ? "Reconnecting…" : "Offline — retrying"}>
              <span className="flex h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}`, animation: conn === "ok" ? "none" : "rgpulse 1s ease-in-out infinite" }} />
              {conn !== "ok" && <span className="text-[11px] font-medium" style={{ color: c }}>{conn === "retrying" ? "Reconnecting…" : "Offline — retrying"}</span>}
            </span>; })()}
          <style>{`@keyframes rgpulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
          {agent ? (
            <>
            <div className="relative flex items-center gap-1.5">
              <button onClick={() => setPicker((v) => !v)} onDoubleClick={() => { setPicker(false); renameAgent(); }} className="flex items-center gap-1.5" title={`Switch agent · double-click to rename · ${agent.callsign} · ${agent.address}`} aria-expanded={picker}>
                <span className="text-[15px] font-semibold tracking-tight text-foreground">{agent.nick || agent.callsign}</span>
                {/* rename is COSMETIC — the immutable callsign (address-derived identity) stays visible */}
                {agent.nick && agent.nick !== agent.callsign && (
                  <span className="hidden font-mono text-[10.5px] text-muted-2 sm:inline">◆ {agent.callsign}</span>
                )}
                <span className="text-[12px]" style={{ color: "#3fdda0" }} title="verified agent">✓</span>
                <span className="text-[11px] text-muted-2">▾</span>
              </button>
              {picker && (<>
                <div className="fixed inset-0 z-30" onClick={() => setPicker(false)} />
                <div className="absolute left-0 top-8 z-40 w-64 rounded-xl border border-border bg-background p-1.5 shadow-[0_12px_36px_-12px_rgba(0,0,0,.25)]">
                  <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-2">Your agents</div>
                  {myAgents.length === 0 && <div className="px-2.5 py-1.5 text-[12px] text-muted-2">No minted agents yet — mint one to chat as it.</div>}
                  {myAgents.map((a) => (
                    <button key={a.address} onClick={() => switchAgent(a)} onDoubleClick={() => { setPicker(false); renameAgent(a); }} title="Double-click to rename" className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[rgba(63,221,160,.08)] ${agent.address === a.address ? "bg-[rgba(63,221,160,.06)]" : ""}`}>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-foreground">{a.nick || a.callsign}</span>
                        {/* immutable identity — never changed by a rename */}
                        <span className="block truncate font-mono text-[10px] text-muted-2">{a.callsign} · {a.address.slice(0, 6)}…{a.address.slice(-4)}</span>
                      </span>
                      {agent.address === a.address && <span className="text-[11px]" style={{ color: "#3fdda0" }}>✓</span>}
                    </button>
                  ))}
                  <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] text-muted-2">double-click a name to rename</div>
                  {/* HARD 10-agent cap — same ceiling as the dashboard mint surface */}
                  {myAgents.length >= MAX_SLOTS ? (
                    <div className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-muted-2">
                      10 agent limit reached — remove one on the dashboard to mint another.
                    </div>
                  ) : (
                    <button onClick={mintNewAgent} disabled={mintingNew} className="mt-1 block w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-surface disabled:opacity-50" style={{ color: "#3fdda0" }}>
                      {mintingNew ? "Minting…" : "+ Mint a new agent"}
                    </button>
                  )}
                </div>
              </>)}
            </div>
            </>
          ) : (
            <span className="text-[15px] font-semibold tracking-tight text-foreground">0n1x network</span>
          )}
        </div>
        {/* tier toggle — CENTERED, Gemini-style */}
        <div className="order-3 flex w-full justify-center sm:absolute sm:left-1/2 sm:order-none sm:w-auto sm:-translate-x-1/2">
          <div className="flex items-center gap-0.5 rounded-full border border-border/70 bg-surface/60 p-[4px] text-[13px] shadow-inner backdrop-blur">
            <button onClick={() => setPro(false)}
              className={`rounded-full px-5 py-2 tracking-wide transition-all duration-200 ${!pro ? "bg-background font-semibold text-foreground shadow-[0_1px_4px_rgba(0,0,0,.12)]" : "font-medium text-muted-2 hover:text-muted"}`}>
              Normal
            </button>
            <button onClick={() => setPro(true)}
              className={`rounded-full px-5 py-2 tracking-wide transition-all duration-200 ${pro ? "pro-badge font-semibold shadow-[0_1px_8px_rgba(63,221,160,.35)]" : "font-medium text-muted-2 hover:text-muted"}`}>
              Pro
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          {!guest && <span className="tabular-nums text-muted-2">{shown.toLocaleString()}</span>}
        </div>
      </div>

      {/* conversation — Gemini/Kimi calm: soft user bubble, clean assistant text, roomy */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <RhinoMark className="mb-5 h-11 w-11 opacity-90" />
            <h2 className="text-[25px] font-medium tracking-tight text-foreground sm:text-[30px]">How can I help?</h2>
            {/* ONE line — the full explainer lives behind the "?" so the chat opens clean */}
            <p className="mt-2 text-[13.5px] text-muted-2">
              Ask anything — <span style={{ color: "#3fdda0" }} className="font-medium">Pro</span> grounds + signs every answer.{" "}
              <button onClick={() => setAbout((v) => !v)} aria-label="About this chat" aria-expanded={about}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border align-middle text-[11px] text-muted-2 transition-colors hover:border-muted-2 hover:text-foreground">?</button>
            </p>
            {about && (
              <div className="mt-3 max-w-md rounded-2xl border border-border bg-surface/60 p-4 text-left text-[12.5px] leading-relaxed text-muted">
                {agent && <p><span className="text-foreground">{agent.nick || agent.callsign}</span> <span style={{ color: "#3fdda0" }}>✓</span> is a verified agent — the identity and signature are cryptographically real (not a claim about answer quality).</p>}
                <p className={agent ? "mt-2" : ""}><span className="text-foreground">Normal</span> is free and instant. <span style={{ color: "#3fdda0" }}>Pro</span> grounds every answer in a live web search, signs it (Ed25519), and attaches a ProofCard you can verify yourself.</p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3fdda0" }} /> Guardrails on · safe &amp; signed</p>
              </div>
            )}
          </div>
        )}
        <div className="space-y-3 sm:space-y-3.5">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "group flex flex-col items-start"}>
              {m.role === "user"
                ? <div className="max-w-[80%] whitespace-pre-wrap rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-[15px] leading-relaxed shadow-[0_1px_3px_rgba(0,0,0,.1)]" style={{ background: "#3fdda0", color: "#052e1f" }}>{m.text}</div>
                : (() => { const [body, proof] = splitProof(m.text); return <>
                    {/* identity chip on the FIRST reply — the named-verified-agent moment, felt */}
                    {agent && i === msgs.findIndex((x) => x.role === "assistant") && (
                      <a href="/census" className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-2 transition-colors hover:border-muted-2 hover:text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3fdda0" }} />
                        Answered by <span className="text-foreground">{agent.nick || agent.callsign}</span>
                        <span style={{ color: "#3fdda0" }}>✓</span>
                        <span className="hidden sm:inline">· verified on the live network →</span>
                      </a>
                    )}
                    {(body || !proof) && (
                      <div className="chat-md max-w-[90%] rounded-[18px] rounded-bl-[6px] border border-border/50 bg-surface/70 px-4 py-2.5 text-[15px] leading-[1.78] text-foreground shadow-[0_1px_3px_rgba(0,0,0,.05)]" dangerouslySetInnerHTML={{ __html: mdToHtml(body || m.text) }} />
                    )}
                    {/* Pro proof — Claude-style restraint: a quiet chip, expandable on tap */}
                    {proof && (
                      <div className="mt-1 max-w-[88%]">
                        <button onClick={() => setProofOpen((o) => ({ ...o, [i]: !o[i] }))} aria-expanded={!!proofOpen[i]}
                          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[10.5px] text-muted-2 transition-colors hover:border-muted-2 hover:text-foreground">
                          🔏 Signed{(() => { const s = proof.match(/(\d+)\s+(?:live\s+)?sources?/); return s ? ` · ${s[1]} sources` : ""; })()}
                          <span className="text-[9px]">{proofOpen[i] ? "⌃" : "⌄"}</span>
                        </button>
                        {proofOpen[i] && (
                          <div className="chat-md mt-1 rounded-xl border border-border/60 bg-surface/50 px-3 py-2 text-[11.5px] leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: mdToHtml(proof) }} />
                        )}
                      </div>
                    )}
                    {m.text && (
                      <button
                        onClick={() => { navigator.clipboard?.writeText(body || m.text); setCopied(i); setTimeout(() => setCopied(-1), 1400); }}
                        className="mt-1 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-2 opacity-60 transition-all hover:bg-surface hover:text-foreground hover:opacity-100"
                        aria-label="Copy"
                      >
                        {copied === i ? "✓ Copied" : "⧉ Copy"}
                      </button>
                    )}
                  </>; })()}
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
        <div className={`flex items-end gap-2 rounded-[28px] px-5 py-3 transition-all ${pro ? "pro-composer" : "border border-border bg-surface"}`}>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1} placeholder={pro ? "Ask for a signed, web-grounded answer…" : "Message 0n1x…"}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-[17px] text-foreground outline-none placeholder:text-muted-2"
          />
          <button
            onClick={() => send()} disabled={busy || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[17px] text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-25"
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
