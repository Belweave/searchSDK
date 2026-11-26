/**
 * User-agent families for server-side capture. Only the family and its kind are sent, never the
 * user-agent string itself. Pure and import-free, so `checks/analytics.test.mjs` runs it in Node.
 *
 * Kinds:
 * - ai_crawler: collects pages for model training or a general AI corpus
 * - ai_search: indexes pages for an answer engine
 * - ai_agent: fetches a page because a person asked an assistant or agent to
 * - search_crawler: a search engine's crawler
 * - link_preview: unfurls a link for a chat or social app
 * - bot: any other self-declared bot, crawler or spider
 * - tool: an HTTP library or command-line client (curl, fetch in Node, Python requests …)
 * - headless: a headless browser
 * - browser: a person's browser
 * - unknown: no user agent
 */
export type UaKind =
  | "ai_crawler"
  | "ai_search"
  | "ai_agent"
  | "search_crawler"
  | "link_preview"
  | "bot"
  | "tool"
  | "headless"
  | "browser"
  | "unknown";

export type UaClass = { ua_family: string; ua_kind: UaKind };

/** First match wins: specific tokens before the generic ones they contain (Googlebot says "Chrome"). */
const RULES: ReadonlyArray<readonly [RegExp, string, UaKind]> = [
  // OpenAI
  [/OAI-SearchBot/i, "OAI-SearchBot", "ai_search"],
  [/ChatGPT-User/i, "ChatGPT-User", "ai_agent"],
  [/ChatGPT-Agent|ChatGPT Agent/i, "ChatGPT-Agent", "ai_agent"],
  [/GPTBot/i, "GPTBot", "ai_crawler"],
  // Anthropic
  [/Claude-SearchBot/i, "Claude-SearchBot", "ai_search"],
  [/Claude-User/i, "Claude-User", "ai_agent"],
  [/claude-code/i, "Claude-Code", "ai_agent"],
  [/ClaudeBot/i, "ClaudeBot", "ai_crawler"],
  [/anthropic-ai/i, "anthropic-ai", "ai_crawler"],
  // Perplexity
  [/Perplexity-User/i, "Perplexity-User", "ai_agent"],
  [/PerplexityBot/i, "PerplexityBot", "ai_search"],
  // Other answer engines and assistants
  [/ExaSearchBot|ExaBot/i, "ExaSearchBot", "ai_search"],
  [/DuckAssistBot/i, "DuckAssistBot", "ai_search"],
  [/YouBot/i, "YouBot", "ai_search"],
  [/PhindBot/i, "PhindBot", "ai_search"],
  [/MistralAI-User/i, "MistralAI-User", "ai_agent"],
  [/Google-Agent|Gemini-Deep-Research/i, "Google-Agent", "ai_agent"],
  [/meta-externalfetcher/i, "meta-externalfetcher", "ai_agent"],
  [/Devin|Cursor\//i, "Coding-Agent", "ai_agent"],
  // AI corpus crawlers
  [/meta-externalagent/i, "meta-externalagent", "ai_crawler"],
  [/CCBot/i, "CCBot", "ai_crawler"],
  [/Bytespider/i, "Bytespider", "ai_crawler"],
  [/Amazonbot/i, "Amazonbot", "ai_crawler"],
  [/cohere-ai|cohere-training-data-crawler/i, "cohere-ai", "ai_crawler"],
  [/AI2Bot/i, "AI2Bot", "ai_crawler"],
  [/Diffbot/i, "Diffbot", "ai_crawler"],
  [/Timpibot/i, "Timpibot", "ai_crawler"],
  [/GoogleOther/i, "GoogleOther", "ai_crawler"],
  // Search engines
  [/Googlebot|Google-InspectionTool|AdsBot-Google|Storebot-Google/i, "Googlebot", "search_crawler"],
  [/bingbot|BingPreview|msnbot/i, "Bingbot", "search_crawler"],
  [/Applebot/i, "Applebot", "search_crawler"],
  [/DuckDuckBot/i, "DuckDuckBot", "search_crawler"],
  [/YandexBot|YandexRenderResourcesBot/i, "YandexBot", "search_crawler"],
  [/Baiduspider/i, "Baiduspider", "search_crawler"],
  [/Yahoo! Slurp/i, "Slurp", "search_crawler"],
  [/PetalBot/i, "PetalBot", "search_crawler"],
  [/SeznamBot/i, "SeznamBot", "search_crawler"],
  // Link previews
  [/Slackbot|Slack-ImgProxy/i, "Slackbot", "link_preview"],
  [/Twitterbot/i, "Twitterbot", "link_preview"],
  [/facebookexternalhit|facebookcatalog/i, "facebookexternalhit", "link_preview"],
  [/Discordbot/i, "Discordbot", "link_preview"],
  [/LinkedInBot/i, "LinkedInBot", "link_preview"],
  [/TelegramBot/i, "TelegramBot", "link_preview"],
  [/WhatsApp/i, "WhatsApp", "link_preview"],
  // Headless browsers before real ones: they say Chrome too.
  [/HeadlessChrome|PhantomJS|Puppeteer|Playwright/i, "HeadlessChrome", "headless"],
  // Any other self-declared bot
  [/bot\b|bot\/|crawler|spider|crawl|scraper|monitor/i, "other-bot", "bot"],
  // HTTP clients and tools
  [/^curl\//i, "curl", "tool"],
  [/^Wget/i, "Wget", "tool"],
  [/python-requests|python-httpx|python-urllib|aiohttp|Python\//i, "Python", "tool"],
  [/node-fetch|undici|axios|^node$|Node\.js/i, "Node", "tool"],
  [/^Deno\//i, "Deno", "tool"],
  [/^Bun\//i, "Bun", "tool"],
  [/Go-http-client/i, "Go", "tool"],
  [/okhttp|Java\/|Apache-HttpClient/i, "Java", "tool"],
  [/PostmanRuntime|insomnia|HTTPie/i, "API-client", "tool"],
  // Browsers: Edge and Opera say Chrome; Chrome says Safari.
  [/Edg(e|A|iOS)?\//, "Edge", "browser"],
  [/OPR\/|Opera/, "Opera", "browser"],
  [/Firefox\/|FxiOS\//, "Firefox", "browser"],
  [/Chrome\/|CriOS\/|Chromium\//, "Chrome", "browser"],
  [/Safari\//, "Safari", "browser"],
];

export function classifyUserAgent(ua: string | null | undefined): UaClass {
  const value = (ua ?? "").trim();
  if (!value) return { ua_family: "none", ua_kind: "unknown" };
  for (const [re, family, kind] of RULES) if (re.test(value)) return { ua_family: family, ua_kind: kind };
  return { ua_family: "other", ua_kind: /^Mozilla\//.test(value) ? "browser" : "tool" };
}

/** True for every kind that is not a person's browser. */
export function isAutomated(kind: UaKind): boolean {
  return kind !== "browser";
}
