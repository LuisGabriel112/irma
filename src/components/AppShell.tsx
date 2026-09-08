"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store/useStore";
import { joinFromLocation } from "@/lib/join";
import { StatusBar } from "@/components/StatusBar";
import { ToolDock } from "@/components/ToolDock";
import { SidePanel } from "@/components/SidePanel";
import { SetupGate } from "@/components/SetupGate";
import { RemoteAudio } from "@/components/RemoteAudio";
import { VoicePtt } from "@/components/VoicePtt";
import { AlertBanner, CasevacBanner, DrawControls, GeofenceBanner, NavHud, ReplayPanel } from "@/components/MapHud";

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
    // A shared join link (?join=): if this operator already finished setup, the
    // gate won't show, so adopt the room + passphrase and connect right here.
    // First-run operators are handled by the setup gate's own prefill.
    const j = joinFromLocation();
    if (j && useStore.getState().setupComplete) {
      window.history.replaceState(null, "", window.location.pathname);
      useStore.getState().applyJoin(j.room, j.secret, j.relay);
    }
    setHydrated(true);
  }, [hydrateIdentity, hydrateSession]);

  // GPS watch — keeps own position fresh once available. No auto-connect: the
  // operator chooses a transport after setup, so no pin appears unbidden.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let id: number;
    const start = () => {
      id = navigator.geolocation.watchPosition(
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
    };
    start();

    // iOS Safari suspends the watch (and its own auto-resume never fires) once
    // the screen locks or the tab backgrounds — restart it on return so the
    // operator's pin doesn't freeze at the last position before lock.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      navigator.geolocation.clearWatch(id);
      start();
      const s = useStore.getState();
      if (s.connection.state === "connected") s.broadcastPosition();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      navigator.geolocation.clearWatch(id);
    };
  }, [setSelfPosition]);

  // Real compass heading from the device magnetometer. The desktop has no
  // compass; phones do — this makes the own-position arrow point true even when
  // stationary (GPS only reports course while moving). Throttled to ~5 Hz and a
  // 3° threshold so we don't thrash the store. iOS 13+ needs a gesture-gated
  // permission grant, so we wire that on the first user touch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let last = 0;
    let lastHeading = -999;
    const onOrient = (e: DeviceOrientationEvent) => {
      const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      const heading =
        ev.webkitCompassHeading != null
          ? ev.webkitCompassHeading // iOS: already true-north heading
          : ev.alpha != null
            ? (360 - ev.alpha) % 360 // others: alpha is counter-clockwise from north
            : null;
      if (heading == null) return;
      const t = Date.now();
      if (t - last < 200 || Math.abs(heading - lastHeading) < 3) return;
      last = t;
      lastHeading = heading;
      useStore.setState((s) => ({ self: { ...s.self, heading } }));
    };

    type OrientCtor = { requestPermission?: () => Promise<"granted" | "denied"> };
    const DOE = window.DeviceOrientationEvent as unknown as OrientCtor | undefined;
    const add = () => window.addEventListener("deviceorientation", onOrient, true);

    if (DOE?.requestPermission) {
      // iOS: must ask after a user gesture.
      const ask = () => {
        DOE.requestPermission!().then((r) => r === "granted" && add()).catch(() => {});
        window.removeEventListener("touchend", ask);
        window.removeEventListener("click", ask);
      };
      window.addEventListener("touchend", ask, { once: true });
      window.addEventListener("click", ask, { once: true });
      return () => {
        window.removeEventListener("touchend", ask);
        window.removeEventListener("click", ask);
        window.removeEventListener("deviceorientation", onOrient, true);
      };
    }
    add();
    return () => window.removeEventListener("deviceorientation", onOrient, true);
  }, []);

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

  // Mission history recorder — snapshot all unit positions while connected, so
  // the timeline can replay the operation afterwards.
  useEffect(() => {
    const t = setInterval(() => {
      const s = useStore.getState();
      if (s.connection.state === "connected" && !s.replay.active) s.recordFrame();
    }, 4000);
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
          <DrawControls />
          <NavHud />
          <ReplayPanel />
          <AlertBanner />
          <GeofenceBanner />
          <CasevacBanner />
          <VoicePtt />
          <RemoteAudio />
          {!setupComplete && <SetupGate />}
        </>
      )}
    </main>
  );
}
