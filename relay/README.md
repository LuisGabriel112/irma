# IRMA relay

Minimal WebSocket fan-out so teammates over the internet see each other on the map.
Each client connects to `ws://host/?room=<code>`; the relay forwards every
newline-delimited packet frame to the other clients **in the same room**.

## Run locally

```bash
npm run relay          # listens on ws://localhost:1234 (or $PORT)
```

Then in IRMA → **Enlace** tab → choose **Internet · relay**, set a **room code**
(shared with your team), leave relay as `ws://localhost:1234`, **Conectar**.
Everyone on the same room + same relay shows up live.

## Deploy (so friends connect from home)

The relay is a plain long-lived Node process with a WebSocket — host it anywhere
that keeps a process alive (Render, Railway, Fly.io, a VPS). It is **not** a good
fit for Vercel Functions (no persistent WS); use a dedicated host or PartyKit /
Cloudflare Durable Objects if you prefer serverless.

1. Deploy this `relay/` (with `ws` installed) to your host; it serves on `$PORT`.
2. Front it with TLS so the URL is `wss://your-relay.example` (browsers block
   `ws://` from an `https://` page).
3. Point the app at it: set `NEXT_PUBLIC_RELAY_URL=wss://your-relay.example`
   before building IRMA, or just paste the URL into the **Relay** field at runtime.

## Notes / next steps

- **No auth** — the room code is a soft gate. Anyone who knows the code joins.
  Add a shared key + E2E packet encryption (per-team) before any real use.
- **No rate limiting** — add per-connection throttling for a public relay.
- **Ephemeral** — rooms live only while clients are connected; nothing persists.
