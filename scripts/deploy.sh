#!/usr/bin/env bash
# Race-safe deploy: rhinogent2 build -> rhino_pages (gh-pages) -> rhinogent.com
#
# WHY THIS SCRIPT EXISTS (read before editing):
# A continuous data Angeal writes LIVE JSON straight to the gh-pages branch (census counts,
# token feed, portal URL, telemetry, ...). Twice now a plain "cp build/* + git add -A" nearly
# shipped the BUILD's stale JSON snapshots over that live Angeal data. This script makes that
# impossible: after copying the build, EVERY *.json outside _next/ is restored from the live
# origin/gh-pages before commit. Code (HTML + _next chunks) deploys; Angeal data is never touched.
#
# Usage:  bash scripts/deploy.sh        (run from the rhinogent2 dir; builds first)
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PAGES_DIR="${PAGES_DIR:-$APP_DIR/../rhino_pages}"

cd "$APP_DIR"
echo "▶ building static export…"
npx next build >/dev/null
[ -f out/.nojekyll ] || touch out/.nojekyll   # .nojekyll MUST survive or GH Pages strips _next/

# ── CLIENT-NAV FIX (RSC flat .txt) ────────────────────────────────────────────
# trailingSlash export writes RSC data to out/<route>/index.txt, but Next 16's client
# router fetches /<route>.txt on <Link> click → 404 → not-found boundary (the Desk bug,
# #85374). Emit the no-slash siblings so in-app navigation resolves. Additive only.
echo "▶ rsc-flat: no-slash .txt siblings (client-nav fix)…"
node scripts/rsc-flat.cjs

# ── NUMBER-SYNC-LOCK GATE ─────────────────────────────────────────────────────
# HARD RULE: one source per published number; all pages agree or the deploy is BLOCKED.
# Every count renders from the signed feed at runtime, so any hardcoded agent/census number in the
# built HTML is a violation. Fail-closed. (null-tested: scripts/number_sync_lock.cjs --null)
echo "▶ number-sync-lock gate…"
node scripts/number_sync_lock.cjs || { echo "✗ number-sync-lock FAILED — unsourced number in the build; deploy blocked"; exit 1; }

echo "▶ copying build → $PAGES_DIR (no --delete: preserves Angeal files not in the build)…"
cp -r out/* "$PAGES_DIR/"
cp -f out/.nojekyll "$PAGES_DIR/.nojekyll"

cd "$PAGES_DIR"
touch .nojekyll
git fetch origin gh-pages
git add -A

# ── ANGEAL GUARD ──────────────────────────────────────────────────────────────
# Deny-list: every *.json outside _next/ is Angeal-owned live data. Restore each from
# live origin/gh-pages so a stale build snapshot can NEVER clobber it. This is the
# structural fix for the two near-misses — the third occurrence is impossible.
echo "▶ Angeal guard: restoring all live *.json from origin/gh-pages…"
restored=0
for f in $(git diff --cached --name-only | grep -E '\.json$' | grep -v '^_next/'); do
  git checkout origin/gh-pages -- "$f" 2>/dev/null || git checkout HEAD -- "$f" 2>/dev/null || true
  restored=$((restored+1))
done
git add -A
echo "  restored $restored Angeal json file(s) to live values."

if git diff --cached --quiet; then echo "▶ nothing to deploy (code unchanged)."; exit 0; fi

git commit -q -m "${1:-deploy: rhinogent2 build}

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
echo "▶ race-push (rebase onto live origin, retry while the Angeal keeps writing)…"
# The Angeal pushes to gh-pages continuously, so origin can move between our fetch and push.
#
# ── -X theirs, NOT -X ours. THIS LINE SHIPPED THE WRONG SIDE. ──────────────────────────
# In a REBASE the sides are swapped relative to a merge: "ours" is the commit being rebased
# ONTO (origin/gh-pages, the Angeal's tree) and "theirs" is the commit being replayed (our
# build). So `rebase -X ours` resolved every conflicting file in favour of the Angeal's older
# copy, and our fresh HTML lost silently whenever a deploy raced it.
#
# Measured, 2026-10-15: a deploy that rebuilt /agents, /security and /download pushed
# d81cdfcd1d carrying the new CSS chunk and the new index.txt payloads and NOT ONE of the
# three index.html files. rhinogent.com kept serving "Ranked by what they did." while the
# build on disk said "Self-custody agents, paid for verified work." The script still printed
# "✓ deployed", because HEAD really did equal origin/gh-pages — it was equal to the wrong
# tree. A deploy that reports success while shipping nothing is worse than one that fails.
#
# THE JSON INVARIANT IS RE-ASSERTED, NOT ASSUMED. -X theirs would let our stale *.json
# snapshot win if the Angeal moved after our fetch, so the guard runs again after each rebase
# against the newly fetched origin and the commit is amended. Code wins, live data wins, and
# neither outcome depends on who pushed last.
restore_angeal_json() {
  local n=0 f
  for f in $(git diff --name-only origin/gh-pages -- . | grep -E '[.]json$' | grep -v '^_next/'); do
    if git checkout origin/gh-pages -- "$f" 2>/dev/null; then n=$((n+1)); fi
  done
  if [ "$n" -gt 0 ]; then
    git add -A
    if ! git diff --cached --quiet; then git commit -q --amend --no-edit; fi
  fi
  echo "    re-restored $n Angeal json file(s) from the fetched origin."
}

pushed=""
for i in 1 2 3 4 5 6; do
  git fetch -q origin gh-pages
  git rebase -X theirs origin/gh-pages >/dev/null 2>&1 || git rebase --abort >/dev/null 2>&1
  restore_angeal_json
  if git push origin gh-pages 2>/dev/null; then pushed=1; echo "  pushed on try $i"; break; fi
  echo "  try $i rejected (Angeal moved) — retrying…"; sleep 2
done
git fetch -q origin gh-pages

# HEAD == origin/gh-pages was TRUE on the deploy that shipped none of the pages, so on its own
# it is not evidence that anything was deployed. Every .html in the build must be byte-identical
# to the copy now in the pushed tree, or this did not ship.
drift=0
total=0
for rel in $(cd "$APP_DIR/out" && find . -name '*.html' -type f | sed 's|^[.]/||'); do
  total=$((total+1))
  if ! cmp -s "$APP_DIR/out/$rel" "$PAGES_DIR/$rel" 2>/dev/null; then
    echo "  ✗ DRIFT: $rel differs from the build"
    drift=$((drift+1))
  fi
done
if [ "$drift" -gt 0 ]; then
  echo "✗ $drift of $total html file(s) do not match the build — the push shipped the wrong tree"
  exit 1
fi
echo "▶ html parity: all $total built pages match what was pushed."

if [ -n "$pushed" ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/gh-pages)" ]; then
  echo "✓ deployed — HEAD == origin/gh-pages, html verified against the build"
else
  echo "✗ could not win the race in 6 tries — re-run scripts/deploy.sh"; exit 1
fi
