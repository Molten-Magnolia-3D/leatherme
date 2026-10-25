"use client";

import { useEffect, useRef, useState } from "react";

type VersionInfo = {
  version: string;
  buildId: string;
};

export function UpdateManager() {
  const seen = useRef<VersionInfo | null>(null);
  const reloading = useRef(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    async function register() {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            applyUpdate(registration, "Updating Leatherme…");
          }
        });
      });
      await checkVersion(registration);
    }

    async function checkVersion(registration: ServiceWorkerRegistration) {
      try {
        const response = await fetch("/version.json", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as VersionInfo;
        if (cancelled) return;
        if (!seen.current) {
          seen.current = next;
          return;
        }
        if (seen.current.version !== next.version || seen.current.buildId !== next.buildId) {
          seen.current = next;
          await registration.update();
          applyUpdate(registration, `Updating to Leatherme ${next.version}…`);
        }
      } catch {
        // Stay on the current copy if the check cannot reach the server.
      }
    }

    function applyUpdate(registration: ServiceWorkerRegistration, message: string) {
      if (reloading.current) return;
      setBanner(message);
      registration.waiting?.postMessage("SKIP_WAITING");
    }

    function onControllerChange() {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void register();

    const onVisible = () => {
      void navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) void checkVersion(registration);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, 60_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!banner) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#3b2416] px-4 py-2 text-sm text-[#f4efe6] shadow-lg">
      {banner}
    </div>
  );
}
