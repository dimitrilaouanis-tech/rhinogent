"use client";

import { useEffect, useRef, useState } from "react";
import { RhinoMark } from "@/components/rhino";

const API = "https://onyx-actions.onrender.com";
const HUB = "https://rhinogent.com";
// live LLM portal (Groq-powered, signed tools) — bridged via tunnel until the Render deploy hosts it
const PORTAL = "https://var-texas-tissue-fixes.trycloudflare.com";
// the signed-in agent (set from ?address=) — hard AI questions are metered to it
let SESSION_ADDR = "";

type Line = { kind: "in" | "out" | "err" | "sys"; text: string };

const HELP = `0N1X TERMINAL — deterministic commands over signed network state
  check <domain>     verify a merchant/counterparty (signed verdict, live)
  census             the ranked citizen board (live)
  top                top 5 citizens by reputation
  root               the signed Point of Truth root
  join <0xaddress>   register an address as a citizen (live)
  card <callsign>    link to a citizen's ProofCard
  bounties           fetch-to-earn tasks (rolling out — next deploy)
  news               signed live dispatches from 0n1x HQ sessions
  help               this text
Every verdict is Ed25519-signed by 0n1x — trust the math, not us.`;

async function fetchJson(url: string, timeoutMs = 30000): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    const body = await r.json().catch(() => null);
    return { status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

// Natural-language intent parser — type like you talk ("is stripe legit?", "who's on top?",
// "show me the ecosystem"). Deterministic keyword matching, no LLM, still free at scale.
function parseIntent(raw: string): string {
  const t = raw.trim().toLowerCase();
  const first = t.split(/\s+/)[0];
  // exact commands pass straight through
  if (["help", "?", "check", "census", "top", "root", "join", "card", "bounties", "eco", "ecosystem", "news", "feed", "about"].includes(first)) return raw.trim();
  // "what is 0n1x / explain / what do you do" — pre-answered, no LLM needed
  if (/\b(what|explain|tell me about|who are you|what do you do|how does)\b/.test(t) && /0n1x|onyx|you|this network|it work/.test(t) && !/legit|check|verify|top|census|new/.test(t)) return "about";
  // news / what's happening / latest / shipped
  if (/\b(news|feed|latest|happening|shipped|update|dispatch|what.?s new|recent)\b/.test(t)) return "news";
  // a bare domain ("stripe.com") or "check out X" / "is X legit/real/safe/a scam" → check
  const domain = t.match(/([a-z0-9][a-z0-9-]*\.[a-z]{2,}(?:\.[a-z]{2,})?)/);
  if (domain && /\b(check|verify|legit|real|safe|scam|fake|trust|valid|look)\b/.test(t)) return `check ${domain[1]}`;
  if (domain && t.replace(domain[1], "").trim().length < 12) return `check ${domain[1]}`;
  // ecosystem / board / ranking talk
  if (/\b(ecosystem|census|board|everyone|citizens|agents|directory)\b/.test(t)) return "census";
  if (/\b(top|best|leader|rank|winning|first place|who.?s (on top|winning|number))\b/.test(t)) return "top";
  // truth / root / proof
  if (/\b(root|truth|proof|merkle|signed state)\b/.test(t)) return "root";
  // join / signup
  const addr = t.match(/0x[0-9a-f]{40}/);
  if (addr && /\b(join|register|sign|onboard|citizen)\b/.test(t)) return `join ${addr[0]}`;
  if (/\b(join|register|sign ?up|become|onboard)\b/.test(t)) return "join";
  // bounties / earn / work
  if (/\b(bount|earn|task|work|reward|money|pay)\b/.test(t)) return "bounties";
  if (/\b(hi|hello|hey|yo|sup|what.?s up|gm)\b/.test(t)) return "hello";
  return raw.trim();
}

// Try the LLM PORTAL first (real conversation, Claude + signed tools). If it's offline
// (no key set yet) or unreachable, fall back to the free deterministic NL router below.
async function tryPortal(text: string): Promise<Line[] | null> {
  try {
    const r = await fetch(`${PORTAL}/v1/chat`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text, address: SESSION_ADDR }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    // out of AI credits — the hard-question paywall (common checks stay free)
    if (d?.out_of_credits) return [{ kind: "sys", text: `🔒 ${d.reply}` }];
    if (!d || d.ok === false || !d.reply) return null;   // portal offline -> fall back
    const out: Line[] = [{ kind: "out", text: d.reply }];
    for (const s of d.signed || []) {
      if (s.result?.signature)
        out.push({ kind: "sys", text: `  ✓ signed by ${s.result.signed_by} · ${String(s.result.signature).slice(0, 32)}… (Ed25519, verifiable)` });
    }
    if (typeof d.credits_left === "number")
      out.push({ kind: "sys", text: d.welcome_credits ? `  🎁 ${d.welcome_credits} free AI questions to start · ${d.credits_left} left` : `  ${d.credits_left} free AI questions left` });
    return out;
  } catch {
    return null;
  }
}

async function runCommand(input: string): Promise<Line[]> {
  const raw = parseIntent(input);
  const [cmd, ...args] = raw.trim().split(/\s+/);
  const arg = args.join(" ").trim();

  // exact commands go straight to the deterministic (signed) handlers; free-form prose that
  // didn't match a command tries the LLM portal first for a real conversation.
  const isCommand = ["help", "?", "check", "census", "top", "root", "join", "card", "bounties", "news", "feed", "eco", "ecosystem", "hello"].includes((cmd || "").toLowerCase());
  if (!isCommand && input.trim().length >= 2) {
    const portal = await tryPortal(input.trim());
    if (portal) return portal;
  }

  switch ((cmd || "").toLowerCase()) {
    case "hello":
      return [{ kind: "sys", text: `hey 🤍 — I'm 0n1x. Ask me things like:\n  "check any website"  ·  "show me the ecosystem"  ·  "what's new?"\nEvery fact I give you is live and Ed25519-signed — I never make facts up.` }];

    case "about":
      // pre-answered — the #1 question, zero LLM cost, still accurate
      return [{
        kind: "out",
        text: "0n1x is a neutral, cryptographic trust network for AI agents 🤍\n\n" +
          "Agents (and people) use it to verify a counterparty BEFORE they pay — I check a merchant/domain and return a signed verdict anyone can independently verify. Every citizen carries a self-custody wallet + a portable, signed reputation.\n\n" +
          "What makes us different: other tools say \"this might be right.\" 0n1x SIGNS every fact (Ed25519) — so you don't trust me, you verify the math.\n\n" +
          "Try:  \"check stripe.com\"  ·  \"show me the ecosystem\"  ·  \"how do I join?\"",
      }];

    case "eco":
    case "ecosystem":
      return runCommand("census");
    case "help":
    case "?":
      return [{ kind: "sys", text: HELP }];

    case "check": {
      if (!arg) return [{ kind: "err", text: "usage: check <domain>   e.g. check stripe.com" }];
      const dom = arg.replace(/^https?:\/\//, "").split("/")[0];
      const { status, body } = await fetchJson(`${API}/api/check?url=${encodeURIComponent(dom)}`, 45000);
      if (status !== 200 || !body) return [{ kind: "err", text: `check failed (HTTP ${status}) — the network node may be cold-starting; try again in ~30s` }];
      const att = body.onyx_attestation || {};
      const hasSig = !!att.sig;
      const out: string[] = [
        `${hasSig ? "✓ SIGNED" : "⚠ UNSIGNED"} VERDICT · ${dom}`,
        `┌─`,
        `│ verdict     : ${body.verdict ?? body.result ?? "—"}`,
      ];
      if (body.trust_score !== undefined) out.push(`│ trust score : ${body.trust_score}`);
      if (body.age_days !== undefined) out.push(`│ domain age  : ${body.age_days} days`);
      out.push(`│`);
      out.push(`│ signed by   : ${att.kid ?? "—"}`);
      out.push(`│ signature   : ${String(att.sig ?? "—").slice(0, 48)}…`);
      out.push(`└─ Ed25519+JCS — this verdict is cryptographically signed by 0n1x.`);
      out.push(`   Verify it yourself: the public key is at ${API}/.well-known/onyx-pubkey`);
      out.push(`   Nobody — not even us — can forge or alter it. I explain; the network proves. 🤍`);
      return [{ kind: hasSig ? "out" : "err", text: out.join("\n") }];
    }

    case "census":
    case "top": {
      const { status, body } = await fetchJson(`${HUB}/census.json`);
      if (status !== 200 || !body) return [{ kind: "err", text: `census unavailable (HTTP ${status})` }];
      const n = cmd.toLowerCase() === "top" ? 5 : 15;
      const rows = (body.top || []).slice(0, n).map(
        (c: any, i: number) =>
          `${String(i + 1).padStart(3)}  ${String(c.callsign).padEnd(20)} ${String(c.score).padStart(5)}  $${Number(c.usdc ?? 0).toFixed(2)}`
      );
      return [{
        kind: "out",
        text: [`0N1X CENSUS · ${body.count} citizens · $${body.total_usdc} · signed`,
               `  #  CITIZEN              SCORE  WALLET`, ...rows].join("\n"),
      }];
    }

    case "root": {
      const { status, body } = await fetchJson(`${HUB}/census.json`);
      if (status !== 200 || !body) return [{ kind: "err", text: "point of truth unavailable" }];
      return [{
        kind: "out",
        text: `POINT OF TRUTH (Ed25519, re-verifiable)\n${body.truth_root}\nsigned by: ${body.signed_by}`,
      }];
    }

    case "join": {
      if (!/^0x[0-9a-fA-F]{40}$/.test(arg))
        return [{ kind: "err", text: "usage: join 0x<your 40-hex address>  (mint one free at /dashboard)" }];
      const { status, body } = await fetchJson(`${API}/onboard?address=${arg}`, 45000);
      if (status !== 200 || !body) return [{ kind: "err", text: `join failed (HTTP ${status})` }];
      const a = body.agent || {};
      return [{
        kind: "out",
        text: [`WELCOME, CITIZEN`,
               `callsign : ${a.callsign ?? a.name ?? "(issued)"}`,
               `did      : ${a.did ?? `did:pkh:eip155:8453:${arg}`}`,
               `signed by: ${(body.onyx_attestation || {}).kid ?? "0n1x"}`,
               `next     : check <domain> — verify before anyone pays`].join("\n"),
      }];
    }

    case "card": {
      if (!arg) return [{ kind: "err", text: "usage: card <callsign>" }];
      return [{ kind: "out", text: `${HUB}/card?n=${encodeURIComponent(arg)}  ← open to view + verify the signature client-side` }];
    }

    case "news":
    case "feed": {
      const { status, body } = await fetchJson(`${HUB}/feed.json`);
      if (status !== 200 || !body) return [{ kind: "err", text: "feed unavailable" }];
      const kid = (body.onyx_attestation || {}).kid || "0n1x";
      const rows = (body.dispatches || []).slice(0, 8).map(
        (d: any) => `  ▸ [${d.date}] ${d.title}\n     ${d.body}`
      );
      return [{
        kind: "out",
        text: [`0N1X SESSION FEED · signed by ${kid} · live from HQ`, "", ...rows,
               "", "↑ signed public dispatches — the network narrating itself, verifiable."].join("\n"),
      }];
    }

    case "bounties":
      return [{
        kind: "sys",
        text: "BOUNTY FEED — rolling out with the next network deploy.\nFetch-to-earn: correct verdicts earn tokens (+USDC on hard ones) and rank you on the Census.",
      }];

    case "":
      return [];

    default:
      // no command matched and the LLM portal wasn't reachable — stay conversational, never "error"
      return [{
        kind: "sys",
        text: "I can answer that best once my live brain is connected. Right now I can still give you signed network facts — try:\n  • \"is stripe.com legit?\"  (a signed verdict)\n  • \"show me the ecosystem\"  (the census)\n  • \"who's on top?\"  ·  \"what's new?\"  ·  \"how do I join?\"",
      }];
  }
}

const ADJ = ["Keen","Bright","Iron","Swift","Bold","Quiet","Sharp","Stone","Onyx","Vast","Lone","Prime","True","Grave","Wild","Steel"];
const NOUN = ["Beacon","Warden","Monolith","Horn","Sentinel","Rampart","Cipher","Bastion","Anchor","Forge","Vault","Ridge","Pillar","Crest","Spire","Tusk"];
function callsignFor(a: string): string {
  const h = a.toLowerCase().replace(/^0x/, "");
  return `${ADJ[parseInt(h.slice(0, 2), 16) % 16]}-${NOUN[parseInt(h.slice(2, 4), 16) % 16]}-${h.slice(-4).toUpperCase()}`;
}

// linkify — every URL in a reply becomes clickable
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s"'<>)\]]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

const CHIPS = [
  "show me the ecosystem",
  "check a website",
  "what's new?",
  "how do I join?",
];

export function Terminal() {
  const [lines, setLines] = useState<Line[]>([
    { kind: "sys", text: "Hi 🤍 I'm 0n1x — the trust layer for AI agents. Ask me anything about the network and I answer only from live, Ed25519-signed data (I never make facts up). Try a suggestion below, or just talk to me." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const [me, setMe] = useState<string>("");
  const [addr, setAddr] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, busy]);

  // identity-aware: if the agent arrives with ?address= (from their Rhinogent ID/wallet),
  // greet them by their address-derived callsign and thread it into the conversation.
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("address") || "";
    if (/^0x[0-9a-fA-F]{40}$/.test(a)) {
      const cs = callsignFor(a);
      setAddr(a); setMe(cs); SESSION_ADDR = a;
      setLines((l) => [...l, { kind: "sys", text: `Welcome back, ${cs} 🤍 — your Rhinogent identity is linked. Ask me anything about the network.` }]);
    }
  }, []);

  async function submit(val?: string) {
    const raw = (val ?? input).trim();
    if (!raw || busy) return;
    setLines((l) => [...l, { kind: "in", text: raw }]);
    setHistory((h) => [raw, ...h].slice(0, 50));
    setHIdx(-1);
    setInput("");
    setBusy(true);
    try {
      const t0 = Date.now();
      const out = await runCommand(raw);
      // minimum "thinking" time so instant (cached/signed) answers don't snap in unnaturally
      const elapsed = Date.now() - t0;
      if (elapsed < 700) await new Promise((r) => setTimeout(r, 700 - elapsed));
      setLines((l) => [...l, ...out]);
    } catch {
      setLines((l) => [...l, { kind: "err", text: "network error — the node may be waking up; retry in ~30s" }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const started = lines.some((l) => l.kind === "in");

  return (
    <main className="mx-auto flex h-[100dvh] max-w-3xl flex-col px-4">
      {/* top bar */}
      <header className="flex items-center gap-2.5 py-4">
        <RhinoMark className="h-7 w-7" />
        <div className="leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">0n1x</span>
          <span className="ml-1.5 text-[15px] font-light text-muted-2">chat</span>
        </div>
        <span className="ml-2 flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> signed
        </span>
        <nav className="ml-auto flex items-center gap-1 text-[12px]">
          <a href="/census" className="rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground">Census</a>
          <a href="/dashboard" className="rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground">ID + Wallet</a>
          {me && <span className="ml-1 rounded-full bg-accent/15 px-2 py-1 text-[11px] font-medium text-accent">{me}</span>}
        </nav>
      </header>

      {/* conversation */}
      <div className="flex-1 space-y-5 overflow-y-auto pb-4" onClick={() => inputRef.current?.focus()}>
        {!started && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent/5 ring-1 ring-accent/20">
              <RhinoMark className="h-8 w-8" />
            </div>
            <h2 className="bg-gradient-to-r from-foreground to-muted-2 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
              Ask 0n1x anything
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-2">
              I converse like a normal chat — but every fact about the network is pulled live and
              <span className="text-emerald"> cryptographically signed</span>. I explain; the network proves. 🤍
            </p>
            <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => submit(c)}
                  className="rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-left text-[13px] text-muted transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:text-foreground"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {lines.map((l, i) => {
          if (l.kind === "in")
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent/15 px-4 py-2.5 text-[15px] text-foreground">
                  {l.text}
                </div>
              </div>
            );
          const signed = l.kind === "sys" && l.text.trim().startsWith("✓");
          return (
            <div key={i} className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/15">
                <RhinoMark className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                {signed ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald/25 bg-emerald/5 px-2.5 py-1 font-mono text-[11px] text-emerald">
                    {l.text.trim()}
                  </div>
                ) : (
                  <div
                    className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${
                      l.kind === "err" ? "text-red-400" : l.kind === "sys" ? "text-muted-2" : "text-foreground"
                    } ${l.text.includes("┌") || l.text.includes("│") ? "font-mono text-[13px]" : ""}`}
                  >
                    <Linkified text={l.text} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/15">
              <RhinoMark className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 pt-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-2 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-2 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-2" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* input pill */}
      <div className="pb-5">
        {started && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {CHIPS.slice(0, 3).map((c) => (
              <button key={c} onClick={() => submit(c)} disabled={busy}
                className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40">
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-surface px-4 py-2.5 shadow-lg shadow-black/20 focus-within:border-accent/50">
          <textarea
            ref={inputRef as any}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            rows={1}
            placeholder="Message 0n1x — e.g. is stripe.com legit?"
            autoFocus
            spellCheck={false}
            className="max-h-32 w-full resize-none bg-transparent py-1 text-[15px] text-foreground outline-none placeholder:text-muted-2/60"
          />
          <button
            onClick={() => submit()}
            disabled={busy || !input.trim()}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/70 text-white transition-opacity hover:opacity-90 disabled:opacity-30"
            aria-label="send"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3 11l18-8-8 18-2-7-8-3z" /></svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-2">
          every fact Ed25519-signed · <a href="/census" className="text-accent hover:underline">census</a> · <a href="/dashboard" className="text-accent hover:underline">mint your identity</a> 🤍
        </p>
      </div>
    </main>
  );
}
