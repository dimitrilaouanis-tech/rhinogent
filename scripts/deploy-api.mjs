/* Deploy the static export to gh-pages through the GitHub Git Data API.
   ─────────────────────────────────────────────────────────────────────────────────────────
   WHY NOT scripts/deploy.sh. That script is correct, but it needs a full `git fetch origin
   gh-pages` first, and that branch takes continuous writes from the data Angeal — its history
   is now big enough that one fetch grew .git from 1.1 GB to 2.9 GB, took the machine to
   critically low memory, and got every background job reaped. This path transfers only the
   files that actually changed: a blob per file, one tree, one commit, one ref update.

   THE ANGEAL GUARD IS STRUCTURAL HERE, NOT A REPAIR.
   deploy.sh copies everything in, stages it, then restores each live *.json from origin to undo
   the damage. This never includes an Angeal-owned path in the tree at all, so there is no
   window in which a stale build snapshot could win. Anything matching *.json outside _next/ is
   Angeal-owned live data — census counts, the token feed, the portal URL, telemetry — and a
   tree that omits a path leaves the base tree's version in place, untouched.

   Concurrency: the Angeal pushes to gh-pages while we work, so the ref update is conditional on
   the parent we read. If it moved, we re-read and retry rather than force — force would discard
   whatever the Angeal wrote in the gap, which is the exact accident deploy.sh was written to
   prevent.

   Usage:  node scripts/deploy-api.mjs [--dry] ["commit message"] */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { execSync } from "node:child_process";
import { HELD_FEEDS } from "./held-feeds.mjs";

const REPO = "dimitrilaouanis-tech/rhinogent";
const BRANCH = "gh-pages";
const OUT = join(process.cwd(), "out");
const DRY = process.argv.includes("--dry");
const MESSAGE =
  process.argv.find((a) => !a.startsWith("--") && a.includes(" ")) ||
  "deploy: static export";

const TOKEN = execSync("gh auth token", { encoding: "utf8" }).trim();
if (!TOKEN) throw new Error("no gh token — run `gh auth login`");

const api = async (path, init = {}) => {
  const r = await fetch(`https://api.github.com/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "rhinogent-deploy",
      ...(init.headers || {}),
    },
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`${init.method || "GET"} ${path} -> ${r.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
};

/* Angeal-owned: a *.json outside _next/ THAT ALREADY EXISTS on the live branch. Omitted from
   the tree entirely, so the base tree keeps its version. A .json we are introducing has never
   been written by the Angeal and is ours to ship. `live` is filled from the live tree below. */
let live = new Set();
const HELD = new Set(HELD_FEEDS);
const isAngeal = (p) =>
  p.endsWith(".json") && !p.startsWith("_next/") && (live.has(p) || HELD.has(p));

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, acc);
    else acc.push(abs);
  }
  return acc;
}

/* read the live tree first — the guard needs to know what is already there */
const ref0 = await api(`repos/${REPO}/git/ref/heads/${BRANCH}`);
const head0 = await api(`repos/${REPO}/git/commits/${ref0.object.sha}`);
const liveTree = await api(`repos/${REPO}/git/trees/${head0.tree.sha}?recursive=1`);
live = new Set(liveTree.tree.filter((t) => t.type === "blob").map((t) => t.path));
if (liveTree.truncated) {
  console.log("  ! live tree truncated by the API — refusing to guess which json are Angeal-owned");
  process.exit(2);
}

const all = walk(OUT).map((abs) => ({ abs, path: relative(OUT, abs).split(sep).join("/") }));
const files = all.filter((f) => !isAngeal(f.path));
const skipped = all.length - files.length;

console.log(`  out/        ${all.length} files`);
console.log(`  deploying   ${files.length}`);
console.log(`  left alone  ${skipped}  (Angeal-owned *.json outside _next/)`);

if (DRY) {
  console.log("\n  --dry: nothing sent. Angeal paths that would be left alone:");
  walk(OUT)
    .map((abs) => relative(OUT, abs).split(sep).join("/"))
    .filter(isAngeal)
    .slice(0, 20)
    .forEach((p) => console.log("    " + p));
  process.exit(0);
}

/* ── 1 · where gh-pages is right now ─────────────────────────────────────────────────── */
const parent = ref0.object.sha;
const head = head0;
console.log(`\n  base        ${parent.slice(0, 9)}  tree ${head.tree.sha.slice(0, 9)}`);

/* ── 2 · a blob per file ─────────────────────────────────────────────────────────────── */
const tree = [];
let done = 0;
for (const f of files) {
  const buf = readFileSync(f.abs);
  const blob = await api(`repos/${REPO}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: buf.toString("base64"), encoding: "base64" }),
  });
  tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  if (++done % 25 === 0 || done === files.length) {
    process.stdout.write(`\r  blobs       ${done}/${files.length}`);
  }
}
console.log("");

/* ── 3 · tree on top of the live one, then the commit ────────────────────────────────── */
const newTree = await api(`repos/${REPO}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ base_tree: head.tree.sha, tree }),
});
const commit = await api(`repos/${REPO}/git/commits`, {
  method: "POST",
  body: JSON.stringify({ message: MESSAGE, tree: newTree.sha, parents: [parent] }),
});
console.log(`  commit      ${commit.sha.slice(0, 9)}`);

/* ── 4 · move the ref, but only if nothing else did ──────────────────────────────────── */
for (let i = 1; i <= 5; i++) {
  const now = await api(`repos/${REPO}/git/ref/heads/${BRANCH}`);
  if (now.object.sha !== parent) {
    console.log(`  ! the Angeal moved gh-pages to ${now.object.sha.slice(0, 9)} — re-run; not forcing`);
    process.exit(2);
  }
  try {
    await api(`repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    console.log(`\n  deployed    ${BRANCH} -> ${commit.sha.slice(0, 9)}`);
    process.exit(0);
  } catch (e) {
    console.log(`  try ${i} rejected: ${String(e.message).slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
console.log("  could not move the ref in 5 tries");
process.exit(1);
