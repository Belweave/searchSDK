// Unit tests for the pure analytics modules: user-agent families, click and path classifiers, the
// package-stats → PostHog event mapping and its deterministic ids. Node runs the TypeScript sources
// directly (type stripping); no network.
//   node --test checks/analytics.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { installManager, machineResource, outboundTarget } from "../lib/analytics/classify.ts";
import {
  backfillRange,
  githubEvents,
  npmRangeEvents,
  npmSummaryEvent,
  STATS_DISTINCT_ID,
  uuidV5,
} from "../lib/analytics/package-stats.ts";
import { classifyUserAgent } from "../lib/analytics/ua.ts";

const UA = {
  GPTBot: ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot", "GPTBot", "ai_crawler"],
  "OAI-SearchBot": ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot", "OAI-SearchBot", "ai_search"],
  "ChatGPT-User": ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot", "ChatGPT-User", "ai_agent"],
  ClaudeBot: ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)", "ClaudeBot", "ai_crawler"],
  "Claude-User": ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0)", "Claude-User", "ai_agent"],
  "Claude-SearchBot": ["Mozilla/5.0 (compatible; Claude-SearchBot/1.0)", "Claude-SearchBot", "ai_search"],
  PerplexityBot: ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)", "PerplexityBot", "ai_search"],
  "Perplexity-User": ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)", "Perplexity-User", "ai_agent"],
  ExaSearchBot: ["Mozilla/5.0 (compatible; ExaSearchBot/1.0)", "ExaSearchBot", "ai_search"],
  CCBot: ["CCBot/2.0 (https://commoncrawl.org/faq/)", "CCBot", "ai_crawler"],
  Googlebot: ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/131.0.6778.204 Safari/537.36", "Googlebot", "search_crawler"],
  Bingbot: ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36", "Bingbot", "search_crawler"],
  Applebot: ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)", "Applebot", "search_crawler"],
  DuckAssistBot: ["DuckAssistBot/1.2; (+http://duckduckgo.com/duckassistbot.html)", "DuckAssistBot", "ai_search"],
  Slackbot: ["Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)", "Slackbot", "link_preview"],
  UptimeRobot: ["Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)", "other-bot", "bot"],
  curl: ["curl/8.7.1", "curl", "tool"],
  python: ["python-requests/2.32.3", "Python", "tool"],
  node: ["node", "Node", "tool"],
  undici: ["undici", "Node", "tool"],
  headless: ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36", "HeadlessChrome", "headless"],
  Chrome: ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", "Chrome", "browser"],
  Edge: ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0", "Edge", "browser"],
  Firefox: ["Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0", "Firefox", "browser"],
  Safari: ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1", "Safari", "browser"],
  "iOS Chrome": ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1", "Chrome", "browser"],
};

test("user agents map to their family and kind", () => {
  for (const [name, [ua, family, kind]] of Object.entries(UA)) {
    assert.deepEqual(classifyUserAgent(ua), { ua_family: family, ua_kind: kind }, name);
  }
});

test("missing and unrecognised user agents", () => {
  assert.deepEqual(classifyUserAgent(""), { ua_family: "none", ua_kind: "unknown" });
  assert.deepEqual(classifyUserAgent(null), { ua_family: "none", ua_kind: "unknown" });
  assert.deepEqual(classifyUserAgent("Mozilla/5.0 (Something new)"), { ua_family: "other", ua_kind: "browser" });
  assert.deepEqual(classifyUserAgent("my-script/1.0"), { ua_family: "other", ua_kind: "tool" });
});

test("install lines and outbound targets", () => {
  assert.equal(installManager("npm install @searchsdk/sdk"), "npm");
  assert.equal(installManager("$ pnpm add @searchsdk/sdk\n"), "pnpm");
  assert.equal(installManager("\n  yarn add @searchsdk/sdk"), "yarn");
  assert.equal(installManager("bun i @searchsdk/sdk"), "bun");
  assert.equal(installManager("pip install -e sdk/python"), "pip");
  assert.equal(installManager("uv pip install -e ."), "pip");
  assert.equal(installManager('import { search } from "@searchsdk/sdk";'), null);
  assert.equal(installManager("npm run build"), null);

  assert.equal(outboundTarget("github.com", "/"), "github");
  assert.equal(outboundTarget("www.npmjs.com", "/docs"), "npm");
  assert.equal(outboundTarget("docs.exa.ai", "/providers/exa"), "provider_docs");
  assert.equal(outboundTarget("docs.exa.ai", "/docs/providers"), "provider_docs");
  assert.equal(outboundTarget("example.com", "/docs/faq"), "other");
  assert.equal(outboundTarget("example.com", "/docs/faq", "provider_docs"), "provider_docs");
});

