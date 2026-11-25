// Service Worker: funciona offline e trata cliques nas notificações.
const CACHE = "meuapp-v3";
const ASSETS = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (para pegar atualizações), cache como reserva offline.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) { if ("focus" in c) { c.navigate?.(url); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});

// Pronto para Web Push (caso no futuro você conecte um servidor de push).
self.addEventListener("push", e => {
  const data = e.data ? e.data.json() : { title: "Meu App", body: "Você tem um novo alerta" };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "icons/icon-192.png", data: { url: data.url || "./" } }));
});
