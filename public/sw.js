/* NekoTask Studio — service worker
 * - Funciona sin internet: guarda la app y abre la última versión conocida.
 * - Recibe notificaciones push con los recordatorios de las gatitas.
 */
const VERSION = "neko-v3"; // súbela cuando cambien íconos o sprites para que el celular los renueve
const ESTATICOS = `${VERSION}-estaticos`;
const PAGINAS = `${VERSION}-paginas`;
const INICIO = ["/", "/manifest.webmanifest", "/iconos/icono-192.png", "/iconos/insignia-96.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGINAS).then((c) => c.addAll(INICIO)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((llaves) => Promise.all(llaves.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Supabase, Google, fuentes: directo a la red
  if (url.pathname.startsWith("/api/")) return;               // datos siempre frescos

  // archivos con huella (_next/static, íconos): primero caché
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/iconos/") || url.pathname.startsWith("/sprites/")) {
    e.respondWith(
      caches.match(req).then((g) => g || fetch(req).then((r) => {
        const copia = r.clone();
        caches.open(ESTATICOS).then((c) => c.put(req, copia));
        return r;
      })),
    );
    return;
  }

  // páginas: primero la red; sin internet, la última copia
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(PAGINAS).then((c) => c.put("/", copia));
          return r;
        })
        .catch(() => caches.match(req).then((g) => g || caches.match("/"))),
    );
  }
});

// ─── Notificaciones ────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  let aviso = { titulo: "NekoTask", cuerpo: "Tienes un recordatorio", gatita: "blanquita", url: "/", clave: "neko" };
  try { aviso = { ...aviso, ...e.data.json() }; } catch (_) { /* texto plano */ }
  e.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: `/iconos/gatitas/${aviso.gatita}.png`,
      badge: "/iconos/insignia-96.png",
      tag: aviso.clave,
      renotify: false,
      data: { url: aviso.url },
      actions: (aviso.acciones || []).map((a) => ({ action: a.accion, title: a.titulo })),
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  let destino = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) {
        abierta.postMessage({ tipo: "neko-navegar", url: destino });
        return abierta.focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
