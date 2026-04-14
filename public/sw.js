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

// ── Push Notifications ──
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

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/lor-squad-icon-192.png",
      badge: "/icons/lor-squad-icon-192.png",
      tag: data.tag || "lor-squad-notification",
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
      actions: [
        { action: "open", title: `${icon} Ouvrir` },
        { action: "dismiss", title: "Ignorer" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
