"use client";

import { useEffect, useRef, useState } from "react";
import { getWallet, spend, grant, PRICES } from "@/lib/wallet";

// The chat surface: a DELICATE living matrix (fine lines, low opacity, slow drift — a quiet
// backdrop, not a toy) with the chat bar underneath. Connected to the 0n1x brain (the signed
// LLM portal, self-healing via portal.json). Shown only after sign-in.

const HUB = "https://rhinogent.com";
let PORTAL = "https://onyx-actions.onrender.com";
// ALWAYS re-fetch portal.json — the local tunnel URL rotates, so a latched value
// goes stale and the chat hits a dead endpoint. Fresh resolve every call.
async function resolvePortal() {
  try {
    const r = await fetch(`${HUB}/portal.json?t=${Date.now()}`, { cache: "no-store" });
    const d = await r.json();
    if (d?.portal && /^https:\/\//.test(d.portal)) PORTAL = d.portal;
  } catch {}
  return PORTAL;
}

/* ── the delicate matrix — thin drifting nodes + faint links, canvas, subtle ── */
function DelicateMatrix() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0, W = 0, H = 0;
    const N = 26;
    const pts = Array.from({ length: N }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00018, vy: (Math.random() - 0.5) * 0.00018,
    }));
    const resize = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      }
      // faint links between near nodes
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = pts[i], b = pts[j];
          const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
          const d = Math.hypot(dx, dy);
          if (d < 150) {
            ctx.strokeStyle = `rgba(120,114,255,${0.05 * (1 - d / 150)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke();
          }
        }
      }
      // tiny nodes
      for (const p of pts) {
        ctx.fillStyle = "rgba(139,133,255,0.35)";
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 1.1, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

type Msg = { role: "user" | "assistant"; text: string };

export function ChatMatrix() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { resolvePortal(); }, []);
  useEffect(() => {
    getWallet().then((w) => setBalance(w.balance));
    const onCh = (e: Event) => setBalance((e as CustomEvent).detail.balance);
    window.addEventListener("wallet:change", onCh);
    return () => window.removeEventListener("wallet:change", onCh);
  }, []);
  useEffect(() => { scroller.current?.scrollTo(0, scroller.current.scrollHeight); }, [msgs, busy]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    const pay = await spend(PRICES.chatMessage, "premium chat");
    if (!pay.ok) {
      setMsgs((m) => [...m, { role: "assistant", text: `Premium chat costs ${PRICES.chatMessage} TOKEN per message and your balance is ${pay.balance}. Tap “+250 grant” to top up (demo), then try again.` }]);
      return;
    }
    setInput(""); setMsgs((m) => [...m, { role: "user", text: q }]); setBusy(true);
    async function ask(): Promise<string> {
      const portal = await resolvePortal();
      const r = await fetch(`${portal}/v1/chat`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      return d.reply || d.reason || "…";
    }
    try {
      let text = "";
      try { text = await ask(); }
      catch { await new Promise((z) => setTimeout(z, 600)); text = await ask(); } // re-resolve + retry once
      setMsgs((m) => [...m, { role: "assistant", text }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Connection hiccup reaching the network brain — one more try usually gets it." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] w-full max-w-3xl flex-col px-4">
      <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-surface/50 px-4 py-2 font-mono text-[12px]">
        <span className="text-muted">PREMIUM CHAT · <span className="text-foreground">{PRICES.chatMessage} TOKEN</span>/message</span>
        <span className="flex items-center gap-3">
          <span className="text-muted">balance <b className="text-accent" style={{ color: "#3fdda0" }}>{balance.toLocaleString()}</b> TOKEN</span>
          <button onClick={() => grant(250, "demo top-up").then(setBalance)} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted hover:text-foreground">+250 grant</button>
        </span>
      </div>
      {/* delicate matrix backdrop with the conversation over it */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-surface/40">
        <DelicateMatrix />
        <div ref={scroller} className="relative h-full space-y-4 overflow-y-auto px-5 py-6">
          {msgs.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-lg font-medium text-foreground">Ask the network anything.</p>
              <p className="mt-1 text-sm text-muted">Answers are grounded and, where verifiable, signed.</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                m.role === "user" ? "bg-accent text-white" : "border border-border bg-background text-foreground"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-background px-4 py-2.5 text-muted">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-2" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* the chat bar — underneath the matrix */}
      <div className="mt-3 mb-2 flex items-end gap-2">
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1} placeholder="Message the network…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-foreground outline-none transition-colors focus:border-accent/50"
        />
        <button
          onClick={send} disabled={busy || !input.trim()}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
