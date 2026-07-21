// ── Cross-device CHAT sync (Supabase `chats` + `messages`, RLS user-scoped) ──
// Mirrors the localStorage threads to the signed-in user's account so a
// returning user sees their prior conversations on any device. Content is the
// user's own chat text (no keys, no secrets). Tables (created server-side, RLS
// `user_id = auth.uid()`):
//   chats    { id uuid pk default, user_id, title, created_at, updated_at }
//   messages { id uuid pk default, chat_id, user_id, role, text, created_at }
// Design: append-only fast path (only new messages are inserted); a rewritten
// thread falls back to delete+reinsert. Every call is best-effort — chat must
// never break because sync hiccuped.

import { supabase } from "./supabase";

export type ChatMsg = { role: "user" | "assistant"; text: string };
export type RemoteThread = { id: string; title: string; msgs: ChatMsg[]; ts?: number };

const MAP_KEY = "rhinogent.chatsync.map.v1"; // { [localThreadKey]: chatUuid }
const CNT_KEY = "rhinogent.chatsync.cnt.v1"; // { [chatUuid]: syncedMsgCount }
const MAX_MSGS = 100;

function readJson(key: string): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
}
function writeJson(key: string, v: Record<string, unknown>) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ }
}

async function uid(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch { return null; }
}

/** All chat uuids this device already knows about (used to dedupe pulls). */
export function knownChatIds(): Set<string> {
  return new Set(Object.values(readJson(MAP_KEY)).map(String));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const HIST_KEY = "rhinogent.chat.history";

/** The account uuid a local history id resolves to (itself if already a uuid, else via the map). */
function resolveChatUuid(histId: string, map: Record<string, unknown>): string | null {
  if (UUID_RE.test(histId)) return histId;
  const v = map[histId];
  return typeof v === "string" && UUID_RE.test(v) ? v : null;
}

type LooseThread = { id: string; title: string; msgs: ChatMsg[]; ts?: number; agent?: unknown };

/** ACCOUNT-AUTHORITATIVE reconcile (cross-device delete propagation).
 *  The account is the source of truth for any thread that has EVER synced:
 *   - a synced local thread whose row is TOMBSTONED (`deletedIds`, soft-deleted) → REMOVE it
 *     locally even on a capped pull — the tombstone is a positive event, not an absence.
 *   - a synced local thread ABSENT from the account = deleted on another device → REMOVE it
 *     locally (and forget its map entry) so it can't be re-pushed/resurrected.
 *   - a LOCAL-ONLY thread (never synced, non-uuid id, no map entry) = born offline → KEEP.
 *   - account threads not present locally → ADD.
 *  `remoteComplete` guards against false drops when the pull was capped (only drop synced
 *  threads we can be sure are gone — i.e. the pull returned the full set). */
export function reconcileHistory(remote: RemoteThread[], remoteComplete: boolean, deletedIds: string[] = []): LooseThread[] {
  let hist: LooseThread[] = [];
  try { hist = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { hist = []; }
  const map = readJson(MAP_KEY);
  const remoteById = new Map(remote.map((t) => [t.id, t] as const));
  const tombstoned = new Set(deletedIds);   // POSITIVE delete events from the account (soft-deleted rows)

  const kept: LooseThread[] = [];
  const forget = (uuid: string) => { for (const k of Object.keys(map)) if (map[k] === uuid) delete map[k]; };   // no re-push
  for (const h of hist) {
    const uuid = resolveChatUuid(h.id, map);
    if (uuid) {
      if (tombstoned.has(uuid)) { forget(uuid); }                 // tombstoned = deleted elsewhere, even on a capped pull
      else if (remoteById.has(uuid)) { kept.push(h); }            // still in the account → keep
      else if (remoteComplete) { forget(uuid); }                  // synced but GONE from account → deleted elsewhere
      else { kept.push(h); }                                      // partial pull — can't confirm, keep
    } else {
      kept.push(h);                                               // local-only draft — keep
    }
  }
  // ADD account threads this device doesn't have yet
  const haveUuid = new Set(kept.map((h) => resolveChatUuid(h.id, map)).filter(Boolean) as string[]);
  const haveId = new Set(kept.map((h) => h.id));
  for (const t of remote) {
    if (haveUuid.has(t.id) || haveId.has(t.id)) continue;
    kept.push({ id: t.id, title: t.title, msgs: t.msgs, ts: t.ts });
  }

  // RECENCY ORDER: a chat created/updated on another device must jump to the TOP, not sit at the
  // bottom where it was appended (the "my new desktop chat isn't on the phone" report — it WAS
  // synced, just buried). Sort newest-first by ts; ts-less legacy rows fall to the end.
  kept.sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));

  writeJson(MAP_KEY, map);
  try { localStorage.setItem(HIST_KEY, JSON.stringify(kept.slice(0, 30))); } catch { /**/ }
  return kept.slice(0, 30);
}

