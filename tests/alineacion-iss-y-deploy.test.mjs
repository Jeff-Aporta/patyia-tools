/**
 * Alineación con el ISS + salud del artefacto de deploy (4-ago-2026).
 *
 * Avisa cuando:
 *   - el front llama un endpoint que el ISS ya no expone (falla en silencio: try/catch → función muerta);
 *   - el `dist/` publicado quedó atrás respecto a `src/` (el CI NO compila: publica lo commiteado);
 *   - un bundle de `paty_build.mjs` fue pisado por `gen-front-dist` (App.js ~8 KB en vez de ~850 KB);
 *   - un test usa rutas previas a la mudanza a `src/`;
 *   - el repo git quedó en el estado roto de submódulo.
 *
 * Carpeta tests/ versionada (4-ago-2026): estos invariantes valen para todo el equipo.
 * Run: node --test tests/alineacion-iss-y-deploy.test.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { test, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ISS = "C:\\ContaPyme\\PatyIA\\ISS-AyudasCPIA";
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

const walk = (dir, acc = []) => {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
};

// ── Alineación de endpoints front ↔ ISS ────────────────────────────────────────

/** Rutas /api/... que el catálogo del ISS declara (01-api.json). */
function endpointsDelIss() {
  const p = join(ISS, "src", "json", "01-api.json");
  if (!existsSync(p)) return null; // ISS no está en este checkout → skip suave
  const json = JSON.parse(readFileSync(p, "utf8"));
  const ids = [];
  const walkJson = (o) => {
    if (!o || typeof o !== "object") return;
    if (typeof o.id === "string" && /^[A-Z]+:/.test(o.id)) ids.push(o.id);
    for (const k of Object.keys(o)) walkJson(o[k]);
  };
  walkJson(json.api?.endpoints ?? json);
  // "GET:/api/conversacion/{iconversacion}" → "/api/conversacion/*"
  return new Set(ids.map((id) => id.split(":").slice(1).join(":").replace(/\{[^}]+\}/g, "*")));
}

/** Rutas /api/... que el front pide al ISS. Excluye las del orchestrator (scrum, tree-msgs) y el mapa de permisos, que declara claves, no llamadas (ver ISS-02). */
function endpointsDelFront() {
  const AJENOS = /^\/api\/(scrum|tree-msgs)\b/; // otro backend, no el ISS
  const hits = new Set();
  for (const f of walk(SRC)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(f)) continue;
    if (f.endsWith("permAccessFromMap.js")) continue; // claves de permiso, no URLs
    const txt = readFileSync(f, "utf8");
    for (const m of txt.matchAll(/["'`](\/api\/[a-zA-Z0-9_\-/{}$.]*)/g)) {
      let r = m[1].replace(/\$\{[^}]*\}/g, "*").replace(/\/+$/, "");
      if (!r || AJENOS.test(r)) continue;
      hits.add(r);
    }
  }
  return hits;
}

/** Cadenas que parecen endpoints pero no lo son: no se piden nunca, así que no cuentan como desalineación. */
const NO_SON_LLAMADAS = new Map([
  ["/api/patyia", "prefijo que el front concatena (/api/patyia + /admin/roles); la ruta real sí existe en el ISS."],
  ["/api/permisos/usuarios", "clave de permiso en permAccessFromMap.js (hasAccess), no una URL que se pida."],
  // ISS retiró GET list; kanban usa GET /api/patyia/admin/roles (permissionsFromAdminRoles). Quedan strings en catálogo/comentarios.
  ["/api/system/permisos", "4-ago-2026 cerrado: no es llamada — listado vía admin/roles. Strings residuales en route catalog / JSDoc."],
]);

/**
 * Deuda abierta: desalineación real, ya diagnosticada, pendiente de arreglo en el ISS.
 * Si el ISS repone la ruta, el test avisa para borrarla de aquí — si no, la lista miente con el tiempo.
 * (Vacío a 4-ago tarde: GET /system/permisos migrado a admin/roles en el front.)
 */
const DEUDA_ABIERTA = new Map([]);