test("machine-readable documents by path", () => {
  assert.equal(machineResource("/llms.txt"), "llms_txt");
  assert.equal(machineResource("/llms-full.txt"), "llms_full_txt");
  assert.equal(machineResource("/sitemap.xml"), "sitemap");
  assert.equal(machineResource("/robots.txt"), "robots");
  assert.equal(machineResource("/docs.md"), "markdown");
  assert.equal(machineResource("/docs/search.md"), "markdown");
  assert.equal(machineResource("/providers/exa.md"), "markdown");
  assert.equal(machineResource("/docs/search"), null);
  assert.equal(machineResource("/ingest/e/"), null);
});

test("uuidV5 matches RFC 9562 and is deterministic", () => {
  // RFC 9562 appendix A.4: name "www.example.com" in the DNS namespace.
  assert.equal(uuidV5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"), "2ed6657d-e927-568b-95e1-2665a8aea6a2");
  const a = uuidV5("npm_downloads:@searchsdk/sdk:2026-11-01");
  assert.equal(a, uuidV5("npm_downloads:@searchsdk/sdk:2026-11-01"));
  assert.notEqual(a, uuidV5("npm_downloads:@searchsdk/sdk:2026-11-02"));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("backfill covers the last 30 complete UTC days", () => {
  assert.deepEqual(backfillRange(new Date("2026-11-25T03:00:00Z"), 30), { start: "2026-10-26", end: "2026-11-24" });
  assert.deepEqual(backfillRange(new Date("2026-03-01T23:59:59Z"), 2), { start: "2026-02-27", end: "2026-02-28" });
});

test("npm range → one npm_downloads event per package-day, stable across reruns", () => {
  const range = {
    package: "@searchsdk/sdk",
    start: "2026-11-23",
    end: "2026-11-24",
    downloads: [
      { day: "2026-11-23", downloads: 12 },
      { day: "2026-11-24", downloads: 30 },
    ],
  };
  const events = npmRangeEvents(range);
  assert.equal(events.length, 2);
  const [first] = events;
  assert.equal(first.event, "npm_downloads");
  assert.equal(first.distinct_id, STATS_DISTINCT_ID);
  assert.equal(first.timestamp, "2026-11-23T00:00:00.000Z");
  assert.deepEqual(
    { package: first.properties.package, day: first.properties.day, downloads: first.properties.downloads, person: first.properties.$process_person_profile },
    { package: "@searchsdk/sdk", day: "2026-11-23", downloads: 12, person: false },
  );
  // A rerun, with npm's figure revised, keeps the id and timestamp so PostHog replaces the event.
  const rerun = npmRangeEvents({ ...range, downloads: [{ day: "2026-11-23", downloads: 13 }] });
  assert.equal(rerun[0].uuid, first.uuid);
  assert.equal(rerun[0].timestamp, first.timestamp);
  // Another package on the same day gets another id.
  assert.notEqual(npmRangeEvents({ ...range, package: "@searchsdk/mcp" })[0].uuid, first.uuid);
  assert.throws(() => npmRangeEvents({ ...range, downloads: [{ day: "23/11/2026", downloads: 1 }] }));
});

test("npm point totals → npm_downloads_summary", () => {
  const e = npmSummaryEvent("@searchsdk/sdk", "2026-11-25", { downloads: 70 }, { downloads: 300 });
  assert.equal(e.event, "npm_downloads_summary");
  assert.equal(e.properties.last_week, 70);
  assert.equal(e.properties.last_month, 300);
  assert.equal(e.uuid, npmSummaryEvent("@searchsdk/sdk", "2026-11-25", { downloads: 71 }, { downloads: 301 }).uuid);
});

test("GitHub repo and releases → github_repo_stats and github_release_downloads", () => {
  const repo = { full_name: "Belweave/searchSDK", stargazers_count: 40, forks_count: 3, subscribers_count: 5, open_issues_count: 2 };
  const releases = [
    { tag_name: "v0.1.0", assets: [{ name: "sdk.tgz", download_count: 7 }, { name: "sdk.zip", download_count: 2 }] },
    { tag_name: "v0.2.0-draft", draft: true, assets: [{ name: "x.tgz", download_count: 100 }] },
  ];
  const events = githubEvents(repo, releases, "2026-11-25");
  assert.deepEqual(events.map((e) => e.event), ["github_repo_stats", "github_release_downloads", "github_release_downloads"]);
  const stats = events[0].properties;
  assert.deepEqual(
    { stars: stats.stars, forks: stats.forks, watchers: stats.watchers, open_issues: stats.open_issues, release_downloads: stats.release_downloads },
    { stars: 40, forks: 3, watchers: 5, open_issues: 2, release_downloads: 9 },
  );
  assert.equal(events[1].properties.asset, "sdk.tgz");
  assert.equal(new Set(events.map((e) => e.uuid)).size, 3);
  assert.equal(githubEvents(repo, [], "2026-11-25").length, 1);
  assert.equal(githubEvents({ ...repo, stargazers_count: 41 }, [], "2026-11-25")[0].uuid, events[0].uuid);
});
