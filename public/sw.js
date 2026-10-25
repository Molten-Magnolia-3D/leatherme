const PREFIX = "leatherme-";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(await currentCacheName());
      await cache.addAll(["/", "/releases", "/icon.svg", "/manifest.webmanifest"]).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = await currentCacheName();
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== keep).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/version.json" || url.pathname === "/sw.js") return;

  const local = isLocalhost();
  event.respondWith(local ? networkFirst(request) : staleWhileRevalidate(request));
});

function isLocalhost() {
  return self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
}

async function currentCacheName() {
  try {
    const response = await fetch("/version.json", { cache: "no-store" });
    const data = await response.json();
    return `${PREFIX}${data.version}-${data.buildId}`;
  } catch {
    return `${PREFIX}offline`;
  }
}

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(await currentCacheName());
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetching;
}
