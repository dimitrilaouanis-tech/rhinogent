# 0n1x — Governance (the process, not another layer)

Six rules, adopted 2026-07-08, in answer to Mr Fable's audit. These bind every public
claim, number, and name. If an action violates one of these, it does not ship — no exceptions,
no "just this once." This file is the single source of the *process*; the manifest is the single
source of the *numbers*.

## 1. Verification-before-announcement (HARD)
Every claim ships with its check command in the same breath, or it does not ship.
No copy reaches a landing page, manifest, or pitch until a **second machine — not the Windows box —**
runs the check cold and it passes. The circular links and phantom package names all happened because
copy shipped before the check existed. Check first. Announce second. Never the reverse.

## 2. One number, one source, one changelog
Every public metric resolves from **one** canonical endpoint (`census_manifest.json`). Everything else
embeds from it. Any change to a past number gets a dated entry in `METRIC_CHANGELOG.md`. If the census
shrinks, the diff explains why. "Recomputable" is a habit here, not a slogan.

## 3. Kill list beats build list
No new component ships while a known-broken public artifact exists. Broken links, unpublished packages,
param bugs — all higher priority than the next feature, definitionally, because they are what strangers
actually touch. The pattern was unlimited additive motion; this rule inverts it.

## 4. Weekly external-contact quota (the one that matters)
**One action per week that touches a party we don't control.** Publish a scan where agent developers are;
email an operator their own finding; submit the package to a directory; get one developer to run the install
cold. Metric: **external fingerprints per week.** Lifetime total to date: honest count in `EXTERNAL_CONTACT_LOG.md`.
Cap the inward motion, mandate the outward.

## 5. Name freeze
One product name (**0n1x**), one package name (**rhinogent**), one domain (**rhinogent.com**), for six months
from today. Every rename orphans whatever trust the last name earned — for a trust company that is self-harm.
Frozen until 2026-01-08. Redirect everything else.

## 6. The disclosure line is event-gated
The manifest sentence — *"operated by the 0n1x team; numbers reflect our own fleet, not external adoption"* —
can only change by an **event**, never by copywriting. The event that permits changing it, defined now in writing:

> **A citizen whose key we never held completes a paid check, with the transaction hash linked publicly.**

Until that hash exists, the line stands verbatim. The day it changes, **the diff is the launch announcement.**

---
*Adopted in answer to the audit. The playbook has unlimited inward motion as its failure mode; these six cap it.*
