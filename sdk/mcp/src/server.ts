// The local server: the shared docs and registry tools (core.ts) plus real `search` and `contents`
// calls through @searchsdk/sdk with the user's own provider keys, read from the environment.
// Keys are handed to the SDK and nothing else: they are never logged, returned or sent anywhere
// but the provider they belong to.
import { McpServer } from "@modelcontextprotocol/server";
import { createClient, registry, SearchError, type ContentsResponse, type ProviderId, type SearchResponse } from "@searchsdk/sdk";
import * as z from "zod";
import corpusJson from "./generated/corpus.json" with { type: "json" };
import { registerDocs, serverInstructions, type Corpus } from "./core.ts";

export const VERSION = "0.1.0";

type Env = Readonly<Record<string, string | undefined>>;

export interface LocalServerOptions {
  /** Where keys and settings are read from. Default: process.env. */
  env?: Env;
  /** The fetch the SDK uses. Default: the platform fetch. Tests inject fixtures here. */
  fetch?: typeof globalThis.fetch;
}

const ids = Object.keys(registry).sort() as ProviderId[];
const specOf = (id: ProviderId) => registry[id];

/** The corpus with the SDK's own registry, so docs answers describe exactly what the tools execute. */
export function localCorpus(): Corpus {
  const base = corpusJson as Corpus;
  return { ...base, providers: ids.map((id) => JSON.parse(JSON.stringify(specOf(id))) as Record<string, unknown>) };
}

/** Provider ids whose key variable is set (names only; values are never read here). */
export function configuredProviders(env: Env): ProviderId[] {
  return ids.filter((id) => specOf(id).auth.env.some((name) => typeof env[name] === "string" && env[name] !== ""));
}

function intSetting(env: Env, name: string, min: number, max: number): number | undefined {
  const raw = env[name];
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return n;
}

function providerSetting(env: Env, name: string): ProviderId[] {
  const raw = env[name];
  if (!raw) return [];
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const id of list) if (!ids.includes(id as ProviderId)) throw new Error(`${name}: unknown provider "${id}"; known: ${ids.join(", ")}`);
  return list as ProviderId[];
}

/** Settings from SEARCHSDK_* variables; a bad value stops the server at start with a clear message. */
export function settings(env: Env) {
  const [provider] = providerSetting(env, "SEARCHSDK_PROVIDER");
  return {
    provider,
    fallback: providerSetting(env, "SEARCHSDK_FALLBACK"),
    maxRetries: intSetting(env, "SEARCHSDK_MAX_RETRIES", 0, 5),
    timeoutMs: intSetting(env, "SEARCHSDK_TIMEOUT_MS", 1, 300_000),
    maxChars: intSetting(env, "SEARCHSDK_MAX_CHARS", 1000, 1_000_000) ?? 20_000,
  };
}

const clip = (s: string | null, n: number) => (s === null || s.length <= n ? { text: s, truncated: false } : { text: s.slice(0, n), truncated: true });
const out = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }] });

