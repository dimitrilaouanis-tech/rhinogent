"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

  // GUEST PREVIEW: visitors chat immediately (3 free Normal messages), then a soft
  // create-account gate inside ChatMatrix. Signed-in users get the full experience.
  return (
    // full dynamic-viewport column: MiniNav fixed, chat fills the rest (mobile-visible)
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <div className="shrink-0"><MiniNav current="/chat" /></div>
      <div className="min-h-0 flex-1">
        <ChatMatrix guest={!authed} />
      </div>
    </div>
  );
}
