import { createHmac, randomBytes } from 'node:crypto';
import { supportedProviders } from './providers.mjs';

export const limits = Object.freeze({ bodyBytes: 8192, queryLength: 500, keyLength: 512,
  results: 10, responseBytes: 262144, totalMs: 15000, attemptMs: 7000, bodyMs: 3000,
  percentDecodePasses: 8, redactionCharacters: 1024 * 1024 });
const productionOrigins = ['https://searchsdk.dev', 'https://www.searchsdk.dev'];
const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173'];
export function trustedOrigins(environment, development) {
  const origins = new Set(productionOrigins);
  // These are deployment operator configuration, never request Host or forwarding headers.
  for (const name of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
    const host = environment[name];
    if (typeof host === 'string' && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+vercel\.app$/i.test(host)) {
      origins.add(`https://${host.toLowerCase()}`);
    }
  }
  if (development) localOrigins.forEach(origin => origins.add(origin));
  return origins;
}
export function validOrigin(req, origins, development) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || !origins.has(origin)) return false;
  // Host can only narrow an independently trusted Origin, never add an origin.
  if (req.headers.host !== new URL(origin).host) return false;
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return false;
  if (localOrigins.includes(origin)) {
    if (!development || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return false;
  }
  return true;
}
function exact(value, required, optional = []) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    required.every(key => Object.hasOwn(value, key)) &&
    Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
export function validateBody(body) {
  if (!exact(body, ['query', 'limit', 'provider', 'apiKey'], ['fallback'])) return false;
  const credential = value => typeof value === 'string' && value.length >= 1 && value.length <= limits.keyLength && /^[\x21-\x7e]+$/.test(value);
  const provider = value => typeof value === 'string' && (supportedProviders.includes(value) || value === 'serpapi');
  if (typeof body.query !== 'string' || !body.query.trim() || body.query.length > limits.queryLength ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(body.query) || /[\uD800-\uDFFF]/u.test(body.query) ||
      !Number.isInteger(body.limit) || body.limit < 1 || body.limit > limits.results ||
      !provider(body.provider) || !credential(body.apiKey)) return false;
  if (Object.hasOwn(body, 'fallback') && (!exact(body.fallback, ['provider', 'apiKey']) ||
      !provider(body.fallback.provider) || body.fallback.provider === body.provider || !credential(body.fallback.apiKey))) return false;
  return true;
}

// Fixed memory, fail-closed on bucket exhaustion. Raw keys/IPs/queries are never
// retained. HMAC salt changes on cold start; this is not global durable protection.
export function createAbuseGuard({ now = Date.now, maximumActive = 8, maximumRequests = 120,
  perKeyRequests = 12, perKeyActive = 2, maximumBuckets = 512 } = {}) {
  const salt = randomBytes(32);
  const buckets = new Map();
  let active = 0;
  let windowStart = now();
  let requests = 0;
  return {
    enter() {
      const time = now();
      if (time - windowStart >= 60000) { windowStart = time; requests = 0; }
      if (++requests > maximumRequests || active >= maximumActive) return undefined;
      active++;
      let released = false;
      return () => { if (!released) { released = true; active--; } };
    },
    keys(credentials) {
      const time = now();
      for (const [hash, bucket] of buckets) if (!bucket.active && time - bucket.start >= 60000) buckets.delete(hash);
      const hashes = [...new Set(credentials.map(({ provider, apiKey }) => createHmac('sha256', salt).update(provider).update('\0').update(apiKey).digest('hex')))];
      const selected = [];
      for (const hash of hashes) {
        let bucket = buckets.get(hash);
        if (!bucket) {
          if (buckets.size >= maximumBuckets) return undefined;
          bucket = { start: time, requests: 0, active: 0 }; buckets.set(hash, bucket);
        }
        if (time - bucket.start >= 60000) { bucket.start = time; bucket.requests = 0; }
        if (bucket.requests >= perKeyRequests || bucket.active >= perKeyActive) return undefined;
        selected.push(bucket);
      }
      selected.forEach(bucket => { bucket.requests++; bucket.active++; });
      let released = false;
      return () => { if (!released) { released = true; selected.forEach(bucket => bucket.active--); } };
    },
  };
}

export function redactor(keys) {
  const variants = [...new Set(keys.flatMap(key => [key, encodeURIComponent(key),
    new URLSearchParams({ k: key }).toString().slice(2), Buffer.from(key).toString('base64'),
    JSON.stringify(key).slice(1, -1), encodeURIComponent(key).replace(/%[0-9A-F]{2}/g, value => value.toLowerCase()),
    Buffer.from(key).toString('base64url')]))].sort((a, b) => b.length - a.length);
  // Discard the entire field on any credential match. Partial replacement can
  // expose suffixes when primary and fallback credentials overlap.
  const pattern = variants.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const containsCredential = new RegExp(pattern);
  const percentEscape = /%[0-9a-f]{2}/i;
  return value => {
    const text = String(value);
    if (text.length > limits.redactionCharacters || containsCredential.test(text)) return '•••';
    let decoded = text;
    for (let pass = 0; pass < limits.percentDecodePasses && percentEscape.test(decoded); pass++) {
      // Credentials are printable ASCII. Decode individual bytes, tolerating
      // unrelated malformed escapes, so partial/mixed-case encodings cannot
      // defeat an all-or-nothing decodeURIComponent call. Never expose this
      // decoded representation or use it as a navigation destination.
      decoded = decoded.replace(/%([0-9a-f]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
      if (containsCredential.test(decoded)) return '•••';
    }
    // Deep encodings fail closed even when they might be innocent. Each pass
    // shrinks or preserves the field size; depth and input length bound work.
    if (percentEscape.test(decoded)) return '•••';
    return text;
  };
}
export function sanitizeResponse(response, redact) {
  const text = (value, maximum) => typeof value === 'string' ? redact(value).slice(0, maximum) : undefined;
  const safeUrl = value => {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || value.length > 4096) return undefined;
    // Inspect both the SDK-preserved source spelling and WHATWG URL
    // normalization (notably hostname canonicalization). Keep the original
    // spelling only after both pass; never return a partially redacted URL.
    if ([value, url.href].some(candidate => redact(candidate).includes('•••'))) return undefined;
    return value;
  };
  const results = response.results.flatMap(result => {
    const url = safeUrl(result.url);
    const sourceUrl = safeUrl(result.provenance.sourceUrl);
    if (!url || !sourceUrl) return [];
    return [{ url, ...(result.title === undefined ? {} : { title: text(result.title, 512) }),
      ...(result.snippet === undefined ? {} : { snippet: text(result.snippet, 4000) }),
      ...(result.highlights === undefined ? {} : { highlights: result.highlights.slice(0, 5).map(value => text(value, 1000)) }),
      ...(result.score === undefined ? {} : { score: result.score }),
      provenance: { provider: result.provenance.provider, sourceUrl, retrievedAt: result.provenance.retrievedAt,
        ...(result.provenance.requestId === undefined ? {} : { requestId: text(result.provenance.requestId, 128) }) } }];
  });
  return { provider: response.provider, results, usage: response.usage,
    warnings: response.warnings, attempts: response.attempts };
}
