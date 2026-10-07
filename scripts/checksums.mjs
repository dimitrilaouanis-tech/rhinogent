/* Generate public/SHA256SUMS from the artifacts we actually publish.
   ────────────────────────────────────────────────────────────────────────────────────────
   Runs as `prebuild`, so it cannot be stale relative to the build that ships it. That ordering
   is the whole point: a checksum file that lags its artifacts is WORSE than none, because a
   reader who runs the verification gets a mismatch and the honest conclusion from a mismatch is
   "this was tampered with". For a product whose argument is "check it yourself", publishing a
   number that fails for boring reasons is the most expensive bug available.

   For the same reason the page must never hardcode a hash in its source: census_v1.json changes
   whenever the feed is regenerated, and a literal in a .tsx file would be wrong within a day.
   The page shows the COMMAND; this file holds the values; both are regenerated together.

   Format is the one `sha256sum -c` already understands — two spaces, binary marker, path
   relative to the site root — so the verification instruction on the page is a real command a
   reader can paste, not a description of one.

   Writes nothing and exits 0 if an artifact is missing, after naming it on stderr: a download
   page that half-publishes is a worse failure than one that says a file is absent. */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/* Only files that are genuinely fetchable without an account. Keep this list identical to the
   artifact table in src/app/download/download-view.tsx — if they drift, the page lists something
   the checksum file does not cover, which is exactly the inconsistency we are trying to remove. */
const ARTIFACTS = [
  ".well-known/jwks.json",
  ".well-known/agent-card.json",
  ".well-known/security.txt",
  "census_v1.json",
  "a2a_cards.json",
];

const ROOT = join(process.cwd(), "public");
const lines = [];
const missing = [];

for (const rel of ARTIFACTS) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
    continue;
  }
  const buf = readFileSync(abs);
  const hash = createHash("sha256").update(buf).digest("hex");
  lines.push(`${hash}  ${rel}`);
}

if (missing.length) {
  console.error(
    `checksums: ${missing.length} artifact(s) missing from public/, not listed: ${missing.join(", ")}`,
  );
}

const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const out =
  `# SHA256SUMS for the artifacts published at this origin.\n` +
  `# Generated at build time from the files actually shipped — not written by hand.\n` +
  `# Verify:  curl -sO https://rhinogent.com/SHA256SUMS && sha256sum -c SHA256SUMS\n` +
  `# (fetch each listed path into the same relative layout first)\n` +
  `# generated ${stamp}\n` +
  `#\n` +
  lines.join("\n") +
  "\n";

writeFileSync(join(ROOT, "SHA256SUMS"), out, "utf8");
console.log(`checksums: wrote public/SHA256SUMS — ${lines.length} artifact(s), ${stamp}`);
