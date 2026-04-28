import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockRouter } from "./lib/mock-backend/router";
import App from "./App";
import { ThemeProvider } from "./hooks/use-theme";
import { audio } from "./lib/audio";
import "./index.css";

(window as any).__mockRouter = mockRouter;

// Global click feedback
if (typeof window !== "undefined") {
  window.addEventListener("click", () => {
    audio.playClick();
  });
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
