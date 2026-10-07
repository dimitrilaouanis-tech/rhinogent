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
echo "▶ race-push (rebase -X ours onto live origin, retry while the Angeal keeps writing)…"
# The Angeal pushes to gh-pages continuously, so origin can move between our fetch and push.
# Retry: re-fetch, rebase -X ours (our code wins; Angeal json already == origin), push again.
pushed=""
for i in 1 2 3 4 5 6; do
  git fetch -q origin gh-pages
  git rebase -X ours origin/gh-pages >/dev/null 2>&1 || git rebase --abort >/dev/null 2>&1
  if git push origin gh-pages 2>/dev/null; then pushed=1; echo "  pushed on try $i"; break; fi
  echo "  try $i rejected (Angeal moved) — retrying…"; sleep 2
done
git fetch -q origin gh-pages
if [ -n "$pushed" ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/gh-pages)" ]; then
  echo "✓ deployed — HEAD == origin/gh-pages"
else
  echo "✗ could not win the race in 6 tries — re-run scripts/deploy.sh"; exit 1
fi
