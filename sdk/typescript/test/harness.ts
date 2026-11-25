// Runs registry/conformance vectors against this runtime with a virtual clock
// and a scripted fetch. Format and clock contract: registry/conformance/README.md.
import "./guard.ts";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createClient, registry } from "../src/index.ts";
import { SearchError } from "../src/errors.ts";
import type { Clock } from "../src/types.ts";

export const conformanceDir = new URL("../../../registry/conformance/", import.meta.url);
export const DEFAULT_NOW = "2026-11-24T12:00:00.000Z";

/** Default keys are `test-key-<provider id>` for every provider the case can use. */
const keysFor = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, `test-key-${id}`]));

export function loadVectors(sub: string): { file: string; data: any }[] {
  const dir = new URL(sub, conformanceDir);
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .map((file) => ({ file: `${sub}${file}`, data: JSON.parse(readFileSync(new URL(file, dir), "utf8")) }));
}

/** Timers fire in due-time order; equal due times fire in creation order. */
export class VirtualClock implements Clock {
  private timers: { at: number; seq: number; fn: () => void; id: number }[] = [];
  private seq = 0;
  t: number;
  constructor(t: number) { this.t = t; }
  now() { return this.t; }
  setTimeout(fn: () => void, ms: number) {
    const id = ++this.seq;
    this.timers.push({ at: this.t + Math.max(0, ms), seq: id, fn, id });
    return id;
  }
  clearTimeout(id: unknown) { this.timers = this.timers.filter((t) => t.id !== id); }
  advance(): boolean {
    if (!this.timers.length) return false;
    this.timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
    const next = this.timers.shift()!;
    this.t = next.at;
    next.fn();
    return true;
  }
}

/** Lets every pending promise reaction run before the clock moves. */
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };

function expand(v: any): any {
  if (Array.isArray(v)) return v.map(expand);
  if (v && typeof v === "object" && "$repeat" in v) return (v.prefix ?? "") + String(v.$repeat).repeat(v.count) + (v.suffix ?? "");
  if (v && typeof v === "object" && "$urls" in v) return Array.from({ length: v.$urls }, (_, i) => `https://example.com/${i}`);
  return v;
}

function bodyBytes(r: any): Uint8Array | null {
  if ("body" in r) return new TextEncoder().encode(JSON.stringify(r.body));
  if ("bodyText" in r) return new TextEncoder().encode(r.bodyText);
  if ("bodyBase64" in r) return new Uint8Array(Buffer.from(r.bodyBase64, "base64"));
  if ("bodyFill" in r) { const f = r.bodyFill; return new TextEncoder().encode(f.prefix + f.repeat.repeat(f.count) + f.suffix); }
  return null;
}

/**
 * A body stream behaves like undici's: it errors as soon as the request is
 * aborted (unless the case says the transport ignores abort). `bodyDelayMs`
 * holds the whole body back; `bodyFailAtMs` sends the first half of the bytes,
 * then fails the stream with a network error.
 */
function makeResponse(r: any, clock: VirtualClock, signal: AbortSignal): Response {
  const status = r.status ?? 200;
  const headers = new Headers(Array.isArray(r.headers) ? r.headers : Object.entries(r.headers ?? {}));
  let bytes = bodyBytes(r);
  if ([204, 205, 304].includes(status)) bytes = null;
  if (!bytes || (!r.bodyDelayMs && r.bodyFailAtMs === undefined)) return new Response(bytes as BodyInit | null, { status, headers });
  let handle: unknown;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const onAbort = () => { clock.clearTimeout(handle); controller.error(new DOMException("This operation was aborted", "AbortError")); };
      if (!r.ignoreAbort) signal.addEventListener("abort", onAbort, { once: true });
      if (r.bodyFailAtMs !== undefined) {
        controller.enqueue(bytes!.slice(0, Math.floor(bytes!.length / 2)));
        handle = clock.setTimeout(() => controller.error(new TypeError("terminated")), r.bodyFailAtMs);
      } else {
        handle = clock.setTimeout(() => { controller.enqueue(bytes!); controller.close(); }, r.bodyDelayMs);
      }
    },
    cancel() { clock.clearTimeout(handle); },
  });
  return new Response(stream, { status, headers });
}

