import { createRoot } from "react-dom/client";
<<<<<<< HEAD
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// Initialize Sentry for error tracking in production
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
=======
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
