import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./landing.css";

/* The app names "JetBrains Mono" in its theme but never loads it (the field app
   leans on the system mono fallback). The landing actually ships it: every
   readout, callsign, and coordinate here is set in it. Binding it to --font-mono
   overrides the theme literal within this route, so Tailwind's `font-mono`
   resolves to the real, self-hosted face — no FOUT, no layout shift. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IRMA — Guía de funciones",
  description:
    "Recorrido detallado de cada función de IRMA: mapa en vivo, seguimiento de equipo, gráficos tácticos, alertas, transportes conectables, protocolo de cable, interop CoT y PWA offline.",
};

/* The root layout locks zoom for the map app; a long-form reading page must let
   the operator pinch to enlarge text. Override just for this route. */
export const viewport: Viewport = {
  themeColor: "#0a0e0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={mono.variable}>{children}</div>;
}
