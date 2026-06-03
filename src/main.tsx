import React from "react";
import ReactDOM from "react-dom/client";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import App from "./App";
import { AppProvider } from "./context/AppContext";
import { InstallPromptProvider } from "./context/InstallPromptContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles/globals.css";
import "./styles/rentabilite.css";

// Polyfill drapeaux Twemoji (2026-05-17) : Windows Chrome ne rend pas les
// regional indicator emojis (les drapeaux pays apparaissent "FR/GB/MX/BR/TR/IN"
// au lieu de 🇫🇷🇬🇧🇲🇽🇧🇷🇹🇷🇮🇳). Injecte une @font-face "Twemoji Country Flags"
// qui mappe vers des SVG Twemoji. Aucun impact macOS/iOS/Android.
polyfillCountryFlagEmojis();

// Chantier mobile Onde 4 (2026-05-20) — activation accent hybrid par défaut.
// Validé Thomas : teal pour CTAs interactifs, gold conservé pour identité
// (éléments avec classe .gold-keep). Toggle désactivable plus tard dans
// Paramètres si nécessaire (persisté localStorage 'ls-accent-mode').
try {
  const storedAccent = localStorage.getItem("ls-accent-mode");
  if (storedAccent !== "gold") {
    // Default = hybrid si rien ou si "hybrid" stocké
    document.documentElement.classList.add("accent-hybrid");
  }
} catch {
  // Si localStorage indispo, on active hybrid quand même
  document.documentElement.classList.add("accent-hybrid");
}

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

// Auto-réparation après déploiement : si un chunk lazy (ex. page Rentabilité)
// échoue à charger — typiquement parce qu'un ancien index.html en cache pointe
// vers un chunk qui n'existe plus après un déploiement — on recharge une fois
// pour récupérer le nouvel index.html + ses chunks frais. sessionStorage évite
// toute boucle de rechargement si l'erreur est réelle (chunk vraiment absent).
window.addEventListener("vite:preloadError", () => {
  const KEY = "ls-chunk-reload-once";
  if (sessionStorage.getItem(KEY)) return;
  sessionStorage.setItem(KEY, "1");
  window.location.reload();
});

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
