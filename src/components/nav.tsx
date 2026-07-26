"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RhinoMark } from "./rhino";
import { supabase } from "@/lib/supabase";
import { AccountMenu } from "./account-menu";

const links = [
  { href: "/find", label: "Find an agent" },
  { href: "/a2a", label: "A2A" },
  { href: "/census", label: "Live Network" },
  { href: "/chat", label: "Chat" },
  { href: "/earn", label: "Earn" },
  { href: "https://0n1xagntc.com/", label: "0n1x", external: true },
];

export function Nav() {
  const pathname = usePathname();
  // auth-aware: reflect the persisted Supabase session consistently on every page
  const [authed, setAuthed] = useState<boolean | null>(null);
  // condense: stronger border + shadow once the page scrolls past 24px
  const [scrolled, setScrolled] = useState(false);
  // mobile menu (no nav links show on phones otherwise — critical for phone use)
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="h-px w-full hairline opacity-60" />
      <div
        className={`border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled
            ? "border-[rgba(17,17,26,.08)] bg-background/85 shadow-[0_1px_2px_rgba(17,17,26,.05),0_8px_24px_-12px_rgba(17,17,26,.12)]"
            : "border-border/40 bg-background/70"
        }`}
      >
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <RhinoMark className="h-8 w-8 transition-transform duration-300 group-hover:scale-[1.04]" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Rhinogent</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = !l.external && pathname === l.href;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-current={active ? "page" : undefined}
                  className={`group relative rounded-full px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                    active ? "text-foreground" : "text-muted hover:bg-accent/[.06] hover:text-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-accent/[.08] ring-1 ring-inset ring-accent/20" aria-hidden />
                  )}
                  <span className="relative">{l.label}</span>
                  {l.external && (
                    <span className="relative ml-0.5 text-[10px] opacity-50" aria-hidden>↗</span>
                  )}
                  <span
                    className={`absolute bottom-0.5 left-1/2 h-px -translate-x-1/2 bg-accent transition-all duration-300 ${
                      active ? "w-0" : "w-0 group-hover:w-[60%]"
                    }`}
                    aria-hidden
                  />
                </a>
              );
            })}
          </div>

          <div className="flex min-w-[150px] items-center justify-end gap-3">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="md:hidden rounded-lg border border-border p-2 text-muted transition-colors hover:text-foreground"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
              </svg>
            </button>
            {authed === null ? (
              // resolving — hold space so the bar doesn't flicker layout
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-2" aria-hidden />
            ) : authed ? (
              <AccountMenu />
            ) : (
              <>
                <Link href="/dashboard" className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline">
                  Sign in
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold tracking-[-0.01em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                >
                  Get Rhinogent
                </Link>
              </>
            )}
          </div>
        </nav>
        {menuOpen && (
          <div className="motion-safe:animate-rise md:hidden border-t border-border/40 bg-background/95 px-5 pb-3 pt-2 shadow-[0_12px_24px_-16px_rgba(17,17,26,.18)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {links.map((l) => {
                const active = !l.external && pathname === l.href;
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
                      active
                        ? "bg-accent/[.08] font-medium text-foreground ring-1 ring-inset ring-accent/20"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    <span>{l.label}</span>
                    {l.external && <span className="text-[10px] opacity-50" aria-hidden>↗</span>}
                  </a>
                );
              })}
              {authed && (
                <button
                  onClick={() => { supabase.auth.signOut(); setMenuOpen(false); }}
                  className="mt-1 rounded-lg border border-border px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
