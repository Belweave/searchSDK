// The dataset builder rules in scripts/datasets, on fixed inputs (no network).
import assert from "node:assert/strict";
import { test } from "node:test";
import { pruneAliases } from "../scripts/datasets/build.ts";
import { kevAnswers, longDate, versionPattern } from "../scripts/datasets/sources.ts";
import { rootUrl } from "../scripts/datasets/templates.ts";
import { sample } from "../scripts/datasets/spot-check.ts";
import { item } from "./helpers.ts";

test("alias pruning drops bare surnames and nicknames, keeps real variants", () => {
  assert.deepEqual(pruneAliases(["Grant Wood", "Wood", "Grant DeVolson Wood"]), ["Grant Wood", "Grant DeVolson Wood"]);
  assert.deepEqual(pruneAliases(["Los Angeles", "Pink City", "La La Land", "Los Angeles, CA"]), ["Los Angeles", "Los Angeles, CA"]);
  assert.deepEqual(pruneAliases(["Mumbai", "Bombay", "City of Dreams"]), ["Mumbai", "Bombay"]);
  // Han names keep their simplified and traditional forms.
  assert.deepEqual(pruneAliases(["斯蒂芬·斯皮爾伯格", "斯蒂芬·斯皮尔伯格", "Steven Spielberg", "Spielberg"]), ["斯蒂芬·斯皮爾伯格", "斯蒂芬·斯皮尔伯格", "Steven Spielberg"]);
});

test("KEV answers name the product the way pages do", () => {
  assert.deepEqual(kevAnswers("Drupal", "Core"), ["Drupal Core"]);
  assert.deepEqual(kevAnswers("Fortinet", "FortiOS"), ["Fortinet FortiOS", "FortiOS"]);
  assert.deepEqual(kevAnswers("Netis", "WF2419 Devices"), ["Netis WF2419", "WF2419"]);
});

test("nav answers must be the root of a host the owner does not share", () => {
  assert.equal(rootUrl("https://www.ulb.be/"), true);
  assert.equal(rootUrl("https://www.univie.ac.at/en/"), true);
  assert.equal(rootUrl("https://github.com/example"), false);
  assert.equal(rootUrl("https://www.gov.uk/government/organisations/hm-treasury"), false);
  assert.equal(rootUrl("https://example.org/about/team"), false);
});

test("fresh helpers: exact version tokens and dated phrasing", () => {
  const r = new RegExp(versionPattern("2.15.5"), "iu");
  assert.ok(r.test("Harbor v2.15.5 released"));
  assert.ok(!r.test("Harbor 2.15.50"));
  assert.ok(!r.test("Harbor 2.15.5.1"));
  assert.equal(longDate("2026-11-25"), "25 November 2026");
});

test("the spot-check sample is seeded, about 10% and covers every class", () => {
  const items = Array.from({ length: 60 }, (_, k) => item(`pub-x-${String(k).padStart(3, "0")}`, { class: (["fact.head", "tech", "nav"] as const)[k % 3]!, query: `question ${k}?` }));
  const a = sample(items, 7, "public");
  assert.equal(a.length, 6);
  assert.deepEqual(new Set(a.map((i) => i.class)), new Set(["fact.head", "tech", "nav"]));
  assert.deepEqual(sample(items, 7, "public").map((i) => i.id), a.map((i) => i.id));
});
