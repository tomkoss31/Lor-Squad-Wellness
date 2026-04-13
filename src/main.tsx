import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProvider } from "./context/AppContext";
import { InstallPromptProvider } from "./context/InstallPromptContext";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <InstallPromptProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </InstallPromptProvider>
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
