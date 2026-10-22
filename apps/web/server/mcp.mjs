import { createHmac, randomBytes } from 'node:crypto';
import { loadMcpCatalog, object, mcpTools, validToolArguments, callMcpTool } from './mcp-data.mjs';

// Sources: https://modelcontextprotocol.io/specification/2026-07-28/
// Modern protocol only: no initialize handshake, sessions, GET stream, or DELETE.
export const protocolVersion = '2026-07-28';
export const mcpLimits = Object.freeze({ bodyBytes: 16384, responseBytes: 524288, headerBytes: 8192,
  bodyMs: 3000, totalMs: 5000, maximumActive: 12, maximumBuckets: 512,
  clientBurst: 30, clientPerMinute: 60, globalBurst: 120, globalPerMinute: 240 });
const prefix = 'io.modelcontextprotocol/';
const serverInfo = Object.freeze({ name: 'searchsdk-public-docs', title: 'searchSDK documentation', version: '1.0.0', websiteUrl: 'https://searchsdk.dev' });
const instructions = 'Public read-only searchSDK documentation, provider capability boundaries, and code examples. ' +
  'Search documentation with search_docs, then retrieve exact slugs with get_doc. ' +
  'Examples are text and are never executed. No provider calls, API keys, billing, caller URLs, or arbitrary code are accepted. ' +
  'Protocol 2026-07-28 only; supply per-request metadata and matching HTTP headers. ' +
  'Rate limits are best-effort per running instance and can be shared by clients behind the same proxy.';
class McpError extends Error {
  constructor(status, code, message, data) { super(message); this.status = status; this.code = code; this.data = data; }
}
const invalid = message => new McpError(400, -32602, message);
const mismatch = () => new McpError(400, -32020, 'Required MCP headers are missing, malformed, or do not match the request body. Supported protocol: 2026-07-28.');
const own = (value, key) => Object.hasOwn(value, key);
const exact = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.includes(key));

/** Fixed-memory, synchronous admission/release: no awaits inside the critical section.
 * Only salted hashes of socket addresses are retained. Forwarding headers are not
 * trusted: a reverse proxy can cause multiple clients to share a bucket. Neither
 * cold starts nor multiple instances share these limits; use edge limits for that.
 */
export function createMcpGuard({ now = Date.now, maximumActive = mcpLimits.maximumActive,
  maximumBuckets = mcpLimits.maximumBuckets, clientBurst = mcpLimits.clientBurst,
  clientPerMinute = mcpLimits.clientPerMinute, globalBurst = mcpLimits.globalBurst,
  globalPerMinute = mcpLimits.globalPerMinute } = {}) {
  const salt = randomBytes(32);
  const buckets = new Map();
  const global = { tokens: globalBurst, at: now() };
  let active = 0;
  function refill(bucket, burst, perMinute, time) {
    bucket.tokens = Math.min(burst, bucket.tokens + Math.max(0, time - bucket.at) * perMinute / 60000);
    bucket.at = time;
  }
  return Object.freeze({ enter(address) {
    const time = now();
    refill(global, globalBurst, globalPerMinute, time);
    if (active >= maximumActive) return { retryAfter: 1 };
    if (global.tokens < 1) return { retryAfter: Math.max(1, Math.ceil((1 - global.tokens) * 60 / globalPerMinute)) };
    // Bound cleanup work to the bounded map, and expire only fully refillable buckets.
    for (const [key, bucket] of buckets) if (time - bucket.at >= Math.max(60000, clientBurst * 60000 / clientPerMinute)) buckets.delete(key);
    const key = createHmac('sha256', salt).update(address ?? 'unknown').digest('hex');
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maximumBuckets) return { retryAfter: 60 };
      bucket = { tokens: clientBurst, at: time }; buckets.set(key, bucket);
    }
    refill(bucket, clientBurst, clientPerMinute, time);
    if (bucket.tokens < 1) return { retryAfter: Math.max(1, Math.ceil((1 - bucket.tokens) * 60 / clientPerMinute)) };
    global.tokens--; bucket.tokens--; active++;
    let released = false;
    return { release() { if (!released) { released = true; active--; } } };
  } });
}

