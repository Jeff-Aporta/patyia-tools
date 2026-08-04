/**
 * Invariantes UI 2026-07-17 — fallan loud si alguien reintroduce errores documentados en llm.md.
 * Carpeta tests/ versionada (4-ago-2026): estos invariantes valen para todo el equipo.
 *
 * Run: node --test tests/ui-invariants-2026-07-17.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Los fuentes se movieron a src/ (reestructuración): las rutas históricas ("js/...", "css/...") se resuelven bajo src/ y se conserva el fallback a la raíz para las que ya migraron.
const read = (rel) => {
  const enSrc = path.join(ROOT, "src", rel);
  return fs.readFileSync(fs.existsSync(enSrc) ? enSrc : path.join(ROOT, rel), "utf8");
};

describe("CONFIG_PANES order (prompts → sistema → permisos)", () => {
  it("App.jsx declara el orden de producto", () => {
    const src = read("js/app/App.jsx");
    const m = src.match(/const CONFIG_PANES\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(m, "CONFIG_PANES no encontrado");
    const ids = [...m[1].matchAll(/id:\s*"([^"]+)"/g)].map((x) => x[1]);
    assert.deepEqual(ids, ["prompts", "sistema", "permisos"], `Orden actual: ${ids.join(",")}`);
  });
});

describe("ChatSessionPanel — filtro no absoluto", () => {
  // El rediseño posterior del panel renombró __title-row a __body/__meta. El invariante que importa sigue siendo el mismo: el icono de filtro se maqueta en flujo (__action), nunca con position:absolute como en el layout plano legacy.
  it("no usa position absolute en action", () => {
    const src = read("js/tools/chat/ChatSessionPanel.jsx");
    assert.doesNotMatch(src, /position:\s*["']absolute["']/);
    assert.match(src, /paty-chat-session__action/);
    assert.match(src, /paty-chat-session__body/);
  });

  it("CSS sin layout plano absolute legacy", () => {
    const css = read("css/chat-staging.css");
    assert.doesNotMatch(css, /Layout plano — icono filtro esquina superior derecha/);
  });
});

describe("Chat split — sin Nueva en panelHeaderEnd; head oculto expandido", () => {
  it("ChatTool no pasa panelHeaderEnd", () => {
    const src = read("js/tools/ChatTool.jsx");
    assert.doesNotMatch(src, /panelHeaderEnd/);
  });

  it("CSS oculta panel-head cuando no está colapsado", () => {
    const css = read("css/chat-staging.css");
    assert.match(
      css,
      /\.paty-chat-shell-split\s+\.isa-split-view__panel:not\(\.isa-split-view__panel--collapsed\)\s*>\s*\.isa-split-view__panel-head/,
    );
  });

  it("Nueva conversación vive en list-head del sidebar", () => {
    const src = read("js/tools/chat/ChatThreadSidebar.jsx");
    assert.match(src, /paty-chat-sidebar-list-head[\s\S]*ChatNewConversationButton/s);
  });
});

describe("config-prompt-def-fields — una sola fila", () => {
  it("CSS fuerza row nowrap y no width 100% en TextField hijo directo", () => {
    const css = read("css/neon-glass-bridge.css");
    assert.match(css, /\.config-prompt-def-fields\s*\{/);
    assert.match(css, /\.config-prompt-def-fields[\s\S]{0,400}flex-direction:\s*row\s*!important/);
    assert.match(css, /\.config-prompt-def-fields[\s\S]{0,500}flex-wrap:\s*nowrap\s*!important/);
    assert.match(css, /&\s*>\s*span\s*\.MuiTextField-root\s*\{/);
    // Anti-regresión: no volver a poner width:100% en TextField hijo directo del row
    const bad = /config-prompt-def-fields[\s\S]*?&\s*\.MuiTextField-root\s*\{\s*width:\s*100%\s*;?\s*\}/;
    assert.doesNotMatch(css, bad);
  });

  it("JSX usa flexWrap nowrap en PromptDefEditor", () => {
    const src = read("js/tools/ConfigPromptsOperativosPanel.jsx");
    assert.match(src, /flexWrap=["']nowrap["'][\s\S]{0,120}config-prompt-def-fields/);
  });
});

describe("Ocultar vacíos — default true", () => {
  it("readPermisosHideEmptyFromUrl usa !== false", () => {
    const src = read("js/core/urlState.ts");
    const fn = src.match(/export function readPermisosHideEmptyFromUrl[\s\S]*?\n\}/);
    assert.ok(fn, "función no encontrada");
    assert.match(fn[0], /hideEmpty\s*!==\s*false/);
    assert.doesNotMatch(fn[0], /hideEmpty\s*===\s*true/);
  });
});

describe("LogViewer fechas — formatTs no ISO crudo", () => {
  it("usa formatTs(createdAt)", () => {
    const src = read("js/tools/LogViewer.jsx");
    assert.match(src, /import\s*\{\s*formatTs\s*\}\s*from\s*["'].*msgDateFormat/);
    assert.match(src, /formatTs\(\s*logInfo\.createdAt\s*\)/);
    assert.doesNotMatch(src, /createdAt\)\.slice\(0,\s*19\)/);
  });
});

describe("gitignore tests/", () => {
  // 4-ago-2026: tests/ pasó a versionarse. Ignorarlo dejaba los invariantes de deploy y de
  // alineación con el ISS sin efecto fuera de un checkout local, que es donde menos hacen falta.
  it("tests/ se versiona (ya no se ignora)", () => {
    const gi = read(".gitignore");
    assert.doesNotMatch(gi, /^tests\/$/m);
  });
});
