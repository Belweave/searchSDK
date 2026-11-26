import { installManager, outboundTarget } from "./classify";
import { currentPage, track } from "./client";
import type { ClientEvents, CopyMethod } from "./events";

/**
 * Delegated listeners, so components stay free of analytics code. Installed once on `document`
 * from instrumentation-client.ts; each handler is passive and returns quickly.
 *
 * - Code blocks: Fumadocs' copy button and selection copies inside any <pre> fire
 *   `install_command_copied` for a package-manager install line, `code_copied` otherwise.
 * - Links to another origin fire `outbound_click` (hostname only).
 * - `data-track="<event>"` on any element fires that event on click, with `data-track-<prop>`
 *   attributes as properties (kebab-case → snake_case) and `page` added:
 *     <button data-track="open_in_agent" data-track-destination="chatgpt">
 * - The docs search input fires `docs_search` (query length only) once typing settles.
 * - Route views: `provider_viewed` and `benchmarks_viewed` (trackRouteView).
 */

/** Events a `data-track` attribute may name: those whose only properties are strings besides `page`. */
const DATA_EVENTS = new Set<keyof ClientEvents>(["markdown_copied", "open_in_agent", "agent_prompt_copied"]);

let installed = false;

export function installListeners(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const opts = { capture: true, passive: true } as const;
  document.addEventListener("click", onClick, opts);
  document.addEventListener("copy", onCopy, opts);
  document.addEventListener("input", onInput, opts);
}

function onClick(e: MouseEvent) {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  const tagged = target.closest<HTMLElement>("[data-track]");
  if (tagged) {
    const name = tagged.dataset.track as keyof ClientEvents;
    if (DATA_EVENTS.has(name)) track(name, { ...dataProps(tagged), page: currentPage() } as never);
    return;
  }

  // Fumadocs code block: the copy button sits in the <figure>, outside the <pre>.
  const button = target.closest("button");
  const figure = button?.closest("figure.shiki");
  const pre = figure?.querySelector("pre");
  if (button && figure && pre && !pre.contains(button)) {
    copied(pre, pre.textContent ?? "", "button");
    return;
  }

  const link = target.closest<HTMLAnchorElement>("a[href]");
  if (link) outbound(link);
}

function onCopy() {
  const selection = document.getSelection();
  const node = selection?.anchorNode;
  const el = node instanceof Element ? node : node?.parentElement;
  const pre = el?.closest("pre");
  if (pre && selection) copied(pre, selection.toString(), "selection");
}

function copied(pre: HTMLPreElement, text: string, method: CopyMethod) {
  if (!text.trim()) return;
  const page = currentPage();
  const manager = installManager(text);
  if (manager) {
    track("install_command_copied", { page, manager, method });
    return;
  }
  track("code_copied", { page, block_index: Array.from(document.querySelectorAll("pre")).indexOf(pre), method });
}

function outbound(link: HTMLAnchorElement) {
  let url: URL;
  try {
    url = new URL(link.href, location.href);
  } catch {
    return;
  }
  if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return;
  const page = currentPage();
  track("outbound_click", { page, host: url.hostname, target: outboundTarget(url.hostname, page, link.dataset.trackTarget) });
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;

function onInput(e: Event) {
  const input = e.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches('[aria-controls="fd-search-list"], input[type="search"], [data-track-search]')) return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const options = document.querySelectorAll('#fd-search-list [role="option"]');
    trackDocsSearch(input.value, document.getElementById("fd-search-list") ? options.length : null);
  }, 1000);
}

/**
 * Report a settled docs search. Only the query's length is sent, never its text. Call it from a
 * custom search UI, or let the delegated listener above pick up Fumadocs' search input.
 */
export function trackDocsSearch(query: string, resultCount: number | null = null): void {
  const length = query.trim().length;
  if (length) track("docs_search", { page: currentPage(), query_length: length, result_count: resultCount });
}

let lastPath: string | null = null;
let pendingView: ReturnType<typeof setInterval> | undefined;

/**
 * Route-level events for a page view. Called on load and when an App Router navigation starts;
 * the event waits until the address bar shows the new path, so PostHog's $current_url matches it,
 * and is dropped if that navigation never lands (5 s).
 */
export function trackRouteView(url: string): void {
  let path: string;
  try {
    path = new URL(url, location.href).pathname;
  } catch {
    return;
  }
  clearInterval(pendingView);
  if (location.pathname === path) return routeView(path);
  const until = Date.now() + 5000;
  pendingView = setInterval(() => {
    if (location.pathname === path) routeView(path);
    if (location.pathname === path || Date.now() > until) clearInterval(pendingView);
  }, 100);
}

function routeView(path: string) {
  if (path === lastPath) return; // a hash or query change on the same page
  lastPath = path;
  const provider = /^\/providers\/([a-z0-9-]+)\/?$/.exec(path)?.[1];
  if (provider) track("provider_viewed", { page: path, provider });
  else if (path === "/benchmarks" || path === "/benchmarks/") track("benchmarks_viewed", { page: path });
}

function dataProps(el: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (!key.startsWith("track") || key === "track" || key === "trackTarget" || value === undefined) continue;
    const prop = key.slice(5).replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[prop] = value.slice(0, 64);
  }
  return out;
}
