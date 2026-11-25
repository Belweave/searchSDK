import { execFileSync } from "node:child_process";

const cache = new Map<string, string | undefined>();

/**
 * When the files behind a page last changed: the date of the latest commit touching any of them,
 * as an ISO string. Paths are relative to site/ (the build's working directory) and literal (no globbing, so `[id]` is a folder name). Undefined when
 * there is no Git history (a source export or a shallow clone without those commits), so the
 * sitemap leaves lastmod out rather than guess a date.
 */
export function lastModified(paths: readonly string[]): string | undefined {
  const key = paths.join("\0");
  if (cache.has(key)) return cache.get(key);
  let date: string | undefined;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...paths.map((p) => `:(literal)${p}`)], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    date = out && !Number.isNaN(Date.parse(out)) ? new Date(out).toISOString() : undefined;
  } catch {
    date = undefined;
  }
  cache.set(key, date);
  return date;
}
