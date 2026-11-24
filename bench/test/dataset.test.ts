// Dataset rules, matching, the Wikidata builder on recorded rows, review, and the private split.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { committedProblems, itemHash, itemProblems, loadItems, makePrivate } from "../src/dataset/items.ts";
import { containsAlias, normalize, textHasAnswer, urlMatches } from "../src/dataset/match.ts";
import { applyReview } from "../src/dataset/review.ts";
import { freshItemsFromRows, itemsFromRows, TEMPLATES } from "../src/dataset/wikidata.ts";
import { BENCH_DIR, readJson } from "../src/util/core.ts";
import { item, tempStore } from "./helpers.ts";

test("committed datasets are valid, versioned, licensed and free of private items", () => {
  assert.deepEqual(committedProblems(), []);
  const manifest = readJson<{ datasets: { file: string; count: number; licences: Record<string, number> }[] }>(join(BENCH_DIR, "datasets", "manifest.json"));
  for (const d of manifest.datasets) {
    const items = loadItems(join(BENCH_DIR, d.file));
    assert.equal(items.length, d.count);
    for (const i of items) {
      assert.equal(i.licence, "CC0-1.0");
      assert.match(i.source.url, /^https:\/\/www\.wikidata\.org\/wiki\/Q\d+#P\d+$/);
      assert.notEqual(i.split, "private");
      assert.equal(i.nonce, undefined);
    }
  }
});

test("matching: whole words, diacritics, scripts without spaces, patterns and official hosts", () => {
  assert.equal(normalize("  Gabriel García-Márquez! "), "gabriel garcia marquez");
  assert.ok(containsAlias(normalize("Written by Gabriel García Márquez in 1981."), "Gabriel Garcia Marquez"));
  assert.ok(!containsAlias(normalize("Minskaya oblast"), "Minsk"));
  assert.ok(containsAlias(normalize("スウェーデンの首都はストックホルムです"), "ストックホルム"));
  // Kana voicing marks are not stripped: バ is not ハ.
  assert.ok(!containsAlias(normalize("ハンコク"), "バンコク"));
  const fresh = { answers: [], answerPatterns: ["(?<![\\w.])v?1\\.6\\.11(?![\\w]|\\.\\d)"], answerUrls: [] };
  assert.ok(textHasAnswer("Released PipeWire 1.6.11 today", fresh));
  assert.ok(textHasAnswer("tag v1.6.11.", fresh));
  assert.ok(!textHasAnswer("PipeWire 1.6.110", fresh));
  assert.ok(!textHasAnswer("PipeWire 11.6.11", fresh));
  assert.ok(!textHasAnswer("PipeWire 1.6.11.2", fresh));
  assert.ok(urlMatches("https://www.mit.edu/about", ["https://mit.edu"]));
  assert.ok(urlMatches("https://news.mit.edu/x", ["https://mit.edu"]));
  assert.ok(!urlMatches("https://mit.edu.example.com/", ["https://mit.edu"]));
});

test("item rules reject leaks, missing answers and committed private items", () => {
  assert.deepEqual(itemProblems([item("pub-ok-1")]), []);
  assert.match(itemProblems([item("pub-x-1", { query: "Who is Zanzibar Quill?" })]).join(), /query contains the answer/);
  assert.match(itemProblems([item("pub-x-2", { answers: [] })]).join(), /no usable answer/);
  assert.match(itemProblems([item("pub-x-3", { answers: ["Al"] })]).join(), /too short/);
  assert.match(itemProblems([item("priv-x-4", { split: "private", nonce: "0".repeat(32) })], { committed: true }).join(), /never be committed/);
  assert.match(itemProblems([item("pub-x-5"), item("pub-x-5")]).join(), /duplicate id/);
  assert.match(itemProblems([item("pub-x-6", { class: "nav" })]).join(), /nav items need answerUrls/);
});

test("the builder keeps only subjects with exactly one value and records the statement", () => {
  const t = TEMPLATES.find((x) => x.id === "capital-en-head")!;
  const E = "http://www.wikidata.org/entity/";
  const rows = [
    { s: `${E}Q1`, sLabel: "Alphaland", o: `${E}Q10`, oLabel: "Alpha City", st: `${E}statement/Q1-abc`, alts: "Alpha|AC" },
    { s: `${E}Q2`, sLabel: "Betaland", o: `${E}Q20`, oLabel: "Beta One", st: `${E}statement/Q2-a` },
    { s: `${E}Q2`, sLabel: "Betaland", o: `${E}Q21`, oLabel: "Beta Two", st: `${E}statement/Q2-b` },
    { s: `${E}Q3`, sLabel: "Q3", o: `${E}Q30`, oLabel: "Nameless", st: `${E}statement/Q3-a` },
  ];
  const out = itemsFromRows(t, rows, "2026-11-24");
  assert.equal(out.length, 1);
  assert.equal(out[0]!.query, "What is the capital city of Alphaland?");
  // Short or all-lowercase aliases are dropped; names stay.
  assert.deepEqual(out[0]!.answers, ["Alpha City", "Alpha"]);
  assert.equal(out[0]!.source.statement, "Q1-abc");
  assert.equal(out[0]!.licence, "CC0-1.0");
});

test("freshness items take the newest unique stable version and keep superseded ones", () => {
  const t = TEMPLATES.find((x) => x.id === "software-latest-version")!;
  const E = "http://www.wikidata.org/entity/";
  const rows = [
    { s: `${E}Q5`, sLabel: "Toolkit", o: "2.1.0", st: `${E}statement/Q5-a`, extra: "2026-11-01T00:00:00Z" },
    { s: `${E}Q5`, sLabel: "Toolkit", o: "2.0.9", st: `${E}statement/Q5-b`, extra: "2026-10-12T00:00:00Z" },
    { s: `${E}Q6`, sLabel: "Twin", o: "3.0", st: `${E}statement/Q6-a`, extra: "2026-11-02T00:00:00Z" },
    { s: `${E}Q6`, sLabel: "Twin", o: "2.9.9", st: `${E}statement/Q6-b`, extra: "2026-11-02T00:00:00Z" },
  ];
  const out = freshItemsFromRows(t, rows, "2026-11-24");
  assert.equal(out.length, 1);
  assert.equal(out[0]!.expires, "2026-12-24");
  assert.deepEqual(out[0]!.superseded, ["2.0.9"]);
  assert.ok(textHasAnswer("Toolkit 2.1.0 is out", out[0]! as never));
});

test("reviews drop, prune and keep the first survivors in builder order", () => {
  const c = (k: string) => item(`cand-${k}`, { builder: { template: "t", version: "1" }, query: `Q ${k}?` });
  const out = applyReview([c("t-001"), c("t-002"), c("t-003")], {
    for: "x", reviewedOn: "2026-11-24", status: "agent-reviewed", note: "n", take: { t: 1 },
    drop: { "t-001": "bad" }, answers: { "t-002": ["Zanzibar Quill", "Z. Quill"] },
  }, "pub");
  assert.deepEqual(out.map((i) => i.id), ["pub-t-002"]);
  assert.deepEqual(out[0]!.answers, ["Zanzibar Quill", "Z. Quill"]);
  assert.equal(out[0]!.review.status, "agent-reviewed");
  assert.throws(() => applyReview([c("t-001")], { for: "x", reviewedOn: "2026-11-24", status: "agent-reviewed", note: "", drop: { "t-404": "x" } }, "pub"), /not a candidate/);
});

test("private items get nonces and new ids, stay in the store, and publish only salted hashes", () => {
  const store = tempStore();
  const { file, hashes } = makePrivate([item("pub-a-1"), item("pub-a-2", { query: "Another synthetic question?" })], "test");
  assert.ok(file.startsWith(store));
  assert.ok(existsSync(file));
  const priv = loadItems(file);
  assert.ok(priv.every((p) => p.split === "private" && /^priv-[0-9a-f]{12}$/.test(p.id) && /^[0-9a-f]{32}$/.test(p.nonce!)));
  assert.deepEqual(hashes.map((h) => h.hash), priv.map(itemHash));
  // The same item with another nonce hashes differently: the hash does not reveal the query.
  assert.notEqual(itemHash({ ...priv[0]!, nonce: "1".repeat(32) }), hashes[0]!.hash);
  assert.throws(() => makePrivate([item("pub-a-3")], "bad", join(BENCH_DIR, "datasets", "x.jsonl")), /only be written inside the local store/);
});

test("the gitignore keeps local stores and private files out of the repository", () => {
  const gi = readFileSync(join(BENCH_DIR, "..", ".gitignore"), "utf8");
  assert.match(gi, /^\.local\/$/m);
  assert.match(gi, /^bench\/\.local\/$/m);
  assert.match(gi, /^\*\.private\.jsonl$/m);
});
