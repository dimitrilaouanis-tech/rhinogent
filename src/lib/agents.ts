import { type Agent, generateAgent } from "./identity";

export const MAX_SLOTS = 10;
const KEY = "rhinogent.agents.v1";

export function loadAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Agent[]) : [];
    // ALIGNMENT: one account operates exactly MAX_SLOTS agents, everywhere. If local storage
    // somehow holds more (an over-mint before the cap, or a merge), trim to the first
    // MAX_SLOTS by mint order and SELF-HEAL storage — otherwise the excess gets re-pushed to
    // the shared account mirror and reappears on every surface (the "roster of 11" bug).
    if (list.length > MAX_SLOTS) {
      const trimmed = list.slice(0, MAX_SLOTS);
      try { window.localStorage.setItem(KEY, JSON.stringify(trimmed)); } catch { /**/ }
      return trimmed;
    }
    return list;
  } catch {
    return [];
  }
}

/** Same-tab counterpart to the `storage` event, which by spec fires only in
 *  OTHER tabs. Without it the nav's agent count is frozen at whatever it read
 *  on mount, so adding an agent showed "0 agents" beside a roster of 11. */
export const AGENTS_CHANGED = "rhinogent:agents-changed";

function save(agents: Agent[]) {
  window.localStorage.setItem(KEY, JSON.stringify(agents));
  window.dispatchEvent(new CustomEvent(AGENTS_CHANGED));
}

/** Add a freshly minted agent. Returns the new list, or the unchanged list if full. */
export function addAgent(agents: Agent[], label?: string): Agent[] {
  if (agents.length >= MAX_SLOTS) return agents;
  const next = [...agents, generateAgent(label)];
  save(next);
  return next;
}

export function removeAgent(agents: Agent[], id: string): Agent[] {
  const next = agents.filter((a) => a.id !== id);
  save(next);
  return next;
}

export function renameAgent(agents: Agent[], id: string, label: string): Agent[] {
  const next = agents.map((a) => (a.id === id ? { ...a, label } : a));
  save(next);
  return next;
}

/** Wipe all slots back to 0. */
export function clearAgents(): Agent[] {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  return [];
}
