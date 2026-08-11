#!/usr/bin/env node
/**
 * Gate de salud isa-patyia (PatyIA/app).
 *
 * Corre en paralelo:
 *   1) rebuild dist/ (JS + CSS vía paty_build.mjs, jobs internos en paralelo)
 *   2) node --test tests/*.test.mjs
 *
 * Si los tests fallan por race DIST-01 (mtime mientras rebuild), re-corre tests
 * una vez con dist ya fresco. Fallo real de tests o de dist → exit 1.
 *
 * Uso:
 *   node scripts/run-health.mjs
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TESTS_DIR = path.join(ROOT, "tests");

function listTestFiles() {
  return readdirSync(TESTS_DIR)
    .filter((n) => n.endsWith(".test.mjs"))
    .sort()
    .map((n) => path.join("tests", n));
}

function run(args, label) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    console.log(`\n▶ ${label}`);
    // shell:false — process.execPath en Windows suele vivir en "Program Files"
    // y con shell:true se parte en C:\Program.
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
      env: process.env,
      windowsHide: true,
    });
    child.on("error", (err) => {
      console.error(`${label} spawn error:`, err.message);
      resolve({ ok: false, code: 1, ms: Date.now() - t0, label });
    });
    child.on("close", (code) => {
      const ms = Date.now() - t0;
      const ok = code === 0;
      console.log(`${ok ? "✓" : "✗"} ${label} (${ms} ms, exit ${code ?? 1})`);
      resolve({ ok, code: code ?? 1, ms, label });
    });
  });
}

const testFiles = listTestFiles();
if (!testFiles.length) {
  console.error("Sin tests/*.test.mjs");
  process.exit(1);
}

const distP = run(["scripts/paty_build.mjs"], "dist rebuild (paralelo)");
const testsP = run(["--test", ...testFiles], `tests/ (${testFiles.length} archivos)`);

const [distR, testsR] = await Promise.all([distP, testsP]);

if (!distR.ok) {
  console.error("\n❌ Gate falló: dist rebuild.");
  process.exit(1);
}

if (!testsR.ok) {
  console.log("\n↻ Re-run tests/ tras dist (evita race DIST mtime)…");
  const again = await run(["--test", ...testFiles], "tests/ (re-run)");
  if (!again.ok) {
    console.error("\n❌ Gate falló: tests.");
    process.exit(1);
  }
}

console.log(`\n✅ Gate salud OK — dist ${distR.ms} ms · tests ${testsR.ms} ms`);
