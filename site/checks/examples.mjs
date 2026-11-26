// Typecheck every TypeScript example the site shows against the real SDK source, so examples
// cannot drift from the API.
//   node checks/examples.mjs
// Sources: ```ts blocks in content/docs/**/*.mdx (each block is a complete module) and
// content/examples/*.ts (shown on the home page). "@searchsdk/sdk" resolves to
// ../sdk/typescript/src/index.ts under the SDK's own compiler options.
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SDK = path.resolve(ROOT, "..", "sdk", "typescript");
const OUT = path.join(ROOT, ".cache", "examples");
const TSC = path.join(ROOT, "node_modules", ".bin", "tsc");
const FENCE = /^```(ts|typescript)\b[^\n]*\n([\s\S]*?)^```$/gm;

async function mdxFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await mdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

/** Writes one module per example. Returns a map from generated file to its source and line offset. */
async function collect() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const origin = new Map();
  for (const file of await mdxFiles(path.join(ROOT, "content", "docs"))) {
    const text = await readFile(file, "utf8");
    const rel = path.relative(ROOT, file);
    let n = 0;
    for (const m of text.matchAll(FENCE)) {
      n += 1;
      const fenceLine = text.slice(0, m.index).split("\n").length; // the ``` line
      const name = `${rel.replace(/[\\/]/g, "__").replace(/\.mdx$/, "")}.${n}.ts`;
      // export {} keeps every block in its own module scope.
      await writeFile(path.join(OUT, name), `${m[2]}\nexport {};\n`);
      origin.set(name, { source: rel, offset: fenceLine });
    }
  }
  const examples = path.join(ROOT, "content", "examples");
  for (const name of (await readdir(examples)).filter((f) => f.endsWith(".ts"))) {
    const target = `content__examples__${name}`;
    await writeFile(path.join(OUT, target), `${await readFile(path.join(examples, name), "utf8")}\nexport {};\n`);
    origin.set(target, { source: path.join("content", "examples", name), offset: 0 });
  }
  const tsconfig = {
    extends: path.relative(OUT, path.join(SDK, "tsconfig.json")),
    compilerOptions: {
      paths: { "@searchsdk/sdk": [path.relative(OUT, path.join(SDK, "src", "index.ts"))] },
      // Examples run in an ES module with top-level await.
      module: "nodenext",
      moduleResolution: "nodenext",
      types: ["node"],
      typeRoots: [path.relative(OUT, path.join(ROOT, "node_modules", "@types"))],
    },
    include: ["*.ts"],
  };
  await writeFile(path.join(OUT, "tsconfig.json"), `${JSON.stringify(tsconfig, null, 2)}\n`);
  await writeFile(path.join(OUT, "package.json"), `${JSON.stringify({ type: "module", private: true })}\n`);
  return origin;
}

export async function checkExamples() {
  const origin = await collect();
  const output = await new Promise((resolve) => {
    const child = spawn(TSC, ["-p", path.join(OUT, "tsconfig.json"), "--pretty", "false"], { cwd: OUT });
    let text = "";
    child.stdout.on("data", (d) => (text += d));
    child.stderr.on("data", (d) => (text += d));
    child.on("exit", (code) => resolve({ code, text }));
  });
  // Point errors at the MDX line, not the generated file.
  const failures = output.text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) =>
      line.replace(/^([^(\s]+\.ts)\((\d+),(\d+)\)/, (all, file, l, c) => {
        const o = origin.get(path.basename(file));
        return o ? `${o.source}:${Number(l) + o.offset}:${c}` : all;
      }),
    );
  if (output.code !== 0 && !failures.length) failures.push(`tsc exited with ${output.code}`);
  return { failures, count: origin.size };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { failures, count } = await checkExamples();
  if (failures.length) {
    console.error(`${failures.length} example error(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`examples ok (${count} checked against sdk/typescript)`);
}
