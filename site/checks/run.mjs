// npm run check: brand copies current → generated MCP corpus and reference pages current → typecheck → examples against the SDK → token and brand-rule scan → production
// build → serve on a free port → crawl and check every page → stop. Exit 1 on any failure. Makes no network request
// beyond localhost.
//   node checks/run.mjs [--no-build]
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncBrand } from "./brand.mjs";
import { checkExamples } from "./examples.mjs";
import { syncMcp } from "./mcp.mjs";
import { checkSite } from "./site.mjs";
import { checkSource } from "./source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEXT = path.join(ROOT, "node_modules", ".bin", "next");
const TSC = path.join(ROOT, "node_modules", ".bin", "tsc");
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
const skipBuild = process.argv.includes("--no-build");

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▸ ${label}`);
    const child = spawn(cmd, args, { cwd: ROOT, env, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${label} failed (exit ${code})`))));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(url, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server did not answer ${url} within ${timeoutMs / 1000}s`);
}

let server;
const results = [];
try {
  // The site's identity is a copy of brand/: a stale copy fails here, before anything is built.
  console.log("\n▸ brand");
  const brand = await syncBrand();
  if (brand.failures.length) {
    for (const f of brand.failures) console.error(`  ✗ ${f}`);
    throw new Error(`${brand.failures.length} brand copy failure(s); run \`npm run brand:sync\``);
  }
  console.log(`brand current (${brand.files} files match brand/)`);
  results.push(`brand ok (${brand.files} tokens, fonts, marks and icons match brand/)`);

  // The MCP corpus and shared core, and the generated reference pages, must match their sources.
  console.log("\n▸ generated");
  const mcp = await syncMcp();
  if (mcp.failures.length) {
    for (const f of mcp.failures) console.error(`  ✗ ${f}`);
    throw new Error("lib/mcp is stale; run `npm run mcp:sync`");
  }
  await run(process.execPath, [path.join(ROOT, "checks", "reference.mjs")], "reference pages");
  results.push("generated files ok (lib/mcp matches sdk/mcp, reference pages match the SDK and registry)");

  await run(NEXT, ["typegen"], "typegen");
  await run(TSC, ["--noEmit"], "typecheck");
  results.push("typecheck ok");

  console.log("\n▸ examples");
  const examples = await checkExamples();
  if (examples.failures.length) {
    for (const f of examples.failures) console.error(`  ✗ ${f}`);
    throw new Error(`${examples.failures.length} example error(s)`);
  }
  console.log(`examples ok (${examples.count})`);
  results.push(`examples ok (${examples.count} TypeScript examples typechecked against sdk/typescript)`);

  console.log("\n▸ tokens");
  const source = await checkSource();
  if (source.failures.length) {
    for (const f of source.failures) console.error(`  ✗ ${f}`);
    throw new Error(`${source.failures.length} token failure(s)`);
  }
  console.log(`source ok (${source.scanned} files)`);
  results.push(`tokens and brand rules ok (${source.scanned} files)`);

  if (!skipBuild) {
    await run(NEXT, ["build"], "build");
    results.push("build ok");
  }

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  console.log(`\n▸ serve ${base}`);
  server = spawn(NEXT, ["start", "--port", String(port), "--hostname", "127.0.0.1"], { cwd: ROOT, env, stdio: ["ignore", "ignore", "inherit"] });
  await waitFor(`${base}/robots.txt`);

  console.log("\n▸ crawl");
  const site = await checkSite(base);
  if (site.failures.length) {
    console.error(`\n${site.failures.length} site failure(s):`);
    for (const f of site.failures) console.error(`  ✗ ${f}`);
    throw new Error(`${site.failures.length} site failure(s)`);
  }
  results.push(`crawl ok (${site.report.length} HTML pages, links, titles, descriptions, word caps, sample labels, name, mark, logos, primary keys, icons, policy)`);

  console.log(`\n✓ check passed\n  ${results.join("\n  ")}`);
} catch (error) {
  console.error(`\n✗ check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  server?.kill("SIGTERM");
}
