import { useEffect, useRef, useState } from "react";
import { useMounted } from "./useMounted.js";

// A small display tokenizer, not an evaluator. React escapes every token.
export function highlightCode(source: string) {
  const tokens = source.split(/(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|export|default|const|let|if|else|throw|new|return|await|async|for|of|try|catch|interface|type|readonly|function|typeof|instanceof|true|false|null|undefined)\b|\b\d[\d_]*(?:\.\d+)?\b)/g);
  return tokens.map((token, index) => {
    const kind = /^(\/\/|#)/.test(token) ? "comment" : /^["'`]/.test(token) ? "string" : /^\d/.test(token) ? "number" : /^(import|from|export|default|const|let|if|else|throw|new|return|await|async|for|of|try|catch|interface|type|readonly|function|typeof|instanceof|true|false|null|undefined)$/.test(token) ? "keyword" : "plain";
    return <span className={`dw-token-${kind}`} key={index}>{token}</span>;
  });
}

export function CodeBlock({ code, title, language }: { code: string; title: string; language: string }) {
  const ready = useMounted();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const codeElement = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearTimeout(timer.current); }; }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      if (!mounted.current) return;
      setState("copied");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 2_000);
    } catch {
      if (!mounted.current) return;
      setState("failed");
      const selection = window.getSelection();
      if (selection && codeElement.current) {
        const range = document.createRange();
        range.selectNodeContents(codeElement.current);
        selection.removeAllRanges(); selection.addRange(range);
        codeElement.current.parentElement?.focus();
      }
    }
  }
  return <figure className="dw-code">
    <figcaption><span>{title}</span><button type="button" disabled={!ready} onClick={copy} aria-label={`Copy ${title}`}>{state === "copied" ? "Copied ✓" : "Copy"}</button></figcaption>
    <pre tabIndex={0} aria-label={title}><code ref={codeElement} className={`language-${language}`}>{highlightCode(code)}</code></pre>
    <span className={state === "failed" ? "dw-copy-feedback" : "dw-sr-only"} role="status">{state === "copied" ? "Code copied to clipboard." : state === "failed" ? "Clipboard unavailable. Code selected; use your keyboard or browser menu to copy." : ""}</span>
  </figure>;
}
