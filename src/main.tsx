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

// Registra o Service Worker do PWA com auto-update agressivo.
// Quando um SW novo assume controle, recarrega a página para pegar
// bundles novos (evita ficar preso em cache antigo após deploy).
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      reg.update();
      setInterval(() => reg.update(), 5 * 60 * 1000);
      window.addEventListener("focus", () => reg.update());
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);