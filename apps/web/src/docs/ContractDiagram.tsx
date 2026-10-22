import { DitherDivider } from "../components/DitherKit";
import { ditherMaskStyle } from "../lib/dither/pattern";
import "./contract-diagram.css";

const diagrams: Record<string, { title: string; steps: readonly [string, string][]; note: string }> = {
  "": {
    title: "One normalized search request",
    steps: [["Your server", "query + options"], ["Web adapter", "provider request"], ["SearchResponse", "sources + attempts"]],
    note: "Provider-native clients are a separate surface, with their own operations and response shapes.",
  },
  "reliability/fallback": {
    title: "Fallback is an ordered decision",
    steps: [["Primary", "Attempt the search"], ["Retryable failure?", "Advance to the next configured provider"], ["Next provider", "Record another attempt"]],
    note: "Success returns immediately, even with zero results. Authentication errors, cancellation, and the overall deadline stop the chain.",
  },
  "reliability/timeouts": {
    title: "Every attempt shares one deadline",
    steps: [["Call starts", "Overall budget begins"], ["Each attempt", "Uses the smaller remaining budget"], ["Deadline / abort", "Stop waiting and stop the chain"]],
    note: "An attempt budget never extends the overall deadline. Cancellation cannot undo a request already received by a provider.",
  },
  "reliability/provenance": {
    title: "Source identity travels with the result",
    steps: [["Provider result", "URL + native text"], ["Provenance", "provider + sourceUrl + retrievedAt"], ["Your application", "Keep attribution when rendering"]],
    note: "The attempt trail describes the call. Per-result provenance describes the source, its provider, and when it was retrieved.",
  },
};
export function ContractDiagram({ slug }: { slug: string }) {
  const diagram = diagrams[slug];
  if (!diagram) return null;
  return <figure className="dw-contract"><figcaption>{diagram.title}</figcaption><ol>{diagram.steps.map(([title, detail], i) => <li key={title}>
    <span className="dw-contract-fill" aria-hidden="true" style={ditherMaskStyle((i + 1) / 4, { cell: 2 })} />
    <strong>{title}</strong><span>{detail}</span>
  </li>)}</ol><DitherDivider /><p>{diagram.note}</p></figure>;
}
