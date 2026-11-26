/**
 * The event catalogue: every custom event name and its properties. Names are stable snake_case;
 * renaming one breaks the insights built on it. site/README.md ("Analytics") documents each.
 * No property ever holds what a visitor typed, an IP address or a full URL with its query.
 */

/** Page path without query or hash, e.g. "/docs/search". */
type Page = { page: string };

export type ClientEvents = {
  /** A package-manager install line copied (button or selection). */
  install_command_copied: Page & { manager: "npm" | "pnpm" | "yarn" | "bun" | "pip" | "other"; method: CopyMethod };
  /** Any other code block copied. `block_index` counts code blocks from 0 in page order. */
  code_copied: Page & { block_index: number; method: CopyMethod };
  /** A page's Markdown copied to the clipboard. */
  markdown_copied: Page;
  /** A page opened in, or sent to, an AI agent or chat. */
  open_in_agent: Page & { destination: string };
  /** The home page's agent setup prompt copied. */
  agent_prompt_copied: Page;
  /** A link to another site. `target` groups the destination; `host` is the hostname only. */
  outbound_click: Page & { target: OutboundTarget; host: string };
  /** Docs search settled (debounced). Only the length of the query, never its text. */
  docs_search: Page & { query_length: number; result_count: number | null };
  /** A provider page shown. */
  provider_viewed: Page & { provider: string };
  /** The benchmarks page shown. */
  benchmarks_viewed: Page;
  /** The 404 page shown. `referrer_host` is the hostname only, null for direct visits. */
  page_not_found: Page & { referrer_host: string | null };
};

export type CopyMethod = "button" | "selection";
export type OutboundTarget = "github" | "npm" | "provider_docs" | "other";

/** Captured on the server, for requests that run no JavaScript. */
export type ServerEvents = {
  /** /llms.txt, /llms-full.txt, a Markdown copy, /sitemap.xml or /robots.txt was fetched. */
  machine_doc_fetched: { resource: MachineResource };
  /** A request to the docs MCP endpoint. Method and tool name only, never arguments. */
  mcp_request: { method: string; tool?: string | null };
  /** Daily npm downloads of one package on one UTC day (cron, backfilled 30 days). */
  npm_downloads: { package: string; day: string; downloads: number };
  /** Totals from npm's point endpoint on the day of the run. */
  npm_downloads_summary: { package: string; day: string; last_week: number; last_month: number };
  /** The repository's public counts on the day of the run. */
  github_repo_stats: { repo: string; day: string; stars: number; forks: number; watchers: number; open_issues: number; release_downloads: number };
  /** Downloads of one release asset, cumulative, on the day of the run. */
  github_release_downloads: { repo: string; day: string; tag: string; asset: string; downloads: number };
};

export type MachineResource = "llms_txt" | "llms_full_txt" | "markdown" | "sitemap" | "robots";