function endpointPolicy(environment, development) {
  const origins = new Set(['https://searchsdk.dev', 'https://www.searchsdk.dev']);
  const hosts = new Set(['searchsdk.dev', 'www.searchsdk.dev']);
  for (const name of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
    const host = environment[name];
    if (typeof host === 'string' && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+vercel\.app$/i.test(host)) {
      hosts.add(host.toLowerCase()); origins.add(`https://${host.toLowerCase()}`);
    }
  }
  // Exact operator-configured browser clients, never arbitrary reflected origins.
  for (const value of (environment.MCP_ALLOWED_ORIGINS ?? '').split(',')) {
    try { const url = new URL(value); if (url.origin === value && url.protocol === 'https:') origins.add(value); } catch { /* Invalid config grants no access. */ }
  }
  if (development) for (const host of ['localhost:5173', '127.0.0.1:5173', '[::1]:5173']) {
    hosts.add(host); origins.add(`http://${host}`);
  }
  return { origins, hosts };
}
function validateEndpoint(req, policy, development) {
  const host = req.headers.host;
  if (typeof host !== 'string' || !policy.hosts.has(host.toLowerCase())) throw new McpError(403, -32600, 'Request host is not allowed.');
  if (development && /^(?:localhost|127\.0\.0\.1|\[::1\]):5173$/i.test(host) &&
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) throw new McpError(403, -32600, 'Local endpoint requires a loopback connection.');
  const origin = req.headers.origin;
  if (origin !== undefined && (typeof origin !== 'string' || !policy.origins.has(origin))) throw new McpError(403, -32600, 'Request origin is not allowed.');
}
function baseHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}
function errorBody(error, id) {
  return { jsonrpc: '2.0', ...(id !== undefined ? { id } : {}), error: {
    code: error.code, message: error.message, ...(error.data !== undefined ? { data: error.data } : {}),
  } };
}
function send(res, status, body, id) {
  if (res.destroyed || res.writableEnded) return;
  let serialized = body === undefined ? undefined : JSON.stringify(body);
  if (serialized !== undefined && Buffer.byteLength(serialized) > mcpLimits.responseBytes) {
    status = 500;
    serialized = JSON.stringify(errorBody(new McpError(500, -32603, 'Public response exceeds the endpoint limit.'), id));
  }
  res.statusCode = status;
  // An early rejection can leave an unread/incomplete request body. Close the
  // HTTP/1 connection after flushing the error so it cannot be reused with
  // ambiguous framing or keep an upload open past the endpoint's deadline.
  if (status >= 400) res.setHeader('Connection', 'close');
  if (serialized !== undefined) res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(serialized);
}
function acceptsBoth(header) {
  if (typeof header !== 'string') return false;
  const accepted = new Set(header.split(',').flatMap(value => {
    const [type, ...parameters] = value.trim().toLowerCase().split(';').map(part => part.trim());
    let quality = 1;
    for (const parameter of parameters) if (parameter.startsWith('q=')) {
      if (!/^q=(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(parameter)) return [];
      quality = Number(parameter.slice(2));
    }
    return quality > 0 ? [type] : [];
  }));
  return accepted.has('application/json') && accepted.has('text/event-stream');
}
function readBody(req, signal) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    const clean = () => {
      clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('error', error); req.off('aborted', aborted);
      signal.removeEventListener('abort', timeout);
    };
    const fail = cause => { clean(); req.pause(); req.once('error', () => {}); reject(cause); };
    const error = () => fail(new McpError(400, -32600, 'Request stream failed.'));
    const aborted = () => fail(new McpError(400, -32600, 'Request was cancelled.'));
    const timeout = () => fail(new McpError(408, -32600, 'Request deadline exceeded.'));
    const timer = setTimeout(timeout, mcpLimits.bodyMs);
    const data = chunk => {
      size += Buffer.byteLength(chunk);
      if (size > mcpLimits.bodyBytes) return fail(new McpError(413, -32600, 'Request body is too large.'));
      chunks.push(Buffer.from(chunk));
    };
    const end = () => {
      clean();
      try { resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { reject(new McpError(400, -32700, 'Invalid UTF-8 JSON.')); }
    };
    if (signal.aborted) return timeout();
    req.on('data', data); req.once('end', end); req.once('error', error); req.once('aborted', aborted);
    signal.addEventListener('abort', timeout, { once: true });
  });
}
function decodeName(value) {
  if (typeof value !== 'string') throw mismatch();
  if (value.startsWith('=?base64?') && value.endsWith('?=')) {
    const encoded = value.slice(9, -2);
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw mismatch();
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.toString('base64') !== encoded) throw mismatch();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw mismatch(); }
  }
  if (!/^[\x20-\x7e\t]*$/.test(value) || value.trim() !== value) throw mismatch();
  return value;
}
function validateMessage(body, req) {
  if (!exact(body, ['jsonrpc', 'id', 'method', 'params']) || body.jsonrpc !== '2.0' ||
      typeof body.method !== 'string' || !body.method || body.method.length > 160 ||
      own(body, 'id') && !(typeof body.id === 'string' && body.id.length <= 256 || Number.isSafeInteger(body.id)) ||
      body.params !== undefined && !object(body.params)) throw new McpError(400, -32600, 'Expected one JSON-RPC request or notification.');
  // No client-to-server notifications are defined for modern HTTP. Reject them
  // with an HTTP error and no JSON-RPC response (notifications have no response).
  if (!own(body, 'id')) return false;
  const params = body.params;
  const meta = params?._meta;
  const version = meta?.[`${prefix}protocolVersion`];
  if (req.headers['mcp-protocol-version'] === undefined || req.headers['mcp-method'] === undefined) throw mismatch();
  // Missing body metadata is InvalidParams, rather than a header mismatch.
  if (!object(meta) || typeof version !== 'string' || !object(meta[`${prefix}clientCapabilities`])) throw invalid('Required per-request protocol metadata is missing or invalid.');
  if (meta[`${prefix}clientInfo`] !== undefined && (!object(meta[`${prefix}clientInfo`]) ||
      typeof meta[`${prefix}clientInfo`].name !== 'string' || typeof meta[`${prefix}clientInfo`].version !== 'string')) throw invalid('Invalid clientInfo metadata.');
  if (req.headers['mcp-protocol-version'] !== version || req.headers['mcp-method'] !== body.method) throw mismatch();
  if (['tools/call', 'resources/read', 'prompts/get'].includes(body.method)) {
    const name = body.method === 'resources/read' ? params.uri : params.name;
    if (typeof name !== 'string' || decodeName(req.headers['mcp-name']) !== name) throw mismatch();
  }
  if (version !== protocolVersion) throw new McpError(400, -32022, 'Unsupported protocol version.', { supported: [protocolVersion], requested: version });
  return true;
}
const cache = { ttlMs: 300000, cacheScope: 'public' };
const result = value => ({ resultType: 'complete', ...value, _meta: { [`${prefix}serverInfo`]: serverInfo } });
async function dispatch(body, catalog) {
  const params = body.params;
  const only = keys => { if (!exact(params, ['_meta', ...keys])) throw invalid('Unsupported request parameters.'); };
  if (body.method === 'server/discover') {
    only([]);
    return result({ supportedVersions: [protocolVersion], capabilities: { tools: {}, resources: {},
      extensions: { [`${prefix}skills`]: {} } }, instructions, ...cache });
  }
  if (body.method === 'tools/list') {
    only(['cursor']);
    if (params.cursor !== undefined) throw invalid('Invalid cursor.');
    return result({ tools: mcpTools, ...cache });
  }
  if (body.method === 'resources/templates/list') {
    only(['cursor']);
    if (params.cursor !== undefined) throw invalid('Invalid cursor.');
    return result({ resourceTemplates: [], ...cache });
  }
  if (body.method === 'resources/list') {
    only(['cursor']);
    try { return result({ ...(await catalog()).page('resources', params.cursor), ...cache }); }
    catch (error) { if (error.message === 'Invalid cursor.') throw invalid('Invalid cursor.'); throw error; }
  }
  if (body.method === 'skills/list') {
    only(['cursor']);
    if (params.cursor !== undefined) throw invalid('Invalid cursor.');
    return result({ skills: (await catalog()).skills(), ...cache });
  }
  if (body.method === 'skills/get') {
    only(['uri']);
    if (typeof params.uri !== 'string' || params.uri.length > 1024) throw invalid('Invalid skill URI.');
    const skill = (await catalog()).skill(params.uri);
    if (!skill) throw invalid('Skill not found.');
    return result({ skill, ...cache });
  }
  if (body.method === 'resources/read') {
    only(['uri']);
    if (typeof params.uri !== 'string' || params.uri.length > 1024) throw invalid('Invalid resource URI.');
    const contents = (await catalog()).read(params.uri);
    if (!contents) throw invalid('Resource not found. Only exact bundled public resource URIs are readable.');
    return result({ contents: [contents], ...cache });
  }
  if (body.method === 'tools/call') {
    only(['name', 'arguments']);
    if (!mcpTools.some(tool => tool.name === params.name)) throw invalid('Unknown tool.');
    if (!validToolArguments(params.name, params.arguments ?? {})) return result({ isError: true,
      content: [{ type: 'text', text: 'Invalid tool arguments. Follow the inputSchema from tools/list; credentials, URLs to fetch, and extra fields are not accepted.' }] });
    const data = await catalog();
    try {
      const structuredContent = callMcpTool(data, params.name, params.arguments ?? {});
      return result({ isError: false, structuredContent, content: [{ type: 'text', text: JSON.stringify(structuredContent) }] });
    } catch (error) {
      // Known local lookup failures are actionable tool errors; never reflect
      // request values or unexpected exception messages.
      return result({ isError: true, content: [{ type: 'text', text: error.message === 'Invalid cursor.' ? 'Invalid cursor. Start the list again.' : 'Public record not found. Use search or list to find an exact identifier.' }] });
    }
  }
  throw new McpError(404, -32601, 'Method not found. This server supports protocol 2026-07-28; use server/discover with per-request metadata.');
}

