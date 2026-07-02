"use client";

import { useEffect, useRef, useState } from "react";

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

async function runCommand(raw: string): Promise<Line[]> {
  const [cmd, ...args] = raw.trim().split(/\s+/);
  const arg = args.join(" ").trim();

  switch ((cmd || "").toLowerCase()) {
    case "help":
    case "?":
      return [{ kind: "sys", text: HELP }];

    case "check": {
      if (!arg) return [{ kind: "err", text: "usage: check <domain>   e.g. check stripe.com" }];
      const dom = arg.replace(/^https?:\/\//, "").split("/")[0];
      const { status, body } = await fetchJson(`${API}/api/check?url=${encodeURIComponent(dom)}`, 45000);
      if (status !== 200 || !body) return [{ kind: "err", text: `check failed (HTTP ${status}) — the network node may be cold-starting; try again in ~30s` }];
      const att = body.onyx_attestation || {};
      const out: string[] = [
        `┌─ SIGNED VERDICT · ${dom}`,
        `│ verdict     : ${body.verdict ?? body.result ?? "—"}`,
      ];
      if (body.trust_score !== undefined) out.push(`│ trust score : ${body.trust_score}`);
      if (body.age_days !== undefined) out.push(`│ domain age  : ${body.age_days} days`);
      out.push(`│ signed by   : ${att.kid ?? "—"}`);
      out.push(`│ sig         : ${String(att.sig ?? "—").slice(0, 44)}…`);
      out.push(`└─ Ed25519+JCS · verify at ${API}/.well-known/onyx-pubkey`);
      return [{ kind: "out", text: out.join("\n") }];
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

export function Terminal() {
  const [lines, setLines] = useState<Line[]>([
    { kind: "sys", text: "0N1X TERMINAL v1 — the network does the fetching. Type \"help\" to begin." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, busy]);

  async function submit() {
    const raw = input.trim();
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
        <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-muted-2">
          signed network state · live
        </span>
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
          placeholder='try: check stripe.com'
          autoFocus
          spellCheck={false}
          className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-2/60"
        />
      </div>

      <p className="mt-3 text-center font-mono text-[10px] text-muted-2">
        deterministic commands over Ed25519-signed state — no LLM, no cost, scales to anyone ·{" "}
        <a href={`${HUB}/census`} className="text-accent hover:underline">census</a> ·{" "}
        <a href={`${HUB}/dashboard`} className="text-accent hover:underline">mint identity</a>
      </p>
    </main>
  );
}
