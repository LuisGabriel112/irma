// IRMA relay — minimal WebSocket fan-out by room.
//
// Each client connects to  wss://host/?room=<code>  and the relay forwards every
// newline-delimited frame it receives to the *other* clients in the same room.
// The wire format is IRMA's compact packet JSON (see src/lib/protocol/packet.ts);
// the relay is format-agnostic — it just moves lines between peers in a room.
//
//   node relay/server.mjs            # listens on :1234 (or $PORT)
//
// A plain HTTP GET returns 200 "IRMA relay" so cloud platforms (Render, Railway,
// Fly) pass their HTTP health check; the WebSocket upgrade rides the same port,
// and the platform terminates TLS in front (so browsers get wss://).
//
// Deploy anywhere that keeps a long-lived process + WebSocket. Point the app at it
// with NEXT_PUBLIC_RELAY_URL=wss://your-host (or paste it in the Link panel).

import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { parse } from "node:url";

const PORT = Number(process.env.PORT) || 1234;
const MAX_FRAME = 1024 * 1024; // 1 MB — fits a compressed image / voice clip frame
const rooms = new Map(); // room -> Set<WebSocket>

// HTTP layer: health check + a friendly landing response. Everything that is not
// a WebSocket upgrade lands here.
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("IRMA relay — connect a WebSocket with ?room=<code>\n");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws, req) => {
  const { query } = parse(req.url ?? "", true);
  const room = String(query.room || "default").slice(0, 64);

  let set = rooms.get(room);
  if (!set) {
    set = new Set();
    rooms.set(room, set);
  }
  set.add(ws);
  ws.room = room;
  log(`+ join room="${room}" (${set.size} in room)`);

  ws.on("message", (data, isBinary) => {
    if (isBinary) return;
    const text = data.toString("utf8");
    if (text.length > MAX_FRAME) return;
    const peers = rooms.get(room);
    if (!peers) return;
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === peer.OPEN) {
        peer.send(text);
      }
    }
  });

  const drop = () => {
    const peers = rooms.get(room);
    if (peers) {
      peers.delete(ws);
      if (peers.size === 0) rooms.delete(room);
      log(`- leave room="${room}" (${peers.size} left)`);
    }
  };
  ws.on("close", drop);
  ws.on("error", drop);
});

httpServer.listen(PORT, () => {
  console.log(`IRMA relay listening on :${PORT} (http + ws)`);
});

function log(msg) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
