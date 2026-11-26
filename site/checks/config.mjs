// What the checks enforce. Change the rules here, not in the scripts.

/** Visible-word caps per page, outside code, navigation, header, footer and [data-words="data"]. */
export const PAGE_CAPS = [
  { match: (path) => path === "/", cap: 150, name: "home" },
  { match: (path) => path === "/docs" || path.startsWith("/docs/"), cap: 300, name: "docs page" },
  { match: () => true, cap: 300, name: "page" },
];
// Regions can carry their own cap: <section data-cap="30" data-cap-name="hero">.

/** <title> and meta description lengths (lib/seo.ts guards the same ranges at build time). */
export const TITLE_RANGE = [10, 60];
export const DESCRIPTION_RANGE = [50, 160];

/** Words that sell or hedge instead of saying something. Matched on visible copy, case-insensitive. */
export const BANNED_WORDS = [
  "revolutionary", "revolutionize", "blazing", "lightning-fast", "seamless", "seamlessly", "cutting-edge",
  "game-changing", "game changer", "world-class", "best-in-class", "next-generation", "next-gen", "supercharge",
  "unleash", "effortless", "effortlessly", "powerful", "magical", "simply", "basically", "hopefully", "perhaps",
  "arguably", "very", "really", "just",
  // brand/GUIDELINES.md, Voice: the brand's own list, on top of the site's.
  "unlock", "magic", "ultimate", "robust", "next-level",
];

/**
 * The product name has one spelling, searchSDK (brand/GUIDELINES.md, Voice). Any other match of
 * this pattern in visible text outside code, in a title, description, social tag, alt text or
 * accessible label fails. The package name `searchsdk` appears only as code.
 */
export const NAME_PATTERN = /search[\s_-]?sdk/gi;
export const NAME = "searchSDK";

/** brand/GUIDELINES.md minimum sizes, in CSS pixels of the mark's height. */
export const MARK_MIN_PX = { mark: 16, lockup: 20 };

/** Head tags every page carries, wired from brand/dist through Next's metadata files. */
export const REQUIRED_HEAD = [
  { name: "favicon", test: (n, attr) => n.tagName === "link" && /\bicon\b/.test(attr(n, "rel") ?? "") && /\.ico/.test(attr(n, "href") ?? "") },
  { name: "SVG icon", test: (n, attr) => n.tagName === "link" && attr(n, "rel") === "icon" && attr(n, "type") === "image/svg+xml" },
  { name: "apple touch icon", test: (n, attr) => n.tagName === "link" && attr(n, "rel") === "apple-touch-icon" },
  { name: "web manifest", test: (n, attr) => n.tagName === "link" && attr(n, "rel") === "manifest" },
  { name: "Open Graph image", test: (n, attr) => n.tagName === "meta" && attr(n, "property") === "og:image" },
  { name: "Twitter card image", test: (n, attr) => n.tagName === "meta" && attr(n, "name") === "twitter:image" },
];

/**
 * The visible label every placeholder-data region carries (components/data/data-region.tsx). The
 * data files are placeholders until the first benchmark run is published, so the label says so.
 */
export const SAMPLE_LABEL = { re: /\bresults pending\b/i, says: "Results pending" };

/** A disclaimer said once: at most this many pages may carry each phrase. */
export const ONCE_ONLY = [{ phrase: /provisional/i, pages: 1 }];

/** Every HTML page carries the provider trademark line. */
export const REQUIRED_ON_EVERY_PAGE = [/not affiliated/i, /trademarks of their respective owners/i];

/**
 * Analytics is first party: posthog-js is bundled and talks only to /ingest on this origin, which
 * next.config.ts rewrites to PostHog (lib/analytics). No page names a PostHog host directly, the
 * CSP keeps scripts and connections to 'self', robots.txt disallows the proxy path, and the crawl
 * never requests it (that would reach PostHog).
 */
export const ANALYTICS = { proxyPath: "/ingest/", cspSelfOnly: ["script-src", "connect-src"] };

/** Never in any served body: third-party trackers and analytics hosts, third-party fonts, credentials, email addresses. */
export const BANNED_PATTERNS = [
  { name: "tracker", re: /google-analytics|googletagmanager|plausible\.io|segment\.(com|io)|hotjar|mixpanel|fbq\(/i },
  { name: "analytics host outside the first-party proxy", re: /\b[a-z]{2}(-assets)?\.i\.posthog\.com|\bapp\.posthog\.com/i },
  { name: "third-party font", re: /fonts\.googleapis|fonts\.gstatic|use\.typekit/i },
  { name: "key-like token", re: /\b(sk|pk|tvly|fc|pplx|exa|bsa)[-_][A-Za-z0-9]{20,}/ },
  { name: "bearer credential", re: /Bearer\s+[A-Za-z0-9._-]{20,}/ },
  { name: "email address", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
];

/** Routes that are stubs until they are ported: they must answer 501 and nothing else. */
export const STUBS = [
  { path: "/api/mcp", method: "GET" },
  { path: "/api/mcp", method: "POST" },
  { path: "/api/playground/search", method: "POST" },
];

/** Non-HTML documents that must exist. */
export const REQUIRED_FILES = ["/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt"];

/** Pages that carry a Markdown copy, linked from <head> as rel="alternate" type="text/markdown". */
export const MARKDOWN_PAGES = (path) => path === "/docs" || path.startsWith("/docs/") || /^\/providers\/[a-z0-9-]+$/.test(path);

/** schema.org types each page's JSON-LD must include, beyond the Organization, WebSite and SoftwareSourceCode every page carries. */
export const REQUIRED_JSON_LD = [
  { match: (path) => path === "/docs" || path.startsWith("/docs/"), types: ["TechArticle", "BreadcrumbList"] },
  { match: (path) => path.startsWith("/providers") || path === "/benchmarks", types: ["BreadcrumbList"] },
];
export const BASE_JSON_LD = ["Organization", "WebSite", "SoftwareSourceCode"];
