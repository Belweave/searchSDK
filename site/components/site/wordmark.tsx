/** Placeholder wordmark until the brand mark lands (branch v2/brand): the spectrum, then the name. */
const BARS = ["--hue-brave", "--hue-firecrawl", "--hue-tinyfish", "--hue-perplexity", "--hue-context", "--hue-exa", "--hue-tavily"] as const;

export function Wordmark() {
  return (
    <span className="wordmark">
      <span aria-hidden="true" className="wordmark-bars">
        {BARS.map((hue, i) => (
          <span key={hue} style={{ background: `var(${hue})`, height: `${100 - Math.abs(3 - i) * 18}%` }} />
        ))}
      </span>
      searchSDK
    </span>
  );
}
