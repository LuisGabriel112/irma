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
  ["graficos", "Dibujos"],
  ["navegacion", "Guía"],
  ["alertas", "Alertas"],
  ["comms", "Chat"],
  ["transportes", "Conexión"],
  ["protocolo", "Los datos"],
  ["arquitectura", "Cómo funciona"],
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
          <Kicker tone="accent">Mapa de equipo en vivo · App web</Kicker>
          <span className="hidden h-3 w-px bg-tac-line sm:block" />
          <Kicker>Inspirada en ATAK, mucho más simple</Kicker>
        </div>
        <h1 className="mt-6 max-w-4xl text-balance font-sans text-[clamp(2.25rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.02em] text-tac-text">
          Ve dónde está tu equipo, marca lo importante y coordínate — todo en un mismo mapa.
        </h1>
        <Prose className="mt-6 max-w-2xl text-[1.0625rem] text-tac-text/85">
          IRMA es una app web para que un equipo en el campo se vea en un mismo
          mapa y trabaje junto. Aquí te explicamos, una por una, cada parte y para
          qué sirve.
        </Prose>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Chip icon={<Dot color="#3ddc84" />} tone="accent">
            Conexión activa
          </Chip>
          <Chip icon={<MapIcon className="size-3.5" strokeWidth={2} />} tone="muted">
            Funciona sin internet · se instala
          </Chip>
          <Chip icon={<Network className="size-3.5" strokeWidth={2} />} tone="muted">
            Varias formas de conectarse
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
            Está pensada para el campo, no para un escritorio. Pantalla{" "}
            <span className="text-tac-accent">oscura</span>, un solo color de aviso
            a la vez y números grandes y claros que no bailan al cambiar. Se
            entiende de un vistazo — bajo el sol, caminando, con guantes puestos.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-12 grid gap-px overflow-hidden rounded-tac border border-tac-line bg-tac-line sm:grid-cols-3">
            {[
              ["El mapa es lo importante", "Todo lo demás son marcos discretos alrededor del mapa; nunca le estorban."],
              ["Sincera con la conexión", "Nunca finge que hay señal. Siempre ves qué conexión usas y si está bien."],
              ["Las animaciones avisan", "Cada animación te dice algo —una alerta, una señal— o no está ahí."],
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
          <H2>El mapa, siempre en primer plano.</H2>
          <Prose className="mt-5">
            Un mapa oscuro que carga rápido y funciona hasta en equipos viejos o
            con conexiones flojas. Tú apareces como una flecha que apunta hacia
            donde miras, sobre un pulso suave; el círculo a su alrededor muestra
            qué tan preciso es tu GPS en ese momento.
          </Prose>
          <Prose className="mt-4">
            Si le das permiso a la brújula, la flecha gira con el teléfono. Y si te
            quedas sin GPS, puedes poner tu posición a mano tocando el mapa, sin
            que una señal mala te la mueva.
          </Prose>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Chip tone="accent" icon={<Dot color="#3ddc84" />}>Flecha que apunta a dónde miras</Chip>
            <Chip tone="muted">Círculo de precisión del GPS</Chip>
            <Chip tone="muted">Brújula del teléfono</Chip>
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
    <Section id="equipo" index="02" icon={<Users className="size-4" />} title="Dónde está tu equipo">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <H2>Cada compañero, con su color, su estado y su última señal.</H2>
          <Prose className="mt-5">
            Cada quien aparece con un color según sea propio, aliado, neutral u
            hostil. En la lista de la derecha ves de cada uno: a qué distancia
            está, hacia dónde, su batería, su símbolo militar y cómo está —{" "}
            <span className="font-mono text-tac-accent">OK</span>,{" "}
            <span className="font-mono text-tac-danger">HERIDO</span>,{" "}
            <span className="font-mono text-tac-warn">AYUDA</span> o{" "}
            <span className="font-mono text-tac-muted">FUERA</span>. Si alguien se
            queda sin GPS no desaparece: sigue en la lista, solo que sin punto en
            el mapa.
          </Prose>
          <Prose className="mt-4">
            Cada bando tiene su color y también su forma, para que nunca se
            confunda «hostil» con «aliado» — ni siquiera si te cuesta distinguir el
            rojo del verde. Tocas a un compañero y el mapa vuela hacia él, o le
            muestras el rastro de por dónde ha pasado.
          </Prose>
          <div className="mt-8">
            <Kicker>Cada bando — color + forma</Kicker>
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
    <Section id="graficos" index="03" icon={<PencilRuler className="size-4" />} title="Dibujar en el mapa">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <Panel label="Herramientas" icon={<PencilRuler className="size-3.5" />} className="p-4">
            <ToolDockMock />
          </Panel>
        </Reveal>
        <div>
          <H2>Dibuja sobre el mapa y lo ven todos.</H2>
          <Prose className="mt-5">
            Pones marcadores y puntos de ruta, trazas líneas, zonas y círculos, y
            mides distancia y dirección con dos toques. Todo lo que dibujas les
            aparece a los demás al instante, así que todos ven el mismo mapa.
          </Prose>
          <Prose className="mt-4">
            Una zona o un círculo puede convertirse en{" "}
            <span className="text-tac-accent">cerca virtual</span> (geocerca): IRMA
            avisa con un sonido cuando alguien entra o sale de ella. Las
            herramientas están en la barra de la izquierda, con botones grandes
            para usarse con guantes; solo se activa una a la vez.
          </Prose>
          <div className="mt-6 grid gap-px overflow-hidden rounded-tac border border-tac-line bg-tac-line sm:grid-cols-2">
            {[
              ["Marcadores", "Aliado · hostil · neutral · punto de ruta"],
              ["Dibujo libre", "Línea · zona · círculo"],
              ["Regla", "Distancia y dirección con dos toques"],
              ["Cerca virtual", "Avisa al entrar o salir de la zona"],
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
    <Section id="navegacion" index="04" icon={<Navigation className="size-4" />} title="Guía a un destino">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <H2>Elige un destino y te guía hasta él.</H2>
          <Prose className="mt-5">
            Eliges a un compañero o un punto del mapa e IRMA te dice a qué
            distancia está y hacia dónde queda, actualizándolo con cada paso. Con
            la brújula del teléfono, la flecha te marca hacia dónde caminar para
            llegar.
          </Prose>
          <Prose className="mt-4">
            El número grande de distancia se lee como un velocímetro: no salta ni
            parpadea mientras cambia, para que lo entiendas de un vistazo mientras
            te mueves.
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
          <H2>Una alerta de un toque llega a todo el equipo.</H2>
          <Prose className="mt-5">
            El botón de pánico manda tu posición y hace parpadear una señal roja en
            el mapa de todos, con sonido, hasta que se apaga. Cada alerta tiene
            tipo —{" "}
            <span className="font-mono text-tac-danger">PÁNICO</span>,{" "}
            <span className="font-mono text-tac-warn">MÉDICO</span> o{" "}
            <span className="font-mono text-tac-info">CONTACTO</span> — para que
            quien la reciba sepa de una a qué responde.
          </Prose>
          <Prose className="mt-4">
            Para pedir una evacuación hay un formulario{" "}
            <span className="text-tac-accent">CASEVAC de 9 líneas</span> (el
            estándar de rescate médico): dónde recoger, cuántos heridos y de qué
            gravedad, qué equipo hace falta, si hay peligro en el sitio, cómo está
            marcado y notas del terreno. Se manda a todo el equipo con un toque.
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
    <Section id="comms" index="06" icon={<MessagesSquare className="size-4" />} title="Comunicación">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Texto, voz y video por la misma conexión.</H2>
          <Prose className="mt-5">
            Un chat para todo lo que conviene dejar por escrito. Si la conexión da,
            también hay voz —{" "}
            <span className="text-tac-accent">mantén pulsado para hablar</span>,
            como un radio — y video en vivo entre dispositivos, útil cuando el
            texto no alcanza a explicar lo que pasa.
          </Prose>
          <Prose className="mt-4">
            La voz y el video dependen de qué tan buena sea la conexión: van bien
            por internet o Wi-Fi, y desaparecen cuando la señal es muy justa. La
            app nunca finge que están si no se puede.
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
    <Section id="transportes" index="07" icon={<Radio className="size-4" />} title="Formas de conexión">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Una app, varias formas de conectarse; siempre ves cuál usas.</H2>
          <Prose className="mt-5">
            IRMA puede conectarse de distintas maneras sin cambiar nada de la app.
            Hoy trae dos: una de prueba, para usarla sin equipo extra, y otra por
            internet, que junta a tu equipo en una misma sala. Más adelante se
            pueden sumar otras sin rehacer la app.
          </Prose>
          <Prose className="mt-4">
            Cada conexión avisa su estado con un solo color: verde conectado,
            amarillo conectando, rojo sin señal. Nunca verás verde en algo que en
            realidad está caído.
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
    ["0", "posición", "apodo, bando, ubicación, dirección, batería"],
    ["1", "mensaje", "de quién, para quién (o para todos), texto"],
    ["2", "marcador", "tipo, bando, dónde, tamaño, etiqueta"],
    ["3", "borrar marcador", "cuál"],
    ["4", "señal", "de quién, dónde"],
    ["5", "alerta", "de quién, tipo (pánico/médico/contacto), dónde"],
  ];
  return (
    <Section id="protocolo" index="08" icon={<Binary className="size-4" />} title="Cómo viajan los datos">
      <H2>Mensajes muy cortos para que viajen rápido.</H2>
      <Prose className="mt-5">
        Cada dato —una posición, un mensaje, una alerta— viaja como un mensaje
        muy pequeño para gastar poca red. Abajo, un ejemplo de cómo se ve una
        posición y la lista de los tipos que existen. Las letras del bando son
        cortas: <span className="font-mono">s</span> propio,{" "}
        <span className="font-mono">f</span> aliado, <span className="font-mono">n</span>{" "}
        neutral, <span className="font-mono">h</span> hostil,{" "}
        <span className="font-mono">u</span> desconocido.
      </Prose>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Reveal>
          <CodeBlock caption="ejemplo: un mensaje de posición" code={packet} />
          <p className="mt-3 font-mono text-[0.6875rem] text-tac-muted">
            Antes de enviar, revisa que el mensaje quepa; si es muy grande lo
            rechaza en vez de mandarlo a medias.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="overflow-hidden rounded-tac border border-tac-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-tac-line bg-tac-panel/60">
                  <th className="px-3 py-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">cód.</th>
                  <th className="px-3 py-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">qué es</th>
                  <th className="px-3 py-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-tac-muted">qué lleva</th>
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
    <Section id="cot" index="09" icon={<Network className="size-4" />} title="Puente con ATAK">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Se conecta con ATAK y otros sistemas TAK.</H2>
          <Prose className="mt-5">
            IRMA traduce su información al formato que usan{" "}
            <span className="text-tac-accent">ATAK</span> y los sistemas TAK (ese
            formato se llama Cursor-on-Target). Así, un equipo con IRMA y otro con
            ATAK pueden verse en el mismo mapa, aunque usen apps distintas.
          </Prose>
          <Prose className="mt-4">
            El bando —aliado, hostil, neutral— también se traduce, así que cada
            quien se ve del lado correcto en los dos sistemas.
          </Prose>
        </div>
        <Reveal delay={60}>
          <CodeBlock caption="así se ve en el formato de ATAK" code={cot} lang="xml" />
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
            d: "Un código de sala junta a tu equipo. Compartes el enlace y el código con un QR, y todos se ven en el mapa desde cualquier internet.",
          },
          {
            t: "Todo cifrado",
            d: "Con una frase secreta que solo ustedes conocen, todo lo de la sala viaja cifrado. La frase nunca sale de tu teléfono.",
          },
          {
            t: "Coordenadas militares",
            d: "Muestra la cuadrícula y las coordenadas militares (MGRS) sobre el mapa, además de las normales — el sistema que se usa en el campo.",
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
    <Section id="arquitectura" index="11" icon={<Cpu className="size-4" />} title="Cómo está hecha">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <H2>Un centro simple; la conexión se cambia sin tocar lo demás.</H2>
          <Prose className="mt-5">
            La app está separada de la forma en que se conecta: lo que ves y lo que
            hace no dependen de por dónde viajan los datos. Por eso la misma app
            funciona por internet o en modo de prueba sin reescribir nada. Estas
            son las piezas con las que está construida:
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
          <CodeBlock caption="cómo está organizado el código" code={tree} lang="text" />
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
              Proyecto educativo y civil. Sin relación con el TAK Product Center ni
              el Gobierno de EE. UU.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-tac border border-tac-line px-4 py-2.5 font-sans text-[0.8125rem] font-semibold text-tac-text transition-colors hover:border-tac-muted"
          >
            Abrir la app
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
