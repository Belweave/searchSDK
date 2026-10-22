// Server-only normalized adapters. No native clients or caller-controlled endpoints.
export const providerEndpoints = Object.freeze({
  context: ['https://api.context.dev/v1/web/search', 'POST'],
  tinyfish: ['https://api.search.tinyfish.ai/', 'GET'],
  exa: ['https://api.exa.ai/search', 'POST'],
  tavily: ['https://api.tavily.com/search', 'POST'],
  brave: ['https://api.search.brave.com/res/v1/web/search', 'GET'],
  perplexity: ['https://api.perplexity.ai/search', 'POST'],
  parallel: ['https://api.parallel.ai/v1/search', 'POST'],
  linkup: ['https://api.linkup.so/v1/search', 'POST'],
  firecrawl: ['https://api.firecrawl.dev/v2/search', 'POST'],
  you: ['https://ydc-index.io/v1/search', 'POST'],
  serper: ['https://google.serper.dev/search', 'POST'],
  valyu: ['https://api.valyu.ai/v1/search', 'POST'],
});
export const supportedProviders = Object.freeze(Object.keys(providerEndpoints));

// Compiled SDK stays outside the browser bundle. Build Output preserves this layout
// inside the .func directory, so runtime never imports from a workspace symlink.
const defaultDirectory = new URL('../../../packages/sdk/dist/', import.meta.url);
export async function loadSdk(directory = defaultDirectory) {
  const core = await import(new URL('index.js', directory).href);
  const factories = Object.fromEntries(await Promise.all(supportedProviders.map(async id => {
    const module = await import(new URL(`${id}.js`, directory).href);
    return [id, module[id]];
  })));
  return { ...core, factories };
}

const upstreamMaximum = 1024 * 1024;
// One exact provider endpoint per transport; redirects never reach a second host.
export function guardedTransport(provider, upstream, SearchError) {
  return async (input, init = {}) => {
    const url = new URL(input);
    const [endpoint, method] = providerEndpoints[provider] ?? [];
    if (`${url.origin}${url.pathname}` !== endpoint || url.username || url.password ||
        url.hash || (init.method ?? 'GET') !== method ||
        [...url.searchParams.keys()].some(key => !({ tinyfish: ['query', 'domain_type', 'page'],
          brave: ['q', 'count', 'extra_snippets'] }[provider] ?? []).includes(key))) {
      throw new SearchError('configuration');
    }
    let response;
    try {
      response = await upstream(url, { ...init, redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!(response instanceof Response) || response.redirected || response.status >= 300 && response.status < 400 ||
          response.url && response.url !== url.href) throw new SearchError('invalid_response');
      if (!response.ok) {
        // SDK maps status only. Strip all upstream error bodies and headers except Retry-After.
        void response.body?.cancel().catch(() => {});
        return new Response(null, { status: response.status, headers: response.headers.has('retry-after')
          ? { 'retry-after': response.headers.get('retry-after').slice(0, 128) } : {} });
      }
      const length = response.headers.get('content-length');
      if (length && /^\d+$/.test(length) && Number(length) > upstreamMaximum) throw new SearchError('invalid_response');
      const reader = response.body?.getReader();
      let size = 0;
      const cancel = () => { void reader?.cancel().catch(() => {}); };
      init.signal?.addEventListener('abort', cancel, { once: true });
      const stream = new ReadableStream({
        async pull(controller) {
          try {
            if (init.signal?.aborted) throw new SearchError('aborted');
            const next = await reader?.read();
            if (!next || next.done) { controller.close(); init.signal?.removeEventListener('abort', cancel); return; }
            size += next.value.byteLength;
            if (size > upstreamMaximum) throw new SearchError('invalid_response');
            controller.enqueue(next.value);
          } catch {
            cancel(); init.signal?.removeEventListener('abort', cancel);
            controller.error(new SearchError('invalid_response'));
          }
        },
        cancel() { cancel(); init.signal?.removeEventListener('abort', cancel); },
      });
      return new Response(stream, { status: response.status, headers: { 'Content-Type': 'application/json' } });
    } catch {
      try { void response?.body?.cancel().catch(() => {}); } catch { /* Locked body. */ }
      throw new SearchError('network');
    }
  };
}
