// The judge interface, the prompt built from the versioned rubric, passage
// selection, and the OpenAI-compatible chat implementation used for Kimi K3.1
// Pro through Morph. Judges never see which provider returned a page.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BENCH_DIR, readJson, sha256 } from "../util/core.ts";
import { normalize } from "../dataset/match.ts";

export interface JudgeInput {
  query: string;
  url: string;
  title: string | null;
  passage: string;
}

export interface JudgeVerdict {
  grade: 0 | 1 | 2 | 3;
  rationale: string;
  inputTokens: number | null;
  outputTokens: number | null;
  /** List-price cost of this call, or null when usage was not reported. */
  costUsd: number | null;
  /** A charge the host itself reported for this call (usage.cost or usage.total_cost), or null when it reported none. */
  chargedUsd: number | null;
  model: string | null;
  raw: unknown;
}

export interface JudgeInfo {
  id: string;
  label: string;
  model: string;
  rubric: string;
  rubricSha256: string;
  promptSha256: string;
  params: Record<string, unknown>;
}

export interface Judge {
  readonly info: JudgeInfo;
  /** Hard upper bound on one call's cost, used for the budget reservation. */
  maxCallCostUsd(input: JudgeInput): number;
  /** Seconds to wait after a call so the judge stays within its token rate limits. */
  cooldownMs(verdict: JudgeVerdict | null, input: JudgeInput): number;
  grade(input: JudgeInput, signal?: AbortSignal): Promise<JudgeVerdict>;
}

export class JudgeError extends Error {
  readonly status: number | undefined;
  readonly retryAfterMs: number | undefined;
  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface JudgeConfig {
  type: "openai-chat";
  label: string;
  baseUrl: string;
  model: string;
  keyEnv: string;
  reasoningEffort?: string;
  maxTokens: number;
  jsonSchema: boolean;
  priceUsdPerMTok: { input: number; output: number };
  rateLimit?: { inputTokensPerMinute: number; outputTokensPerMinute: number };
}

export function loadJudgeConfig(id: string): JudgeConfig {
  const all = readJson<Record<string, JudgeConfig>>(join(BENCH_DIR, "config", "judges.json"));
  const c = all[id];
  if (!c || typeof c !== "object") throw new Error(`no judge ${id} in config/judges.json`);
  return c;
}

const utf8 = (s: string) => Buffer.byteLength(s, "utf8");

/** Truncates to at most `maxBytes` UTF-8 bytes without splitting a character. */
export function truncateBytes(s: string, maxBytes: number): string {
  if (utf8(s) <= maxBytes) return s;
  let out = "";
  let used = 0;
  for (const ch of s) {
    const b = utf8(ch);
    if (used + b > maxBytes) break;
    out += ch;
    used += b;
  }
  return out;
}

/**
 * The passage a judge sees: the whole text when it fits, otherwise the
 * paragraph-aligned window with the most distinct query terms (ties: earliest).
 */
export function selectPassage(text: string, query: string, maxBytes: number): string {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (utf8(clean) <= maxBytes) return clean;
  const terms = new Set(normalize(query).split(" ").filter((t) => t.length >= 3));
  const starts = [0];
  for (let i = clean.indexOf("\n\n"); i !== -1 && starts.length < 400; i = clean.indexOf("\n\n", i + 2)) starts.push(i + 2);
  let best = 0;
  let bestScore = -1;
  for (const s of starts) {
    const window = truncateBytes(clean.slice(s), maxBytes);
    const words = new Set(normalize(window).split(" "));
    let score = 0;
    for (const t of terms) if (words.has(t)) score++;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return truncateBytes(clean.slice(best), maxBytes);
}

export function rubricText(rubricPath: string): string {
  return readFileSync(join(BENCH_DIR, rubricPath), "utf8");
}

/** The user message: only the query and the page, never the provider. */
export function userMessage(input: JudgeInput): string {
  return JSON.stringify({
    query: input.query,
    url: truncateBytes(input.url, 300),
    title: input.title === null ? null : truncateBytes(input.title, 200),
    passage: input.passage,
  });
}

const GRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rationale", "grade"],
  properties: { rationale: { type: "string" }, grade: { type: "integer", enum: [0, 1, 2, 3] } },
};

/** Parses a reply: a JSON object with an integer grade 0..3, possibly wrapped in prose or a code fence. */
export function parseVerdict(content: unknown): { grade: 0 | 1 | 2 | 3; rationale: string } {
  if (typeof content !== "string") throw new JudgeError("reply has no text content");
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new JudgeError("reply has no JSON object");
  let o: unknown;
  try {
    o = JSON.parse(m[0]);
  } catch {
    throw new JudgeError("reply JSON does not parse");
  }
  const g = (o as { grade?: unknown }).grade;
  if (g !== 0 && g !== 1 && g !== 2 && g !== 3) throw new JudgeError("grade is not 0, 1, 2 or 3");
  const r = (o as { rationale?: unknown }).rationale;
  return { grade: g, rationale: typeof r === "string" ? r : "" };
}

/** An OpenAI-compatible chat-completions judge. For Morph: POST {baseUrl}/chat/completions with a bearer key. */
export class ChatJudge implements Judge {
  readonly info: JudgeInfo;
  private readonly system: string;
  private readonly c: JudgeConfig;
  private readonly opts: { fetch: typeof fetch; env: Record<string, string | undefined> };

