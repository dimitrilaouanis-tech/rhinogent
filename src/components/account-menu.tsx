"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RhinoMark } from "./rhino";
import { supabase } from "@/lib/supabase";
import { loadAgents } from "@/lib/agents";

// ONE account control used by every nav (full Nav + slim MiniNav) so the menu is identical
// on every page: avatar → a classic profile card (identity + email) → My agents · Earn · Sign out.
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [agents, setAgents] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const read = () => { try { setAgents(loadAgents().length); } catch { setAgents(0); } };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

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
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-[0_16px_50px_-16px_rgba(17,17,26,.3)] backdrop-blur-xl">
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
