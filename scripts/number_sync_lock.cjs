#!/usr/bin/env node
/* number-sync-lock — pre-deploy gate enforcing the HARD RULE:
   "one source per published number; all pages agree, or the deploy is blocked."
   Our pages read counts from the signed feed (census_v1.json / reputation_v1.json) at RUNTIME via
   useSignedFeed, so the static export must contain NO hardcoded agent/census count claims — any such
   literal in the shipped HTML (or in source) is a sync-lock violation. This checker catches that class
   and is NULL-TESTED (run with --null): it must FIRE on a deliberately bad fixture, or it isn't trusted.

   Usage:
     node scripts/number_sync_lock.cjs --null     # self-test: must report the checker fires, exit 0
     node scripts/number_sync_lock.cjs            # scan out/ + src/app, fail (exit 1) on any violation
*/
const fs = require("fs");
const path = require("path");

// Unsourced / vanity number claims that must never ship. Real counts come from the signed feed,
// so ANY of these as a literal is a violation. (These are exactly the ones we removed: 340k, millions.)
const DENY = [
  { re: /\b\d{2,3}\s?[kK]\b[- ]?agent/i, why: "hardcoded 'NNk-agent' count (must read the feed)" },
  { re: /\b340k\b/i, why: "legacy unsourced '340k'" },
  { re: /millions[- ]?strong/i, why: "vanity 'millions-strong'" },
  { re: /millions of (signed )?(identities|agents|citizens)/i, why: "vanity 'millions of ...'" },
  { re: /\b\d[\d.,]*\s*(million|billion)\s+(signed )?(agents|identities|citizens)/i, why: "hardcoded 'N million agents'" },
  // a hardcoded long number directly qualified as agents/citizens (counts must come from the feed):
  { re: /\b\d{1,3}(,\d{3}){1,}\s*(agents?|citizens|signed identities)\b/i, why: "hardcoded big agent/citizen count" },
];

// collect text files to scan
function walk(dir, exts, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "_next" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, exts, acc);
    else if (exts.some((e) => name.endsWith(e))) acc.push(p);
  }
  return acc;
}

function scan(files, root) {
  const hits = [];
  for (const f of files) {
    let txt;
    try { txt = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const d of DENY) {
      const m = txt.match(d.re);
      if (m) hits.push({ file: path.relative(root, f), match: m[0].trim(), why: d.why });
    }
  }
  return hits;
}

if (process.argv.includes("--null")) {
  // NULL TEST: the checker must catch a deliberately bad fixture, and must NOT flag a clean one.
  const bad = "Our 340k-agent census is millions-strong — millions of signed identities.";
  const clean = "Our signed-agent census (operated by us, 0 external) — recompute it yourself.";
  const firesOnBad = DENY.some((d) => d.re.test(bad));
  const quietOnClean = !DENY.some((d) => d.re.test(clean));
  const ok = firesOnBad && quietOnClean;
  console.log(`NULL TEST  fires-on-bad=${firesOnBad}  quiet-on-clean=${quietOnClean}  => ${ok ? "PASS" : "FAIL"}`);
  process.exit(ok ? 0 : 1);
}

const repo = path.join(__dirname, "..");
const targets = [
  { dir: path.join(repo, "out"), exts: [".html"], label: "shipped HTML (out/)" },
  { dir: path.join(repo, "src", "app"), exts: [".tsx", ".ts"], label: "source (src/app)" },
];
let total = 0;
for (const t of targets) {
  const files = walk(t.dir, t.exts, []);
  const hits = scan(files, repo);
  if (!fs.existsSync(t.dir)) { console.log(`- ${t.label}: (not built / absent — skipped)`); continue; }
  if (hits.length === 0) { console.log(`- ${t.label}: clean (${files.length} files)`); continue; }
  console.log(`- ${t.label}: ${hits.length} VIOLATION(S)`);
  for (const h of hits) console.log(`    ${h.file}  ->  "${h.match}"  (${h.why})`);
  total += hits.length;
}
if (total) { console.log(`\nFAIL: ${total} unsourced-number violation(s) — every count must come from the signed feed.`); process.exit(1); }
console.log("\nPASS: no unsourced-number claims; all counts read from the signed feed.");
process.exit(0);
