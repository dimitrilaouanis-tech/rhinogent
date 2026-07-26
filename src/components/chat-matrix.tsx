"use client";

import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from "react";
import { feedFetch } from "@/lib/feeds";
import { getWallet, spend, grant, reward, PRICES } from "@/lib/wallet";
import { RhinoMark } from "@/components/rhino";
import { loadAgents, addAgent, renameAgent as renameMinted, MAX_SLOTS } from "@/lib/agents";
import { pullAgents, accountAgents, pushAgents } from "@/lib/agent-sync";
import { queueThreadSync, flushThreadSync, pullThreadsFull, pullThreads, reconcileHistory, rebindThreadKey, adoptThread, deleteThread, restoreThread, backfillThreads } from "@/lib/chat-sync";
import { recordIntake, flushIntake } from "@/lib/census-intake";
import { supabase } from "@/lib/supabase";

// PROCESSING TRACE — Manus-style live checklist. Steps are revealed one at a time and
// checked off as it advances, so the wait reads as the agent *working*, not a dead spinner.
// HONEST BY TIER: the steps name what actually happens. Pro really web-grounds + signs, so it
// lists those; Normal has no web access, so it never claims to "search" — no fabricated work.
function ProcessingTrace({ pro, peerName }: { pro: boolean; peerName?: string }) {
  const steps = peerName
    ? [`${peerName} received it`, "Reasoning", "Replying"]
    : pro
      ? ["Reading your message", "Searching the live web", "Verifying the sources", "Signing the proof", "Composing the answer"]
      : ["Reading your message", "Thinking it through", "Composing the answer"];
  const [i, setI] = useState(0);
  // LIVE TOKEN TICKER — Pro/peer answers cost TOKEN, so while the agent works we tick a counter
  // upward (like a frontier model showing tokens accruing). Only on charged tiers; Normal is free.
  const charged = !!(pro || peerName);
  const [tok, setTok] = useState(0);
  useEffect(() => {
    setI(0);
    // advance on a timer but HOLD on the last step — real completion unmounts this (busy → false)
    const t = setInterval(() => setI((p) => (p < steps.length - 1 ? p + 1 : p)), pro ? 1150 : 900);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pro, peerName]);
  useEffect(() => {
    if (!charged) return;
    setTok(0);
    // accelerating count-up — reads as tokens accumulating for this question
    const t = setInterval(() => setTok((n) => n + Math.ceil((n + 6) / 9)), 85);
    return () => clearInterval(t);
  }, [charged]);
  return (
    <div className="flex items-start gap-2.5 pt-1">
      <span className="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[#635bff]/15 motion-safe:animate-ping" style={{ animationDuration: "1.8s" }} aria-hidden />
        <RhinoMark className="relative h-4 w-4 motion-safe:animate-pulse" />
      </span>
      <div className="flex flex-col gap-1.5">
        {charged && (
          <span className="mb-0.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#635bff]/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
            <span aria-hidden>◇</span>
            <span className="tabular-nums">{tok.toLocaleString()}</span>
            <span className="text-[9.5px] font-medium tracking-wide text-muted-2">TOKEN</span>
          </span>
        )}
        {steps.slice(0, i + 1).map((s, idx) => {
          const done = idx < i;
          return (
            <div key={idx} className="proc-row flex items-center gap-2">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {done ? (
                  <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden>
                    <circle cx="7" cy="7" r="6.5" fill="#635bff" fillOpacity="0.16" />
                    <path d="M4 7.2l2 2 4-4.4" fill="none" stroke="#0a9d6e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-[#635bff]/25 motion-safe:animate-ping" aria-hidden />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#635bff]" />
                  </span>
                )}
              </span>
              <span className={done ? "text-[12.5px] text-muted-2" : "thinking-shimmer text-[12.5px] font-medium"}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      /["'<>`]/.test(href) ? `${label} (${href})` : `<a href="${href}" target="_blank" rel="noreferrer noopener" style="color:#635bff">${label}</a>`);
  // A bare link on its own line becomes a SOURCE CARD (domain + path), not a naked URL.
  const sourceCard = (href: string, label?: string) => {
    let host = href; try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { /**/ }
    return `<a href="${href}" target="_blank" rel="noreferrer noopener" style="display:flex;align-items:center;gap:.5em;margin:.3em 0;padding:.5em .7em;border:1px solid var(--border);border-radius:10px;text-decoration:none;color:inherit">`
      + `<span style="flex:none;width:1.35em;height:1.35em;border-radius:5px;background:rgba(99,91,255,.14);color:#0a9d6e;font-size:.7em;font-weight:700;display:flex;align-items:center;justify-content:center">${esc(host.slice(0, 1).toUpperCase())}</span>`
      + `<span style="min-width:0"><span style="display:block;font-size:.92em;font-weight:560;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${inline(label || host)}</span>`
      + `<span style="display:block;font-size:.78em;color:var(--muted-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(host)}</span></span></a>`;
  };
  const lines = src.split("\n");
  let html = "", list: "ul" | "ol" | null = null;
  let fence: string[] | null = null, fenceLang = "";
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const line = raw.trimEnd();
    let m;
    // ``` fenced code — collect verbatim until the closing fence
    if ((m = line.match(/^\s*```\s*([a-zA-Z0-9+#-]*)\s*$/))) {
      if (fence === null) { closeList(); fence = []; fenceLang = m[1] || ""; }
      else {
        html += `<pre style="margin:.6em 0;padding:.75em .85em;border-radius:12px;background:#0d1118;color:#e8ecf4;overflow-x:auto;font-size:.85em;line-height:1.55">`
          + (fenceLang ? `<span style="display:block;margin-bottom:.4em;font-size:.8em;color:#7d8798">${esc(fenceLang)}</span>` : "")
          + `<code>${esc(fence.join("\n"))}</code></pre>`;
        fence = null; fenceLang = "";
      }
      continue;
    }
    if (fence !== null) { fence.push(raw); continue; }
    // | a | b |  markdown table (with or without a --- separator row)
    if (/^\s*\|.*\|\s*$/.test(line) && li + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[li + 1])) {
      closeList();
      const cells = (r: string) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      let r = li + 2; const rows: string[][] = [];
      while (r < lines.length && /^\s*\|.*\|\s*$/.test(lines[r])) { rows.push(cells(lines[r])); r++; }
      li = r - 1;
      // VS Code's chat table treatment: separate borders + radius + overflow:hidden so the corners
      // actually round, and gridlines only on the interior (last col/row drop theirs).
      const cellB = "border:1px solid var(--border);border-top:none;border-left:none";
      const th = head.map((c, i) => `<th style="text-align:left;padding:.45em .6em;${cellB}${i === head.length - 1 ? ";border-right:none" : ""};font-weight:620;white-space:nowrap">${inline(c)}</th>`).join("");
      const tb = rows.map((row, ri) => `<tr>${row.map((c, i) => `<td style="padding:.45em .6em;${cellB}${i === row.length - 1 ? ";border-right:none" : ""}${ri === rows.length - 1 ? ";border-bottom:none" : ""};vertical-align:top">${inline(c)}</td>`).join("")}</tr>`).join("");
      html += `<div style="overflow-x:auto;margin:.6em 0"><table style="border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;width:100%;font-size:.94em"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
      continue;
    }
    // > blockquote
    if ((m = line.match(/^\s*>\s?(.*)/))) {
      closeList();
      html += `<div style="margin:.55em 0;padding:.15em 0 .15em .85em;border-left:3px solid var(--accent);color:var(--muted)">${inline(m[1])}</div>`;
      continue;
    }
    // a lone URL / lone [label](url) on its own line → source card
    if ((m = line.match(/^\s*(?:[-*]\s+)?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*$/)) && !/["'<>`]/.test(m[2])) {
      closeList(); html += sourceCard(m[2], m[1]); continue;
    }
    if ((m = line.match(/^\s*(https?:\/\/\S+)\s*$/)) && !/["'<>`]/.test(m[1])) {
      closeList(); html += sourceCard(m[1]); continue;
    }
    // Chat rhythm, not article rhythm. Stock Tailwind prose gives h2 a 2em top margin — right for
    // an essay, far too loose inside a bubble. Every production chat renderer crushes it; LibreChat
    // lands h2/h3 at .8em/.6em top. We use .85em.
    if ((m = line.match(/^#{1,3}\s+(.*)/))) { closeList(); html += `<div style="font-weight:660;font-size:1.02em;letter-spacing:-.014em;margin:.85em 0 .3em">${inline(m[1])}</div>`; }
    else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (list !== "ul") { closeList(); html += '<ul style="margin:.45em 0 .6em 1.05em;list-style:disc">'; list = "ul"; } html += `<li style="margin:.3em 0;padding-left:.16em;text-wrap:pretty">${inline(m[1])}</li>`; }
    else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) { if (list !== "ol") { closeList(); html += '<ol style="margin:.45em 0 .6em 1.15em;list-style:decimal">'; list = "ol"; } html += `<li style="margin:.3em 0;padding-left:.16em;text-wrap:pretty">${inline(m[1])}</li>`; }
    else if (line === "") { closeList(); html += '<div style="height:.34em"></div>'; }
    else { closeList(); html += `<div style="margin:.5em 0;text-wrap:pretty">${inline(line)}</div>`; }
  }
  // Streaming can end mid-fence — flush what we have rather than dropping the tail.
  if (fence !== null && fence.length) {
    html += `<pre style="margin:.6em 0;padding:.75em .85em;border-radius:12px;background:#0d1118;color:#e8ecf4;overflow-x:auto;font-size:.85em;line-height:1.55"><code>${esc(fence.join("\n"))}</code></pre>`;
  }
  closeList();
  // `first:mt-0` equivalent — a leading heading must not punch a hole at the top of the bubble.
  return html.replace(/^(<div style="[^"]*?)margin:\.85em/, (_, pre: string) => `${pre}margin:0em`);
}

// The chat surface: a DELICATE living matrix (fine lines, low opacity, slow drift — a quiet
// backdrop, not a toy) with the chat bar underneath. Connected to the 0n1x brain (the signed
// LLM portal, self-healing via portal.json). Shown only after sign-in.


// ALWAYS-ON fallback: a trained client-side knowledge base so Normal-tier NEVER goes offline.
// If the live brain/tunnel is unreachable, we still answer from this instantly (train by adding rows).
const KB: [RegExp, string][] = [
  [/(what|whats|about).{0,8}0n1x|^0n1x/i, "0n1x is an ecosystem for AI agents — a neutral, cryptographic layer where agents get an identity, verify each other, transact, and earn. The promise: **verify before you pay.** Every record is Ed25519/EIP-191 signed and publicly recomputable."],
  [/rhinogent|the agent you own/i, "Rhinogent is **the agent you own** — a self-custody identity and wallet you mint in your browser, where your keys never leave your device. It earns tokens for verified work."],
  [/verify before|before .{0,4}pay|counterparty/i, "Before an agent settles a payment, it checks whether the counterparty is real and gets back a **signed verdict** (PROCEED / REVIEW / HOLD). Payment rails verify the payment; this verifies the thing you're paying for."],
  [/earn|token|reward|make money|get paid/i, "Your agent **earns** TOKENs for contributing data that verifies — signed, matching the census. Good verified data pays; bad or unsigned data earns nothing. New accounts get a free 500-token grant."],
  [/self.?custody|keys|wallet|mint/i, "**Self-custody:** your keys are generated in your browser and never leave your device. Nobody else holds them, so there's nothing to seize, freeze, or leak."],
  [/how many|census|count|registered|how big/i, "The live count is on the **census counter** (bound to the signed `census_manifest.json`) — millions of signed agent identities in the 0n1x fleet, and climbing. Honest scope: that's **our own fleet, not external adoption yet** — the verification gap is exactly what we exist to close. It's Merkle-rooted, so anyone can recompute the count from the public shards."],
  [/how.{0,12}verify|prove.{0,8}agent|is it real/i, "AI agents verify each other cryptographically: (1) signed identity (did:pkh, ERC-8004), (2) proof of what it actually did, (3) a liveness challenge, (4) verify-before-you-pay on the counterparty, (5) spend caps — not human paperwork."],
  [/pro|signed|web|premium/i, "**Pro** answers are grounded in a live web search, cryptographically signed (Ed25519), and come with a ProofCard you can verify yourself. Switch the toggle to Pro for those."],
  [/stored|store|saved|save.{0,6}chat|privacy|retain|kept|logged/i, "**Privacy:** Normal-tier conversations are **not stored on our servers**. Your chat stays in your own browser and syncs to your account only when you're signed in. We keep no server-side copy of Normal chats and hold none of your keys."],
  [/\bcli\b|npm|install|command.?line|on1x init|@0n1x|package/i, "There's **no CLI or npm package** — it's fetch-first and browser-native. Mint a self-custody agent at rhinogent.com/dashboard and read the signed feeds (census_manifest.json, facts.json) over plain HTTP. Any `npm install @0n1x/...` command is not real."],
  [/cutoff|training data|knowledge.{0,6}(date|cut)/i, "On Normal I answer from signed, live facts rather than a frozen training snapshot. For live web-grounded answers like today's date or current headlines, switch to **Pro**."],
  [/\bnews\b|headline|latest|what.{0,12}happening|today.{0,10}(update|story)/i, "### Live news needs Pro\n\nOn **Normal** I answer from signed facts held on-device — I have no web access, so I can't fetch today's headlines and I won't guess at them.\n\n**Pro** does exactly this:\n\n- searches the live web at the moment you ask\n- cites every source it used\n- returns an **Ed25519-signed ProofCard** you can recompute yourself\n\nFlip the **Pro** toggle above and ask again — try *\"a2a news\"* or *\"agent economy news\"*.\n\nOr ask me anything about 0n1x, agent verification, earning, or self-custody and I'll answer here on Normal."],
  [/^\s*(hello|hi|hey|yo|sup)\b|who are you|what can you do/i, "Hey — I'm your assistant. Ask me anything: explain a concept, help with writing or code, plan something, or think a problem through. What's up?"],
];
// FABRICATION GUARD — a raw LLM confidently invents 0n1x specifics (a fake CLI, a wrong storage
// policy, a stale knowledge cutoff). For a TRUST product that is a brand liability, so any Normal
// reply tripping these is replaced with the correct grounded fact BEFORE it renders.
function groundGuard(reply: string): string {
  const bad: [RegExp, string][] = [
    [/npm\s+install|@0n1x\/|on1x\s+(init|pay|earn|submit)|install\s+-g|\bon1x\s+cli\b/i, "There's **no CLI or npm package** — it's fetch-first and browser-native. Mint an agent at rhinogent.com/dashboard and read the signed JSON feeds over plain HTTP. Any `npm install @0n1x/...` command is not real."],
    [/stored?\s+(on|in|at)\s+(the\s+)?0n1x|0n1x\s+servers?|we\s+store\s+your\s+(chat|conversation|message)|server[- ]side\s+(copy|storage)\s+of\s+your/i, "**Privacy:** Normal-tier conversations are **not** stored on our servers. Your chat stays in your own browser and only syncs to your account if you sign in. We keep no server-side copy of Normal chats and hold none of your keys."],
    [/knowledge\s+cutoff|training\s+data\s+(is\s+)?(from|up\s+to)|(December|June)\s+20(2[0-9])|as\s+of\s+20(2[0-4])/i, "For live, current answers like today's date or the latest headlines, switch to **Pro** (frontier reasoning, disclosed per leaf). On Normal I answer from signed facts."],
    // Backstop for the worst failure mode: the edge LLM writing 0n1x's own press releases. It has
    // no feed, so ANY claim that we announced/introduced/launched something is invented.
    [/0n1x\s+(team\s+)?(has\s+)?(recently\s+)?(announced|introduced|launched|released|unveiled|rolled\s+out)|(new|recent)\s+(agent\s+tiers|announcements?)\s+(have|has|were|was)/i, "I can't report 0n1x news on **Normal** — I have no live feed here, so anything I 'announced' would be invented. For real, current updates switch to **Pro** (frontier reasoning, disclosed per leaf). For how 0n1x works today, ask me directly and I'll answer from signed facts."],
  ];
  for (const [re, fix] of bad) if (re.test(reply)) return fix;
  return reply;
}

// Anything that can only be answered from the live web. Deliberately broad: a false positive costs
// one honest "switch to Pro"; a false negative ships a fabricated fact under our own brand.
const LIVE_INTENT =
  /\bnews\b|headlines?|breaking|latest|current(ly)?|today|tonight|yesterday|this (week|month|morning)|right now|what.{0,12}happening|recent (update|announcement|release)|announced|price of|stock|weather|who won|score/i;

function localAnswer(q: string): string {
  for (const [re, a] of KB) if (re.test(q)) return a;
  return "Happy to help — give me a little more to work with and I'll go deep.\n\n**Strong on Normal:**\n\n- 0n1x, Rhinogent, agent identity and verification\n- earning, tokens, self-custody and keys\n- explaining a concept, writing, code, or planning something through\n\n**Switch to Pro** for anything live — news, today's date, current prices — where Pro brings frontier reasoning, disclosed in every leaf.";
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
// A real web source is a specific page the search actually fetched — NOT a search-engine homepage.
// Pro was rendering google.com/bing.com/yahoo.com as "sources" and stamping "Verified · 6 sources"
// on them (fake verification). Drop those so a bare search-engine homepage never counts as a citation.
function isRealSource(u: string): boolean {
  try {
    const { hostname, pathname } = new URL(u);
    const home = pathname === "" || pathname === "/";
    const engine = /(^|\.)(google|bing|yahoo|duckduckgo|ask|baidu|ecosia|search\.brave)\.[a-z.]+$/i.test(hostname);
    if (engine && home) return false;              // search-engine homepage — never a source
    if (home && hostname.split(".").length <= 2) return false; // bare apex homepage — not a cited page
    return true;
  } catch { return false; }
}

function splitProof(t: string): [string, string | null] {
  const i = t.indexOf("🔏");
  if (i < 0) return [t, null];
  const pre = t.slice(0, i);
  if (pre && !/\n\s*$/.test(pre)) return [t, null];   // mid-line 🔏 = content, not our annotation
  return [pre.replace(/\s+$/, ""), t.slice(i)];
}
type HistItem = { id: string; title: string; msgs: Msg[]; agent?: { callsign: string; address: string }; peer?: { callsign: string; address: string }; ts?: number };

// Stable, unique agent callsign for a chat that has no stored agent — derived
// deterministically from the thread id (each chat is its own identity). Same id
// → same name forever. Adjective-Noun-XXXX, matching the 0n1x mint scheme.
// Kept local (no viem) so the sidebar never drags the wallet lib into the bundle.
const _ADJ = ["Keen", "Bright", "Iron", "Swift", "Bold", "Quiet", "Sharp", "Stone", "Onyx", "Vast", "Lone", "Prime", "True", "Grave", "Wild", "Steel"];
const _NOUN = ["Beacon", "Warden", "Monolith", "Horn", "Sentinel", "Rampart", "Cipher", "Bastion", "Anchor", "Forge", "Vault", "Ridge", "Pillar", "Crest", "Spire", "Tusk"];
function callsignForSeed(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  const a = parseInt(hex.slice(0, 2), 16) % _ADJ.length;
  const n = parseInt(hex.slice(2, 4), 16) % _NOUN.length;
  return `${_ADJ[a]}-${_NOUN[n]}-${hex.slice(-4).toUpperCase()}`;
}

const GUEST_FREE_MESSAGES = 3;

// ── iOS-style swipe-to-delete row (sidebar threads) ──────────────────────────
// Drag LEFT reveals a red Delete behind the row; past ~55% width = full-swipe
// delete. Pointer events cover touch AND mouse; `touch-action: pan-y` keeps the
// list scrolling vertically while horizontal drags belong to us.
const SWIPE_OPEN_W = 76;   // px of red revealed in the "armed" position
// Swipe-to-delete is a TOUCH gesture only. On a fine pointer (mouse/trackpad) it
// (a) feels "squishy" — a click that drifts a few px reads as a drag — and
// (b) the overflow-hidden it needs CLIPS the desktop ⋯ dropdown to nothing.
// So on desktop we skip the whole apparatus: plain row, no clip, ⋯ menu shows.
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(pointer: coarse)");
    const on = () => setCoarse(m.matches);
    on(); m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return coarse;
}
function SwipeRow({ open, onOpen, onClose, onDelete, children }: {
  open: boolean; onOpen: () => void; onClose: () => void; onDelete: () => void; children: ReactNode;
}) {
  const coarse = useCoarsePointer();
  // Desktop (fine pointer): render children plain — no swipe handlers, no
  // overflow-hidden. Deletion happens through the ⋯ menu, which is now unclipped.
  if (!coarse) return <div className="group/item relative">{children}</div>;
  return <SwipeRowTouch open={open} onOpen={onOpen} onClose={onClose} onDelete={onDelete}>{children}</SwipeRowTouch>;
}
function SwipeRowTouch({ open, onOpen, onClose, onDelete, children }: {
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
  // PEER MODE: your agent ⇄ ANOTHER agent, charged per answer. Set from /chat?peer=<callsign>&pa=<addr>&price=<n>.
  const [peer, setPeer] = useState<{ callsign: string; address: string; price: number } | null>(null);
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
      pushAgents(next).catch(() => {});   // ← sync the chat-minted agent to the account (shows on every device)
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
        hist.unshift({ id: histId, title, msgs: msgs.slice(-100), agent, ...(peer ? { peer: { callsign: peer.callsign, address: peer.address } } : {}), ts: Date.now() });
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
    feedFetch("/census2/shard-000.json").then((r) => r.json()).then((arr) => {
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
    // CROSS-DEVICE AGENT SYNC (the real fix): the chat and the dashboard must show the SAME agents
    // on every device. Push this device's local (key-holding) agents up, then MERGE the account's
    // public mirror (local ∪ mirror, by address) so agents minted on ANOTHER device appear here too.
    // The old code bailed whenever a local agent existed, so the chat's pool agents and the
    // dashboard's minted agents never reconciled — two separate stores. accountAgents() unifies them.
    if (!guest) {
      (async () => {
        try {
          const local = loadAgents();
          if (local.length) await pushAgents(local);              // chat-minted agents now reach the account
          await pullAgents().catch(() => {});                     // decrypt keys where a password session exists
          const merged = await accountAgents();                   // local (keys) ∪ account mirror (identity)
          const list = merged.map((a) => ({ callsign: a.id, address: a.address, nick: a.label }));
          if (list.length) setMyAgents(list);
          setAgent((cur) => {
            if (cur && list.some((m) => m.address.toLowerCase() === cur.address.toLowerCase())) return cur;
            if (list.length) { saveAgent(list[0]); return list[0]; }
            return cur;
          });
        } catch { /* best-effort */ }
      })();
    } else {
      pullAgents().then(refresh).catch(() => {});
    }
    window.addEventListener("agents:synced", refresh);
    return () => window.removeEventListener("agents:synced", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // MINT→CHAT PORTAL: /chat?agent=<callsign>&a=<address> selects THAT specific agent to chat as,
  // the moment its identity is available on this device. Runs once. Lets "Chat with this agent"
  // from the dashboard (and a ProofCard link) drop you straight into a conversation as that agent.
  const urlAgentApplied = useRef(false);
  useEffect(() => {
    if (urlAgentApplied.current) return;
    let want = { call: "", addr: "" };
    try { const sp = new URLSearchParams(window.location.search); want = { call: sp.get("agent") || "", addr: (sp.get("a") || "").toLowerCase() }; } catch { /**/ }
    if (!want.call && !want.addr) return;
    const match = myAgents.find((m) => (want.addr && m.address.toLowerCase() === want.addr) || (want.call && m.callsign === want.call));
    if (match) { urlAgentApplied.current = true; switchAgent(match); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAgents]);
  useEffect(() => { fetch("/chat_kb.json", { cache: "force-cache" }).then((r) => r.json()).then((d) => { kbRef.current = Array.isArray(d) ? d : []; }).catch(() => {}); }, []);
  useEffect(() => { resolvePortal(); }, []);
  // PEER MODE resolve — /chat?peer=<callsign>&pa=<addr>&price=<n> opens a paid conversation with
  // THAT agent (charged per answer). Peer answers ride the grounded + signed tier, so we flip Pro on.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const call = sp.get("peer") || "";
      const addr = (sp.get("pa") || "").toLowerCase();
      const price = Math.max(1, parseInt(sp.get("price") || "0", 10) || 0);
      if ((call || addr) && price) { setPeer({ callsign: call || "agent", address: addr, price }); setPro(true); }
    } catch { /**/ }
  }, []);
  // "Chat with this agent" opens a BRAND-NEW chat (never continues the last thread):
  // once a peer is set, archive whatever was open, clear it, and rotate to a fresh
  // thread key so this conversation gets its own sidebar row (showing BOTH names).
  const peerStartedRef = useRef(false);
  useEffect(() => {
    if (!peer || peerStartedRef.current) return;
    peerStartedRef.current = true;
    try {
      if (msgs.length) {
        const hist = JSON.parse(localStorage.getItem("rhinogent.chat.history") || "[]");
        const histId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        hist.unshift({ id: histId, title: threadTitle(msgs), msgs: msgs.slice(-100), agent, ts: Date.now() });
        localStorage.setItem("rhinogent.chat.history", JSON.stringify(hist.slice(0, 30)));
      }
      if (agent?.address) localStorage.removeItem(curKey(agent.address));
      rotateThreadKey(agent?.address);
    } catch { /**/ }
    genRef.current++;
    freshRef.current = true;
    setMsgs([]);
    setActiveId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, agent]);
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
  // STICK-TO-BOTTOM (not force-to-bottom): the old effect slammed the scroller to the bottom on
  // EVERY msgs/busy change, so reading back through a long answer yanked you down mid-scroll.
  // Now we only follow when you're already at the bottom; scroll up and we let go until you return.
  const stickRef = useRef(true);
  // kept as a setter-only signal: nothing renders it now, but the auto-follow logic below
  // still reads stickRef, and these calls document where "stuck to bottom" flips.
  const [, setAtBottom] = useState(true);
  // DeepSeek-style: on send, pin the new QUESTION to the top of the viewport and let the answer
  // stream into the space below it (instead of chasing the bottom). We anchor the last user bubble.
  const lastUserRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const userCountRef = useRef(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const near = () => el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    const onScroll = () => { const b = near(); stickRef.current = b; setAtBottom(b); };
    // touch/wheel = the user grabbing the transcript → STOP the auto-push immediately (don't fight them)
    const onGrab = () => { stickRef.current = false; setAtBottom(false); };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("touchstart", onGrab, { passive: true });
    el.addEventListener("wheel", onGrab, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); el.removeEventListener("touchstart", onGrab); el.removeEventListener("wheel", onGrab); };
  }, []);
  // Follow the growing answer down — but ONLY on real content growth (ResizeObserver fires when the
  // transcript resizes, not every frame), and ONLY while you're stuck to the bottom. The old
  // per-frame rAF loop wrote scrollTop 60×/s and fought your finger on the way down (the jank).
  useEffect(() => {
    const el = scroller.current, content = contentRef.current;
    if (!el || !content) return;
    const follow = () => {
      if (!stickRef.current) return;                     // grabbed/scrolled up → let go, don't fight
      const bottom = el.scrollHeight - el.clientHeight;
      if (el.scrollTop < bottom - 1) el.scrollTop = bottom;
    };
    const ro = new ResizeObserver(follow);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);
  // On a NEW user message: FOLLOW THE ANSWER DOWN. Stick to the bottom and keep pushing the
  // streaming answer into view — until you scroll up yourself (onScroll/onGrab flip stickRef
  // false, and the rAF loop stops chasing so it never fights your finger). Send = re-arm stick.
  const lastUserIdx = msgs.reduce((idx, m, i) => (m.role === "user" ? i : idx), -1);
  useEffect(() => {
    const count = msgs.reduce((n, m) => (m.role === "user" ? n + 1 : n), 0);
    if (count > userCountRef.current) {
      userCountRef.current = count;
      stickRef.current = true;    // re-arm: follow the answer to the bottom as it streams
      requestAnimationFrame(() => {
        const el = scroller.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        setAtBottom(true);
      });
    } else {
      userCountRef.current = count;
    }
  }, [msgs]);
  useEffect(() => { loadHistory(); }, []);   // populate the sidebar chat list
  useEffect(() => { flushIntake(); }, []);   // drain any opted-in census-intake claims buffered while offline (no-op when opted out)
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);   // don't fire the undo-expiry after unmount

  // Live-refresh support: keep the OPEN conversation's identity + length readable inside the
  // stable realtime handler below (its effect deps are [guest], so it can't see fresh state).
  const openRef = useRef<{ addr?: string; len: number }>({ len: 0 });
  openRef.current = { addr: agent?.address, len: msgs.length };

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
    // LIVE OPEN-CHAT MIRROR: when a message change lands for the chat we currently have open,
    // adopt the account's copy into the visible thread — so an answer produced on one device
    // shows up in the SAME open conversation on the other, without a manual reload. Only adopts
    // when the remote copy has MORE turns than we do locally, so it never clobbers an in-progress
    // local answer (the device that authored it already holds the newest bytes).
    const refreshOpen = async () => {
      try {
        const { addr, len } = openRef.current;
        const map = JSON.parse(localStorage.getItem("rhinogent.chatsync.map.v1") || "{}");
        const tk = localStorage.getItem(`rhinogent.chat.tkey::${addr || "guest"}`);
        const uuid = tk ? map[tk] : null;
        if (!uuid) return;
        const threads = await pullThreads(30);
        const t = threads.find((x) => x.id === uuid);
        if (t && t.msgs.length > len) {
          setMsgs(t.msgs.map((m) => ({ role: m.role, text: m.role === "assistant" ? groundGuard(m.text) : m.text })));
        }
      } catch { /* best-effort */ }
    };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (!uid) return;
        channel = supabase
          .channel("chats-" + uid)
          .on("postgres_changes", { event: "*", schema: "public", table: "chats", filter: `user_id=eq.${uid}` }, () => run())
          .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `user_id=eq.${uid}` }, () => { run(); refreshOpen(); })
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
        hist.unshift({ id: histId, title, msgs: msgs.slice(-100), agent, ...(peer ? { peer: { callsign: peer.callsign, address: peer.address } } : {}), ts: Date.now() });
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
    // PEER MODE: pay THAT agent per answer. PRO burns a token (full tools + web + signed).
    // NORMAL is free (clean conversational).
    if (peer) {
      const pay = await spend(peer.price, `chat with ${peer.callsign}`);
      if (!pay.ok) {
        const t = `Each answer from **${peer.callsign}** costs ${peer.price} TOKEN and your balance is ${pay.balance}. Tap **Top up** to keep the conversation going.`;
        // don't stack the same top-up notice — each blocked send was appending a duplicate (the 3× clobber)
        setMsgs((m) => m[m.length - 1]?.text?.includes("Top up") ? m : [...m, { role: "assistant", text: t }]);
        return;
      }
    } else if (pro) {
      const pay = await spend(PRICES.chatMessage, "pro chat");
      if (!pay.ok) {
        const t = `Pro mode costs ${PRICES.chatMessage} TOKEN per message and your balance is ${pay.balance}. Switch to **Normal** (free) or tap **Top up**.`;
        setMsgs((m) => m[m.length - 1]?.text?.includes("Top up") ? m : [...m, { role: "assistant", text: t }]);
        return;
      }
    }
    setInput(""); setMsgs((m) => [...m, { role: "user", text: q }]); setBusy(true);
    // census intake — dormant unless the user opted in (default OFF); records an extracted
    // claim (topic + size band), NEVER the raw message, per the ratified constitution.
    recordIntake({ agentAddr: agent?.address ?? null, mode: pro ? "pro" : "normal", role: "user", text: q });
    dailyCheckin();   // first message of the day earns TOKEN — the balance visibly climbs
    async function ask(): Promise<string> {
      // Normal has no web access, but the edge LLM will still happily WRITE a news bulletin —
      // observed live inventing "0n1x introduces new Agent Tiers" and formatting it as fact.
      // A pretty renderer makes that worse, not better. So live-info intent never reaches the
      // worker on Normal; it gets the honest "this needs Pro" answer instead.
      if (!pro && LIVE_INTENT.test(q)) return localAnswer(q);
      // Pro = always-on edge worker: live Exa web-grounding + an Ed25519-signed ProofCard.
      const endpoint = pro ? PRO_WORKER : WORKER;
      const r = await fetch(endpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, agent: (peer?.callsign || agent?.nick || agent?.callsign || ""), history: msgs.slice(-8).map((m) => ({ role: m.role, content: m.text })) }),
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
          .filter((u: string) => /^https?:\/\//.test(u) && isRealSource(u))
          .slice(0, 6);
        const cnt = srcs.length ? ` · ${srcs.length} source${srcs.length > 1 ? "s" : ""}` : "";
        const links = srcs.map((u: string) => { try { return `\n- [${new URL(u).hostname}](${u})`; } catch { return ""; } }).join("");
        out += `\n\n🔏 Signed · proof \`${d.proof.id}\`${cnt} · [verify](https://onyx-pro.onyxagntc.workers.dev)${links}`;
      }
      out += factChips(d);
      // PEER MODE: this answer is served on ${peer}'s behalf on the shared grounded+signed tier.
      // Honest: per-agent engines (each agent running its OWN model) arrive with the Agents API —
      // until then we don't pretend the peer independently authored it.
      if (peer) out += `\n\n*— ${peer.callsign} · ${peer.price} TOKEN · answered on the shared engine (per-agent models coming).*`;
      return out || "…";
    }
    // Worker = the always-on edge LLM (never sleeps). Used as Normal's brain and as Pro's
    // reliable fallback when the grounding portal is asleep.
    async function askWorker(): Promise<string> {
      const r = await fetch(WORKER, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, agent: (peer?.callsign || agent?.nick || agent?.callsign || ""), history: msgs.slice(-8).map((m) => ({ role: m.role, content: m.text })) }) });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      return groundGuard(String(d.reply || "").replace(/<\/?(web_search|tool_call|function|tool|invoke)[^>]*>/gi, "").trim()) + factChips(d);
    }
    // REAL STREAMING (Normal tier): render tokens the instant they arrive — true low time-to-first-
    // token, not a typewriter over an already-finished answer. Pro/peer keep the signed non-stream
    // path (Pro streaming ships next, with a pending proof pill). Any failure falls through cleanly.
    async function streamNormal(): Promise<boolean> {
      if (pro || peer) return false;
      let r: Response;
      try {
        r = await fetch(WORKER, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: q, agent: (agent?.nick || agent?.callsign || ""), history: msgs.slice(-8).map((m) => ({ role: m.role, content: m.text })), stream: true }) });
      } catch { return false; }
      if (!r.ok || !r.body) return false;
      const myGen = genRef.current;
      const idx = { i: 0 };
      let created = false, acc = "", buf = "";
      let metaFacts: unknown[] | null = null, failed = false;
      const reader = r.body.getReader(); const dec = new TextDecoder();
      const handle = (chunk: string) => {
        const parts = (buf + chunk).split("\n\n"); buf = parts.pop() || "";
        for (const part of parts) {
          const ev = /event: (\w+)/.exec(part)?.[1];
          const dm = part.slice(part.indexOf("data: ") + 6);
          if (!ev || part.indexOf("data: ") < 0) continue;
          let obj: { t?: string; facts?: unknown[]; detail?: string };
          try { obj = JSON.parse(dm); } catch { continue; }
          if (ev === "delta" && typeof obj.t === "string") {
            acc += obj.t;
            if (!created) { created = true; setBusy(false); setMsgs((m) => { idx.i = m.length; return [...m, { role: "assistant", text: acc }]; }); }
            else setMsgs((m) => m.map((mm, k) => (k === idx.i ? { ...mm, text: acc } : mm)));
          } else if (ev === "meta") { if (Array.isArray(obj.facts)) metaFacts = obj.facts; }
          else if (ev === "error") failed = true;
        }
      };
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (genRef.current !== myGen) { try { await reader.cancel(); } catch { /**/ } return true; }
          handle(dec.decode(value, { stream: true }));
        }
      } catch { if (!created) return false; }
      if (!created || failed) return false;   // nothing usable streamed — let the fallback answer
      // finalize: apply the Normal ground-guard + append signed FactChips from the meta frame
      let finalText = groundGuard(acc.replace(/<\/?(web_search|tool_call|function|tool|invoke)[^>]*>/gi, "").trim());
      if (metaFacts) finalText += factChips({ facts: metaFacts as Parameters<typeof factChips>[0]["facts"] });
      if (genRef.current === myGen) setMsgs((m) => m.map((mm, k) => (k === idx.i ? { ...mm, text: finalText } : mm)));
      setConn("ok");
      recordIntake({ agentAddr: agent?.address ?? null, mode: "normal", role: "assistant", text: finalText, grounded: false });
      return true;
    }
    // Build the signed-proof annotation exactly like the non-stream ask() does (proof pill + sources
    // + FactChips + peer attribution), so a streamed Pro answer reads identically to a non-streamed one.
    function proofAnnotation(d: { proof?: { id?: string }; sources?: unknown[]; facts?: unknown[] }): string {
      let out = "";
      if (d.proof) {
        const srcs = (Array.isArray(d.sources) ? d.sources : [])
          .map((s) => (typeof s === "string" ? s : (s as { url?: string })?.url || ""))
          .filter((u: string) => /^https?:\/\//.test(u)).slice(0, 6);
        const cnt = srcs.length ? ` · ${srcs.length} source${srcs.length > 1 ? "s" : ""}` : "";
        const links = srcs.map((u: string) => { try { return `\n- [${new URL(u).hostname}](${u})`; } catch { return ""; } }).join("");
        out += `\n\n🔏 Signed · proof \`${d.proof.id}\`${cnt} · [verify](https://onyx-pro.onyxagntc.workers.dev)${links}`;
      }
      out += factChips(d as Parameters<typeof factChips>[0]);
      if (peer) out += `\n\n*— ${peer.callsign} · ${peer.price} TOKEN · answered on the shared engine (per-agent models coming).*`;
      return out;
    }
    // REAL STREAMING (Pro / peer): stream the DRAFT with a pending "signing…" pill, then the worker's
    // terminal `proof` frame carries the AUTHORITATIVE (possibly critic-revised) signed text — we
    // replace the draft with it and show it signed. If the stream ends with NO proof frame, the answer
    // was never sealed: REFUND (the charge already happened) and show it honestly as unsigned.
    async function streamPro(): Promise<boolean> {
      let r: Response;
      try {
        r = await fetch(PRO_WORKER, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: q, agent: (peer?.callsign || agent?.nick || agent?.callsign || ""), history: msgs.slice(-8).map((m) => ({ role: m.role, content: m.text })), stream: true }) });
      } catch { return false; }
      if (!r.ok || !r.body) return false;
      if (!(r.headers.get("content-type") || "").includes("text/event-stream")) return false;  // worker fell back to JSON → let ask() handle
      const myGen = genRef.current;
      const idx = { i: 0 };
      let created = false, got = false, acc = "", buf = "";
      const reader = r.body.getReader(); const dec = new TextDecoder();
      const paint = (t: string) => {
        if (!created) { created = true; setBusy(false); setMsgs((m) => { idx.i = m.length; return [...m, { role: "assistant", text: t }]; }); }
        else if (genRef.current === myGen) setMsgs((m) => m.map((mm, k) => (k === idx.i ? { ...mm, text: t } : mm)));
      };
      const handle = (chunk: string) => {
        const parts = (buf + chunk).split("\n\n"); buf = parts.pop() || "";
        for (const part of parts) {
          if (part.indexOf("data: ") < 0) continue;
          const ev = /event: (\w+)/.exec(part)?.[1];
          let obj: { t?: string; reply?: string; proof?: { id?: string }; sources?: unknown[]; facts?: unknown[] };
          try { obj = JSON.parse(part.slice(part.indexOf("data: ") + 6)); } catch { continue; }
          if (ev === "delta" && typeof obj.t === "string") { acc += obj.t; paint(acc + "\n\n*⏳ signing on completion…*"); }
          else if (ev === "proof") {
            got = true;
            const finalText = (obj.reply || acc) + proofAnnotation(obj);
            paint(finalText);
            recordIntake({ agentAddr: agent?.address ?? null, mode: "pro", role: "assistant", text: obj.reply || acc, grounded: true });
          }
        }
      };
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (genRef.current !== myGen) { try { await reader.cancel(); } catch { /**/ } return true; }
          handle(dec.decode(value, { stream: true }));
        }
      } catch { if (!created) return false; }
      if (!created) return false;   // never opened a stream — fall through to the non-stream signed path
      if (!got) {
        // MISSING PROOF → the answer was never sealed. Refund the charge and mark it unsigned (honest).
        if (!guest) { try { grant(peer ? peer.price : PRICES.chatMessage, "pro refund (signature didn't complete)").then(setBalance); } catch { /**/ } }
        paint(acc + "\n\n*Signature didn't complete — your token was refunded; treat this answer as unsigned.*");
      }
      setConn("ok");
      return true;
    }
    try {
      if ((pro || peer) && await streamPro()) { setBusy(false); return; }
      if (await streamNormal()) {
        if (consumeGuest) {
          try { const used = parseInt(localStorage.getItem("rhinogent.chat.guestUsed") || "0", 10) || 0; localStorage.setItem("rhinogent.chat.guestUsed", String(used + 1)); } catch { /**/ }
        }
        setBusy(false);
        return;
      }
      let text = "";
      try { text = await ask(); setConn("ok"); }
      catch {
        // Primary endpoint failed. Pro's portal lives on the operator machine and may be asleep —
        // DON'T face-plant to static KB: refund the premium token and answer on the always-on Worker.
        setConn("retrying");
        if (pro) {
          if (!guest) { try { grant(peer ? peer.price : PRICES.chatMessage, "refund (grounding offline)").then(setBalance); } catch { /**/ } }
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] text-muted outline-none transition-colors duration-200 hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#635bff]/50"
            title={rail ? "Expand menu" : "Collapse menu"} aria-label={rail ? "Expand menu" : "Collapse menu"}>☰</button>
          {!rail && (
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-2">⌕</span>
              <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search chats"
                className="w-full rounded-full border border-border bg-background py-1.5 pl-8 pr-3 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-muted-2 focus:border-[#635bff]/50 focus-visible:ring-2 focus-visible:ring-[#635bff]/30" />
            </div>
          )}
        </div>
        <button onClick={() => { setChatSearch(""); newChat(); setSidebar(false); loadHistory(); }}
          className={rail
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] text-muted outline-none transition-colors duration-200 hover:bg-[#635bff]/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#635bff]/50"
            : "flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,.04)] outline-none transition-all duration-200 hover:-translate-y-px hover:border-[#635bff]/40 hover:bg-[#635bff]/[.06] hover:shadow-[0_3px_10px_rgba(99,91,255,.12)] focus-visible:ring-2 focus-visible:ring-[#635bff]/50"}
          title="New chat" aria-label="New chat">
          <span className="text-[16px] leading-none" style={{ color: "#635bff" }}>＋</span>{!rail && "New chat"}
        </button>
      </div>
      {!rail && (() => {
        // Compact, time-grouped thread list (DeepSeek/Claude grade). The LIVE current chat sits at
        // the top titled from its first user message — or "New chat" until one is sent — so every
        // "+ New chat" is a visibly distinct entry bound to its own agent, never a repeated name.
        const q = chatSearch.trim().toLowerCase();
        const filtered = history.filter((h) => !q || h.title.toLowerCase().includes(q) || (h.agent?.callsign || callsignForSeed(h.id)).toLowerCase().includes(q));
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
        const showCurrent = !activeInHistory && !q;   // (empty-state hint uses this)

        const Row = (h: HistItem) => (
          <SwipeRow key={h.id} open={swipeId === h.id}
            onOpen={() => setSwipeId(h.id)}
            onClose={() => setSwipeId((s) => (s === h.id ? null : s))}
            onDelete={() => deleteChat(h)}>
            <div className={`relative flex items-start gap-2 px-2.5 py-2 transition-colors duration-150 ${
              activeId === h.id ? "bg-[#635bff]/[.08]" : "hover:bg-surface/70"}`}>
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
                {/* Show each chat's OWN agent under the title, ALWAYS. Use the stored callsign
                    when the thread carries one; otherwise derive a STABLE one from the thread id
                    (callsignForSeed) — same id → same name forever, unique per chat. Never fall
                    back to the CURRENT agent (that's the "all one agent" bug). */}
                <span className="mt-[3px] flex items-center gap-1 truncate text-[10.5px] text-muted-2"><span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#635bff" }} />{h.peer ? `${h.agent?.callsign || callsignForSeed(h.id)} ⇄ ${h.peer.callsign}` : (h.agent?.callsign || callsignForSeed(h.id))}</span>
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
          {/* operator: the current "· now" chat is NOT pinned at the top of the sidebar — it's
              already the open conversation in the main view; the list below is history only. */}
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
            className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-[#635bff] transition-colors hover:bg-[#635bff]/10">
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
      {/* desktop sidebar — ALWAYS visible (history + New chat + delete). Local history for guests;
          account-sync layers on once signed in. Never hide the chat controls behind auth. */}
      <aside className="hidden md:flex">{Sidebar}</aside>
      {/* mobile drawer */}
      {sidebar && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <style>{`@keyframes rg-drawer-in{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes rg-dim-in{from{opacity:0}to{opacity:1}}`}</style>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" style={{ animation: "rg-dim-in .25s ease-out both" }} onClick={() => setSidebar(false)} />
          <div className="relative z-50 h-full overflow-hidden rounded-r-2xl bg-background shadow-[8px_0_32px_rgba(0,0,0,.18)]" style={{ animation: "rg-drawer-in .28s cubic-bezier(.32,.72,.24,1) both" }}>{Sidebar}</div>
        </div>
      )}

      <div className={`mx-auto flex h-full w-full max-w-[44rem] flex-col px-3 transition-all duration-300 sm:px-4 ${pro ? "pro-frame" : ""}`}>
      {/* header — 0n1x network + Pro/Normal tier toggle */}
      <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-2 py-3">
        <div className="relative flex items-center gap-2.5">
          <a href="/" title="Back to home" aria-label="Back to home" className="flex items-center transition-opacity hover:opacity-70">
            <RhinoMark className="h-6 w-6" />
          </a>
          {!guest && <button onClick={() => setSidebar(true)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-foreground hover:border-muted-2 md:hidden" title="Your chats">☰ <span>Chats</span></button>}
          {(() => { const c = conn === "ok" ? "#635bff" : conn === "retrying" ? "#e8a33d" : "#e8564e";
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
                {/* single name only — the immutable callsign lives in the tooltip + the picker row */}
                <span className="text-[12px]" style={{ color: "#3fdda0" }} title="verified agent">✓</span>
                <span className="text-[11px] text-muted-2">▾</span>
              </button>
              {picker && (<>
                <div className="fixed inset-0 z-30" onClick={() => setPicker(false)} />
                <div className="absolute left-0 top-8 z-40 w-64 rounded-xl border border-border bg-background p-1.5 shadow-[0_12px_36px_-12px_rgba(0,0,0,.25)]">
                  <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-2">Your agents</div>
                  {myAgents.length === 0 && <div className="px-2.5 py-1.5 text-[12px] text-muted-2">No minted agents yet — mint one to chat as it.</div>}
                  {myAgents.map((a) => (
                    <button key={a.address} onClick={() => switchAgent(a)} onDoubleClick={() => { setPicker(false); renameAgent(a); }} title="Double-click to rename" className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[rgba(99,91,255,.08)] ${agent.address === a.address ? "bg-[rgba(99,91,255,.06)]" : ""}`}>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-foreground">{a.nick || a.callsign}</span>
                        {/* immutable identity — never changed by a rename */}
                        <span className="block truncate font-mono text-[10px] text-muted-2">{a.callsign} · {a.address.slice(0, 6)}…{a.address.slice(-4)}</span>
                      </span>
                      {agent.address === a.address && <span className="text-[11px]" style={{ color: "#635bff" }}>✓</span>}
                    </button>
                  ))}
                  <div className="px-2.5 pb-0.5 pt-1.5 text-[10px] text-muted-2">double-click a name to rename</div>
                  {/* HARD 10-agent cap — same ceiling as the dashboard mint surface */}
                  {myAgents.length >= MAX_SLOTS ? (
                    <div className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-muted-2">
                      10 agent limit reached — remove one on the dashboard to mint another.
                    </div>
                  ) : (
                    <button onClick={mintNewAgent} disabled={mintingNew} className="mt-1 block w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-surface disabled:opacity-50" style={{ color: "#635bff" }}>
                      {mintingNew ? "Minting…" : "+ Mint a new agent"}
                    </button>
                  )}
                </div>
              </>)}
            </div>
            </>
          ) : (
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Rhinogent</span>
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
              className={`rounded-full px-5 py-2 tracking-wide transition-all duration-200 ${pro ? "pro-badge font-semibold shadow-[0_1px_8px_rgba(99,91,255,.35)]" : "font-medium text-muted-2 hover:text-muted"}`}>
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
        {peer && (
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-2 border-b border-border/60 bg-surface/75 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[14px] font-semibold text-accent">
                {peer.callsign.charAt(0).toUpperCase()}
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
                  {peer.callsign}
                  <span className="text-accent" title="Identity verified — answers are generated by the shared 0n1x engine, not a per-agent model.">✓</span>
                </div>
                {/* honest scope inline (not a footnote): the ✓ verifies IDENTITY, not that this
                    callsign is its own model — every agent answers on the shared engine today */}
                <div className="text-[11px] text-muted-2">Identity verified · shared engine · {peer.price} TOKEN / answer</div>
              </div>
            </div>
            <span className="font-mono text-[11px] text-muted-2">bal {shown.toLocaleString()}</span>
          </div>
        )}
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <RhinoMark className="mb-5 h-11 w-11 opacity-90" />
            <h2 className="text-[25px] font-medium tracking-tight text-foreground sm:text-[30px]">
              {peer ? `Chat with ${peer.callsign}` : "How can I help?"}
            </h2>
            {peer && <p className="mt-1 text-[12.5px] text-muted-2">Your agent talks to <b className="text-accent">{peer.callsign}</b> · {peer.price} TOKEN per answer.</p>}
            {/* ONE line — the full explainer lives behind the "?" so the chat opens clean */}
            <p className="mt-2 text-[13.5px] text-muted-2">
              Ask me anything.{" "}
              <button onClick={() => setAbout((v) => !v)} aria-label="About this chat" aria-expanded={about}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border align-middle text-[11px] text-muted-2 transition-colors hover:border-muted-2 hover:text-foreground">?</button>
            </p>
            {/* suggested prompts — staggered fade-in; click sends immediately (empty-state lift) */}
            <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {[
                "Explain a concept simply",
                "Help me write an email",
                "Debug some code",
                "Plan my week",
              ].map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{ animation: `chip-in .38s cubic-bezier(.32,.72,.24,1) both`, animationDelay: `${60 + i * 55}ms` }}
                  className="rounded-full border border-border bg-surface/60 px-3.5 py-1.5 text-[12.5px] text-muted transition-colors hover:border-[#635bff]/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            {about && (
              <div className="mt-3 max-w-md rounded-2xl border border-border bg-surface/60 p-4 text-left text-[12.5px] leading-relaxed text-muted">
                {agent && <p><span className="text-foreground">{agent.nick || agent.callsign}</span> <span style={{ color: "#3fdda0" }}>✓</span> is a verified agent — the identity and signature are cryptographically real (not a claim about answer quality).</p>}
                <p className={agent ? "mt-2" : ""}><span className="text-foreground">Normal</span> is free and instant. <span style={{ color: "#635bff" }}>Pro</span> grounds every answer in a live web search, signs it (Ed25519), and attaches a ProofCard you can verify yourself.</p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: "#635bff" }} /> Guardrails on · safe</p>
              </div>
            )}
          </div>
        )}
        <div ref={contentRef} className="space-y-5 sm:space-y-6">
          {msgs.map((m, i) => (
            <div key={i} ref={i === lastUserIdx ? lastUserRef : undefined} className={m.role === "user" && !peer ? "flex justify-end" : "group flex flex-col items-start"}>
              {m.role === "user"
                ? (peer
                    /* PEER (agent↔agent): your agent speaks as a named transcript row, not an SMS bubble */
                    ? <div className="w-full">
                        <span className="mb-1.5 inline-flex items-center gap-2 text-[12px] font-semibold">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-[#ffffff]" style={{ background: "#635bff" }}>{(agent?.nick || agent?.callsign || "Y").charAt(0).toUpperCase()}</span>
                          <span className="text-accent">{agent?.nick || agent?.callsign || "Your agent"}</span>
                        </span>
                        <div className="whitespace-pre-wrap border-l-2 pl-3.5 text-[15px] leading-relaxed text-foreground" style={{ borderColor: "#635bff" }}>{m.text}</div>
                      </div>
                    : <div className="msg-user-in max-w-[85%] whitespace-pre-wrap rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-[15px] leading-relaxed shadow-[0_1px_3px_rgba(0,0,0,.1)]" style={{ background: "#635bff", color: "#ffffff" }}>{m.text}</div>)
                : (() => { const [body, proof] = splitProof(m.text); return <>
                    {/* PEER (agent-to-agent): name every bubble so it reads as a real multi-agent chat */}
                    {peer ? (
                      <span className="mb-1.5 inline-flex items-center gap-2 text-[12px] font-semibold">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-[#1a1205]" style={{ background: "#e3a44e" }}>{peer.callsign.charAt(0).toUpperCase()}</span>
                        <span style={{ color: "#e3a44e" }}>{peer.callsign}</span>
                        <span className="font-normal text-muted-2">· agent</span>
                      </span>
                    ) : (
                      /* identity chip on the FIRST reply — the named-verified-agent moment, felt */
                      agent && i === msgs.findIndex((x) => x.role === "assistant") && (
                        <a href="/census" title="Identity verified — answers are generated by the shared 0n1x engine, not a per-agent model." className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-2 transition-colors hover:border-muted-2 hover:text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#635bff" }} />
                          <span className="text-foreground">{agent.nick || agent.callsign}</span>
                          <span style={{ color: "#3fdda0" }}>✓</span>
                          <span className="hidden sm:inline">· identity verified · shared engine →</span>
                        </a>
                      )
                    )}
                    {(body || !proof) && (
                      /* bubble-less assistant (ChatGPT/Claude/Gemini consensus): full-column text, no card.
                         In peer mode each agent owns a colored left-rule so a two-agent chat reads as a transcript. */
                      <div className={`msg-assistant-in chat-md w-full text-[15px] leading-[1.7] text-foreground ${peer ? "border-l-2 pl-3.5" : ""}`} style={peer ? { borderColor: "#e3a44e" } : undefined} dangerouslySetInnerHTML={{ __html: mdToHtml(body || m.text) }} />
                    )}
                    {/* Pro proof — Claude-style restraint: a quiet chip, expandable on tap */}
                    {proof && (
                      <div className="mt-1 max-w-[88%]">
                        <button onClick={() => setProofOpen((o) => ({ ...o, [i]: !o[i] }))} aria-expanded={!!proofOpen[i]} data-tip="Ed25519 · verify it yourself"
                          className="signed-reveal inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[10.5px] text-muted-2 transition-colors hover:border-muted-2 hover:text-foreground">
                          Signed{(() => { const s = proof.match(/(\d+)\s+(?:live\s+)?sources?/); return s ? ` · ${s[1]} source${s[1] === "1" ? "" : "s"}` : ""; })()}
                          <span className="text-[9px]">{proofOpen[i] ? "⌃" : "⌄"}</span>
                        </button>
                        {proofOpen[i] && (
                          <div className="chat-md mt-1 rounded-xl border border-border/60 bg-surface/50 px-3 py-2 text-[11.5px] leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: mdToHtml(proof) }} />
                        )}
                      </div>
                    )}
                    {m.text && (
                      <div className="mt-1 flex items-center gap-1">
                        <button
                          onClick={() => { navigator.clipboard?.writeText(body || m.text); setCopied(i); setTimeout(() => setCopied(-1), 1400); }}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-2 opacity-60 transition-all hover:bg-surface hover:text-foreground hover:opacity-100"
                          aria-label="Copy"
                        >
                          <span aria-label={copied === i ? "Copied" : "Copy"}>{copied === i ? "✓" : "⧉"}</span>
                        </button>
                        {!busy && (
                          <button
                            onClick={() => {
                              // regenerate: re-run the user message that produced this answer (drop from it onward)
                              let uidx = -1;
                              for (let k = i - 1; k >= 0; k--) { if (msgs[k].role === "user") { uidx = k; break; } }
                              if (uidx < 0) return;
                              const userText = msgs[uidx].text;
                              setMsgs(msgs.slice(0, uidx));
                              send(userText);
                            }}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-2 opacity-60 transition-all hover:bg-surface hover:text-foreground hover:opacity-100"
                            aria-label="Regenerate"
                          >
                            ↻
                          </button>
                        )}
                      </div>
                    )}
                  </>; })()}
            </div>
          ))}
          {busy && (
            /* THINKING — Manus-style live processing trace: honest, tier-aware step checklist. */
            <div className="flex justify-start">
              <ProcessingTrace pro={pro} peerName={peer?.callsign} />
            </div>
          )}
        </div>
      </div>

      {/* composer — clean & professional; Pro mode adds a quiet jade cue */}
      <div className="shrink-0 pb-3 pt-1" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className={`composer-glass flex items-end gap-2 rounded-[28px] px-5 py-3 transition-all ${pro ? "pro-composer" : ""}`}>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1} placeholder={peer ? `Message ${peer.callsign}…` : "Ask anything…"}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-[17px] text-foreground outline-none placeholder:text-muted-2"
          />
          <button
            onClick={() => send()} disabled={busy || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[17px] text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-25"
            style={{ background: "#635bff" }}
            aria-label="Send"
          >↑</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-2">
          {peer
            ? <><span className="text-accent">{peer.callsign}</span> · signed answer · {peer.price} TOKEN per answer</>
            : pro
            ? <><span style={{ color: "#635bff" }}>Pro</span> · frontier reasoning · disclosed per leaf · {PRICES.chatMessage} TOKEN per message</>
            : <>Normal · free · general answers</>}
        </p>
      </div>
      </div>
    </div>
  );
}
