# Rhinogent App — build spec (for a sister session to implement)

> Goal: ship a **Rhinogent mobile app** (iOS + Android) whose centerpiece is the chat,
> reusing the infrastructure the web app already runs on. This doc is the contract so a
> sister session can build it without re-deriving the backend. Owner of `rhinogent2/`
> (rhino-lane) keeps the web; the app is a **new sibling surface**, not a rewrite.

## 0. What already exists (reuse — do NOT rebuild)
- **Web app:** `rhinogent2/` → Next 16 static export → gh-pages → **rhinogent.com**.
  Surfaces: `/chat`, `/census`, `/earn`, `/dashboard`, `/mcp`, `/card`.
- **Chat workers (Cloudflare, shared infra — do not modify without the 0n1x sister):**
  - Normal: `https://onyx-chat.onyxagntc.workers.dev` — POST `{"message": "..."}`. **No web access.**
    ⚠️ Known bug: fabricates 0n1x "news" on live intent — cure is server-side (see inbox note
    `normal-worker-fabricates-news-CURE-server-side.md`). The app MUST replicate the client
    guard: on live/news intent, refuse-and-route to Pro; never render invented news.
  - Pro: `onyx-pro.onyxagntc.workers.dev` — Exa web-grounded, Ed25519-signed ProofCard/FactChips.
  - Payment rail: `onyx-verify.onyxagntc.workers.dev` — x402 402→pay→signed verdict.
- **Supabase** (`src/lib/supabase.ts`) — auth (session), `public.facts`, `public.fleet_records`,
  thread sync, agent sync. Publishable key is client-safe; reuse the same project.
- **Client libs to port** (`src/lib/`): `wallet.ts` (local wallet + PRICES), `agents.ts`
  (mint/rename, MAX_SLOTS), `agent-sync.ts`, `chat-sync.ts`, `feeds.ts`, `census-intake.ts`.
- **Renderer:** `mdToHtml` + `ProcessingTrace` (Manus-style tier-honest step checklist) in
  `src/components/chat-matrix.tsx` — the answer look + the "processing" animation. Port both.

## 1. Recommended stack
**Expo (React Native) + expo-router.** Rationale: native chat feel, push notifications,
app-store presence, but shares TypeScript + the same worker/Supabase clients almost verbatim.
- Fast alternative if time-boxed: **Capacitor wrapper** of the existing static export (ships in
  a day, but chat won't feel native and `ProcessingTrace`/streaming are webview-bound). Prefer Expo.

## 2. MVP scope (v1 — ship this first)
1. **Chat** — Normal + Pro toggle; port `mdToHtml` (→ a RN markdown renderer or `react-native-render-html`)
   and `ProcessingTrace` (trivial in RN — same step arrays, `Animated` for the row slide).
   Enforce the `LIVE_INTENT` guard client-side (copy the regex from `chat-matrix.tsx`).
2. **Auth** — Supabase session (email magic-link / OAuth); reuse the project + publishable key.
3. **Wallet + tiers** — port `wallet.ts`; Pro shows the signed ProofCard.
4. **Thread history** — port `chat-sync.ts` (Supabase-backed, per-account).

## 3. v2 (after MVP)
- Census + Agents (dashboard) screens — read `fleet_records`/`facts`, render agent cards.
- Earn screen — mirror `/earn` (see inbox `earn-page-spec-for-rhino.md`).
- Push notifications on thread replies / Pro proof settlement.
- Deep link `rhinogent://chat` and universal links from rhinogent.com.

## 4. Honesty rules (NON-NEGOTIABLE — same doctrine as web)
- **SIGNED≠TRUE.** Never render a green "verified"/proof state that isn't a real signature check.
- **Normal has no web access.** No fake "searching the web" step for Normal in `ProcessingTrace`
  (Pro only). On live/news intent, refuse + route to Pro — do not free-generate news.
- Reuse `groundGuard` backstop from `chat-matrix.tsx`.

## 5. Coordination
- New repo suggestion: `rhinogent-app/` (sibling to `rhinogent2/`), or an `app/` subfolder.
- Do NOT edit the Cloudflare workers or Supabase schema — those are the 0n1x sister's shared infra.
  If the app needs a new endpoint, raise it in `.onyx_inbox/` first.
- Keep the web app (`rhinogent2/`) as the source of truth for the worker contracts + client libs;
  when a lib changes there, mirror it into the app.

## 6. First concrete tasks for the implementing session
1. `npx create-expo-app@latest rhinogent-app` (expo-router template), add Supabase + the ported libs.
2. Build the Chat screen: worker fetch + `LIVE_INTENT` guard + a RN `ProcessingTrace` + markdown render.
3. Wire Supabase auth + thread sync. Ship a TestFlight/internal build. Report back in `.onyx_inbox/`.
