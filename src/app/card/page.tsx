"use client";

import Link from "next/link";
import { MiniNav } from "@/components/mini-nav";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RhinoMark } from "@/components/rhino";
import { verifyProof, shortAddr, type PassportCheck } from "@/lib/identity";

// The ProofCard — a public, shareable "Verified by 0n1x" page for NON-CLI agents.
// Everything needed to verify lives in the URL (callsign, address, date, signature —
// never a private key). Anyone who opens the link verifies it client-side, no account,
// no backend, no install. Every card ends with "Mint yours" → the viral loop.

function Card() {
  const q = useSearchParams();
  const agent = q.get("n") || undefined;
  const address = q.get("a") || undefined;
  const issued = q.get("i") || undefined;
  const sig = q.get("s") || undefined;
  const [check, setCheck] = useState<PassportCheck | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    verifyProof({ agent, address, issued, sig }).then(setCheck);
  }, [agent, address, issued, sig]);

  const ok = check?.ok === true;

  return (
    <><MiniNav /><main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-6">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-2">
            Rhinogent ProofCard
          </span>
          <RhinoMark className="h-8 w-8" />
        </div>

        <p className="mt-4 text-2xl font-semibold tracking-tight">
          {agent || "Unknown agent"}
        </p>

        {check === null ? (
          <p className="mt-3 text-sm text-muted">Verifying signature…</p>
        ) : ok ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-3 py-1 text-sm font-medium text-emerald">
            ✓ Verified by 0n1x — self-custody key proven
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-3 py-1 text-sm font-medium text-[#ff6b6b]">
            ⚠ Unverified — {check.reason}
          </div>
        )}

        <dl className="mt-6 space-y-2.5 font-mono text-[12px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-2">did</dt>
            <dd className="truncate text-right text-foreground">
              {address ? `did:pkh:…${address.slice(-6)}` : "—"}
            </dd>
          </div>
          {address && (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <dt className="text-muted-2">pay · Base</dt>
              <dd className="text-foreground">
                {copied ? <span className="text-emerald">copied ✓</span> : shortAddr(address)}
              </dd>
            </button>
          )}
          {issued && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-2">issued</dt>
              <dd className="text-foreground">{issued}</dd>
            </div>
          )}
        </dl>

        {ok && (
          <p className="mt-5 text-xs leading-relaxed text-muted">
            This agent proved control of its self-custody key. You can pay it, trust its signed
            claims, and check this card again any time — the proof is in the link.
          </p>
        )}
      </div>

      <Link
        href="/dashboard"
        className="mt-4 block rounded-xl border border-accent bg-accent/10 px-4 py-3 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        🦏 Mint your own — free, 60 seconds, no install
      </Link>
      <Link
        href="/census"
        className="mt-2 block text-center text-[11px] text-muted-2 underline-offset-2 hover:text-muted hover:underline"
      >
        See the Census →
      </Link>
      <p className="mt-3 text-center text-[11px] text-muted-2">
        A self-custody identity + wallet for AI agents. Yours, verifiable anywhere.
      </p>
    </main></>
  );
}

export default function ProofCardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <Card />
    </Suspense>
  );
}
