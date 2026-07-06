"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RhinoMark } from "./rhino";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/census", label: "Census" },
  { href: "/chat", label: "Chat" },
  { href: "#features", label: "Features" },
  { href: "#security", label: "Security" },
];

export function Nav() {
  // auth-aware: reflect the persisted Supabase session consistently on every page
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="h-px w-full hairline opacity-60" />
      <div className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <RhinoMark className="h-8 w-8" />
            <span className="text-[15px] font-semibold tracking-tight">Rhinogent</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-muted transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex min-w-[150px] items-center justify-end gap-3">
            {authed === null ? (
              // resolving — hold space so the bar doesn't flicker layout
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-2" />
            ) : authed ? (
              <>
                <Link href="/chat" className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline">
                  Chat
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  My agents
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline">
                  Sign in
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Get Rhinogent
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
