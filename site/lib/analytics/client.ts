import type { CaptureResult, PostHogConfig } from "posthog-js";
import { ANALYTICS_HOSTS, ANALYTICS_MODE, INGEST_PATH, POSTHOG_KEY, POSTHOG_UI_HOST } from "./config";
import type { ClientEvents } from "./events";

/**
 * Browser analytics with posthog-js, started from instrumentation-client.ts.
 *
 * - Cookieless (`cookieless_mode: "always"`): no cookie, localStorage or sessionStorage identity;
 *   PostHog derives a daily, privacy-preserving visitor hash on its servers. No consent banner.
 * - Do Not Track and Global Privacy Control: posthog-js is never loaded (and `respect_dnt` backs it up).
 * - Pageviews and pageleaves for App Router navigations (History API), web vitals, click autocapture.
 * - No session replay, no surveys, no input values, no copied text, no query strings in URLs.
 * - Events go to /ingest on this site (next.config.ts rewrites it to PostHog), so the page talks only
 *   to its own origin and the CSP stays `connect-src 'self'`.
 * - posthog-js is a separate chunk loaded when the browser is idle, after the page is interactive,
 *   so it is not in the critical path; events tracked before it loads are queued.
 * - Only on the production hostnames (NEXT_PUBLIC_ANALYTICS_HOSTS). NEXT_PUBLIC_ANALYTICS=debug logs
 *   events to the console instead; =off disables everything.
 */

/** posthog-js config dates (see `defaults` in posthog-js); bump deliberately after reading the changelog. */
const POSTHOG_DEFAULTS = "2026-08-30";

type Mode = "send" | "debug" | "off";
let mode: Mode | null = null;
let client: { capture(event: string, properties?: Record<string, unknown>): unknown } | null = null;
let loading = false;
const queue: Array<[string, Record<string, unknown>]> = [];

function clientMode(): Mode {
  if (mode) return mode;
  if (typeof window === "undefined") return "off";
  if (ANALYTICS_MODE === "debug") return (mode = "debug");
  if (ANALYTICS_MODE === "off") return (mode = "off");
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const optedOut = nav.globalPrivacyControl === true || nav.doNotTrack === "1" || nav.msDoNotTrack === "1";
  return (mode = !optedOut && ANALYTICS_HOSTS.includes(location.hostname.toLowerCase()) ? "send" : "off");
}

/**
 * Capture a custom event (lib/analytics/events.ts). Safe anywhere on the client: a no-op on the
 * server, before consent-equivalent checks pass, or off the production hosts.
 *
 *   track("open_in_agent", { page: currentPage(), destination: "chatgpt" });
 */
export function track<E extends keyof ClientEvents>(event: E, props: ClientEvents[E]): void {
  const m = clientMode();
  if (m === "off") return;
  if (m === "debug") {
    console.info("[analytics]", event, props);
    return;
  }
  if (client) client.capture(event, props);
  else queue.push([event, props]);
}

/** The current page path, without query or hash. */
export function currentPage(): string {
  return typeof location === "undefined" ? "" : location.pathname;
}

/** Load posthog-js once the browser is idle. Called once, from instrumentation-client.ts. */
export function startAnalytics(): void {
  const m = clientMode();
  if (m === "debug") console.info("[analytics] debug mode: events are logged, not sent");
  if (m !== "send" || loading) return;
  loading = true;
  const start = () => void load().catch(() => {});
  if (document.readyState === "complete") idle(start);
  else window.addEventListener("load", () => idle(start), { once: true });
}

function idle(fn: () => void) {
  if ("requestIdleCallback" in window) window.requestIdleCallback(fn, { timeout: 4000 });
  else setTimeout(fn, 1500);
}

async function load() {
  const { default: posthog } = await import("posthog-js");
  posthog.init(POSTHOG_KEY, { ...POSTHOG_CONFIG, loaded: (ph) => {
    client = ph;
    for (const [event, props] of queue.splice(0)) ph.capture(event, props);
  } });
}

export const POSTHOG_CONFIG: Partial<PostHogConfig> = {
  api_host: INGEST_PATH,
  ui_host: POSTHOG_UI_HOST,
  defaults: POSTHOG_DEFAULTS,
  cookieless_mode: "always",
  respect_dnt: true,
  person_profiles: "identified_only",
  capture_pageview: "history_change",
  capture_pageleave: true,
  capture_performance: { web_vitals: true, network_timing: false },
  autocapture: {
    // Clicks and form submits; never `change`, so no field is recorded as it is edited.
    dom_event_allowlist: ["click", "submit"],
    capture_copied_text: false,
    // An empty list disables input value capture entirely.
    capture_value_css_selector_allowlist: [],
  },
  disable_session_recording: true,
  disable_surveys: true,
  // No feature flags are used. This also stops /flags requests, which carry the initial URL in
  // person properties outside before_send's reach.
  advanced_disable_flags: true,
  before_send: stripQueries,
};

/**
 * Keep every URL to origin and path: a query string or hash can carry what a visitor typed.
 * Walks the event's properties, `$set` and `$set_once` (`$initial_current_url`) and the nested
 * web-vitals entries (`navigationURL`). Campaign parameters (utm_*) are already extracted.
 */
export function stripQueries(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const scrub = (obj: Record<string, unknown> | undefined, depth: number) => {
    if (!obj || depth > 3) return;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        if (/^https?:\/\/[^\s]*[?#]/.test(value)) obj[key] = stripUrl(value);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        scrub(value as Record<string, unknown>, depth + 1);
      }
    }
  };
  scrub(event.properties, 0);
  scrub(event.$set, 0);
  scrub(event.$set_once, 0);
  return event;
}

function stripUrl(value: string): string {
  try {
    const u = new URL(value);
    return `${u.origin}${u.pathname}`;
  } catch {
    return value;
  }
}
