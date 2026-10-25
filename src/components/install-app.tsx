"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function deviceInfo() {
  if (typeof window === "undefined") {
    return { installed: false, ios: false, mobile: false };
  }
  const ua = navigator.userAgent;
  return {
    installed:
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    ios: /iPad|iPhone|iPod/.test(ua),
    mobile: /Android|iPad|iPhone|iPod/.test(ua),
  };
}

export function InstallApp() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [{ installed, ios, mobile }, setDevice] = useState(deviceInfo);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => setDevice((current) => ({ ...current, installed: true }));
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setDevice((current) => ({ ...current, installed: true }));
    setInstallEvent(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="size-4" /> Desktop
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Install Leatherme as an app on this computer. It opens on its own, without the browser chrome.</p>
          {installed ? (
            <p className="font-medium text-foreground">Leatherme is installed on this device.</p>
          ) : installEvent ? (
            <Button onClick={install}>Download to this computer</Button>
          ) : (
            <p>
              In Chrome or Edge, use the install icon in the address bar, or the browser menu item{" "}
              <span className="text-foreground">Install Leatherme</span>.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-4" /> Phone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Add Leatherme to the home screen so it launches like a phone app.</p>
          {installed && mobile ? (
            <p className="font-medium text-foreground">Leatherme is on this phone.</p>
          ) : ios ? (
            <p>
              In Safari, tap <span className="text-foreground">Share</span>, then{" "}
              <span className="text-foreground">Add to Home Screen</span>.
            </p>
          ) : installEvent ? (
            <Button onClick={install}>Download to this phone</Button>
          ) : (
            <p>
              In Chrome for Android, open the menu and tap <span className="text-foreground">Install app</span> or{" "}
              <span className="text-foreground">Add to Home screen</span>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
