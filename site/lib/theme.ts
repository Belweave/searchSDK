/**
 * Theme: dark for every visitor unless they choose light. The choice is kept in localStorage and
 * applied before first paint by THEME_SCRIPT, which also marks the document as running script
 * (data-js) so motion components can start from their first frame instead of their final one.
 */
export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "searchsdk-theme";

export const THEME_SCRIPT = `(function(){var d=document.documentElement;d.setAttribute("data-js","");try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light"){d.setAttribute("data-theme","light");d.classList.remove("dark")}}catch(e){}})();`;

export function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute("data-theme-switching", "");
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page.
  }
  // Two frames: the new colours paint without transitions, then transitions come back.
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
  window.dispatchEvent(new Event("searchsdk-theme"));
}
