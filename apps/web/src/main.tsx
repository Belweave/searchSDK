import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./pages/App.js";
import "./styles.css";

const root = typeof document === "undefined" ? null : document.getElementById("root");
if (root) {
  // Static routes carry the path they rendered, including /404 when the host
  // serves that document at an unknown URL. Hydration must match that tree.
  const app = <React.StrictMode><App path={root.dataset.route} /></React.StrictMode>;
  if (root.hasChildNodes()) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
