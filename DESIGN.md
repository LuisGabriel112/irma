---
name: IRMA
description: Tactical situational-awareness PWA — dark instrument, one light per state, monospaced ground truth.
colors:
  tac-bg: "#0a0e0d"
  tac-panel: "#121716"
  tac-panel-2: "#1a201e"
  tac-line: "#2a322f"
  tac-text: "#e6efe9"
  tac-muted: "#7d8f86"
  tac-accent: "#3ddc84"
  tac-accent-dim: "#1f7a4d"
  tac-warn: "#ffb020"
  tac-danger: "#ff4d4d"
  tac-info: "#38bdf8"
  tac-self: "#3ddc84"
  tac-friend: "#38bdf8"
  tac-hostile: "#ff4d4d"
  tac-neutral: "#cbd5cf"
typography:
  brandmark:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.18em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  tac: "8px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-default:
    backgroundColor: "{colors.tac-panel}"
    textColor: "{colors.tac-text}"
    rounded: "{rounded.tac}"
    padding: "8px 12px"
    typography: "{typography.label}"
  button-accent:
    backgroundColor: "{colors.tac-accent}"
    textColor: "#000000"
    rounded: "{rounded.tac}"
    padding: "8px 12px"
  button-danger:
    backgroundColor: "{colors.tac-danger}"
    textColor: "{colors.tac-danger}"
    rounded: "{rounded.tac}"
    padding: "8px 12px"
  icon-button:
    backgroundColor: "{colors.tac-panel}"
    textColor: "{colors.tac-muted}"
    rounded: "{rounded.tac}"
    size: "40px"
  icon-button-active:
    backgroundColor: "{colors.tac-accent}"
    textColor: "{colors.tac-accent}"
    rounded: "{rounded.tac}"
    size: "40px"
  input:
    backgroundColor: "{colors.tac-bg}"
    textColor: "{colors.tac-text}"
    rounded: "{rounded.tac}"
    padding: "6px 8px"
---

# Design System: IRMA

## 1. Overview

**Creative North Star: "The Dark Instrument"**

IRMA is not an app dressed in a tactical skin; it is a mission instrument. The whole surface sits in near-black (`#0a0e0d`), and onto that darkness a single status light is lit per context — almost always the tactical green (`#3ddc84`), occasionally amber for caution or red for danger. Numbers are monospaced and tabular so a bearing, a range, or a battery percent never jitters as it updates. The operator reads the screen the way they would read a gauge: at a glance, under sun, in motion, with gloves. Every pixel is accountable to the task in front of them.

This system is a deliberate subtraction from ATAK-CIV. Where ATAK crams toolbars, nests menus, and lets a dozen colors compete, IRMA frames the map quietly and lets exactly one accent speak at a time. The chrome — status bar, tool dock, side panel — is a set of translucent dark frames around live ground truth, never a competitor to it. It explicitly rejects four things: ATAK's clutter, generic SaaS-dashboard styling (card grids, purple gradients, hero metrics), gamer/sci-fi HUD kitsch (neon, angular chrome, Orbitron fonts), and cute consumer styling (pillowy radii, pastels, playful copy). Tactical is not cosplay; restraint is the entire aesthetic.

Depth is conveyed by tone, not ornament. Surfaces layer through four near-black greens, separated by hairline borders and a soft backdrop blur — never by drop shadows on the chrome. Motion exists only to report state: the self-position pulse, a link-active dot, a position update. If an animation doesn't carry information, it doesn't ship.

**Key Characteristics:**
- Near-black tactical green canvas; one status light lit per context.
- Monospaced, tabular numerics for all field data (bearing, range, lat/lng, battery).
- Affiliation encoded by a fixed color set — friend cyan, hostile red, neutral pale, self/waypoint green.
- Translucent dark panels with hairline borders and backdrop blur; the map is always the subject.
- Uppercase, wide-tracked micro-labels; sans body kept small and quiet.

## 2. Colors

A near-monochrome dark-green field with a tight set of semantic signals laid on top — most of the screen is neutral so that any color reads as information.

### Primary
- **Tactical Green** (`#3ddc84`): The single voice of the system — active state, self position, waypoints, focus borders, the IRMA brandmark, primary-action buttons. It means "live / you / go".
- **Green Dim** (`#1f7a4d`): The muted form of the accent, for low-emphasis count badges and de-emphasized accent fills where full green would shout.

