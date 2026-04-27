import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react-router-dom")) {
            return "router-vendor";
          }

          if (id.includes("@supabase/supabase-js")) {
            return "supabase-vendor";
          }

          // Academy certificat — libs lourdes lazy-loadees via dynamic
          // import dans AcademyCertificatePage. Chunks dedies pour pas
          // polluer le vendor principal (chargees uniquement quand le
          // user clique download PNG/JPEG/PDF).
          if (id.includes("html2canvas")) {
            return "html2canvas";
          }
          if (id.includes("jspdf")) {
            return "jspdf";
          }

          // Note 2026-04-29 : recharts/dnd-kit retires des manualChunks
          // car causaient une race condition "Cannot read useState of undefined"
          // (chunks chargeaient avant react-vendor). Vite les regroupe dans
          // vendor proprement maintenant.

          if (id.includes("react-dom") || id.includes("react")) {
            return "react-vendor";
          }

          return "vendor";
        }
      }
    }
  }
});
