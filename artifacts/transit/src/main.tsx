import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./hooks/use-theme";
import { audio } from "./lib/audio";
import "./index.css";

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
