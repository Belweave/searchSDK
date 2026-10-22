import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
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
    ...manifest.filter((route) => !route.notFound).map((route) => ({
      src: route.path === "/" ? "^/$" : `^${route.path}/?$`,
      dest: `/${route.file}`,
    })),
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/404.html", status: 404 },
  ],
};
await writeFile(
  new URL("config.json", output),
  JSON.stringify(config, null, 2) + "\n",
);
console.log(`Static deployment output: ${fileURLToPath(output)}`);