test("ISS-01 — el front no llama endpoints que el ISS no expone", () => {
  const iss = endpointsDelIss();
  if (!iss) return; // sin checkout del ISS no se puede comparar
  const rutas = [...iss];
  // Normaliza /api/x/123 → /api/x/* para comparar contra las plantillas del catálogo.
  const cubre = (ruta) => {
    if (iss.has(ruta)) return true;
    const partes = ruta.split("/");
    for (let i = 1; i < partes.length; i++) {
      const alt = partes.map((p, idx) => (idx === i ? "*" : p)).join("/");
      if (iss.has(alt)) return true;
    }
    return false;
  };
  const huerfanos = [...endpointsDelFront()]
    .filter((r) => !NO_SON_LLAMADAS.has(r) && !cubre(r))
    .sort();
  const resueltos = [...DEUDA_ABIERTA.keys()].filter((r) => !huerfanos.includes(r));
  assert.deepEqual(
    resueltos, [],
    `Estas rutas ya existen en el ISS: quitarlas de DEUDA_ABIERTA.\n  ${resueltos.join("\n  ")}`,
  );
  const nuevos = huerfanos.filter((r) => !DEUDA_ABIERTA.has(r));
  assert.deepEqual(
    nuevos,
    [],
    `El front llama rutas que el ISS no declara en 01-api.json.\n` +
    `Falla en silencio (try/catch → la función queda muerta).\n` +
    `Reponer en el ISS o migrar el front:\n  ${nuevos.join("\n  ")}`,
  );
});

/**
 * Claves de permiso que no corresponden a ninguna ruta del ISS. No son llamadas, pero
 * tienen consecuencia: `hasAccess` nunca las concede, así que el control de UI que dependa
 * solo de ellas queda oculto para siempre y nadie ve un error.
 */
const CLAVES_PERMISO_SIN_RUTA = new Map([
  ["/api/permisos/usuarios", "canViewKanban — tiene alternativa (API_PERMISOS), así que el kanban sigue visible."],
  ["/api/system/swagger.json", "canEditSwagger — el ISS sirve /api/system/swagger/config.json. El editor de swagger queda oculto."],
  ["/api/system/permisos/usuarios", "canEditKanbanCards — cubierto por `assign`, así que no bloquea por sí solo."],
  ["/api/system/permisos", "4-ago tarde: GET list retirado en ISS; kanban usa admin/roles. Clave residual en API_PERMISOS / catálogo."],
]);

