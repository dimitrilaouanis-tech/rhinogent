/* What an agent remembers about you.

   Kept in this browser, per agent, alongside the keys — never sent anywhere. That is the whole
   point: the market research on the four big always-on agents found memory governance is the
   one place none of them is strong. OpenAI's Dots cannot show, edit or delete an individual
   memory (you delete the agent); Muse and Cue publish nothing about it at all. A list you can
   read and a cross you can press beats all four, and it costs a localStorage key.

   Deliberately dumb storage: no server, no sync, no merge. A note is a string the owner wrote
   or approved, and deleting one deletes it. If this ever grows a server side, the delete has to
   stay a real delete — a "hidden" flag with the row still there would make the screen a lie. */

import { setLocal } from "./use-browser";

export type MemoryNote = {
  id: string;
  text: string;
  /** ISO date the note was recorded. Shown so an old note can be recognised as stale. */
  at: string;
};

const KEY = (agent: string) => `rhinogent.memory.${agent}`;

export const MEMORY_CHANGED = "rhinogent:memory-changed";

export function loadMemory(agent: string): MemoryNote[] {
  if (typeof window === "undefined" || !agent) return [];
  try {
    const raw = window.localStorage.getItem(KEY(agent));
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as MemoryNote[]).filter((n) => n && typeof n.text === "string") : [];
  } catch {
    // A corrupt value must not take the screen down with it — an unreadable store is an empty one.
    return [];
  }
}

function save(agent: string, notes: MemoryNote[]) {
  setLocal(KEY(agent), JSON.stringify(notes));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MEMORY_CHANGED));
}

export function addNote(agent: string, text: string): MemoryNote[] {
  const t = text.trim();
  if (!t) return loadMemory(agent);
  const next = [
    ...loadMemory(agent),
    { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, text: t, at: new Date().toISOString() },
  ];
  save(agent, next);
  return next;
}

export function removeNote(agent: string, id: string): MemoryNote[] {
  const next = loadMemory(agent).filter((n) => n.id !== id);
  save(agent, next);
  return next;
}

export function clearMemory(agent: string): MemoryNote[] {
  save(agent, []);
  return [];
}