function failed(e: unknown) {
  if (!(e instanceof SearchError)) return { content: [{ type: "text" as const, text: JSON.stringify({ error: { code: "internal", message: "The call failed unexpectedly." } }, null, 2) }], isError: true };
  const env = e.code === "configuration" && e.field === "keys" && e.provider && ids.includes(e.provider as ProviderId) ? specOf(e.provider as ProviderId).auth.env : null;
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error: {
              code: e.code,
              message: e.message,
              ...(e.provider ? { provider: e.provider } : {}),
              ...(e.status !== undefined ? { status: e.status } : {}),
              ...(e.field ? { field: e.field } : {}),
              ...(typeof (e as { path?: unknown }).path === "string" ? { path: (e as { path?: string }).path } : {}),
              ...(e.retryAfterMs !== undefined ? { retryAfterMs: e.retryAfterMs } : {}),
              ...(env ? { hint: `Set ${env.join(" or ")} in this MCP server's environment.` } : {}),
              ...(e.code === "configuration" && e.field === "provider" ? { hint: "Pass provider, set SEARCHSDK_PROVIDER, or set a provider's key variable (list_providers names them)." } : {}),
            },
            attempts: e.attempts,
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

const common = <R extends SearchResponse | ContentsResponse>(r: R) => ({
  provider: r.provider,
  cost: r.cost,
  requestId: r.requestId,
  latencyMs: r.latencyMs,
  warnings: r.warnings,
  attempts: r.attempts,
});

const providerEnum = z.enum(ids as [ProviderId, ...ProviderId[]]);
const callShape = {
  provider: providerEnum.optional().describe("Provider id. Default: SEARCHSDK_PROVIDER, else the first provider whose key is set."),
  fallback: z.array(providerEnum).max(ids.length).optional().describe("Providers tried next, in order, after a fallback-eligible failure. Default: SEARCHSDK_FALLBACK."),
  timeoutMs: z.number().int().min(1).max(300_000).optional(),
  providerOptions: z.record(z.string(), z.record(z.string(), z.unknown())).optional().describe("Options one provider understands, keyed by provider id."),
};

/** A local server: docs and registry tools plus search and contents with the user's keys. */
export function createLocalServer(options: LocalServerOptions = {}): McpServer {
  const env: Env = options.env ?? process.env;
  const s = settings(env);
  const configured = configuredProviders(env);
  const client = createClient({
    env,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(s.maxRetries !== undefined ? { maxRetries: s.maxRetries } : {}),
    ...(s.timeoutMs !== undefined ? { timeoutMs: s.timeoutMs } : {}),
  });
  const corpus = localCorpus();
  const pick = (kind: "search" | "contents", requested: ProviderId | undefined): ProviderId | undefined =>
    requested ?? s.provider ?? configured.find((id) => specOf(id)[kind] !== undefined);

  const server = new McpServer(
    { name: "searchsdk", version: VERSION },
    {
      instructions: serverInstructions(
        corpus,
        `This local server also runs search and contents through @searchsdk/sdk with this machine's provider keys. Keys found for: ${configured.length ? configured.join(", ") : "none (set a provider's key variable, such as EXA_API_KEY)"}. Each call may be billed by the provider; check cost and attempts in every result.`,
      ),
    },
  );
  registerDocs(server, corpus);

  server.registerTool(
    "search",
    {
      title: "Web search",
      description:
        "Searches the web through one provider (or a fallback chain) with searchSDK. Returns normalized results with cost, warnings and every attempt. The provider may bill the call.",
      inputSchema: z.object({
        query: z.string().min(1).max(2000),
        maxResults: z.number().int().min(1).max(100).optional(),
        includeDomains: z.array(z.string().max(253)).max(1200).optional(),
        excludeDomains: z.array(z.string().max(253)).max(1200).optional(),
        recency: z.enum(["day", "week", "month", "year"]).optional(),
        startDate: z.string().max(10).optional().describe("Inclusive YYYY-MM-DD, by publication date."),
        endDate: z.string().max(10).optional().describe("Inclusive YYYY-MM-DD, by publication date."),
        country: z.string().length(2).optional().describe("ISO 3166-1 alpha-2."),
        language: z.string().length(2).optional().describe("ISO 639-1."),
        depth: z.enum(["fast", "standard", "deep"]).optional(),
        ...callShape,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ query, provider, fallback, providerOptions, ...rest }) => {
      const chosen = pick("search", provider);
      if (!chosen) return failed(new SearchError("configuration", { field: "provider" }));
      try {
        const res = await client.search(query, {
          ...rest,
          provider: chosen,
          fallback: fallback ?? s.fallback,
          ...(providerOptions ? { providerOptions: providerOptions as never } : {}),
        });
        return out({
          ...common(res),
          results: res.results.map((r) => ({
            rank: r.rank,
            title: r.title,
            url: r.url,
            publishedAt: r.publishedAt,
            author: r.author,
            excerpts: r.excerpts.slice(0, 5).map((x) => clip(x, 1000).text),
          })),
        });
      } catch (e) {
        return failed(e);
      }
    },
  );

  server.registerTool(
    "contents",
    {
      title: "Page contents",
      description:
        "Fetches the readable text of web pages through a provider with searchSDK: one page per URL, failures kept. Text is cut at maxChars per page. The provider may bill the call.",
      inputSchema: z.object({
        urls: z.array(z.string().min(1).max(2048)).min(1).max(20),
        maxChars: z.number().int().min(100).max(1_000_000).optional().describe("Characters kept per page. Default: SEARCHSDK_MAX_CHARS or 20000."),
        ...callShape,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ urls, maxChars, provider, fallback, providerOptions, ...rest }) => {
      const chosen = pick("contents", provider);
      if (!chosen) return failed(new SearchError("configuration", { field: "provider" }));
      try {
        const res = await client.contents(urls, {
          ...rest,
          provider: chosen,
          fallback: fallback ?? s.fallback,
          ...(providerOptions ? { providerOptions: providerOptions as never } : {}),
        });
        const limit = maxChars ?? s.maxChars;
        return out({
          ...common(res),
          pages: res.pages.map((p) => {
            const c = clip(p.content, limit);
            return { ...p, content: c.text, ...(c.truncated ? { truncated: true, contentChars: p.content?.length } : {}) };
          }),
        });
      } catch (e) {
        return failed(e);
      }
    },
  );

  return server;
}
