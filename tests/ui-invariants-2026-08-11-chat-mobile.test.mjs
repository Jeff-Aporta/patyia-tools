/**
 * Invariantes chat móvil 11-ago-2026 — FAB duplicado / ChatTool en paty_build / compose sin hueco FAB.
 * tests/ versionado en este front (no gitignore).
 * Run: node --test tests/ui-invariants-2026-08-11-chat-mobile.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => {
  const enSrc = path.join(ROOT, "src", rel);
  return fs.readFileSync(fs.existsSync(enSrc) ? enSrc : path.join(ROOT, rel), "utf8");
};

describe("Chat móvil — un solo affordance para abrir conversaciones", () => {
  it("ChatTool no monta FAB paty-mobile-sidebar-fab--chat", () => {
    const src = read("js/tools/ChatTool.jsx");
    assert.doesNotMatch(src, /paty-mobile-sidebar-fab--chat/);
    assert.doesNotMatch(src, /\bFab\b/);
    assert.doesNotMatch(src, /mdi:forum-outline/);
  });

  it("toolbar sigue abriendo sidebar con mdi:menu-open", () => {
    const src = read("js/tools/chat/ChatMainPanel.jsx");
    assert.match(src, /onOpenSidebar/);
    assert.match(src, /mdi:menu-open/);
    assert.match(src, /Abrir conversaciones/);
  });

  it("CSS chat no reserva padding-left 3.6rem para FAB eliminado", () => {
    const css = read("css/chat-staging.css");
    assert.doesNotMatch(css, /paty-mobile-sidebar-fab--chat/);
    assert.doesNotMatch(css, /padding-left:\s*3\.6rem/);
  });

  it("LogViewer puede conservar FAB --log (no es el chat)", () => {
    const src = read("js/tools/LogViewer.jsx");
    assert.match(src, /paty-mobile-sidebar-fab--log/);
  });
});

describe("paty_build — ChatTool en JS_JOBS (dist no stale)", () => {
  it("JS_JOBS lista ChatTool.jsx → dist/js/tools/ChatTool.js", () => {
    const build = fs.readFileSync(path.join(ROOT, "scripts", "paty_build.mjs"), "utf8");
    assert.match(
      build,
      /src\/js\/tools\/ChatTool\.jsx["']\s*,\s*["']js\/tools\/ChatTool\.js["']/,
      "ChatTool debe estar en JS_JOBS — si no, dist/js/tools/ChatTool.js queda viejo tras editar src. Ver llm.md 11-ago.",
    );
  });
});

describe("llm.md documenta sesión FAB / ChatTool", () => {
  it("contiene ancla sesión 11-ago chat móvil", () => {
    const md = fs.readFileSync(path.join(ROOT, "llm.md"), "utf8");
    assert.match(md, /Sesión 11-ago-2026 — Chat móvil/);
    assert.match(md, /paty-mobile-sidebar-fab--chat/);
    assert.match(md, /NO[\s\S]{0,80}Reintroducir `Fab`/i);
  });
});
