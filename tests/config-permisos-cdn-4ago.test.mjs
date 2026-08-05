/**
 * Regresión sesión 4-ago tarde: soft reload, no GET /system/permisos list, pin CDN.
 * Run: node --test tests/config-permisos-cdn-4ago.test.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const read = (rel) => readFileSync(join(SRC, rel), "utf8");

test("CFG-01 — prompts operativos: soft load sin refetch por openai-config", () => {
  const panel = read("js/tools/ConfigPromptsOperativosPanel.jsx");
  assert.match(panel, /soft\s*=\s*false/, "load debe aceptar { soft }");
  assert.match(panel, /if\s*\(\s*!soft\s*\)\s*setLoading\(true\)/, "skeleton solo si !soft");
  assert.doesNotMatch(
    panel,
    /addEventListener\s*\(\s*["']isa-patyia:openai-config["']/,
    "no refetch prompts al evento openai-config (skeleton flash)",
  );
});

test("PERM-01 — listado kanban vía admin/roles, no GET /system/permisos", () => {
  const api = read("js/api/systemConfigApi.ts");
  assert.match(api, /permissionsFromAdminRoles/, "helper kanban desde SEG admin");
  assert.match(api, /fetchPatyiaAdminRoles/, "fuente = admin/roles");
  const listFn = api.match(/function fetchPermisosListRaw[\s\S]*?^\}/m)?.[0] ?? "";
  assert.ok(listFn, "fetchPermisosListRaw debe existir");
  assert.match(listFn, /fetchPatyiaAdminRoles/, "listado raw debe ir a admin roles");
  assert.doesNotMatch(
    listFn,
    /jsonFetch[^;]*["'`]\/system\/permisos["'`]/,
    "fetchPermisosListRaw no debe GET /system/permisos",
  );
  const contacto = read("js/api/contactoLookup.ts");
  assert.match(contacto, /\/api\/permissions\/me/, "contacto actual vía permissions/me");
  assert.doesNotMatch(
    contacto,
    /fetch\([^)]*\/system\/permisos/,
    "contactoLookup no debe llamar GET /system/permisos",
  );
});

test("CDN-01 — pin front-shared válido (no f8ce806) + _dist en remoto", () => {
  const cdn = read("js/boot/cdn.mjs");
  assert.match(cdn, /PIN\s*=\s*["']0a19d91["']/, "PIN canónico post-fix");
  assert.doesNotMatch(cdn, /f8ce806/, "pin muerto f8ce806 no debe volver");
  const loader = read("js/boot/loader.mjs");
  assert.match(loader, /_dist\/isa/, "jsDelivr / remoto usa _dist");
});

test("LLM-01 — llm.md documenta cierre GET permisos + soft reload", () => {
  const llm = join(ROOT, "llm.md");
  assert.ok(existsSync(llm), "frontend/llm.md debe existir");
  const txt = readFileSync(llm, "utf8");
  assert.match(txt, /permissionsFromAdminRoles/, "doc kanban admin/roles");
  assert.match(txt, /soft:\s*true|load\(\{\s*soft/, "doc soft reload");
  assert.match(txt, /0a19d91|f8ce806/, "doc pin CDN");
  assert.match(txt, /CERRADO|no se repone|permissionsFromAdminRoles/i, "deuda GET permisos cerrada");
});
