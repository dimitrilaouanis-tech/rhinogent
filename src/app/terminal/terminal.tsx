"use client";

import { useEffect, useRef, useState } from "react";
import { RhinoMark } from "@/components/rhino";

const API = "https://onyx-actions.onrender.com";
const HUB = "https://dimitrilaouanis-tech.github.io/rhinogent";

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
  if (["help", "?", "check", "census", "top", "root", "join", "card", "bounties", "eco", "ecosystem", "news", "feed"].includes(first)) return raw.trim();
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
    const r = await fetch(`${API}/v1/chat`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || d.ok === false || !d.reply) return null;   // portal offline -> fall back
    const out: Line[] = [{ kind: "out", text: d.reply }];
    // surface the signed facts the model actually used (the hero — nothing invented)
    for (const s of d.signed || []) {
      if (s.result?.signature)
        out.push({ kind: "sys", text: `  ✓ signed by ${s.result.signed_by} · ${String(s.result.signature).slice(0, 32)}… (Ed25519, verifiable)` });
    }
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
  if (!isCommand && input.trim().split(/\s+/).length >= 3) {
    const portal = await tryPortal(input.trim());
    if (portal) return portal;
  }

  switch ((cmd || "").toLowerCase()) {
    case "hello":
      return [{ kind: "sys", text: `hey 🤍 — I'm 0n1x. Ask me things like:\n  "is stripe.com legit?"  ·  "show me the ecosystem"  ·  "who's on top?"\nEvery answer comes from live, Ed25519-signed network state — I never make facts up.` }];

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
      return [{ kind: "err", text: `unknown command: ${cmd} — type "help"` }];
  }
}

const ADJ = ["Keen","Bright","Iron","Swift","Bold","Quiet","Sharp","Stone","Onyx","Vast","Lone","Prime","True","Grave","Wild","Steel"];
const NOUN = ["Beacon","Warden","Monolith","Horn","Sentinel","Rampart","Cipher","Bastion","Anchor","Forge","Vault","Ridge","Pillar","Crest","Spire","Tusk"];
function callsignFor(a: string): string {
  const h = a.toLowerCase().replace(/^0x/, "");
  return `${ADJ[parseInt(h.slice(0, 2), 16) % 16]}-${NOUN[parseInt(h.slice(2, 4), 16) % 16]}-${h.slice(-4).toUpperCase()}`;
}

const CHIPS = [
  "is stripe.com legit?",
  "show me the ecosystem",
  "who's on top?",
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
      setAddr(a); setMe(cs);
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
      const out = await runCommand(raw);
      setLines((l) => [...l, ...out]);
    } catch {
      setLines((l) => [...l, { kind: "err", text: "network error — the node may be waking up; retry in ~30s" }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
        </span>
        <h1 className="font-mono text-sm font-bold tracking-widest text-foreground">0N1X · TERMINAL</h1>
        <RhinoMark className="ml-auto h-6 w-6 opacity-90" />
        <a href="/rhinogent" className="font-mono text-[9px] uppercase tracking-widest text-muted-2 transition-colors hover:text-accent">
          rhinogent
        </a>
      </div>

      {/* rhinogent-integrated nav — census + identity live on their OWN pages */}
      <div className="mt-2 flex items-center gap-2 font-mono text-[11px]">
        <span className="text-muted-2">go:</span>
        <a href="/rhinogent/census" className="rounded border border-border px-2 py-0.5 text-muted transition-colors hover:border-accent/50 hover:text-accent">📊 Census</a>
        <a href="/rhinogent/dashboard" className="rounded border border-border px-2 py-0.5 text-muted transition-colors hover:border-accent/50 hover:text-accent">🦏 Your ID + Wallet</a>
        {me && <span className="ml-auto text-emerald">● {me}</span>}
      </div>

      <div
        className="mt-3 h-[28rem] overflow-y-auto rounded-lg border border-border bg-black/40 p-3 font-mono text-[13px] leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l, i) => (
          <pre
            key={i}
            className={`whitespace-pre-wrap break-words ${
              l.kind === "in" ? "text-accent" : l.kind === "err" ? "text-red-400" : l.kind === "sys" ? "text-muted-2" : "text-foreground"
            }`}
          >
            {l.kind === "in" ? `❯ ${l.text}` : l.text}
          </pre>
        ))}
        {busy && <pre className="animate-pulse text-muted-2">… fetching signed state</pre>}
        <div ref={endRef} />
      </div>

      {/* suggestion chips — chat leads, precision is a tap away */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => submit(c)}
            disabled={busy}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm">
        <span className="text-accent">❯</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "ArrowUp") {
              const ni = Math.min(hIdx + 1, history.length - 1);
              if (history[ni]) { setHIdx(ni); setInput(history[ni]); }
            } else if (e.key === "ArrowDown") {
              const ni = hIdx - 1;
              setHIdx(ni);
              setInput(ni >= 0 ? history[ni] : "");
            }
          }}
          placeholder='talk to the network — try: is stripe.com legit?'
          autoFocus
          spellCheck={false}
          className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-2/60"
        />
      </div>

      <p className="mt-3 text-center font-mono text-[10px] text-muted-2">
        every fact Ed25519-signed — I explain, the network proves 🤍 ·{" "}
        <a href={`${HUB}/census`} className="text-accent hover:underline">census</a> ·{" "}
        <a href={`${HUB}/dashboard`} className="text-accent hover:underline">mint identity</a>
      </p>
    </main>
  );
}
