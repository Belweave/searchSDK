import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { pageMarkdownPath, siteRoutes, siteOrigin } from "./site-agent-data.mjs";

const root = new URL("../", import.meta.url);
const web = new URL("apps/web/", root);
const outputFlag = process.argv.indexOf('--out-dir');
const dist = outputFlag < 0 ? new URL("dist/", web) : pathToFileURL(resolve(process.argv[outputFlag + 1]) + '/');
const origin = siteOrigin;
const socialImage = `${origin}/social/searchsdk-card-v2.jpg`;
const socialImageAlt = "searchSDK centered among its 15 provider logos on a dithered background.";
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const template = await readFile(new URL("index.html", dist), "utf8");
// Replace the fallback block as a unit so its homepage tags cannot compete
// with route-specific metadata. Require the markers in Vite's emitted HTML.
const metadataBlock = /<!-- searchsdk:metadata:start -->[\s\S]*?<!-- searchsdk:metadata:end -->/g;
if ([...template.matchAll(metadataBlock)].length !== 1) throw new Error("Expected one fallback metadata block");
const styles = (await readdir(new URL("assets/", dist))).filter((file) => file.endsWith(".css")).sort();
const extraStyles = styles.filter((file) => !template.includes(`/assets/${file}`)).map((file) => `<link rel="stylesheet" href="/assets/${escape(file)}" />`).join("\n");
const server = await createServer({ root: fileURLToPath(web), configFile: fileURLToPath(new URL("vite.config.ts", web)), server: { middlewareMode: true, watch: null }, appType: "custom", logLevel: "error" });

function render(element) {
  // Every workspace is loaded before this synchronous static render.
  const html = renderToString(element);
  if (/<script\b/i.test(html)) throw new Error("Static route body unexpectedly contains scripts");
  if (html.includes("Loading workspace…")) throw new Error("Static route contains an unresolved workspace");
  return html;
}

function metadata(route) {
  const meta = (attribute, key, value) => `<meta ${attribute}="${key}" content="${escape(value)}" />`;
  return [
    "<!-- searchsdk:metadata:start -->",
    `<title>${escape(route.title)}</title>`,
    meta("name", "description", route.description),
    `<link rel="canonical" href="${origin}${escape(route.path)}" />`,
    ...(!route.notFound ? [
      `<link rel="alternate" type="text/markdown" href="${origin}${escape(pageMarkdownPath(route.path))}" />`,
      `<link rel="describedby" href="${origin}/llms.txt" />`,
    ] : []),
    ...Object.entries({
      "og:type": "website",
      "og:site_name": "searchSDK",
      "og:title": route.title,
      "og:description": route.description,
      "og:url": `${origin}${route.path}`,
      "og:image": socialImage,
      "og:image:secure_url": socialImage,
      "og:image:type": "image/jpeg",
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:alt": socialImageAlt,
    }).map(([key, value]) => meta("property", key, value)),
    ...Object.entries({
      "twitter:card": "summary_large_image",
      "twitter:title": route.title,
      "twitter:description": route.description,
      "twitter:image": socialImage,
      "twitter:image:alt": socialImageAlt,
    }).map(([key, value]) => meta("name", key, value)),
    ...(route.notFound ? [meta("name", "robots", "noindex")] : []),
    "<!-- searchsdk:metadata:end -->",
  ].join("\n");
}

try {
  const { docArticles } = await server.ssrLoadModule("/src/docs/content.ts");
  const { App } = await server.ssrLoadModule("/src/pages/App.tsx");
  // Resolve build-time workspaces before rendering; client routes remain lazy.
  const { DocsWorkspace } = await server.ssrLoadModule("/src/docs/DocsWorkspace.tsx");
  const { Benchmarks } = await server.ssrLoadModule("/src/Benchmarks.tsx");
  const staticWorkspaces = { docs: DocsWorkspace, benchmarks: Benchmarks };
  const routes = siteRoutes(docArticles);
  const paths = new Set();
  for (const route of routes) {
    if (paths.has(route.path) || !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(route.path)) throw new Error(`Invalid or duplicate route: ${route.path}`);
    paths.add(route.path);
    const body = await render(createElement(App, { path: route.path, staticWorkspaces }));
    const html = template.replace(metadataBlock, () => metadata(route))
      .replace("</head>", `${extraStyles}\n</head>`).replace('<div id="root"></div>', `<div id="root" data-route="${escape(route.path)}">${body}</div>`);
    if (html === template || !html.includes(body)) throw new Error(`Route template replacement failed: ${route.path}`);
    const file = route.path === "/" ? "index.html" : route.notFound ? "404.html" : `${route.path.slice(1)}/index.html`;
    const target = new URL(file, dist);
    await mkdir(new URL("./", target), { recursive: true });
    await writeFile(target, html);
    route.file = file;
  }
  await writeFile(new URL("route-manifest.json", dist), JSON.stringify(routes.map(({ path, file, title, description, notFound }) => ({ path, file, title, description, ...(notFound ? { notFound } : {}) })), null, 2) + "\n");
  console.log(`Prerendered ${routes.length} routes; agent artifacts generated by site-docs.mjs and copied by Vite.`);
} finally {
  await server.close();
}
