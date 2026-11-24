import { readFileSync } from "node:fs";
import path from "node:path";
import { MarkLoader } from "@/components/brand/searchsdk";
import { DataRegion } from "@/components/data/data-region";
import { getStage } from "@/lib/race";
import { Stage } from "./stage";

/**
 * The stage, server side: reads the typechecked example the stage shows (content/examples/stage.ts)
 * and marks where the visitor's query and providers go, so the code on screen is the code the
 * check compiles, with only those two values changed.
 */
function template(): string {
  const source = readFileSync(path.join(process.cwd(), "content", "examples", "stage.ts"), "utf8").trimEnd();
  const lines = source.split("\n");
  const out = lines.map((line) =>
    line
      .replace(/^(const providers = \[)[^\]]*(\] as const;)$/, "$1%%PROVIDERS%%$2")
      .replace(/^(\s*search\()"[^"]*"/, "$1%%QUERY%%"),
  );
  const text = out.join("\n");
  if (!text.includes("%%PROVIDERS%%") || !text.includes("%%QUERY%%")) {
    throw new Error("content/examples/stage.ts no longer has a `const providers = [...] as const;` line and a search(\"...\") call; update components/home/stage/index.tsx.");
  }
  return text;
}

export function HomeStage() {
  return (
    <DataRegion dataset={getStage()} placeLabel>
      {(stage, label) => <Stage stage={stage} template={template()} sampleTag={label} loader={<MarkLoader px={32} />} />}
    </DataRegion>
  );
}