function scripted(r: any, signal: AbortSignal, clock: VirtualClock): Promise<Response> {
  return new Promise((resolve, reject) => {
    let done = false;
    let handle: unknown;
    const onAbort = () => {
      if (r.ignoreAbort || done) return;
      done = true;
      clock.clearTimeout(handle);
      reject(new DOMException("This operation was aborted", "AbortError"));
    };
    handle = clock.setTimeout(() => {
      if (done) return;
      done = true;
      if (r.network) reject(new TypeError("fetch failed"));
      else resolve(makeResponse(r, clock, signal));
    }, r.delayMs ?? 0);
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Overlays case options on file defaults; null removes a key. Keys are defined, never assigned, so "__proto__" stays data. */
function mergeOptions(base: any, over: any): any {
  const out: Record<string, unknown> = {};
  for (const src of [base ?? {}, over ?? {}]) {
    for (const [k, v] of Object.entries(src)) {
      if (v === null) delete out[k];
      else Object.defineProperty(out, k, { value: v, enumerable: true, writable: true, configurable: true });
    }
  }
  return out;
}

function checkRequest(actual: any, expected: any, where: string) {
  if ("method" in expected) assert.equal(actual.method, expected.method, `${where} method`);
  if ("url" in expected) assert.equal(actual.url, expected.url, `${where} url`);
  if ("headers" in expected) assert.deepEqual(actual.headers, expected.headers, `${where} headers`);
  if ("body" in expected) assert.deepEqual(actual.body, expected.body, `${where} body`);
  if ("bodyIncludes" in expected) {
    for (const [k, v] of Object.entries(expected.bodyIncludes)) assert.deepEqual(actual.body?.[k], v, `${where} body.${k}`);
  }
}

/** Runs one case. `file` is the vector file's top level; its `providers`, if any, replace the built-in registry. */
export async function runCase(c: any, file: any = {}): Promise<void> {
  const defaults = file.defaults ?? {};
  const clock = new VirtualClock(Date.parse(c.now ?? DEFAULT_NOW));
  const responses: any[] = c.responses ?? defaults.responses ?? [];
  const requests: any[] = [];
  let next = 0;
  const fetch = ((url: string, init: RequestInit) => {
    const headers = Object.fromEntries(Object.entries(init.headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    requests.push({ method: init.method, url, headers, body: typeof init.body === "string" ? JSON.parse(init.body) : null });
    const r = responses[next++];
    if (!r) return Promise.reject(new Error("Unexpected request: no scripted response left"));
    return scripted(r, init.signal!, clock);
  }) as typeof globalThis.fetch;
  const randoms: number[] = c.random ?? [0.5];
  let ri = 0;
  const ids = Object.keys(file.providers ?? registry);
  const clientConfig = { ...expand(c.client ?? {}) };
  const events: unknown[] = [];
  if (clientConfig.diagnostics === true) clientConfig.diagnostics = (event: unknown) => { events.push(structuredClone(event)); };
  const client = createClient({
    keys: keysFor(ids), env: {}, ...(file.providers ? { registry: file.providers } : {}),
    ...clientConfig, fetch, clock, random: () => randoms[Math.min(ri++, randoms.length - 1)]!,
  });
  const options = mergeOptions(defaults.options, c.options);
  const controller = new AbortController();
  if (c.abortAt === "before") controller.abort();
  else if (typeof c.abortAt === "number") clock.setTimeout(() => controller.abort(), c.abortAt);
  if (c.abortAt !== undefined) options.signal = controller.signal;

  const promise = c.call === "search" ? client.search(expand(c.query), options) : client.contents(expand(c.urls), options);
  let settled = false;
  let result: any, error: any;
  promise.then((r) => { result = r; settled = true; }, (e) => { error = e; settled = true; });
  while (!settled) {
    await flush();
    if (settled) break;
    if (!clock.advance()) { await flush(); if (!settled) throw new Error("Deadlock: call pending with no timers"); }
  }

  const e = c.expect ?? {};
  if ("requestCount" in e) assert.equal(requests.length, e.requestCount, "request count");
  if (e.requests) {
    assert.equal(requests.length, e.requests.length, "request count");
    e.requests.forEach((exp: any, i: number) => checkRequest(requests[i], exp, `request ${i}`));
  }
  if (e.diagnostics) {
    const actual = events.map((ev: any) => ({ ...ev, request: { ...ev.request, body: ev.request.body === null ? null : JSON.parse(ev.request.body) } }));
    const expected = e.diagnostics.map((ev: any) => (ev.response ? { ...ev, response: { ...ev.response, body: expand(ev.response.body) } } : ev));
    assert.deepEqual(actual, expected, "diagnostics");
  }
  if (e.error) {
    if (!error) assert.fail(`Expected error ${e.error.code}, got a response`);
    const err = error as Record<string, unknown>;
    assert.ok(error instanceof SearchError, `Expected SearchError, got ${error}`);
    for (const [k, v] of Object.entries(e.error)) {
      if (v === null) assert.equal(err[k], undefined, `error.${k}`);
      else assert.deepEqual(err[k], v, `error.${k}`);
    }
    if (e.secretAbsent) {
      for (const text of [String(error), JSON.stringify(error), error.stack ?? ""]) assert.ok(!text.includes(e.secretAbsent), "secret leaked");
    }
    return;
  }
  if (error) throw error;
  if (e.response) {
    const { raw, ...rest } = result;
    assert.deepEqual(rest, e.response);
    const last = [...responses.slice(0, next)].reverse().find((r) => "body" in r);
    if (last) assert.deepEqual(raw, last.body, "raw");
  }
  for (const [k, v] of Object.entries(e.responseIncludes ?? {})) assert.deepEqual(result[k], v, `response.${k}`);
}
