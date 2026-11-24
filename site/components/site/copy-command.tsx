"use client";

import { useEffect, useState } from "react";

/** A one-line command with a copy button. The button's label is the only thing that changes. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the command stays selectable.
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface-1 py-2 pr-2 pl-4">
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-fg">
        <code>
          <span aria-hidden="true" className="select-none text-fg-subtle">$ </span>
          {command}
        </code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="relative h-8 w-16 shrink-0 rounded-sm bg-surface-2 text-sm text-fg transition-colors duration-[var(--motion-fast)] ease-standard hover:bg-line"
      >
        <span className={`transition-opacity duration-[var(--motion-fast)] ${copied ? "opacity-0" : "opacity-100"}`}>Copy</span>
        <span aria-live="polite" className={`absolute inset-0 grid place-items-center transition-opacity duration-[var(--motion-fast)] ${copied ? "opacity-100" : "opacity-0"}`}>
          {copied ? "Copied" : ""}
        </span>
      </button>
    </div>
  );
}
