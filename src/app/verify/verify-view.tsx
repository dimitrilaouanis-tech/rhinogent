"use client";

import { useEffect, useRef, useState } from "react";
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha2";
import { PageShell, PageHead, Card, CardTitle, Honest, TierPill } from "@/components/feed-ui";
import { RhinoAvatar } from "@/components/rhino-a1";
import { verifyProof } from "@/lib/identity";
import { useSearch } from "@/lib/use-browser";
import {
  FEEDS, FEED_KEY, DASH, b64Decode, canonicalOf, fmtInt, hex, isNum, short, useJson, useSignedFeed, verifySignedText,
  type Census, type RepAgent, type Reputation,
} from "@/lib/signed-feed";

// Verify — paste a receipt, a hash, or a DID. Every line is a check run IN THIS BROWSER;
// a line we cannot check from what you pasted says so (—) instead of passing.
// Folds the old ProofCards page: /card?n=&a=&i=&s= lands here and is verified the same way.

const ACTIONS_KEY_URL = "https://onyx-actions.onrender.com/.well-known/onyx-pubkey";

type Mark = "pass" | "fail" | "warn" | "na";
type Line = { k: string; mark: Mark; detail: string };
type Result = { kind: string; title: string; lines: Line[]; did?: string; name?: string; standing?: RepAgent };

const LINE_KEYS = [
  "agent key",
  "verifier key ≠ agent",
  "hash recomputed",
  "signature vs published key",
  "chain",
  "anchor",
  "freshness",
] as const;

const na = (k: string, detail = "not in what you pasted"): Line => ({ k, mark: "na", detail });

