"use client";

import { useSyncExternalStore } from "react";

// Browser-only values for statically exported pages: null during prerender, the real
// value after hydration — without a setState-in-effect cascade.

const noop = () => () => {};

/** The current page's query string as URLSearchParams ("" on the server). */
export function useSearch(): URLSearchParams {
  const s = useSyncExternalStore(noop, () => window.location.search, () => "");
  return new URLSearchParams(s);
}

export const LOCAL_CHANGED = "rhinogent:local-changed";

/** A localStorage string, live across tabs (storage) and this tab (LOCAL_CHANGED). */
export function useLocal(key: string): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(LOCAL_CHANGED, cb);
      return () => { window.removeEventListener("storage", cb); window.removeEventListener(LOCAL_CHANGED, cb); };
    },
    () => { try { return localStorage.getItem(key); } catch { return null; } },
    () => null,
  );
}

export function setLocal(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(LOCAL_CHANGED));
}
