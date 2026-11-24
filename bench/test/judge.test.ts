// The Morph Kimi judge against a SYNTHETIC chat endpoint: request shape,
// parsing, cost and its upper bound. No request leaves the process.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createJudge, loadJudgeConfig, parseVerdict, selectPassage, truncateBytes, JudgeError } from "../src/judge/judge.ts";
import { loadMethod } from "../src/run/config.ts";

const method = loadMethod();

function fakeChat(reply: { content: string; usage?: object; status?: number }, seen: { url?: string; init?: RequestInit }[]) {
  return (async (url: unknown, init?: RequestInit) => {
    seen.push({ url: String(url), ...(init ? { init } : {}) });
    if (reply.status && reply.status !== 200) return new Response("{}", { status: reply.status, headers: { "retry-after": "7" } });
    return new Response(JSON.stringify({ model: "morph-kimik31", choices: [{ message: { content: reply.content } }], usage: reply.usage }), { status: 200 });
  }) as typeof fetch;
}

const input = { query: "Who designed the Modula-2 programming language?", url: "https://example.org/modula-2", title: "Modula-2", passage: "Modula-2 was designed by Niklaus Wirth." };

test("the Morph judge sends an OpenAI-compatible request with a bearer key and no sampling parameters", async () => {
  const seen: { url?: string; init?: RequestInit }[] = [];
  const judge = createJudge(method.judge.id, method.judge.rubric, { fetch: fakeChat({ content: '{"rationale":"states it","grade":3}', usage: { prompt_tokens: 900, completion_tokens: 120 } }, seen), env: { MORPH_API_KEY: "test-key" } });
  const v = await judge.grade(input);
  assert.equal(v.grade, 3);
  assert.equal(seen[0]!.url, "https://api.morphllm.com/v1/chat/completions");
  const headers = seen[0]!.init!.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer test-key");
  const body = JSON.parse(String(seen[0]!.init!.body));
  assert.equal(body.model, "morph-kimik31");
  assert.equal(body.reasoning_effort, "low");
  assert.equal(body.max_tokens, 600);
  assert.equal(body.response_format.type, "json_schema");
  assert.equal("temperature" in body, false);
  assert.equal("top_p" in body, false);
  // The judge sees no provider: only query, URL, title and passage.
  const user = JSON.parse(body.messages[1].content);
  assert.deepEqual(Object.keys(user).sort(), ["passage", "query", "title", "url"]);
  // Cost at list price: 900 input and 120 output tokens.
  assert.equal(v.costUsd, (900 * 2.5 + 120 * 14) / 1e6);
});

test("the reservation bounds the cost of any reply within max_tokens", async () => {
  const judge = createJudge(method.judge.id, method.judge.rubric, { fetch: fakeChat({ content: "{}" }, []), env: {} });
  const big = { ...input, passage: selectPassage("é".repeat(10000), input.query, method.judge.passageMaxBytes) };
  const bound = judge.maxCallCostUsd(big);
  const c = loadJudgeConfig(method.judge.id);
  const bytes = Buffer.byteLength(JSON.stringify([big]), "utf8");
  // Any reply with input tokens up to the request's byte length and output up to max_tokens costs no more.
  assert.ok(bound >= (bytes * c.priceUsdPerMTok.input + c.maxTokens * c.priceUsdPerMTok.output) / 1e6);
  await assert.rejects(judge.grade(input), /MORPH_API_KEY is not set/);
});

test("rate limits and malformed replies become judge errors", async () => {
  const judge429 = createJudge(method.judge.id, method.judge.rubric, { fetch: fakeChat({ content: "", status: 429 }, []), env: { MORPH_API_KEY: "k" } });
  await assert.rejects(judge429.grade(input), (e: unknown) => e instanceof JudgeError && e.status === 429 && e.retryAfterMs === 7000);
  assert.throws(() => parseVerdict('{"grade": 4}'), /not 0, 1, 2 or 3/);
  assert.throws(() => parseVerdict("no json"), /no JSON/);
  assert.equal(parseVerdict('```json\n{"rationale": "x", "grade": 2}\n```').grade, 2);
});

test("passages stay within the byte budget and prefer the part that matches the query", () => {
  const filler = "Unrelated paragraph about gardening.\n\n".repeat(300);
  const text = `${filler}Modula-2 programming language designed by Niklaus Wirth.\n\n${filler}`;
  const p = selectPassage(text, "Who designed the Modula-2 programming language?", 2000);
  assert.ok(Buffer.byteLength(p) <= 2000);
  assert.match(p, /Niklaus Wirth/);
  assert.equal(truncateBytes("ééé", 5), "éé");
});
