// The documentation and registry half of searchSDK's MCP servers, shared by the public endpoint
// (https://searchsdk.dev/mcp) and the local package (@searchsdk/mcp). Everything here is pure: it
// reads a generated corpus, never a key, never the network, never the filesystem.
// Canonical copy: sdk/mcp/src/core.ts. site/lib/mcp/core.ts is a byte-for-byte copy kept current by
// site/checks/mcp.mjs; edit this file, then run `npm run mcp:sync` in site/.
import { McpServer } from "@modelcontextprotocol/server";
import { costBound, createClient, listPrice, SearchError } from "@searchsdk/sdk";
import * as z from "zod";

// ---- Corpus (written by sdk/mcp/scripts/corpus.mjs) ----

export interface DocPage {
  /** Site path, such as /docs/guides/fallback. */
  path: string;
  title: string;
  description: string;
  /** Markdown body, components expanded, links absolute. */
  body: string;
}

export interface Example {
  id: string;
  page: string;
  title: string;
  code: string;
}

export interface Corpus {
  formatVersion: number;
  siteUrl: string;
  sdkVersion: string;
  docs: DocPage[];
  providers: Record<string, unknown>[];
  policy: Record<string, unknown>;
  examples: Example[];
  /** Agent skill files by path under skills/searchsdk/ (SKILL.md, references/*.md). */
  skill: Record<string, string>;
}

type Json = Record<string, unknown>;
type Kind = "search" | "contents";

const SEARCH_OPTIONS = ["maxResults", "includeDomains", "excludeDomains", "recency", "startDate", "endDate", "country", "language", "depth"] as const;
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const failure = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });
const json = (v: unknown) => JSON.stringify(v, null, 2);

// ---- Docs pages ----

export const docUrl = (corpus: Corpus, page: DocPage) => `${corpus.siteUrl}${page.path}`;
export const docMarkdownUrl = (corpus: Corpus, page: DocPage) => `${corpus.siteUrl}${page.path}.md`;
export const docUri = (page: DocPage) => `searchsdk:/${page.path}`;

/** A docs page as the site's .md copy writes it: title, description, source, body. */
export function docMarkdown(corpus: Corpus, page: DocPage): string {
  const head = [`# ${page.title}`, "", ...(page.description ? [`> ${page.description}`, ""] : []), `Source: ${docUrl(corpus, page)}`, ""];
  return `${head.join("\n")}\n${page.body}\n`;
}

/** Accepts "fallback", "guides/fallback", "/docs/guides/fallback", a site URL, a .md URL or a searchsdk:// URI. */
export function findDoc(corpus: Corpus, ref: string): DocPage | undefined {
  let p = ref.trim().replace(/^searchsdk:\/\//, "/").replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "").replace(/\.md$/, "").replace(/\/+$/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.startsWith("/docs")) p = `/docs${p}`;
  if (p === "/docs/index" || p === "/docs/quickstart") p = "/docs";
  const exact = corpus.docs.find((d) => d.path === p);
  if (exact) return exact;
  const last = p.split("/").pop();
  const byName = corpus.docs.filter((d) => d.path.split("/").pop() === last);
  return byName.length === 1 ? byName[0] : undefined;
}

// ---- Search over docs sections (BM25) ----

const STOP = new Set("a an and are as at be by can do does for from how i in is it its me my of on or the to use using what when where which with you your".split(" "));

/** Lowercase word stems: letters and digits, a trailing plural s dropped. */
export function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
}

/** GitHub-style heading anchor, as Fumadocs writes it. */
export function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

interface Section {
  page: DocPage;
  heading: string | null;
  text: string;
  tf: Map<string, number>;
  length: number;
}

const indexes = new WeakMap<Corpus, { sections: Section[]; df: Map<string, number>; avg: number }>();

