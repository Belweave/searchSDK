"use client";

import { useState } from "react";

/** Copies a one-line prompt that points a coding agent at llms.txt. A key like the others. */
export function AgentKey({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="key"
      data-track="agent_prompt_copied"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(prompt);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      aria-live="polite"
    >
      <span className="key-face">
        {copied ? "Prompt copied" : "Set up with your agent"}
        <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" />
          <path d="M10.5 5.5V3.7a1.2 1.2 0 0 0-1.2-1.2H3.7a1.2 1.2 0 0 0-1.2 1.2v5.6a1.2 1.2 0 0 0 1.2 1.2h1.8" />
        </svg>
      </span>
    </button>
  );
}
