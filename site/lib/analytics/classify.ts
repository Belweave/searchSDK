import type { ClientEvents, MachineResource, OutboundTarget } from "./events";

/**
 * Pure classifiers for the delegated listeners (lib/analytics/listeners.ts) and proxy.ts. Import-free apart from
 * types, so `checks/analytics.test.mjs` runs them in Node.
 */

export type InstallManager = ClientEvents["install_command_copied"]["manager"];

/** Install lines: "npm install x", "pnpm add x", "pip install x", optionally after a "$ " prompt. */
export function installManager(text: string): InstallManager | null {
  const line = text.split("\n").map((l) => l.trim().replace(/^\$\s+/, "")).find(Boolean) ?? "";
  const m = /^(npm|pnpm|yarn|bun)\s+(i|install|add)\b/.exec(line);
  if (m) return m[1] as "npm" | "pnpm" | "yarn" | "bun";
  if (/^(pip3?|uv pip|uv)\s+(install|add)\b|^poetry\s+add\b/.test(line)) return "pip";
  if (/^(deno|npx jsr)\s+(add|install)\b/.test(line)) return "other";
  return null;
}

export function outboundTarget(host: string, page: string, hint?: string | null): OutboundTarget {
  if (hint === "github" || hint === "npm" || hint === "provider_docs") return hint;
  if (host === "github.com" || host.endsWith(".github.com") || host === "raw.githubusercontent.com") return "github";
  if (host === "npmjs.com" || host.endsWith(".npmjs.com") || host === "npm.im") return "npm";
  // Provider pages and the providers docs page link out to each provider's own documentation.
  if (page.startsWith("/providers") || page === "/docs/providers") return "provider_docs";
  return "other";
}

/** The machine-readable documents proxy.ts counts, by request path. */
export function machineResource(pathname: string): MachineResource | null {
  if (pathname === "/llms.txt") return "llms_txt";
  if (pathname === "/llms-full.txt") return "llms_full_txt";
  if (pathname === "/sitemap.xml") return "sitemap";
  if (pathname === "/robots.txt") return "robots";
  if (pathname === "/docs.md" || /^\/docs\/.+\.md$/.test(pathname) || /^\/providers\/[a-z0-9-]+\.md$/.test(pathname)) return "markdown";
  return null;
}
