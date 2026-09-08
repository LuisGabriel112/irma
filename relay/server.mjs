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
import { createServer as createHttpsServer } from "node:https";
import { WebSocketServer } from "ws";
import { parse } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Reused from `next dev --experimental-https` (mkcert-issued, see ../certificates).
// Browsers block ws:// from an https:// page (mixed content) — when the app is
// served over LAN HTTPS (dev:lan), the relay must speak wss:// too, or every
// connection dies silently with "no se pudo conectar al relay".
const CERT_PATH = join(__dirname, "..", "certificates", "localhost.pem");
const KEY_PATH = join(__dirname, "..", "certificates", "localhost-key.pem");
const useTLS = existsSync(CERT_PATH) && existsSync(KEY_PATH);

const PORT = Number(process.env.PORT) || 1234;
const MAX_FRAME = 1024 * 1024; // 1 MB — fits a compressed image / voice clip frame
const rooms = new Map(); // room -> Set<WebSocket>

// --- WiFi GPS node ingest --------------------------------------------------
//
// ESP32-S3 field nodes POST fix + vitals here instead of speaking the relay's
// WebSocket protocol directly. Each POST is re-encoded as an IRMA position
// packet (see src/lib/protocol/packet.ts) and fanned out into a room exactly
// like a WebSocket peer's frame would be.
//
//   POST https://host/api/ingest/wifi
//   header: x-api-key: <WIFI_INGEST_API_KEY>
//   { node_id, ts, lat, lon, vel, sat, ubicacion_valida,
//     temperatura, fc, spo2, bateria }
//
// Shares the main HTTP(S) port (cloud hosts expose one public port). Guarded
// by a shared-secret header since this port is public once deployed.
const WIFI_ROOM = process.env.WIFI_INGEST_ROOM || "alfa";
const WIFI_PATH = "/api/ingest/wifi";
const WIFI_API_KEY = process.env.WIFI_INGEST_API_KEY || "nodoscelulares";

function wifiPacketToWire(body) {
  const w = {
    t: 0, // position
    i: String(body.node_id ?? "wifi-node"),
    c: String(body.node_id ?? "wifi-node"),
    a: "f", // friend
    ts: Date.parse(body.ts) || Date.now(),
  };
  if (body.ubicacion_valida && Number.isFinite(body.lat) && Number.isFinite(body.lon)) {
    w.la = Math.round(Number(body.lat) * 1e6) / 1e6;
    w.ln = Math.round(Number(body.lon) * 1e6) / 1e6;
  }
  if (Number.isFinite(body.vel)) w.s = Math.round((Number(body.vel) / 3.6) * 10) / 10; // km/h -> m/s
  if (Number.isFinite(body.bateria)) w.b = Math.round(Number(body.bateria));
  // Not part of the core wire protocol yet — passed through as extra keys for
  // a future vitals panel; ignored by today's decode().
  if (Number.isFinite(body.temperatura)) w.tp = Number(body.temperatura);
  if (Number.isFinite(body.fc)) w.hr = Number(body.fc);
  if (Number.isFinite(body.spo2)) w.o2 = Number(body.spo2);
  if (Number.isFinite(body.sat)) w.sat = Number(body.sat);
  return w;
}

function handleWifiIngest(req, res) {
  const remote = req.socket.remoteAddress;
  log(`wifi-ingest req ${req.method} ${req.url} from=${remote} ua="${req.headers["user-agent"] ?? ""}" len=${req.headers["content-length"] ?? "?"}`);
  if (req.headers["x-api-key"] !== WIFI_API_KEY) {
    log(`wifi-ingest 401 bad-key from=${remote}`);
    res.writeHead(401, { "content-type": "text/plain" });
    res.end("unauthorized\n");
    return;
  }
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 8192) req.destroy(); // guard against a runaway body
  });
  req.on("aborted", () => {
    log(`wifi-ingest aborted from=${remote} bytes-so-far=${body.length}`);
  });
  req.on("end", () => {
    log(`wifi-ingest body from=${remote}: ${body}`);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      log(`wifi-ingest 400 invalid-json from=${remote} err="${e.message}" raw="${body}"`);
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("invalid json\n");
      return;
    }
    const line = JSON.stringify(wifiPacketToWire(parsed)) + "\n";
    const peers = rooms.get(WIFI_ROOM);
    if (peers) {
      for (const peer of peers) {
        if (peer.readyState === peer.OPEN) peer.send(line);
      }
    }
    log(`wifi-ingest node="${parsed.node_id}" room="${WIFI_ROOM}" fix=${!!parsed.ubicacion_valida}`);
    res.writeHead(204).end();
  });
}

// HTTP(S) layer: health check + a friendly landing response, plus the WiFi
// ingest endpoint. Everything that is not a WebSocket upgrade lands here —
// all sharing one port, since cloud hosts (Render/Railway/Fly) expose only one.
const requestHandler = (req, res) => {
  const pathname = parse(req.url ?? "").pathname;
  if (req.method === "POST" && pathname === WIFI_PATH) {
    handleWifiIngest(req, res);
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("IRMA relay — connect a WebSocket with ?room=<code>\n");
};

const httpServer = useTLS
  ? createHttpsServer(
      { cert: readFileSync(CERT_PATH), key: readFileSync(KEY_PATH) },
      requestHandler,
    )
  : createServer(requestHandler);

const wss = new WebSocketServer({ server: httpServer });

httpServer.on("tlsClientError", (err, socket) => {
  log(`tlsClientError from=${socket.remoteAddress}: ${err.message}`);
});
httpServer.on("clientError", (err, socket) => {
  log(`http clientError from=${socket.remoteAddress}: ${err.message}`);
});
wss.on("error", (err) => {
  log(`wss server error: ${err.message}`);
});

wss.on("connection", (ws, req) => {
  const { query } = parse(req.url ?? "", true);
  const room = String(query.room || "default").slice(0, 64);
  const remote = req.socket.remoteAddress;

  let set = rooms.get(room);
  if (!set) {
    set = new Set();
    rooms.set(room, set);
  }
  set.add(ws);
  ws.room = room;
  log(`+ join room="${room}" from=${remote} (${set.size} in room)`);

  ws.on("error", (err) => {
    log(`ws error room="${room}" from=${remote}: ${err.message}`);
  });

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

  const drop = (code, reason) => {
    const peers = rooms.get(room);
    if (peers) {
      peers.delete(ws);
      if (peers.size === 0) rooms.delete(room);
      log(`- leave room="${room}" from=${remote} code=${code ?? "?"} reason="${reason ?? ""}" (${peers.size} left)`);
    }
  };
  ws.on("close", drop);
});

httpServer.listen(PORT, () => {
  console.log(`IRMA relay listening on :${PORT} (${useTLS ? "https + wss" : "http + ws"})`);
});

function log(msg) {
  console.log(`${new Date().toISOString()} ${msg}`);
}