### Secondary
- **Caution Amber** (`#ffb020`): Connecting/in-progress link state and the range-measure readout. Transitional, never decorative.
- **Danger Red** (`#ff4d4d`): Error link state, hostile affiliation, destructive actions (disconnect, delete), "no GPS / no link" alarms.
- **Info Cyan** (`#38bdf8`): Friendly affiliation marker color. Distinct from the green voice so "friend" never collapses into "self".

### Neutral
- **Tactical Black** (`#0a0e0d`): The body canvas and input field backgrounds. The void the instrument lights sit in.
- **Panel** (`#121716`) / **Panel-2** (`#1a201e`): Translucent chrome surfaces and the active-tab/hover lift. Two tonal steps above the canvas.
- **Line** (`#2a322f`): Hairline borders and dividers — the only structural separator in the system.
- **Text** (`#e6efe9`): Primary readable text; high contrast on every surface.
- **Muted** (`#7d8f86`): Secondary text, labels, inactive icons, hints. Used at full opacity for legibility — never dimmed into illegibility.
- **Neutral Pale** (`#cbd5cf`): Neutral affiliation markers only.

### Named Rules
**The One Light Rule.** One status color is lit per context. Green by default; amber means in-progress; red means failure or hostile. Never light two competing signals on the same control at once — the operator must know instantly what the screen is telling them.

**The Affiliation Lock.** Self/waypoint = green, friend = cyan, hostile = red, neutral = pale. These four are reserved; never reuse an affiliation color for decoration, and always reinforce it with shape/icon/label so a color-blind operator never reads hostile as friend.

## 3. Typography

**Brand / Data Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo fallback)
**Body Font:** system-ui sans (with -apple-system, Segoe UI, Roboto fallback)

**Character:** A hard split between voices: monospace carries everything quantitative and identifying — the brandmark, callsigns, coordinates, ranges, the link log — so columns of numbers stay aligned and instrument-like. The system sans carries prose and option labels, kept small and quiet so it never competes with the map or the data.

### Hierarchy
- **Brandmark** (mono, 700, 0.875rem, tracking 0.18em): "IRMA" in the status bar, in tactical green. The one place type is allowed presence.
- **Data** (mono, 600, 0.6875rem, tabular-nums): All field readouts — coordinates, bearing, range, battery, clock, link log, unit/marker tooltips. Tabular numerics are mandatory.
- **Body** (sans, 400, 0.875rem, line-height 1.5): Option titles, transport names, chat text, descriptive hints. Cap measure at 65–75ch.
- **Label** (sans, 600, 0.625rem, tracking 0.14em, UPPERCASE): Section titles, tab labels, field captions. The quiet structural scaffold.

### Named Rules
**The Tabular Numerics Rule.** Every number that updates in place — coordinates, bearing, range, battery, time — is monospaced and `tabular-nums`. Field data must never reflow or jitter as it changes.

**The Small-Label Rule.** Structural labels are 10–11px uppercase with wide tracking and muted color. They orient; they never shout. This is a closed system label, not a marketing eyebrow — do not promote it to a per-section kicker.

## 4. Elevation

The system is flat by tone, not by shadow. The chrome (status bar, tool dock, side panel, reopen handle) never carries a drop shadow — depth comes from four near-black tonal steps (`bg` → `panel` → `panel-2` → `line` borders) plus a `backdrop-blur-md` that lets the map ghost through translucent panels. Shadows are reserved for two narrow jobs: lifting map popups off the terrain, and the small colored `glow` that makes a status dot or self-arrow read as emissive rather than painted.

### Shadow Vocabulary
- **Popup lift** (`box-shadow: 0 8px 30px rgba(0,0,0,0.5)`): MapLibre/Leaflet popups only — separates a floating detail card from the map beneath.
- **Status glow** (`box-shadow: 0 0 6px <signal-color>`): Affiliation dots and the link-active dot — makes the signal read as a lit indicator.
- **Self-arrow glow** (`filter: drop-shadow(0 0 3px rgba(61,220,132,0.8))`): The own-position heading arrow, so it stays visible over any basemap.

### Named Rules
**The No-Shadow-Chrome Rule.** Panels, docks, bars, and buttons are flat — separated by hairline `tac-line` borders and backdrop blur, never by shadow. Shadow appears only to lift a map popup or to make a status indicator glow.

## 5. Components

