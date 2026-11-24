// The human check: shows judged (query, page) pairs one at a time, blind to
// provider and to the judge's grade, and records a 0-3 label for each. The
// sample is seeded and drawn from pairs the judge graded, so judge-human
// agreement can be measured on exactly the same passages.
import type { Item } from "./dataset/items.ts";
import type { Method, RunConfig } from "./run/config.ts";
import type { Plan } from "./run/plan.ts";
import { runPaths, type HumanLabel, type JudgmentRecord } from "./run/records.ts";
import { judgePairs, passageFor } from "./run/runner.ts";
import { appendJsonl, readJsonl, rng, seedOf, shuffle } from "./util/core.ts";

export interface LabelIO {
  ask(prompt: string): Promise<string>;
  say(text: string): void;
}

export async function labelSession(o: {
  dir: string;
  config: RunConfig;
  method: Method;
  plan: Plan;
  items: Item[];
  target: number;
  labeller: string;
  io: LabelIO;
}): Promise<{ labelled: number; total: number }> {
  const paths = runPaths(o.dir);
  const judged = new Set(readJsonl<JudgmentRecord>(paths.judgments).filter((j) => j.grade !== null && j.repeat === 0).map((j) => j.pairId));
  const already = new Set(readJsonl<HumanLabel>(paths.labels).map((l) => l.pairId));
  const items = new Map(o.items.map((i) => [i.id, i]));
  const pairs = shuffle(judgePairs({ dir: o.dir, plan: o.plan, method: o.method }).filter((p) => judged.has(p.pairId)), rng(seedOf(o.config.seed, "human")));
  const sample = pairs.slice(0, o.target);
  const todo = sample.filter((p) => !already.has(p.pairId));
  o.io.say(`${already.size} labelled so far; ${todo.length} of a ${sample.length}-pair sample to go. Grades: 3 answers it, 2 mostly relevant, 1 related, 0 not relevant. s skips, q quits.`);
  let labelled = 0;
  for (const [k, p] of todo.entries()) {
    const item = items.get(p.itemId)!;
    const { passage } = passageFor(o.dir, p, item.query, o.method.judge.passageMaxBytes);
    o.io.say(`\n[${k + 1}/${todo.length}] Query: ${item.query}\nURL: ${p.url}\nTitle: ${p.title ?? "(none)"}\n---\n${passage}\n---`);
    for (;;) {
      const a = (await o.io.ask("grade 0-3, s, q> ")).trim().toLowerCase();
      if (a === "q") return { labelled, total: already.size + labelled };
      if (a === "s") {
        appendJsonl(paths.labels, { pairId: p.pairId, grade: null, labeller: o.labeller, at: new Date().toISOString() } satisfies HumanLabel);
        break;
      }
      if (/^[0-3]$/.test(a)) {
        appendJsonl(paths.labels, { pairId: p.pairId, grade: Number(a) as 0 | 1 | 2 | 3, labeller: o.labeller, at: new Date().toISOString() } satisfies HumanLabel);
        labelled++;
        break;
      }
      o.io.say("Type 0, 1, 2, 3, s or q.");
    }
  }
  return { labelled, total: already.size + labelled };
}
