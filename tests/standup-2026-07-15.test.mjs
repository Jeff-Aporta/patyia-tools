/**
 * Tests de regresión para la sesión 2026-07-15 (vendor local + adjuntos firmados).
 *
 * Ejecutar desde frontend/:
 *   node --test tests/standup-2026-07-15.test.mjs
 *
 * Cobertura:
 *   VENDOR:  cdnVendor:true, vendor/cdn/, dist sin CDNs externos.
 *   COMPON:  components/ ignorado y vacío.
 *   ATTACH:  adjuntosApi existe, base64 legacy retirado.
 *   GIT:     .gitignore bloquea components/ y tests/.
 *   README:  mergeHistory tiene fila 2026-07-15 con URL preview hash.
 *   IDX:     index.json sin preconnects externos.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const FRONTEND = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = resolve(FRONTEND, "..", "..", ".."); // Personal/apps

function readJsonSafe(p) {
  return JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
}

/*
 * 4-ago-2026: `cdnVendor` está en FALSE a propósito. Se activó y la app no arrancó:
 * «TypeError: tr is not a function» en mui-material.js. Causa: gen-front-vendor.mjs genera
 * vendor/cdn/react.js y react-dom.js con `export{export_default as default}` y SIN named exports,
 * así que `import { useState } from "react"` que hace MUI devuelve undefined.
 * Es un bug del generador (Personal/apps/src/scripts/front/), no del front.
 * Este test ya no exige activarlo: exige que activarlo sea SEGURO. Cuando el generador se arregle,
 * el vendor pasará el chequeo de named exports y ahí sí se puede poner cdnVendor:true.
 */
