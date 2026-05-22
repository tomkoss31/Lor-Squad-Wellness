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

          // Audit 2026-04-30 : split de recharts et @dnd-kit qui sont des
          // libs lourdes utilisees uniquement sur des pages lazy
          // (AnalyticsPage, PvKanban, ClientsPage). Permet de retirer
          // ~400 KB du bundle initial vendor.
          if (id.includes("recharts")) {
            return "recharts-vendor";
          }
          if (id.includes("@dnd-kit") || id.includes("@hello-pangea/dnd")) {
            return "dnd-vendor";
          }

          // Chantier #11 polish (2026-05-22) : split additionnel de libs
          // utilisees uniquement sur quelques pages pour alleger index.js.
          // qrcode.react → ClientDetailPage, BilanTermineePage (lazy).
          if (id.includes("qrcode.react")) {
            return "qrcode-vendor";
          }
          // react-signature-canvas → ConsentDialog (lazy via consent flow).
          if (id.includes("react-signature-canvas")) {
            return "signature-vendor";
          }
          // country-flag-emoji-polyfill → chargé init main.tsx mais ~80kb,
          // split pour cache long-terme isolé.
          if (id.includes("country-flag-emoji-polyfill")) {
            return "flag-emoji-polyfill";
          }

          // Tout le reste va dans le chunk par defaut (vendor) sans
          // distinction. Vite optimise les imports automatiquement.
          return undefined;
        }
      }
    }
  }
});