### Buttons
- **Shape:** Gently rounded (8px, `--radius-tac`). One radius across the whole system.
- **Default:** Hairline `tac-line` border on transparent; hover lifts border to `tac-muted` and fills `tac-panel-2`. Label type: 10px uppercase, tracked, semibold.
- **Accent:** Solid tactical green on black text (`#000`); hover drops to 90% green. Primary action only — one per panel.
- **Danger:** Red text on a 15% red tint; hover deepens to 25%. Disconnect, delete, destructive only.
- **Ghost:** Muted text, no border, text brightens on hover. Tertiary affordances.
- **Disabled:** 30–40% opacity, `not-allowed` cursor.

### Icon Buttons (Tool Dock)
- **Shape:** 40×40 square, 8px radius — glove-sized touch targets.
- **Default:** `tac-line` border, muted icon; hover brightens icon + border.
- **Active:** Border and icon switch to the tool's own color (green/cyan/red/amber per tool) over a 10% accent tint — the dock shows which tool is armed by lighting exactly one cell.

### Chips (Status Bar)
- **Style:** Borderless mono 11px, tabular-nums, icon + value. Color is semantic: text follows link/GPS/battery state (green/amber/red/muted), never a fixed chrome color.

### Cards / Containers (Panels)
- **Corner Style:** Square-edged panel shells (full-height side panel, top bar); inner controls and the link log use 8px radius.
- **Background:** `tac-panel` at 85–95% opacity over `backdrop-blur-md`.
- **Border:** Single hairline `tac-line` on the structural edge (left border on the side panel, bottom on the status bar). Never a colored side-stripe.
- **Internal Padding:** 12px (`px-3`) horizontal rhythm throughout.

### Inputs / Fields
- **Style:** `tac-bg` (black) fill, hairline `tac-line` border, 8px radius. Text/callsign fields are mono + uppercase; selects are sans.
- **Focus:** Border shifts to tactical green, `outline: none`. No glow — the border color is the focus signal.

### Navigation (Side-Panel Tabs)
- **Style:** Four equal icon+label tabs (Unidades / Chat / Gráficos / Enlace). Inactive = muted; active = green icon/label over `tac-panel-2` with a 2px tactical-green underline. Unread/peer counts ride as small badges on the tab icon (red for unread chat, dim-green for peer count).

### Signature Component — Self-Position Marker
The own-position indicator: a green heading-arrow (CSS triangle) over a radial `tac-ping` pulse that scales 0.6→2.4 and fades on a 2.4s ease-out loop. The single piece of ambient motion in the system, and it earns its place — it answers "where am I, which way am I facing" at a glance. Honors `prefers-reduced-motion` with a static arrow.

## 6. Do's and Don'ts

### Do:
- **Do** keep the map as the subject; chrome is translucent dark frames around it (`tac-panel/85` + `backdrop-blur-md`).
- **Do** light exactly one status color per context — green default, amber in-progress, red failure/hostile (The One Light Rule).
- **Do** set every in-place number in mono with `tabular-nums` (coordinates, bearing, range, battery, clock).
- **Do** reinforce affiliation with shape/icon/label, not color alone, so a red-green deficit never reads hostile as friend.
- **Do** separate surfaces with hairline `tac-line` borders and tonal steps; verify body text hits ≥4.5:1 on its panel.
- **Do** keep touch targets glove-sized (the 40px icon-button floor) and reachable one-handed.
- **Do** give the self-pulse and any motion a `prefers-reduced-motion` static fallback.

### Don't:
- **Don't** reproduce ATAK's clutter — crammed toolbars, nested menus, a dozen colors competing. Subtract instead.
- **Don't** drift into generic SaaS-dashboard styling: identical card grids, purple gradients, uppercase eyebrows on every section, giant hero metrics.
- **Don't** add gamer/sci-fi HUD kitsch — neon, "futuristic" angular chrome, glow everywhere, Orbitron-style display fonts.
- **Don't** soften into cute consumer styling: pillowy radii, illustrations, pastels, playful microcopy. It erodes mission trust.
- **Don't** put drop shadows on chrome (panels, docks, bars, buttons). Shadow lifts map popups and glows status dots only.
- **Don't** use a colored `border-left`/`border-right` stripe as an accent; use full hairline borders or a tint.
- **Don't** dim muted text into illegibility "for elegance" — `tac-muted` stays at full opacity for field readability under sun.
- **Don't** reuse a reserved affiliation color (green/cyan/red/pale) for decoration.