/** Archive rebind: the current-thread key hands its chat row to the history item,
 *  so the NEXT conversation under the current key becomes a fresh chat row. */
export function rebindThreadKey(oldKey: string, newKey: string) {
  const map = readJson(MAP_KEY);
  const id = map[oldKey];
  if (!id) return;
  delete map[oldKey];
  map[newKey] = id;
  writeJson(MAP_KEY, map);
}

/** Resume: point the current-thread key at an existing (possibly remote) thread
 *  so continued messages append to the SAME chat row instead of duplicating. */
export function adoptThread(curKey: string, histId: string) {
  const map = readJson(MAP_KEY);
  const id = (map[histId] as string | undefined)
    || (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(histId) ? histId : null);
  if (id) map[curKey] = id; else delete map[curKey];
  writeJson(MAP_KEY, map);
}

// ── push ─────────────────────────────────────────────────────────────────────
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, { title: string; msgs: ChatMsg[] }>();   // latest payload per key, for flush

/** Debounced thread upsert — call freely on every message change. */
export function queueThreadSync(localKey: string, title: string, msgs: ChatMsg[]) {
  if (typeof window === "undefined" || !msgs.length) return;
  const t = timers.get(localKey);
  if (t) clearTimeout(t);
  pending.set(localKey, { title, msgs });
  timers.set(localKey, setTimeout(() => {
    timers.delete(localKey);
    const p = pending.get(localKey); pending.delete(localKey);
    if (p) syncThread(localKey, p.title, p.msgs).catch(() => { /* best-effort */ });
  }, 1500));
}

/** Flush a key's pending sync NOW (creates the row + writes the map) and resolve when done.
 *  Called before archiving a thread so `rebindThreadKey` sees a real chat id (closes the
 *  race where a fast "New chat" ran before the 1500ms debounce created the account row). */
export async function flushThreadSync(localKey: string): Promise<void> {
  const t = timers.get(localKey);
  if (t) { clearTimeout(t); timers.delete(localKey); }
  const p = pending.get(localKey); pending.delete(localKey);
  if (p) { try { await syncThread(localKey, p.title, p.msgs); } catch { /* best-effort */ } }
}

async function syncThread(localKey: string, title: string, msgs: ChatMsg[]) {
  const user = await uid();
  if (!user) return;
  const capped = msgs.slice(-MAX_MSGS);

  const map = readJson(MAP_KEY);
  let chatId = map[localKey] as string | undefined;
  if (!chatId) {
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user, title })
      .select("id")
      .single();
    if (error || !data?.id) return;
    chatId = data.id as string;
    map[localKey] = chatId;
    writeJson(MAP_KEY, map);
  } else {
    await supabase
      .from("chats")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", chatId);
  }

  const cnt = readJson(CNT_KEY);
  const synced = Number(cnt[chatId] || 0);
  let fresh: ChatMsg[];
  if (capped.length < synced) {
    // thread shrank (restore/replace) — rewrite it wholesale
    await supabase.from("messages").delete().eq("chat_id", chatId);
    fresh = capped;
  } else {
    fresh = capped.slice(synced);
  }
  if (fresh.length) {
    const base = Date.now() - fresh.length;
    const rows = fresh.map((m, i) => ({
      chat_id: chatId,
      user_id: user,
      role: m.role,
      text: m.text,
      created_at: new Date(base + i).toISOString(),
    }));
    const { error } = await supabase.from("messages").insert(rows);
    if (error) return; // keep old count; retry naturally on next change
  }
  cnt[chatId] = capped.length;
  writeJson(CNT_KEY, cnt);
}

