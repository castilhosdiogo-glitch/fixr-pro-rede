import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Inicializa o Sentry (monitoramento de erros) — skip se DSN não configurado
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Registra o Service Worker do PWA com auto-update
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      // Verifica atualizações a cada 30 min
      setInterval(() => reg.update(), 30 * 60 * 1000);
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);