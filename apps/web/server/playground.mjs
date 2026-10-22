import { loadSdk, guardedTransport } from './providers.mjs';
import { limits, trustedOrigins, validOrigin, validateBody, createAbuseGuard, redactor, sanitizeResponse } from './security.mjs';

const messages = Object.freeze({ invalid_request: 'Invalid playground request.', forbidden: 'Request origin is not allowed.',
  method_not_allowed: 'Use POST for playground search.', payload_too_large: 'Request body is too large.',
  unsupported_option: 'This provider requires URL credentials and is unavailable in this playground.',
  rate_limit: 'Playground or provider request limit reached. Try again later.',
  auth: 'Provider authentication or account authorization failed.', network: 'Search transport failed.',
  unavailable: 'Search is temporarily unavailable.', attempt_timeout: 'Search attempt exceeded its time budget.',
  timeout: 'Search exceeded its total time budget.', aborted: 'Search was cancelled.',
  invalid_response: 'Provider returned an invalid search response.', provider_error: 'Provider rejected the search request.',
  configuration: 'Search is temporarily unavailable.' });
class RequestError extends Error {
  constructor(code, status) { super(messages[code]); this.code = code; this.status = status; }
}
function scrub(value, redact) {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(item => scrub(item, redact));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item, redact)]));
  return value;
}
function send(res, status, body, redact = value => value) {
  if (res.destroyed || res.writableEnded) return;
  let serialized = JSON.stringify(scrub(body, redact));
  if (Buffer.byteLength(serialized) > limits.responseBytes) {
    status = 502;
    serialized = JSON.stringify(scrub({ ok: false, error: { code: 'invalid_response', message: messages.invalid_response, attempts: [] } }, redact));
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (status === 405) res.setHeader('Allow', 'POST');
  res.end(serialized);
}
async function readBody(req, signal) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    const cleanup = () => {
      clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('error', error);
      signal.removeEventListener('abort', abort);
    };
    const fail = cause => {
      cleanup(); req.pause();
      // An aborted IncomingMessage can emit ECONNRESET after its aborted event.
      // Consume that expected transport error without logging request contents.
      req.once('error', () => {});
      reject(cause);
    };
    const error = () => fail(new RequestError('aborted', 499));
    const abort = () => fail(new RequestError('timeout', 408));
    const timer = setTimeout(() => fail(new RequestError('timeout', 408)), limits.bodyMs);
    const data = chunk => {
      received += Buffer.byteLength(chunk);
      if (received > limits.bodyBytes) { fail(new RequestError('payload_too_large', 413)); return; }
      chunks.push(Buffer.from(chunk));
    };
    const end = () => {
      cleanup();
      try { resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { reject(new RequestError('invalid_request', 400)); }
    };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    req.on('data', data); req.once('end', end); req.once('error', error);
  });
}

/** Dependency injection is server-only and used by fixture tests, never request data. */
export function createPlaygroundHandler({ development = false, environment = process.env,
  upstream = globalThis.fetch, sdkDirectory, abuse = createAbuseGuard(),
  totalMs = limits.totalMs, attemptMs = limits.attemptMs } = {}) {
  const origins = trustedOrigins(environment, development);
  // Lazy import permits rejection of malformed/cross-origin requests before SDK work.
  let sdkPromise;
  return async function playground(req, res) {
    let release;
    let releaseKeys;
    let redact = value => value;
    const controller = new AbortController();
    const deadline = performance.now() + totalMs;
    let expired = false;
    const timer = setTimeout(() => { expired = true; controller.abort(); }, totalMs);
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    req.once('aborted', disconnected); res.once('close', disconnected);
    try {
      if (req.url !== '/api/playground/search') throw new RequestError('invalid_request', 400);
      if (req.method !== 'POST') throw new RequestError('method_not_allowed', 405);
      if (!validOrigin(req, origins, development) || req.headers['x-searchsdk-playground'] !== '1') throw new RequestError('forbidden', 403);
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '') ||
          req.headers['content-encoding'] !== undefined && req.headers['content-encoding'] !== 'identity' ||
          req.headers.cookie || req.headers.authorization) throw new RequestError('invalid_request', 400);
      if (req.rawHeaders.length > 100 || Buffer.byteLength(req.rawHeaders.join('')) > 8192) throw new RequestError('invalid_request', 400);
      const length = req.headers['content-length'];
      if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > limits.bodyBytes)) throw new RequestError('payload_too_large', 413);
      release = abuse.enter();
      if (!release) throw new RequestError('rate_limit', 429);
      const body = await readBody(req, controller.signal);
      if (!validateBody(body)) throw new RequestError('invalid_request', 400);
      const credentials = [body, ...(body.fallback ? [body.fallback] : [])];
      redact = redactor(credentials.map(item => item.apiKey));
      if (credentials.some(item => item.provider === 'serpapi')) throw new RequestError('unsupported_option', 400);
      releaseKeys = abuse.keys(credentials);
      if (!releaseKeys) throw new RequestError('rate_limit', 429);
      const sdk = await (sdkPromise ??= loadSdk(sdkDirectory));
      if (controller.signal.aborted || performance.now() >= deadline) throw new RequestError('timeout', 504);
      const providers = credentials.map(({ provider, apiKey }) => sdk.factories[provider]({ apiKey,
        fetch: guardedTransport(provider, upstream, sdk.SearchError) }));
      const search = sdk.createSearch({ provider: providers[0], fallback: providers.slice(1),
        timeoutMs: Math.max(1, Math.floor(deadline - performance.now())), attemptTimeoutMs: attemptMs,
        retry: { maxRetries: 0 } });
      const response = await search.web.search({ query: body.query.replace(/\s+/gu, ' ').trim(), limit: body.limit }, { signal: controller.signal });
      send(res, 200, { ok: true, response: sanitizeResponse(response, redact) }, redact);
    } catch (cause) {
      const code = expired ? 'timeout' : Object.hasOwn(messages, cause?.code) ? cause.code : controller.signal.aborted ? 'aborted' : 'unavailable';
      const status = cause instanceof RequestError ? cause.status : code === 'auth' ? 401 : code === 'rate_limit' ? 429 :
        code === 'timeout' || code === 'attempt_timeout' ? 504 : code === 'aborted' ? 499 : 502;
      // Attempts are SDK records with no provider content; project fields explicitly.
      const attempts = Array.isArray(cause?.attempts) ? cause.attempts.slice(0, 2).map(attempt => ({
        provider: attempt.provider, startedAt: attempt.startedAt, durationMs: attempt.durationMs, outcome: attempt.outcome,
        ...(Object.hasOwn(messages, attempt.code) ? { code: attempt.code } : {}),
        ...(Number.isInteger(attempt.status) ? { status: attempt.status } : {}),
        ...(Number.isFinite(attempt.retryAfterMs) ? { retryAfterMs: Math.min(attempt.retryAfterMs, 86400000) } : {}),
      })) : [];
      send(res, status, { ok: false, error: { code, message: messages[code], attempts } }, redact);
    } finally {
      clearTimeout(timer); req.off('aborted', disconnected); res.off('close', disconnected);
      releaseKeys?.(); release?.();
    }
  };
}
