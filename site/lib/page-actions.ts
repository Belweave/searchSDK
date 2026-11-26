/**
 * "Open in" destinations for docs pages: each opens a new chat with a prefilled prompt that asks
 * the assistant to read the page's Markdown copy. Patterns and where each was confirmed
 * (2026-11-25). None is a formal API, so a product may change or drop its parameter.
 *   ChatGPT     ?prompt= (+ hints=search): as fumadocs-ui 16.19.7 page actions ship it.
 *   Claude      /new?q=: as fumadocs-ui 16.19.7 ships it.
 *   Cursor      /link/prompt?text=: Cursor's deeplink docs (cursor.com/docs/integrations/deeplinks);
 *               the user confirms before it runs.
 *   Perplexity  /search?q=: the widely used search-template URL.
 *   T3 Chat     /new?q= (+ search=true): T3 Chat's FAQ (t3.chat/faq).
 *   v0          /chat?q=: Vercel community answer; v0 sends the prompt on load.
 */
export type OpenInTarget = { name: string; href: string };

export function openInPrompt(markdownUrl: string): string {
  return `Read ${markdownUrl} and help me with searchSDK`;
}

export function openInTargets(markdownUrl: string): OpenInTarget[] {
  const q = openInPrompt(markdownUrl);
  const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();
  return [
    { name: "ChatGPT", href: `https://chatgpt.com/?${qs({ prompt: q, hints: "search" })}` },
    { name: "Claude", href: `https://claude.ai/new?${qs({ q })}` },
    { name: "Cursor", href: `https://cursor.com/link/prompt?${qs({ text: q })}` },
    { name: "Perplexity", href: `https://www.perplexity.ai/search?${qs({ q })}` },
    { name: "T3 Chat", href: `https://t3.chat/new?${qs({ q, search: "true" })}` },
    { name: "v0", href: `https://v0.app/chat?${qs({ q })}` },
  ];
}
