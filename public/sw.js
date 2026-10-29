const CACHE = "ridemywork-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/offline"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/auth") || url.pathname.startsWith("/api")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { const copy=response.clone(); void caches.open(CACHE).then((cache)=>cache.put(request,copy)); return response; })));
  }
});
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "RideMyWork", body: "You have a new update." };
  event.waitUntil(self.registration.showNotification(data.title || "RideMyWork", { body: data.body || "You have a new update.", icon: "/brand/pwa-icon-192.png", badge: "/brand/logo-icon-light.png", data: { href: data.href || "/ride/activity" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/ride";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    return existing ? existing.navigate(href).then((client) => client?.focus()) : self.clients.openWindow(href);
  }));
});
