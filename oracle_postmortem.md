# Postmortem: our grader was flipping coins

**2026-07-09T10:26:22Z — 0n1x oracle learning loop**

> The oracle was fine, the exam was fake, and the system's honesty machinery caught its own fraud.

## What we published, and what it actually measured

We published a "population oracle accuracy" of **0.4989** and called it honest chance-level
performance. It was honest — but it was not measuring the oracle. For **99.99% of graded
answers** the grader was scoring `sha256(address:question:epoch) & 1`: a salted coin flip.
0.4989 is exactly what a fair coin looks like under honest measurement.

The oracle itself — RDAP domain age + TLS + HTTP banding, signed per answer — was never
broken. It is the verified answer key. What was fake was the exam.

## The mechanism (three interlocking bugs)

1. **Disjoint cursors.** The educate pass and the exam pass each rotated their own cursor over
   a ~1M-agent roster. The windows almost never intersected: real journal knowledge reached the
   grader for **2 answers in 24,000** (journal_share 0.0001).
2. **Coin-flip fallback.** A student with no journal knowledge got a fabricated
   `sha256(...)&1` answer that was **counted in the accuracy denominator**.
3. **Non-atomic wipe.** Accuracy history was written non-atomically while readers swallowed
   parse errors into `{}` — concurrent runs kept wiping history. 77.5% of agents carried
   exactly one datapoint.

## The fix (in order)

1. **Atomic writes first** — tmp + `os.replace()` on every accumulated-history file, hardened
   loads that never write back after a failed parse, and a cross-process lock.
2. **The coin-flip path was deleted, not fixed** — no knowledge means the item surfaces as
   **absence (null)**: not answered, not graded, not in any denominator.
3. **Frozen 200-agent cohort** — educate and exam now hit the SAME agents every epoch; the
   bridge teaches all exam-pool domains per pass.
4. **Three labeled numbers, never one headline** — `journal_share` (drive to 1.0),
   `informed_accuracy` (caveat: consultant = grader, pinned at 1.0 by construction),
   and the share-weighted blend.

## Before / after

| metric | before | after |
|---|---|---|
| journal_share | 0.0001 | **1.0** |
| answers from journal | 2 / 24,000 | 1,600 / 1,600 |
| coin flips in graded pool | ~23,998 / 24,000 | **0** |
| cohort agents with >=3 real datapoints | 2 | 200 / 200 |

## What we still do NOT claim

- Informed accuracy of 1.0 is a **pipe test, not intelligence** — the journal is educated by
  the same oracle that grades. The tautology is printed next to the number.
- The rank-to-stake pipe stays **FROZEN**. The gate lifts only when the out-of-sample
  persistence test passes on fixed-cohort data with a real disagreement source in the loop.

## Verify

- machine-readable postmortem: [`oracle_postmortem.json`](https://rhinogent.com/oracle_postmortem.json) (attestor-signed)
- live exam artifact: [`generative_curriculum.json`](https://rhinogent.com/generative_curriculum.json)
- freeze gate: [`persistence_test.json`](https://rhinogent.com/persistence_test.json)

*digest sha256 `b401627a8f5421796ee9c26434e1359d075f85be1b5918ffb09d6c7864ab03d3` — attestor `0xba8568fCe6759c9bad1ed52EAE568B3dB3346294`*
