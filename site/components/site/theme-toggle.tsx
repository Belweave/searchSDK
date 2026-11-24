"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener("searchsdk-theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("searchsdk-theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Switches dark and light. Renders the same markup on the server; the label settles after hydration. */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
      className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors duration-[var(--motion-fast)] ease-standard hover:bg-surface-2 hover:text-fg"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="10" r="6.25" />
        <path d="M10 3.75v12.5a6.25 6.25 0 0 0 0-12.5Z" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
