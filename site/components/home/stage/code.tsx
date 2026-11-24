import type { ReactNode } from "react";

/**
 * A small TypeScript and JSON highlighter for the stage: enough tokens to read as code, colours
 * from the --code-* tokens. Output is spans; nothing is parsed beyond one line at a time.
 */
const KEYWORDS = new Set(["import", "from", "const", "await", "as", "export", "return", "if"]);
const CALLS = new Set(["search", "contents", "map", "all", "log"]);

export function highlightTs(line: string, key: string | number): ReactNode {
  const out: ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*"?)|(\b\d[\d_.]*\b)|(\b[A-Za-z_$][\w$]*\b)|([^\w"\s]+)|(\s+)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    const [text, str, num, word, punct] = m;
    const cls = str !== undefined ? "c-str" : num ? "c-num" : word ? (KEYWORDS.has(word) ? "c-kw" : CALLS.has(word) && line[re.lastIndex] === "(" ? "c-fn" : null) : punct ? "c-p" : null;
    out.push(cls ? <span key={i++} className={cls}>{text}</span> : text);
  }
  return <span key={key}>{out}</span>;
}

/** Pretty JSON as highlighted lines. Long strings are shortened so a body fits its panel. */
export function jsonLines(value: unknown, opts: { maxString?: number; mark?: Set<string>; markClass?: string } = {}): ReactNode[] {
  const maxString = opts.maxString ?? 46;
  const short = (s: string) => (s.length > maxString ? `${s.slice(0, maxString - 1)}…` : s);
  const text = JSON.stringify(value, (_, v) => (typeof v === "string" ? short(v) : v), 2) ?? "";
  return text.split("\n").map((line, n) => {
    const m = line.match(/^(\s*)"([^"]+)":\s?(.*)$/);
    if (!m) return <span key={n} className="code-line">{tokenValue(line)}</span>;
    const indent = m[1] ?? "";
    const name = m[2] ?? "";
    const rest = m[3] ?? "";
    const marked = opts.mark?.has(name);
    return (
      <span key={n} className="code-line">
        {indent}
        <span className={marked ? (opts.markClass ?? "c-mark") : "c-key"}>&quot;{name}&quot;</span>
        <span className="c-p">: </span>
        {tokenValue(rest)}
      </span>
    );
  });
}

function tokenValue(s: string): ReactNode {
  const m = s.match(/^(\s*)("(?:[^"\\]|\\.)*")(,?)$/);
  if (m) return (
    <>
      {m[1]}
      <span className="c-str">{m[2]}</span>
      <span className="c-p">{m[3]}</span>
    </>
  );
  const n = s.match(/^(\s*)(-?\d[\d.e+-]*|true|false|null)(,?)$/);
  if (n) return (
    <>
      {n[1]}
      <span className="c-num">{n[2]}</span>
      <span className="c-p">{n[3]}</span>
    </>
  );
  return <span className="c-p">{s}</span>;
}
