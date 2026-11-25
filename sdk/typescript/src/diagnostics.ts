// The opt-in diagnostics hook's event parts (registry/policy.md, Diagnostics):
// a redacted request, the raw response bounded and redacted, and how the
// spec's paths resolved. Nothing here changes a call's outcome.
import { encode, type HttpRequest, type Kind } from "./engine.ts";
import { policy } from "./generated/registry.ts";
import { allHold, getPath } from "./json.ts";
import type { AttemptDiagnostics, Field, PathReport, ProviderSpec } from "./types.ts";

const REDACTED = policy.diagnostics.redacted;
const SEARCH_FIELDS = ["url", "title", "excerpts", "publishedAt", "author"] as const;
const PAGE_FIELDS = ["url", "finalUrl", "title", "content", "publishedAt", "author", "errorCode", "errorMessage"] as const;

const present = (v: unknown) => v !== undefined && v !== null;
const pathOf = (f: Field) => (typeof f === "string" ? f : f.path);
const isPlainObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Which spec paths a 2xx body resolved. Empty unless the body is a JSON object. */
export function pathReport(spec: ProviderSpec, kind: Kind, body: unknown): PathReport[] {
  const out: PathReport[] = [];
  if (!isPlainObject(body)) return out;
  const list = (role: string, path: string, value: unknown) => {
    const found = Array.isArray(value) ? 1 : 0;
    out.push({ role, path, found, missing: 1 - found });
  };
  const count = (role: string, path: string, items: readonly unknown[]) => {
    const found = items.filter((item) => present(getPath(item, path))).length;
    out.push({ role, path, found, missing: items.length - found });
  };
  if (kind === "search") {
    const response = spec.search!.response;
    const rows = getPath(body, response.results);
    list("results", response.results, rows);
    const items = Array.isArray(rows) ? rows : [];
    for (const name of SEARCH_FIELDS) {
      const f = response.fields[name];
      if (f !== undefined) count(name, pathOf(f), items);
    }
    for (const [name, f] of Object.entries(response.providerFields ?? {})) count(`providerFields.${name}`, pathOf(f), items);
  } else {
    spec.contents!.response.pages.forEach((source, i) => {
      const value = source.from === "$" ? [body] : getPath(body, source.from);
      list(`pages.${i}`, source.from, value);
      let items = Array.isArray(value) ? value : [];
      if (source.where?.length) {
        const passed = items.filter((item) => allHold(item, source.where));
        out.push({ role: `pages.${i}.where`, path: source.where.map((p) => p.path).join(","), found: passed.length, missing: items.length - passed.length });
        items = passed;
      }
      for (const name of PAGE_FIELDS) {
        const f = source.fields[name];
        if (f !== undefined) count(`pages.${i}.${name}`, pathOf(f), items);
      }
    });
  }
  const ep = spec[kind]!;
  if (ep.cost?.reported) count("cost", ep.cost.reported.path, [body]);
  for (const rule of ep.response.requestId ?? []) if ("path" in rule) count("requestId", rule.path, [body]);
  return out;
}

/** The request as sent, with the key header's value or the query key's value replaced. */
export function redactedRequest(spec: ProviderSpec, req: HttpRequest, key: string): AttemptDiagnostics["request"] {
  const auth = spec.auth.in === "header" ? spec.auth.name.toLowerCase() : null;
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) headers[name.toLowerCase()] = name.toLowerCase() === auth ? REDACTED : value;
  let url = req.url;
  const tail = `=${encode(key)}`;
  if (spec.auth.in === "query" && url.endsWith(tail)) url = `${url.slice(0, url.length - tail.length)}=${REDACTED}`;
  return { method: req.method, url, headers, body: req.body ?? null };
}

/** The response as received: headers normalized, the body decoded, key-redacted and cut at a character boundary. */
export function responseRecord(status: number, headers: Headers, bytes: Uint8Array | null, key: string): NonNullable<AttemptDiagnostics["response"]> {
  const redact = (s: string) => s.split(key).join(REDACTED);
  const pairs: [string, string][] = [];
  for (const [name, value] of headers) if (name !== "set-cookie") pairs.push([name, redact(value)]);
  const h = Object.fromEntries(pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  if (bytes === null) return { status, headers: h, body: null, bodyBytes: null, bodyTruncated: false };
  const decode = (b: Uint8Array) => new TextDecoder("utf-8", { ignoreBOM: true }).decode(b);
  const text = redact(decode(bytes));
  const encoded = new TextEncoder().encode(text);
  const max = policy.diagnostics.maxBodyBytes;
  if (encoded.length <= max) return { status, headers: h, body: text, bodyBytes: bytes.length, bodyTruncated: false };
  let cut = max;
  while (cut > 0 && (encoded[cut]! & 0xc0) === 0x80) cut--; // never split a character
  return { status, headers: h, body: decode(encoded.subarray(0, cut)), bodyBytes: bytes.length, bodyTruncated: true };
}
