import Link from "next/link";
import type { ReactNode } from "react";
import {
  Map as MapIcon,
  Users,
  PencilRuler,
  Navigation,
  Siren,
  MessagesSquare,
  Radio,
  Binary,
  Cpu,
  Network,
  ShieldCheck,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { MeshHero } from "@/components/landing/MeshHero";
import { Reveal } from "@/components/landing/Reveal";
import { CodeBlock } from "@/components/landing/CodeBlock";
import {
  Chip,
  Dot,
  Kicker,
  Panel,
  Prose,
  SpecRow,
} from "@/components/landing/primitives";
import {
  MapMock,
  RosterMock,
  AffiliationFrames,
  ToolDockMock,
  NavHud,
  TransportList,
  CommsMock,
  AlertBanner,
} from "@/components/landing/mocks";

/* Section anchors used by the sticky rail and in-page jumps. */
const NAV = [
  ["mapa", "Mapa"],
  ["equipo", "Equipo"],
  ["graficos", "Gráficos"],
  ["navegacion", "Navegación"],
  ["alertas", "Alertas"],
  ["comms", "Comms"],
  ["transportes", "Transportes"],
  ["protocolo", "Protocolo"],
  ["arquitectura", "Arquitectura"],
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-tac-bg font-sans text-tac-text antialiased">
      <TopRail />
      <Hero />
      <main>
        <Manifesto />
        <MapSection />
        <TeamSection />
        <GraphicsSection />
        <NavSection />
        <AlertSection />
        <CommsSection />
        <TransportSection />
        <ProtocolSection />
        <CotSection />
        <SecuritySection />
        <ArchitectureSection />
      </main>
      <Footer />
    </div>
  );
}

/* ----------------------------------------------------------------- chrome --- */

function TopRail() {
  return (
    <header className="sticky top-0 z-40 border-b border-tac-line bg-tac-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="#top" className="flex items-center gap-2" aria-label="IRMA — inicio">
          <span className="grid size-6 place-items-center rounded-[5px] bg-tac-accent text-tac-bg">
            <span className="font-mono text-[0.7rem] font-bold leading-none">I</span>
          </span>
          <span className="font-mono text-[0.875rem] font-bold tracking-[0.18em] text-tac-accent">
            IRMA
          </span>
        </Link>
        <nav className="hidden flex-1 items-center gap-5 overflow-x-auto lg:flex">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="font-sans text-[0.8125rem] text-tac-muted transition-colors hover:text-tac-text"
            >
              {label}
            </a>
          ))}
        </nav>
        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-1.5 rounded-tac bg-tac-accent px-3.5 py-2 font-sans text-[0.8125rem] font-semibold text-tac-bg transition-opacity hover:opacity-90 lg:ml-0"
        >
          Abrir la app
          <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-tac-line">
      <div className="hero-fade pointer-events-none absolute inset-0">
        <MeshHero />
      </div>
      <div className="tac-grid pointer-events-none absolute inset-0 opacity-[0.35]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Kicker tone="accent">Conciencia situacional táctica · PWA</Kicker>
          <span className="hidden h-3 w-px bg-tac-line sm:block" />
          <Kicker>Referencia: ATAK-CIV, menos el desorden</Kicker>
        </div>
        <h1 className="mt-6 max-w-4xl text-balance font-sans text-[clamp(2.25rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.02em] text-tac-text">
          Posición del equipo, gráficos sobre el terreno y coordinación en un solo instrumento.
        </h1>
        <Prose className="mt-6 max-w-2xl text-[1.0625rem] text-tac-text/85">
          IRMA es una plataforma de conciencia situacional de clase ATAK,
          reconstruida como app web instalable. Esta página recorre, una por una,
          cada función y cómo encaja en el instrumento.
        </Prose>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Chip icon={<Dot color="#3ddc84" />} tone="accent">
            Enlace activo
          </Chip>
          <Chip icon={<MapIcon className="size-3.5" strokeWidth={2} />} tone="muted">
            Offline-first · instalable
          </Chip>
          <Chip icon={<Network className="size-3.5" strokeWidth={2} />} tone="muted">
            Transportes conectables
          </Chip>
        </div>
        <a
          href="#mapa"
          className="mt-14 inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-tac-muted transition-colors hover:text-tac-accent"
        >
          <ChevronDown className="size-4 hero-nudge" strokeWidth={2} />
          Recorrer las funciones
        </a>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- sections --- */

