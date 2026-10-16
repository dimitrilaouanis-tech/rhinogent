# Runbook — making our A2A agent card spec-conformant and signed

**Status: NOT DONE. Every step below touches a published artifact or performs a signing
operation, so none of it has been executed.** Written 2026-10-04.

Everything in §1 was verified directly against normative sources, not summaries. The WebFetch
summariser garbled this spec twice during research (it invented a CAIP-10 sentence and could not
read the AgentCard field table), so each claim here names the file it came from.

---

## 1. What the spec actually requires — verified

Source: `a2aproject/A2A`, tag **v1.0.1**, files `specification/a2a.proto` and
`docs/specification.md` §8.4. Read 2026-10-04.

### 1.1 Required AgentCard fields (from `a2a.proto`, `message AgentCard`)

`name` · `description` · `supported_interfaces` · `version` · `capabilities` ·
`default_input_modes` · `default_output_modes` · `skills`

**Our `/.well-known/agent-card.json` has all eight.** On required fields we are conformant today.

Two fields we carry that **do not exist at the top level in v1.x** — they moved inside
`supported_interfaces[]` in v1.0.0 and are v0.3 leftovers:

- `protocolVersion`
- `url`

Shipping `protocolVersion: "1.0"` on a v0.3-shaped card is the self-contradictory part. Remove
both.

### 1.2 `signatures` is OPTIONAL

Field 13 on `AgentCard` carries no `REQUIRED` behaviour. **An unsigned card is not
non-conformant.** This is why the landing page now says "published, fetchable" rather than
"published, signed" — that edit is already shipped and is correct independent of this runbook.

### 1.3 What a signature must be (spec §8.4, quoted)

> "Agent Cards **MAY** be digitally signed using JSON Web Signature (JWS) as defined in RFC 7515"

> "Before signing, the Agent Card content **MUST** be canonicalized using the JSON
> Canonicalization Scheme (JCS) as defined in RFC 8785"

`AgentCardSignature` (from the proto):

| field | requirement |
|---|---|
| `protected` | REQUIRED. "The protected JWS header for the signature. This is always a base64url-encoded JSON object." |
| `signature` | REQUIRED. "The computed signature, base64url-encoded." |
| `header` | optional, unprotected JWS header, NOT base64url-encoded |

Protected header **MUST** include `alg`, `kid`; **SHOULD** set `typ: "JOSE"`; **MAY** include
`jku` (a JWKS URL).

Signing input, verbatim from §8.4.2:

```
ASCII(BASE64URL(UTF8(JWS Protected Header)) || '.' || BASE64URL(JWS Payload))
```

Payload preparation, in order:
1. Remove properties with default values (per proto field-presence rules, §5.7)
2. **Exclude the `signatures` field** — avoids the circular dependency
3. Canonicalize with RFC 8785

### 1.4 Why our current signature is not an A2A signature

`/agent-card.json` carries `protected: "EIP-191"` and `signature: "0x99e3…"`.

- `protected` must be a **base64url-encoded JSON object**; `"EIP-191"` is a plain ASCII label. A
  compliant verifier base64url-decodes it, gets garbage, and fails.
- `signature` must be **base64url**; ours is `0x`-prefixed hex.

It is a genuine Ethereum `personal_sign` wearing A2A's field names. Not forged, not useless —
just not the thing the field says it is.

---

## 2. What we already have — the gap is the envelope, not the cryptography

`src/lib/onyx-verify.ts` is a full RFC 8785 (JCS) canonicaliser, ported to match the signer
byte-for-byte including §3.2.2.3 number formatting. We sign Ed25519 over it, it verifies, and it
fails correctly on a tampered byte.

| spec requires | we have | gap |
|---|---|---|
| JCS (RFC 8785) canonicalisation | ✅ byte-exact | none |
| exclude `signatures` from the payload | ✅ same pattern as our attestations | none |
| Ed25519 signing | ✅ live, tamper-tested | none |
| `protected` = base64url JSON `{alg,typ,kid}` | ❌ the string `"EIP-191"` | wrap |
| `signature` = base64url bytes | ❌ `0x` hex | re-encode |
| published JWKS for `jku`/`kid` | ❌ `/.well-known/onyx-pubkey` **404s** | publish |

`alg` is **`EdDSA`** — Ed25519 is a registered JOSE algorithm (RFC 8037). The spec's
`"e.g. ES256, RS256"` is illustrative, not exhaustive.

---

## 3. The steps

### Step 1 — publish a JWKS (BLOCKER)

Nothing else is checkable until the key a verifier needs is reachable.
`/.well-known/onyx-pubkey` currently returns **404**.

Publish an `application/jwk-set+json` document at **`/.well-known/jwks.json`** containing the Ed25519 public key
as an OKP JWK (`kty: "OKP"`, `crv: "Ed25519"`, `x: <base64url>`, `kid`, `use: "sig"`,
`alg: "EdDSA"`). Keep old keys in the set during rotation — the spec explicitly allows multiple
signatures for exactly this.

### Step 2 — re-emit the signature as a JWS

Same key, same canonicaliser, different envelope. Build
`protected = base64url({"alg":"EdDSA","typ":"JOSE","kid":"<kid>","jku":"<jwks url>"})`, sign the
signing input from §1.3, base64url the signature bytes.

### Step 3 — fix the card and reconcile the two we serve

We currently publish two divergent cards:

- `/.well-known/agent-card.json` — the canonical path. Has `supportedInterfaces`, `x-0n1x`. **No
  signature.** `url` points at `onyx-pro.onyxagntc.workers.dev`.
