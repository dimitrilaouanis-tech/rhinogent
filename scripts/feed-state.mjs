/* Generate public/feed-state.json — the state of every published feed, from our perspective.
   ─────────────────────────────────────────────────────────────────────────────────────────
   WHY THIS EXISTS. census_v1.json is not currently served: the network's Angeal is the sole
   writer of fleet state and this build must not publish a snapshot of it. Until it does, a
   stranger fetching that path gets a bare 404, and a 404 is indistinguishable from "this
   product is broken".

   The transparency-log world solved this and the solution is not a sentence of apology. Across
   twelve surfaces studied on 2026-10-08 — Sigstore, Rekor, Certificate Transparency, Trillian,
   Let's Encrypt, SLSA, TUF — the literal words "behind", "lagging" and "not yet included" do
   not appear as product copy anywhere. What they publish instead is:

     (a) a bounded promise with a NUMBER      — CT's Maximum Merge Delay, `"mmd": 86400`
     (b) an ENUMERATED state with a TIMESTAMP — pending | usable | readonly | retired
     (c) a SEPARATE status component per log  — Let's Encrypt lists each CT shard on its own

   The schema below is modelled on Google's CT log list (`log_list.json` + its schema), whose
   `state` field is titled "The state of the log from the log list distributor's perspective"
   and is a oneOf whose single required member is the timestamp at which the feed entered it.
   Two details copied deliberately:

     - `oneOf`, so exactly one state is named and a feed cannot be two things at once.
     - `readonly` additionally carries its final head, the way CT requires `final_tree_head`,
       so a frozen feed still says where it stopped rather than just going quiet.

   `pending` is the honest state for a feed whose publisher has not written it yet. It is not an
   error, and the page renders it as a state rather than a failure.

   Runs as part of `prebuild`, so it cannot describe a build other than the one shipping. */

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { isHeld } from "./held-feeds.mjs";

const ROOT = join(process.cwd(), "public");
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

/* `writer` is the load-bearing field: it says WHO is allowed to write the file, which is what
   makes "pending" a statement about process rather than an excuse. */
const FEEDS = [
  {
    name: "census_v1",
    path: "/census_v1.json",
    what: "Population and activity counts. Every number on the site reads from here.",
    writer: "network",
  },
  {
    name: "reputation_v1",
    path: "/reputation_v1.json",
    what: "Rank, tier and verified count per agent.",
    writer: "network",
  },
  {
    name: "rates_v1",
    path: "/rates_v1.json",
    what: "Signed economy rates.",
    writer: "network",
  },
  {
    name: "a2a_cards",
    path: "/a2a_cards.json",
    what: "One card per agent, each with its did:pkh.",
    writer: "network",
  },
  {
    name: "jwks",
    path: "/.well-known/jwks.json",
    what: "The feed-signing public key, RFC 8037 JWK.",
    writer: "build",
  },
];

const feeds = FEEDS.map((f) => {
  const abs = join(ROOT, f.path.replace(/^\//, ""));
  /* Present in public/ is NOT the same as served. The deploy holds the network-written
     feeds back, so a file can sit on disk and still 404 live — which is exactly what this
     document exists to state. `here` means "the live site will serve it". */
  const here = existsSync(abs) && !isHeld(f.path);

  /* A feed the BUILD writes and that is present is usable; one the build writes and that is
     missing is a defect in this build and says so. A feed the NETWORK writes is pending until
     the network has written it — never "broken", because nothing is broken. */
  let state;
  if (f.writer === "build") {
    state = here
      ? { usable: { timestamp: now } }
      : { rejected: { timestamp: now, reason: "the build should write this file and did not" } };
  } else {
    state = here
      ? { usable: { timestamp: now } }
      : {
          pending: {
            timestamp: now,
            reason:
              "written by the network, not by this build; the build must not publish fleet state",
          },
        };
  }

  const out = { name: f.name, path: f.path, what: f.what, writer: f.writer, state };
  if (here) {
    const buf = readFileSync(abs);
    out.size = statSync(abs).size;
    out.sha256 = createHash("sha256").update(buf).digest("hex");
  }
  return out;
});

const doc = {
  schema: "rhinogent.feed-state/1",
  version: now,
  /* Said plainly, the way CT's schema titles its own state field. A reader should never have to
     infer whose opinion this is. */
  note: "The state of each published feed from the publisher's perspective. `pending` means the writer named in `writer` has not written it yet — it is a known state, not a fault.",
  feeds,
};

writeFileSync(join(ROOT, "feed-state.json"), JSON.stringify(doc, null, 2) + "\n", "utf8");

const counts = feeds.reduce((a, f) => {
  const k = Object.keys(f.state)[0];
  a[k] = (a[k] || 0) + 1;
  return a;
}, {});
console.log(
  "feed-state: wrote public/feed-state.json — " +
    Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", "),
);
