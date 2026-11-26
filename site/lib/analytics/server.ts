import { after } from "next/server";
import { ANALYTICS_MODE, POSTHOG_HOST, POSTHOG_KEY } from "./config";
import type { ServerEvents } from "./events";
import { classifyUserAgent } from "./ua";

/**
 * Server-side capture through PostHog's capture API (POST {host}/batch/), for traffic that runs no
 * JavaScript: crawlers and agents fetching llms.txt, Markdown copies, the sitemap and robots.txt,
 * and requests to the MCP endpoint.
 *
 * Every event is anonymous: a random distinct_id per request and `$process_person_profile: false`,
 * so no person profile is created. Sent: the user-agent family, the path, the referrer's hostname
 * and the visitor's country when the platform supplies it. Never sent: IP addresses (the request to
 * PostHog comes from this server, and GeoIP is disabled), user-agent strings, query strings,
 * request bodies or tool arguments.
 *
 * Sending happens after the response (Next's `after()`, or the caller's `waitUntil`), so capture
 * never delays a response, and a failure is swallowed.
 *
 * Off unless running on Vercel production, or ANALYTICS_SERVER_SEND=1. NEXT_PUBLIC_ANALYTICS=debug
 * logs each event instead of sending it; =off disables capture.
 */

export const SERVER_LIB = "searchsdk-site-server";
const TIMEOUT_MS = 3000;

export type CaptureEvent = {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp?: string;
  uuid?: string;
};

export type ServerCaptureMode = "send" | "debug" | "off";

export function serverCaptureMode(): ServerCaptureMode {
  if (ANALYTICS_MODE === "debug" || process.env.ANALYTICS_DEBUG === "1") return "debug";
  if (ANALYTICS_MODE === "off") return "off";
  return process.env.VERCEL_ENV === "production" || process.env.ANALYTICS_SERVER_SEND === "1" ? "send" : "off";
}

/** POST events to PostHog's batch endpoint. Resolves to whether PostHog accepted them; never throws. */
export async function sendToPostHog(events: CaptureEvent[], { mode = serverCaptureMode() }: { mode?: ServerCaptureMode } = {}): Promise<boolean> {
  if (!events.length || mode === "off") return false;
  if (mode === "debug") {
    for (const e of events) console.log(`[analytics] ${e.event} ${JSON.stringify(e.properties)}`);
    return true;
  }
  try {
    const res = await fetch(`${POSTHOG_HOST}/batch/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: POSTHOG_KEY, batch: events.map((e) => ({ ...e, type: "capture" })), sent_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The properties every request-scoped server event carries. */
export function requestProperties(request: Request): Record<string, unknown> {
  const url = new URL(request.url);
  const { ua_family, ua_kind } = classifyUserAgent(request.headers.get("user-agent"));
  const country = request.headers.get("x-vercel-ip-country");
  return {
    path: url.pathname,
    method: request.method,
    ua_family,
    ua_kind,
    referrer_host: referrerHost(request.headers.get("referer")),
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    $host: url.host,
    $pathname: url.pathname,
    $process_person_profile: false,
    $geoip_disable: true,
    $lib: SERVER_LIB,
  };
}

/**
 * Capture one anonymous event about this request after the response is sent. For route handlers
 * and Proxy; pass `waitUntil` (Proxy's `event.waitUntil`) where `after()` is not wanted.
 *
 *   captureServer("mcp_request", { method: "tools/call", tool: "search_docs" }, request);
 */
export function captureServer<E extends keyof ServerEvents>(
  event: E,
  props: ServerEvents[E],
  request: Request,
  { waitUntil }: { waitUntil?: (promise: Promise<unknown>) => void } = {},
): void {
  const mode = serverCaptureMode();
  if (mode === "off") return;
  const payload: CaptureEvent = {
    event,
    distinct_id: crypto.randomUUID(),
    properties: { ...requestProperties(request), ...props },
    timestamp: new Date().toISOString(),
  };
  const send = () => sendToPostHog([payload], { mode });
  if (waitUntil) {
    waitUntil(send());
    return;
  }
  try {
    after(send);
  } catch {
    // Outside a request scope (a script or test): send without blocking the caller.
    void send();
  }
}

function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname || null;
  } catch {
    return null;
  }
}
