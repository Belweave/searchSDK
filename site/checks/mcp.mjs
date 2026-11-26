// The public MCP endpoint (app/mcp/route.ts) serves the same tools as the local package, from the
// same code and corpus: lib/mcp/core.ts is a byte-for-byte copy of ../sdk/mcp/src/core.ts, and
// lib/mcp/corpus.json is written by ../sdk/mcp/scripts/corpus.mjs from the docs, the registry and
// the agent skill. Bundled at build, so the function reads no file at runtime.
//   node checks/mcp.mjs --write   refresh both (npm run dev and npm run build do this)
//   node checks/mcp.mjs           fail when either is stale (part of npm run check)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus, serialize } from "../../sdk/mcp/scripts/corpus.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "lib", "mcp");
const CORE = path.resolve(ROOT, "..", "sdk", "mcp", "src", "core.ts");

export async function syncMcp({ write = false } = {}) {
  const want = {
    "core.ts": await readFile(CORE, "utf8"),
    "corpus.json": serialize(await buildCorpus()),
  };
  const failures = [];
  if (write) await mkdir(OUT, { recursive: true });
  for (const [name, text] of Object.entries(want)) {
    const file = path.join(OUT, name);
    let current = null;
    try {
      current = await readFile(file, "utf8");
    } catch {}
    if (current === text) continue;
    if (write) await writeFile(file, text);
    else failures.push(`lib/mcp/${name} is ${current === null ? "missing" : "stale"}`);
  }
  return { failures, files: Object.keys(want).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes("--write");
  const { failures } = await syncMcp({ write });
  if (failures.length) {
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error("run `npm run mcp:sync` in site/");
    process.exit(1);
  }
  console.log(write ? "lib/mcp current" : "lib/mcp current (core.ts and corpus.json match sdk/mcp)");
}
