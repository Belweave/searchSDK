// Test helpers. Every run here is a FIXTURE run: synthetic providers and a
// synthetic judge, inside a temporary store. The network guard is active.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Item } from "../src/dataset/items.ts";
import type { RunConfig } from "../src/run/config.ts";

export function tempStore(): string {
  const dir = mkdtempSync(join(tmpdir(), "bench-test-"));
  process.env.BENCH_STORE = dir;
  return dir;
}

export const FIXTURE_IDS = ["fx-strong", "fx-fair", "fx-flaky", "fx-empty", "fx-unpriced"];

export function fixtureConfig(over: Partial<RunConfig> = {}): RunConfig {
  return {
    name: "fixture-test",
    providers: FIXTURE_IDS,
    datasets: ["datasets/public/seed-0.1.0.jsonl", "datasets/fresh/fresh-2026-11.jsonl"],
    passes: 1,
    profiles: ["default"],
    pagePasses: [1],
    judgeItems: 12,
    capUsd: 50,
    seed: 7,
    ...over,
  };
}

/** A synthetic item with a known answer, for unit tests that need no dataset file. */
export function item(id: string, over: Partial<Item> = {}): Item {
  return {
    id, split: "public", class: "fact.head", lang: "en", query: `Synthetic question ${id}?`,
    answers: ["Zanzibar Quill"], answerPatterns: [], answerUrls: [],
    source: { name: "wikidata", url: "https://www.wikidata.org/wiki/Q1", retrievedOn: "2026-11-24" },
    licence: "CC0-1.0", asOf: "2026-11-24", builder: { template: "test", version: "1" },
    review: { status: "builder-checked", on: "2026-11-24" },
    ...over,
  };
}
