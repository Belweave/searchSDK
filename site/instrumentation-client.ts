// Runs in the browser after the HTML loads and before hydration (Next.js instrumentation-client).
// Kept light: it installs passive listeners and schedules posthog-js for when the browser is idle.
import { startAnalytics } from "@/lib/analytics/client";
import { installListeners, trackRouteView } from "@/lib/analytics/listeners";

try {
  installListeners();
  trackRouteView(location.href);
  startAnalytics();
} catch {
  // Analytics must never break the page.
}

export function onRouterTransitionStart(url: string) {
  trackRouteView(url);
}
