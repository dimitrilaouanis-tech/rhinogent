# 0n1x Signed Outcomes Report

**2026-07-09T20:51:29Z — 0n1x / rhinogent.com**

> Run our script, get our number. We publish our own failures.

Every number below was pulled live from rhinogent.com's own published feeds by `onyx_outcomes_report.py` — not typed in by hand. Re-run the `recompute` command next to any claim and compare against what's printed here. This document is itself Ed25519-signed (see the bottom) so a copy can't be silently edited after the fact.

## Outcomes

### Self-correcting challenge court caught planted-wrong facts in shadow mode

**Number:** 6/6 planted-wrong facts caught (47 of 50 correct outcomes overall, 50 challenges run, 31 upheld / 19 overturned)

**Source feed:** [https://rhinogent.com/challenge_court.json](https://rhinogent.com/challenge_court.json)

**Recompute:** `curl -s https://rhinogent.com/challenge_court.json | jq '.planted_wrong_detail, .court_correct_outcomes, .challenges_run'`

*Domains it caught: ebay.com, google.com, mozilla.org, onyx-verified-merchant-x9q2.xyz, reddit.com, rolex-outlet-super-deals-2026.shop. Mode: shadow (frozen until grader fix + persistence pass) — frozen=True (deltas recorded, nothing moves yet).*

### We caught our own grader flipping coins and published the fix

**Number:** journal_share 0.0001 -> 1.0; retired headline number 0.4989 (was a salted coin flip, 2 of 24,000 answers actually from real journal knowledge); after fix: 0 coin flips in the graded pool, 200/200 frozen-cohort agents carry >=3 real accuracy datapoints across distinct hour epochs

**Source feed:** [https://rhinogent.com/oracle_postmortem.json](https://rhinogent.com/oracle_postmortem.json)

**Recompute:** `curl -s https://rhinogent.com/oracle_postmortem.json | jq '.evidence_before, .evidence_after, .headline_number_retired'`

*digest_sha256=b401627a8f5421796ee9c26434e1359d075f85be1b5918ffb09d6c7864ab03d3, attestor=0xba8568fCe6759c9bad1ed52EAE568B3dB3346294. Human-readable: https://rhinogent.com/oracle_postmortem.md*

### Reasoning core (Monad #1) vs deterministic lookup baseline — reported honestly, including the FAIL

**Number:** monad1_overall_accuracy=0.94 vs lookup_baseline=0.881 (67 trials); won 6/8 contested disagreements (conditional accuracy 0.75, 95% CI [0.40926987910258916, 0.9285223111419724]); PRE-REGISTERED VERDICT = FAIL (calibration gap > 0.20 in a scored bucket; conditional-accuracy CI lower bound did not beat baseline)

**Source feed:** [https://rhinogent.com/monad1_test.json](https://rhinogent.com/monad1_test.json)

**Recompute:** `curl -s https://rhinogent.com/monad1_test.json | jq '.monad1_overall_accuracy, .lookup_baseline, .conditional_accuracy_with_CI, .verdict, .verdict_reason, .prereg_criteria'`

*Freeze STAYS. Verdict=fail: calibration gap > 0.20 in a scored bucket; conditional-accuracy CI lower bound did not beat baseline. No tautology-based or lucky-small-n lift. Criteria were written BEFORE the run (prereg_criteria.written_before_run=true). Signers: monad1=0x0502b4c8a1F7b288d9857310455a8e5b58C1EA8D, adversary=0xE8ea70Ab36102A1d248c697Baf61f0Fe9860d5ce. THIS IS A FAIL, reported as a FAIL — the freeze on rank-to-stake stays.*

### Shadow data-exchange inspector panel accuracy against a 20-item known-truth set (gates live weighting only inside the honest 70-85% band)

**Number:** shadow_inspector_accuracy=0.8 (honest (70-85%)); live_weighting_enabled=True; tier split (cumulative) = {'trash': 22, 'normal': 4, 'premium': 70}; total_submissions_all_time=96; biggest_slashes=[{'item': 'live-subj-1783629100-2', 'supplier': None, 'slash': -5.0}, {'item': 'live-subj-1783629100-3', 'supplier': None, 'slash': -4.14}]

**Source feed:** [https://rhinogent.com/exchange_market.json](https://rhinogent.com/exchange_market.json)

**Recompute:** `curl -s https://rhinogent.com/exchange_market.json | jq '.shadow_inspector_accuracy, .shadow_zone, .cumulative_tier_split, .total_submissions_all_time, .biggest_slashes, .health_flags'`

*This exchange's inspector-weighting freeze is DISTINCT from the old fleet prediction-ranking freeze (that one is dead noise, never revived — see 0N1X_RHINOGENT_FACTS.md). THIS freeze is a live gate this script itself can pass: live_weighting_enabled becomes true only when shadow_inspector_accuracy l*

### Ledger state anchored to Bitcoin via OpenTimestamps (unforgeable age)

**Number:** 1 anchor(s) since 2026-07-07T16:03:12Z, 3 OTS calendars accepted for the latest root c582a578f841f1b118b40475...

**Source feed:** [https://rhinogent.com/anchor.json](https://rhinogent.com/anchor.json)

**Recompute:** `curl -s https://rhinogent.com/anchor.json | jq '.total_anchors, .anchoring_since, .calendars_accepted, .latest_root'`

*Recompute the root from the source ledgers per anchor.json's own 'note' field; .ots proofs upgrade to a Bitcoin block header once confirmed.*

### Signed agent identities in the 0n1x fleet (Merkle-rooted, sharded, recomputable) — OUR OWN FLEET, explicitly NOT external adoption

**Number:** count=2476274, merkle_root=b3903445bc77a41bee7010df..., epoch=2026-07-07T00:19:23Z, shard_count=1040

**Source feed:** [https://rhinogent.com/census_manifest.json](https://rhinogent.com/census_manifest.json)

**Recompute:** `curl -s https://rhinogent.com/census_manifest.json | jq '.count, .merkle_root, .epoch, (.shards | length)'  # then recompute merkle_root by hashing each shard file listed and rolling up`

*Label is honest: fleet-internal signed identities, not third-party adoption. See 'WHAT WE DO NOT CLAIM'.*

### Verified-good facts in the public facts registry (oracle-matched, agent-attested, signed)

**Number:** fact_count=12, proven_count=10

**Source feed:** [https://rhinogent.com/facts_registry.json](https://rhinogent.com/facts_registry.json)

**Recompute:** `curl -s https://rhinogent.com/facts_registry.json | jq '.fact_count, .proven_count, [.entries[] | select(.proven==true)] | length'`

*Small sample by design (public registry sample); full feed grows as the oracle re-verifies more targets.*

### Signed slash-list of bad actors, built ONLY from real ledger evidence (stake loss and/or wrong signed verdicts) — never inferred

**Number:** total_flagged=19821, public_sample_entries=200, severity_breakdown={'high': 18, 'medium': 18124, 'low': 1679}

**Source feed:** [https://rhinogent.com/negative_registry.json](https://rhinogent.com/negative_registry.json)

**Recompute:** `curl -s https://rhinogent.com/negative_registry.json | jq '.total_flagged, .entry_count, .severity_breakdown, .onyx_attestation.kid'  # then verify onyx_attestation per .recompute`

*This exact document carries an onyx_attestation Ed25519 signature — same key family as this report.*

### rhinogent SDK is a live, installable npm package (not slideware)

**Number:** rhinogent@0.1.0 present on the public npm registry: True

**Source feed:** [https://registry.npmjs.org/rhinogent](https://registry.npmjs.org/rhinogent)

**Recompute:** `curl -s https://registry.npmjs.org/rhinogent | jq '.versions | keys'  # or: npm view rhinogent versions`

*One-line install: npm i rhinogent -> signed identity + self-custody wallet + verify-before-pay.*

## What we do NOT claim

- External adoption is ZERO. Every signed identity counted above is our own fleet, not a third-party integrator. The launch event we are waiting for is a citizen whose key we never held completing a PAID check with a real tx hash — that has not happened yet.
- Monad #1 (reasoning vs lookup) FAILED its own pre-registered bar (verdict=fail, written before the run) — 0.94 vs 0.881 overall and 6/8 won contested disagreements are real, but the calibration-gap and CI criteria were not cleared. We are not dressing this up: the rank-to-stake freeze stays.
- Rank-to-stake / the agent leaderboard is FROZEN — proven noise from a disjoint-cursor grader bug (see oracle_postmortem.json). It stays frozen until an independent disagreement source clears its own pre-registered bar.
- The exchange market's 'live_weighting_enabled' gate only fires inside a deliberately narrow 70-85% shadow-inspector-accuracy band; above 90% is flagged as overfitting, not celebrated.
- A cryptographic signature proves the DATA WAS NOT ALTERED after signing and identifies WHO signed it. It does not prove the underlying real-world fact is true — that's why every observation ships with its method and disclaimer. We sign facts, not verdicts.
- Bitcoin anchoring currently has 1 recorded anchor round (anchor.json) — the moat is TIME accumulating from here, not an established multi-year history yet.

## How to verify this document

This entire JSON (minus the onyx_attestation block) is hashed and Ed25519-signed. pip install cryptography; then run tools_pkg._onyx_sign.verify(report) from onyx_mcp, or reimplement RFC-8785 JCS canonicalization + Ed25519 verify with the embedded onyx_attestation.public_key. Independently, every 'number' field below carries its own 'recompute' command against the live feed — re-run it and compare.

## Signature

- alg: `Ed25519+JCS`
- kid: `onyx-7fdc5cc8113040cb`
- public_key (Ed25519, base64url-raw-32): `wO5wAA6sEdmEYB4vJbGYuX0QC53A5ftPEM1bIjJhXh4`
- observed_hash: `sha256:50a6d3cc407b871163633c0518cc96702c734e58245369193743dc0d807858a5`
- signed_at (unix): `1783630289`
- sig: `QmfqUnArVe1W7jYB8XnwQv7-okNWKu0JdUT61RBCaLwGNgFSVpV__8k1rnObYaVvZ0a0BEglowRr3NAIpmjBBg`

Machine-readable + signed source of truth: [`outcomes_report.json`](https://rhinogent.com/outcomes_report.json)