/** Delete a thread everywhere: local mappings + the account's messages, leaving a
 *  TOMBSTONE on the chats row (soft delete) — the delete is a POSITIVE event that
 *  travels to every device, instead of an absence that a stale device could refill.
 *  Tombstone marker: `title = ""` (a live thread's title is never empty — threadTitle
 *  yields at least "New chat" and rename requires non-blank). We also attempt a real
 *  `deleted_at` stamp first, so if that column is ever added the data upgrades itself.
 *  Accepts a local history id or a raw chat uuid (restored remote threads). */
export async function deleteThread(histId: string): Promise<void> {
  try {
    const map = readJson(MAP_KEY);
    const id = (map[histId] as string | undefined)
      || (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(histId) ? histId : null);
    for (const k of Object.keys(map)) {
      if (k === histId || (id && map[k] === id)) delete map[k];
    }
    writeJson(MAP_KEY, map);
    if (!id) return;
    const cnt = readJson(CNT_KEY);
    delete cnt[id];
    writeJson(CNT_KEY, cnt);
    const user = await uid();
    if (!user) return;
    await supabase.from("messages").delete().eq("chat_id", id);
    const stamp = new Date().toISOString();
    // preferred: real deleted_at column (400s harmlessly if the column doesn't exist yet)
    const { error } = await supabase.from("chats")
      .update({ deleted_at: stamp, title: "", updated_at: stamp }).eq("id", id);
    if (error) {
      await supabase.from("chats").update({ title: "", updated_at: stamp }).eq("id", id);
    }
  } catch { /* best-effort — a failed remote delete resurfaces on next pull, never breaks UI */ }
}

/** Login backfill: push local-born threads that never reached the account (created
 *  while signed out / before the account existed). Skips anything already mapped or
 *  remote-born (uuid ids came FROM the account). Makes desktop↔mobile sync catch up
 *  the moment the user signs in, instead of silently stranding old chats per-device. */
export async function backfillThreads(items: { id: string; title: string; msgs: ChatMsg[] }[]): Promise<void> {
  try {
    const user = await uid();
    if (!user) return;
    const map = readJson(MAP_KEY);
    for (const t of items || []) {
      if (!t?.id || !t.msgs?.length) continue;
      if (map[t.id]) continue;                                    // already synced
      if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(t.id)) continue;    // remote-born — already in the account
      await syncThread(t.id, t.title || "Chat", t.msgs);          // creates the row + writes the map
    }
  } catch { /* best-effort */ }
}

/** Undo helper: re-create a just-deleted thread in the account (fresh chat row +
 *  messages) and remap the history id so future syncs/deletes hit the new row.
 *  Pull-dedupe stays intact because the new uuid lands in the local map. */
export async function restoreThread(histId: string, title: string, msgs: ChatMsg[]): Promise<void> {
  try {
    const user = await uid();
    if (!user || !msgs.length) return;
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user, title })
      .select("id")
      .single();
    if (error || !data?.id) return;
    const chatId = data.id as string;
    const capped = msgs.slice(-MAX_MSGS);
    const base = Date.now() - capped.length;
    const rows = capped.map((m, i) => ({
      chat_id: chatId,
      user_id: user,
      role: m.role,
      text: m.text,
      created_at: new Date(base + i).toISOString(),
    }));
    const { error: mErr } = await supabase.from("messages").insert(rows);
    if (mErr) return;
    const map = readJson(MAP_KEY);
    map[histId] = chatId;
    writeJson(MAP_KEY, map);
    const cnt = readJson(CNT_KEY);
    cnt[chatId] = capped.length;
    writeJson(CNT_KEY, cnt);
  } catch { /* best-effort */ }
}

