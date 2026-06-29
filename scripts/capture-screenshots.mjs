import { chromium } from "playwright";
import path from "node:path";

const OUT = "C:/Users/Venegas/Desktop/irma/docs/screenshots";
const URL = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const shots = [];
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  shots.push(name);
  console.log("shot:", name);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
page.on("dialog", (d) => d.accept());

await page.goto(URL, { waitUntil: "networkidle" });
await sleep(1000);

// Setup
await page.getByPlaceholder("RAVEN-1").fill("RAVEN-1");
await page.getByPlaceholder("alfa").fill("demo");
await page.getByText("o ingresar coordenadas").click();
await page.getByPlaceholder("19.4326").fill("19.4326");
await page.getByPlaceholder("-99.1332").fill("-99.1332");
await page.getByPlaceholder("-99.1332").blur();
await sleep(300);
await page.getByRole("button", { name: "Entrar a la red" }).click();
await sleep(4000);

// Connect demo mesh
try {
  await page.getByRole("button", { name: /Conectar malla demo/i }).click({ timeout: 5000 });
} catch { console.log("no demo btn"); }
await sleep(7000);

// Recenter on the operator: flyTo lands at zoom 15, framing all demo units
// (<=601 m out) and the geofence around RAVEN-1.
await page.getByRole("button", { name: "Centrar en mí" }).click();
await sleep(3000);

await shot(page, "01-mapa-unidades");
await shot(page, "02-panel-unidades");

await page.getByRole("button", { name: "Gráficos" }).click();
await sleep(1200);
await shot(page, "03-graficos-marcadores");

await page.getByRole("button", { name: "Chat" }).click();
await sleep(1200);
await shot(page, "04-chat");

await page.getByRole("button", { name: "Enlace" }).click();
await sleep(1200);
await shot(page, "05-enlace-transportes");

await page.getByRole("button", { name: "Unidades" }).click();
await sleep(800);
try {
  await page.getByRole("button", { name: /Emitir CASEVAC/i }).click({ timeout: 4000 });
  await sleep(1200);
  await shot(page, "06-casevac-9line");
  await page.getByRole("button", { name: "Cerrar" }).click();
  await sleep(600);
} catch (e) { console.log("casevac fail", e.message); }

try {
  await page.getByRole("button", { name: "Marcadores" }).click({ timeout: 3000 });
  await sleep(700);
  await shot(page, "07-herramientas-simbolos");
  await page.mouse.click(540, 300);
  await sleep(500);
} catch (e) { console.log("dock fail", e.message); }

try {
  await page.getByRole("button", { name: "Unidades" }).click();
  await sleep(500);
  await page.getByRole("button", { name: /Reproducir misión/i }).click({ timeout: 4000 });
  await sleep(2500);
  await shot(page, "08-reproduccion-mision");
} catch (e) { console.log("replay fail", e.message); }

console.log("DONE", shots.length, ":", shots.join(", "));
await browser.close();
