import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = new URL("../", import.meta.url);
const output = new URL(".vercel/output/", root);
const manifest = JSON.parse(await readFile(new URL("apps/web/dist/route-manifest.json", root), "utf8"));
await rm(output, { recursive: true, force: true });
await mkdir(new URL("static/", output), { recursive: true });
await cp(new URL("apps/web/dist/", root), new URL("static/", output), {
  recursive: true,
});
// Export the reviewed reference; private workshop/research files are not web assets.
await cp(
  new URL("docs/sdk-alpha.md", root),
  new URL("static/sdk-guide.md", output),
);
// Build Output v3 functions are self-contained filesystem mounts. Compile a
// private SDK copy rather than relying on workspace node_modules or shared dist.
const functionDirectory = new URL("functions/api/playground/search.func/", output);
await mkdir(functionDirectory, { recursive: true });
await cp(new URL("apps/web/server/", root), new URL("apps/web/server/", functionDirectory), {
  recursive: true, filter: (source) => !source.endsWith(".test.mjs") && !source.includes("/test/"),
});
execFileSync(process.execPath, [fileURLToPath(new URL("node_modules/typescript/bin/tsc", root)),
  "-p", fileURLToPath(new URL("packages/sdk/tsconfig.json", root)),
  "--outDir", fileURLToPath(new URL("packages/sdk/dist/", functionDirectory)), "--declaration", "false"], {
  cwd: fileURLToPath(root), stdio: "inherit",
});
await writeFile(new URL("package.json", functionDirectory), JSON.stringify({ private: true, type: "module" }) + "\n");
await writeFile(new URL("index.mjs", functionDirectory),
  'import { createPlaygroundHandler } from "./apps/web/server/playground.mjs";\nexport default createPlaygroundHandler();\n');
await writeFile(new URL(".vc-config.json", functionDirectory), JSON.stringify({
  runtime: "nodejs24.x", handler: "index.mjs", launcherType: "Nodejs", maxDuration: 20,
}, null, 2) + "\n");
// The public MCP function contains only its protocol implementation and a
// generated public snapshot. No SDK, provider transport, or credentials needed.
const mcpDirectory = new URL("functions/api/mcp.func/", output);
await mkdir(new URL("apps/web/server/", mcpDirectory), { recursive: true });
await mkdir(new URL("apps/web/public/", mcpDirectory), { recursive: true });
for (const filename of ["mcp.mjs", "mcp-data.mjs", "request-headers.mjs"]) {
  await cp(new URL(`apps/web/server/${filename}`, root), new URL(`apps/web/server/${filename}`, mcpDirectory));
}
await cp(new URL("apps/web/dist/mcp-public-data.json", root), new URL("apps/web/public/mcp-public-data.json", mcpDirectory));
await writeFile(new URL("package.json", mcpDirectory), JSON.stringify({ private: true, type: "module" }) + "\n");
await writeFile(new URL("index.mjs", mcpDirectory),
  'import { createMcpHandler } from "./apps/web/server/mcp.mjs";\nexport default createMcpHandler();\n');
await writeFile(new URL(".vc-config.json", mcpDirectory), JSON.stringify({
  runtime: "nodejs24.x", handler: "index.mjs", launcherType: "Nodejs", maxDuration: 10,
}, null, 2) + "\n");
const config = {
  version: 3,
  routes: [
    {
      src: "/(.*)",
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      },
      continue: true,
    },
    {
      src: "/assets/(.*)",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      continue: true,
    },
    {
      src: "/(.*)\\.md$",
      headers: { "Content-Type": "text/markdown; charset=utf-8", Link: '<https://searchsdk.dev/llms.txt>; rel="describedby"' },
      continue: true,
    },
    { src: "/(.*)\\.txt$", headers: { "Content-Type": "text/plain; charset=utf-8" }, continue: true },
    { src: "/sitemap\\.xml$", headers: { "Content-Type": "application/xml; charset=utf-8" }, continue: true },
    { src: "/(.*)\\.json$", headers: { "Content-Type": "application/json; charset=utf-8" }, continue: true },
    ...manifest.filter((route) => !route.notFound).map((route) => ({
      src: route.path === "/" ? "^/$" : `^${route.path}/?$`,
      dest: `/${route.file}`,
    })),
    { src: "^/api/playground/search$", dest: "/api/playground/search" },
    { src: "^/(?:api/)?mcp$", dest: "/api/mcp" },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/404.html", status: 404 },
  ],
};
await writeFile(
  new URL("config.json", output),
  JSON.stringify(config, null, 2) + "\n",
);
console.log(`Static, playground, and public MCP function deployment output: ${fileURLToPath(output)}`);
