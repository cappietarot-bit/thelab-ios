/* Service worker for The Lab.

   The page registers "./sw.js" and, when a reminder is due, posts
   {type:"notify", title, body, tag} to it. Showing the notification from the
   worker rather than from the page means it still appears when the app is in
   the background, which is the whole reason the page prefers this path.

   Why this file has to exist at all: the page does

       const reg = _sw || (navigator.serviceWorker && await navigator.serviceWorker.ready)

   and navigator.serviceWorker.ready never resolves when no worker is
   registered. So with this file missing, that await hangs forever and the
   fallback new Notification(...) on the next line is never reached, meaning no
   reminder is shown at all. The old shell loaded file://, where the page
   skipped registration and navigator.serviceWorker was absent, so it fell
   through to the fallback. Capacitor serves https://localhost, where the
   registration runs for real.

   Deliberately no caching. The page is served from inside the APK and the old
   shell already had to force LOAD_NO_CACHE because a stale cached copy kept
   silently showing an old build after an update. A caching worker would
   reintroduce exactly that. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "notify") return;
  e.waitUntil(
    self.registration.showNotification(d.title || "The Lab", {
      body: d.body || "",
      tag: d.tag || "vialback-due",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      renotify: false,
    })
  );
});

/* Tapping the notification should bring the app forward rather than opening
   another copy of it. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
