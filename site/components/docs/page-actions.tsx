"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "fumadocs-ui/components/ui/popover";
import { MarkdownCopyButton } from "fumadocs-ui/layouts/docs/page";
import type { OpenInTarget } from "@/lib/page-actions";

/**
 * Copy the page as Markdown (Fumadocs' own button, fetching the page's .md copy) and open it in an
 * AI assistant. Both buttons have a fixed width, so the copied state and the open menu never move
 * the page; the menu is a Radix popover (focus moves in, Escape closes, focus returns).
 */
export function PageActions({ markdownUrl, targets }: { markdownUrl: string; targets: OpenInTarget[] }) {
  return (
    <div className="ssdk-page-actions not-prose" role="group" aria-label="Page actions" data-words="chrome">
      <MarkdownCopyButton markdownUrl={markdownUrl} className="ssdk-page-action ssdk-copy" />
      <Popover>
        <PopoverTrigger className={`${buttonVariants({ variant: "secondary", size: "sm" })} ssdk-page-action gap-2`}>
          Open in
          <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </PopoverTrigger>
        <PopoverContent align="start" className="ssdk-open-in flex flex-col p-1">
          <nav aria-label="Open this page in an AI assistant">
            <ul className="flex flex-col">
              {targets.map((t) => (
                <li key={t.name}>
                  <a href={t.href} target="_blank" rel="noopener noreferrer" className="ssdk-open-in-item">
                    {t.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </PopoverContent>
      </Popover>
    </div>
  );
}
