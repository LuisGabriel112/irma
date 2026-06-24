# Product

## Register

product

## Users

Civilian field teams operating where consumer comms thin out or vanish: search-and-rescue crews, event-safety and crowd marshals, expedition and backcountry groups, and volunteer emergency responders. They use IRMA on a phone or tablet, often outdoors, in motion, under time pressure, sometimes with gloves and frequently with no cellular signal. The job to be done: see where my team is, mark what matters on the ground, and coordinate — over cellular, Wi-Fi, or off-grid LoRa radio — without fighting the tool.

## Product Purpose

IRMA is an ATAK-class tactical situational-awareness platform rebuilt as an installable PWA with a first-class LoRa mesh transport. It delivers live unit tracking, tactical graphics, and net chat over a pluggable transport layer (simulated mesh, LoRa-over-USB serial, LoRa-over-BLE), with Cursor-on-Target interop to bridge into the TAK ecosystem. Success: a team stays coordinated and situationally aware in the field with materially less cognitive load and visual clutter than ATAK-CIV — the explicit benchmark — and keeps working when the network does not.

## Brand Personality

Precise, fast, resilient. It should read like a mission instrument, not an app: dense data made legible, hard hierarchy, monospaced numerics, zero ornament. Everything feels live and reactive — link state, pings, peer positions update in real time with functional motion that reports status rather than decorates. And it should feel robust off-grid: honest about which transport is active and degrading gracefully, never pretending a dead link is alive. Voice is terse and operational — callsigns, bearings, ranges, last-seen — not marketing.

## Anti-references

- **ATAK-CIV's clutter** — crammed toolbars, nested menus, a dozen colors competing for attention. The benchmark to beat by subtraction, not imitation.
- **Generic SaaS dashboards** — identical card grids, purple gradients, uppercase eyebrows, giant hero metrics. Corporate slop has no place on a tactical surface.
- **Gamer / sci-fi HUD kitsch** — excessive neon, "futuristic" angular chrome, glow everywhere, Orbitron-style display fonts. Tactical ≠ cosplay.
- **Cute consumer-app styling** — soft pillowy radii, illustrations, pastels, playful microcopy. Erodes mission seriousness and trust.

## Design Principles

1. **Subtract until it's an instrument.** Every element earns its pixels; if a control isn't needed for the current task, it's out of the way. Beating ATAK means less, done sharper — not more.
2. **The map is the product.** Chrome serves the map. Panels, docks, and status are quiet frames around live ground truth, never competing with it.
3. **Honest about the link.** Never fake connectivity. The active transport, its health, and degraded states are always legible — trust in the field depends on it.
4. **Legible under stress and sun.** High real contrast, large reachable targets, monospaced tabular numerics. Designed for a moving operator in daylight with gloves, not a desk.
5. **Motion reports, never decorates.** Animation exists to show state (pings, link pulses, position updates). If it doesn't carry information, it doesn't ship.

## Accessibility & Inclusion

- **Sunlight legibility (WCAG AA minimum, AA+ where feasible).** Real contrast on the dark tactical theme; no light-gray-on-dark body text. Body ≥4.5:1, large text ≥3:1.
- **Glove- and thumb-operable.** Generous touch targets, the left tool dock reachable one-handed, no fine-grained gestures required for core tasks.
- **Reduced motion respected.** Self-pulse, pings, and link animations need a static or crossfade alternative under `prefers-reduced-motion: reduce`.
- **Soft consideration — color-blind safety.** Affiliation currently leans heavily on color (friend/hostile/neutral/unknown). Not a stated priority, but reinforce with shape/icon/label so a red-green deficit never collapses friend into hostile.
