// Builds the documentation corpus both searchSDK MCP servers serve: every docs page as Markdown (in
// sidebar order), the provider registry, the shared policy, every TypeScript example in the docs and
// the agent skill. One generator, so the public endpoint (site/app/mcp) and this package agree.
//   node scripts/corpus.mjs --write   regenerate src/generated/corpus.json
//   node scripts/corpus.mjs --check   fail when it is stale
// Reads only files in this repository; no network.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
export const CORPUS_FILE = path.resolve(HERE, "..", "src", "generated", "corpus.json");
const SITE_URL = "https://searchsdk.dev";

const read = (...parts) => readFile(path.join(REPO, ...parts), "utf8");
const readJson = async (...parts) => JSON.parse(await read(...parts));

/** `key: value` frontmatter as the docs use it (scalars, optionally quoted). */
function frontmatter(text, file) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error(`${file}: no frontmatter`);
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value.startsWith('"')) value = JSON.parse(value);
    else if (value.startsWith("'")) value = value.slice(1, -1).replace(/''/g, "'");
    else if (value === "true" || value === "false") value = value === "true";
    data[kv[1]] = value;
  }
  return { data, body: text.slice(m[0].length) };
}

/** Docs files in sidebar order: each folder's meta.json, then anything it leaves out. */
async function orderedFiles(dir, rel = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  let order = [];
  try {
    order = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8")).pages ?? [];
  } catch {}
  const names = entries.map((e) => e.name);
  const out = [];
  const visit = async (name) => {
    if (names.includes(`${name}.mdx`)) out.push(path.posix.join(rel, `${name}.mdx`));
    else if (entries.find((e) => e.name === name && e.isDirectory())) out.push(...(await orderedFiles(path.join(dir, name), path.posix.join(rel, name))));
  };
  for (const name of order) if (!/^---.*---$/.test(name)) await visit(name.replace(/^\.\.\./, ""));
  for (const e of entries) {
    const name = e.isDirectory() ? e.name : e.name.replace(/\.mdx$/, "");
    if (!(e.isDirectory() || e.name.endsWith(".mdx"))) continue;
    if (!order.includes(name) && !order.includes(`...${name}`)) await visit(name);
  }
  return [...new Set(out)];
}

/** The docs' MDX components, as Markdown, from the same registry data the site renders them from. */
function components(providers) {
  const names = providers.map((p) => p.name);
  return {
    ProviderTable: () =>
      [
        "| Provider | Id | Key variable | Calls |",
        "| --- | --- | --- | --- |",
        ...providers.map(
          (p) => `| [${p.name}](/providers/${p.id}) | \`${p.id}\` | \`${p.auth.env.join(", ")}\` | ${[p.search ? "search" : null, p.contents ? "contents" : null].filter(Boolean).join(", ")} |`,
        ),
      ].join("\n"),
    ProviderNames: () => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "")),
  };
}

const absolute = (md) => md.replace(/\]\((\/[^)\s]*)\)/g, (_, p) => `](${SITE_URL}${p})`);

export async function buildCorpus() {
  const providerDir = path.join(REPO, "registry", "providers");
  const providers = [];
  for (const file of (await readdir(providerDir)).filter((f) => f.endsWith(".json")).sort()) {
    const spec = JSON.parse(await readFile(path.join(providerDir, file), "utf8"));
    delete spec.$schema;
    providers.push(spec);
  }
  const policy = await readJson("registry", "policy.json");
  delete policy.$comment;
  const expand = components(providers);

  const docsDir = path.join(REPO, "site", "content", "docs");
  const docs = [];
  const examples = [];
  for (const rel of await orderedFiles(docsDir)) {
    const text = await readFile(path.join(docsDir, rel), "utf8");
    const { data, body: raw } = frontmatter(text, rel);
    const slug = rel.replace(/\.mdx$/, "").replace(/(^|\/)index$/, "");
    const pagePath = slug ? `/docs/${slug}` : "/docs";
    const unknown = [...raw.matchAll(/<([A-Z][A-Za-z]*)\s*\/>/g)].map((m) => m[1]).filter((n) => !expand[n]);
    if (unknown.length) throw new Error(`${rel}: no Markdown form for <${unknown[0]} />; add one to sdk/mcp/scripts/corpus.mjs`);
    const body = absolute(raw.replace(/\{\/\*[\s\S]*?\*\/\}\n*/g, "").replace(/<([A-Z][A-Za-z]*)\s*\/>/g, (_, n) => expand[n]())).trim();
    docs.push({ path: pagePath, title: data.title, description: data.description ?? "", body });

    let heading = data.title;
    let n = 0;
    const lines = body.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const h = lines[i].match(/^#{2,3} (.+)$/);
      if (h) heading = h[1].trim();
      const fence = lines[i].match(/^```(ts|typescript)\b/);
      if (!fence) continue;
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith("```")) j++;
      n += 1;
      examples.push({ id: `${slug || "quickstart"}-${n}`.replace(/\//g, "-"), page: pagePath, title: `${data.title}: ${heading}`, code: lines.slice(i + 1, j).join("\n") });
      i = j;
    }
  }

  const skillDir = path.join(REPO, "skills", "searchsdk");
  const skill = {};
  const walk = async (dir, rel = "") => {
    for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = path.posix.join(rel, e.name);
      if (e.isDirectory()) await walk(path.join(dir, e.name), r);
      else if (e.name.endsWith(".md")) skill[r] = await readFile(path.join(dir, e.name), "utf8");
    }
  };
  await walk(skillDir);

  const sdk = await readJson("sdk", "typescript", "package.json");
  return { formatVersion: 1, siteUrl: SITE_URL, sdkVersion: sdk.version, docs, providers, policy, examples, skill };
}

export const serialize = (corpus) => `${JSON.stringify(corpus, null, 1)}\n`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = serialize(await buildCorpus());
  if (process.argv.includes("--write")) {
    await writeFile(CORPUS_FILE, text);
    console.log(`wrote ${path.relative(process.cwd(), CORPUS_FILE)}`);
  } else {
    let current = "";
    try {
      current = await readFile(CORPUS_FILE, "utf8");
    } catch {}
    if (current !== text) {
      console.error("src/generated/corpus.json is stale: run `npm run corpus` in sdk/mcp");
      process.exit(1);
    }
    console.log("corpus current");
  }
}