- `/agent-card.json` — has `endpoints`, `securitySchemes`, `signatures`. `url` points at
  `rhinogent.com`.

Different skill sets between them. **The signed one is at the path nobody reads.** Make the
canonical path the signed, conformant one; drop top-level `url` and `protocolVersion`.

⚠️ **Do not copy the existing `signatures` block onto a different body.** The signature was
computed over one specific payload; moving it makes verification *fail*, which is worse than
having none. Re-sign, never relocate.

### Step 4 — two signatures from the start (do not defer this)

Ed25519 is accepted by the official Go implementation (`a2a-go/a2acrypto/alg.go` maps
`ed25519.PublicKey → "EdDSA"`, verified) and by the TypeScript reference. It is **not** accepted
by the Rust implementation (`zeph-a2a`), which supports ES256 only today.

The `signatures` array is plural for this reason. A second entry with `alg: ES256` from a P-256
key in the same JWKS makes the card verify across every implementation found.

### Step 5 — CI check against the ecosystem's own verifier

Run verification against the **deployed** card on every publish, so a regression is a red check
rather than a reviewer's finding.

Use `a2aproject/a2a-go`'s `a2acrypto` — the A2A project's own package — not a third-party
action. Verified API surface (read 2026-10-04):

| symbol | file | note |
|---|---|---|
| `Signer`, `NewSigner`, `(*Signer).Sign` | `sign.go` | returns an `a2a.AgentCardSignature` |
| `KeyResolver` interface, `KeyResolverFunc` | `keyresolver.go` | |
| `JWKSKeyResolver`, `NewJWKSKeyResolver(client, trustedJWKSURLs)` | `keyresolver.go` | **takes an allowlist of trusted JWKS URLs** |
| `canonicalizeJSON`, `jcsMarshal` | `canonical.go` | unexported |
| OKP/Ed25519, EC P-256/384/521, RSA key parsing | `jwks.go` | `kty:"OKP"` + `crv:"Ed25519"` → `ed25519.PublicKey` ✅ |

Two things this confirms:

1. **a2a-go parses Ed25519 JWKS keys.** `jwks.go` handles `kty: "OKP"` with
   `crv: "Ed25519"` and rejects any other curve. So an Ed25519 JWKS is resolvable by the
   reference implementation — signing and verification both work with our existing key family.
2. **`NewJWKSKeyResolver` takes `trustedJWKSURLs`** — an allowlist. The official implementation
   makes you pin the JWKS origin rather than following `jku`. This is the "jku is not a trust
   root" point made concrete in code, and it is why our wording stays "signed, key published at
   a stable URL".

⚠️ `a2acrypto` exports a `Signer` but **no exported `Verifier` type** at the version read. The
verify path is assembled from `KeyResolver` + the canonicaliser. Budget for writing that harness;
do not assume a one-call `Verify()`.

⚠️ Tooling caveat, measured 2026-10-04: `capiscio/validate-a2a` is Apache-2.0 but **★1 and last
pushed 2026-05-13** (~5 months stale); `capiscio/capiscio-node` is ★4. Useful as a secondary
signal; not sound as a merge gate. The gate is the a2a-go harness above.

### Step 6 — cross-implementation test vector BEFORE any public claim

Do this before the card goes live, not after. If three independent implementations agree on the
JCS bytes, "verifiable by the ecosystem's own tooling" is a true sentence. If any disagree, the
bug is in canonicalisation and it is found by us rather than by a peer.

**Start from the golden vectors that already exist** rather than writing fresh ones:
`a2acrypto_test.go` contains `TestGoldenSignMatchesReference` and
`TestGoldenServerCardMatchesReference`, with a `golden` struct. Those are the reference
fixtures — run our canonicaliser against them first. If `src/lib/onyx-verify.ts` reproduces the
golden canonical bytes, our JCS already agrees with the reference and the rest is envelope work.

Then the round trip: sign a card with our signer → verify with `a2acrypto` (Go) → verify with
`jose` (TypeScript). Three implementations, one set of bytes.

⚠️ **There is no `a2a_card_sign.py` in this repo, in `onyx_mcp`, or in the downloaded
`rhinogent-site.zip`** — searched 2026-10-04. If a plan references that filename it is referring
to something that does not exist yet; the signer has to be written, or adapted from the existing
Ed25519+JCS attestation path.

---

## 4. What we may claim, and what we may not

**May claim today:** "an A2A agent card carrying every field v1.0 requires" — checkable in one
fetch.

**May claim after steps 1–3:** "a signed A2A agent card, JWS over RFC 8785, key published
separately" — checkable by any A2A verifier.

**May NOT claim, ever, on current evidence:**

- "trusted" on the strength of `jku`. The open spec threads (#2096, #2099) are explicit that a
  signer-controlled `jku` only proves the card and the key came from the same place. Verification
  needs a verifier-side trust root. The Rust implementation refuses to fetch `jku` at all, citing
  SSRF on an attacker-controlled URL. Our wording is **"signed, key published at a stable URL"**,
  never "trusted".
- "A2A conformant" as a self-asserted badge. A self-authored instrument cannot certify. If a
  badge appears it must point at a third party's run, not ours.

---

## 5. Why this is worth doing

Of **88 live agent-ecosystem origins probed** (2026-10-04), 5 served an agent card; 3 of those
were auto-generated by a documentation host; **2 were hand-authored and 0 were spec-conformant**.

We already have the hard part — a byte-exact RFC 8785 canonicaliser and a working Ed25519 signer
that fails on tamper. Steps 1–3 are an envelope and a published key.
