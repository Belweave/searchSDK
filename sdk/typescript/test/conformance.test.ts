import "./guard.ts";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { creditsToUsd, requestPrice, runStep, StepUnsupported } from "../src/steps.ts";
import { DEFAULT_NOW, loadVectors, runCase } from "./harness.ts";

for (const sub of ["providers/", "policy/", "format/"]) {
  for (const { file, data } of loadVectors(sub)) {
    describe(file, () => {
      for (const c of data.cases) test(c.name, () => runCase(c, data));
    });
  }
}

describe("steps.json", () => {
  const { data } = loadVectors("").find((v) => v.file === "steps.json")!;
  data.cases.forEach((c: any, i: number) => {
    test(`${i} ${c.step} ${JSON.stringify(c.input)}`, () => {
      const side = c.side ?? "response";
      const ctx = { now: Date.parse(c.now ?? DEFAULT_NOW) };
      const run = () => {
        if (c.step === "credits-to-usd") return creditsToUsd(c.input, c.args.rateUsd);
        if (c.step === "request-price") return requestPrice(c.input, c.args.pricing, c.args.tier);
        return runStep(c.input, { step: c.step, ...(c.args ?? {}) }, side, ctx);
      };
      if (c.expectError) assert.throws(run, StepUnsupported);
      else assert.deepEqual(run(), c.expect);
    });
  });
});
