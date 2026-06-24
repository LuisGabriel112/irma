"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store/useStore";
import { StatusBar } from "@/components/StatusBar";
import { ToolDock } from "@/components/ToolDock";
import { SidePanel } from "@/components/SidePanel";
import { SetupGate } from "@/components/SetupGate";

// MapLibre touches `window` at import — load it browser-only.
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-tac-bg text-sm text-tac-muted">
      Iniciando mapa…
    </div>
  ),
});

const POSITION_BROADCAST_MS = 5000;

export function AppShell() {
  const setSelfPosition = useStore((s) => s.setSelfPosition);
  const setBattery = useStore((s) => s.setBattery);
  const hydrateIdentity = useStore((s) => s.hydrateIdentity);
  const hydrateSession = useStore((s) => s.hydrateSession);
  const setupComplete = useStore((s) => s.setupComplete);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted identity after mount (client-only) to avoid hydration mismatch.
  // `hydrated` gates the first paint so returning operators don't flash the gate.
  useEffect(() => {
    hydrateIdentity();
    hydrateSession();
    setHydrated(true);
  }, [hydrateIdentity, hydrateSession]);

  // GPS watch — keeps own position fresh once available. No auto-connect: the
  // operator chooses a transport after setup, so no pin appears unbidden.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        // Respect a hand-pinned position — desktop "GPS" is coarse IP/wifi and
        // would otherwise yank the operator back to a wrong spot.
        if (useStore.getState().self.posManual) return;
        const c = pos.coords;
        setSelfPosition({
          lat: c.latitude,
          lng: c.longitude,
          heading: c.heading != null && !Number.isNaN(c.heading) ? c.heading : undefined,
          speed: c.speed != null && !Number.isNaN(c.speed) ? c.speed : undefined,
          accuracy: c.accuracy,
        });
      },
      (err) => {
        useStore.setState((s) => ({
          log: [`${new Date().toLocaleTimeString([], { hour12: false })} GPS: ${err.message}`, ...s.log].slice(0, 200),
        }));
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [setSelfPosition]);

  // Battery telemetry (best-effort; Chromium only)
  useEffect(() => {
    type BatteryLike = { level: number; addEventListener: (e: string, cb: () => void) => void };
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    if (!nav.getBattery) return;
    let battery: BatteryLike | null = null;
    const update = () => battery && setBattery(Math.round(battery.level * 100));
    nav.getBattery().then((b) => {
      battery = b;
      update();
      b.addEventListener("levelchange", update);
    });
  }, [setBattery]);

  // Periodically beacon our position over the active link
  useEffect(() => {
    const t = setInterval(() => {
      const s = useStore.getState();
      if (s.connection.state === "connected") s.broadcastPosition();
    }, POSITION_BROADCAST_MS);
    return () => clearInterval(t);
  }, []);

  // Drop peers we haven't heard from in a while so disconnected units don't ghost the map.
  useEffect(() => {
    const t = setInterval(() => useStore.getState().pruneStale(), 30_000);
    return () => clearInterval(t);
  }, []);

  // Register service worker for offline field use (production only; dev breaks HMR)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Keep the map (and shell) mounted once hydrated; show the setup gate as an
  // opaque overlay instead of unmounting MapView. Tearing Leaflet down/up on every
  // gate toggle raced its canvas renderer's pending redraw (the clearRect crash).
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-tac-bg">
      {hydrated && (
        <>
          <MapView />
          <StatusBar />
          <ToolDock />
          <SidePanel />
          {!setupComplete && <SetupGate />}
        </>
      )}
    </main>
  );
}
