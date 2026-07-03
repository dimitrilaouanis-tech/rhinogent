"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthGate } from "@/components/auth-gate";
import { ChatMatrix } from "@/components/chat-matrix";
import { MiniNav } from "@/components/mini-nav";

export default function ChatPage() {
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
    // chat is gated — sign up / log in first
    return (
      <div className="flex min-h-screen flex-col">
        <AuthGate />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MiniNav current="/chat" />
      <div className="flex-1 py-4">
        <ChatMatrix />
      </div>
    </div>
  );
}
