/**
 * Invariantes 23-jul-2026 — forcePermsOpen + dist bundle + chip dark.
 * Versionado (tests/ ya no se ignora). Run: node --test tests/invariants-2026-07-23-force-perms-and-dist.test.mjs
 *
 * Mitiga: apagar bypass prod, gen-front-dist rompiendo App.js, CSS chip ausente, gitignore roto.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Los fuentes se movieron a src/: las rutas históricas se resuelven bajo src/ con fallback a la raíz (dist/ sigue en la raíz).
const read = (rel) => {
  const enSrc = join(ROOT, "src", rel);
  return readFileSync(existsSync(enSrc) ? enSrc : join(ROOT, rel), "utf8");
};

describe("forcePermsOpen — solo production (fuente)", () => {
  const src = read("js/api/sessionApi.ts");

  it("define forcePermsOpen con getIssTarget() === \"production\"", () => {
    assert.match(src, /export function forcePermsOpen\(\)/);
    assert.match(src, /getIssTarget\(\)\s*===\s*["']production["']/);
  });

  it("NO es un boolean fijo true/false", () => {
    assert.doesNotMatch(src, /export const FORCE_PERMS_OPEN\s*=\s*(true|false)\s*;/);
  });

  it("documenta política de no desactivar sin orden explícita", () => {
    assert.match(src, /POLÍTICA|orden explícita|NO DESACTIVAR|no apagar/i);
  });

  it("FORCE_PERMS_OPEN es alias de la función (no const booleana)", () => {
    assert.match(src, /export const FORCE_PERMS_OPEN\s*=\s*forcePermsOpen/);
  });
});

describe("setIssTarget — caps-changed al cambiar target", () => {
  it("dispara patyia-apptools:caps-changed", () => {
    const src = read("js/core/patyia.ts");
    assert.match(src, /function setIssTarget/);
    assert.match(src, /patyia-apptools:caps-changed/);
  });
});

describe("llm.md — política documentada", () => {
  it("tiene sección forcePermsOpen / no desactivar", () => {
    const md = read("llm.md");
    assert.match(md, /forcePermsOpen/);
    assert.match(md, /NO DESACTIVAR|orden explícita/i);
    assert.match(md, /gen-front-dist/);
    assert.match(md, /paty_build/);
  });
});

describe("dist refleja bypass y chip (deploy)", () => {
  it("sessionApi.js tiene forcePermsOpen + production", () => {
    const js = read("dist/js/api/sessionApi.js");
    assert.match(js, /forcePermsOpen/);
    assert.match(js, /["']production["']/);
  });

  it("patyia.js dispara caps-changed", () => {
    const js = read("dist/js/core/patyia.js");
    assert.match(js, /patyia-apptools:caps-changed/);
  });

  it("App.js es bundle paty_build (no víctima gen-front-dist)", () => {
    const appPath = join(ROOT, "dist/js/app/App.js");
    assert.ok(existsSync(appPath), "falta dist/js/app/App.js");
    const size = statSync(appPath).size;
    const js = read("dist/js/app/App.js");
    // Bundle real ~800KB; minify suelto gen-front-dist ~7KB con import externo.
    assert.ok(
      size > 100_000,
      `App.js demasiado pequeño (${size} B) — probable gen-front-dist; restaurar + paty_build.mjs`,
    );
    assert.match(js, /forcePermsOpen/);
    assert.match(js, /iss-target-chip/);
    // Anti-patrón: único entry thin que importa IssTarget sin inlined className
    const thinImport =
      /^import\{[^}]*IssTargetChip[^}]*\}from"\.\.\/components\/IssTargetSwitch\.js"/m.test(js) &&
      !/iss-target-chip--\$\{/.test(js) &&
      !/iss-target-chip--production/.test(js) &&
      !/iss-target-chip iss-target-chip--/.test(js);
    assert.equal(
      thinImport,
      false,
      "App.js importa IssTargetSwitch externo sin chip className — regenerar con paty_build",
    );
  });
});

describe("chip Producción — CSS dark", () => {
  it("css/app.css tiene reglas iss-target-chip--production", () => {
    const css = read("css/app.css");
    assert.match(css, /iss-target-chip--production/);
    assert.match(css, /data-mui-color-scheme=["']dark["']/);
    assert.match(css, /#86efac/);
  });

  it("dist/css/app.css también tiene el chip dark", () => {
    const css = read("dist/css/app.css");
    assert.match(css, /iss-target-chip--production/);
  });
});

describe("gitignore — components/ ignorado, tests/ versionado", () => {
  it(".gitignore ignora components/ pero NO tests/", () => {
    const gi = read(".gitignore");
    assert.match(gi, /^components\/\s*$/m, "components/ debe seguir ignorado: son copias locales de dev");
    // 4-ago-2026: tests/ pasó a versionarse. Los invariantes de deploy y de alineación con el
    // ISS valen para todo el equipo; ignorarlos los dejaba sin efecto fuera de un checkout.
    assert.doesNotMatch(gi, /^tests\/\s*$/m, "tests/ ya no se ignora: los invariantes se versionan");
    assert.match(gi, /\.git-roto\.bak/, ".git-roto.bak sí debe ignorarse: es un respaldo local");
  });
});
