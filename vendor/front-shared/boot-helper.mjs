/**
 * Arranque compartido — usado desde loader.ts / loader.mjs vía boot-resolver.
 */
import { babelPresets, initModuleGraph, importAppEntry, importAppModules } from "./boot-module-graph.mjs";
import { FRONT_SHARED_REF } from "./front-shared-ref.mjs";

/** Bump al publicar front-shared (evita caché stale de jsDelivr @main). */
export { FRONT_SHARED_REF };

function useCdnDist() {
  if (typeof globalThis !== "undefined" && globalThis.__ISA_CDN_SRC__) return false;
  return true;
}

function resolveCdnBase() {
  try {
    return new URL("./", import.meta.url).href;
  } catch (_) { /* ignore */ }
  return "https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@" + FRONT_SHARED_REF + "/cdn/";
}

const CDN = resolveCdnBase();
const useDist = useCdnDist();
// El paquete publicado en jsDelivr conserva el nombre histórico `_dist/`; el vendor local ya migró a `dist/`.
// Sin esta distinción, el fallback remoto (cuando `import.meta.url` no resuelve) pide rutas que dan 404.
const DIST_DIR = CDN.includes("cdn.jsdelivr.net") ? "_dist" : "dist";
initModuleGraph(CDN);

export { babelPresets, importAppEntry, importAppModules };

export function sharedCdnBase() {
  return CDN;
}

export async function importShared(subpath) {
  return import(CDN + subpath);
}

export function showBootError(msg) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML =
      '<pre style="color:#ff8a80;padding:24px;font-family:monospace">' + msg + "</pre>";
  }
}

export function assertStack() {
  const { React, ReactDOM, MaterialUI } = globalThis;
  if (!React?.createElement) throw new Error("React no disponible — ejecutar stack.mjs antes");
  if (!ReactDOM?.createRoot) throw new Error("ReactDOM.createRoot no disponible");
  if (!MaterialUI?.createTheme) throw new Error("MaterialUI no disponible (stack.mjs)");
}

export async function loadIsaFront() {
  ensureFeedbackCss();
  const entry = useDist ? DIST_DIR + "/isa/js/index.min.js" : "isa/js/index.js";
  try {
    await import(CDN + entry);
  } catch (err) {
    if (useDist) throw err;
    await import(CDN + DIST_DIR + "/isa/js/index.min.js");
  }
}

export function ensureFeedbackCss() {
  if (document.querySelector("link[data-isa-feedback-css]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = useDist ? CDN + DIST_DIR + "/isa/css/feedback.min.css" : CDN + "isa/css/feedback.css";
  link.setAttribute("data-isa-feedback-css", "1");
  document.head.appendChild(link);
}

export async function transpileUrl(url, Babel) {
  if (!Babel?.transform) throw new Error("Babel standalone no cargó");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar " + url + " (" + res.status + ")");
  const src = await res.text();
  const code = Babel.transform(src, { presets: babelPresets(url), filename: url }).code;
  // eslint-disable-next-line no-eval
  eval(code);
}

/** JSX compartidos — transpilados en runtime (mismo Babel que la app). */
export const SHARED_UI_FILES = [
  "layouts/split-view-constants.js",
  "layouts/useResizablePanel.js",
  "layouts/IsaSplitView.jsx",
  "widgets/UserSessionMenu.jsx",
  "widgets/UnitTestStreamModal.jsx",
  "layouts/AppShell.jsx",
];

export async function loadSharedUi(Babel) {
  const base = CDN + "ui/";
  for (const file of SHARED_UI_FILES) {
    await transpileUrl(base + file, Babel);
  }
}

export async function transpileFiles(files, Babel) {
  if (!Babel?.transform) throw new Error("Babel standalone no cargó");
  for (const file of files) {
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar " + file + " (" + res.status + ")");
    const src = await res.text();
    const code = Babel.transform(src, { presets: babelPresets(file), filename: file }).code;
    // eslint-disable-next-line no-eval
    eval(code);
  }
}

/** @param {{ files: string[], afterLoad?: () => void, Babel: unknown }} opts */
export async function bootApp({ files, afterLoad, Babel }) {
  const stackMod = await importShared("stack.mjs");
  await stackMod.stackReady;
  assertStack();
  await loadIsaFront();
  await loadSharedUi(Babel);
  await transpileFiles(files, Babel);
  if (afterLoad) afterLoad();
}