test("ISS-02 — claves de permiso sin ruta en el ISS (solo las conocidas)", () => {
  const iss = endpointsDelIss();
  if (!iss) return;
  const txt = readFileSync(join(SRC, "js/tools/permAccessFromMap.js"), "utf8");
  // El catálogo del ISS llega con {param} ya normalizado a *; las claves del front usan sus propios nombres ({id}, {username}).
  const claves = new Set([...txt.matchAll(/"(\/api\/[^"]+)"/g)].map((m) => m[1].replace(/\{[^}]+\}/g, "*")));
  const sinRuta = [...claves].filter((r) => !iss.has(r)).sort();
  const nuevas = sinRuta.filter((r) => !CLAVES_PERMISO_SIN_RUTA.has(r) && !DEUDA_ABIERTA.has(r));
  assert.deepEqual(
    nuevas, [],
    `Claves de permiso que el ISS no expone: el control de UI que dependa de ellas queda oculto sin aviso.\n  ${nuevas.join("\n  ")}`,
  );
});

// ── Artefacto de deploy (el CI no compila: publica dist/ tal cual) ─────────────

describe("DEPLOY — dist/ es lo que se publica", () => {
  it("DIST-01 — ningún fuente es más nuevo que su salida en dist/", () => {
    const viejos = [];
    for (const s of walk(SRC)) {
      if (!/\.(ts|tsx|js|jsx|css)$/.test(s) || s.endsWith(".d.ts")) continue;
      const rel = s.slice(SRC.length + 1).replace(/\\/g, "/");
      const out = join(DIST, extname(rel) === ".css" ? rel : rel.replace(/\.(tsx|ts|jsx|js)$/, ".js"));
      if (!existsSync(out)) { viejos.push(`${rel} → sin salida en dist/`); continue; }
      // 1 s de tolerancia: el build reescribe en el mismo segundo.
      if (statSync(out).mtimeMs < statSync(s).mtimeMs - 1000) viejos.push(`${rel} → dist/ más viejo`);
    }
    assert.deepEqual(
      viejos, [],
      `dist/ desactualizado. El workflow NO compila: publica lo commiteado.\n` +
      `Regenerar (los DOS pasos, en orden):\n` +
      `  node ../../src/scripts/front/gen-front-dist.mjs --slug isa-patyia\n` +
      `  node scripts/paty_build.mjs\n  ${viejos.join("\n  ")}`,
    );
  });

  it("DIST-02 — los bundles de paty_build no fueron pisados por gen-front-dist", () => {
    // gen-front-dist minifica archivo por archivo; si queda como salida final, el bundle
    // pierde sus dependencias y la app no arranca. App.js real ronda los 850 KB.
    const jobs = readFileSync(join(ROOT, "scripts", "paty_build.mjs"), "utf8");
    const salidas = [...jobs.matchAll(/\[\s*"[^"]+"\s*,\s*"([^"]+)"\s*\]/g)].map((m) => m[1]);
    assert.ok(salidas.length >= 20, "no se pudieron leer los jobs[] de paty_build.mjs");
    const app = join(DIST, "js/app/App.js");
    assert.ok(existsSync(app), "falta dist/js/app/App.js");
    const kb = statSync(app).size / 1024;
    assert.ok(kb > 200, `App.js pesa ${kb.toFixed(0)} KB (<200): lo pisó gen-front-dist. Correr node scripts/paty_build.mjs`);
  });

  it("DIST-04 — boot-helper distingue el _dist publicado del dist local", () => {
    // El vendor local migró a dist/, pero el paquete publicado en jsDelivr conserva _dist/.
    // Si boot-helper fija "dist/" a secas, el fallback remoto pide rutas que dan 404.
    const bh = readFileSync(join(ROOT, "vendor/front-shared/boot-helper.mjs"), "utf8");
    assert.match(bh, /DIST_DIR\s*=\s*CDN\.includes\("cdn\.jsdelivr\.net"\)\s*\?\s*"_dist"\s*:\s*"dist"/,
      "boot-helper debe elegir _dist/ para el CDN y dist/ para el vendor local");
    assert.doesNotMatch(bh, /CDN \+ "dist\//, "no fijar 'dist/' junto al CDN: usar DIST_DIR");
    // Y el destino local tiene que existir de verdad.
    assert.ok(existsSync(join(ROOT, "vendor/front-shared/dist/isa/js/index.min.js")),
      "falta vendor/front-shared/dist/isa/js/index.min.js");
  });

  it("DIST-03 — se cumplen las precondiciones del workflow", () => {
    // deploy-front.yml solo verifica esto antes de publicar; si falta, el deploy falla en CI.
    assert.ok(existsSync(join(ROOT, "index.html")), "falta index.html");
    assert.ok(existsSync(join(DIST, "js", "boot")), "falta dist/js/boot");
  });
});

// ── Higiene del checkout ──────────────────────────────────────────────────────

describe("REPO — estado del checkout", () => {
  it("REPO-01 — .git es un directorio, no el archivo de submódulo roto", () => {
    const g = join(ROOT, ".git");
    if (!existsSync(g)) return; // checkout sin git: nada que validar
    assert.ok(
      statSync(g).isDirectory(),
      ".git es un archivo de submódulo. Si apunta a un gitdir inexistente, ningún comando git funciona. " +
      "Reparar: mv .git .git-roto.bak && git init -b main && git remote add origin <url> && git fetch origin main && git reset --mixed origin/main",
    );
  });

  it("REPO-02 — el respaldo .git-roto.bak nunca se versiona", () => {
    const gi = readFileSync(join(ROOT, ".gitignore"), "utf8");
    assert.match(gi, /\.git-roto\.bak/, ".gitignore debe ignorar .git-roto.bak o se cuela en el commit");
  });

  it("REPO-03 — un test con rutas legacy las resuelve bajo src/", () => {
    // Los fuentes se movieron a src/. Las rutas históricas ("js/…", "css/…") siguen valiendo SI el
    // helper del test las resuelve bajo src/ con fallback. Sin ese helper el test revienta con ENOENT
    // y se lee como «el código está roto» cuando lo único que cambió fue la ubicación.
    const sinHelper = [];
    for (const f of readdirSync(join(ROOT, "tests"))) {
      if (!f.endsWith(".mjs") || f === "alineacion-iss-y-deploy.test.mjs") continue;
      const txt = readFileSync(join(ROOT, "tests", f), "utf8");
      const usaLegacy = /(?:read|join)\([^)]*"(?:js|css)\//.test(txt);
      const resuelveEnSrc = /join\(\s*ROOT\s*,\s*"src"|"src\/(?:js|css|json)\//.test(txt);
      if (usaLegacy && !resuelveEnSrc) sinHelper.push(f);
    }
    assert.deepEqual(
      sinHelper, [],
      `Estos tests usan rutas previas a la mudanza y no resuelven bajo src/ (fallarán con ENOENT):\n  ${sinHelper.join("\n  ")}`,
    );
  });
});
