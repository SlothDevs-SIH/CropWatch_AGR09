import React from "react";
import { createRoot } from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import App from "./App.jsx";
import { LangProvider } from "./lib/i18n.jsx";

createRoot(document.getElementById("root")).render(<LangProvider><App /></LangProvider>);

// Offline shell: cache the app and the map outlines so the site opens with no signal after one visit. Production builds only.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
