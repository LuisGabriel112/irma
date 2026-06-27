# IRMA — Guion de demostración en vivo (~5 min)

Demo sobre la **malla simulada** (no requiere segundo equipo ni hardware). Si tienes un
segundo dispositivo, ve los pasos marcados **[2 equipos]** para lucir multi-dispositivo y video.

URL: https://irma-delta.vercel.app/

---

## 0 · Antes de entrar (montaje, fuera de cámara)

1. Abre la URL en el equipo de presentación (de preferencia proyector + laptop, o tablet).
2. Completa el **alta de operador**:
   - Indicativo: `MANDO-1`
   - Sala: `demo`
   - **Clave de cifrado**: pon una (ej. `sierra-77`) → así se ve el candado **CIFRADO**.
   - Posición: usa GPS, o toca el mapa con la herramienta **⌖ Fijar mi posición** sobre tu zona.
3. Deja el mapa centrado en tu posición. **No conectes todavía** la malla demo (eso es el arranque en vivo).

> Tip: la malla simulada genera el tráfico alrededor de tu posición. Fija una posición real
> antes de empezar para que todo aparezca en un lugar reconocible.

---

## 1 · Arranque — el cuadro operacional común (~40 s)

- Acción: panel **Unidades** → **"Conectar malla demo"**.
- Al instante aparecen varias unidades: HAWK-2, WOLF-3, MEDIC-7, **VIPER-6 (hostil)**, CIV-DELTA (neutral), **PATROL-9**.
- Qué decir:
  - "Cada elemento es un punto en vivo en el mapa de todos."
  - Señala la **símbología MIL-STD-2525**: aliado = rectángulo, **hostil VIPER = rombo rojo**, neutral = cuadrado.
  - Abre el roster: **distancia, rumbo y antigüedad** de cada elemento.

## 2 · Coordenadas MGRS (~30 s)

- Acción: arriba se ve tu **MGRS**. En **Unidades** toca el botón **MGRS** → aparece la cuadrícula.
- Qué decir: "Coordenadas de cuadrícula militar; cada cuadro trae su referencia completa. En metros, distancia directa."

## 3 · Detalle de una unidad (~20 s)

- Acción: toca una unidad en el mapa → popup.
- Qué decir: "Indicativo, afiliación, **MGRS**, **rumbo · velocidad · precisión**, último reporte."

## 4 · Geocerca en acción (~40 s) — el momento fuerte

- En el mapa está **ZONA ALFA** (círculo ámbar). **PATROL-9** la cruza ~cada 38 s.
- Acción: espera el cruce (o señálalo: el patrullaje entra y sale en ciclo).
- Al cruzar: **banner ámbar + beep + parpadeo** → "PATROL-9 ENTRÓ/SALIÓ de ZONA ALFA".
- Qué decir: "Vigilancia de perímetro **automática**: el sistema avisa solo cuando alguien cruza. Libera la atención del mando."

## 5 · Control gráfico compartido (~40 s)

- Acción: dibuja un **polígono** (sector) y coloca un **marcador hostil**.
- Opcional: en **Marcadores**, toca el **hexágono** del polígono → lo conviertes en otra **geocerca**.
- Qué decir: "Medidas de coordinación trazadas en segundos y difundidas a toda la unidad."

## 6 · Tu símbolo de función (~20 s)

- Acción: **Unidades** → selector **Función** → elige p. ej. **Puesto de mando**.
- Qué decir: "Cada operador define su función; los compañeros lo ven con ese símbolo." **[2 equipos]** se ve en el otro al instante.

## 7 · Alerta de emergencia (~20 s)

- Acción: botón de **alerta** (sirena) → baliza roja + aviso audible.
- Qué decir: "Hombre en problemas: un toque y el apoyo converge. Cualquiera toca **Ir** para navegar al punto." Luego descártala.

## 8 · CASEVAC 9 líneas (~30 s)

- Acción: **Unidades** → **"Emitir CASEVAC"** → llena 2-3 líneas (urgente: 1, camilla: 1) → emitir.
- Resultado: **símbolo de sanidad** en el punto + banner.
- Qué decir: "Solicitud de evacuación normalizada OTAN, difundida a la red."

## 9 · Navegación a objetivo (~20 s)

- Acción: en una unidad, toca el ícono de **navegación**.
- Qué decir: "Distancia y rumbo en vivo, con flecha y línea — desplazamiento campo a través."

## 10 · Seguridad (~20 s)

- Acción: señala el candado **CIFRADO** arriba.
- Qué decir: "Todo va cifrado de extremo a extremo; el servidor no puede leer el tráfico."
- **[2 equipos]**: muestra que ambos ven lo mismo en la sala; el relevo solo retransmite datos cifrados.

## 11 · Incorporación por QR (~20 s)

- Acción: **Unidades** → **"Compartir sala (QR)"**.
- Qué decir: "Para sumar a alguien: escanea con la cámara y entra a la sala configurado."
- **[2 equipos]**: escanea con el segundo equipo → se une en vivo.

## 12 · Reproducción de misión (~30 s) — cierre

- Acción: tras unos minutos de demo, **Unidades** → **"Reproducir misión"** → **play** y mueve la barra; sube la velocidad.
- Qué decir: "El sistema registró todo el movimiento; se reproduce para análisis posterior (AAR) y partes."

## [2 equipos] · Video y voz en vivo (opcional, +40 s)

- Acción: **Unidades** → "Transmitir mi cámara"; en el otro equipo toca "ver cámara". Mantén **oprimir-para-hablar**.
- Qué decir: "Video y voz directos entre dispositivos; el contenido no pasa por el servidor."

---

## Ruta corta (si solo tienes 3-4 min)
Arranque (1) → Geocerca (4) → CASEVAC (8) → Alerta (7) → Replay (12). Es la secuencia con más impacto.

## Reglas de oro
- **Fija tu posición antes** de empezar (todo aparece alrededor).
- Deja correr ~1-2 min antes del **replay** para tener qué reproducir.
- Si hay mal internet: el **PDF** es el respaldo; el relay (Render plan gratis) puede tardar ~50 s en "despertar" la primera conexión — conéctate una vez antes de la junta para precalentarlo.
