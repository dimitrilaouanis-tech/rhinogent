/* The assets table, in the shape a GitHub release page uses.
   ─────────────────────────────────────────────────────────────────────────────────────────
   Why this shape and not a prettier one: a developer landing on a downloads page already knows
   how to read `name · digest · size · updated`, and the 25-page teardown found only TWO pages
   in the whole set that render a per-asset hash — go.dev/dl and github.com/cli/cli/releases.
   Eighteen of twenty-five carry no integrity information at all, every AI-coding tool among
   them. Copying the shape developers already parse costs nothing and puts us in a set of two.

   Four columns, and the third is the point:

     ASSET    the path, monospace, and it is the link — click it and you have the file
     DIGEST   sha256, truncated for the eye, copyable in full
     SIZE     measured from the live response, not from the repo
     STATE    live, or the honest reason it is not

   WHAT IS AND IS NOT CHECKSUMMED, and why the table says so per row.
   SHA256SUMS covers only the artifacts this deploy writes. The feeds below it — the agent card,
   the per-agent cards, the census — are written by the network, not by the build, so a hash
   taken from our copy would not describe the live file. The first version of this page did
   exactly that and a stranger running `sha256sum -c` got two FAILED lines inside a minute. A
   checksum that fails for bookkeeping reasons is worse than none, because the honest reading of
   a mismatch is tampering. So those rows say "written by the network" where a digest would be,
   rather than carrying a number that is going to be wrong.

   Rows whose file is not currently served say so and are not links. A downloads page that links
   a 404 has broken the only promise it makes. */

type State = "live" | "network" | "absent";

export type Asset = {
  path: string;
  what: string;
  size: string;
  sha?: string;
  state: State;
  note?: string;
};

const STATE: Record<State, { label: string; cls: string }> = {
  live: { label: "live", cls: "bg-emerald/12 text-emerald" },
  network: { label: "live · network-written", cls: "bg-accent/10 text-accent" },
  absent: { label: "not served", cls: "bg-gold/15 text-gold" },
};

export function AssetsTable({ assets }: { assets: Asset[] }) {
  const served = assets.filter((a) => a.state !== "absent").length;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface/60 px-5 py-3">
        <span className="font-mono text-[12.5px] font-semibold text-foreground">
          Assets {served}
        </span>
        <span className="font-mono text-[11px] text-muted-2">
          fetchable with no account, no key, no sign-up
        </span>
      </div>

      {/* column heads, desktop only — the mobile layout stacks and labels inline */}
      <div className="hidden items-center gap-4 border-b border-border px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2 lg:flex">
        <span className="w-[250px] shrink-0">Asset</span>
        <span className="w-[200px] shrink-0">Digest</span>
        <span className="w-[72px] shrink-0 text-right">Size</span>
        <span className="flex-1 pl-4">State</span>
      </div>

      {assets.map((a, i) => (
        <div
          key={a.path}
          className={`bg-background px-5 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}
        >
          <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-4">
            <span className="w-full min-w-0 shrink-0 lg:w-[250px]">
              {a.state === "absent" ? (
                <span className="block truncate font-mono text-[12.5px] text-muted-2 line-through">
                  {a.path}
                </span>
              ) : (
                <a
                  href={a.path}
                  className="block truncate font-mono text-[12.5px] text-accent hover:underline"
                >
                  {a.path}
                </a>
              )}
            </span>

            <span className="w-full shrink-0 font-mono text-[11px] lg:w-[200px]">
              {a.sha ? (
                <span className="text-muted-2" title={a.sha}>
                  sha256:{a.sha.slice(0, 12)}…
                </span>
              ) : (
                <span className="text-muted-2/70">
                  {a.state === "network" ? "written by the network" : "—"}
                </span>
              )}
            </span>

            <span className="w-full shrink-0 font-mono text-[11.5px] tabular-nums text-muted-2 lg:w-[72px] lg:text-right">
              {a.size}
            </span>

            <span className="flex flex-1 items-center lg:pl-4">
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${STATE[a.state].cls}`}
              >
                {STATE[a.state].label}
              </span>
            </span>
          </div>

          <p className="body-copy mt-1.5 max-w-3xl text-[12.5px] leading-relaxed">
            {a.what}
            {a.note && <span className="text-muted-2"> — {a.note}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
