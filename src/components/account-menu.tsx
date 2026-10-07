"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RhinoMark } from "./rhino";
import { supabase } from "@/lib/supabase";
import { AGENTS_CHANGED, loadAgents } from "@/lib/agents";
import { accountAgents } from "@/lib/agent-sync";

// ONE account control used by every nav (full Nav + slim MiniNav) so the menu is identical
// on every page: avatar → a classic profile card (identity + email) → My agents · Earn · Sign out.
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  // Lazy initial read, not 0. Initialising to zero meant the FIRST paint
  // always said "0 agents" and only corrected after the effect ran -- a
  // flash of a wrong number on every first open. On the server there is no
  // window, so it returns 0 there and hydrates to the real count.
  const [agents, setAgents] = useState<number>(() => {
    try { return loadAgents().length; } catch { return 0; }
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // `storage` alone is not enough: it fires in OTHER tabs, never the one that
  // wrote. AGENTS_CHANGED covers this tab; re-reading on open covers anything
  // that changed the store without announcing it.
  useEffect(() => {
    const read = () => { try { setAgents(loadAgents().length); } catch { setAgents(0); } };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(AGENTS_CHANGED, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(AGENTS_CHANGED, read);
    };
  }, []);

  // On open, reconcile with the ACCOUNT view the dashboard renders (local keys
  // ∪ agents minted on other devices) so the two numbers cannot disagree.
  // Local count paints first; the merged count replaces it when it lands.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    try { setAgents(loadAgents().length); } catch { /* keep last known */ }
    accountAgents()
      .then((list) => { if (alive) setAgents(list.length); })
      .catch(() => { /* offline: the local count already shown stands */ });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initial = (email?.[0] || "").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className={`flex items-center justify-center rounded-full bg-accent/10 font-semibold text-accent ring-1 ring-inset ring-accent/25 transition hover:ring-accent/50 active:scale-[0.97] ${compact ? "h-8 w-8 text-[13px]" : "h-9 w-9 text-sm"}`}
      >
        {initial || <RhinoMark className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-background shadow-[0_16px_50px_-16px_rgba(17,17,26,.3)] backdrop-blur-xl">
          {/* classic profile card */}
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-[16px] font-semibold text-accent ring-1 ring-inset ring-accent/25">
              {initial || <RhinoMark className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{email || "Your account"}</p>
              <p className="text-[11.5px] text-muted-2">{agents} agent{agents === 1 ? "" : "s"} · self-custody</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface">
              <span className="text-muted-2">◆</span> My agents
            </Link>
            <Link href="/earn" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface">
              <span className="text-muted-2">↑</span> Earn
            </Link>
            {/* Key vault. Called "Key passphrase" rather than "vault settings" because what the
                user is doing is deciding whether their agents can sign on other devices — the
                jargon hides the stake. */}
            <Link href="/vault" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface">
              <span className="text-muted-2">⚿</span> Key passphrase
            </Link>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => { supabase.auth.signOut(); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <span className="text-muted-2">⇥</span> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
