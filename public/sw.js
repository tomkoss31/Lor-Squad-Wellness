// =============================================================================
// Lor'Squad Service Worker (2026-05-05)
//
// Gère :
//   - install/activate (skip waiting + claim + cache cleanup)
//   - push (display notif avec actions)
//   - notificationclick (focus tab existante OU openWindow + navigation)
//
// Fix 2026-05-05 : la notif arrivait bien mais le clic ne naviguait nulle
// part. Cause : `client.navigate(url)` est instable / silencieusement KO sur
// iOS PWA standalone et certains Android. Pattern fiable = `focus` la tab,
// puis `postMessage({ type: 'SW_NAVIGATE', url })` au front qui route via
// React Router (App.tsx). Fallback `openWindow(url)` si aucune tab ouverte.
// =============================================================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Lor'Squad Wellness";
  const typeIcons = {
    urgent: "🔴",
    relance: "🔔",
    pv: "📦",
    info: "✦",
  };
  const icon = typeIcons[data.type] || "✦";

  // Tag unique par défaut pour éviter le regroupement (sinon les notifs
  // se REMPLACENT entre elles : la nouvelle écrase l'ancienne dans le
  // shade Android / Notification Center iOS). Si une edge function veut
  // explicitement remplacer (ex. digest matin du même jour), elle passe
  // un tag fixe dans data.tag.
  const fallbackTag = `lor-squad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/lor-squad-icon-192.png",
      badge: "/icons/lor-squad-icon-192.png",
      tag: data.tag || fallbackTag,
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
      actions: [
        { action: "open", title: `${icon} Ouvrir` },
        { action: "dismiss", title: "Ignorer" },
      ],
    })
  );
});

// ─── Click handler — fix navigation 2026-05-05 ────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Action "Ignorer" → ferme juste, pas de navigation
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  // URL absolue pour fallback openWindow (en relatif certaines plateformes
  // ouvrent http://lien-relatif/path → 404)
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        // 1. Chercher une tab Lor'Squad déjà ouverte (même origin)
        const existing = clientList.find(
          (c) => c.url.startsWith(self.location.origin) && "focus" in c
        );

        if (existing) {
          // Focus en premier (geste utilisateur respecté)
          try {
            await existing.focus();
          } catch {
            /* certains contextes throw — on continue */
          }

          // Demander à l'app de naviguer via React Router (App.tsx écoute
          // 'message' et appelle navigate(url) — pas de full reload).
          try {
            existing.postMessage({
              type: "SW_NAVIGATE",
              url: targetUrl,
            });
          } catch {
            /* postMessage échoué : on tombe sur le fallback navigate */
          }

          // Fallback navigation : utile si le front n'a pas de listener
          // (vieille version cachée). client.navigate() peut throw — best-effort.
          try {
            if (typeof existing.navigate === "function") {
              await existing.navigate(absoluteUrl);
            }
          } catch {
            /* silencieux : focus + postMessage suffisent en général */
          }
          return;
        }

        // 2. Aucune tab ouverte → openWindow nouvelle
        if (self.clients.openWindow) {
          await self.clients.openWindow(absoluteUrl);
        }
      })
  );
});
