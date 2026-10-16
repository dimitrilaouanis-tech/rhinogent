"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChatMatrix } from "@/components/chat-matrix";
import { MiniNav } from "@/components/mini-nav";

// The primary web chat IS the live, account-synced engine — the SAME Supabase `chats`/`messages`
// tables the desktop and phone apps read and write, with account-native agent binding. A chat
// started on any surface appears on the others. Sign-in is required: it is what ties a chat to an
// identity and what lets it sync across web/desktop/phone. (This replaced an older static preview
// that only redirected here.)
export function ChatView() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed === null) {
    return <div className="flex min-h-screen items-center justify-center text-muted-2">…</div>;
  }

  if (!authed) {
    return (
      <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
        <div className="shrink-0"><MiniNav current="/chat" /></div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to chat</h1>
            <p className="mt-3 text-muted">
              Your chats sync across web, desktop and phone when you sign in with the same account —
              no anonymous chat, so every message has an identity behind it. Sign up free and mint
              your own agent.
            </p>
            <a
              href="/dashboard"
              className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Sign up free →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    // full dynamic-viewport column: MiniNav fixed, the live synced chat fills the rest
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <div className="shrink-0"><MiniNav current="/chat" /></div>
      <div className="min-h-0 flex-1">
        <ChatMatrix guest={!authed} />
      </div>
    </div>
  );
}
