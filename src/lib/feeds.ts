// ONE way to fetch a live feed, everywhere. GitHub Pages serves via the Fastly CDN and you
// CANNOT set Cache-Control on Pages — so two devices on different networks hit different edge
// nodes holding different-age cached copies of the same file (the phone≠desktop number skew).
// Fix: a per-minute cache-buster the CDN has never seen forces an origin fetch, and cache:"no-store"
// handles the browser layer. Together they collapse cross-device skew to under a minute.
export function feedFetch(path: string, initExtra?: RequestInit): Promise<Response> {
  const bust = Math.floor(Date.now() / 60000); // rolls once per minute
  const sep = path.includes("?") ? "&" : "?";
  return fetch(`${path}${sep}t=${bust}`, { cache: "no-store", ...initExtra });
}
