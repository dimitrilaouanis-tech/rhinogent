// BUILD-TIME NUMBER BAKE — fetch the canonical census count and stamp it into
// src/lib/ecosystem.ts so the STATIC HTML (what crawlers + non-JS agents read)
// carries the real number, not a stale seed. The client JS-bind then keeps it
// live on top. One source: census_manifest.json.
import { readFileSync, writeFileSync } from "node:fs";

const MANIFEST = "https://rhinogent.com/census_manifest.json";
const FILE = new URL("../src/lib/ecosystem.ts", import.meta.url);

try {
  const r = await fetch(MANIFEST, { cache: "no-store" });
  const d = await r.json();
  const count = Number(d?.count);
  if (!Number.isFinite(count) || count <= 0) throw new Error("bad count: " + d?.count);
  const src = readFileSync(FILE, "utf8");
  if (!/export const ECOSYSTEM_COUNT = \d+;/.test(src)) throw new Error("ECOSYSTEM_COUNT line not found");
  const next = src.replace(/export const ECOSYSTEM_COUNT = \d+;/,
    `export const ECOSYSTEM_COUNT = ${count};`);
  if (next === src) {
    console.log(`[stamp-count] ECOSYSTEM_COUNT already current (${count.toLocaleString()}) — no change needed`);
  } else {
    writeFileSync(FILE, next);
    console.log(`[stamp-count] baked ECOSYSTEM_COUNT = ${count.toLocaleString()} into ecosystem.ts`);
  }
} catch (e) {
  console.warn(`[stamp-count] skipped (${e.message}) — keeping existing floor`);
}
