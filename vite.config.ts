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

          // Note 2026-04-29 : on ne split QUE les libs qui sont
          // chargees lazy (via dynamic import dans le code applicatif).
          // Tout le reste (react, react-dom, recharts, dnd-kit, etc.)
          // va dans le chunk par defaut pour eviter les circular deps
          // qui causent "Cannot read useState of undefined".

          // html2canvas + jspdf : chargees lazy par AcademyCertificatePage
          // (dynamic import quand l user click download). Chunks dedies
          // pour ne pas polluer le bundle initial.
          if (id.includes("html2canvas")) {
            return "html2canvas";
          }
          if (id.includes("jspdf")) {
            return "jspdf";
          }

          // supabase-js : import statique global mais relativement gros.
          // Chunk dedie pour cache long-terme (ne change pas souvent).
          if (id.includes("@supabase/supabase-js")) {
            return "supabase-vendor";
          }

          // react-router-dom : import statique global, chunk dedie pour
          // cache long-terme.
          if (id.includes("react-router-dom")) {
            return "router-vendor";
          }

          // Tout le reste va dans le chunk par defaut (vendor) sans
          // distinction. Vite optimise les imports automatiquement.
          return undefined;
        }
      }
    }
  }
});
