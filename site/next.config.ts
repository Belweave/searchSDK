import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import { assetsHost, INGEST_PATH, POSTHOG_HOST } from "./lib/analytics/config";

/**
 * Content Security Policy for a prerendered App Router site (no per-request nonces).
 * 'unsafe-inline' for scripts: Next streams the RSC payload as inline scripts, and the theme
 * script runs before paint. No third-party origin and no 'unsafe-eval'. Analytics goes through the
 * first-party /ingest rewrite below, so posthog-js and its lazy-loaded scripts are 'self' too.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  // A second build directory lets the checks build without touching a running dev server.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  // PostHog's API paths end in a slash (/ingest/e/, /ingest/flags/); Next's own trailing-slash
  // redirect would answer them with a 308. The redirect below restores it for every other path.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      // One canonical host: www (once its DNS record exists) answers with a permanent redirect to the apex.
      { source: "/:path*", has: [{ type: "host", value: "www.searchsdk.dev" }], destination: "https://searchsdk.dev/:path*", permanent: true },
      // Next's default trailing-slash redirect, for everything except the analytics proxy.
      { source: `/:path((?!${INGEST_PATH.slice(1)}(?:/|$)).+)/`, destination: "/:path", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // First-party analytics proxy, as PostHog documents for Next.js: assets and remote config
      // from the assets host, everything else to the ingest host. Order matters.
      { source: `${INGEST_PATH}/static/:path*`, destination: `${assetsHost()}/static/:path*` },
      { source: `${INGEST_PATH}/array/:path*`, destination: `${assetsHost()}/array/:path*` },
      { source: `${INGEST_PATH}/:path*`, destination: `${POSTHOG_HOST}/:path*` },
      // The Markdown copy of each docs and provider page sits beside it (lib/markdown.ts).
      { source: "/docs.md", destination: "/md/docs" },
      { source: "/docs/:path(.+)\\.md", destination: "/md/docs/:path" },
      { source: "/providers/:id([a-z0-9-]+)\\.md", destination: "/md/providers/:id" },
    ];
  },
  async headers() {
    // Dev keeps the defaults so hot reload works; production and `npm run check` send the policy.
    if (process.env.NODE_ENV === "development") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withMDX = createMDX();

export default withMDX(config);