/** The artifact/catalog hooks are server-only test injection, never request inputs. */
export function createMcpHandler({ development = false, environment = process.env,
  artifact, catalog: suppliedCatalog, guard = createMcpGuard(), totalMs = mcpLimits.totalMs } = {}) {
  const policy = endpointPolicy(environment, development);
  let catalogPromise;
  const catalog = () => catalogPromise ??= (suppliedCatalog ? Promise.resolve(suppliedCatalog) : loadMcpCatalog(artifact));
  return async function mcp(req, res) {
    baseHeaders(res);
    let release;
    let id;
    const controller = new AbortController();
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    req.once('aborted', disconnected); res.once('close', disconnected);
    const timer = setTimeout(() => controller.abort(), totalMs);
    try {
      validateEndpoint(req, policy, development);
      if (req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Retry-After');
      }
      if (!['/mcp', '/api/mcp'].includes(req.url)) throw new McpError(404, -32600, 'Unknown MCP endpoint.');
      if (req.method === 'OPTIONS') {
        if (req.headers['access-control-request-method'] && req.headers['access-control-request-method'] !== 'POST') throw new McpError(405, -32600, 'Use POST.');
        const requested = req.headers['access-control-request-headers'];
        const allowed = ['accept', 'content-type', 'mcp-protocol-version', 'mcp-method', 'mcp-name'];
        if (requested !== undefined && (typeof requested !== 'string' || requested.split(',').some(name => !allowed.includes(name.trim().toLowerCase())))) throw new McpError(400, -32600, 'Unsupported preflight headers.');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', allowed.join(', '));
        return send(res, 204);
      }
      if (req.method !== 'POST') throw new McpError(405, -32600, 'Use POST. GET streams and DELETE sessions are not supported by protocol 2026-07-28.');
      const admission = guard.enter(req.socket.remoteAddress);
      if (!admission.release) {
        res.setHeader('Retry-After', String(admission.retryAfter));
        throw new McpError(429, -31029, 'Per-instance request limit reached. Retry later.');
      }
      release = admission.release;
      if (req.rawHeaders.length > 100 || Buffer.byteLength(req.rawHeaders.join('')) > mcpLimits.headerBytes) throw new McpError(431, -32600, 'Request headers are too large.');
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '') ||
          req.headers['content-encoding'] !== undefined && req.headers['content-encoding'] !== 'identity') throw new McpError(415, -32600, 'Use uncompressed UTF-8 application/json.');
      if (!acceptsBoth(req.headers.accept)) throw new McpError(406, -32600, 'Accept must include application/json and text/event-stream.');
      if (req.headers.authorization !== undefined || req.headers.cookie !== undefined) throw new McpError(400, -32600, 'This public endpoint does not accept credentials or cookies.');
      const length = req.headers['content-length'];
      if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > mcpLimits.bodyBytes)) throw new McpError(413, -32600, 'Request body is too large.');
      const body = await readBody(req, controller.signal);
      if (object(body) && (typeof body.id === 'string' && body.id.length <= 256 || Number.isSafeInteger(body.id))) id = body.id;
      if (!validateMessage(body, req)) return send(res, 400);
      // Race slow disk/cold-start loading against the same total deadline. The
      // only residual work is one bounded local read; no remote effects exist.
      let abort;
      const timeout = new Promise((_, reject) => {
        abort = () => reject(new McpError(408, -32600, 'Request deadline exceeded.'));
        controller.signal.addEventListener('abort', abort, { once: true });
        if (controller.signal.aborted) abort();
      });
      try {
        const response = await Promise.race([dispatch(body, catalog), timeout]);
        if (!controller.signal.aborted) send(res, 200, { jsonrpc: '2.0', id, result: response }, id);
      } finally { controller.signal.removeEventListener('abort', abort); }
    } catch (cause) {
      const error = cause instanceof McpError ? cause : new McpError(503, -32603, 'Public documentation is temporarily unavailable.');
      if (error.status === 405) res.setHeader('Allow', 'POST, OPTIONS');
      send(res, error.status, errorBody(error, id), id);
    } finally {
      clearTimeout(timer); release?.(); req.off('aborted', disconnected); res.off('close', disconnected);
    }
  };
}
