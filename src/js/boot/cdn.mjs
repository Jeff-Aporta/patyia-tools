export const PIN = "0a19d91";

const isDevHost =
  typeof location !== "undefined" && /localhost|127\.0\.0\.1|\[::1\]/.test(location.hostname);

function useLocalMonorepoCdn() {
  if (!isDevHost) return false;
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("isa_cdn") === "remote") return false;
    // Solo monorepo con query explícito. NO persistir via localStorage:
    // components/front-shared/cdn suele estar vacío (submódulo sin checkout)
    // y deja el boot en "Failed to fetch …/index.min.js" sin escape.
    // Para forzar monorepo: ?isa_cdn=monorepo|local
    if (q.get("isa_cdn") === "local" || q.get("isa_cdn") === "monorepo") return true;
    // Limpiar flag legacy que dejaba el boot roto en Live Server.
    try {
      if (localStorage.getItem("isa-patyia:local-cdn") === "1") {
        localStorage.removeItem("isa-patyia:local-cdn");
      }
    } catch { /* ignore */ }
    return false;
  } catch {
    return false;
  }
}

function frontSharedCdnBase() {
  const base = document.querySelector("base")?.href || location.href;
  return new URL("../../components/front-shared/cdn/", base).href.replace(/\/?$/, "/");
}

function vendorCdnBase() {
  const base = document.querySelector("base")?.href || location.href;
  return new URL("vendor/front-shared/", base).href.replace(/\/?$/, "/");
}

const JSDELIVR_CDN = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${PIN}/cdn/`;

/** Resolución del CDN de front-shared (boot-loader, ISAFront, stack.mjs):
 *  - Producción: vendor same-origin (sin depender de jsDelivr en runtime).
 *  - localhost: vendor local same-origin por defecto — el importmap del index.html
 *    aplica a módulos same-origin y resuelve `react`, `react-dom`, `@mui/material`
 *    hacia `vendor/cdn/`. Cargar stack.mjs desde jsDelivr rompe el importmap
 *    (cross-origin no respeta el importmap del documento → `Failed to resolve
 *    module specifier "react"`).
 *  - Override explícito:
 *      ?isa_cdn=monorepo → `components/front-shared/cdn/` (sirve al monorepo Apps-fullstack).
 *      ?isa_cdn=remote   → jsDelivr (para QA contra el pin remoto sin tocar vendor local).
 *  - IMPORTANTE: la URL debe ser absoluta (location.origin + path) — el `loader.mjs`
 *    importa desde aquí, y `import()` resuelve URLs relativas contra el baseURI del
 *    MÓDULO importador (`dist/js/boot/loader.mjs`), no del documento. Si fuera
 *    relativa, se buscaría en `dist/js/boot/vendor/front-shared/...` → 404.
 *    vendorCdnBase() y frontSharedCdnBase() ya retornan absolutas via `new URL(...)`.
 */
export const CDN = !isDevHost
  ? vendorCdnBase()
  : useLocalMonorepoCdn()
    ? frontSharedCdnBase()
    : (typeof location !== "undefined" && new URLSearchParams(location.search).get("isa_cdn") === "remote")
      ? JSDELIVR_CDN
      : vendorCdnBase();

export const asset = (p) => (isDevHost ? `${CDN}${p}` : `${CDN}${p}?v=${PIN}`);

/* @isa-lightbox-boot:start */
/** @jeff-aporta/lightbox-zoom — pin: sync-component-refs.mjs */
export const LIGHTBOX_ZOOM_REF = "4dd6595";

export function lightboxZoomBase() {
  const base = document.querySelector("base")?.href || location.href;
  // En dev (localhost) permitimos override:
  //   ?isa_cdn=remote → jsDelivr del pin remoto
  //   ?isa_cdn=monorepo o storage flag → vendor del monorepo (`../../components/lightbox/cdn/`)
  //   default → vendor local same-origin (`vendor/lightbox/cdn/`) si existe,
  //             si no fallback monorepo, si no fallback jsDelivr.
  if (isDevHost) {
    const q = new URLSearchParams(location.search);
    if (q.get("isa_cdn") === "remote") {
      return `https://cdn.jsdelivr.net/gh/Jeff-Aporta/lightbox-zoom@${LIGHTBOX_ZOOM_REF}/cdn/`;
    }
    if (q.get("isa_cdn") === "monorepo" || q.get("isa_cdn") === "local") {
      return new URL("../../components/lightbox/cdn/", base).href.replace(/\/?$/, "/");
    }
    const sameOrigin = new URL("vendor/lightbox/cdn/", base).href.replace(/\/?$/, "/");
    // Asumimos same-origin; si el recurso no existe, el caller verá 404 y reportará.
    return sameOrigin;
  }
  return `https://cdn.jsdelivr.net/gh/Jeff-Aporta/lightbox-zoom@${LIGHTBOX_ZOOM_REF}/cdn/`;
}

