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

          // Chantier C.2 v2 + D v2 (2026-04-29) : recharts (~100KB) et
          // dnd-kit (~50KB) chargees uniquement sur les pages concernees
          // (AnalyticsPage et ClientsPage en mode kanban) -> chunks dedies.
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }
          if (id.includes("@dnd-kit")) {
            return "dnd-kit";
          }

          if (id.includes("react-dom") || id.includes("react")) {
            return "react-vendor";
          }

          return "vendor";
        }
      }
    }
  }
});
