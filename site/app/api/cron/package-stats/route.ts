import {
  backfillRange,
  type GithubRelease,
  type GithubRepo,
  githubEvents,
  type NpmPoint,
  type NpmRange,
  npmRangeEvents,
  npmSummaryEvent,
  type StatsEvent,
  utcDay,
} from "@/lib/analytics/package-stats";
import { ANALYTICS_MODE } from "@/lib/analytics/config";
import { sendToPostHog, serverCaptureMode } from "@/lib/analytics/server";

/**
 * Daily Vercel Cron (site/vercel.json): public npm download counts and GitHub repository counts,
 * sent to PostHog as events. Every source is public and unauthenticated; the only secret is
 * CRON_SECRET, which Vercel sends as `Authorization: Bearer <CRON_SECRET>`.
 *
 * Each run backfills the last 30 complete UTC days. Event ids are deterministic, so reruns replace
 * rather than add (lib/analytics/package-stats.ts). `?dry=1` returns the events without sending.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PACKAGES = ["@searchsdk/sdk", "@searchsdk/mcp"];
const REPO = "Belweave/searchSDK";
const BACKFILL_DAYS = 30;
const TIMEOUT_MS = 10_000;
const HEADERS = { "user-agent": "searchsdk-site-package-stats", accept: "application/json" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const now = new Date();
  const today = utcDay(now);
  const { start, end } = backfillRange(now, BACKFILL_DAYS);

  const events: StatsEvent[] = [];
  const notes: string[] = [];

  for (const pkg of PACKAGES) {
    const range = await getJson<NpmRange>(`https://api.npmjs.org/downloads/range/${start}:${end}/${pkg}`);
    if (!range.ok) {
      // 404: the package is not published (yet). Anything else is reported and skipped.
      notes.push(`${pkg}: range ${range.status}`);
      continue;
    }
    events.push(...npmRangeEvents(range.body));
    const [week, month] = await Promise.all([
      getJson<NpmPoint>(`https://api.npmjs.org/downloads/point/last-week/${pkg}`),
      getJson<NpmPoint>(`https://api.npmjs.org/downloads/point/last-month/${pkg}`),
    ]);
    if (week.ok && month.ok) events.push(npmSummaryEvent(pkg, today, week.body, month.body));
    else notes.push(`${pkg}: point ${week.status}/${month.status}`);
  }

  const gh = { ...HEADERS, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" };
  const [repo, releases] = await Promise.all([
    getJson<GithubRepo>(`https://api.github.com/repos/${REPO}`, gh),
    getJson<GithubRelease[]>(`https://api.github.com/repos/${REPO}/releases?per_page=100`, gh),
  ]);
  if (repo.ok) events.push(...githubEvents(repo.body, releases.ok ? releases.body : [], today));
  else notes.push(`github: repo ${repo.status}`);
  if (!releases.ok) notes.push(`github: releases ${releases.status}`);

  // The cron sends from any environment it is authorised in (Vercel runs crons on production only).
  const mode = dry || ANALYTICS_MODE === "off" ? "off" : serverCaptureMode() === "debug" ? "debug" : "send";
  const sent = mode === "off" ? false : await sendToPostHog(events, { mode });
  return Response.json(
    { ok: dry || sent || events.length === 0, dry, sent, range: { start, end }, events: dry ? events : events.length, notes },
    { status: dry || sent || events.length === 0 ? 200 : 502 },
  );
}

type Fetched<T> = { ok: true; status: number; body: T } | { ok: false; status: number | "error" };

async function getJson<T>(url: string, headers: Record<string, string> = HEADERS): Promise<Fetched<T>> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, body: (await res.json()) as T };
  } catch {
    return { ok: false, status: "error" };
  }
}
