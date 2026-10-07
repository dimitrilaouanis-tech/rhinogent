"use client";

// KEY PASSPHRASE — set once, unlock your agents anywhere.
//
// Why this page exists: agent private keys are encrypted with a key derived from the LOGIN
// PASSWORD, so a Google sign-in has nothing to derive from and the vault cannot open at all —
// on any device. The agents chat fine and can never sign. A passphrase decouples the vault from
// how you authenticate, so the same keys open on the browser, the phone browser and the app.
//
// Copy rule for this page: say what happens to the keys, not what happens to the ciphertext.
// The user is deciding whether their agents can sign on other devices; the crypto is detail.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadAgents } from "@/lib/agents";
import { accountAgents } from "@/lib/agent-sync";
import { signProof, passportMessage } from "@/lib/identity";
import { recoverMessageAddress } from "viem";
import {
  usesPassphrase, unlock, isUnlocked, migrateFromPassword, initWithPassphrase, readAgents,
} from "@/lib/vault";

type Mode = "loading" | "signed-out" | "migrate" | "init" | "locked" | "unlocked";

export default function VaultPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [pass, setPass] = useState("");        // login password (migration only)
  const [phrase, setPhrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [count, setCount] = useState(0);
  // Callsigns only — the key material is never lifted out of the vault module.
  const [signers, setSigners] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

  const [sigTest, setSigTest] = useState<string | null>(null);

  /**
   * END-TO-END SIGNATURE PROOF. "The vault migrated" and "this key can sign" are different claims:
   * the first says bytes round-tripped, the second says the key is intact and usable. This signs a
   * real passport message with a key taken from the vault, recovers the signer address from the
   * signature, and checks it matches the agent's own address. Recovery is the test that cannot be
   * faked by a well-formed but wrong key.
   */
  async function testSignature() {
    setSigTest("signing…");
    try {
      const inVault = (await readAgents()) ?? [];
      const withKey = inVault.find((a) => !!(a as { privateKey?: string }).privateKey);
      if (!withKey) { setSigTest("No key in the vault to test."); return; }
      const proof = await signProof(withKey);
      const recovered = await recoverMessageAddress({
        message: passportMessage(withKey.id, withKey.did, proof.issued),
        signature: proof.sig as `0x${string}`,
      });
      const ok = recovered.toLowerCase() === String(withKey.address).toLowerCase();
      setSigTest(ok
        ? `✓ ${withKey.id} signed, and the signature recovers to its own address. Signing works.`
        : `✗ ${withKey.id} produced a signature that recovers to a DIFFERENT address — the key does not match this identity.`);
    } catch (e) {
      setSigTest(`✗ Signing failed: ${String(e).slice(0, 90)}`);
    }
  }

  /**
   * Which agents can actually sign.
   *
   * Compares the ACCOUNT roster against what the vault really holds. The first version compared
   * against localStorage, which on a fresh device is stale or empty — it listed an agent that is
   * not on the roster at all (Iron-Beacon-E320) and showed nothing under "can sign" while a key in
   * that same vault signed successfully a moment later. A list that disagrees with a proof is
   * worse than no list.
   *
   * `hasKey` is decided HERE, from vault membership by address — not read from accountAgents(),
   * which sets hasKey:true for anything in localStorage on the assumption that a local agent has
   * its key. That assumption is what this page exists to test.
   */
  async function reconcileSigners() {
    try {
      const inVault = (await readAgents()) ?? [];
      const has = new Set(inVault
        .filter((a) => !!(a as { privateKey?: string }).privateKey)
        .map((a) => String((a as { address?: string }).address || "").toLowerCase()));

      // Account roster, with local as a fallback if the account read fails offline.
      let roster: { id: string; address: string }[] = [];
      try {
        roster = (await accountAgents()).map((a) => ({ id: a.id, address: a.address }));
      } catch { /* fall through */ }
      if (!roster.length) roster = loadAgents().map((a) => ({ id: a.id, address: a.address }));

      const can: string[] = [];
      const cannot: string[] = [];
      const seen = new Set<string>();
      for (const a of roster) {
        const addr = String(a.address || "").toLowerCase();
        if (!addr || seen.has(addr)) continue;
        seen.add(addr);
        (has.has(addr) ? can : cannot).push(a.id);
      }
      // A key in the vault whose agent is NOT on the roster is still a signer — it just lost its
      // public row. Surfacing it is how you notice a roster that has drifted from the keys.
      for (const v of inVault) {
        const addr = String((v as { address?: string }).address || "").toLowerCase();
        if (addr && has.has(addr) && !seen.has(addr)) {
          seen.add(addr);
          can.push(`${(v as { id?: string }).id ?? addr} (not on roster)`);
        }
      }
      setSigners(can);
      setMissing(cannot);
      setCount(can.length);
    } catch {
      setSigners([]); setMissing([]);
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { setMode("signed-out"); return; }
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      if (await usesPassphrase()) { setMode(isUnlocked() ? "unlocked" : "locked"); return; }
      // No passphrase yet: migrate if a legacy vault exists, otherwise wrap what's on this device.
      setMode(meta.agentsCipher ? "migrate" : "init");
    })();
  }, []);

  const valid = phrase.length >= 10 && phrase === confirm;

  async function run() {
    setBusy(true); setMsg(null);
    try {
      if (mode === "migrate") {
        const r = await migrateFromPassword(pass, phrase);
        if (r.ok) {
          setCount(r.agents); setMode("unlocked"); await reconcileSigners();
          setMsg({ kind: "ok", text: `${r.agents} agent${r.agents === 1 ? "" : "s"} moved to your passphrase. They now open on any device.` });
        } else {
          const why: Record<string, string> = {
            "wrong-password": "That login password didn't open the vault. Use the password you signed up with — not your Google account.",
            "no-legacy-vault": "There's no existing vault on this account to move.",
            "verify-failed": "The re-encrypted keys didn't read back correctly, so nothing was changed. Try again.",
            "write-failed": "Couldn't save to your account. Check your connection and try again.",
            "no-session": "You're signed out.",
          };
          setMsg({ kind: "err", text: why[r.reason] ?? "Something went wrong. Nothing was changed." });
        }
      } else if (mode === "init") {
        const ok = await initWithPassphrase(phrase, loadAgents());
        setMode(ok ? "unlocked" : "init"); if (ok) await reconcileSigners();
        setMsg(ok
          ? { kind: "ok", text: "Passphrase set. Your agents now open on any device." }
          : { kind: "err", text: "Couldn't save. Nothing was changed." });
      } else if (mode === "locked") {
        const ok = await unlock(phrase);
        if (ok) {
          const a = await readAgents();
          setCount(a?.length ?? 0); setMode("unlocked"); await reconcileSigners();
          setMsg({ kind: "ok", text: "Unlocked for this tab." });
        } else {
          setMsg({ kind: "err", text: "That passphrase didn't open the vault." });
        }
      }
    } finally { setBusy(false); setPass(""); }
  }

  return (
    <main className="mx-auto w-full max-w-[560px] px-5 py-12">
      <Link href="/dashboard" className="text-[13px] text-muted-2 hover:text-foreground">← My agents</Link>
      <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-foreground">Key passphrase</h1>

      {mode === "loading" && <p className="mt-4 text-sm text-muted">Checking your account…</p>}

      {mode === "signed-out" && (
        <p className="mt-4 text-sm text-muted">Sign in to manage your key passphrase.</p>
      )}

      {mode === "migrate" && (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Right now your agent keys are locked to the password you signed up with — so on a
            Google sign-in they can&apos;t be opened at all, and your agents can chat but can&apos;t sign.
            Set a passphrase and the same keys open on every device.
          </p>
          <div className="mt-6 space-y-3">
            <Field label="Your sign-up password" value={pass} onChange={setPass} type="password"
                   hint="Used once, here, to open the existing vault. Never stored." />
            <Field label="New key passphrase" value={phrase} onChange={setPhrase} type="password"
                   hint="At least 10 characters. This is the only thing that opens your keys — it can't be reset." />
            <Field label="Confirm passphrase" value={confirm} onChange={setConfirm} type="password" />
          </div>
        </>
      )}

      {mode === "init" && (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Set a passphrase so your agents can sign from any device. It wraps the keys held on
            this device — do this here, where they live.
          </p>
          <div className="mt-6 space-y-3">
            <Field label="Key passphrase" value={phrase} onChange={setPhrase} type="password"
                   hint="At least 10 characters. It can't be reset — if you lose it, the keys are gone." />
            <Field label="Confirm passphrase" value={confirm} onChange={setConfirm} type="password" />
          </div>
        </>
      )}

      {mode === "locked" && (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Enter your passphrase to unlock your agents in this tab.
          </p>
          <div className="mt-6 space-y-3">
            <Field label="Key passphrase" value={phrase} onChange={setPhrase} type="password" />
          </div>
        </>
      )}

      {mode === "unlocked" && (
        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <p className="text-[15px] font-medium text-foreground">Unlocked</p>
          <p className="mt-1 text-[13.5px] text-muted">
            {count > 0 ? `${count} agent${count === 1 ? "" : "s"} available to sign in this tab.` : "Your agents are available to sign in this tab."}
            {" "}Your passphrase opens them on any device — phone, browser or app.
          </p>

          {/* WHICH AGENTS CAN ACTUALLY SIGN.
              The roster (public: callsign, address, did) and the vault (private keys) are separate
              stores, and they can disagree — a roster row restored from the archive brings back the
              identity but not the key. "You have 10 agents" is then true and misleading at the same
              time. Listing both sides makes the real capability visible instead of assumed. Only
              callsigns are ever rendered; no key material touches the DOM. */}
          {signers.length + missing.length > 0 && (
            <div className="mt-4 space-y-3">
              {signers.length > 0 && (
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-muted-2">Can sign</p>
                  <ul className="mt-1 space-y-0.5">
                    {signers.map((c) => (
                      <li key={c} className="font-mono text-[13px] text-foreground">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {missing.length > 0 && (
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-muted-2">Chat only — no key in the vault</p>
                  <ul className="mt-1 space-y-0.5">
                    {missing.map((c) => (
                      <li key={c} className="font-mono text-[13px] text-muted">{c}</li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-2">
                    These answer as themselves but can&apos;t sign — their key was minted on a device
                    this vault never held. Mint a replacement here to get a signing agent under a
                    name you control.
                  </p>
                </div>
              )}

              {/* Proof, not assurance: sign a real message and recover the signer from it. */}
              <div className="border-t border-border pt-3">
                <button
                  onClick={testSignature}
                  className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-foreground transition-colors hover:bg-background"
                >
                  Test a signature
                </button>
                {sigTest && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{sigTest}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(mode === "migrate" || mode === "init" || mode === "locked") && (
        <button
          onClick={run}
          disabled={busy || !phrase || (mode !== "locked" && !valid) || (mode === "migrate" && !pass)}
          className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 text-[15px] font-medium text-white transition-opacity disabled:opacity-40"
        >
          {busy ? "Working…" : mode === "locked" ? "Unlock" : "Set passphrase"}
        </button>
      )}

      {mode !== "locked" && (mode === "migrate" || mode === "init") && phrase && !valid && (
        <p className="mt-2 text-[12.5px] text-muted-2">
          {phrase.length < 10 ? "Use at least 10 characters." : "The two passphrases don't match."}
        </p>
      )}

      {msg && (
        <p className={`mt-4 text-[13.5px] ${msg.kind === "ok" ? "text-foreground" : "text-red-500"}`}>
          {msg.text}
        </p>
      )}

      <p className="mt-8 text-[12.5px] leading-relaxed text-muted-2">
        Your keys are encrypted on your device before anything is saved. We store only the
        encrypted blob — never your passphrase, and never a key we could read. That also means we
        can&apos;t recover it for you.
      </p>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-accent"
      />
      {hint && <span className="mt-1 block text-[12px] text-muted-2">{hint}</span>}
    </label>
  );
}