/* Section scaffold — a quiet two-part header (icon + name + count), then a free
   body. Layout varies per section; this only sets vertical rhythm + the anchor. */
function Section({
  id,
  index,
  icon,
  title,
  children,
  className,
}: {
  id: string;
  index: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`landing-section border-b border-tac-line ${className ?? ""}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <div className="flex items-center gap-3 text-tac-muted">
            <span className="text-tac-accent">{icon}</span>
            <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.18em]">
              {index} · {title}
            </span>
            <span className="h-px flex-1 bg-tac-line" />
          </div>
        </Reveal>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="max-w-3xl text-balance font-sans text-[clamp(1.6rem,3.5vw,2.5rem)] font-bold leading-tight tracking-[-0.015em] text-tac-text">
      {children}
    </h2>
  );
}

function Manifesto() {
  return (
    <section className="landing-section border-b border-tac-line bg-tac-panel/20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal>
          <p className="max-w-4xl text-balance font-sans text-[clamp(1.5rem,3.2vw,2.4rem)] font-semibold leading-[1.25] tracking-[-0.01em] text-tac-text">
            No es una app vestida de táctica. Es un{" "}
            <span className="text-tac-accent">instrumento</span>: fondo casi
            negro, una sola luz de estado encendida por contexto, números
            monoespaciados que nunca tiemblan al actualizarse. Se lee de un
            vistazo — bajo el sol, en movimiento, con guantes.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-12 grid gap-px overflow-hidden rounded-tac border border-tac-line bg-tac-line sm:grid-cols-3">
            {[
              ["El mapa es el producto", "El cromo es un marco translúcido alrededor del terreno real, nunca un competidor."],
              ["Honesto sobre el enlace", "Jamás finge conectividad. El transporte activo y su salud siempre son legibles."],
              ["El movimiento informa", "Cada animación reporta estado — un ping, un pulso de enlace — o no se incluye."],
            ].map(([t, d]) => (
              <div key={t} className="bg-tac-bg p-6">
                <h3 className="font-sans text-[0.95rem] font-semibold text-tac-text">{t}</h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-tac-text/75">{d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MapSection() {
  return (
    <Section id="mapa" index="01" icon={<MapIcon className="size-4" />} title="El mapa en vivo">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <H2>El terreno, en primer plano y sin adornos.</H2>
          <Prose className="mt-5">
            Mapa raster oscuro (tiles CARTO, sin API key) sobre Leaflet, elegido a
            propósito: funciona en cualquier entorno —incluso máquinas virtuales o
            escritorios remotos sin WebGL— donde un mapa vectorial se caería. Tu
            posición se dibuja como una flecha de rumbo sobre un pulso suave, con
            un anillo que representa la precisión real del GPS (CE en metros).
          </Prose>
          <Prose className="mt-4">
            Si concedes el sensor de orientación, la flecha gira con la brújula
            física del dispositivo. Sin señal GPS, IRMA abre en un centro por
            defecto y te deja fijar tu ubicación a mano sin que un fix impreciso
            la sobrescriba.
          </Prose>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Chip tone="accent" icon={<Dot color="#3ddc84" />}>Flecha de rumbo + pulso</Chip>
            <Chip tone="muted">Anillo de precisión GPS</Chip>
            <Chip tone="muted">Brújula real del dispositivo</Chip>
          </div>
        </div>
        <Reveal delay={60}>
          <MapMock />
        </Reveal>
      </div>
    </Section>
  );
}

function TeamSection() {
  return (
    <Section id="equipo" index="02" icon={<Users className="size-4" />} title="Seguimiento de equipo">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <H2>Cada unidad, su afiliación, su estado y su última señal.</H2>
          <Prose className="mt-5">
            Los pares llegan por la malla y se renderizan por afiliación. El roster
            del panel derecho lista rango, rumbo, batería, símbolo MIL-STD-2525 y
            estado operativo de cada unidad — <span className="font-mono text-tac-accent">OK</span>,{" "}
            <span className="font-mono text-tac-danger">HERIDO</span>,{" "}
            <span className="font-mono text-tac-warn">AYUDA</span> o{" "}
            <span className="font-mono text-tac-muted">FUERA</span>. Un compañero sin
            fix GPS no desaparece: se muestra como presente, sin coordenadas.
          </Prose>
          <Prose className="mt-4">
            La afiliación está bloqueada a cuatro colores reservados y, sobre todo,
            reforzada con forma: así un déficit rojo-verde nunca lee «hostil» como
            «aliado». Toca una unidad para volar hacia ella o trazar su rastro de
            migas (breadcrumbs) histórico.
          </Prose>
          <div className="mt-8">
            <Kicker>Bloqueo de afiliación — color + forma</Kicker>
            <div className="mt-3">
              <AffiliationFrames />
            </div>
          </div>
        </div>
        <Reveal delay={60}>
          <Panel label="Unidades · 5" icon={<Users className="size-3.5" />}>
            <RosterMock />
          </Panel>
        </Reveal>
      </div>
    </Section>
  );
}

function GraphicsSection() {
  return (
    <Section id="graficos" index="03" icon={<PencilRuler className="size-4" />} title="Gráficos tácticos">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <Panel label="Herramientas" icon={<PencilRuler className="size-3.5" />} className="p-4">
            <ToolDockMock />
          </Panel>
        </Reveal>
        <div>
          <H2>Dibuja sobre el terreno; todo se difunde a la red.</H2>
          <Prose className="mt-5">
            Coloca marcadores de afiliación y puntos de ruta; traza líneas,
            polígonos y círculos; mide rango y rumbo entre dos toques. Cada
            gráfico que creas se transmite a toda la sala, así que el equipo
            comparte el mismo cuadro táctico en tiempo real.
          </Prose>
          <Prose className="mt-4">
            Un polígono o círculo puede marcarse como{" "}
            <span className="text-tac-accent">geocerca</span>: IRMA vigila qué
            unidades entran o salen de la zona y lanza un aviso con sonido en el
            cruce. La herramienta es el dock izquierdo, de celdas de 40 px
            operables con guantes; se enciende exactamente una a la vez.
          </Prose>
          <div className="mt-6 grid gap-px overflow-hidden rounded-tac border border-tac-line bg-tac-line sm:grid-cols-2">
            {[
              ["Marcadores", "Aliado · hostil · neutral · punto de ruta"],
              ["Dibujo libre", "Línea · polígono · círculo"],
              ["Regla", "Rango + rumbo entre dos clics"],
              ["Geocerca", "Aviso de entrada/salida con beep"],
            ].map(([t, d]) => (
              <div key={t} className="bg-tac-bg px-4 py-3.5">
                <div className="font-sans text-[0.875rem] font-semibold text-tac-text">{t}</div>
                <div className="mt-1 font-mono text-[0.6875rem] text-tac-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function NavSection() {
  return (
    <Section id="navegacion" index="04" icon={<Navigation className="size-4" />} title="Navegación a objetivo">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <H2>Selecciona un objetivo: distancia y rumbo en vivo.</H2>
          <Prose className="mt-5">
            El modo <span className="text-tac-accent">bloodhound</span>: elige una
            unidad o un marcador y IRMA te da distancia y rumbo en vivo hacia él,
            recalculados con cada paso. La flecha de tu posición, orientada por la
            brújula del teléfono, te dice no solo dónde está el objetivo sino hacia
            dónde mirar para alcanzarlo.
          </Prose>
          <Prose className="mt-4">
            Distancia por haversine, rumbo en grados verdaderos. Todo en mono
            tabular: el número grande no salta ni reflota mientras cambia, se lee
            como un velocímetro.
          </Prose>
        </div>
        <Reveal delay={60} className="lg:justify-self-end">
          <NavHud />
        </Reveal>
      </div>
    </Section>
  );
}

function AlertSection() {
  return (
    <Section id="alertas" index="05" icon={<Siren className="size-4" />} title="Alertas y emergencia">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Alertas de un toque, difundidas a todo el equipo.</H2>
          <Prose className="mt-5">
            El botón de pánico transmite tu posición y hace parpadear una baliza
            roja en el mapa de cada compañero, con aviso sonoro, hasta que se
            limpia. Las alertas tienen tipo —{" "}
            <span className="font-mono text-tac-danger">PÁNICO</span>,{" "}
            <span className="font-mono text-tac-warn">MÉDICO</span>,{" "}
            <span className="font-mono text-tac-info">CONTACTO</span> — para que el
            receptor sepa de inmediato a qué responde.
          </Prose>
          <Prose className="mt-4">
            Para una evacuación, IRMA incluye un formulario{" "}
            <span className="text-tac-accent">CASEVAC de 9 líneas</span> (MEDEVAC):
            ubicación de recogida, frecuencia, pacientes por precedencia y tipo,
            equipo especial, seguridad en el sitio, marcado, nacionalidad y notas
            de terreno. Se difunde a la red como un paquete más.
          </Prose>
        </div>
        <div className="space-y-6">
          <Reveal>
            <AlertBanner />
          </Reveal>
          <Reveal delay={80}>
            <Panel label="CASEVAC · 9 líneas" icon={<Siren className="size-3.5" />} className="px-4 py-2">
              <SpecRow label="1 · Ubicación" value="14Q QG 31 64" tone="text" />
              <SpecRow label="3 · Precedencia" value="1 urgente · 1 prioritario" tone="warn" />
              <SpecRow label="4 · Equipo" value="Camilla" tone="text" />
              <SpecRow label="6 · Seguridad" value="P — posible enemigo" tone="danger" />
              <SpecRow label="7 · Marcado" value="Humo naranja" tone="text" />
            </Panel>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

function CommsSection() {
  return (
    <Section id="comms" index="06" icon={<MessagesSquare className="size-4" />} title="Comunicación de red">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Texto, voz y video sobre el mismo enlace.</H2>
          <Prose className="mt-5">
            Chat de difusión por la red para la coordinación que debe quedar
            escrita. Cuando el transporte lo permite, IRMA añade voz por{" "}
            <span className="text-tac-accent">mantener-para-hablar</span> (PTT) y
            video en vivo entre pares vía WebRTC — útil para confirmar una
            situación que el texto no alcanza a describir.
          </Prose>
          <Prose className="mt-4">
            La voz y el video escalan con el ancho de banda del enlace: ricos sobre
            relay o Wi-Fi, ausentes cuando el enlace es estrecho, sin que la app
            pretenda lo contrario. La comunicación sigue la regla de honestidad del
            enlace.
          </Prose>
        </div>
        <Reveal delay={60}>
          <CommsMock />
        </Reveal>
      </div>
    </Section>
  );
}

function TransportSection() {
  return (
    <Section id="transportes" index="07" icon={<Radio className="size-4" />} title="Transportes conectables">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Una app, varios enlaces; el estado de cada uno siempre visible.</H2>
          <Prose className="mt-5">
            La abstracción <span className="font-mono text-tac-accent">Transport</span>{" "}
            es la decisión de diseño clave: la app envía y recibe{" "}
            <span className="font-mono">Packet</span>s sobre cualquier enlace. Hoy
            expone dos: una malla simulada para probar sin hardware y un relay
            WebSocket que comparte salas por internet. Añadir un enlace nuevo es una
            sola implementación de <span className="font-mono">Transport</span> — sin
            tocar la interfaz ni el estado.
          </Prose>
          <Prose className="mt-4">
            Cada transporte reporta su propio estado con una sola luz: verde
            conectado, ámbar conectando, rojo sin enlace. El instrumento nunca
            pinta de verde un enlace muerto.
          </Prose>
        </div>
        <Reveal delay={60}>
          <TransportList />
        </Reveal>
      </div>
    </Section>
  );
}

function ProtocolSection() {
  const packet = `{"t":0,"i":"a1b2","c":"RAVEN-1","a":"f",
 "la":19.4326,"ln":-99.1332,"h":270,"b":88,
 "ts":1718480000000}`;
  const types: [string, string, string][] = [
    ["0", "posición", "id, callsign, afiliación, lat/lng, rumbo, batería"],
    ["1", "mensaje", "id, de, a (omitir = difusión), texto"],
    ["2", "marcador", "id, tipo, afiliación, coords, radio, etiqueta"],
    ["3", "borrar-marcador", "id"],
    ["4", "ping", "id, de, lat/lng"],
    ["5", "alerta", "id, de, tipo (pánico/médico/contacto), lat/lng"],
  ];
  return (
    <Section id="protocolo" index="08" icon={<Binary className="size-4" />} title="Protocolo de cable">
      <H2>JSON compacto: una línea por paquete, claves cortas.</H2>
      <Prose className="mt-5">
        Cada paquete viaja como una línea de JSON con claves abreviadas para
        ocupar poco. El campo <span className="font-mono">t</span> es el código de
        tipo; las afiliaciones se codifican en una letra:{" "}
        <span className="font-mono">s</span> propio,{" "}
        <span className="font-mono">f</span> aliado, <span className="font-mono">n</span>{" "}
        neutral, <span className="font-mono">h</span> hostil,{" "}
        <span className="font-mono">u</span> desconocido.
      </Prose>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Reveal>
          <CodeBlock caption="paquete de posición — packet.ts" code={packet} />
          <p className="mt-3 font-mono text-[0.6875rem] text-tac-muted">
            El códec valida el tamaño del paquete antes de transmitir; uno que
            excede el límite del enlace se rechaza, no se trunca en silencio.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="overflow-hidden rounded-tac border border-tac-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-tac-line bg-tac-panel/60">
                  <th className="px-3 py-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">t</th>
                  <th className="px-3 py-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">tipo</th>
                  <th className="px-3 py-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">campos clave</th>
                </tr>
              </thead>
              <tbody>
                {types.map(([t, name, fields]) => (
                  <tr key={t} className="border-b border-tac-line last:border-0">
                    <td className="px-3 py-2.5 font-mono text-[0.8125rem] font-bold text-tac-accent">{t}</td>
                    <td className="px-3 py-2.5 font-mono text-[0.75rem] text-tac-text">{name}</td>
                    <td className="px-3 py-2.5 font-mono text-[0.6875rem] leading-relaxed text-tac-muted">{fields}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function CotSection() {
  const cot = `<event version="2.0" uid="RAVEN-1"
  type="a-f-G-U-C" how="m-g"
  time="2026-06-30T18:00:00Z"
  start="2026-06-30T18:00:00Z"
  stale="2026-06-30T18:05:00Z">
  <point lat="19.4326" lon="-99.1332"
         hae="0" ce="9" le="0"/>
  <detail>
    <contact callsign="RAVEN-1"/>
    <__group name="Cyan" role="Team Member"/>
  </detail>
</event>`;
  return (
    <Section id="cot" index="09" icon={<Network className="size-4" />} title="Interop CoT">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Un puente al ecosistema TAK.</H2>
          <Prose className="mt-5">
            IRMA mapea sus paquetes a y desde{" "}
            <span className="text-tac-accent">Cursor-on-Target</span>, el formato
            XML que hablan ATAK, WinTAK y TAK Server. Una posición propia se
            convierte en un <span className="font-mono">{`<event>`}</span> CoT con su
            tipo de afiliación, punto con precisión (ce) y detalle de contacto —
            de modo que un equipo en IRMA y otro en ATAK pueden verse en el mismo
            cuadro.
          </Prose>
          <Prose className="mt-4">
            La afiliación se traduce al esquema de tipo CoT (
            <span className="font-mono">a-f-…</span> aliado,{" "}
            <span className="font-mono">a-h-…</span> hostil), preservando el
            significado entre sistemas.
          </Prose>
        </div>
        <Reveal delay={60}>
          <CodeBlock caption="evento CoT generado — cot.ts" code={cot} lang="xml" />
        </Reveal>
      </div>
    </Section>
  );
}

function SecuritySection() {
  return (
    <Section id="seguridad" index="10" icon={<ShieldCheck className="size-4" />} title="Salas, cifrado y coordenadas">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            t: "Salas compartidas",
            d: "Un código de sala agrupa al equipo sobre el relay WebSocket. Comparte URL + código por QR y todos se ven en el mapa, desde cualquier red.",
          },
          {
            t: "Cifrado de sala",
            d: "Una frase secreta compartida deriva una clave que cifra el tráfico de la sala de extremo a extremo; la frase nunca sale del dispositivo.",
          },
          {
            t: "Cuadrícula MGRS",
            d: "Rejilla y referencias MGRS sobre el mapa, además de lat/lng — el lenguaje de coordenadas que el trabajo de campo espera.",
          },
        ].map((c, i) => (
          <Reveal key={c.t} delay={i * 70}>
            <div className="h-full rounded-tac border border-tac-line bg-tac-panel/40 p-5">
              <ShieldCheck className="size-5 text-tac-accent" strokeWidth={2} />
              <h3 className="mt-4 font-sans text-[1rem] font-semibold text-tac-text">{c.t}</h3>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-tac-text/75">{c.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function ArchitectureSection() {
  const tree = `src/
  lib/
    protocol/   packet.ts · cot.ts
    transport/  base · simulated · websocket
                manager
    store/      useStore.ts (Zustand)
    geo/        haversine · rumbo · MGRS
    webrtc/     mesh.ts (voz + video)
  components/
    map/MapView.tsx   (Leaflet, dibujo, popups)
    MapHud · ToolDock · SidePanel · panels/*
    AppShell.tsx      (GPS, brújula, SW)`;
  return (
    <Section id="arquitectura" index="11" icon={<Cpu className="size-4" />} title="Arquitectura y stack">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Un núcleo pequeño, un enlace intercambiable.</H2>
          <Prose className="mt-5">
            Todo converge en el patrón Transport: protocolo, estado y UI no saben
            ni les importa por qué cable viaja un paquete. Esa frontera limpia es
            lo que deja que la misma app corra sobre malla simulada o relay de
            internet sin reescribirse.
          </Prose>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Next.js 15", "React 19", "TypeScript", "Tailwind v4", "Leaflet", "Zustand", "MapLibre", "milsymbol"].map((s) => (
              <span key={s} className="rounded-tac border border-tac-line bg-tac-panel/50 px-2.5 py-1 font-mono text-[0.6875rem] text-tac-muted">
                {s}
              </span>
            ))}
          </div>
        </div>
        <Reveal delay={60}>
          <CodeBlock caption="estructura del proyecto" code={tree} lang="text" />
        </Reveal>
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="bg-tac-bg">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-[0.875rem] font-bold tracking-[0.18em] text-tac-accent">IRMA</span>
            <p className="mt-3 max-w-md text-[0.875rem] leading-relaxed text-tac-text/70">
              Proyecto educativo y civil de conciencia situacional. No afiliado al
              TAK Product Center ni al Gobierno de EE. UU.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-tac border border-tac-line px-4 py-2.5 font-sans text-[0.8125rem] font-semibold text-tac-text transition-colors hover:border-tac-muted"
          >
            Abrir el instrumento
            <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>
        <div className="mt-10 border-t border-tac-line pt-6 font-mono text-[0.6875rem] text-tac-muted">
          SAR · seguridad de eventos · expediciones · respuesta voluntaria.
        </div>
      </div>
    </footer>
  );
}
