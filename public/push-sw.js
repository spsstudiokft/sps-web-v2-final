self.addEventListener("push", (event) => {
  let payload = { title: "SPS Studio", body: "Új értesítésed érkezett.", link: "/" };
  try { payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, icon: "/images/sps-cinematic-hero.png", badge: "/images/sps-cinematic-hero.png", data: { link: payload.link }, tag: `sps-${Date.now()}` }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); const target = new URL(event.notification.data?.link || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => { const existing = windows.find((client) => client.url.startsWith(self.location.origin)); if (existing) return existing.focus().then(() => existing.navigate(target)); return clients.openWindow(target); }));
});
