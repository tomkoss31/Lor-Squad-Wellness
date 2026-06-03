// =============================================================================
// La Base 360 Service Worker (rebrand 2026-05-05)
//
// Gère :
//   - install/activate (skip waiting + claim + cache cleanup)
//   - push (display notif type-aware avec actions contextuelles)
//   - notificationclick (focus tab + postMessage React Router OU openWindow)
//
// Refonte visuelle 2026-05-05 :
//   - Comportements par type (vibration / requireInteraction / renotify /
//     silent) → un RDV imminent vibre fort et reste affiché, un digest
//     matin est silencieux et discret.
//   - Actions contextuelles selon le type (Répondre / Voir RDV / Cocher
//     IPA / etc.) au lieu du sempiternel Ouvrir/Ignorer.
//   - Tag unique par défaut → chaque notif apparaît à part dans le shade.
//   - Click sur action = URL dérivée du type (ex. "reply" ouvre
//     ?compose=true sur la page message).
// =============================================================================

// Version bump = force la propagation d'une mise à jour à TOUS les clients.
// Changer cette constante à chaque déploiement front important : le navigateur
// détecte le nouveau sw.js → install → skipWaiting → activate (vide les caches)
// → controllerchange → reload auto → l'utilisateur récupère le dernier bundle.
const SW_VERSION = "2026-06-03-6";
void SW_VERSION;

self.addEventListener("install", () => {
  self.skipWaiting();
});

