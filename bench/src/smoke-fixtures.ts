// SYNTHETIC RECORDED-SHAPE FIXTURES for `bench smoke` without --live. Each
// body follows the response shape in the provider's public API reference
// (the sources listed in registry/providers/*.json), with invented values.
// They show that the smoke check reads and reports field paths; they are not
// provider responses and never verify a spec against a live API.

export type FixtureShapes = Record<string, (req: { url: URL; body: unknown }) => { status: number; body: unknown; headers?: Record<string, string> }>;

const results = (n: number, make: (i: number) => Record<string, unknown>) => Array.from({ length: n }, (_, i) => make(i));

/** Documented shapes for the four first-run providers' search and contents endpoints, keyed by "<host><path>". */
export const SHAPES: FixtureShapes = {
  "api.exa.ai/search": () => ({
    status: 200,
    headers: { "x-request-id": "fixture-exa-1" },
    body: {
      requestId: "fixture-exa-1",
      results: results(10, (i) => ({
        id: `https://exa-${i}.example/page`, url: `https://exa-${i}.example/page`, title: `Synthetic Exa result ${i + 1}`,
        highlights: [`Synthetic highlight ${i + 1}.`], ...(i % 2 ? { publishedDate: "2026-11-01T00:00:00.000Z" } : {}), author: i % 3 ? null : "A. Writer",
        favicon: `https://exa-${i}.example/favicon.ico`, ...(i % 2 ? {} : { image: `https://exa-${i}.example/image.png` }),
      })),
      costDollars: { total: 0.007 },
      searchTime: 321,
    },
  }),
  "api.exa.ai/contents": ({ body }) => {
    const url = ((body as { urls?: string[] }).urls ?? [])[0]!;
    return { status: 200, body: { requestId: "fixture-exa-2", results: [{ id: url, url, title: "Synthetic page", text: "Synthetic page text.", publishedDate: "2026-10-01T00:00:00.000Z", author: "A. Writer" }], statuses: [{ id: url, status: "success" }], costDollars: { total: 0.001 } } };
  },
  "api.context.dev/v1/web/search": ({ body }) => ({
    status: 200,
    body: {
      query: (body as { query?: string }).query,
      results: results(10, (i) => ({ url: `https://ctx-${i}.example/`, title: `Synthetic Context result ${i + 1}`, description: `Synthetic description ${i + 1}.`, relevance: "high" })),
      request_id: "fixture-ctx-1", partial: false, key_metadata: { credits_consumed: 1 },
    },
  }),
  "api.context.dev/v1/web/scrape": ({ body }) => {
    const url = (body as { url?: string }).url!;
    return { status: 200, body: { url, markdown: { requested: true, success: true, data: "# Synthetic page" }, metadata: { sourceUrl: url, finalUrl: url, title: "Synthetic page", publishedTime: "2026-10-01T00:00:00Z", author: "A. Writer" }, request_id: "fixture-ctx-2", key_metadata: { credits_consumed: 1 } } };
  },
  "api.firecrawl.dev/v2/search": () => ({
    status: 200,
    body: { success: true, data: { web: results(10, (i) => ({ url: `https://fc-${i}.example/`, title: `Synthetic Firecrawl result ${i + 1}`, description: `Synthetic description ${i + 1}.`, position: i + 1 })) }, id: "fixture-fc-1", creditsUsed: 2 },
  }),
  "api.firecrawl.dev/v2/scrape": ({ body }) => {
    const url = (body as { url?: string }).url!;
    return { status: 200, body: { success: true, data: { markdown: "# Synthetic page", metadata: { title: "Synthetic page", sourceURL: url, url, statusCode: 200 } } } };
  },
  "api.search.tinyfish.ai/": ({ url }) => ({
    status: 200,
    body: {
      query: url.searchParams.get("query"), page: 0, total_results: 10,
      results: results(10, (i) => ({
        position: i + 1, site_name: `tf-${i}.example`, title: `Synthetic TinyFish result ${i + 1}`, snippet: `Synthetic snippet ${i + 1}.`, url: `https://tf-${i}.example/`,
        // Documented as present for news results and some web results (date), research papers (authors) and news (publisher).
        ...(i < 3 ? { date: "2026-11-20" } : {}), ...(i === 4 ? { authors: ["A. Writer", "B. Writer"] } : {}), ...(i < 2 ? { publisher: "Synthetic News" } : {}),
      })),
    },
  }),
  "api.fetch.tinyfish.ai/": ({ body }) => {
    const url = ((body as { urls?: string[] }).urls ?? [])[0]!;
    return { status: 200, body: { results: [{ url, final_url: url, title: "Synthetic page", text: "# Synthetic page", published_date: "2026-10-01", author: "A. Writer" }], errors: [] } };
  },
};

/** A fetch that answers provider calls from shapes; records each call's URL and whether an auth header was sent (never its value). */
export function shapeFetch(shapes: FixtureShapes = SHAPES, seen: { url: string; authSent: boolean }[] = []): typeof fetch {
  return (async (input: unknown, init: RequestInit = {}) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    const h = new Headers(init.headers ?? {});
    seen.push({ url: `${url.origin}${url.pathname}`, authSent: h.has("x-api-key") || h.has("authorization") });
    const shape = shapes[`${url.host}${url.pathname}`];
    if (!shape) return new Response(JSON.stringify({ error: "no fixture" }), { status: 404 });
    let body: unknown = null;
    try { body = init.body ? JSON.parse(String(init.body)) : null; } catch { body = null; }
    const r = shape({ url, body });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json", ...(r.headers ?? {}) } });
  }) as typeof fetch;
}
