import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const root = new URL("../", import.meta.url);
const web = new URL("apps/web/", root);
const dist = new URL("dist/", web);
const origin = "https://searchsdk.dev";
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

function markdown(article) {
  const tableCell = (value) => value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
  const block = (item) => {
    switch (item.type) {
      case "paragraph": return item.text;
      case "code": return `\`\`\`${item.language}\n${item.code}\n\`\`\``;
      case "list": return item.items.map((text, index) => `${item.ordered ? `${index + 1}.` : "-"} ${text}`).join("\n");
      case "callout": return `> **${item.title}**\n> ${item.text.replace(/\n/g, "\n> ")}`;
      case "links": return item.items.map((link) => `- [${link.label}](${link.href.startsWith("/") ? origin + link.href : link.href})${link.description ? ` — ${link.description}` : ""}`).join("\n");
      case "table": return [item.columns, item.columns.map(() => "---"), ...item.rows].map((row) => `| ${row.map(tableCell).join(" | ")} |`).join("\n");
      default: throw new Error(`Unknown documentation block: ${item.type}`);
    }
  };
  return `# ${article.title}\n\n${article.description}\n\nSource: ${origin}/docs${article.slug ? `/${article.slug}` : ""}\n\n${article.sections.map((section) => `## ${section.title}\n\n${section.blocks.map(block).join("\n\n")}`).join("\n\n")}\n`;
}

try {
  const { docArticles } = await server.ssrLoadModule("/src/docs/content.ts");
  const { App } = await server.ssrLoadModule("/src/pages/App.tsx");
  // Resolve build-time workspaces before rendering; client routes remain lazy.
  const { DocsWorkspace } = await server.ssrLoadModule("/src/docs/DocsWorkspace.tsx");
  const { Benchmarks } = await server.ssrLoadModule("/src/Benchmarks.tsx");
  const staticWorkspaces = { docs: DocsWorkspace, benchmarks: Benchmarks };
  const routes = [
    { path: "/", title: "searchSDK · Web search for TypeScript apps.", description: "Choose your sources. Set your fallback. Get typed web-search results and a record of every attempt, with 15 provider integrations." },
    { path: "/providers", title: "Providers · searchSDK", description: "Compare 15 provider integrations, explore their search and native API capabilities, and find the TypeScript reference for each." },
    { path: "/playground", title: "Playground · searchSDK", description: "Try search, fallback, cancellation, and errors in an interactive SDK demo. Inspect the result and every provider attempt." },
    { path: "/benchmarks", title: "Search provider benchmarks · searchSDK", description: "In development: reproducible comparisons of search relevance, latency, cost, and reliability. No benchmark scores published yet." },
    ...docArticles.map((article) => ({ path: article.slug ? `/docs/${article.slug}` : "/docs", title: `${article.label ?? article.title} · searchSDK Docs`, description: article.description, article })),
    { path: "/404", title: "Page not found · searchSDK", description: "Find your next step in the searchSDK documentation.", notFound: true },
  ];
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
    if (route.article) await writeFile(new URL(`${route.path.slice(1)}.md`, dist), markdown(route.article));
  }
  const publicRoutes = routes.filter((route) => !route.notFound);
  const urlSet = publicRoutes.map((route) => `  <url><loc>${origin}${escape(route.path)}</loc></url>`).join("\n");
  await writeFile(new URL("sitemap.xml", dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlSet}\n</urlset>\n`);
  await writeFile(new URL("robots.txt", dist), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  await writeFile(new URL("llms.txt", dist), `# searchSDK\n\n> Alpha TypeScript search SDK by Belweave. Provider contracts are documentation- and fixture-verified; no live-provider or benchmark claims.\n\n## Documentation\n\n${docArticles.map((article) => `- [${article.label ?? article.title}](${origin}/docs${article.slug ? `/${article.slug}` : ""}.md): ${article.description}`).join("\n")}\n\n## Resources\n\n- [Complete documentation](${origin}/llms-full.txt)\n- [Provider catalog](${origin}/providers)\n- [Benchmark protocol draft](${origin}/benchmark-methodology.json)\n`);
  await writeFile(new URL("llms-full.txt", dist), docArticles.map(markdown).join("\n---\n\n"));
  await writeFile(new URL("route-manifest.json", dist), JSON.stringify(routes.map(({ path, file, title, description, notFound }) => ({ path, file, title, description, ...(notFound ? { notFound } : {}) })), null, 2) + "\n");
  console.log(`Prerendered ${routes.length} routes; exported ${docArticles.length} Markdown articles, sitemap, and LLM reference.`);
} finally {
  await server.close();
}