  constructor(id: string, c: JudgeConfig, rubricPath: string, opts: { fetch: typeof fetch; env: Record<string, string | undefined> }) {
    this.c = c;
    this.opts = opts;
    const rubric = rubricText(rubricPath);
    this.system = rubric;
    const params = {
      model: c.model,
      ...(c.reasoningEffort ? { reasoning_effort: c.reasoningEffort } : {}),
      max_tokens: c.maxTokens,
      ...(c.jsonSchema ? { response_format: { type: "json_schema", json_schema: { name: "relevance_grade", strict: true, schema: GRADE_SCHEMA } } } : {}),
    };
    this.info = {
      id, label: c.label, model: c.model, rubric: rubricPath, rubricSha256: sha256(rubric),
      promptSha256: sha256(JSON.stringify({ system: this.system, params })), params,
    };
  }

  private body(input: JudgeInput) {
    // No temperature or top_p: the model's sampling is fixed by its host, so self-consistency is measured, not assumed.
    return { ...this.info.params, messages: [{ role: "system", content: this.system }, { role: "user", content: userMessage(input) }] };
  }

  maxCallCostUsd(input: JudgeInput): number {
    // A token is at least one byte, so the request's byte length bounds its input tokens; 64 covers chat framing.
    const inputTokens = utf8(JSON.stringify(this.body(input).messages)) + 64;
    return (inputTokens * this.c.priceUsdPerMTok.input + this.c.maxTokens * this.c.priceUsdPerMTok.output) / 1e6;
  }

  cooldownMs(verdict: JudgeVerdict | null, input: JudgeInput): number {
    const rl = this.c.rateLimit;
    if (!rl) return 0;
    const inTok = verdict?.inputTokens ?? utf8(JSON.stringify(this.body(input).messages));
    const outTok = verdict?.outputTokens ?? this.c.maxTokens;
    // Half the documented per-minute token rate, like provider pacing.
    return Math.ceil(Math.max(inTok / (rl.inputTokensPerMinute * 0.5), outTok / (rl.outputTokensPerMinute * 0.5)) * 60_000);
  }

  async grade(input: JudgeInput, signal?: AbortSignal): Promise<JudgeVerdict> {
    const key = this.opts.env[this.c.keyEnv];
    if (!key) throw new JudgeError(`${this.c.keyEnv} is not set`);
    const res = await this.opts.fetch(`${this.c.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(this.body(input)),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      const ra = Number(res.headers.get("retry-after"));
      throw new JudgeError(`judge returned ${res.status}`, res.status, Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined);
    }
    const body = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: unknown; total_cost?: unknown };
    };
    const { grade, rationale } = parseVerdict(body.choices?.[0]?.message?.content);
    const inTok = typeof body.usage?.prompt_tokens === "number" ? body.usage.prompt_tokens : null;
    const outTok = typeof body.usage?.completion_tokens === "number" ? body.usage.completion_tokens : null;
    const costUsd = inTok === null || outTok === null ? null : (inTok * this.c.priceUsdPerMTok.input + outTok * this.c.priceUsdPerMTok.output) / 1e6;
    const reported = [body.usage?.cost, body.usage?.total_cost].find((v): v is number => typeof v === "number" && Number.isFinite(v));
    return { grade, rationale, inputTokens: inTok, outputTokens: outTok, costUsd, chargedUsd: reported ?? null, model: typeof body.model === "string" ? body.model : null, raw: body };
  }
}

export function createJudge(id: string, rubricPath: string, opts: { fetch: typeof fetch; env: Record<string, string | undefined> }): Judge {
  const c = loadJudgeConfig(id);
  if (c.type === "openai-chat") return new ChatJudge(id, c, rubricPath, opts);
  throw new Error(`judge type ${(c as { type: string }).type} is not implemented`);
}
