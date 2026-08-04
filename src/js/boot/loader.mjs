import { PIN, CDN } from "./cdn.mjs";

const bootHold = new URLSearchParams(location.search).has("isa_boot_hold");
const isDist = typeof globalThis !== "undefined" && globalThis.__ISA_DIST__;
const appBuild = new URL(import.meta.url).searchParams.get("v") || "dev";
const isDevHost = /localhost|127\.0\.0\.1|\[::1\]/.test(location.hostname);

const JSDELIVR_CDN = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${PIN}/cdn/`;
const BOOT_LOADER_URL = `${CDN}boot-loader.mjs?v=${PIN}`;
/** Bust cache del vendor local (JWT legacy guard 21-jul-2026). No cambia PIN CDN remoto. */
const VENDOR_BUNDLE_V = `${PIN}-jwt2`;

function vendorFrontSharedBase() {
  const base = document.querySelector("base")?.href || location.href;
  return new URL("vendor/front-shared/", base).href.replace(/\/?$/, "/");
}

/** URLs del bundle ISAFront, en orden de preferencia (vendor same-origin primero en dev). */
function isaFrontBundleUrls() {
  const vendor = `${vendorFrontSharedBase()}dist/isa/js/index.min.js?v=${VENDOR_BUNDLE_V}`;
  const primary = `${CDN}dist/isa/js/index.min.js?v=${VENDOR_BUNDLE_V}`;
  const remote = `${JSDELIVR_CDN}_dist/isa/js/index.min.js?v=${PIN}`;
  // En localhost: vendor → CDN configurado → jsDelivr (monorepo vacío no tumba el boot).
  if (isDevHost) return [vendor, primary, remote];
  return [primary, vendor, remote];
}

async function importFirst(urls, label) {
  let lastErr;
  const seen = new Set();
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    try {
      return await import(url);
    } catch (e) {
      lastErr = e;
      console.warn(`${label} falló:`, url, e);
    }
  }
  throw lastErr || new Error(`${label} no disponible`);
}

async function importBootLoader() {
  const vendorBoot = `${vendorFrontSharedBase()}boot-loader.mjs?v=${PIN}`;
  const urls = isDevHost ? [vendorBoot, BOOT_LOADER_URL] : [BOOT_LOADER_URL];
  if (isDevHost) {
    urls.push(new URL("../../../../../components/front-shared/cdn/boot-loader.mjs", import.meta.url).href);
  }
  urls.push(`${JSDELIVR_CDN}boot-loader.mjs?v=${PIN}`);
  return importFirst(urls, "boot-loader");
}

/** Bundle dist (esbuild). Fuente isa/js/index.js importa .jsx y falla en el navegador. */
async function loadIsaFrontPinned(h) {
  const urls = isaFrontBundleUrls();
  if (isDist) {
    await importFirst(urls, "ISAFront bundle");
  } else {
    try {
      await h.loadIsaFront();
    } catch (e) {
      console.warn("loadIsaFront falló, usando bundle dist:", e);
    }
    if (!window.ISAFront?.ensureCodeMirrorLoaded) {
      await importFirst(urls, "ISAFront bundle");
    }
  }
  if (!window.ISAFront?.ensureCodeMirrorLoaded) {
    throw new Error("ISAFront incompleto — lazy-assets no disponibles en el pin CDN");
  }
}

importBootLoader().then(({ mountBoot, getBabel, importBootHelper }) => {
  mountBoot(async () => {
    if (bootHold) return;
    const h = await importBootHelper();
    const Babel = getBabel();
    await (await h.importShared("stack.mjs")).stackReady;
    h.assertStack();
    await loadIsaFrontPinned(h);
    await h.loadSharedUi(Babel);
    if (isDist) {
      await import(`../core/isa-setup.js?v=${appBuild}`);
    } else {
      await h.importAppModules(["js/core/isa-setup.ts"], Babel);
    }
    // lightbox se carga lazy vía lightboxBoot.ts → ensureLightboxReady()
    // NO lo cargamos aquí porque requiere vendor/lightbox/cdn/ que no se
    // genera por defecto; si falla en dev, rompe el boot completo. Ver llm.md EP-5.
    if (isDist) {
      await import(`../main.js?v=${appBuild}`);
    } else {
      await h.importAppModules(["js/main.jsx"], Babel);
    }
  });
}).catch((err) => {
  const root = document.getElementById("root");
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  if (root) root.innerHTML = `<pre style="color:#ff8a80;padding:24px;font-family:monospace">Error de arranque:\n${msg}</pre>`;
  console.error(err);
});