function index(corpus: Corpus) {
  let idx = indexes.get(corpus);
  if (idx) return idx;
  const sections: Section[] = [];
  for (const page of corpus.docs) {
    const parts = page.body.split(/^(?=#{2,3} )/m);
    for (const part of parts) {
      const h = part.match(/^#{2,3} (.+)\n/);
      const heading = h ? h[1]!.trim() : null;
      const body = h ? part.slice(h[0].length) : part;
      const weighted = [page.title, page.title, page.description, heading ?? "", heading ?? "", body].join("\n");
      const toks = tokens(weighted);
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      sections.push({ page, heading, text: body.trim(), tf, length: toks.length });
    }
  }
  const df = new Map<string, number>();
  for (const s of sections) for (const t of s.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avg = sections.reduce((n, s) => n + s.length, 0) / Math.max(1, sections.length);
  idx = { sections, df, avg };
  indexes.set(corpus, idx);
  return idx;
}

/** A short plain-text excerpt around the first matching term. */
function snippet(body: string, terms: string[]): string {
  const plain = body.replace(/```[\s\S]*?```/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*_|>#]/g, " ").replace(/\s+/g, " ").trim();
  const lower = plain.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  const start = Math.max(0, at - 80);
  const cut = plain.slice(start, start + 280);
  return `${start > 0 ? "…" : ""}${cut}${start + 280 < plain.length ? "…" : ""}`;
}

export interface DocHit {
  title: string;
  section: string | null;
  url: string;
  markdownUrl: string;
  snippet: string;
  score: number;
}

export function searchDocs(corpus: Corpus, query: string, limit = 5): DocHit[] {
  const { sections, df, avg } = index(corpus);
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const N = sections.length;
  const scored = sections.map((s) => {
    let score = 0;
    for (const t of q) {
      const f = s.tf.get(t) ?? 0;
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += (idf * f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (s.length / avg)));
    }
    return { s, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s, score }) => ({
      title: s.page.title,
      section: s.heading,
      url: `${docUrl(corpus, s.page)}${s.heading ? `#${anchor(s.heading)}` : ""}`,
      markdownUrl: docMarkdownUrl(corpus, s.page),
      snippet: snippet(s.text, q),
      score: Math.round(score * 100) / 100,
    }));
}

// ---- Providers ----

const providerMap = (corpus: Corpus) => new Map(corpus.providers.map((p) => [String(p.id), p] as const));

const verificationOf = (ep: Json | undefined) => (ep && isObject(ep.verification) ? ep.verification : null);
const statusOf = (ep: Json | undefined) => (verificationOf(ep)?.status === "verified" ? `verified on ${String(verificationOf(ep)?.on)}` : "unverified (mapped from public docs, tested on synthetic fixtures only)");

/** Which normalized search options a spec maps: sent, trimmed by searchSDK, or unsupported. */
function optionSupport(ep: Json, kind: Kind): Record<string, "yes" | "trimmed by searchSDK" | "unsupported"> {
  if (kind === "contents") return {};
  const request = isObject(ep.request) ? ep.request : {};
  const params = isObject(request.params) ? request.params : {};
  const composed = new Set<string>();
  for (const c of Array.isArray(request.compose) ? request.compose : []) {
    for (const part of isObject(c) && Array.isArray(c.parts) ? c.parts : []) if (isObject(part) && typeof part.input === "string") composed.add(part.input);
  }
  const out: Record<string, "yes" | "trimmed by searchSDK" | "unsupported"> = {};
  for (const name of SEARCH_OPTIONS) out[name] = own(params, name) || composed.has(name) ? "yes" : name === "maxResults" ? "trimmed by searchSDK" : "unsupported";
  return out;
}

function endpointSummary(ep: Json, kind: Kind) {
  const response = isObject(ep.response) ? ep.response : {};
  const cost = isObject(ep.cost) && isObject(ep.cost.reported) ? ep.cost.reported : null;
  return {
    verification: statusOf(ep),
    ...(kind === "search" ? { options: optionSupport(ep, kind), excerptKind: response.excerptKind ?? null, dateBasis: ep.dateBasis ?? null } : { contentFormat: ep.contentFormat ?? null }),
    providerOptions: ep.providerOptions ?? {},
    limits: ep.limits ?? {},
    cost: cost ? `reported by the provider in ${cost.unit === "credit" ? "credits" : "USD"}${cost.isEstimate ? " (the provider's estimate)" : ""}` : "computed from the list price, or unknown when the price is not public",
    pricing: ep.pricing ?? null,
    rateLimits: ep.rateLimits ?? [],
  };
}

export function providerSummary(spec: Json) {
  const auth = isObject(spec.auth) ? spec.auth : {};
  return {
    id: spec.id,
    name: spec.name,
    specVersion: spec.specVersion,
    keyEnv: auth.env ?? [],
    capabilities: spec.capabilities ?? {},
    index: spec.index ?? null,
    search: isObject(spec.search) ? endpointSummary(spec.search, "search") : null,
    contents: isObject(spec.contents) ? endpointSummary(spec.contents, "contents") : null,
    terms: spec.terms ?? null,
    unverified: spec.unverified ?? [],
    sources: spec.sources ?? [],
  };
}

function providerRow(spec: Json) {
  const s = isObject(spec.search) ? spec.search : undefined;
  const c = isObject(spec.contents) ? spec.contents : undefined;
  const auth = isObject(spec.auth) ? spec.auth : {};
  return {
    id: String(spec.id),
    name: String(spec.name),
    search: s ? statusOf(s).split(" (")[0]! : "no",
    contents: c ? statusOf(c).split(" (")[0]! : "no",
    keyEnv: Array.isArray(auth.env) ? auth.env.join(", ") : "",
  };
}

// ---- Examples ----

export function findExamples(corpus: Corpus, task: string, limit = 3): Example[] {
  const q = [...new Set(tokens(task))];
  return corpus.examples
    .map((e) => {
      const head = tokens(e.title);
      const body = tokens(e.code);
      const score = q.reduce((n, t) => n + (head.includes(t) ? 3 : 0) + (body.includes(t) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}

// ---- Cost and option checks (pure: nothing is sent) ----

const PLACEHOLDER_KEY = "validate-only-placeholder";

type Sent = { method: string; url: string; body: string | null };

/** A client over the corpus registry whose fetch records the request and never sends it. One per call. */
function dryClient(corpus: Corpus, onSend: (sent: Sent) => void) {
  const registry: Record<string, unknown> = Object.fromEntries(providerMap(corpus));
  const keys: Record<string, string> = Object.fromEntries(Object.keys(registry).map((id) => [id, PLACEHOLDER_KEY]));
  return createClient<string>({
    registry,
    keys,
    env: {},
    maxRetries: 0,
    fetch: async (input, init) => {
      onSend({ method: init?.method ?? "GET", url: input instanceof Request ? input.url : String(input), body: typeof init?.body === "string" ? init.body : null });
      throw new Error("validate_options never sends a request");
    },
  });
}

const redact = (s: string) => s.split(PLACEHOLDER_KEY).join("[redacted]");

export async function validateOptions(corpus: Corpus, provider: string, kind: Kind, options: Json, input: { query?: string; urls?: string[] }) {
  const spec = providerMap(corpus).get(provider);
  if (!spec) return { supported: false, code: "configuration", field: "provider", reason: `Unknown provider. Known: ${[...providerMap(corpus).keys()].join(", ")}.` };
  let request: Sent | null = null;
  const client = dryClient(corpus, (sent) => (request = sent));
  const call = { ...options, provider, fallback: [] as string[], maxRetries: 0 };
  try {
    if (kind === "search") await client.search(input.query ?? "example query", call);
    else await client.contents(input.urls?.length ? input.urls : ["https://example.com/"], call);
  } catch (e) {
    const sent = request as Sent | null;
    if (sent) return { supported: true, wouldSend: { method: sent.method, url: redact(sent.url), body: sent.body === null ? null : redact(sent.body) } };
    if (e instanceof SearchError) {
      const policy = isObject(corpus.policy.errors) ? corpus.policy.errors : {};
      return { supported: false, code: e.code, field: e.field ?? null, reason: String(policy[e.code] ?? e.message) };
    }
    return { supported: false, code: "invalid_request", field: null, reason: "The options could not be checked." };
  }
  return { supported: true };
}

export function estimateCost(corpus: Corpus, provider: string, kind: Kind, input: { maxResults?: number; urls?: number; depth?: "fast" | "standard" | "deep"; count?: number; providerOptions?: Json }) {
  const spec = providerMap(corpus).get(provider);
  if (!spec) return { error: `Unknown provider. Known: ${[...providerMap(corpus).keys()].join(", ")}.` };
  const ep = spec[kind];
  if (!isObject(ep)) return { error: `${String(spec.name)} has no ${kind} endpoint in the registry.` };
  const asSpec = spec as never;
  const count = input.count ?? (kind === "search" ? input.maxResults ?? 10 : input.urls ?? 1);
  const bound = costBound(asSpec, kind, {
    ...(input.maxResults !== undefined ? { maxResults: input.maxResults } : {}),
    ...(input.urls !== undefined ? { urls: input.urls } : {}),
    ...(input.depth ? { depth: input.depth } : {}),
    ...(input.providerOptions ? { providerOptions: input.providerOptions } : {}),
  });
  const price = listPrice(asSpec, kind, { count, ...(input.depth ? { depth: input.depth } : {}), ...(input.providerOptions ? { providerOptions: input.providerOptions } : {}) });
  const pricing = isObject(ep.pricing) ? ep.pricing : {};
  return {
    provider,
    kind,
    costBound: bound,
    listPrice: { count, ...price },
    pricing: { plan: pricing.plan, source: pricing.source, retrievedOn: pricing.retrievedOn, note: pricing.note ?? null },
    note:
      "Computed by @searchsdk/sdk (costBound, listPrice) from the registry's documented list prices, read on the date shown. A provider-reported cost in a live response takes precedence. Nothing was sent.",
  };
}

// ---- The server ----

export interface DocsServerInfo {
  name: string;
  version: string;
  /** Appended to the server instructions. */
  instructions?: string;
}

export function serverInstructions(corpus: Corpus, extra?: string): string {
  return [
    `searchSDK (${corpus.siteUrl}) is an MIT-licensed SDK that gives AI apps and agents one interface to many web search APIs (npm: @searchsdk/sdk ${corpus.sdkVersion}).`,
    "Use search_docs and get_doc for how-to questions, list_providers and get_provider for provider capabilities, prices and limits, estimate_cost and validate_options before writing a call, and get_example for code that typechecks against the SDK.",
    "No provider is verified against its live API yet; specs are mapped from public docs and tested on synthetic fixtures.",
    ...(extra ? [extra] : []),
  ].join(" ");
}

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const providerId = z.string().min(1).max(40).describe("Provider id, such as exa or tavily (list_providers).");
const kindSchema = z.enum(["search", "contents"]).default("search");

/** Registers the docs and registry tools, resources and prompts on a server. */
export function registerDocs(server: McpServer, corpus: Corpus): void {
  const providers = providerMap(corpus);

  server.registerTool(
    "search_docs",
    {
      title: "Search the searchSDK docs",
      description: "Full-text search over every searchSDK docs page, by section. Returns titles, section links and excerpts; read a whole page with get_doc.",
      inputSchema: z.object({
        query: z.string().min(1).max(300).describe("What to look for, such as \"fallback on rate limit\"."),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      annotations: readOnly,
    },
    async ({ query, limit }) => {
      const hits = searchDocs(corpus, query, limit);
      if (!hits.length) return text(`No docs section matches "${query}". Pages: ${corpus.docs.map((d) => d.path).join(", ")}`);
      return text(hits.map((h, i) => `${i + 1}. ${h.title}${h.section ? ` › ${h.section}` : ""}\n   ${h.url}\n   ${h.snippet}`).join("\n\n"));
    },
  );

  server.registerTool(
    "get_doc",
    {
      title: "Read a searchSDK docs page",
      description: "One docs page as Markdown. Accepts a path (/docs/search, guides/fallback), a page name or a searchsdk.dev URL.",
      inputSchema: z.object({ path: z.string().min(1).max(300) }),
      annotations: readOnly,
    },
    async ({ path }) => {
      const page = findDoc(corpus, path);
      if (!page) return failure(`No docs page "${path}". Pages:\n${corpus.docs.map((d) => `- ${d.path}: ${d.title}`).join("\n")}`);
      return text(docMarkdown(corpus, page));
    },
  );

  server.registerTool(
    "list_providers",
    {
      title: "List searchSDK providers",
      description: "Every provider in the registry: id, name, key variable, and whether search and contents exist and are live-verified.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      const rows = [...providers.values()].map(providerRow);
      return text(
        [
          "| id | name | search | contents | key variable |",
          "| --- | --- | --- | --- | --- |",
          ...rows.map((r) => `| ${r.id} | ${r.name} | ${r.search} | ${r.contents} | ${r.keyEnv} |`),
          "",
          "Benchmark results are pending; no provider has published figures. Use get_provider for options, limits, prices and rate limits.",
        ].join("\n"),
      );
    },
  );

  server.registerTool(
    "get_provider",
    {
      title: "Get a provider's capabilities",
      description:
        "One provider from the registry: supported options, provider options, limits, documented pricing and rate limits, verification status, unverified facts and sources.",
      inputSchema: z.object({ id: providerId }),
      annotations: readOnly,
    },
    async ({ id }) => {
      const spec = providers.get(id);
      if (!spec) return failure(`Unknown provider "${id}". Known: ${[...providers.keys()].join(", ")}.`);
      return text(json(providerSummary(spec)));
    },
  );

  server.registerTool(
    "estimate_cost",
    {
      title: "Estimate a call's cost",
      description:
        "The most one request can cost (costBound) and its list price for a result count (listPrice), from the registry's documented prices. Pure: nothing is sent.",
      inputSchema: z.object({
        provider: providerId,
        kind: kindSchema,
        maxResults: z.number().int().min(1).max(100).optional().describe("Search: results requested (default 10)."),
        urls: z.number().int().min(1).max(100).optional().describe("Contents: URLs sent (default 1)."),
        depth: z.enum(["fast", "standard", "deep"]).optional(),
        count: z.number().int().min(0).max(100).optional().describe("Items the provider returned, for listPrice (default: the count requested)."),
        providerOptions: z.record(z.string(), z.unknown()).optional().describe("This provider's own options, as sent under providerOptions[id]."),
      }),
      annotations: readOnly,
    },
    async ({ provider, kind, ...rest }) => {
      try {
        const result = estimateCost(corpus, provider, kind, rest);
        return "error" in result ? failure(String(result.error)) : text(json(result));
      } catch (e) {
        return failure(e instanceof SearchError ? `${e.code}: ${e.message}` : "The cost could not be computed.");
      }
    },
  );

  server.registerTool(
    "validate_options",
    {
      title: "Check options against a provider",
      description:
        "Whether a provider can honour a set of searchSDK options, checked by @searchsdk/sdk itself with a fetch that never sends. Returns the request it would send (key redacted) or the error code and field.",
      inputSchema: z.object({
        provider: providerId,
        kind: kindSchema,
        options: z
          .record(z.string(), z.unknown())
          .default({})
          .describe("searchSDK call options, such as { maxResults: 20, recency: \"week\", providerOptions: { exa: { category: \"news\" } } }."),
        query: z.string().max(2000).optional().describe("Search: a query to map (default \"example query\")."),
        urls: z.array(z.string().max(2048)).max(100).optional().describe("Contents: URLs to map."),
      }),
      annotations: readOnly,
    },
    async ({ provider, kind, options, query, urls }) => {
      const result = await validateOptions(corpus, provider, kind, options, { ...(query !== undefined ? { query } : {}), ...(urls ? { urls } : {}) });
      return text(json(result));
    },
  );

  server.registerTool(
    "get_example",
    {
      title: "Get a code example",
      description: "TypeScript examples from the docs for a task, each typechecked against @searchsdk/sdk. Examples: \"fallback\", \"cost of each attempt\", \"Vercel AI SDK tool\".",
      inputSchema: z.object({ task: z.string().min(1).max(300) }),
      annotations: readOnly,
    },
    async ({ task }) => {
      const found = findExamples(corpus, task);
      if (!found.length) return text(`No example matches "${task}". Examples:\n${corpus.examples.map((e) => `- ${e.title}`).join("\n")}`);
      return text(found.map((e) => `## ${e.title}\n\nFrom ${corpus.siteUrl}${e.page}\n\n\`\`\`ts\n${e.code}\n\`\`\``).join("\n\n"));
    },
  );

  // Resources: every docs page, every provider spec, the policy and the agent skill.
  for (const page of corpus.docs) {
    server.registerResource(`doc:${page.path}`, docUri(page), { title: page.title, description: page.description, mimeType: "text/markdown" }, async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: docMarkdown(corpus, page) }],
    }));
  }
  for (const [id, spec] of providers) {
    server.registerResource(
      `provider:${id}`,
      `searchsdk://providers/${id}`,
      { title: `${String(spec.name)} provider spec`, description: `The registry spec for ${String(spec.name)}: request mapping, response paths, pricing, limits and sources.`, mimeType: "application/json" },
      async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json(spec) }] }),
    );
  }
  server.registerResource(
    "policy",
    "searchsdk://registry/policy",
    { title: "Shared runtime policy", description: "Validation limits, defaults, retry, billing, fallback and error-code rules every runtime reads.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json(corpus.policy) }] }),
  );
  for (const [file, body] of Object.entries(corpus.skill)) {
    server.registerResource(`skill:${file}`, `searchsdk://skill/${file}`, { title: `searchSDK agent skill: ${file}`, mimeType: "text/markdown" }, async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: body }],
    }));
  }

  // Prompts.
  server.registerPrompt(
    "integrate-searchsdk",
    {
      title: "Integrate searchSDK into my agent",
      description: "Steps and context for adding searchSDK web search to an app or agent.",
      argsSchema: z.object({
        framework: z.string().max(100).optional().describe("Vercel AI SDK, OpenAI, Anthropic, MCP or none."),
        provider: z.string().max(40).optional().describe("A provider id, if one is chosen."),
      }),
    },
    ({ framework, provider }) => {
      const guide = findDoc(corpus, "guides/agent-tools");
      const skill = corpus.skill["SKILL.md"];
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Integrate searchSDK (npm install @searchsdk/sdk) into this project as a web search tool${framework ? ` for ${framework}` : ""}${provider ? `, using the ${provider} provider` : ""}.`,
                "Keep provider keys on the server, set an explicit fallback chain if one provider is not enough, check every response's cost and warnings, and handle SearchError by its code.",
                "Use the searchSDK MCP tools (search_docs, get_doc, get_provider, validate_options, get_example) to confirm each option before you write it.",
              ].join(" "),
            },
          },
          ...(skill ? [{ role: "user" as const, content: { type: "resource" as const, resource: { uri: "searchsdk://skill/SKILL.md", mimeType: "text/markdown", text: skill } } }] : []),
          ...(guide ? [{ role: "user" as const, content: { type: "resource" as const, resource: { uri: docUri(guide), mimeType: "text/markdown", text: docMarkdown(corpus, guide) } } }] : []),
        ],
      };
    },
  );

  server.registerPrompt(
    "choose-provider",
    {
      title: "Choose a search provider",
      description: "Compare registry providers against a need, from documented capabilities and prices only.",
      argsSchema: z.object({ needs: z.string().min(1).max(1000).describe("What the search is for: freshness, domains, page text, budget and so on.") }),
    },
    ({ needs }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Recommend a searchSDK provider and a fallback chain for: ${needs}`,
              "",
              "Base the answer only on these registry summaries (documented capabilities, limits and list prices). No provider is live-verified and benchmark results are pending, so do not claim one is faster or better.",
              "",
              json([...providers.values()].map(providerSummary)),
            ].join("\n"),
          },
        },
      ],
    }),
  );
}

/** A fresh server with the docs half registered: the whole public endpoint. */
export function createDocsServer(corpus: Corpus, info: DocsServerInfo): McpServer {
  const server = new McpServer({ name: info.name, version: info.version }, { instructions: serverInstructions(corpus, info.instructions) });
  registerDocs(server, corpus);
  return server;
}
