// Deliberately synthetic; no network, credentials, rankings, or live availability claims.
const row = { url: 'https://example.org/reference', link: 'https://example.org/reference',
  title: 'Synthetic reference', name: 'Synthetic reference', description: 'Fixture content',
  snippet: 'Fixture content', content: 'Fixture content', highlights: ['Fixture content'],
  excerpts: ['Fixture content'] };

export function fixtureBody(id) {
  switch (id) {
    case 'brave': return { web: { results: [row] } };
    case 'firecrawl': return { success: true, data: { web: [row] }, creditsUsed: 1 };
    case 'you': return { results: { web: [row] } };
    case 'serper': return { organic: [row], credits: 1 };
    case 'serpapi': return { search_metadata: { status: 'Success' }, organic_results: [row] };
    case 'valyu': return { success: true, results: [row], total_deduction_dollars: 0.001 };
    case 'searxng': return { query: 'fixture', results: [row], unresponsive_engines: [] };
    default: return { results: [row] };
  }
}

export function fixtureFetch(id, scenario = 'success') {
  return async () => {
    if (scenario === 'rate_limit') return Response.json({ error: 'fixture' }, { status: 429 });
    if (scenario === 'invalid_response') return Response.json({ unexpected: true });
    return Response.json(fixtureBody(id));
  };
}
