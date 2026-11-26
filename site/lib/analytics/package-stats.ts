import { createHash } from "node:crypto";

/**
 * Package and repository statistics as PostHog events, for the daily cron
 * (app/api/cron/package-stats). Pure apart from hashing, so `checks/analytics.test.mjs` runs it in
 * Node: it only imports node:crypto.
 *
 * Reruns are idempotent: each event's `uuid` and `timestamp` are derived from what it measures
 * (event, package or repository, UTC day), and its distinct_id is fixed. PostHog keeps one event
 * per (event, distinct_id, timestamp, uuid), so a rerun replaces a day's figure instead of adding
 * a second one. The collapse happens in the background; a query run seconds after a rerun can
 * briefly count both.
 */

export const STATS_DISTINCT_ID = "package-stats";
export const STATS_LIB = "searchsdk-site-cron";

/** Fixed namespace for this site's deterministic event ids (a random v4, generated once). */
export const STATS_NAMESPACE = "6f1d3a52-8c1e-4f0b-9a57-2c4e9b8d7a31";

export type StatsEvent = {
  event: string;
  distinct_id: string;
  uuid: string;
  timestamp: string;
  properties: Record<string, unknown>;
};

/** RFC 9562 UUID version 5 (SHA-1, name-based): the same namespace and name give the same id. */
export function uuidV5(name: string, namespace: string = STATS_NAMESPACE): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  if (ns.length !== 16) throw new Error(`invalid namespace uuid: ${namespace}`);
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6]! & 0x0f) | 0x50;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** YYYY-MM-DD in UTC. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The last `days` complete UTC days before `now`, oldest first, as { start, end } (inclusive). */
export function backfillRange(now: Date, days = 30): { start: string; end: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  return { start: utcDay(start), end: utcDay(end) };
}

function statsEvent(event: string, key: string, day: string, properties: Record<string, unknown>): StatsEvent {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`invalid day: ${day}`);
  return {
    event,
    distinct_id: STATS_DISTINCT_ID,
    uuid: uuidV5(`${event}:${key}:${day}`),
    timestamp: `${day}T00:00:00.000Z`,
    properties: { ...properties, day, $process_person_profile: false, $geoip_disable: true, $lib: STATS_LIB },
  };
}

/** api.npmjs.org/downloads/range/{start}:{end}/{package} */
export type NpmRange = { package: string; start: string; end: string; downloads: Array<{ day: string; downloads: number }> };
/** api.npmjs.org/downloads/point/{period}/{package} */
export type NpmPoint = { package: string; start: string; end: string; downloads: number };

/** One `npm_downloads` event per package and day. */
export function npmRangeEvents(range: NpmRange): StatsEvent[] {
  return range.downloads
    .filter((d) => Number.isFinite(d.downloads))
    .map((d) => statsEvent("npm_downloads", range.package, d.day, { package: range.package, downloads: d.downloads }));
}

/** One `npm_downloads_summary` event per package for the day of the run. */
export function npmSummaryEvent(pkg: string, day: string, lastWeek: NpmPoint, lastMonth: NpmPoint): StatsEvent {
  return statsEvent("npm_downloads_summary", pkg, day, { package: pkg, last_week: lastWeek.downloads, last_month: lastMonth.downloads });
}

/** The fields used from GET api.github.com/repos/{owner}/{repo}. */
export type GithubRepo = {
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  /** Watchers (people subscribed to notifications); `watchers_count` is the star count. */
  subscribers_count: number;
  open_issues_count: number;
};

/** The fields used from GET api.github.com/repos/{owner}/{repo}/releases. */
export type GithubRelease = { tag_name: string; draft?: boolean; assets: Array<{ name: string; download_count: number }> };

/** One `github_repo_stats` event for the day, and one `github_release_downloads` per release asset. */
export function githubEvents(repo: GithubRepo, releases: GithubRelease[], day: string): StatsEvent[] {
  const published = releases.filter((r) => !r.draft);
  const assets = published.flatMap((r) => r.assets.map((a) => ({ tag: r.tag_name, asset: a.name, downloads: a.download_count })));
  const total = assets.reduce((n, a) => n + a.downloads, 0);
  return [
    statsEvent("github_repo_stats", repo.full_name, day, {
      repo: repo.full_name,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count,
      open_issues: repo.open_issues_count,
      release_downloads: total,
    }),
    ...assets.map((a) =>
      statsEvent("github_release_downloads", `${repo.full_name}:${a.tag}:${a.asset}`, day, { repo: repo.full_name, tag: a.tag, asset: a.asset, downloads: a.downloads }),
    ),
  ];
}
