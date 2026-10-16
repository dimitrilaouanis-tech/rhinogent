#!/usr/bin/env node
/**
 * rsc-flat — fix client-side navigation 404s on the static export.
 *
 * WHY: next.config.ts is `output: "export"` + `trailingSlash: true`, so each route's
 * RSC data segment is written to `out/<route>/index.txt`. But Next 16's client router
 * fetches the NO-slash form `/<route>.txt` when you click a <Link href="/route"> — which
 * doesn't exist on the export, so the fetch 404s and the router renders its not-found
 * boundary instead of the page (the "Desk → 404" bug; Next issue #85374). Loading the
 * URL directly is fine because the HTML (`out/<route>/index.html`) is correct.
 *
 * FIX: after `next build`, emit the no-slash sibling for every `index.txt`, so the path
 * the client actually fetches (`/<route>.txt`) resolves. Pure additive — never touches
 * existing files, no HTML/CSS change, idempotent. Run from deploy.sh after the build and
 * before `cp -r out/*`.
 */
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..", "out");
let n = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
    } else if (e.name === "index.txt") {
      // out/terminal/index.txt -> out/terminal.txt ; out/dashboard/classic/index.txt -> out/dashboard/classic.txt
      // Skip the root (out/index.txt): its no-slash sibling would land outside the tree,
      // and `/index.txt` already resolves (the root route works).
      if (path.resolve(dir) === OUT) continue;
      fs.copyFileSync(p, dir + ".txt");
      n++;
    }
  }
}

if (!fs.existsSync(OUT)) {
  console.error("rsc-flat: out/ not found — run `next build` first");
  process.exit(1);
}
walk(OUT);
console.log("rsc-flat: wrote " + n + " no-slash .txt siblings (client-nav fix)");
