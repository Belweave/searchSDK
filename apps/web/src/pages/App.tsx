import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { DitherFooter, DitherEmpty, DitherSkeleton, DitherMotionController } from "../components/DitherKit";
import { Playground } from "../Playground.js";
import { Providers } from "../Providers.js";
import { Home } from "./Home.js";
import { WorkspaceBoundary } from "./WorkspaceBoundary.js";
import { Legal } from "./Legal.js";
import { legalPages } from "../legal-content.ts";

type Theme = "light" | "dark" | "system";
const routes = [["/docs", "Docs"], ["/providers", "Providers"], ["/playground", "Playground"], ["/benchmarks", "Benchmarks"]] as const;
// Independent workspaces can join the shared checkout without breaking its dev server.
const workspaces = import.meta.glob<Record<string, ComponentType<{ path?: string }>>>(["../docs/DocsWorkspace.tsx", "../Benchmarks.tsx"]);
function workspace(path: string, name: string, title: string) {
  return lazy<ComponentType<{ path?: string }>>(async () => {
    const load = workspaces[path];
    if (!load) return { default: () => <PendingPage title={title} /> };
    const module = await load();
    return { default: module[name] ?? module.default };
  });
}
const DocsWorkspace = workspace("../docs/DocsWorkspace.tsx", "DocsWorkspace", "Documentation");
const Benchmarks = workspace("../Benchmarks.tsx", "Benchmarks", "Benchmarks");
function Brand() {
  return <a className="brand" href="/" aria-label="searchSDK home"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" aria-hidden="true"><path d="M3 3h5v5H3zm7 0h5v5h-5zm7 0h4v4h-4zM3 10h5v5H3zm7 0h5v5h-5zM3 17h4v4H3zm7 0h5v5h-5zm7-7h4v5h-4zm0 7h5v5h-5z" fill="currentColor" /></svg><span>searchSDK<span className="brand-period">.</span></span></a>;
}
function readTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try { const stored = localStorage.getItem("searchsdk-theme"); if (stored === "light" || stored === "dark" || stored === "system") return stored; } catch { /* Storage can be unavailable. */ }
  return "system";
}
function PendingPage({ title }: { title: string }) {
  return <section className="route-page pending-page"><h1>{title} could not load.</h1><p>Reload the page to try again.</p><a className="text-link" href="/docs">Open documentation</a></section>;
}
function PlaygroundPage() {
  return <section className="route-page playground-page"><div className="page-heading"><h1>Your query. Real results.</h1><p>Live server-side search. Your keys. Every attempt, explained.</p></div><Playground /></section>;
}
// Keep appearance updates outside App so a saved preference or live OS change
// cannot rerender a still-dehydrated lazy workspace's Suspense boundary.
function ThemeControl() {
  // Match the static footer on the first hydration render. theme-init.js owns
  // the document's first paint; do not overwrite its saved appearance below
  // until both the stored selection and current OS preference are available.
  const [theme, setTheme] = useState<Theme>("system");
  const [appearanceReady, setAppearanceReady] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const dark = theme === "dark" || (theme === "system" && systemDark);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const changed = () => setSystemDark(media.matches);
    setTheme(readTheme());
    changed();
    setAppearanceReady(true);
    media.addEventListener("change", changed);
    const storage = (event: StorageEvent) => { if (event.key === "searchsdk-theme" || event.key === null) setTheme(readTheme()); };
    window.addEventListener("storage", storage);
    return () => { media.removeEventListener("change", changed); window.removeEventListener("storage", storage); };
  }, []);
  useEffect(() => {
    if (!appearanceReady) return;
    document.documentElement.classList.toggle("dark", dark); document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b0c0f" : "#ffffff");
    try { localStorage.setItem("searchsdk-theme", theme); } catch { /* Theme still works without persistence. */ }
  }, [appearanceReady, dark, theme]);
  return <div className="theme-control"><svg className="theme-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">{theme === "system" ? <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></> : theme === "dark" ? <path d="M20.5 13.5A9 9 0 0 1 10.5 3a9 9 0 1 0 10 10.5Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}</svg><select aria-label="Color theme" disabled={!appearanceReady} value={theme} onChange={(event) => setTheme(event.target.value as Theme)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><svg className="theme-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg></div>;
}
export function App({ path: suppliedPath, staticWorkspaces }: {
  path?: string;
  staticWorkspaces?: { docs: ComponentType<{ path?: string }>; benchmarks: ComponentType };
} = {}) {
  const Documentation = staticWorkspaces?.docs ?? DocsWorkspace;
  const BenchmarkPage = staticWorkspaces?.benchmarks ?? Benchmarks;
  const path = (suppliedPath ?? (typeof window === "undefined" ? "/" : window.location.pathname)).replace(/\/+$/, "") || "/";
  const docsRoute = path === "/docs" || path.startsWith("/docs/");
  useEffect(() => {
    // DocsWorkspace owns article and documentation-not-found titles.
    if (!docsRoute) {
      const label = routes.find(([route]) => route === path)?.[1] ?? legalPages.find(page => page.path === path)?.title;
      document.title = path === "/" ? "searchSDK · Web search for TypeScript apps."
        : path === "/benchmarks" ? "Search provider benchmarks · searchSDK"
        : label ? `${label} · searchSDK` : "Page not found · searchSDK";
    }
    const shortcut = (event: KeyboardEvent) => { if (!docsRoute && !event.altKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); window.location.assign("/docs?search="); } };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, [path, docsRoute]);
  const content = <Suspense fallback={<section className="route-page" aria-live="polite"><DitherSkeleton /></section>}>
    {path === "/" ? <Home /> : docsRoute ? <Documentation path={path} /> : legalPages.some(page => page.path === path) ? <Legal path={path} /> : path === "/providers" ? <div className="providers-page"><Providers /></div> : path === "/playground" ? <PlaygroundPage /> : path === "/benchmarks" ? <BenchmarkPage /> : <section className="route-page pending-page"><DitherEmpty kind="404" /><h1>Page not found.</h1><p>Find your next step in the docs or return home.</p><a className="text-link" href="/">Return to searchSDK</a></section>}
  </Suspense>;
  return <><DitherMotionController /><a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header"><Brand /><nav aria-label="Main navigation">{routes.map(([route, label]) => <a key={route} href={route} aria-current={(route === "/docs" ? docsRoute : path === route) ? "page" : undefined}>{label}</a>)}</nav>
      <div className="header-tools"><a className="docs-search" href="/docs?search=" onClick={(event) => {
        // An interactive docs workspace acknowledges the request. Until it has
        // hydrated, keep the native link so a search click is never dropped.
        if (docsRoute && !window.dispatchEvent(new CustomEvent("searchsdk:open-docs-search", { cancelable: true }))) event.preventDefault();
      }} aria-label="Search documentation" aria-keyshortcuts="Meta+K Control+K"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><span>Search docs</span><kbd>⌘ K</kbd></a>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className={docsRoute ? "main-docs" : undefined}>{docsRoute || path === "/benchmarks" ? <WorkspaceBoundary title={docsRoute ? "Documentation" : "Benchmarks"}
      // A supplied static docs route has a generated Markdown counterpart.
      // Unknown production URLs carry /404; development has no static exports.
      markdownHref={docsRoute && suppliedPath ? `${path}.md` : undefined}>{content}</WorkspaceBoundary> : content}</main>
    <footer className="site-footer"><DitherFooter /><div className="footer-links"><span className="footer-credit">searchSDK by <a href="https://belweave.com" target="_blank" rel="noreferrer">Belweave ↗</a></span><a href="/docs">Documentation <span aria-hidden="true">↗</span></a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><div className="footer-appearance"><ThemeControl /></div></footer>
  </>;
}
