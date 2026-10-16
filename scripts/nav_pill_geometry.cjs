#!/usr/bin/env node
/* THE PILL SITS ON THE WORD — asserted in BOTH axes.
   ────────────────────────────────────────────────────────────────────────────────────────────
   WHY THIS EXISTS. The sliding indicator behind the nav labels rendered 15px high — exactly
   half its own 30px height — from the day it shipped until 2026-10-16, and every check it had
   passed the whole time. They all compared the pill's x and width against the item's
   ("pill=516/106 vs item 516/106") and never once looked at y. A reviewer saw it in a
   screenshot before any instrument did.

   THE CAUSE, which is the reason this is worth a permanent test rather than a one-line fix:
   in Tailwind v4 `-translate-y-1/2` compiles to the INDEPENDENT `translate` property, not to
   `transform`. So it does not replace an inline `transform: translate3d(x, -50%, 0)` — it
   composes with it, and both carried -50%. Measured: translate "0px -50%" AND transform
   translateY(-15px) on the same element. That is a trap any future utility class on a
   transformed element can re-set, and it is invisible in source review because each half looks
   correct on its own.

   NULL TEST: `--null` re-adds the independent translate to the live pill and requires this
   checker to FAIL. A geometry assertion that cannot be made to fail is not measuring geometry.

   Usage:  node scripts/nav_pill_geometry.cjs [baseURL]        (default http://127.0.0.1:4321)
           node scripts/nav_pill_geometry.cjs --null [baseURL]
*/
const { chromium } = require("playwright");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NULL = process.argv.includes("--null");
const BASE = (process.argv.find((a) => /^https?:\/\//.test(a)) || "http://127.0.0.1:4321").replace(/\/$/, "");
const ROUTES = ["/", "/security/", "/agents/", "/download/"];
const TOL = 1.0; // px. The pill is positioned in fractional px off a 50% top; 1px is rounding.

async function measure(page, poison) {
  return page.evaluate((poison) => {
    const pill = document.querySelector(".nav-pill");
    if (!pill) return { error: "no .nav-pill on this page" };
    if (poison) pill.style.translate = "0 -50%";   // the bug, re-introduced on purpose
    const items = [...document.querySelectorAll(".nav-item")];
    const pr = pill.getBoundingClientRect();
    const mid = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const pm = mid(pr);
    // the item the pill is currently on: the one whose x/width it matches
    const on = items
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .sort((a, b) => Math.abs(a.r.left - pr.left) - Math.abs(b.r.left - pr.left))[0];
    if (!on) return { error: "no .nav-item" };
    const im = mid(on.r);
    return {
      label: on.el.textContent.trim(),
      dx: +(pm.x - im.x).toFixed(2),
      dy: +(pm.y - im.y).toFixed(2),
      pillH: +pr.height.toFixed(1),
      itemH: +on.r.height.toFixed(1),
      translate: String(getComputedStyle(pill).translate),
      transform: String(getComputedStyle(pill).transform),
    };
  }, poison);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1277, height: 800 } });
  const page = await ctx.newPage();
  let bad = 0, checked = 0;

  console.log(`nav pill geometry — ${BASE}${NULL ? "   [NULL TEST: the bug is re-introduced on purpose]" : ""}\n`);
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".nav-pill", { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await sleep(500);

    // at rest (the pill is on the current page), then hovering each item in turn
    const stops = [null, "Home", "Get started", "Security", "Agents", "Download"];
    for (const hover of stops) {
      if (hover) {
        const it = page.locator(".nav-item", { hasText: hover }).first();
        if (!(await it.count())) continue;
        await it.hover();
        await sleep(650);                      // past the longest glide (520ms)
      }
      const m = await measure(page, NULL);
      if (m.error) { console.log(`  ${route} ${m.error}`); bad++; continue; }
      checked++;
      const okX = Math.abs(m.dx) <= TOL;
      const okY = Math.abs(m.dy) <= TOL;
      if (!okX || !okY) {
        bad++;
        console.log(`  ✗ ${route.padEnd(12)} ${String(m.label).padEnd(12)} dx=${m.dx} dy=${m.dy}  ` +
          `(pill ${m.pillH}px in a ${m.itemH}px item; translate:${m.translate} transform:${m.transform})`);
      }
    }
  }
  await browser.close();

  console.log(`\n${checked} positions checked across ${ROUTES.length} routes, ${bad} off-centre (tolerance ${TOL}px).`);
  if (NULL) {
    const pass = bad > 0;
    console.log(`NULL TEST  fires-on-bad=${pass}  => ${pass ? "PASS" : "FAIL — the checker cannot see the bug it exists for"}`);
    process.exit(pass ? 0 : 1);
  }
  console.log(bad === 0
    ? "PASS: the pill is centred on its item in both axes, at rest and on every hover."
    : "FAIL: the pill is not centred on its item.");
  process.exit(bad === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
