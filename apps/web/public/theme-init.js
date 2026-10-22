// Runs before styles and React. Keep this same-origin for the static site's CSP.
(() => {
  let theme = "system";
  try {
    const stored = localStorage.getItem("searchsdk-theme");
    if (stored === "light" || stored === "dark" || stored === "system") theme = stored;
  } catch { /* Appearance follows the OS when storage is unavailable. */ }
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b0c0f" : "#ffffff");
})();
