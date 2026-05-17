import React from "react";
import ReactDOM from "react-dom/client";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import App from "./App";
import { AppProvider } from "./context/AppContext";
import { InstallPromptProvider } from "./context/InstallPromptContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles/globals.css";

// Polyfill drapeaux Twemoji (2026-05-17) : Windows Chrome ne rend pas les
// regional indicator emojis (les drapeaux pays apparaissent "FR/GB/MX/BR/TR/IN"
// au lieu de 🇫🇷🇬🇧🇲🇽🇧🇷🇹🇷🇮🇳). Injecte une @font-face "Twemoji Country Flags"
// qui mappe vers des SVG Twemoji. Aucun impact macOS/iOS/Android.
polyfillCountryFlagEmojis();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <InstallPromptProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </InstallPromptProvider>
    </ToastProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let hasReloadedForServiceWorker = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloadedForServiceWorker) {
        return;
      }

      hasReloadedForServiceWorker = true;
      window.location.reload();
    });

    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.update())
      .catch((error) => {
        console.error("Service worker non initialise.", error);
      });
  });
}
