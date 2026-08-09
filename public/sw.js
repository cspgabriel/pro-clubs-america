const CACHE = "pro-clubs-america-v4";
const SHELL = ["/", "/buscar/", "/clubes/", "/jogadores/", "/mercado/", "/partidas/", "/partidas/amistosos/", "/cadastro/", "/rankings/jogadores/artilharia/", "/rankings/clubes/artilharia/", "/rankings/times/", "/club/171630/", "/icon.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
});
