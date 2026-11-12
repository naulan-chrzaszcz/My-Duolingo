// Speakeasy — service worker : fonctionnement hors ligne + notifications de rappel
const CACHE = "__CACHE__"; // remplacé au build : speakeasy-v<version>-<empreinte du contenu>
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/badge-96.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Polices Google et photos du TOEIC (Unsplash) : gardées en cache pour fonctionner hors ligne
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com" || u.hostname === "images.unsplash.com") {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (u.origin !== location.origin || u.pathname.includes("/api/")) return;
  // Polices hébergées sur le serveur : servies depuis le cache (hors ligne), mises à jour en arrière-plan
  if (u.pathname.includes("/fonts/")) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (e.request.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith(".html")) {
    // Réseau d'abord (mises à jour immédiates), cache si hors ligne
    // … avec un délai max : sur un réseau très lent (métro, avion), on ouvre tout de suite la version en cache
    const net = fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put("./index.html", c)); } return r; });
    const slow = new Promise(res => setTimeout(() => caches.match("./index.html").then(c => c && res(c)), 3500));
    e.respondWith(Promise.race([net, slow]).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || "Speakeasy 🐯", { body: d.body || "Ta série t'attend ! Quelques minutes suffisent pour la garder 🔥", icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: "daily", data: { url: "./#parcours" } }),
    self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => {}) : Promise.resolve()
  ]));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { for (const c of cs) { if ("focus" in c) return c.focus(); } return clients.openWindow((e.notification.data && e.notification.data.url) || "./"); }));
});