// Listen for SKIP_WAITING messages depuis SwUpdatePrompt cote client.
// Quand l'user click 'Activer' sur le toast 'Mise a jour disponible',
// on bascule immediatement le nouveau SW en controleur.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// ─── Profils de notif par type ────────────────────────────────────────────
//
// Centralise toutes les variantes : pattern de vibration, persistance,
// actions, suffixe d'URL pour les actions contextuelles. Ajouter un type
// = ajouter une entrée ici, le reste s'adapte automatiquement.
//
// Types provenant des edge functions :
//   - "rdv_imminent"              (rdv-imminent-notifier)
//   - "client_message"            (new-message-notifier, coach reçoit)
//   - "coach_message"             (new-coach-message-notifier, client reçoit)
//   - "morning_digest"            (morning-suivis-digest)
//   - "info" / "warning"          (flex-notifier, coach-tips-dispatcher)
//   - "formation_admin_relay"     (formation-relay-to-admin)
//   - "formation_validation_pending"
//   - "urgent" / "relance" / "pv" (génériques)
//
// Comportement iOS PWA : vibrate, requireInteraction, image, plus de 2
// actions sont ignorés silencieusement par WebKit. On définit quand même,
// Android exploite, iOS dégrade gracieusement.
const NOTIF_PROFILES = {
  rdv_imminent: {
    icon: "📅",
    vibrate: [400, 100, 400, 100, 400],
    requireInteraction: true,
    renotify: true,
    silent: false,
    actions: [
      { action: "open", title: "📍 Voir le RDV" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  client_message: {
    icon: "💬",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "reply", title: "💬 Répondre" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  coach_message: {
    icon: "💬",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "reply", title: "💬 Répondre" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  morning_digest: {
    icon: "🌅",
    vibrate: [100],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "open", title: "📋 Voir mes suivis" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  flex: {
    icon: "⚡",
    vibrate: [100, 50, 100],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "open", title: "✓ Cocher mes IPA" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  info: {
    icon: "✦",
    vibrate: [100, 50, 100],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "open", title: "✦ Voir" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  warning: {
    icon: "⚠️",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "open", title: "⚠️ Voir" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  formation_admin_relay: {
    icon: "🚨",
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    renotify: true,
    silent: false,
    actions: [
      { action: "open", title: "🚨 Traiter" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  formation_validation_pending: {
    icon: "📚",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "open", title: "📚 Voir le module" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  urgent: {
    icon: "🔴",
    vibrate: [400, 100, 400, 100, 400],
    requireInteraction: true,
    renotify: true,
    silent: false,
    actions: [
      { action: "open", title: "🔴 Ouvrir" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  relance: {
    icon: "🔔",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "open", title: "🔔 Voir" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
  pv: {
    icon: "📦",
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: false,
    silent: false,
    actions: [
      { action: "open", title: "📦 Voir" },
      { action: "dismiss", title: "Plus tard" },
    ],
  },
};

const DEFAULT_PROFILE = NOTIF_PROFILES.info;

function profileFor(type) {
  return NOTIF_PROFILES[type] || DEFAULT_PROFILE;
}

// ─── Push display ─────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  // Debug 2026-05-06 : log explicite pour identifier si push event arrive
  // au SW. Si tu ne vois RIEN dans la console quand un test est envoye,
  // c'est que le SW n'est pas register OU l'endpoint est obsolete.
  console.log("[sw-lb360] push event received", { hasData: !!event.data });

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    console.error("[sw-lb360] push payload parse error:", err);
  }
  const title = data.title || "La Base 360";
  const profile = profileFor(data.type);
  console.log("[sw-lb360] showNotification:", { title, type: data.type });

  // Tag unique par défaut → évite que les notifs s'écrasent entre elles
  // dans le shade Android / Notification Center iOS. Edge function peut
  // forcer un tag fixe via data.tag pour les cas regroupement voulu
  // (ex. digest matin du même jour qui remplace l'ancien).
  const fallbackTag = `labase360-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/brand/labase360/pwa-192.png",
      badge: data.badge || "/brand/labase360/pwa-192.png",
      // image (bannière Android, ignorée iOS) : si fournie par l'edge
      // function via data.image, on l'utilise. Sinon pas de bannière.
      ...(data.image ? { image: data.image } : {}),
      tag: data.tag || fallbackTag,
      data: {
        url: data.url || "/",
        type: data.type || "info",
      },
      vibrate: profile.vibrate,
      requireInteraction: profile.requireInteraction,
      renotify: profile.renotify,
      silent: profile.silent,
      actions: profile.actions,
      timestamp: Date.now(),
    })
  );
});

// ─── Click handler ────────────────────────────────────────────────────────
//
// Règles de navigation :
//   - action "dismiss"  → ferme, pas de navigation
//   - action "reply"    → ouvre URL avec ?compose=true (front gère)
//   - action "open" ou click sur le body de la notif → URL standard
//
// Pattern fiable :
//   1. Tab existante → focus + postMessage SW_NAVIGATE → React Router
//      (transition fluide, pas de full reload)
//   2. Aucune tab → openWindow(absoluteUrl)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const baseUrl = event.notification.data?.url || "/";
  let targetUrl = baseUrl;

  // Action "reply" : ajouter ?compose=true à l'URL pour ouvrir le composer
  // direct dans l'app (front lit le query param).
  if (event.action === "reply") {
    targetUrl = baseUrl.includes("?")
      ? `${baseUrl}&compose=true`
      : `${baseUrl}?compose=true`;
  }

  // URL absolue (évite 404 sur paths relatifs en openWindow)
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        const existing = clientList.find(
          (c) => c.url.startsWith(self.location.origin) && "focus" in c
        );

        if (existing) {
          try {
            await existing.focus();
          } catch {
            /* certains contextes throw — on continue */
          }

          // Demander à l'app de naviguer via React Router
          try {
            existing.postMessage({
              type: "SW_NAVIGATE",
              url: targetUrl,
            });
          } catch {
            /* postMessage KO : fallback navigate ci-dessous */
          }

          // Fallback navigate() best-effort silencieux pour les vieux
          // bundles cachés sans le ServiceWorkerNavigator.
          try {
            if (typeof existing.navigate === "function") {
              await existing.navigate(absoluteUrl);
            }
          } catch {
            /* silencieux */
          }
          return;
        }

        if (self.clients.openWindow) {
          await self.clients.openWindow(absoluteUrl);
        }
      })
  );
});