function ensureLightboxStylesheet(href) {
  if (document.querySelector("[data-isa-lb-zoom-css]")) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-isa-lb-zoom-css", "1");
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("No se pudo cargar " + href));
    document.head.appendChild(link);
  });
}

function ensureLightboxScript(src) {
  if (globalThis.ISAComponents?.LightboxZoom?.LightboxZoomDialog) {
    return Promise.resolve();
  }
  const stale = document.querySelector("script[data-isa-lb-zoom-js]");
  if (stale) stale.remove();
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.setAttribute("data-isa-lb-zoom-js", "1");
    el.onload = () => {
      if (!globalThis.ISAComponents?.LightboxZoom?.LightboxZoomDialog) {
        reject(new Error("LightboxZoom no registró ISAComponents.LightboxZoom"));
        return;
      }
      resolve();
    };
    el.onerror = () => reject(new Error("No se pudo cargar " + src));
    document.head.appendChild(el);
  });
}

/** Carga CSS + bundle. Requiere stack React/MUI y registerApp previo. */
export async function ensureLightboxZoom(base = lightboxZoomBase()) {
  const b = base.endsWith("/") ? base : base + "/";
  await ensureLightboxStylesheet(b + "lightbox-zoom.min.css");
  await ensureLightboxScript(b + "lightbox-zoom.min.js");
  return globalThis.ISAComponents.LightboxZoom;
}
/* @isa-lightbox-boot:end */

/* @isa-swagger-boot:start */
/** Jeff-Aporta/swagger-viewer — pin CDN git (sync-component-refs.mjs) */
export const SWAGGER_VIEWER_REF = "859035b";

export function swaggerViewerBase() {
  const base = document.querySelector("base")?.href || location.href;
  if (isDevHost) {
    const q = new URLSearchParams(location.search);
    if (q.get("isa_cdn") === "remote") {
      return `${location.origin}/api/swagger/cdn/`;
    }
    if (q.get("isa_cdn") === "monorepo" || q.get("isa_cdn") === "local") {
      return new URL("../../components/swagger/cdn/", base).href.replace(/\/?$/, "/");
    }
    return new URL("../../components/swagger/cdn/", base).href.replace(/\/?$/, "/");
  }
  return `${location.origin}/api/swagger/cdn/`;
}

function ensureSwaggerStylesheet(href) {
  if (document.querySelector("[data-isa-sw-css]")) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-isa-sw-css", "1");
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("No se pudo cargar " + href));
    document.head.appendChild(link);
  });
}

export async function ensureSwaggerViewerCss(base = swaggerViewerBase()) {
  const b = base.endsWith("/") ? base : base + "/";
  await ensureSwaggerStylesheet(b + "swagger-viewer.min.css");
  return b;
}

export async function ensureSwaggerViewer(base = swaggerViewerBase()) {
  const b = await ensureSwaggerViewerCss(base);
  if (!globalThis.ISAComponents?.Swagger?.bootSwaggerApp) {
    await import(b + "swagger-viewer.min.js");
  }
  if (!globalThis.ISAComponents?.Swagger?.bootSwaggerApp) {
    throw new Error("Swagger no registró ISAComponents.Swagger");
  }
  return globalThis.ISAComponents.Swagger;
}
/* @isa-swagger-boot:end */
