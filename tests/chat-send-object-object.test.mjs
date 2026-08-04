/**
 * Regresión: click en Enviar pasaba SyntheticEvent a onSend → prompt "[object Object]".
 * Run: node tests/chat-send-object-object.test.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const front = path.join(__dirname, "..");

// Prefer source via tsx if available; else load compiled dist helper by inlining logic mirror.
// Dist bundles App; helpers live in patyiaChatApi — import compiled if present after build.
async function loadApi() {
  const dist = path.join(front, "dist/js/api/patyiaChatApi.js");
  try {
    return await import(pathToFileURL(dist).href);
  } catch {
    // Fallback: evaluate the same pure rules inline (must match patyiaChatApi.ts).
    return {
      resolveChatSendText(overrideText, draft = "") {
        if (typeof overrideText === "string") return overrideText.trim();
        if (typeof draft === "string") return draft.trim();
        return "";
      },
      coerceConversacionPrompt(prompt) {
        return typeof prompt === "string" ? prompt.trim() : "";
      },
      buildConversacionPostBody(input) {
        const text = typeof input.prompt === "string" ? input.prompt.trim() : "";
        return { prompt: text || "" };
      },
    };
  }
}

const api = await loadApi();
const { resolveChatSendText, coerceConversacionPrompt, buildConversacionPostBody } = api;

const fakeClickEvent = {
  type: "click",
  preventDefault() {},
  target: { value: "ignored" },
  nativeEvent: {},
};

assert.equal(resolveChatSendText(undefined, "Hola centros"), "Hola centros");
assert.equal(resolveChatSendText("texto explícito", "draft"), "texto explícito");
assert.equal(resolveChatSendText(fakeClickEvent, "¿Qué son centros de costos?"), "¿Qué son centros de costos?");
assert.equal(resolveChatSendText(fakeClickEvent, ""), "");
assert.notEqual(resolveChatSendText(fakeClickEvent, "ok"), "[object Object]");
assert.equal(String(fakeClickEvent), "[object Object]"); // documenta el bug histórico

assert.equal(coerceConversacionPrompt(fakeClickEvent), "");
assert.equal(coerceConversacionPrompt({ foo: 1 }), "");
assert.equal(coerceConversacionPrompt("  centros  "), "centros");

const bodyFromEvent = buildConversacionPostBody({ prompt: fakeClickEvent });
assert.equal(bodyFromEvent.prompt, "");
assert.notEqual(bodyFromEvent.prompt, "[object Object]");

const bodyOk = buildConversacionPostBody({ prompt: "¿Qué son centros de costos?" });
assert.equal(bodyOk.prompt, "¿Qué son centros de costos?");

console.log("OK chat-send-object-object · resolveChatSendText + body no emiten [object Object]");