// ── pull ─────────────────────────────────────────────────────────────────────

/** Like pullThreads but also reports whether the pull was COMPLETE (returned fewer rows than
 *  the cap → we saw every account thread, safe for authoritative reconcile) and the account's
 *  TOMBSTONED chat ids (soft-deleted rows: empty title) so a delete propagates as a positive
 *  event even when the pull is capped. */
export async function pullThreadsFull(limit = 100): Promise<{ threads: RemoteThread[]; complete: boolean; signedIn: boolean; deleted: string[] }> {
  const user = await uid();
  if (!user) return { threads: [], complete: false, signedIn: false, deleted: [] };
  const threads = await pullThreads(limit);
  // `complete` is measured on the raw chats count, not the message-filtered thread list.
  const { data } = await supabase.from("chats").select("id,title").eq("user_id", user)
    .order("updated_at", { ascending: false }).limit(limit + 1);
  const complete = !data || data.length <= limit;
  const deleted = (data || []).filter((c) => String(c.title ?? "") === "").map((c) => c.id as string);
  return { threads, complete, signedIn: true, deleted };
}

/** Fetch the account's threads (newest first). Empty array when signed out. */
export async function pullThreads(limit = 30): Promise<RemoteThread[]> {
  const user = await uid();
  if (!user) return [];
  const { data: chats, error } = await supabase
    .from("chats")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error || !chats?.length) return [];
  // TOMBSTONES (soft-deleted rows, empty title) are never surfaced as threads
  const live = chats.filter((c) => String(c.title ?? "") !== "");
  if (!live.length) return [];
  const tsOf = (c: { updated_at?: string }) => { const n = c.updated_at ? Date.parse(c.updated_at) : NaN; return Number.isFinite(n) ? n : Date.now(); };
  const ids = live.map((c) => c.id as string);
  const { data: msgs } = await supabase
    .from("messages")
    .select("chat_id,role,text,created_at")
    .in("chat_id", ids)
    .order("created_at", { ascending: true })
    .limit(limit * MAX_MSGS);
  const byChat = new Map<string, ChatMsg[]>();
  for (const m of msgs || []) {
    const list = byChat.get(m.chat_id as string) || [];
    list.push({ role: m.role as ChatMsg["role"], text: String(m.text ?? "") });
    byChat.set(m.chat_id as string, list);
  }
  const out = live
    .filter((c) => (byChat.get(c.id as string) || []).length > 0)
    .map((c) => ({
      id: c.id as string,
      title: String(c.title || "Chat"),
      msgs: (byChat.get(c.id as string) || []).slice(-MAX_MSGS),
      ts: tsOf(c),
    }));
  // DEDUP: collapse duplicate rows produced by the old draft-resurrection bug — same first
  // user message AND same full conversation length/last message = the same logical thread.
  // Keep the FIRST (newest, since ordered by updated_at desc). Cleans existing damage on pull.
  const seen = new Set<string>();
  const deduped: RemoteThread[] = [];
  for (const t of out) {
    const firstUser = t.msgs.find((m) => m.role === "user")?.text || "";
    const last = t.msgs[t.msgs.length - 1]?.text || "";
    const sig = `${firstUser} ${t.msgs.length} ${last}`.slice(0, 400);
    if (firstUser && seen.has(sig)) continue;   // duplicate of a newer identical thread — drop
    if (firstUser) seen.add(sig);
    deduped.push(t);
  }
  return deduped;
}