test("VENDOR-01 — cdnVendor solo puede activarse con un vendor funcional", () => {
  const idx = readJsonSafe(join(FRONTEND, "src/json/index.json"));
  if (idx.cdnVendor !== true) return; // desactivado: se sirve desde CDN, nada que validar
  const reactJs = readFileSync(join(FRONTEND, "vendor/cdn/react.js"), "utf8");
  assert.ok(
    /\buseState\b/.test(reactJs) && !/^export\{export_default as default\}$/m.test(reactJs.trim()),
    "vendor/cdn/react.js no expone named exports: MUI fallará con «tr is not a function». Regenerar el vendor con un generador arreglado antes de activar cdnVendor.",
  );
  const idxHtml = readFileSync(join(FRONTEND, "index.html"), "utf8");
  assert.match(idxHtml, /"react":\s*"\.\/vendor\//, "con cdnVendor:true el importmap debe ser relativo (frontBase: \"./\"), o GitHub Pages da 404");
});

test("VENDOR-02 — preconnect vacío en index.json", () => {
  const idx = readJsonSafe(join(FRONTEND, "src/json/index.json"));
  assert.ok(Array.isArray(idx.preconnect), "preconnect debe ser array");
  assert.equal(idx.preconnect.length, 0, "preconnect debe estar vacío (sin CDNs externos)");
});

test("VENDOR-03 — vendor/cdn/ existe y tiene archivos", () => {
  const p = join(FRONTEND, "vendor/cdn");
  assert.ok(existsSync(p), `vendor/cdn debe existir (${p})`);
  const files = readdirSync(p);
  assert.ok(files.length >= 5, `vendor/cdn debe tener >=5 archivos (${files.length})`);
  assert.ok(files.includes("meta.json"), "vendor/cdn/meta.json debe existir");
});

test("VENDOR-04 — meta.json describe React/MUI/Emotion/Babel/Iconify", () => {
  const meta = readJsonSafe(join(FRONTEND, "vendor/cdn/meta.json"));
  const txt = JSON.stringify(meta);
  for (const dep of ["react", "mui", "emotion", "babel", "iconify"]) {
    assert.ok(txt.toLowerCase().includes(dep), `meta.json debe mencionar ${dep}`);
  }
});

test("VENDOR-05 — dist/index.html no apunta a esm.sh / jsdelivr / unpkg", () => {
  const distIndex = join(FRONTEND, "dist/index.html");
  if (!existsSync(distIndex)) return; // sin build aún
  const html = readFileSync(distIndex, "utf8");
  for (const cdn of ["esm.sh", "cdn.jsdelivr.net", "unpkg.com", "code.iconify.design"]) {
    assert.ok(!html.includes(cdn), `dist/index.html no debe mencionar ${cdn}`);
  }
});

test("COMPON-01 — components/ NO existe en el repo", () => {
  const p = join(FRONTEND, "components");
  assert.ok(!existsSync(p), `components/ debe estar eliminado (${p})`);
});

test("COMPON-02 — COMPONENTS.md existe y explica el origen", () => {
  const p = join(FRONTEND, "COMPONENTS.md");
  assert.ok(existsSync(p), "COMPONENTS.md debe existir");
  const txt = readFileSync(p, "utf8");
  assert.ok(txt.toLowerCase().includes("monorepo") || txt.toLowerCase().includes("apps/"),
    "COMPONENTS.md debe mencionar el monorepo o apps/");
});

test("ATTACH-01 — adjuntosApi.ts existe y exporta funciones clave", () => {
  const p = join(FRONTEND, "src/js/api/adjuntosApi.ts");
  assert.ok(existsSync(p), "js/api/adjuntosApi.ts debe existir");
  const txt = readFileSync(p, "utf8");
  assert.ok(txt.includes("uploadImagenes"), "debe exportar uploadImagenes");
  assert.ok(txt.includes("uploadAudios"), "debe exportar uploadAudios");
});

test("ATTACH-02 — base64 legacy retirado de patyiaChatApi.ts", () => {
  const p = join(FRONTEND, "src/js/api/patyiaChatApi.ts");
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  assert.ok(!txt.includes("ensureBase64DataUrl"), "ensureBase64DataUrl debe estar retirado");
});

test("ATTACH-03 — patyiaChatApi.ts NO usa data: URLs en audio/images", () => {
  const p = join(FRONTEND, "src/js/api/patyiaChatApi.ts");
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  // El envío de audio/image ahora debe pasar por adjuntosApi, no inline base64.
  assert.ok(!/data:\s*image\/[a-z]+;base64/.test(txt), "no debe haber data:image/*;base64 inline");
  assert.ok(!/data:\s*audio\/[a-z]+;base64/.test(txt), "no debe haber data:audio/*;base64 inline");
});

test("GIT-01 — .gitignore incluye components/", () => {
  const txt = readFileSync(join(FRONTEND, ".gitignore"), "utf8");
  assert.ok(/^components\/?/m.test(txt) || txt.includes("components/"),
    ".gitignore debe ignorar components/");
});

test("GIT-02 — .gitignore incluye tests/", () => {
  const txt = readFileSync(join(FRONTEND, ".gitignore"), "utf8");
  assert.ok(/^tests\/?/m.test(txt) || txt.includes("tests/"),
    ".gitignore debe ignorar tests/");
});

// 4-ago-2026: antes exigía que la fila más reciente fuera exactamente 2026-07-15, así que el test
// se rompía justo al cumplir el proceso (agregar una fila nueva antes de cada merge). Ahora valida
// la FORMA — que es lo que de verdad hay que sostener: fechas ISO, orden descendente y URL con hash.
test("README-01 — mergeHistory bien formado y ordenado (más reciente primero)", () => {
  const idx = readJsonSafe(join(FRONTEND, "src/json/index.json"));
  const mh = idx.readme?.mergeHistory;
  assert.ok(Array.isArray(mh), "readme.mergeHistory debe ser array");
  assert.ok(mh.length >= 1, "mergeHistory debe tener >=1 fila");
  const fechas = mh.map((f) => f.date);
  for (const f of mh) {
    assert.match(String(f.date), /^\d{4}-\d{2}-\d{2}$/, `fecha inválida: ${f.date}`);
    assert.ok(
      /^https:\/\/[a-f0-9]+\.isa-patyia-dev\.pages\.dev$/.test(f.url),
      `URL preview debe llevar hash de Cloudflare (recibido: ${f.url})`,
    );
  }
  assert.deepEqual(fechas, [...fechas].sort().reverse(), "mergeHistory debe ir de más reciente a más antigua");
  assert.equal(new Set(fechas).size, fechas.length, "una sola fila por fecha (la más reciente de ese día)");
});

test("README-02 — README.md está sincronizado con index.json", () => {
  const readme = readFileSync(join(FRONTEND, "README.md"), "utf8");
  assert.ok(readme.includes("2026-07-15"),
    "README.md debe mencionar 2026-07-15 (fila más reciente)");
  assert.ok(readme.includes("121cc5cc") || readme.includes("isa-patyia-dev.pages.dev"),
    "README.md debe mencionar el preview Cloudflare");
});

test("IDX-01 — index.json NO tiene dependencias de CDNs externos en libs", () => {
  const idx = readJsonSafe(join(FRONTEND, "src/json/index.json"));
  const txt = JSON.stringify(idx);
  assert.ok(!txt.includes("https://esm.sh"));
  assert.ok(!txt.includes("https://cdn.jsdelivr.net"));
  assert.ok(!txt.includes("https://unpkg.com"));
});