/**
 * formatTs / formatMsgFecha — mes en español (es-CO).
 * Run: node --experimental-strip-types --test tests/msgDateFormat.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modUrl = pathToFileURL(path.join(ROOT, "src/js/core/msgDateFormat.ts")).href;

describe("msgDateFormat es-CO", async () => {
  let formatTs;
  let formatMsgFecha;
  try {
    ({ formatTs, formatMsgFecha } = await import(modUrl));
  } catch (e) {
    it("requiere node --experimental-strip-types para importar .ts", () => {
      assert.fail(`No se pudo importar msgDateFormat.ts: ${e?.message || e}. Usa: node --experimental-strip-types --test tests/msgDateFormat.test.mjs`);
    });
    return;
  }

  it("incluye nombre de mes en español (no YYYY-MM-DD crudo)", () => {
    const label = formatTs("2026-07-09T12:58:43");
    assert.ok(label, "label vacío");
    assert.doesNotMatch(label, /^\d{4}-\d{2}-\d{2}/, `sigue pareciendo ISO: ${label}`);
    // es-CO suele usar "jul" / "julio"
    assert.match(label.toLowerCase(), /jul/, `sin mes español: ${label}`);
  });

  it("formatMsgFecha expone iso + label", () => {
    const { label, iso } = formatMsgFecha("2026-07-09T12:58:43Z");
    assert.ok(label.includes("jul") || label.toLowerCase().includes("julio"));
    assert.match(iso, /2026-07-09/);
  });
});
