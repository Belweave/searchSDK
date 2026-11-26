/**
 * PostHog settings for the website. Analytics is a site concern only: the SDK packages carry no
 * analytics and send nothing anywhere except the provider a caller names.
 *
 * The project key is public by design (PostHog calls it the project token; it only writes events).
 * Each value can be overridden with the NEXT_PUBLIC_ variable named beside it. They are read with
 * literal `process.env.NEXT_PUBLIC_*` expressions so Next inlines them into client code.
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_qY5YM4DxKa6iPRXo6yyskxjW24h7wRh6qfCXGHWf4MDq";
/** Ingest host, used by the /ingest rewrites and by server-side capture. */
export const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
/** The PostHog app, for links the toolbar and SDK build back to it. */
export const POSTHOG_UI_HOST = (process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || "https://us.posthog.com").replace(/\/$/, "");
/** First-party path the browser sends events to; next.config.ts rewrites it to PostHog. */
export const INGEST_PATH = "/ingest";

/**
 * `on` sends events, `off` sends nothing, `debug` logs each event (browser console, server log)
 * and sends nothing. Read at build time on the client.
 */
export type AnalyticsMode = "on" | "off" | "debug";
export const ANALYTICS_MODE: AnalyticsMode = parseMode(process.env.NEXT_PUBLIC_ANALYTICS);

/** Hostnames the browser sends from. Anywhere else (localhost, preview URLs) sends nothing. */
export const ANALYTICS_HOSTS = (process.env.NEXT_PUBLIC_ANALYTICS_HOSTS || "searchsdk.dev")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/** PostHog's static assets host for an ingest host: https://us.i.posthog.com → https://us-assets.i.posthog.com. */
export function assetsHost(host: string = POSTHOG_HOST): string {
  return host.replace(/^https:\/\/([a-z]+)\.i\.posthog\.com$/, "https://$1-assets.i.posthog.com");
}

function parseMode(value: string | undefined): AnalyticsMode {
  return value === "off" || value === "debug" ? value : "on";
}
