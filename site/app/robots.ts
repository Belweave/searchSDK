import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Search engines, answer engines and AI crawlers named in their operators' documentation. Every one
 * is allowed, the same as `*`; naming them keeps the intent explicit. A named group replaces `*`
 * for that crawler, so each repeats the one rule: route handlers under /api/ are not pages, and
 * /ingest/ is the first-party analytics proxy (lib/analytics/client.ts), not content.
 * Brave Search and Tavily crawl without a user agent of their own and follow the Googlebot rules.
 */
const CRAWLERS = [
  // Search engines
  "Googlebot",
  "Bingbot",
  "Applebot",
  "DuckDuckBot",
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google and Apple AI use controls
  "Google-Extended",
  "Applebot-Extended",
  // Exa, Common Crawl, DuckDuckGo's assistant
  "ExaSearchBot",
  "CCBot",
  "DuckAssistBot",
];

const DISALLOW = ["/api/", "/ingest/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: CRAWLERS, allow: "/", disallow: DISALLOW },
      { userAgent: "*", allow: "/", disallow: DISALLOW },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
