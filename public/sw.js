const CACHE = "pro-clubs-america-v6";
const SHELL = ["/", "/buscar/", "/clubes/", "/jogadores/", "/mercado/", "/partidas/", "/partidas/amistosos/", "/cadastro/", "/rankings/jogadores/artilharia/", "/rankings/clubes/artilharia/", "/rankings/times/", "/club/171630/", "/icon.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/") || url.pathname.endsWith(".txt")) return;
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
});
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(payload.title || "Pro Clubs America", {
    body: payload.body || "Você tem uma nova atualização.",
    icon: "/brand/pro-clubs-america-192.png",
    badge: "/brand/pro-clubs-america-192.png",
    tag: payload.tag || "pro-clubs-america",
    data: { url: payload.url || "/inicio/" },
    vibrate: [120, 60, 120],
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/inicio/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const current = windows.find((client) => client.url.startsWith(self.location.origin));
    return current ? current.focus().then(() => current.navigate(target)) : clients.openWindow(target);
  }));
});