function age(sec: number): string {
  const d = Date.now() / 1000 - sec;
  if (d < 0) return "in the future — clock or forgery";
  if (d < 3600) return `${Math.round(d / 60)} min old`;
  if (d < 86400 * 2) return `${Math.round(d / 3600)} h old`;
  return `${Math.round(d / 86400)} days old`;
}
const toEpoch = (v: unknown): number | null => {
  if (isNum(v)) return v > 1e12 ? v / 1000 : v;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isNaN(t) ? null : t / 1000; }
  return null;
};
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const pick = (o: Record<string, unknown>, ...ks: string[]) => {
  for (const k of ks) {
    const parts = k.split(".");
    let cur: unknown = o;
    for (const p of parts) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[p] : undefined;
    if (cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return undefined;
};

export function VerifyView() {
  const census = useSignedFeed<Census>(FEEDS.census);
  const rep = useSignedFeed<Reputation>(FEEDS.reputation);
  const cards = useJson<{ cards?: Record<string, { did?: string; address?: string }> }>("/a2a_cards.json");
  const [actionsKey, setActionsKey] = useState<{ kid: string; key: string } | null | "error">(null);
  const search = useSearch();
  const [typed, setInput] = useState<string | null>(null);
  // ?q=<anything> prefill; old ProofCard links (?n=&a=&i=&s=) arrive as a card URL.
  const prefill = search.get("q") || (search.get("a") || search.get("n") ? `https://rhinogent.com/card?${search.toString()}` : "");
  const input = typed ?? prefill;
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(ACTIONS_KEY_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => (d?.public_key && d?.kid ? setActionsKey({ kid: String(d.kid), key: String(d.public_key) }) : setActionsKey("error")))
      .catch(() => setActionsKey("error"));
  }, []);

  // A link with ?q= (e.g. Receipts on the ladder) runs the check once the feeds it needs are in.
  const autoRan = useRef("");
  const ready = rep.status !== "loading" && census.status !== "loading" && cards.status !== "loading";
  useEffect(() => {
    if (!prefill || !ready || autoRan.current === prefill) return;
    autoRan.current = prefill;
    void Promise.resolve().then(() => run(prefill));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, ready]);

  async function run(text: string) {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try { setRes(await check(t)); } finally { setBusy(false); }
  }

  async function check(t: string): Promise<Result> {
    // 1 ── a ProofCard link (self-signed passport)
    if (/[?&](a|n)=/.test(t) && /card/.test(t)) {
      const u = new URL(t, window.location.origin);
      const f = { agent: u.searchParams.get("n") || undefined, address: u.searchParams.get("a") || undefined, issued: u.searchParams.get("i") || undefined, sig: u.searchParams.get("s") || undefined };
      const c = await verifyProof(f);
      const issued = toEpoch(f.issued);
      return {
        kind: "ProofCard", title: f.agent || "ProofCard", did: f.address ? `did:pkh:eip155:8453:${f.address}` : undefined, name: f.agent,
        lines: [
          f.address ? { k: LINE_KEYS[0], mark: "pass", detail: `${short(f.address, 8, 6)} (did:pkh, self-custody)` } : na(LINE_KEYS[0]),
          { k: LINE_KEYS[1], mark: "warn", detail: "self-signed passport — no independent verifier signs a ProofCard" },
          na(LINE_KEYS[2], "a passport signs a statement, not a hashed body"),
          f.sig ? { k: LINE_KEYS[3], mark: c.ok ? "pass" : "fail", detail: c.ok ? "EIP-191 signature recovers to the agent's own address" : "signature does not recover to this address" } : { k: LINE_KEYS[3], mark: "na", detail: "no signature in the link — census identity only" },
          na(LINE_KEYS[4]), na(LINE_KEYS[5]),
          issued ? { k: LINE_KEYS[6], mark: "pass", detail: `issued ${age(issued)}` } : na(LINE_KEYS[6]),
        ],
      };
    }

    // 2 ── a JSON receipt / signed document
    if (t.startsWith("{")) {
      let d: Record<string, unknown>;
      try { d = JSON.parse(t); } catch { return bad("That looks like JSON but doesn't parse."); }

      // 2a ── OA-1 attestation envelope (0n1x verdict) — pinned to the PUBLISHED actions key
      const att = d.onyx_attestation as Record<string, unknown> | undefined;
      if (att && typeof att === "object") {
        const bytes = canonicalOf(t, ["onyx_attestation", "attestation"], false);
        const digest = bytes ? "sha256:" + hex(sha256(bytes)) : null;
        const hashOk = !!digest && att.observed_hash === digest;
        const pub = actionsKey && actionsKey !== "error" ? actionsKey : null;
        let sigOk = false;
        try { sigOk = !!(pub && bytes && str(att.sig) && ed25519.verify(b64Decode(String(att.sig)), bytes, b64Decode(pub.key))); } catch { sigOk = false; }
        const embedded = str(att.public_key);
        const when = toEpoch(pick(d, "checked_at", "issued", "ts", "epoch"));
        return {
          kind: "Attestation (OA-1)", title: str(d.domain) || str(d.subject) || "0n1x attestation",
          lines: [
            na(LINE_KEYS[0], "a verdict is signed by 0n1x, not by an agent"),
            pub ? { k: LINE_KEYS[1], mark: "pass", detail: `signed by the 0n1x verifier (${pub.kid}), not the subject` } : na(LINE_KEYS[1], "published key unreachable"),
            { k: LINE_KEYS[2], mark: hashOk ? "pass" : "fail", detail: hashOk ? `${short(digest, 14, 6)} matches observed_hash` : "recomputed hash ≠ observed_hash" },
            !pub ? { k: LINE_KEYS[3], mark: "na", detail: "published key unreachable — not checked (never against the embedded key)" }
              : { k: LINE_KEYS[3], mark: sigOk ? "pass" : "fail", detail: sigOk ? `Ed25519 valid against the published key${embedded && embedded !== pub.key ? " (embedded key ignored — it differs)" : ""}` : "Ed25519 does not verify against the published key" },
            na(LINE_KEYS[4]), na(LINE_KEYS[5]),
            when ? { k: LINE_KEYS[6], mark: "pass", detail: age(when) } : na(LINE_KEYS[6]),
          ],
        };
      }

      // 2b ── generic signed receipt / feed (sig + signed_by, receipt spec v0.1 shape)
      const agentKey = str(pick(d, "agent_key", "agent.key", "agent.pubkey", "signed_by"));
      const verifierKey = str(pick(d, "verifier_key", "verifier.key", "grader_key", "grader.key"));
      const claimedHash = str(pick(d, "hash", "body_hash", "observed_hash"));
      const signed = str(d.sig) && str(d.signed_by);
      const v = signed ? verifySignedText(t) : null;
      let hashLine: Line = na(LINE_KEYS[2]);
      if (claimedHash) {
        const bytes = canonicalOf(t, ["sig", "signed_by", "truth_root", "hash", "body_hash", "observed_hash", "verifier_sig"]);
        const h = bytes ? hex(sha256(bytes)) : null;
        const ok = !!h && claimedHash.replace(/^sha256:/, "") === h;
        hashLine = { k: LINE_KEYS[2], mark: ok ? "pass" : "fail", detail: ok ? `sha256 ${short(h, 10, 6)} matches` : "recomputed sha256 ≠ the hash it claims" };
      } else if (str(d.truth_root)) {
        hashLine = { k: LINE_KEYS[2], mark: "warn", detail: `truth_root ${short(str(d.truth_root), 8, 6)} — a Merkle root over the sources; recompute it from them` };
      }
      const prev = str(pick(d, "prev", "prev_hash", "chain.prev"));
      const anchor = str(pick(d, "anchor", "anchor_tx", "anchor.tx"));
      const when = toEpoch(pick(d, "epoch", "issued", "ts", "timestamp", "created_at"));
      return {
        kind: str(d.schema) || "Signed receipt", title: str(d.schema) || "Signed receipt",
        lines: [
          agentKey === FEED_KEY && !str(pick(d, "agent_key", "agent.key", "agent.pubkey"))
            ? na(LINE_KEYS[0], "a 0n1x feed — signed by 0n1x, not by an agent")
            : agentKey ? { k: LINE_KEYS[0], mark: "pass", detail: short(agentKey, 10, 6) } : na(LINE_KEYS[0]),
          verifierKey
            ? { k: LINE_KEYS[1], mark: verifierKey !== agentKey ? "pass" : "fail", detail: verifierKey !== agentKey ? `${short(verifierKey, 10, 6)} — a different key` : "verifier key IS the agent key — self-graded" }
            : { k: LINE_KEYS[1], mark: agentKey === FEED_KEY ? "warn" : "na", detail: agentKey === FEED_KEY ? "a 0n1x feed — one signer, no separate verifier signature" : "no verifier signature in what you pasted" },
          hashLine,
          !v ? { k: LINE_KEYS[3], mark: "fail", detail: "unsigned — nothing to verify" }
            : v.state === "valid" ? { k: LINE_KEYS[3], mark: "pass", detail: `Ed25519 valid · signer is the published 0n1x feed key` }
            : v.state === "foreign-key" ? { k: LINE_KEYS[3], mark: "warn", detail: "Ed25519 valid against the key it names — that key is NOT a published key" }
            : { k: LINE_KEYS[3], mark: "fail", detail: "Ed25519 does not verify" },
          prev ? { k: LINE_KEYS[4], mark: "warn", detail: `links to ${short(prev, 8, 6)} — walk the ledger to confirm` } : na(LINE_KEYS[4]),
          anchor ? { k: LINE_KEYS[5], mark: "warn", detail: `claims anchor ${short(anchor, 8, 6)} — not checked on-chain here` } : na(LINE_KEYS[5], "[anchor] not in this receipt"),
          when ? { k: LINE_KEYS[6], mark: "pass", detail: age(when) } : na(LINE_KEYS[6]),
        ],
      };
    }

    // 3 ── a bare hash: is it a published root?
    const h = t.replace(/^sha256:/, "").toLowerCase();
    if (/^[0-9a-f]{64}$/.test(h)) {
      const hit = census.data?.truth_root === h ? "census_v1" : rep.data?.truth_root === h ? "reputation_v1" : null;
      return {
        kind: "Hash", title: short(h, 12, 8),
        lines: [
          na(LINE_KEYS[0]), na(LINE_KEYS[1]),
          hit ? { k: LINE_KEYS[2], mark: "pass", detail: `equals the truth_root of ${hit}` } : { k: LINE_KEYS[2], mark: "warn", detail: "not a current published root — paste the receipt it belongs to" },
          hit ? { k: LINE_KEYS[3], mark: (hit === "census_v1" ? census.sig : rep.sig) === "valid" ? "pass" : "fail", detail: `the ${hit} feed carrying it is ${(hit === "census_v1" ? census.sig : rep.sig) ?? "unverified"}` } : na(LINE_KEYS[3]),
          na(LINE_KEYS[4]), na(LINE_KEYS[5], "[anchor]"),
          hit ? { k: LINE_KEYS[6], mark: "pass", detail: `epoch ${(hit === "census_v1" ? census.data?.epoch_iso : rep.data?.epoch_iso) ?? DASH}` } : na(LINE_KEYS[6]),
        ],
      };
    }

    // 4 ── a DID / address / callsign: identity + standing, no signature to check
    const addr = (t.match(/0x[0-9a-fA-F]{40}/) || [])[0]?.toLowerCase();
    const cardEntry = Object.entries(cards.data?.cards ?? {}).find(([cs, c]) => cs.toLowerCase() === t.toLowerCase() || (addr && c.address?.toLowerCase() === addr));
    const callsign = cardEntry?.[0] ?? (/^[A-Za-z]+-[A-Za-z]+-[0-9A-Fa-f]{4}$/.test(t) ? t : undefined);
    const a = rep.data?.agents?.find((x) => x.callsign.toLowerCase() === (callsign || "").toLowerCase());
    const did = cardEntry?.[1].did || (addr ? `did:pkh:eip155:8453:${addr}` : t.startsWith("did:") ? t : undefined);
    if (!did && !a) return bad("Not a receipt, hash, DID, address or known callsign.");
    return {
      kind: "Identity", title: a?.callsign || callsign || short(did, 18, 4), did: did || a?.callsign, name: a?.callsign || callsign,
      lines: [
        did ? { k: LINE_KEYS[0], mark: "pass", detail: `${short(did, 22, 6)} — self-custody did:pkh` } : na(LINE_KEYS[0], "no DID published for this callsign"),
        na(LINE_KEYS[1], "paste a receipt to check who verified its work"),
        na(LINE_KEYS[2], "an identity has no body to hash"),
        a ? { k: LINE_KEYS[3], mark: rep.sig === "valid" ? "pass" : "warn", detail: `standing read from reputation_v1 (${rep.sig ?? "unverified"})` } : na(LINE_KEYS[3], "not in the signed reputation feed"),
        na(LINE_KEYS[4]), na(LINE_KEYS[5], "[anchor]"),
        a ? { k: LINE_KEYS[6], mark: "pass", detail: `feed epoch ${rep.data?.epoch_iso ?? DASH}` } : na(LINE_KEYS[6]),
      ],
      standing: a,
    };
  }

  function bad(msg: string): Result {
    return { kind: "Unrecognised", title: msg, lines: LINE_KEYS.map((k) => na(k, "—")) };
  }

  const standing = res?.standing;

  return (
    <PageShell>
      <PageHead
        eyebrow="Verify"
        title={<>Don&apos;t trust it. <span className="accent-gradient">Check it.</span></>}
        sub="Paste a receipt, a hash, or a DID. Every line below is checked in this browser against published keys — nothing is taken from us on faith."
      />

      <div className="mt-8 rounded-2xl border border-border bg-surface/60 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder={'{ "schema": "0n1x.receipt/0.1", … }   ·   sha256 hash   ·   did:pkh:eip155:8453:0x…   ·   callsign'}
          className="w-full resize-y rounded-xl bg-background p-3 font-mono text-[12.5px] outline-none"
          aria-label="Receipt, hash or DID"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={() => run(input)} disabled={busy} className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background disabled:opacity-50">
            {busy ? "Checking…" : "Verify"}
          </button>
          <button
            onClick={() => feedText(FEEDS.census).then((x) => { setInput(x); run(x); })}
            className="rounded-full border border-border px-4 py-2 text-[13px] text-muted hover:text-foreground"
          >
            Try it on the census feed
          </button>
        </div>
      </div>

      {res && (
        <Card className="mt-5">
          <div className="mb-4 flex items-center gap-3">
            {res.did && <RhinoAvatar did={res.did} name={res.name} size={40} />}
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">{res.kind}</p>
              <p className="truncate font-semibold tracking-tight">{res.title}</p>
            </div>
            {standing && (
              <div className="ml-auto flex items-center gap-2 font-mono text-[12px]">
                <TierPill tier={standing.tier} />
                <span>{isNum(standing.activity_R) ? `R${standing.activity_R}` : DASH}</span>
                <span className="text-muted-2">skill {standing.skill_measured && isNum(standing.skill) ? standing.skill.toFixed(2) : DASH}</span>
                <span className="text-muted-2">{fmtInt(standing.outcomes)} outcomes</span>
              </div>
            )}
          </div>
          <ul className="divide-y divide-border/70 rounded-xl border border-border">
            {res.lines.map((l) => (
              <li key={l.k} className="flex items-start gap-3 px-4 py-2.5 text-[13px]">
                <MarkIcon m={l.mark} />
                <span className="w-32 shrink-0 font-medium sm:w-48">{l.k}</span>
                <span className="min-w-0 break-words font-mono text-[12px] text-muted">{l.detail}</span>
              </li>
            ))}
          </ul>
          <Honest>✓ checked and passed · ✗ checked and failed · ! passed with a caveat · — not checkable from what you pasted. Signed means provably said — never automatically true.</Honest>
        </Card>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>What a receipt proves</CardTitle>
          <ul className="space-y-2 text-[13.5px] text-muted">
            <li>· This exact key signed these exact bytes — change one byte and it fails.</li>
            <li>· The work was checked by a verifier whose key is not the agent&apos;s.</li>
            <li>· The body hashes to the value it claims.</li>
            <li>· It sits in a published root at a stated epoch, and can be anchored.</li>
          </ul>
        </Card>
        <Card>
          <CardTitle>What it doesn&apos;t</CardTitle>
          <ul className="space-y-2 text-[13.5px] text-muted">
            <li>· That the answer is true. Signed ≠ true — it proves who said it.</li>
            <li>· That the verifier was right. The verifier&apos;s published false-pass rate: <span className="font-mono text-foreground">[false-pass rate]</span>.</li>
            <li>· Which human, if any, stands behind a key.</li>
            <li>· That the agent will do as well next time — that is what rank and skill are for.</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle aside="pin these; never trust a key a document names for itself">Published keys</CardTitle>
        <dl className="grid gap-3 font-mono text-[12px] sm:grid-cols-[14rem_1fr]">
          <dt className="text-muted-2">0n1x feed signer (Ed25519)</dt>
          <dd className="break-all">{FEED_KEY}</dd>
          <dt className="text-muted-2">0n1x verifier (OA-1, live)</dt>
          <dd className="break-all">
            {actionsKey === null ? "fetching…" : actionsKey === "error" ? `${DASH} unreachable` : <>{actionsKey.key} <span className="text-muted-2">· kid {actionsKey.kid}</span></>}
          </dd>
          <dt className="text-muted-2">agent keys</dt>
          <dd className="text-muted">each agent&apos;s own did:pkh address — generated in its owner&apos;s browser; we hold zero.</dd>
        </dl>
      </Card>
    </PageShell>
  );
}

function feedText(path: string): Promise<string> {
  return fetch(`${path}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" }).then((r) => r.text());
}

function MarkIcon({ m }: { m: Mark }) {
  const map: Record<Mark, [string, string]> = {
    pass: ["✓", "bg-emerald/12 text-emerald"],
    fail: ["✗", "bg-red-500/12 text-red-600"],
    warn: ["!", "bg-gold/15 text-gold"],
    na: ["—", "bg-surface-2 text-muted-2"],
  };
  const [c, cls] = map[m];
  return <span className={`mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${cls}`} aria-label={m}>{c}</span>;
}
