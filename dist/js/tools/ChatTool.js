var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/js/core/patyia.ts
function isPatyiaApiPath(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.startsWith("/patyia") || p.startsWith("/api/patyia");
}
function patyiaIssBase() {
  const t = getIssTarget();
  if (t === "local") return PATYIA_ISS_LOCAL.replace(/\/$/, "");
  if (t === "production") return PATYIA_ISS_PROD_URL.replace(/\/$/, "");
  return PATYIA_ISS_URL.replace(/\/$/, "");
}
function patyiaIssCapFetchBase() {
  return patyiaIssBase();
}
function resolveIssApiBase() {
  const base = patyiaIssBase();
  return base.endsWith("/api") ? base : `${base}/api`;
}
function getIssTarget() {
  try {
    const raw = localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY);
    if (raw === "production" || raw === "staging" || raw === "local") return raw;
  } catch {
  }
  return isDevHost() ? "local" : "staging";
}
function isDevHost() {
  try {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
  } catch {
    return false;
  }
}
function ensureIssLocalDefault() {
  try {
    if (localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY) != null) return;
    const def = isDevHost() ? "local" : "staging";
    localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, def);
  } catch {
  }
}
function isLocalMode() {
  return getIssTarget() === "local";
}
function avatarBgFromName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return AVATAR_BG_PALETTE[h % AVATAR_BG_PALETTE.length];
}
function buildUserAvatarUrl(name, size = 72) {
  const label = String(name ?? "").trim() || "Usuario";
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";
  const bg = avatarBgFromName(label.toLowerCase());
  const half = size / 2;
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${half}" cy="${half}" r="${half}" fill="#${bg}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
async function readPatyiaSseStream(response, onEvent) {
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const j = await response.json();
      msg = String(j?.error || j?.message || msg);
    } catch {
    }
    throw new Error(msg || `HTTP ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream no disponible");
  const dec = new TextDecoder();
  let buf = "";
  let lastPayload = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() || "";
    for (const block of blocks) {
      const lines = block.split("\n");
      let event = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const data = JSON.parse(dataLine);
        lastPayload = data;
        onEvent({ event, data });
      } catch {
      }
    }
  }
  return lastPayload;
}
var ORCH_ONLINE, PATYIA_ISS_URL, PATYIA_ISS_PROD_URL, PATYIA_ISS_LOCAL, PATYIA_ISS_LOCAL_API, PATYIA_ISS_PROD_API, PATYIA_ISS_STAGING_API, PATYIA_ISS_TARGET_LS_KEY, AVATAR_BG_PALETTE;
var init_patyia = __esm({
  "src/js/core/patyia.ts"() {
    window.ISAFront.migrateLegacyGatewayKeys?.({ "jeff:gateway-local": "", "patyia-apptools:gateway-local": "", "patyia-apptools:lab-local": "" });
    ORCH_ONLINE = "https://main-orchestrator.jeffaporta.workers.dev";
    PATYIA_ISS_URL = "https://ayudascp-ia-staging.azurewebsites.net";
    PATYIA_ISS_PROD_URL = "https://ayudascp-ia.azurewebsites.net";
    PATYIA_ISS_LOCAL = "http://127.0.0.1:8802";
    PATYIA_ISS_LOCAL_API = `${PATYIA_ISS_LOCAL}/api`;
    PATYIA_ISS_PROD_API = `${PATYIA_ISS_PROD_URL}/api`;
    PATYIA_ISS_STAGING_API = `${PATYIA_ISS_URL}/api`;
    PATYIA_ISS_TARGET_LS_KEY = "patyia-apptools:iss-target";
    AVATAR_BG_PALETTE = [
      "1e90ff",
      "0ea5e9",
      "14b8a6",
      "22c55e",
      "84cc16",
      "eab308",
      "f97316",
      "ef4444",
      "ec4899",
      "a855f7",
      "6366f1",
      "64748b"
    ];
    try {
      window.ISAFront.buildUserAvatarUrl = buildUserAvatarUrl;
    } catch {
    }
  }
});

// src/js/core/platform.ts
function frontSharedLazy() {
  const api = window.ISAFront;
  return api?.ensureCodeMirrorLoaded ? api : null;
}
function mdToHtml(src) {
  const api = frontSharedLazy();
  if (api?.mdToHtml) return api.mdToHtml(src);
  return String(src ?? "");
}
function getIsaSplitView() {
  const C = window.ISAFront?.Layout?.IsaSplitView;
  if (!C) {
    throw new Error("IsaSplitView no cargado \u2014 recargue sin cach\xE9 (Ctrl+Shift+R).");
  }
  return C;
}
function getGlass() {
  const g = window.ISAFront?.Glass;
  if (!g?.GlassCard) {
    throw new Error("ISAFront.Glass no cargado \u2014 recargue sin cach\xE9 (Ctrl+Shift+R).");
  }
  return g;
}
function lightboxApi() {
  const api = window.ISAComponents?.LightboxZoom;
  if (!api?.LightboxZoomDialog) {
    throw new Error("ISAComponents.LightboxZoom no cargado \u2014 recargue sin cach\xE9 (Ctrl+Shift+R).");
  }
  return api;
}
function CodeMirrorPanel(props) {
  const Panel = window.ISAFront?.CodeMirrorPanel;
  if (!Panel) throw new Error("CodeMirrorPanel no cargado \u2014 recargue sin cach\xE9 (Ctrl+Shift+R).");
  return Panel(props);
}
function toastError(text, timeout) {
  fb()?.toast?.error?.(text, timeout);
}
function toastSuccess(text, timeout) {
  fb()?.toast?.success?.(text, timeout);
}
function toastInfo(text, timeout) {
  fb()?.toast?.info?.(text, timeout);
}
function toastWarning(text, timeout) {
  fb()?.toast?.warning?.(text, timeout);
}
function requestConfirm(opts) {
  return fb()?.confirm?.(opts) ?? Promise.resolve(false);
}
var bridge, UI, Session, Config, getReact, getMaterialUI, Lightbox, fb;
var init_platform = __esm({
  "src/js/core/platform.ts"() {
    init_patyia();
    bridge = () => window.ISAFront.createPlatformBridge("ISA");
    UI = {
      get Icon() {
        return bridge().UI.Icon;
      },
      get TargetSwitch() {
        return bridge().UI.TargetSwitch;
      },
      get ThemeSwitch() {
        return bridge().UI.ThemeSwitch;
      },
      get useRealtimeStatus() {
        return bridge().UI.useRealtimeStatus;
      },
      get RealtimeStatusDot() {
        return bridge().UI.RealtimeStatusDot;
      },
      get Loading() {
        return bridge().UI.Loading;
      },
      get ErrorBox() {
        return bridge().UI.ErrorBox;
      },
      get LoginGate() {
        return bridge().UI.LoginGate;
      },
      get LoginButton() {
        return bridge().UI.LoginButton;
      }
    };
    Session = {
      current: () => bridge().Session.current(),
      isLoggedIn: () => bridge().Session.isLoggedIn(),
      username: () => bridge().Session.username(),
      realUsername: () => bridge().Session.realUsername?.() ?? bridge().Session.username(),
      auditAuthor: () => bridge().Session.auditAuthor?.() ?? String(bridge().Session.username() || "").trim().toUpperCase(),
      authHeader: () => bridge().Session.authHeader(),
      appHeader: () => bridge().Session.appHeader(),
      appId: () => bridge().Session.appId(),
      login: (u, p, opts) => bridge().Session.login(u, p, opts),
      logout: () => bridge().Session.logout(),
      refreshProfile: () => bridge().Session.refreshProfile(),
      capabilities: () => bridge().Session.capabilities(),
      adminCapabilities: () => bridge().Session.adminCapabilities?.() ?? bridge().Session.capabilities(),
      capabilityCatalog: () => bridge().Session.capabilityCatalog?.() ?? [],
      can: (cap) => bridge().Session.can(cap),
      blockReason: (cap) => bridge().Session.blockReason(cap),
      get EVENT() {
        return bridge().Session.EVENT;
      }
    };
    Config = {
      base: () => bridge().Config.base(),
      apiUrl: (path) => bridge().Config.apiUrl(path),
      isLocal: () => bridge().Config.isLocal(),
      setLocal: (on) => bridge().Config.setLocal(on),
      get EVENT() {
        return bridge().Config.EVENT;
      }
    };
    getReact = () => window.ISAFront.getReact();
    getMaterialUI = () => window.ISAFront.getMaterialUI();
    Lightbox = {
      get ImageLightboxDialog() {
        return lightboxApi().LightboxZoomDialog;
      },
      get LightboxImage() {
        return lightboxApi().LightboxZoomImage;
      },
      get useImageLightboxZoom() {
        return lightboxApi().useLightboxZoom;
      }
    };
    fb = () => globalThis.ISAFront?.Feedback;
  }
});

// src/js/boot/cdn.mjs
var cdn_exports = {};
__export(cdn_exports, {
  CDN: () => CDN,
  LIGHTBOX_ZOOM_REF: () => LIGHTBOX_ZOOM_REF,
  PIN: () => PIN,
  SWAGGER_VIEWER_REF: () => SWAGGER_VIEWER_REF,
  asset: () => asset,
  ensureLightboxZoom: () => ensureLightboxZoom,
  ensureSwaggerViewer: () => ensureSwaggerViewer,
  ensureSwaggerViewerCss: () => ensureSwaggerViewerCss,
  lightboxZoomBase: () => lightboxZoomBase,
  swaggerViewerBase: () => swaggerViewerBase
});
function useLocalMonorepoCdn() {
  if (!isDevHost2) return false;
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("isa_cdn") === "remote") return false;
    if (q.get("isa_cdn") === "local" || q.get("isa_cdn") === "monorepo") return true;
    try {
      if (localStorage.getItem("isa-patyia:local-cdn") === "1") {
        localStorage.removeItem("isa-patyia:local-cdn");
      }
    } catch {
    }
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
function lightboxZoomBase() {
  const base = document.querySelector("base")?.href || location.href;
  if (isDevHost2) {
    const q = new URLSearchParams(location.search);
    if (q.get("isa_cdn") === "remote") {
      return `https://cdn.jsdelivr.net/gh/Jeff-Aporta/lightbox-zoom@${LIGHTBOX_ZOOM_REF}/cdn/`;
    }
    if (q.get("isa_cdn") === "monorepo" || q.get("isa_cdn") === "local") {
      return new URL("../../components/lightbox/cdn/", base).href.replace(/\/?$/, "/");
    }
    const sameOrigin = new URL("vendor/lightbox/cdn/", base).href.replace(/\/?$/, "/");
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
        reject(new Error("LightboxZoom no registr\xF3 ISAComponents.LightboxZoom"));
        return;
      }
      resolve();
    };
    el.onerror = () => reject(new Error("No se pudo cargar " + src));
    document.head.appendChild(el);
  });
}
async function ensureLightboxZoom(base = lightboxZoomBase()) {
  const b = base.endsWith("/") ? base : base + "/";
  await ensureLightboxStylesheet(b + "lightbox-zoom.min.css");
  await ensureLightboxScript(b + "lightbox-zoom.min.js");
  return globalThis.ISAComponents.LightboxZoom;
}
function swaggerViewerBase() {
  const base = document.querySelector("base")?.href || location.href;
  if (isDevHost2) {
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
async function ensureSwaggerViewerCss(base = swaggerViewerBase()) {
  const b = base.endsWith("/") ? base : base + "/";
  await ensureSwaggerStylesheet(b + "swagger-viewer.min.css");
  return b;
}
async function ensureSwaggerViewer(base = swaggerViewerBase()) {
  const b = await ensureSwaggerViewerCss(base);
  if (!globalThis.ISAComponents?.Swagger?.bootSwaggerApp) {
    await import(b + "swagger-viewer.min.js");
  }
  if (!globalThis.ISAComponents?.Swagger?.bootSwaggerApp) {
    throw new Error("Swagger no registr\xF3 ISAComponents.Swagger");
  }
  return globalThis.ISAComponents.Swagger;
}
var PIN, isDevHost2, JSDELIVR_CDN, CDN, asset, LIGHTBOX_ZOOM_REF, SWAGGER_VIEWER_REF;
var init_cdn = __esm({
  "src/js/boot/cdn.mjs"() {
    PIN = "0a19d91";
    isDevHost2 = typeof location !== "undefined" && /localhost|127\.0\.0\.1|\[::1\]/.test(location.hostname);
    JSDELIVR_CDN = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${PIN}/cdn/`;
    CDN = !isDevHost2 ? vendorCdnBase() : useLocalMonorepoCdn() ? frontSharedCdnBase() : typeof location !== "undefined" && new URLSearchParams(location.search).get("isa_cdn") === "remote" ? JSDELIVR_CDN : vendorCdnBase();
    asset = (p) => isDevHost2 ? `${CDN}${p}` : `${CDN}${p}?v=${PIN}`;
    LIGHTBOX_ZOOM_REF = "4dd6595";
    SWAGGER_VIEWER_REF = "859035b";
  }
});

// src/js/api/portalJwtApi.ts
function orchBase() {
  return ORCH_ONLINE.replace(/\/$/, "");
}
function authHeaders() {
  const h = { Accept: "application/json" };
  if (Session.isLoggedIn()) {
    Object.assign(h, Session.authHeader(), Session.appHeader());
  }
  return h;
}
function portalUrl(portal, query = "") {
  const q = `portal=${encodeURIComponent(portal)}${query ? `&${query}` : ""}`;
  return `${orchBase()}/api/auth/portal-jwt?${q}`;
}
async function fetchPortalJwt(portal = PATYIA_PORTAL_ID) {
  const res = await fetch(portalUrl(portal), { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo cargar el JWT del portal");
  }
  return data;
}
async function savePortalJwt(token, portal = PATYIA_PORTAL_ID) {
  const res = await fetch(portalUrl(portal), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ portal, token })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo guardar el JWT del portal");
  }
  return data;
}
var PATYIA_PORTAL_ID;
var init_portalJwtApi = __esm({
  "src/js/api/portalJwtApi.ts"() {
    init_platform();
    init_patyia();
    PATYIA_PORTAL_ID = "soporte-staging";
  }
});

// src/js/api/issListFilter.ts
function buildConversacionesListFilter(input = {}) {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const offset = Math.max(0, Math.floor(Number(input.offset) || 0));
  const sort = String(input.sort || CONVERSACIONES_LIST_SORT_DEFAULT).trim() || CONVERSACIONES_LIST_SORT_DEFAULT;
  const search = String(input.search ?? "").trim().slice(0, 200);
  const itercero = String(input.itercero ?? "").trim();
  const icontacto = String(input.icontacto ?? "").trim();
  return {
    limit,
    offset,
    sort,
    ...search ? { search } : {},
    ...itercero && icontacto ? { itercero, icontacto } : {}
  };
}
function conversacionesListBody(input = {}) {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  return buildConversacionesListFilter({
    search: input.search,
    limit,
    offset: (page - 1) * limit,
    sort: input.sort,
    itercero: input.itercero,
    icontacto: input.icontacto
  });
}
function tercerosAuditListBody(input = {}) {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 20)));
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const search = String(input.search ?? input.q ?? "").trim().slice(0, 200);
  const jwtTercero = String(input.jwtTercero ?? "").trim();
  const jwtContacto = String(input.jwtContacto ?? "").trim();
  const jwtNombre = String(input.jwtNombre ?? "").trim();
  const body = {
    limit,
    offset: (page - 1) * limit
  };
  if (search) body.search = search;
  if (input.eq && typeof input.eq === "object" && !Array.isArray(input.eq) && Object.keys(input.eq).length) {
    body.eq = input.eq;
  }
  if (jwtTercero) body.jwtTercero = jwtTercero;
  if (jwtContacto) body.jwtContacto = jwtContacto;
  if (jwtNombre) body.jwtNombre = jwtNombre;
  return body;
}
var CONVERSACIONES_LIST_SORT_DEFAULT;
var init_issListFilter = __esm({
  "src/js/api/issListFilter.ts"() {
    CONVERSACIONES_LIST_SORT_DEFAULT = "-iconversacion";
  }
});

// src/js/api/patyiaTokens.ts
function patyAuthHeaders(jwt, extra = {}) {
  return {
    Authorization: `Bearer ${jwt.token}`,
    Accept: "application/json",
    ...extra
  };
}
var init_patyiaTokens = __esm({
  "src/js/api/patyiaTokens.ts"() {
    init_platform();
  }
});

// src/js/api/patyiaChatApi.ts
function authHeaders2(jwt, extra = {}) {
  return patyAuthHeaders(jwt, extra);
}
function unwrapBody(data) {
  const d = data;
  if (d?.respuesta && typeof d.respuesta === "object") return d.respuesta;
  if (d?.body && typeof d.body === "object") return d.body;
  return d;
}
async function jsonFetch(path, jwt, init) {
  const base = resolveIssApiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...authHeaders2(jwt),
      ...init?.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {},
      ...init?.headers || {}
    }
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = res.statusText;
    if (ct.includes("json")) {
      try {
        const j = await res.json();
        const enc = j.encabezado;
        if (enc?.mensaje) msg = String(enc.mensaje);
        else {
          const inner = j.respuesta || j.body || j;
          msg = String(inner?.error || inner?.mensaje || j.error || j.message || msg);
        }
      } catch {
      }
    }
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (ct.includes("json")) {
    const raw = await res.json();
    return unwrapBody(raw);
  }
  return {};
}
async function listConversaciones(jwt, input = {}) {
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const body = await jsonFetch("/conversaciones", jwt, {
    method: "QUERY",
    body: JSON.stringify(conversacionesListBody(input))
  });
  const conversaciones = Array.isArray(body.conversaciones) ? body.conversaciones : [];
  const total = Number(body.total ?? 0) || 0;
  const resLimit = Number(body.limit ?? limit) || limit;
  const resPage = Number(body.page ?? page) || page;
  const pages = Number(body.pages ?? 0) || (total > 0 ? Math.ceil(total / resLimit) : 0);
  return { conversaciones, total, page: resPage, limit: resLimit, pages };
}
async function getConversacion(jwt, id) {
  return jsonFetch(`/conversacion/${id}`, jwt);
}
async function getConversacionLogs(jwt, id) {
  return jsonFetch(`/conversacion/logs/${id}`, jwt);
}
async function getConversacionMcpSession(jwt, id, sessionId) {
  const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return jsonFetch(`/conversacion/${id}/mcp-session${q}`, jwt);
}
function convLogFromDetalle(detail, id) {
  const raw = detail?.convLog;
  if (!raw || !Array.isArray(raw.mensajes) || !raw.mensajes.length) return null;
  const convId = Number(raw.iconversacion ?? detail?.iconversacion ?? id ?? 0);
  return { ...raw, iconversacion: convId > 0 ? convId : raw.iconversacion };
}
async function getConversacionLogsWithRetry(jwt, id, { minMensajes = 0, attempts = 8, delayMs = 300 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const detail = await getConversacionLogs(jwt, id);
      last = detail;
      const n = convLogFromDetalle(detail, id)?.mensajes?.length ?? 0;
      if (!minMensajes || n >= minMensajes) return detail;
    } catch (e) {
      if (i === attempts - 1 && !last) throw e;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }
  if (!last) throw new Error(`Log conv-${id} no encontrado`);
  return last;
}
async function deleteConversacion(jwt, id) {
  await jsonFetch(`/conversacion/${id}`, jwt, { method: "DELETE" });
}
async function postMensajeCalificado(jwt, input) {
  return jsonFetch("/mensaje", jwt, {
    method: "POST",
    body: JSON.stringify(input)
  });
}
function isHttpUrl(s) {
  return /^https?:\/\//i.test(String(s || "").trim());
}
function isLegacyDataUrl(s) {
  const v = String(s || "").trim();
  return v.startsWith("data:audio/") || v.startsWith("data:image/");
}
function resolveChatSendText(overrideText, draft = "") {
  if (typeof overrideText === "string") return overrideText.trim();
  if (typeof draft === "string") return draft.trim();
  return "";
}
function coerceConversacionPrompt(prompt) {
  return typeof prompt === "string" ? prompt.trim() : "";
}
function adjuntoUrl(item) {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    const o = item;
    return String(o.url ?? o.dataUrl ?? "").trim();
  }
  return "";
}
function normalizeAdjuntoWire(item) {
  if (typeof item === "string") {
    const s = item.trim();
    return isHttpUrl(s) || isLegacyDataUrl(s) ? s : null;
  }
  if (!item || typeof item !== "object") return null;
  const o = item;
  const url = adjuntoUrl(o);
  if (!url || !(isHttpUrl(url) || isLegacyDataUrl(url))) return null;
  const ifile = String(o.ifile ?? o.IFILE ?? "").trim();
  if (!ifile) return url;
  const variants = o.variants && typeof o.variants === "object" ? o.variants : void 0;
  return {
    url,
    ifile,
    ...typeof o.kind === "string" ? { kind: o.kind } : {},
    ...variants ? { variants } : {}
  };
}
function buildConversacionPostBody(input) {
  const text = coerceConversacionPrompt(input.prompt);
  const imagenes = (input.imagenes || []).map(normalizeAdjuntoWire).filter((x) => x != null);
  const audios = (input.audios || []).map(normalizeAdjuntoWire).filter((x) => x != null);
  const hasMedia = imagenes.length > 0 || audios.length > 0;
  const body = {
    prompt: text || (imagenes.length ? "(imagen adjunta)" : audios.length ? "(nota de voz)" : "")
  };
  if (input.iconversacion) body.iconversacion = input.iconversacion;
  if (imagenes.length) body.imagenes = imagenes;
  if (audios.length) body.audios = audios;
  if (input.mode && String(input.mode).trim().toLowerCase() !== "patyia") {
    body.mode = String(input.mode).trim().toLowerCase();
  }
  const provider = String(input.provider || "").trim().toLowerCase();
  if (provider && provider !== "openai") {
    body.provider = provider;
  }
  if (!String(body.prompt || "").trim() && hasMedia) {
    body.prompt = imagenes.length ? "(imagen adjunta)" : "(nota de voz)";
  }
  return body;
}
function formatConversacionPostBodyPreview(body, { maxUrl = 80 } = {}) {
  const clone = JSON.parse(JSON.stringify(body));
  const summarize = (u, label, i) => {
    const s = String(u ?? "");
    if (s.length <= maxUrl + 24) return s;
    if (s.startsWith("data:") || s.startsWith("http")) {
      const mime = s.startsWith("data:") ? s.slice(5, s.indexOf(";")) || "?" : "url";
      return `${s.slice(0, maxUrl)}\u2026 [${mime}, ${s.length.toLocaleString("es-CO")} chars, ${label} ${i + 1}]`;
    }
    return `${s.slice(0, maxUrl)}\u2026`;
  };
  const summarizeItem = (item, label, i) => {
    if (item && typeof item === "object") {
      const o = item;
      return { ...o, url: summarize(o.url, label, i) };
    }
    return summarize(item, label, i);
  };
  if (Array.isArray(clone.imagenes)) clone.imagenes = clone.imagenes.map((img, i) => summarizeItem(img, "img", i));
  if (Array.isArray(clone.audios)) clone.audios = clone.audios.map((a, i) => summarizeItem(a, "audio", i));
  return JSON.stringify(clone, null, 2);
}
async function sendConversacionStream(jwt, input, onDelta) {
  const body = buildConversacionPostBody(input);
  const base = resolveIssApiBase();
  const res = await fetch(`${base}/conversacion`, {
    method: "POST",
    headers: authHeaders2(jwt, {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    }),
    body: JSON.stringify(body)
  });
  let streamingText = "";
  const finalPayload = await readPatyiaSseStream(res, (ev) => {
    if (ev.event === "begin") {
      onDelta("", ev.data);
      return;
    }
    if ((ev.event === "message" || ev.event === "end") && typeof ev.data.respuesta === "string") {
      streamingText = ev.data.respuesta;
      onDelta(streamingText, ev.data);
    }
    if (ev.event === "error") {
      throw new Error(String(ev.data.respuesta || ev.data.error || "Error en stream"));
    }
  });
  return {
    ...finalPayload,
    respuesta: streamingText || String(finalPayload.respuesta || "")
  };
}
var init_patyiaChatApi = __esm({
  "src/js/api/patyiaChatApi.ts"() {
    init_issListFilter();
    init_patyiaTokens();
    init_patyia();
  }
});

// src/js/tools/permAccessFromMap.js
function normalizePath(path) {
  let p = String(path ?? "").trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
  }
  if (!p.startsWith("/")) p = `/${p}`;
  return p.replace(/\/+$/, "") || "/";
}
function patternMatch(pattern, key) {
  if (pattern === key) return true;
  if (!pattern.includes("{") && !pattern.includes("*")) return false;
  const escLit = (s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const reBody = pattern.split(/(\{[^}]+\})/).map((seg) => /^\{[^}]+\}$/.test(seg) ? ".+" : seg.split("*").map(escLit).join("[^/]+")).join("");
  return new RegExp(`^${reBody}$`).test(key);
}
function resolveAccess(perms, method, path) {
  const map = perms && typeof perms === "object" ? perms : {};
  const key = `${String(method ?? "GET").toUpperCase()}:${normalizePath(path)}`;
  if (key in map) return map[key];
  let bestPat = "";
  let best = null;
  for (const [pat, restr] of Object.entries(map)) {
    if (!String(pat).includes(":")) continue;
    if (!patternMatch(pat, key)) continue;
    if (pat.length >= bestPat.length) {
      bestPat = pat;
      best = restr;
    }
  }
  return best;
}
function hasAccess(perms, method, path) {
  return resolveAccess(perms, method, path) != null && resolveAccess(perms, method, path) !== false;
}
function canAccessOthers(perms, method, path) {
  const r = resolveAccess(perms, method, path);
  if (r == null || r === false) return false;
  if (r === true) return true;
  if (typeof r === "object") {
    const f = r.filter;
    return !(f && typeof f === "object" && !Array.isArray(f) && Object.keys(f).length);
  }
  return false;
}
function capsFromPermisosEfectivos(perms) {
  const p = perms ?? {};
  const manage = hasAccess(p, "PUT", API_PERMISOS) || hasAccess(p, "DELETE", API_PERMISOS);
  const assign = hasAccess(p, "PUT", API_ROLES);
  return {
    canEditOpenAiConfig: hasAccess(p, "PUT", "/api/system/openai"),
    canEditSwagger: hasAccess(p, "PUT", "/api/system/swagger.json"),
    canEditInstrucciones: hasAccess(p, "PUT", "/api/system/instrucciones"),
    canEditPromptsOperativos: hasAccess(p, "PUT", "/api/system/prompts-operativos"),
    canEditConversacionConfig: hasAccess(p, "PUT", "/api/system/config/conversacion"),
    canOverrideSampling: canAccessOthers(p, "POST", "/api/conversacion"),
    canManagePermissions: manage,
    canAssignUserRoles: assign,
    canEditRoleDescriptions: manage,
    canAccessOthers: canAccessOthers(p, "QUERY", "/api/conversaciones"),
    canViewKanban: hasAccess(p, "GET", "/api/permisos/usuarios") || hasAccess(p, "GET", API_PERMISOS),
    canEditKanbanCards: assign || hasAccess(p, "POST", "/api/system/permisos/usuarios"),
    canViewLogs: hasAccess(p, "GET", "/api/conversacion/logs/{id}") || hasAccess(p, "GET", "/api/conversacion/logs/*"),
    canViewPrompts: hasAccess(p, "GET", "/api/system/instrucciones"),
    canViewChat: hasAccess(p, "POST", "/api/conversacion") || hasAccess(p, "POST", "/api/mensaje") || hasAccess(p, "QUERY", "/api/conversaciones"),
    canViewConfig: hasAccess(p, "GET", "/api/system/openai") || hasAccess(p, "GET", "/api/system/prompts-operativos") || hasAccess(p, "GET", "/api/system/instrucciones") || hasAccess(p, "GET", "/api/system/config/conversacion") || hasAccess(p, "GET", "/api/system/swagger.json") || hasAccess(p, "GET", API_PERMISOS),
    canSendChat: hasAccess(p, "POST", "/api/conversacion") && hasAccess(p, "POST", "/api/mensaje")
  };
}
var API_PERMISOS, API_ROLES;
var init_permAccessFromMap = __esm({
  "src/js/tools/permAccessFromMap.js"() {
    API_PERMISOS = "/api/system/permisos";
    API_ROLES = "/api/system/permisos/usuarios/*/roles";
  }
});

// src/js/api/systemConfigApi.ts
function systemApiBase() {
  return resolveIssApiBase();
}
function humanizeIssAuthMessage(msg) {
  const m = String(msg ?? "").trim();
  if (!m) return m;
  if (!CONTAPYME_NOAUTH_RX.test(m)) return m;
  return "El servidor rechaz\xF3 la operaci\xF3n (permiso SEG, JWT o cabecera inv\xE1lida), no falta el header Authorization. Si est\xE1s en Producci\xF3n: el bypass del front solo abre la UI; el ISS de prod debe permitir PUT (SEG o permsOpen). No env\xEDes X-Patyia-Auth-Mode=w (rompe auth ContaPyme en prod).";
}
function systemApiHeaders(extra = {}) {
  const h = {
    Accept: "application/json",
    ...extra
  };
  const paty = loadPatyJwt();
  if (paty?.token && !isPatyJwtExpired(paty.token)) {
    h.Authorization = `Bearer ${paty.token}`;
    if (Session.isLoggedIn()) {
      const app = { ...Session.appHeader() };
      for (const k of Object.keys(app)) {
        if (/^authorization$/i.test(k)) delete app[k];
      }
      Object.assign(h, app);
    }
  } else if (Session.isLoggedIn()) {
    Object.assign(h, Session.authHeader(), Session.appHeader());
  }
  return h;
}
function unwrapBody2(data) {
  const d = data;
  const enc = d?.encabezado;
  if (enc && typeof enc === "object" && !Array.isArray(enc) && enc.resultado === false) {
    const e = enc;
    const msg = String(e.mensaje ?? e.imensaje ?? "").trim();
    throw new Error(humanizeIssAuthMessage(msg) || "Error en la respuesta del servidor");
  }
  let inner = d;
  if (d?.respuesta && typeof d.respuesta === "object" && !Array.isArray(d.respuesta)) {
    inner = d.respuesta;
  } else if (d?.body && typeof d.body === "object" && !Array.isArray(d.body)) {
    inner = d.body;
  }
  const nested = inner;
  if (nested?.respuesta && typeof nested.respuesta === "object" && !Array.isArray(nested.respuesta)) {
    inner = nested.respuesta;
  }
  return inner;
}
function permissionsMeSessionKey() {
  if (!Session.isLoggedIn()) return "anon";
  const tok = Session?.current?.()?.token;
  const user = Session.username?.() || Session?.current?.()?.username;
  return String(tok || user || "anon").trim();
}
async function fetchPermissionsMe(opts) {
  if (!Session.isLoggedIn() && !loadPatyJwt()?.token) return null;
  const headers = systemApiHeaders();
  if (!headers.Authorization && !headers.authorization) {
    return null;
  }
  const sessionKey = permissionsMeSessionKey();
  if (!opts?.force && PERMISSIONS_ME_CACHE.value && PERMISSIONS_ME_CACHE.key === sessionKey && Date.now() - PERMISSIONS_ME_CACHE.iat < PERMISSIONS_ME_CACHE.ttlMs) {
    return PERMISSIONS_ME_CACHE.value;
  }
  if (!opts?.force && PERMISSIONS_ME_INFLIGHT) return PERMISSIONS_ME_INFLIGHT;
  const f = opts?.fetchImpl ?? fetch;
  const req = (async () => {
    const hit = async (base) => {
      const res = await f(`${base.replace(/\/+$/, "")}/permissions/me`, {
        method: "GET",
        headers: { ...headers, Accept: "application/json" },
        credentials: "omit"
      });
      if (res.status === 401) return { status: 401, data: null };
      if (!res.ok) return { status: res.status, data: null };
      const data = unwrapBody2(await res.json());
      if (!data || data.kind !== "insoft.permissions-me") return { status: res.status, data: null };
      return { status: res.status, data };
    };
    let got = await hit(systemApiBase());
    if (isLocalMode()) {
      try {
        const stg = await hit(PATYIA_ISS_STAGING_API);
        if (stg.data) {
          console.warn("[seg-front] permissions/me v\xEDa staging");
          got = stg;
        }
      } catch {
      }
    }
    if (got.status === 401) {
      PERMISSIONS_ME_CACHE.value = null;
      return null;
    }
    if (!got.data) return PERMISSIONS_ME_CACHE.value;
    PERMISSIONS_ME_CACHE.value = got.data;
    PERMISSIONS_ME_CACHE.iat = got.data.iat || Date.now();
    PERMISSIONS_ME_CACHE.ttlMs = got.data.ttlMs || 8 * 60 * 60 * 1e3;
    PERMISSIONS_ME_CACHE.key = sessionKey;
    return got.data;
  })().finally(() => {
    if (PERMISSIONS_ME_INFLIGHT === req) PERMISSIONS_ME_INFLIGHT = null;
  });
  PERMISSIONS_ME_INFLIGHT = req;
  return req;
}
function clearPermissionsMeCache() {
  PERMISSIONS_ME_CACHE.value = null;
  PERMISSIONS_ME_CACHE.iat = 0;
  PERMISSIONS_ME_CACHE.ttlMs = 0;
  PERMISSIONS_ME_CACHE.key = "";
}
function invalidatePermisosCache() {
  PERMISOS_LIST_CACHE.clear();
  PERMISOS_LIST_INFLIGHT.clear();
  clearPermissionsMeCache();
}
var CONTAPYME_NOAUTH_RX, PERMISSIONS_ME_CACHE, PERMISSIONS_ME_INFLIGHT, PERMISOS_LIST_CACHE, PERMISOS_LIST_INFLIGHT;
var init_systemConfigApi = __esm({
  "src/js/api/systemConfigApi.ts"() {
    init_platform();
    init_patyia();
    init_patyia_jwt();
    init_permAccessFromMap();
    CONTAPYME_NOAUTH_RX = /par[aá]metro de autenticaci[oó]n|enviando el header.*authorization/i;
    PERMISSIONS_ME_CACHE = { value: null, iat: 0, ttlMs: 0, key: "" };
    PERMISSIONS_ME_INFLIGHT = null;
    PERMISOS_LIST_CACHE = /* @__PURE__ */ new Map();
    PERMISOS_LIST_INFLIGHT = /* @__PURE__ */ new Map();
  }
});

// src/js/tools/roleCanonicalMeta.js
function canonicalRoleMeta(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  return CANONICAL_ROLE_META[key] ?? null;
}
var CANONICAL_ROLE_META;
var init_roleCanonicalMeta = __esm({
  "src/js/tools/roleCanonicalMeta.js"() {
    CANONICAL_ROLE_META = {
      AUDITOR: {
        namedisplay: "Auditor",
        descripcion: "Ve conversaciones de todos; chatea solo en las propias"
      },
      ADMN: {
        namedisplay: "Admn ISA-Paty",
        descripcion: "Administraci\xF3n PatyIA \u2014 sin acceso total de desarrollo"
      },
      DEVISS: {
        namedisplay: "Dev Lead ISS",
        descripcion: "L\xEDder de desarrollo \u2014 acceso total"
      },
      USR: {
        namedisplay: "Usuario",
        descripcion: "Acceso b\xE1sico de sesi\xF3n"
      }
    };
  }
});

// src/js/core/viewAsRole.ts
function roleKey(name) {
  return String(name ?? "").trim().toUpperCase();
}
function isDevBranchRole(roleName) {
  return roleKey(roleName) === "DEVISS";
}
function readViewAsRole() {
  try {
    const v = roleKey(localStorage.getItem(VIEW_AS_ROLE_LS_KEY));
    if (!v || v === "DEVISS") return "";
    if (!ROLE_CAPS_PRESETS[v]) return "";
    return v;
  } catch {
    return "";
  }
}
function writeViewAsRole(roleName) {
  const key = roleKey(roleName);
  try {
    if (!key || key === "DEVISS" || !ROLE_CAPS_PRESETS[key]) {
      localStorage.removeItem(VIEW_AS_ROLE_LS_KEY);
    } else {
      localStorage.setItem(VIEW_AS_ROLE_LS_KEY, key);
    }
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent(VIEW_AS_ROLE_EVENT, { detail: { role: readViewAsRole() } }));
    window.dispatchEvent(new Event("patyia-apptools:caps-changed"));
  } catch {
  }
}
function clearViewAsRole() {
  writeViewAsRole("");
}
function capsForViewAsRole(roleName) {
  const key = roleKey(roleName);
  const preset = ROLE_CAPS_PRESETS[key];
  return preset ? { ...preset } : null;
}
function realRolesAllowViewAs(roles) {
  return (roles ?? []).some((r) => isDevBranchRole(r));
}
function clampViewAsCapsToReal(preset, realCaps) {
  const out = {};
  const real = realCaps && typeof realCaps === "object" ? realCaps : {};
  for (const [k, v] of Object.entries(preset ?? {})) {
    if (typeof v !== "boolean") continue;
    out[k] = v === true && real[k] === true;
  }
  return out;
}
var VIEW_AS_ROLE_LS_KEY, VIEW_AS_ROLE_EVENT, NONE, ROLE_CAPS_PRESETS;
var init_viewAsRole = __esm({
  "src/js/core/viewAsRole.ts"() {
    init_roleCanonicalMeta();
    VIEW_AS_ROLE_LS_KEY = "isa-patyia:view-as-role";
    VIEW_AS_ROLE_EVENT = "patyia-apptools:view-as-role";
    NONE = Object.freeze({
      canEditInstrucciones: false,
      canEditOpenAiConfig: false,
      canEditPromptsOperativos: false,
      canEditConversacionConfig: false,
      canEditSwagger: false,
      canOverrideSampling: false,
      canManagePermissions: false,
      canAssignUserRoles: false,
      canAccessOthers: false,
      canViewKanban: false,
      canEditKanbanCards: false,
      canViewLogs: true,
      canViewPrompts: false,
      canViewChat: true,
      canViewConfig: false,
      canSendChat: true
    });
    ROLE_CAPS_PRESETS = Object.freeze({
      USR: { ...NONE },
      AUDITOR: {
        ...NONE,
        canViewPrompts: true,
        canViewConfig: true,
        canAccessOthers: true,
        canViewKanban: true
      },
      ADMN: {
        ...NONE,
        canViewPrompts: true,
        canViewConfig: true,
        canEditOpenAiConfig: true,
        canEditConversacionConfig: true,
        canEditInstrucciones: true,
        canAssignUserRoles: true,
        canAccessOthers: true,
        canViewKanban: true,
        canEditKanbanCards: true
      },
      DEVISS: {
        canEditInstrucciones: true,
        canEditOpenAiConfig: true,
        canEditPromptsOperativos: true,
        canEditConversacionConfig: true,
        canEditSwagger: true,
        canOverrideSampling: true,
        canManagePermissions: true,
        canAssignUserRoles: true,
        canAccessOthers: true,
        canViewKanban: true,
        canEditKanbanCards: true,
        canViewLogs: true,
        canViewPrompts: true,
        canViewChat: true,
        canViewConfig: true,
        canSendChat: true
      }
    });
  }
});

// src/js/api/sessionApi.ts
function formatRoleTitle(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  if (!key) return "";
  if (key === "USR") return "Usuario";
  if (key === "ADMN") return "Admn";
  if (key === "DEVISS") return "Dev ISS";
  if (key === "AUDITOR") return "Auditor";
  return key;
}
function roleLabel(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  if (!key) return "";
  const canon = canonicalRoleMeta(key);
  if (canon?.namedisplay) return canon.namedisplay;
  return formatRoleTitle(key);
}
function pickPrimaryIssRole(roles) {
  const list = (roles ?? []).map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean);
  if (!list.length) return "";
  const elevated = list.filter((r) => r !== "USR");
  const pool = elevated.length ? elevated : list;
  pool.sort((a, b) => {
    const ia = ROLE_PRIORITY.indexOf(a);
    const ib = ROLE_PRIORITY.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return pool[0];
}
function resolvePrimaryIssRoleId() {
  if (!Session.isLoggedIn()) return "";
  const key = sessionCacheKey();
  if (key === ME_CAPS_KEY && ME_ISS_ROLES.length) return pickPrimaryIssRole(ME_ISS_ROLES);
  if (key === ME_CAPS_KEY && ME_LOGIN_ROLE) return String(ME_LOGIN_ROLE).trim().toUpperCase();
  const sl = Session.current()?.role;
  return sl ? String(sl).trim().toUpperCase() : "";
}
function forcePermsOpen() {
  return getIssTarget() === "production";
}
function capsFromPermissionsMe(me) {
  if (!me) return null;
  const map = me.permisosEfectivos ?? me.permisos;
  const fromMap = map && typeof map === "object" ? capsFromPermisosEfectivos(map) : null;
  const fromCaps = me.capabilities && typeof me.capabilities === "object" ? me.capabilities : null;
  if (!fromMap && !fromCaps) return null;
  const out = {};
  for (const k of ME_CAP_KEYS) {
    out[k] = !!(fromMap?.[k] || fromCaps?.[k]);
  }
  return out;
}
function sessionCacheKey() {
  if (!Session.isLoggedIn()) return "";
  const tok = Session?.current?.()?.token;
  const user = Session.username?.() || Session?.current?.()?.username;
  return String(tok || user || "").trim();
}
function localMeCaps() {
  if (!Session.isLoggedIn()) return {};
  const key = sessionCacheKey();
  const hydrated = key === ME_CAPS_KEY ? ME_CAPS : {};
  const real = forcePermsOpen() ? { ...hydrated, ...OPEN_ME_CAPS } : hydrated;
  const viewAs = readViewAsRole();
  if (viewAs && canViewAsRole()) {
    const preset = capsForViewAsRole(viewAs);
    if (preset) {
      if (Object.keys(real).length) return clampViewAsCapsToReal(preset, real);
      return clampViewAsCapsToReal(preset, {});
    }
  }
  return real;
}
async function primeMeCaps(force = false) {
  if (!Session.isLoggedIn()) return;
  if (ME_CAPS_INFLIGHT) return ME_CAPS_INFLIGHT;
  const now = Date.now();
  if (now - ME_CAPS_BOOTSTRAP_TS < ME_CAPS_REENTRY_GUARD_MS) return;
  if (!force && now - ME_CAPS_BOOTSTRAP_TS < ME_CAPS_FETCH_GUARD_MS) return;
  ME_CAPS_INFLIGHT = (async () => {
    let ok = false;
    try {
      const me = await fetchPermissionsMe();
      const caps = capsFromPermissionsMe(me);
      if (caps) {
        ME_CAPS_KEY = sessionCacheKey();
        ME_ISS_ROLES = Array.isArray(me?.roles) ? me.roles.map((r) => String(r ?? "").trim()).filter(Boolean) : [];
        ME_LOGIN_ROLE = String(me?.loginRole ?? "").trim();
        ME_CAPS = caps;
        ME_CAPS_BOOTSTRAP_TS = Date.now();
        ok = true;
        if (readViewAsRole() && !realRolesAllowViewAs(ME_ISS_ROLES)) clearViewAsRole();
        window.dispatchEvent(new Event("patyia-apptools:caps-changed"));
      }
    } catch {
    }
    if (!ok && !ME_CAPS_RETRY_TIMER && Session.isLoggedIn()) {
      ME_CAPS_RETRY_TIMER = setTimeout(() => {
        ME_CAPS_RETRY_TIMER = null;
        void primeMeCaps(true);
      }, 4e3);
    }
  })().finally(() => {
    ME_CAPS_INFLIGHT = null;
  });
  return ME_CAPS_INFLIGHT;
}
function clearMeCaps() {
  ME_CAPS = {};
  ME_CAPS_KEY = "";
  ME_ISS_ROLES = [];
  ME_LOGIN_ROLE = "";
  ME_CAPS_BOOTSTRAP_TS = 0;
  ME_SERVER_INSTRUCCIONES_EDIT = null;
  if (ME_CAPS_RETRY_TIMER) {
    clearTimeout(ME_CAPS_RETRY_TIMER);
    ME_CAPS_RETRY_TIMER = null;
  }
}
function notifyAuth() {
  window.dispatchEvent(new Event(Session.EVENT));
  window.dispatchEvent(new Event("patyia-apptools:auth"));
  window.dispatchEvent(new Event("isa-patyia:auth"));
}
function canAccessOthers2() {
  if (forcePermsOpen() && !isViewingAsRole()) return true;
  if (localMeCaps().canAccessOthers) return true;
  if (roleLooksLikeElevatedEdit(Session.current?.()?.role)) return true;
  try {
    if (roleLooksLikeElevatedEdit(window.ISA?.AppSession?.resolveDisplayRole?.())) return true;
  } catch {
  }
  if (ME_ISS_ROLES.some((r) => roleLooksLikeElevatedEdit(r))) return true;
  return false;
}
async function login(user, pass, opts) {
  const session = await Session.login(user, pass, opts);
  notifyAuth();
  void primeMeCaps(true);
  return session;
}
function logout() {
  Session.logout();
  clearMeCaps();
  invalidatePermisosCache();
  clearViewAsRole();
  notifyAuth();
}
function roleLooksLikeDevBranch(raw) {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return false;
  if (isDevBranchRole(s)) return true;
  return s === "DEVISS" || /\bDEV\s*ISS\b/.test(s);
}
function roleLooksLikeElevatedEdit(raw) {
  if (roleLooksLikeDevBranch(raw)) return true;
  const s = String(raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return s === "DEV_LEAD" || s === "DEVLEAD" || s.endsWith("_DEV_LEAD");
}
function canViewAsRole() {
  if (!Session.isLoggedIn()) return false;
  const key = sessionCacheKey();
  if (key === ME_CAPS_KEY && realRolesAllowViewAs(ME_ISS_ROLES)) return true;
  if (ME_ISS_ROLES.length && realRolesAllowViewAs(ME_ISS_ROLES)) return true;
  if (roleLooksLikeDevBranch(Session.current?.()?.role)) return true;
  try {
    if (roleLooksLikeDevBranch(window.ISA?.AppSession?.resolveDisplayRole?.())) return true;
  } catch {
  }
  return false;
}
function getViewAsRole() {
  if (!canViewAsRole() && !readViewAsRole()) return "";
  return readViewAsRole();
}
function isViewingAsRole() {
  return !!(readViewAsRole() && canViewAsRole());
}
function setViewAsRole(roleName) {
  if (!roleName) {
    clearViewAsRole();
    return;
  }
  if (!canViewAsRole()) return;
  writeViewAsRole(roleName);
}
function stopViewAsRole() {
  clearViewAsRole();
}
function resolveDisplayRole() {
  if (!Session.isLoggedIn()) return "";
  const key = sessionCacheKey();
  if (key === ME_CAPS_KEY && ME_ISS_ROLES.length) {
    return roleLabel(pickPrimaryIssRole(ME_ISS_ROLES));
  }
  if (key === ME_CAPS_KEY && ME_LOGIN_ROLE) {
    return roleLabel(ME_LOGIN_ROLE);
  }
  const sl = Session.current()?.role;
  return sl ? roleLabel(sl) : "";
}
function getSession() {
  const s = Session.current();
  if (!s) return null;
  return {
    username: Session.username(),
    realUsername: Session.realUsername(),
    role: resolveDisplayRole(),
    expiresAt: s.expiresAt,
    sessionToken: s.token,
    app: Session.appId(),
    capabilities: Session.capabilities()
  };
}
var ROLE_PRIORITY, OPEN_ME_CAPS, ME_CAP_KEYS, ME_CAPS, ME_CAPS_KEY, ME_ISS_ROLES, ME_LOGIN_ROLE, ME_CAPS_BOOTSTRAP_TS, ME_CAPS_INFLIGHT, ME_CAPS_RETRY_TIMER, ME_SERVER_INSTRUCCIONES_EDIT, ME_CAPS_FETCH_GUARD_MS, ME_CAPS_REENTRY_GUARD_MS, isLoggedIn, can, blockReason, clearSession;
var init_sessionApi = __esm({
  "src/js/api/sessionApi.ts"() {
    init_platform();
    init_platform();
    init_patyia();
    init_systemConfigApi();
    init_permAccessFromMap();
    init_roleCanonicalMeta();
    init_viewAsRole();
    ROLE_PRIORITY = ["DEVISS", "ADMN", "AUDITOR", "USR"];
    OPEN_ME_CAPS = {
      canEditInstrucciones: true,
      canEditOpenAiConfig: true,
      canEditPromptsOperativos: true,
      canEditConversacionConfig: true,
      canEditSwagger: true,
      canOverrideSampling: true,
      canManagePermissions: true,
      canAssignUserRoles: true,
      canAccessOthers: true,
      canViewKanban: true,
      canEditKanbanCards: true,
      canViewLogs: true,
      canViewPrompts: true,
      canViewChat: true,
      canViewConfig: true,
      canSendChat: true
    };
    ME_CAP_KEYS = Object.keys(OPEN_ME_CAPS);
    ME_CAPS = {};
    ME_CAPS_KEY = "";
    ME_ISS_ROLES = [];
    ME_LOGIN_ROLE = "";
    ME_CAPS_BOOTSTRAP_TS = 0;
    ME_CAPS_INFLIGHT = null;
    ME_CAPS_RETRY_TIMER = null;
    ME_SERVER_INSTRUCCIONES_EDIT = null;
    ME_CAPS_FETCH_GUARD_MS = 5e3;
    ME_CAPS_REENTRY_GUARD_MS = 1500;
    isLoggedIn = () => Session.isLoggedIn();
    can = (cap) => Session.can(cap);
    blockReason = (cap) => Session.blockReason(cap);
    clearSession = logout;
    (window.ISA = window.ISA || {}).AppSession = {
      current: () => Session.current(),
      isLoggedIn,
      username: () => Session.username(),
      capabilities: () => Session.capabilities(),
      can,
      blockReason,
      login,
      logout,
      refreshProfile: () => Session.refreshProfile(),
      clearSession,
      getSession,
      resolveDisplayRole,
      canViewAsRole,
      getViewAsRole,
      isViewingAsRole,
      setViewAsRole,
      stopViewAsRole,
      resolvePrimaryIssRoleId
    };
  }
});

// src/js/api/apiClient.ts
function unwrapIssEnvelope(raw) {
  const d = raw;
  const enc = d?.encabezado;
  if (enc && typeof enc === "object" && !Array.isArray(enc) && enc.resultado === false) {
    const e = enc;
    const msg = String(e.mensaje ?? e.imensaje ?? "").trim();
    throw new Error(msg || "Error en la respuesta del servidor");
  }
  if (d?.respuesta && typeof d.respuesta === "object" && !Array.isArray(d.respuesta)) {
    return d.respuesta;
  }
  if (d?.body && typeof d.body === "object" && !Array.isArray(d.body)) {
    return d.body;
  }
  return d;
}
function patyiaIssPath(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p;
}
function isConvNotFound(err) {
  const status = err && typeof err === "object" ? Number(err.status) : 0;
  if (status === 404) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /not found|no encontrad|\b404\b/i.test(msg);
}
function isConvForbidden(err) {
  const status = err && typeof err === "object" ? Number(err.status) : 0;
  if (status === 401 || status === 403) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /sin permiso|no tienes permiso|no autorizad|forbidden|\b403\b|\b401\b/i.test(msg);
}
async function fetchConvLogForQa(id) {
  const convId = Number(id);
  if (!Number.isInteger(convId) || convId <= 0) throw new Error("iconversacion inv\xE1lido");
  const jwt = loadPatyJwt();
  if (jwt?.token && !isPatyJwtExpired(jwt.token)) {
    try {
      const detail = await getConversacionLogs(jwt, convId);
      const log = convLogFromDetalle(detail, convId);
      if (log?.mensajes?.length) return log;
      throw new Error(`Log conv-${convId} sin mensajes`);
    } catch (e) {
      if (isConvForbidden(e) || !isConvNotFound(e)) throw e;
    }
  }
  return fetchConvLogById(convId);
}
async function fetchConvLogById(id) {
  const convId = Number(id);
  if (!Number.isInteger(convId) || convId <= 0) throw new Error("iconversacion inv\xE1lido");
  const paths = [
    patyiaIssPath(`/conversacion/${convId}/log`),
    patyiaIssPath(`/conversacion/logs/${convId}`)
  ];
  let routeMiss = null;
  for (const path of paths) {
    try {
      const data = await capFetch(path, { method: "GET" });
      const log = data.convLog ?? data.log ?? data.body?.convLog ?? data.body?.log;
      if (!log || !Array.isArray(log.mensajes)) {
        throw new Error(String(data.error || `Log conv-${convId} no encontrado`));
      }
      log.iconversacion = log.iconversacion || convId;
      return log;
    } catch (e) {
      const err = e;
      const detail = err.data?.error?.trim();
      if (detail) throw new Error(detail);
      if (err.status === 404 && !detail) {
        routeMiss = err;
        continue;
      }
      throw e;
    }
  }
  throw routeMiss ?? new Error(`Log conv-${convId} no encontrado`);
}
async function fetchConvLogByIdWithRetry(id, { minMensajes = 0, attempts = 8, delayMs = 300, qa = false } = {}) {
  const load = qa ? fetchConvLogForQa : fetchConvLogById;
  let last = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const log = await load(id);
      last = log;
      const n = Array.isArray(log.mensajes) ? log.mensajes.length : 0;
      if (!minMensajes || n >= minMensajes) return log;
    } catch (e) {
      if (i === attempts - 1 && !last) throw e;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }
  return last;
}
function formatIssClientError(err, fallback = "Error del servidor") {
  const data = err && typeof err === "object" ? err.data : void 0;
  const enc = data && typeof data === "object" && !Array.isArray(data) ? data.encabezado : void 0;
  const envelopeMsg = enc && typeof enc === "object" ? String(enc.mensaje ?? enc.imensaje ?? "").trim() : "";
  const raw = envelopeMsg || (err instanceof Error ? err.message : String(err ?? ""));
  const msg = raw.trim();
  if (!msg) return fallback;
  if (/failed to fetch|networkerror|load failed|econnrefused|network request failed/i.test(msg)) {
    return "Sin conexi\xF3n con el ISS. Si usas Local, arranca el servidor en :8802.";
  }
  if (/invalid signature|jwt malformed|jwt expired|token.*expir/i.test(msg)) {
    return `Auth ISS: ${msg}. En Local el front usa system-login (modo w); revisa PATYIA_AUTH_MODE=w o vuelve a iniciar sesi\xF3n.`;
  }
  if (/^internal server error$/i.test(msg) || /\b500\b/.test(msg) && /internal server error/i.test(msg)) {
    return "Error interno del ISS (HTTP 500). Revisa logs del Functions host o el detalle del envelope.";
  }
  if (/^unauthorized$/i.test(msg) || /\b401\b/.test(msg)) {
    return "Sesi\xF3n no autorizada (401). Vuelve a iniciar sesi\xF3n.";
  }
  if (/^forbidden$/i.test(msg) || /\b403\b/.test(msg)) {
    return "Sin permiso para auditar terceros (403).";
  }
  if (/^not found$/i.test(msg) || /\b404\b/.test(msg)) {
    return "Endpoint no encontrado (404). \xBFISS desactualizado o ruta incorrecta?";
  }
  return msg;
}
async function fetchTercerosAudit(input = {}) {
  const body = tercerosAuditListBody({
    page: input.page,
    limit: input.limit ?? 20,
    q: input.q,
    jwtTercero: input.jwtTercero,
    jwtContacto: input.jwtContacto,
    jwtNombre: input.jwtNombre
  });
  let raw;
  try {
    raw = await capFetch(patyiaIssPath("/auditoria/terceros"), {
      method: "QUERY",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err) {
    if (isLocalMode() && input.jwtToken) {
      try {
        return await fetchTercerosAuditFromLocalConversaciones(input);
      } catch (fallbackErr) {
        throw new Error(formatIssClientError(fallbackErr, formatIssClientError(err)));
      }
    }
    throw new Error(formatIssClientError(err));
  }
  try {
    const data = unwrapIssEnvelope(raw);
    if (data.ok === false) throw new Error(String(data.error || "No se pudo cargar terceros"));
    return {
      ok: true,
      rows: Array.isArray(data.rows) ? data.rows : [],
      total: Number(data.total ?? 0) || 0,
      page: Number(data.page ?? input.page ?? 1) || 1,
      limit: Number(data.limit ?? input.limit ?? 20) || 20,
      pages: Number(data.pages ?? 0) || 0
    };
  } catch (err) {
    throw new Error(formatIssClientError(err));
  }
}
async function fetchTercerosAuditFromLocalConversaciones(input) {
  const limit = input.limit ?? 20;
  const groups = /* @__PURE__ */ new Map();
  for (let page2 = 1; page2 <= 5; page2 += 1) {
    const res = await fetch(`${PATYIA_ISS_LOCAL_API.replace(/\/$/, "")}/conversaciones`, {
      method: "QUERY",
      headers: { Authorization: `Bearer ${input.jwtToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(conversacionesListBody({ page: page2, limit: 100, sort: "-iconversacion" }))
    });
    if (!res.ok) throw new Error(`No se pudo cargar auditor\xEDa local (${res.status})`);
    const raw = await res.json();
    const body = raw?.respuesta ?? raw?.body ?? raw;
    const conversaciones = Array.isArray(body?.conversaciones) ? body.conversaciones : [];
    for (const conv of conversaciones) {
      const itercero = String(conv.itercero ?? "").trim();
      const icontacto = String(conv.icontacto ?? "").trim();
      if (!itercero || !icontacto) continue;
      const key = `${itercero}|${icontacto}`;
      const prev = groups.get(key);
      const fh = String(conv.fhultact ?? conv.fhcre ?? "");
      const nombre = String(conv.nick_propietario ?? "").trim() || null;
      if (!prev) {
        groups.set(key, {
          itercero,
          icontacto,
          nombre,
          total_conversaciones: 1,
          total_mensajes: Number(conv.qmensajes ?? 0) || 0,
          ultima_actividad: fh || null,
          es_jwt: itercero === String(input.jwtTercero ?? "") && icontacto === String(input.jwtContacto ?? ""),
          es_sesion: false
        });
      } else {
        prev.total_conversaciones += 1;
        prev.total_mensajes += Number(conv.qmensajes ?? 0) || 0;
        if (fh && (!prev.ultima_actividad || new Date(fh) > new Date(prev.ultima_actividad))) prev.ultima_actividad = fh;
        if (!prev.nombre && nombre) prev.nombre = nombre;
      }
    }
    if (conversaciones.length < 100) break;
  }
  const q = String(input.q ?? "").trim().toLowerCase();
  const rows = [...groups.values()].filter((r) => !q || [r.nombre, r.itercero, r.icontacto].some((v) => String(v ?? "").toLowerCase().includes(q))).sort((a, b) => String(b.ultima_actividad ?? "").localeCompare(String(a.ultima_actividad ?? "")));
  const page = Math.max(1, Number(input.page ?? 1) || 1);
  const offset = (page - 1) * limit;
  return { ok: true, rows: rows.slice(offset, offset + limit), total: rows.length, page, limit, pages: Math.max(1, Math.ceil(rows.length / limit)) };
}
var bridgeHttp, capFetch, apiUrl, rowVal;
var init_apiClient = __esm({
  "src/js/api/apiClient.ts"() {
    init_platform();
    init_patyia();
    init_patyia_jwt();
    init_patyiaChatApi();
    init_issListFilter();
    init_sessionApi();
    init_systemConfigApi();
    bridgeHttp = window.ISAFront.createCapFetch({
      Session,
      Config,
      getApiBase: patyiaIssCapFetchBase,
      localDirect: [
        { test: (p) => isPatyiaApiPath(p) || String(p).startsWith("/patyia"), base: PATYIA_ISS_LOCAL.replace(/\/$/, "") }
      ],
      orchOnline: PATYIA_ISS_URL,
      orchOnlineInLocal: true,
      isLocal: isLocalMode
    });
    capFetch = bridgeHttp.capFetch;
    apiUrl = bridgeHttp.apiUrl;
    rowVal = bridgeHttp.rowVal;
  }
});

// src/js/core/patyia-jwt.ts
function samePatyUser(a, b) {
  const na = String(a ?? "").trim().toUpperCase();
  const nb = String(b ?? "").trim().toUpperCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const strip = (s) => s.replace(/@CONTAPYME\.COM$/i, "").replace(/@.*$/, "");
  return strip(na) === strip(nb);
}
function parseJwtExp(token) {
  try {
    const part = String(token || "").trim().split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(json);
    return typeof raw.exp === "number" ? raw.exp : null;
  } catch {
    return null;
  }
}
function isPatyJwtExpired(token, skewSec = 60) {
  const exp = parseJwtExp(token);
  if (!exp) return false;
  return Date.now() / 1e3 >= exp - skewSec;
}
function parseJwtClaims(token) {
  try {
    const part = String(token || "").trim().split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(json);
    return { itercero: raw.itercero != null ? String(raw.itercero) : void 0, icontacto: raw.icontacto != null ? String(raw.icontacto) : void 0, nombres: raw.nombres != null ? String(raw.nombres) : void 0, apellidos: raw.apellidos != null ? String(raw.apellidos) : void 0, controlkey: raw.controlkey != null ? String(raw.controlkey) : void 0, iapp: typeof raw.iapp === "number" ? raw.iapp : void 0, idmaquina: raw.idmaquina != null ? String(raw.idmaquina) : void 0 };
  } catch {
    return null;
  }
}
function jwtUserDisplayName(claims) {
  if (!claims) return "";
  return [claims.nombres, claims.apellidos].filter(Boolean).join(" ").trim();
}
function shortDisplayName(full) {
  const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  return `${parts[0]} ${parts[2]}`;
}
function jwtUserShortName(claims) {
  if (!claims) return "";
  const n = String(claims.nombres ?? "").trim().split(/\s+/).filter(Boolean)[0];
  const a = String(claims.apellidos ?? "").trim().split(/\s+/).filter(Boolean)[0];
  if (n && a) return `${n} ${a}`;
  if (n) return n;
  if (a) return a;
  return shortDisplayName(jwtUserDisplayName(claims));
}
function cachePatyJwt(rec) {
  const prevRaw = sessionStorage.getItem(PATYIA_JWT_STORAGE_KEY);
  let prev = null;
  try {
    prev = prevRaw ? JSON.parse(prevRaw) : null;
  } catch {
    prev = null;
  }
  sessionStorage.setItem(PATYIA_JWT_STORAGE_KEY, JSON.stringify(rec));
  const changed = !prev || prev.token !== rec.token || String(prev.savedBy ?? "").toUpperCase() !== String(rec.savedBy ?? "").toUpperCase();
  if (changed) window.dispatchEvent(new Event("isa-patyia:paty-jwt"));
  return rec;
}
function loadPatyJwt() {
  try {
    const raw = sessionStorage.getItem(PATYIA_JWT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || typeof parsed.token !== "string") return null;
    if (isPatyJwtExpired(parsed.token)) {
      sessionStorage.removeItem(PATYIA_JWT_STORAGE_KEY);
      return null;
    }
    parsed.claims = parseJwtClaims(parsed.token) || parsed.claims || {};
    return parsed;
  } catch {
    return null;
  }
}
function buildPatyJwtRecord(token, savedBy, expiresAt) {
  const claims = parseJwtClaims(token);
  if (!claims?.itercero) throw new Error("Token JWT inv\xE1lido o sin itercero");
  const exp = parseJwtExp(token);
  return { token: token.trim(), savedBy: String(savedBy || "").trim().toUpperCase(), savedAt: (/* @__PURE__ */ new Date()).toISOString(), expiresAt: expiresAt ?? (exp ? new Date(exp * 1e3).toISOString() : null), claims };
}
function syncPatyJwtFromSession() {
  if (!Session.isLoggedIn()) return null;
  const sess = Session.current();
  const token = String(sess?.token ?? "").trim();
  if (!token || isPatyJwtExpired(token)) return null;
  const claims = parseJwtClaims(token);
  if (!claims?.itercero) return null;
  const savedBy = String(sess?.username || Session.username() || "").trim().toUpperCase();
  if (!savedBy) return null;
  try {
    return cachePatyJwt(buildPatyJwtRecord(token, savedBy, sess?.expiresAt ?? null));
  } catch {
    return null;
  }
}
function savePatyJwt(token, savedBy, expiresAt) {
  return cachePatyJwt(buildPatyJwtRecord(token, savedBy, expiresAt));
}
async function savePatyJwtAsync(token, savedBy) {
  const saved = await savePortalJwt(token.trim(), PATYIA_PORTAL_ID);
  return cachePatyJwt(buildPatyJwtRecord(token, savedBy, saved.expiresAt));
}
function clearPatyJwtLocal(options) {
  const had = sessionStorage.getItem(PATYIA_JWT_STORAGE_KEY);
  sessionStorage.removeItem(PATYIA_JWT_STORAGE_KEY);
  if (!options?.silent && had) window.dispatchEvent(new Event("isa-patyia:paty-jwt"));
}
async function hydratePatyJwtFromServer(username) {
  const u = String(username || "").trim().toUpperCase();
  if (!u) {
    clearPatyJwtLocal({ silent: true });
    return null;
  }
  const cached = loadPatyJwt();
  if (cached?.actingAsUsername) return cached;
  if (cached && samePatyUser(cached.savedBy, u)) return cached;
  const fromSession = syncPatyJwtFromSession();
  if (fromSession && samePatyUser(fromSession.savedBy, u)) return fromSession;
  if (fromSession && !cached) return fromSession;
  if (cached && !samePatyUser(cached.savedBy, u) && !fromSession) {
    clearPatyJwtLocal({ silent: true });
  }
  try {
    const data = await fetchPortalJwt(PATYIA_PORTAL_ID);
    if (!data.token || isPatyJwtExpired(data.token)) {
      return loadPatyJwt() || syncPatyJwtFromSession();
    }
    return savePatyJwt(data.token, u, data.expiresAt ?? null);
  } catch (err) {
    console.warn("[paty-jwt] hydrate BD fall\xF3 (uso sesi\xF3n si hay):", err instanceof Error ? err.message : err);
    return loadPatyJwt() || syncPatyJwtFromSession();
  }
}
function canInteractPatyChat(sessionUser, jwt) {
  const u = String(sessionUser || "").trim().toUpperCase();
  if (!u || !jwt?.token) return false;
  if (samePatyUser(jwt.savedBy, u)) return true;
  if (!Session.can("patyia.chat.interact")) return false;
  if (jwt.actingAsUsername && Session.can("patyia.jwt.admin")) return true;
  return false;
}
function canAdminPortalJwt() {
  return Session.can("patyia.jwt.admin");
}
function convBelongsToJwt(conv, claims) {
  if (!claims?.itercero) return false;
  return String(conv.itercero ?? "") === String(claims.itercero) && String(conv.icontacto ?? "") === String(claims.icontacto ?? "");
}
function findAuditRowForSessionUser(rows, _sessionUser) {
  return rows.find((r) => r.es_sesion) ?? null;
}
function auditRowToBrowseScope(row) {
  return { itercero: row.itercero, icontacto: row.icontacto, nombre: row.nombre ? shortDisplayName(row.nombre) : null };
}
async function resolveSessionBrowseScope(sessionUser) {
  const u = String(sessionUser ?? "").trim();
  if (!u) return null;
  let page = 1;
  const limit = 100;
  while (page <= 5) {
    const audit = await fetchTercerosAudit({ page, limit, appUser: u });
    const match = findAuditRowForSessionUser(audit.rows, u);
    if (match) return auditRowToBrowseScope(match);
    if (page >= (audit.pages || 1)) break;
    page += 1;
  }
  return null;
}
function browseScopeKey(scope) {
  if (!scope?.itercero || !scope?.icontacto) return "";
  return `${scope.itercero}|${scope.icontacto}`;
}
var PATYIA_JWT_STORAGE_KEY, PATYIA_API_BASE;
var init_patyia_jwt = __esm({
  "src/js/core/patyia-jwt.ts"() {
    init_portalJwtApi();
    init_apiClient();
    init_platform();
    PATYIA_JWT_STORAGE_KEY = "isa-patyia:paty-jwt";
    PATYIA_API_BASE = "https://ayudascp-ia-staging.azurewebsites.net/api";
  }
});

// src/js/tools/ChatTool.jsx
init_platform();

// src/js/ui/shared.jsx
init_platform();

// src/js/core/msgDateFormat.ts
function parseMsgDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.abs(v) > 1e12 ? v : v * 1e3;
    const d2 = new Date(ms);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const ms = s.length >= 13 || n > 1e12 ? n : n * 1e3;
    const d2 = new Date(ms);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatMsgFecha(v) {
  const d = parseMsgDate(v);
  if (!d) {
    const raw = String(v ?? "").trim();
    return { label: raw ? raw.slice(0, 40) : "", iso: "" };
  }
  const datePart = d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const tenth = Math.floor(d.getMilliseconds() / 100);
  const timeParts = new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).formatToParts(d);
  let timePart = "";
  for (const p of timeParts) {
    timePart += p.value;
    if (p.type === "second") timePart += `.${tenth}`;
  }
  return { label: `${datePart}, ${timePart}`, iso: d.toISOString() };
}
function formatTs(v) {
  return formatMsgFecha(v).label;
}

// src/js/core/convLog.ts
var STREAM_ERROR_LABELS = {
  stream_incomplete_or_error: "La respuesta del modelo no se complet\xF3. Vuelve a intentar o reduce el tama\xF1o de las im\xE1genes.",
  stream_failed: "El stream de respuesta fall\xF3. Vuelve a intentar.",
  stream_empty_no_response: "El modelo no devolvi\xF3 texto. Revisa la consulta o int\xE9ntalo de nuevo."
};
function formatStreamError(code) {
  const raw = String(code ?? "").trim();
  if (!raw) return void 0;
  if (STREAM_ERROR_LABELS[raw]) return STREAM_ERROR_LABELS[raw];
  if (/^[a-z0-9_]+$/i.test(raw) && raw.includes("_")) {
    return "No se pudo completar la respuesta del asistente. Vuelve a intentar.";
  }
  return raw;
}
function isStreamErrorCode(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (raw in STREAM_ERROR_LABELS) return true;
  return /^stream_[a-z0-9_]+$/i.test(raw);
}
function isStreamErrorDisplay(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (isStreamErrorCode(raw)) return true;
  return Object.values(STREAM_ERROR_LABELS).includes(raw);
}
function resolveAssistantLogContenido(others, receive, fallbackText) {
  const fromReceive = dedupeAssistantText(textFromOpenAIReceive(receive));
  if (fromReceive && !isStreamErrorDisplay(fromReceive)) return fromReceive;
  const fromOthers = dedupeAssistantText(String(others?.response_text ?? ""));
  if (fromOthers && !isStreamErrorDisplay(fromOthers)) return fromOthers;
  const fromFallback = dedupeAssistantText(String(fallbackText ?? ""));
  if (fromFallback && !isStreamErrorDisplay(fromFallback)) return fromFallback;
  return "";
}
function pushImage(images, ref) {
  const n = String(ref ?? "").trim();
  if (n && !isOmittedVisionRef(n)) images.push(n);
}
function isOmittedVisionRef(ref) {
  return /^\[(?:image_url omitido del log|base64 omitido)/i.test(String(ref ?? "").trim());
}
function isDisplayableImageRef(ref) {
  const n = String(ref ?? "").trim();
  if (!n || isOmittedVisionRef(n)) return false;
  return n.startsWith("data:") || /^https?:\/\//i.test(n);
}
function isDisplayableAudioRef(ref) {
  const n = String(ref ?? "").trim();
  if (!n) return false;
  return n.startsWith("data:audio/") || /^https?:\/\//i.test(n);
}
function extractOthersAudiosPairs(others) {
  const o = others && typeof others === "object" ? others : {};
  const urls = [];
  const transcriptions = [];
  if (Array.isArray(o.audios) && o.audios.length) {
    for (const raw of o.audios) {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const item = raw;
        const url = String(item.url ?? "").trim();
        const tr = String(item.transcrip ?? item.transcripcion ?? "").trim();
        if (url && isDisplayableAudioRef(url)) {
          urls.push(url);
          transcriptions.push(tr);
        } else if (tr) {
        }
      } else if (typeof raw === "string" && isDisplayableAudioRef(raw)) {
        urls.push(raw);
        transcriptions.push("");
      }
    }
    return { urls, transcriptions };
  }
  const legacyUrls = Array.isArray(o.audios_adjuntas) ? o.audios_adjuntas : [];
  const legacyTrs = Array.isArray(o.audios_transcripcion) ? o.audios_transcripcion : [];
  for (let i = 0; i < legacyUrls.length; i++) {
    const url = String(legacyUrls[i] ?? "").trim();
    if (!isDisplayableAudioRef(url)) continue;
    urls.push(url);
    transcriptions.push(String(legacyTrs[i] ?? "").trim());
  }
  if (!urls.length && legacyTrs.length) {
    for (const t of legacyTrs) {
      const tr = String(t ?? "").trim();
      if (tr) transcriptions.push(tr);
    }
  }
  return { urls, transcriptions };
}
function stripOmittedVisionFromText(texto) {
  return String(texto ?? "").split("\n").filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (isOmittedVisionRef(t)) return false;
    if (/^>\s*📎\s*\[(?:image_url omitido|base64 omitido)/i.test(t)) return false;
    return true;
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function mergeUserImagenes(send, others, fallbackText) {
  const fb2 = typeof send?.text === "string" ? send.text : fallbackText;
  const { text, images } = extractUserVisionFromSendInput(send?.input ?? send?.text, fb2);
  const seen = /* @__PURE__ */ new Set();
  const imagenes = [];
  const push = (ref) => {
    const n = String(ref ?? "").trim();
    if (!isDisplayableImageRef(n) || seen.has(n)) return;
    seen.add(n);
    imagenes.push(n);
  };
  if (Array.isArray(others?.imagenes_adjuntas)) {
    for (const u of others.imagenes_adjuntas) push(u);
  }
  for (const u of images) push(u);
  return { text: stripOmittedVisionFromText(text), imagenes };
}
function collectContentPart(part, texts, images) {
  if (!part || typeof part !== "object") return;
  const type = String(part.type ?? "");
  if (type === "input_text") {
    const t = String(part.text ?? "").trim();
    if (t) texts.push(t);
    return;
  }
  if (type === "input_image") {
    if (typeof part.image_url === "string") pushImage(images, part.image_url);
    else if (part.image_url && typeof part.image_url === "object" && typeof part.image_url.url === "string") {
      pushImage(images, part.image_url.url);
    } else if (typeof part.url === "string") pushImage(images, part.url);
  }
}
function collectUserTurn(turn, texts, images) {
  if (!turn || typeof turn !== "object") return;
  if (Array.isArray(turn.content)) {
    for (const part of turn.content) collectContentPart(part, texts, images);
  }
}
function extractUserVisionFromSendInput(input, fallbackText) {
  const fb2 = String(fallbackText ?? "").trim();
  if (typeof input === "string") {
    return { text: input.trim() || fb2, images: [] };
  }
  const texts = [];
  const images = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === "string") {
        const t = item.trim();
        if (t) texts.push(t);
      } else {
        collectUserTurn(item, texts, images);
      }
    }
  } else {
    collectUserTurn(input, texts, images);
  }
  return { text: texts.join("\n\n").trim() || fb2, images };
}
function dedupeAssistantText(text) {
  const t = String(text || "").trim();
  if (!t) return t;
  const len = t.length;
  if (len >= 2 && len % 2 === 0 && t.slice(0, len / 2) === t.slice(len / 2)) return t.slice(0, len / 2);
  return t;
}
function textFromOpenAIReceive(rec) {
  if (!rec) return "";
  const direct = dedupeAssistantText(rec.output_text);
  if (direct) return direct;
  const output = rec.output;
  if (Array.isArray(output)) {
    const messages = output.filter((o) => o && typeof o === "object" && o.type === "message");
    if (!messages.length) return "";
    const last = messages[messages.length - 1];
    const content = last.content;
    if (!Array.isArray(content)) return "";
    const text = content.filter((c) => c && typeof c === "object" && c.type === "output_text").map((c) => String(c.text ?? "")).join("");
    return dedupeAssistantText(text);
  }
  const choices = rec.choices;
  if (Array.isArray(choices)) {
    return choices.map((c) => String(c.message?.content ?? "")).join("");
  }
  return typeof rec.text === "string" ? rec.text : "";
}
function normalizePromptText(text) {
  if (text == null) return "";
  if (Array.isArray(text)) return text.map((part) => String(part ?? "")).join("\n").replace(/\r\n/g, "\n");
  return String(text).replace(/\r\n/g, "\n");
}
function extractInstructionsMarkdown(send) {
  if (!send || typeof send !== "object") return "";
  const raw = typeof send.instructions === "string" ? send.instructions : "";
  return normalizePromptText(raw).trim();
}
function normalizeOpenAiMessageContent(content) {
  if (content == null) return "";
  if (typeof content === "string") return normalizePromptText(content).trim();
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) return String(part.text ?? "");
      return String(part ?? "");
    }).filter(Boolean).join("\n").trim();
  }
  if (typeof content === "object" && content !== null && "text" in content) {
    return String(content.text ?? "").trim();
  }
  return String(content).trim();
}
function formatOpenAiMessagesMarkdown(messages) {
  if (!Array.isArray(messages) || !messages.length) return "";
  return messages.map((m) => {
    if (!m || typeof m !== "object") return "";
    const role = String(m.role ?? "message").toUpperCase();
    const body = normalizeOpenAiMessageContent(m.content);
    return body ? `**${role}**

${body}` : "";
  }).filter(Boolean).join("\n\n---\n\n");
}
function extractOperativaPromptMarkdown(send) {
  if (!send || typeof send !== "object") return "";
  const rec = send;
  const fromMessages = formatOpenAiMessagesMarkdown(rec.messages);
  if (fromMessages) return fromMessages;
  const input = rec.input;
  if (Array.isArray(input) && input.length) {
    return formatOpenAiMessagesMarkdown(input);
  }
  const lines = [];
  if (typeof input === "string" && input.trim()) {
    lines.push(`**Consulta (input)**

${input.trim()}`);
  }
  const sessionId = typeof rec.session_id === "string" ? rec.session_id.trim() : "";
  if (sessionId) lines.push(`**session_id**

\`${sessionId}\``);
  const loginUrl = typeof rec.login_url === "string" ? rec.login_url.trim() : "";
  if (loginUrl) lines.push(`**login_url**

${loginUrl}`);
  const transport = typeof rec.transport === "string" ? rec.transport.trim() : "";
  if (transport) lines.push(`**transport**

\`${transport}\``);
  const model = typeof rec.model === "string" ? rec.model.trim() : "";
  if (model) lines.push(`**model**

\`${model}\``);
  const serverUrl = typeof rec.server_url === "string" ? rec.server_url.trim() : "";
  if (serverUrl) lines.push(`**server_url**

\`${serverUrl}\``);
  if (rec.tools_count != null && String(rec.tools_count).trim() !== "") {
    lines.push(`**tools_count**

${Number(rec.tools_count)}`);
  }
  return lines.join("\n\n---\n\n");
}
function isContapymeMcpOperativaKey(key) {
  return /^contapymeMcp(Login|Session|Unavailable)$/i.test(String(key || "").trim());
}
function extractMcpResponseMarkdown(httpResponse) {
  if (!httpResponse || typeof httpResponse !== "object") return "";
  const rec = httpResponse;
  const lines = [];
  const kind = typeof rec.kind === "string" ? rec.kind.trim() : "";
  if (kind) lines.push(`**kind**

\`${kind}\``);
  if (rec.ok === true) lines.push("**ok**\n\n`true`");
  if (rec.ok === false) lines.push("**ok**\n\n`false`");
  const text = typeof rec.text === "string" ? rec.text.trim() : "";
  if (text) lines.push(`**Respuesta MCP**

${text}`);
  const tools = Array.isArray(rec.tools) ? rec.tools : [];
  if (tools.length) {
    const rows = tools.map((t, i) => {
      if (!t || typeof t !== "object") return `${i + 1}. tool`;
      const name = String(t.name ?? "tool");
      const status = String(t.status ?? "").trim();
      return status ? `${i + 1}. \`${name}\` \xB7 ${status}` : `${i + 1}. \`${name}\``;
    });
    lines.push(`**Tools MCP (${tools.length})**

${rows.join("\n")}`);
  }
  return lines.join("\n\n---\n\n");
}
function extractUserTextFromConvSend(send) {
  if (!send || typeof send !== "object") return "";
  const input = send.input;
  if (typeof input === "string") return input.trim();
  if (!Array.isArray(input)) return "";
  return input.flatMap((turn) => {
    if (!turn || typeof turn !== "object" || turn.role !== "user") return [];
    const content = turn.content;
    if (typeof content === "string") return [content];
    if (!Array.isArray(content)) return [];
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) return String(part.text ?? "");
      return "";
    }).filter(Boolean);
  }).join("\n").trim();
}
function extractAssistantTextFromConvReceive(receive) {
  if (!receive || typeof receive !== "object") return "";
  const direct = String(receive.output_text ?? "").trim();
  if (direct) return direct;
  const output = receive.output;
  if (!Array.isArray(output)) return "";
  const messages = output.filter((o) => o && typeof o === "object" && o.type === "message");
  if (!messages.length) return "";
  const last = messages[messages.length - 1];
  const content = last.content;
  if (!Array.isArray(content)) return "";
  return content.filter((c) => c && typeof c === "object" && c.type === "output_text").map((c) => String(c.text ?? "")).join("").trim();
}
function resolveOpenAiMensajeText(m) {
  const direct = String(m?.mensaje ?? "").trim();
  if (direct && !isStreamErrorDisplay(direct)) return direct;
  const meta = m?.meta && typeof m.meta === "object" ? m.meta : null;
  if (!meta) return "";
  const isUser = String(m?.autor ?? "").toLowerCase().includes("usuario") || meta.role === "user";
  if (isUser) {
    const fromSend = extractUserTextFromConvSend(meta.send);
    if (fromSend) return fromSend;
    const input = meta.send?.input;
    if (typeof input === "string" && input.trim()) return input.trim();
    return String(meta.text ?? meta.prompt_text ?? "").trim();
  }
  const fromReceive = extractAssistantTextFromConvReceive(meta.receive);
  if (fromReceive) return fromReceive;
  const others = meta.others && typeof meta.others === "object" ? meta.others : null;
  const fromOthers = String(others?.response_text ?? "").trim();
  if (fromOthers && !isStreamErrorCode(fromOthers)) return fromOthers;
  const tail = String(meta.response_text ?? meta.text ?? "").trim();
  return isStreamErrorCode(tail) ? "" : tail;
}
function tokensFromUsage(usage) {
  if (!usage || typeof usage !== "object") return void 0;
  const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
  const cached = Number(
    usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0
  ) || 0;
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
  const reasoning = Number(
    usage.output_tokens_details?.reasoning_tokens ?? usage.completion_tokens_details?.reasoning_tokens ?? 0
  ) || 0;
  const total = Number(usage.total_tokens ?? 0) || input + output;
  if (!total && !input && !output) return void 0;
  return { input, cached, output, reasoning, total };
}
function ordenarMensajesConvLog(mensajes) {
  if (!mensajes.length) return [];
  const byTurno = /* @__PURE__ */ new Map();
  const sinTurno = [];
  for (const m of mensajes) {
    const t = m.turno;
    if (t == null || t <= 0) {
      sinTurno.push(m);
      continue;
    }
    if (!byTurno.has(t)) byTurno.set(t, []);
    byTurno.get(t).push(m);
  }
  const out = [];
  for (const t of [...byTurno.keys()].sort((a, b) => a - b)) {
    const g = byTurno.get(t);
    const users = g.filter((m) => m.role === "user");
    const ops = g.filter((m) => m.role === "operativa").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    const assistants = g.filter((m) => m.role === "assistant");
    out.push(...users, ...ops, ...assistants);
  }
  if (sinTurno.length) {
    sinTurno.sort((a, b) => String(a.ts ?? "").localeCompare(String(b.ts ?? "")));
    out.push(...sinTurno);
  }
  return out;
}
function flattenConvLogMensaje(m) {
  const s = m.send;
  const r = m.receive;
  const o = m.others ?? {};
  const flat = { ts: m.ts, tokens: m.tokens, cost: m.cost, usage: r?.usage, latency_ms: m.latency_ms, send: s, receive: r, others: m.others };
  if (m.role === "user") {
    const { text } = extractUserVisionFromSendInput(s?.input, typeof s?.text === "string" ? s.text : "");
    if (text) {
      flat.text = stripOmittedVisionFromText(text);
      flat.prompt_text = flat.text;
    }
    const imagenes = Array.isArray(o.imagenes_adjuntas) ? o.imagenes_adjuntas.filter(isDisplayableImageRef) : [];
    if (imagenes.length) flat.imagenes = imagenes;
    const audioPairs = extractOthersAudiosPairs(o);
    if (audioPairs.urls.length) flat.audios = audioPairs.urls;
    if (audioPairs.transcriptions.length) flat.audios_transcripcion = audioPairs.transcriptions;
    const prompt = s?.prompt;
    if (prompt?.id) flat.prompt_id = prompt.id;
    if (prompt?.variables) flat.prompt_variables = prompt.variables;
  } else if (m.role === "operativa") {
    if (o.operativa_key) {
      flat.operativa_key = o.operativa_key;
      flat.prompt_id = String(o.operativa_key);
    }
    if (o.operativa_engine) flat.operativa_engine = o.operativa_engine;
    const txt = textFromOpenAIReceive(r) || String(o.response_text ?? "").trim();
    if (txt) flat.text = txt;
    if (typeof r?.model === "string") flat.model = r.model;
    const loginUrl = typeof r?.login_url === "string" ? r.login_url : typeof s?.login_url === "string" ? s.login_url : void 0;
    if (loginUrl) flat.login_url = loginUrl;
    if (s && typeof s === "object") flat.http_request = s;
    if (r && typeof r === "object") flat.http_response = r;
  } else if (m.role === "assistant") {
    const txt = resolveAssistantLogContenido(o, r);
    if (txt) {
      flat.text = txt;
      flat.response_text = txt;
    }
    if (typeof r?.model === "string") flat.model = r.model;
    if (typeof r?.id === "string") flat.response_id = r.id;
    if (o.engine) flat.engine = o.engine;
  }
  if (o.itdconsulta) flat.itdconsulta = o.itdconsulta;
  if (o.nombre_usuario) flat.nombre_usuario = o.nombre_usuario;
  if (o.stream_ok === false) flat.stream_ok = false;
  if (o.stream_error) flat.stream_error = o.stream_error;
  if (o.nombre_usado_en_respuesta !== void 0) flat.nombre_usado_en_respuesta = o.nombre_usado_en_respuesta;
  if (o.modelo_configurado) flat.modelo_configurado = o.modelo_configurado;
  if (o.modelo_autoswitch_vision) flat.modelo_autoswitch_vision = true;
  if (o.prompt_id && !flat.prompt_id) flat.prompt_id = o.prompt_id;
  if (o.premisas) flat.premisas = o.premisas;
  if (typeof o.prompt_chars === "number") flat.prompt_chars = o.prompt_chars;
  if (typeof o.response_chars === "number") flat.response_chars = o.response_chars;
  if (Array.isArray(o.file_search) && o.file_search.length) flat.file_search = o.file_search;
  if (Array.isArray(o.archivos_citados) && o.archivos_citados.length) flat.archivos_citados = o.archivos_citados;
  if (Array.isArray(o.chunks) && o.chunks.length) flat.chunks = o.chunks;
  if (typeof o.chunks_total === "number") flat.chunks_total = o.chunks_total;
  if (o.vector_store_ids) flat.vector_store_ids = o.vector_store_ids;
  if (Array.isArray(o.clasificador_vector_usado) && o.clasificador_vector_usado.length) {
    flat.clasificador_vector_usado = o.clasificador_vector_usado.map(String);
  }
  if (Array.isArray(o.instrucciones) && o.instrucciones.length) flat.instrucciones = o.instrucciones;
  if (Array.isArray(o.files_adjuntos) && o.files_adjuntos.length) flat.files_adjuntos = o.files_adjuntos;
  return flat;
}
function normalizeCost(cost) {
  if (!cost || typeof cost !== "object") return void 0;
  const input_usd = Number(cost.input_usd ?? 0) || 0;
  const cached_usd = Number(cost.cached_usd ?? 0) || 0;
  const output_usd = Number(cost.output_usd ?? 0) || 0;
  const total_usd = Number(cost.total_usd ?? 0) || input_usd + cached_usd + output_usd;
  return { input_usd, cached_usd, output_usd, total_usd };
}
var ZERO_TOKENS = { input: 0, cached: 0, output: 0, reasoning: 0, total: 0 };
var ZERO_COST = { input_usd: 0, cached_usd: 0, output_usd: 0, total_usd: 0 };
function readRawMessageTokens(msg) {
  const meta = msg?.meta;
  if (!meta) return { ...ZERO_TOKENS };
  const tk = meta.tokens?.total != null ? meta.tokens : tokensFromUsage(meta.usage);
  if (!tk) return { ...ZERO_TOKENS };
  return { input: Number(tk.input ?? 0) || 0, cached: Number(tk.cached ?? 0) || 0, output: Number(tk.output ?? 0) || 0, reasoning: Number(tk.reasoning ?? 0) || 0, total: Number(tk.total ?? 0) || 0 };
}
function readMessageCost(msg) {
  return normalizeCost(msg?.meta?.cost) ?? { ...ZERO_COST };
}
function accumulateTokens(acc, tk) {
  return { input: acc.input + tk.input, cached: acc.cached + tk.cached, output: acc.output + tk.output, reasoning: acc.reasoning + tk.reasoning, total: acc.total + tk.total };
}
function accumulateCost(acc, cost) {
  return { input_usd: acc.input_usd + cost.input_usd, cached_usd: acc.cached_usd + cost.cached_usd, output_usd: acc.output_usd + cost.output_usd, total_usd: acc.total_usd + cost.total_usd };
}
function formatUsageTokens(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return "\u2014";
  return n.toLocaleString("es-CO");
}
function formatUsageUsd(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return "\u2014";
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 1e-4) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}
function formatMoneyWithTokens(usd, tokenCount) {
  const m = formatUsageUsd(usd);
  const t = Number(tokenCount ?? 0) || 0;
  if (m === "\u2014" && t <= 0) return "\u2014";
  if (m === "\u2014") return `(${t.toLocaleString("es-CO")}t)`;
  if (t <= 0) return m;
  return `${m} (${t.toLocaleString("es-CO")}t)`;
}
function formatUsageBreakdownParts(tokens, cost) {
  const tk = tokens || {};
  const c = cost || {};
  const labelFull = { in: "Input", cache: "Cache", out: "Output", total: "Total" };
  const parts = [
    { key: "in", label: "in", usd: Number(c.input_usd ?? 0) || 0, tok: Number(tk.input ?? 0) || 0 },
    { key: "cache", label: "cache", usd: Number(c.cached_usd ?? 0) || 0, tok: Number(tk.cached ?? 0) || 0 },
    { key: "out", label: "out", usd: Number(c.output_usd ?? 0) || 0, tok: Number(tk.output ?? 0) || 0 }
  ];
  const totalUsd = Number(c.total_usd ?? 0) || parts.reduce((s, p) => s + p.usd, 0);
  const totalTok = Number(tk.total ?? 0) || 0;
  parts.push({ key: "total", label: "\u03A3", usd: totalUsd, tok: totalTok });
  return parts.map((p) => ({
    key: p.key,
    label: p.label,
    labelFull: labelFull[p.key] || p.label,
    usd: p.usd,
    tok: p.tok,
    usdText: formatUsageUsd(p.usd),
    tokText: p.tok > 0 ? `${formatUsageTokens(p.tok)} t` : "\u2014",
    display: formatMoneyWithTokens(p.usd, p.tok),
    hasData: p.usd > 0 || p.tok > 0
  }));
}
function formatUsageSummary(tokens, cost) {
  const tk = tokens || {};
  const c = cost || {};
  const totalTok = Number(tk.total ?? 0) || 0;
  const totalUsd = Number(c.total_usd ?? 0) || Number(c.input_usd ?? 0) + Number(c.cached_usd ?? 0) + Number(c.output_usd ?? 0) || 0;
  return { tokens: totalTok, usd: totalUsd, tokensText: totalTok > 0 ? `${formatUsageTokens(totalTok)} t` : "\u2014", usdText: formatUsageUsd(totalUsd), hasData: totalTok > 0 || totalUsd > 0 };
}
function usageHasData(tokens, cost) {
  return (Number(tokens?.total ?? 0) || 0) > 0 || (Number(cost?.total_usd ?? 0) || 0) > 0;
}
function turnoFromVistaMsg(msg) {
  const im = Number(msg?.imensaje);
  if (Number.isFinite(im) && im > 0) return Math.floor(im / 1e3);
  const m = String(msg?.idMsg ?? "").match(/^msg-(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n / 1e3);
  }
  return void 0;
}
function attachUsageStats(mensajes) {
  const list = mensajes || [];
  const userInputByTurno = /* @__PURE__ */ new Map();
  for (const m of list) {
    if (!m.esUsuario) continue;
    const turno = turnoFromVistaMsg(m);
    if (turno == null) continue;
    const tk = readRawMessageTokens(m);
    if (usageHasData(tk, null)) userInputByTurno.set(turno, tk);
  }
  let cumulativeTokens = { ...ZERO_TOKENS };
  let cumulativeCost = { ...ZERO_COST };
  let flushedTurno;
  return list.map((m) => {
    if (m.esUsuario) {
      const tokens2 = readRawMessageTokens(m);
      const cost2 = readMessageCost(m);
      if (!usageHasData(tokens2, cost2)) return { ...m, usageStats: void 0 };
      return {
        ...m,
        usageStats: {
          tokens: tokens2,
          cost: cost2,
          previousTokens: { ...ZERO_TOKENS },
          previousCost: { ...ZERO_COST },
          cumulativeTokens: { ...tokens2 },
          cumulativeCost: { ...cost2 }
        }
      };
    }
    const turno = turnoFromVistaMsg(m);
    if (turno != null && turno !== flushedTurno) {
      const userInput = userInputByTurno.get(turno);
      if (userInput && usageHasData(userInput, null)) {
        cumulativeTokens = accumulateTokens(cumulativeTokens, userInput);
      }
      flushedTurno = turno;
    }
    const previousTokens = { ...cumulativeTokens };
    const previousCost = { ...cumulativeCost };
    const tokens = readRawMessageTokens(m);
    const cost = readMessageCost(m);
    cumulativeTokens = accumulateTokens(cumulativeTokens, tokens);
    cumulativeCost = accumulateCost(cumulativeCost, cost);
    return {
      ...m,
      usageStats: {
        tokens,
        cost,
        previousTokens,
        previousCost,
        cumulativeTokens: { ...cumulativeTokens },
        cumulativeCost: { ...cumulativeCost }
      }
    };
  });
}
function threadHasUsageStats(mensajes) {
  return (mensajes || []).some((m) => sideLogPanelWorthShowing(m));
}
function sideLogPanelWorthShowing(msg) {
  if (!msg) return false;
  const meta = msg.meta;
  if (meta) {
    if (String(meta.itdconsulta ?? "").trim()) return true;
    if (Array.isArray(meta.premisas) && meta.premisas.length) return true;
    if (String(meta.extra?.operativa_key ?? "").trim()) return true;
    const tk = meta.tokens?.total ? meta.tokens : tokensFromUsage(meta.usage);
    if ((Number(tk?.total ?? 0) || 0) > 0) return true;
    if (Number(meta.latency_ms ?? 0) > 0) return true;
    if (String(meta.model ?? "").trim()) return true;
    if (meta.modelo_autoswitch_vision) return true;
    if (Array.isArray(meta.archivos_citados) && meta.archivos_citados.length) return true;
    if (Array.isArray(meta.file_search) && meta.file_search.length) return true;
  }
  const s = msg.usageStats;
  if (!s) return false;
  return usageHasData(s.tokens, s.cost) || !msg.esUsuario && usageHasData(s.previousTokens, s.previousCost);
}
function formatLatencySeconds(latencyMs) {
  const ms = Number(latencyMs);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return `${(ms / 1e3).toFixed(2)} s`;
}
function normalizeMeta(raw, options = {}) {
  if (!raw || typeof raw !== "object") return null;
  const isUser = options.isUser === true;
  const operativaKey = typeof raw.operativa_key === "string" ? raw.operativa_key.trim() : "";
  const userPromptText = isUser ? String(raw.prompt_text ?? raw.text ?? extractUserTextFromConvSend(raw.send) ?? "").trim() : "";
  const assistantPromptMarkdown = !isUser ? (() => {
    const sendBag = raw.send && typeof raw.send === "object" ? raw.send : raw.http_request;
    const fromSend = (extractInstructionsMarkdown(sendBag) || extractOperativaPromptMarkdown(sendBag)).trim();
    const opKey = operativaKey || String(raw.prompt_id ?? "").trim();
    const fromRes = isContapymeMcpOperativaKey(opKey) ? extractMcpResponseMarkdown(raw.http_response || raw.receive).trim() : "";
    if (fromSend && fromRes) return `${fromSend}

---

${fromRes}`;
    return fromSend || fromRes;
  })() : "";
  const promptMarkdown = isUser ? userPromptText : assistantPromptMarkdown;
  const userImagenes = isUser && Array.isArray(raw.imagenes) ? raw.imagenes.filter(isDisplayableImageRef) : [];
  const userAudios = isUser && Array.isArray(raw.audios) ? raw.audios.filter(isDisplayableAudioRef) : [];
  const userAudiosTranscripcion = isUser && Array.isArray(raw.audios_transcripcion) ? raw.audios_transcripcion.map((t) => String(t ?? "").trim()).filter(Boolean) : [];
  const promptId = !isUser ? typeof raw.prompt_id === "string" && raw.prompt_id.trim() ? raw.prompt_id.trim() : operativaKey || void 0 : void 0;
  const tokensRaw = raw.tokens;
  const tokens = tokensRaw?.total ? tokensRaw : tokensFromUsage(raw.usage) ?? tokensRaw;
  const cost = normalizeCost(raw.cost);
  return {
    ts: typeof raw.ts === "string" ? raw.ts : void 0,
    nombre_usuario: typeof raw.nombre_usuario === "string" ? raw.nombre_usuario : void 0,
    nombre_usado_en_respuesta: typeof raw.nombre_usado_en_respuesta === "boolean" ? raw.nombre_usado_en_respuesta : void 0,
    itdconsulta: typeof raw.itdconsulta === "string" ? raw.itdconsulta : void 0,
    model: typeof raw.model === "string" ? raw.model : void 0,
    modelo_configurado: typeof raw.modelo_configurado === "string" ? raw.modelo_configurado : void 0,
    modelo_autoswitch_vision: raw.modelo_autoswitch_vision === true ? true : void 0,
    prompt_id: promptId,
    premisas: Array.isArray(raw.premisas) ? raw.premisas.map(String) : void 0,
    tokens,
    cost,
    usage: raw.usage,
    response_id: typeof raw.response_id === "string" ? raw.response_id : void 0,
    prompt_variables: raw.prompt_variables,
    latency_ms: typeof raw.latency_ms === "number" ? raw.latency_ms : void 0,
    prompt_chars: typeof raw.prompt_chars === "number" ? raw.prompt_chars : promptMarkdown ? promptMarkdown.length : void 0,
    response_chars: typeof raw.response_chars === "number" ? raw.response_chars : void 0,
    stream_ok: raw.stream_ok,
    stream_error: formatStreamError(typeof raw.stream_error === "string" ? raw.stream_error : void 0),
    extra: raw.operativa_key ? {
      operativa_key: String(raw.operativa_key),
      operativa_engine: raw.operativa_engine != null ? String(raw.operativa_engine) : void 0
    } : void 0,
    prompt_markdown: promptMarkdown || void 0,
    imagenes: userImagenes.length ? userImagenes : void 0,
    audios: userAudios.length ? userAudios : void 0,
    audiosTranscripcion: userAudiosTranscripcion.length ? userAudiosTranscripcion : void 0,
    file_search: Array.isArray(raw.file_search) && raw.file_search.length ? raw.file_search : void 0,
    archivos_citados: Array.isArray(raw.archivos_citados) && raw.archivos_citados.length ? raw.archivos_citados.map(String) : void 0,
    vector_store_ids: (() => {
      const ids = raw.vector_store_ids ?? raw.vectorStoreIds;
      return Array.isArray(ids) && ids.length ? ids.map(String) : void 0;
    })(),
    chunks: Array.isArray(raw.chunks) && raw.chunks.length ? raw.chunks : void 0,
    chunks_total: typeof raw.chunks_total === "number" ? raw.chunks_total : void 0,
    clasificador_vector_usado: Array.isArray(raw.clasificador_vector_usado) && raw.clasificador_vector_usado.length ? raw.clasificador_vector_usado.map(String) : void 0,
    login_url: typeof raw.login_url === "string" && raw.login_url.trim() ? raw.login_url.trim() : void 0,
    http_request: raw.http_request && typeof raw.http_request === "object" ? raw.http_request : void 0,
    http_response: raw.http_response && typeof raw.http_response === "object" ? raw.http_response : void 0,
    files_adjuntos: Array.isArray(raw.files_adjuntos) && raw.files_adjuntos.length ? raw.files_adjuntos : void 0
  };
}
function convLogToMsgVista(m, i, userSendForTurn, userVectorStoreIds) {
  const role = String(m.role ?? "assistant");
  const esOperativa = role === "operativa";
  const esUsuario = role === "user";
  const send = m.send;
  const receive = m.receive;
  const others = m.others ?? {};
  let contenido = "";
  let imagenes = [];
  let audios = [];
  let audiosTranscripcion = [];
  if (role === "user") {
    const merged = mergeUserImagenes(send, others, String(send?.text ?? m.text ?? others.prompt_text ?? ""));
    contenido = merged.text;
    imagenes = merged.imagenes;
    const audioPairs = extractOthersAudiosPairs(others);
    audios = audioPairs.urls;
    audiosTranscripcion = audioPairs.transcriptions;
  } else {
    contenido = resolveAssistantLogContenido(others, receive, m.text);
    if (esOperativa && !contenido.trim() && receive && typeof receive === "object") {
      const finish = receive.choices?.[0]?.finish_reason;
      if (finish === "length") {
        contenido = "(sin texto visible: max_completion_tokens agotado en razonamiento interno del modelo)";
      }
    }
  }
  const streamErrorRaw = typeof others.stream_error === "string" ? others.stream_error : isStreamErrorCode(others.response_text) ? String(others.response_text) : void 0;
  const streamFailed = others.stream_ok === false || Boolean(streamErrorRaw);
  const streamError = formatStreamError(streamErrorRaw);
  const opKey = others.operativa_key ?? send?.key ?? m.operativa_key;
  const flat = m.send != null || m.receive != null ? flattenConvLogMensaje(m) : m;
  if (!esUsuario && !esOperativa && userSendForTurn && !flat.send) {
    flat.send = userSendForTurn;
  }
  let meta = normalizeMeta(flat, { isUser: esUsuario });
  if (!esUsuario && userVectorStoreIds?.length && !meta?.vector_store_ids?.length) {
    meta = { ...meta, vector_store_ids: userVectorStoreIds.map(String) };
  }
  const logImensaje = (() => {
    const turno = Number(m.turno);
    const seq = Number(m.seq);
    if (!Number.isFinite(turno) || turno <= 0 || !Number.isFinite(seq) || seq <= 0) return void 0;
    return turno * 1e3 + seq;
  })();
  let logFragment;
  try {
    logFragment = JSON.parse(JSON.stringify(m));
  } catch {
    logFragment = { role, ts: m.ts };
  }
  return {
    idMsg: logImensaje ? `msg-${logImensaje}` : `${role}-${String(m.seq ?? i)}-${String(m.turno ?? 0)}`,
    rol: esOperativa ? `OP \xB7 ${String(opKey ?? "operativa")}` : esUsuario ? "user" : "assistant",
    contenido: contenido || (esUsuario && !imagenes.length && !audios.length ? "(mensaje usuario sin texto en log)" : contenido),
    imagenes: imagenes.length ? imagenes : void 0,
    audios: audios.length ? audios : void 0,
    audiosTranscripcion: audiosTranscripcion.length ? audiosTranscripcion : void 0,
    logFragment,
    ...(() => {
      const f = formatMsgFecha(m.ts ?? "");
      return { fecha: f.label, fechaIso: f.iso || void 0 };
    })(),
    esUsuario,
    esOperativa,
    meta,
    streamFailed,
    streamError,
    ...logImensaje ? { imensaje: logImensaje } : {}
  };
}
function logToMensajesVista(log) {
  const ordenados = ordenarMensajesConvLog(log.mensajes ?? []);
  const sendByTurno = /* @__PURE__ */ new Map();
  const vectorStoreIdsByTurno = /* @__PURE__ */ new Map();
  for (const m of ordenados) {
    if (String(m.role) === "user" && m.turno != null) {
      if (m.send) sendByTurno.set(m.turno, m.send);
      const vsIds = m.others?.vector_store_ids;
      if (Array.isArray(vsIds) && vsIds.length) vectorStoreIdsByTurno.set(m.turno, vsIds.map(String));
    }
  }
  let lastUserSend = null;
  return attachUsageStats(ordenados.map((m, i) => {
    if (String(m.role) === "user" && m.send) lastUserSend = m.send;
    const userSend = m.turno != null ? sendByTurno.get(m.turno) ?? lastUserSend : lastUserSend;
    const userVsIds = m.turno != null ? vectorStoreIdsByTurno.get(m.turno) : void 0;
    return convLogToMsgVista(m, i, userSend, userVsIds);
  }));
}
var CONV_LOG_PAD = { p: { xs: 1.25, sm: 2, md: 3 } };
function convLogSurfaceSx(extra = {}) {
  return { flex: 1, minHeight: 0, overflow: "auto", bgcolor: "transparent", ...CONV_LOG_PAD, ...extra };
}

// src/js/ui/shared.jsx
init_platform();

// src/js/ui/ImageLightboxDialog.jsx
init_platform();
init_platform();

// src/js/core/lightboxBoot.ts
function isLightboxZoomReady() {
  return Boolean(globalThis.ISAComponents?.LightboxZoom?.LightboxZoomDialog);
}
var loadPromise = null;
function ensureLightboxReady() {
  if (isLightboxZoomReady()) {
    return Promise.resolve(globalThis.ISAComponents.LightboxZoom);
  }
  if (!loadPromise) {
    loadPromise = Promise.resolve().then(() => (init_cdn(), cdn_exports)).then((m) => m.ensureLightboxZoom()).catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

// src/js/ui/ImageLightboxDialog.jsx
import { jsx } from "react/jsx-runtime";
var { useEffect, useState } = getReact();
function ImageLightboxDialog(props) {
  const { open, onClose } = props;
  const [ready, setReady] = useState(() => isLightboxZoomReady());
  const [loadError, setLoadError] = useState(null);
  useEffect(() => {
    if (!open || ready) return void 0;
    let cancelled = false;
    ensureLightboxReady().then(() => {
      if (!cancelled) setReady(true);
    }).catch((err) => {
      if (!cancelled) setLoadError(err);
    });
    return () => {
      cancelled = true;
    };
  }, [open, ready]);
  if (!open) return null;
  if (loadError) {
    const { Typography: Typography9, Box: Box12 } = getMaterialUI();
    return /* @__PURE__ */ jsx(Box12, { sx: { p: 2, textAlign: "center" }, children: /* @__PURE__ */ jsx(Typography9, { variant: "body2", color: "error", children: "No se pudo cargar el visor de im\xE1genes. Recargue sin cach\xE9 (Ctrl+Shift+R)." }) });
  }
  if (!ready) return null;
  const Comp = Lightbox.ImageLightboxDialog;
  return /* @__PURE__ */ jsx(Comp, { ns: "ISA", ...props, onClose });
}

// src/js/ui/LogJsonPanel.jsx
init_platform();

// src/js/core/isCodeCdn.ts
var IS_WC_SHA = "1ce1d12227f2988877b81b8f35cba2507dc16bf1";
var IS_CODE_JS = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@${IS_WC_SHA}/dist/cdn/code/code.min.js`;
var loadPromise2 = null;
function isCodeElementReady() {
  return typeof customElements !== "undefined" && Boolean(customElements.get("is-code"));
}
function ensureIsCodeReady() {
  if (isCodeElementReady()) return Promise.resolve(true);
  if (loadPromise2) return loadPromise2;
  loadPromise2 = (async () => {
    if (typeof document === "undefined") return false;
    const existing = [...document.scripts].find((s) => (s.src || "").includes("/dist/cdn/code/code.min.js"));
    if (!existing) {
      await new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.type = "module";
        el.src = IS_CODE_JS;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`No se pudo cargar is-code CDN: ${IS_CODE_JS}`));
        document.head.appendChild(el);
      });
    }
    try {
      await customElements.whenDefined("is-code");
    } catch {
    }
    return isCodeElementReady();
  })().catch((err) => {
    loadPromise2 = null;
    console.warn("[is-code]", err);
    return false;
  });
  return loadPromise2;
}
function sanitizeLogJsonForDisplay(raw) {
  return String(raw ?? "").replace(
    /data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,[A-Za-z0-9+/=\s]+/gi,
    (m) => `[audio:data-url omitido \xB7 ${m.length} chars \u2014 persiste en R2 como .mp3]`
  );
}

// src/js/ui/LogJsonPanel.jsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var { useMemo, useEffect: useEffect2, useRef, useState: useState2 } = getReact();
var { Box, Typography, Stack, Chip, Tooltip, IconButton } = getMaterialUI();
var { Icon } = UI;
function asFileRefs(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (!item || typeof item !== "object") return null;
    const o = item;
    const ifile = String(o.ifile ?? "").trim();
    const url = String(o.url ?? o.variants?.original ?? "").trim();
    if (!ifile && !url) return null;
    return {
      ifile,
      kind: String(o.kind || "file"),
      url,
      variants: o.variants && typeof o.variants === "object" ? o.variants : {}
    };
  }).filter(Boolean);
}
function MetaFilesStrip({ files, title = "Adjuntos FILES_STORAGE" }) {
  const items = asFileRefs(files);
  if (!items.length) return null;
  return /* @__PURE__ */ jsxs(Box, { className: "meta-files-strip", children: [
    /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 0.75, sx: { mb: 0.75 }, children: [
      /* @__PURE__ */ jsx2("iconify-icon", { icon: "mdi:cloud-outline", width: "16", height: "16" }),
      /* @__PURE__ */ jsx2(Typography, { variant: "subtitle2", sx: { fontWeight: 700 }, children: title })
    ] }),
    /* @__PURE__ */ jsx2(Stack, { spacing: 0.75, children: items.map((f, i) => /* @__PURE__ */ jsx2(Box, { className: "meta-files-strip__row", children: /* @__PURE__ */ jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [
      f.ifile ? /* @__PURE__ */ jsx2(Chip, { size: "small", className: "meta-files-strip__ifile", label: `ifile ${f.ifile}` }) : null,
      /* @__PURE__ */ jsx2(Chip, { size: "small", variant: "outlined", label: f.kind }),
      ["original", "med", "thumb"].filter((k) => f.variants?.[k] || k === "original" && f.url).map((k) => {
        const href = f.variants?.[k] || (k === "original" ? f.url : "");
        if (!href) return null;
        return /* @__PURE__ */ jsx2("a", { className: "meta-files-strip__link", href, target: "_blank", rel: "noopener noreferrer", children: k }, k);
      })
    ] }) }, `${f.ifile || f.url}-${i}`)) })
  ] });
}
function IsCodeJsonView({ value }) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState2(() => typeof customElements !== "undefined" && Boolean(customElements.get("is-code")));
  const [failed, setFailed] = useState2(false);
  useEffect2(() => {
    let cancelled = false;
    ensureIsCodeReady().then((ok) => {
      if (cancelled) return;
      setReady(ok);
      if (!ok) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect2(() => {
    if (!ready || !hostRef.current) return;
    const host = hostRef.current;
    let el = host.querySelector("is-code");
    if (!el) {
      el = document.createElement("is-code");
      el.setAttribute("lang", "json");
      el.setAttribute("readonly", "");
      el.setAttribute("wrap", "");
      el.setAttribute("line-numbers", "false");
      el.setAttribute("min-height", "14rem");
      el.className = "log-json-panel__is-code";
      host.replaceChildren(el);
    }
    const text = String(value ?? "");
    if (el.value !== text) el.value = text;
  }, [ready, value]);
  if (failed) {
    return /* @__PURE__ */ jsx2("pre", { className: "log-json-panel__pre custom-scrollbar", children: String(value ?? "") });
  }
  return /* @__PURE__ */ jsx2(
    "div",
    {
      ref: hostRef,
      className: "log-json-panel__code-host custom-scrollbar",
      "aria-label": "Fragmento JSON del conv-log"
    }
  );
}
function LogJsonPanel({ value, files = null, onCopy }) {
  const json = useMemo(() => {
    if (value == null) return "";
    let raw = "";
    if (typeof value === "string") raw = value;
    else {
      try {
        raw = JSON.stringify(value, null, 2);
      } catch {
        raw = String(value);
      }
    }
    return sanitizeLogJsonForDisplay(raw);
  }, [value]);
  return /* @__PURE__ */ jsxs(Box, { className: "log-json-panel", children: [
    /* @__PURE__ */ jsxs(Stack, { direction: "row", alignItems: "center", spacing: 0.75, sx: { mb: 0.85 }, children: [
      /* @__PURE__ */ jsx2("iconify-icon", { icon: "mdi:code-json", width: "18", height: "18" }),
      /* @__PURE__ */ jsx2(Typography, { variant: "subtitle1", sx: { flex: 1, fontWeight: 700 }, children: "Fragmento conv-log" }),
      /* @__PURE__ */ jsx2(Tooltip, { title: "Copiar JSON", arrow: true, children: /* @__PURE__ */ jsx2(
        IconButton,
        {
          size: "small",
          "aria-label": "Copiar JSON del log",
          onClick: () => {
            try {
              onCopy?.(json);
              navigator.clipboard?.writeText?.(json);
            } catch {
            }
          },
          children: /* @__PURE__ */ jsx2(Icon, { icon: "mdi:content-copy", size: 16 })
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx2(MetaFilesStrip, { files }),
    /* @__PURE__ */ jsx2(IsCodeJsonView, { value: json })
  ] });
}

// src/js/ui/GlassDialog.jsx
init_platform();
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function isaLoginSurface() {
  const fs = globalThis.ISAFront || {};
  return {
    loginDialogProps: fs.loginDialogProps,
    loginDialogBackdropSx: fs.loginDialogBackdropSx,
    loginCardSx: fs.loginCardSx,
    glassCardSx: fs.glassCardSx,
    loginHeaderBandSx: fs.loginHeaderBandSx,
    loginIconBoxSx: fs.loginIconBoxSx,
    loginHeaderTitleSx: fs.loginHeaderTitleSx,
    GLASS_CARD_CLASS: fs.GLASS_CARD_CLASS || "isa-glass-card"
  };
}
var PAPER_MAX = { xs: 440, sm: 560, md: 920, lg: 1080 };
function glassBackdropSx() {
  const fn = isaLoginSurface().loginDialogBackdropSx;
  return fn?.() ?? {
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    backgroundColor: "rgba(11,18,32,0.55)"
  };
}
function glassPaperProps(maxWidth, paperClassName = "") {
  const { loginCardSx, glassCardSx, GLASS_CARD_CLASS } = isaLoginSurface();
  const maxPx = PAPER_MAX[maxWidth] ?? PAPER_MAX.md;
  return {
    elevation: 0,
    className: `isa-login-card ${GLASS_CARD_CLASS} isa-glass-dialog__paper ${paperClassName}`.trim(),
    sx: loginCardSx?.({ maxWidth: maxPx, m: { xs: 1, sm: 1.5 } }) ?? glassCardSx?.({ maxWidth: maxPx, m: { xs: 1, sm: 1.5 } }) ?? { maxWidth: maxPx, m: { xs: 1, sm: 1.5 } }
  };
}
function resolveGlassDialogProps({
  open,
  onClose,
  maxWidth = "md",
  fullWidth = true,
  fullScreen = false,
  paperMaxWidth,
  paperSx,
  paperClassName = "",
  slotProps,
  ...rest
} = {}) {
  const { loginDialogProps } = isaLoginSurface();
  const paper = glassPaperProps(maxWidth, paperClassName);
  if (paperMaxWidth) paper.sx = { ...paper.sx, maxWidth: paperMaxWidth };
  if (paperSx) paper.sx = { ...paper.sx, ...paperSx };
  if (fullScreen) {
    paper.sx = {
      ...paper.sx,
      m: 0,
      margin: 0,
      maxWidth: "100%",
      width: "100%",
      height: "100%",
      maxHeight: "100dvh",
      borderRadius: 0,
      border: "none",
      boxShadow: "none"
    };
  }
  const shared = {
    open,
    onClose,
    maxWidth: fullScreen ? false : maxWidth,
    fullWidth,
    fullScreen,
    scroll: "paper",
    className: `isa-login-dialog isa-glass-dialog${fullScreen ? " isa-glass-dialog--fullscreen" : ""}`,
    slotProps: {
      ...slotProps || {},
      backdrop: {
        ...slotProps?.backdrop || {},
        sx: { ...glassBackdropSx(), ...slotProps?.backdrop?.sx || {} }
      }
    },
    PaperProps: paper,
    ...rest
  };
  if (!loginDialogProps) return shared;
  return loginDialogProps(shared);
}
function glassDialogTabsSx(extra = {}) {
  return {
    px: { xs: 1.5, sm: 2 },
    minHeight: 44,
    borderBottom: 1,
    borderColor: (t) => t.palette.mode === "dark" ? "rgba(99,102,241,0.28)" : "divider",
    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(15,23,42,0.38)" : "rgba(248,250,252,0.92)",
    "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 600, fontSize: "0.88rem", opacity: 0.82 },
    "& .MuiTab-root.Mui-selected": { opacity: 1, color: "#1e90ff !important" },
    "& .MuiTabs-indicator": {
      height: 3,
      borderRadius: "3px 3px 0 0",
      background: "linear-gradient(90deg, #1e90ff, #00e5ff)",
      boxShadow: "0 0 14px rgba(0,229,255,0.42)"
    },
    ...extra
  };
}
function glassDialogContentSx(extra = {}) {
  return {
    p: 0,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    position: "relative",
    borderTop: 0,
    ...extra
  };
}
function glassDialogActionsSx(extra = {}) {
  return {
    px: { xs: 2, sm: 2.5 },
    py: 1.5,
    borderTop: 1,
    borderColor: (t) => t.palette.mode === "dark" ? "rgba(99,102,241,0.22)" : "divider",
    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(15,23,42,0.32)" : "rgba(248,250,252,0.85)",
    justifyContent: "flex-end",
    ...extra
  };
}
function GlassDialogCloseActions({ onClose, label = "Cerrar" }) {
  const { DialogActions: DialogActions3, Button: Button6 } = getMaterialUI();
  return /* @__PURE__ */ jsx3(DialogActions3, { sx: glassDialogActionsSx(), children: /* @__PURE__ */ jsx3(Button6, { onClick: onClose, sx: { textTransform: "none", fontWeight: 600, minWidth: 72 }, children: label }) });
}
function GlassDialogHeader({ icon = "mdi:information-outline", title, subtitle, accent = "#1e90ff", onClose, closeAutoFocus = false }) {
  const { Box: Box12, Typography: Typography9, IconButton: IconButton7, Stack: Stack7 } = getMaterialUI();
  const { Icon: Icon11 } = UI;
  const { loginHeaderBandSx, loginIconBoxSx, loginHeaderTitleSx } = isaLoginSurface();
  const bandSx = loginHeaderBandSx?.(accent) ?? {
    px: { xs: 2, sm: 2.5 },
    py: 2,
    borderBottom: 1,
    borderColor: "rgba(99,102,241,0.25)",
    background: `linear-gradient(90deg, ${accent}44, rgba(99,102,241,0.12) 45%, transparent 75%)`,
    borderLeft: 4,
    borderLeftColor: accent
  };
  const iconSx = loginIconBoxSx?.(accent) ?? {
    width: 42,
    height: 42,
    borderRadius: 1.75,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
    color: "#fff"
  };
  const titleSx = loginHeaderTitleSx?.() ?? { fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.15 };
  return /* @__PURE__ */ jsxs2(Box12, { className: "isa-glass-dialog__header", sx: { position: "relative", flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx3(Box12, { sx: bandSx, children: /* @__PURE__ */ jsxs2(Stack7, { direction: "row", spacing: 1.25, alignItems: "center", sx: { pr: onClose ? 4 : 0 }, children: [
      /* @__PURE__ */ jsx3(Box12, { sx: iconSx, children: /* @__PURE__ */ jsx3(Icon11, { icon, size: 24 }) }),
      /* @__PURE__ */ jsxs2(Box12, { sx: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx3(Typography9, { variant: "h5", component: "h2", sx: titleSx, children: title }),
        subtitle ? /* @__PURE__ */ jsx3(Typography9, { variant: "caption", color: "text.secondary", display: "block", sx: { mt: 0.35, lineHeight: 1.4 }, children: subtitle }) : null
      ] })
    ] }) }),
    onClose ? /* @__PURE__ */ jsx3(
      IconButton7,
      {
        size: "small",
        onClick: onClose,
        "aria-label": "Cerrar",
        autoFocus: closeAutoFocus,
        className: "isa-glass-dialog__close",
        sx: { position: "absolute", top: 10, right: 10 },
        children: /* @__PURE__ */ jsx3(Icon11, { icon: "mdi:close", size: 18 })
      }
    ) : null
  ] });
}
function GlassDialog({ children, header = null, maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps }) {
  const { Dialog: Dialog2 } = getMaterialUI();
  const props = resolveGlassDialogProps({ maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps });
  return /* @__PURE__ */ jsxs2(Dialog2, { ...props, children: [
    header,
    children
  ] });
}
function resolveUsageDialogHeader(msgLabel, fecha, opKey) {
  const label = String(msgLabel || "Mensaje").trim();
  const isOp = /^OP\s*·/i.test(label) || Boolean(opKey);
  return {
    title: `Uso \xB7 ${label}`,
    subtitle: [fecha, opKey].filter(Boolean).join(" \xB7 ") || void 0,
    icon: isOp ? "mdi:cog-transfer-outline" : "mdi:chart-box-outline",
    accent: isOp ? "#f59e0b" : "#34d399"
  };
}
function isGenericMetaRole(rol) {
  const r = String(rol || "").trim().toLowerCase();
  return !r || r === "user" || r === "usuario" || r === "assistant" || r === "asistente";
}
function resolveMetaDialogHeader(title, isUserMessage = false) {
  const rol = String(title || "").replace(/^Trazabilidad\s*·\s*/i, "").trim();
  if (isUserMessage || /^user$/i.test(rol) || /^usuario$/i.test(rol)) {
    return { title: "Trazabilidad", subtitle: void 0, icon: "mdi:account-outline", accent: "#60a5fa" };
  }
  if (/^OP\s*·/i.test(rol) || /operativa/i.test(rol)) {
    return { title: "Trazabilidad", subtitle: rol, icon: "mdi:cog-transfer-outline", accent: "#f59e0b" };
  }
  if (isGenericMetaRole(rol)) {
    return { title: "Trazabilidad", subtitle: void 0, icon: "mdi:robot-outline", accent: "#1e90ff" };
  }
  return { title: "Trazabilidad", subtitle: rol, icon: "mdi:robot-outline", accent: "#1e90ff" };
}

// src/js/core/fileSearchTrace.js
function archivosCitadosFromTrace(trace) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const call of trace ?? []) {
    for (const fr of call?.results ?? []) {
      const name = String(fr?.filename ?? "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}
function fileSearchTraceCalls(meta) {
  const fs = meta?.file_search ?? meta?.others?.file_search;
  return Array.isArray(fs) && fs.length ? fs : [];
}
function fileSearchSummary(meta) {
  const fs = meta?.file_search ?? meta?.others?.file_search;
  if (!fs || Array.isArray(fs) || typeof fs !== "object") return null;
  return fs;
}
function vectorStoresFromMeta(meta) {
  const ids = [];
  const pushId = (id) => {
    const s = String(id ?? "").trim();
    if (!s || ids.includes(s)) return;
    ids.push(s);
  };
  const direct = meta?.vector_store_ids ?? meta?.vectorStoreIds;
  if (Array.isArray(direct)) direct.forEach(pushId);
  const summary = fileSearchSummary(meta);
  if (Array.isArray(summary?.vector_store_ids)) summary.vector_store_ids.forEach(pushId);
  for (const call of fileSearchTraceCalls(meta)) {
    for (const id of call?.vector_store_ids ?? []) pushId(id);
  }
  if (Array.isArray(meta?.clasificador_vector_usado)) meta.clasificador_vector_usado.forEach(pushId);
  for (const c of compactChunksFromMeta(meta)) {
    if (c.vectorStoreId) pushId(c.vectorStoreId);
  }
  return ids.map((id, index) => ({ index, id }));
}
function vectorStoreIndexLabel(vectorStores, vsId) {
  const id = String(vsId ?? "").trim();
  if (!id || !vectorStores?.length) return null;
  const hit = vectorStores.find((v) => v.id === id);
  return hit != null ? hit.index : null;
}
function archivosCitadosFromMeta(meta) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const push = (name) => {
    const n = String(name ?? "").trim();
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };
  for (const x of meta?.archivos_citados ?? []) push(x);
  const summary = fileSearchSummary(meta);
  if (Array.isArray(summary?.archivos_citados)) {
    for (const x of summary.archivos_citados) push(x);
  }
  for (const name of archivosCitadosFromTrace(fileSearchTraceCalls(meta))) push(name);
  for (const c of compactChunksFromMeta(meta)) {
    if (c.filename) push(c.filename);
  }
  return out;
}
function fileSearchFromMeta(meta) {
  return fileSearchTraceCalls(meta);
}
function metaHasFileSearch(meta) {
  return archivosCitadosFromMeta(meta).length > 0 || vectorStoresFromMeta(meta).length > 0 || chunksFromMeta(meta).length > 0 || Boolean(fileSearchTraceCalls(meta).length);
}
function readCompactChunkList(meta) {
  const summary = fileSearchSummary(meta);
  const fromMeta = Array.isArray(meta?.chunks) ? meta.chunks : [];
  const fromSummary = Array.isArray(summary?.chunks) ? summary.chunks : [];
  return fromMeta.length ? fromMeta : fromSummary;
}
function compactChunksFromMeta(meta) {
  const list = readCompactChunkList(meta);
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const c = list[i] || {};
    const text = String(c.text ?? c.snippet ?? "").trim();
    const filename = String(c.filename ?? "").trim();
    const fileId = String(c.file_id ?? "").trim();
    const vectorStoreId = String(c.vector_store_id ?? "").trim();
    if (!text && !filename && !fileId) continue;
    out.push({
      key: `compact-${fileId || filename || i}`,
      filename,
      fileId,
      score: typeof c.score === "number" ? c.score : null,
      text,
      vectorStoreId: vectorStoreId || void 0,
      queries: [],
      callIndex: 0,
      callId: ""
    });
  }
  return out;
}
function chunksFromMeta(meta) {
  const trace = fileSearchTraceCalls(meta);
  const out = [];
  if (trace.length) {
    for (let ci = 0; ci < trace.length; ci += 1) {
      const call = trace[ci] || {};
      const results = Array.isArray(call?.results) ? call.results : [];
      const queries = Array.isArray(call?.queries) ? call.queries : [];
      const callId = String(call?.id ?? "").trim();
      for (let ri = 0; ri < results.length; ri += 1) {
        const fr = results[ri] || {};
        const text = String(fr?.text ?? "").trim();
        if (!text) continue;
        const filename = String(fr?.filename ?? "").trim();
        const fileId = String(fr?.file_id ?? "").trim();
        const score = typeof fr?.score === "number" ? fr.score : null;
        const vectorStoreId = String(fr?.vector_store_id ?? "").trim() || void 0;
        out.push({
          key: `${callId || ci}-${fileId || filename || ri}`,
          callIndex: ci,
          callId,
          filename,
          fileId,
          score,
          text,
          queries,
          vectorStoreId
        });
      }
    }
  }
  if (!out.length) return compactChunksFromMeta(meta);
  return out;
}
function chunkPreview(text, max = 360) {
  const t = String(text ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}\u2026`;
}
function compactFileChipLabel(filename, maxLen = 28) {
  const full = String(filename ?? "").trim();
  if (!full) return "";
  const base = full.split(/[/\\]/).pop() || full;
  if (base.length <= maxLen) return base;
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot) : "";
  const stemMax = maxLen - ext.length - 1;
  if (stemMax > 4) return `${base.slice(0, stemMax)}\u2026${ext}`;
  return `${base.slice(0, maxLen - 1)}\u2026`;
}

// src/js/ui/shared.jsx
import { Fragment, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var { useState: useState3, useEffect: useEffect3, useMemo: useMemo2 } = getReact();
var { createTheme, Tabs, Tab, Box: Box2, Typography: Typography2, DialogContent, Stack: Stack2, Chip: Chip2 } = getMaterialUI();
function isOpenAiPmptId(id) {
  return /^pmpt_/i.test(String(id ?? "").trim());
}
function bdInstructionKey(meta) {
  const id = String(meta?.prompt_id ?? "").trim();
  return id && !isOpenAiPmptId(id) ? id : "";
}
function instructionKeyFromMeta(meta) {
  return bdInstructionKey(meta) || String(meta?.extra?.operativa_key ?? "").trim();
}
var USAGE_METRIC_COLS = [
  { key: "in", label: "Entrada" },
  { key: "cache", label: "Cach\xE9" },
  { key: "out", label: "Salida" },
  { key: "total", label: "Total" },
  { key: "reason", label: "Razon." }
];
function buildUsageRowMetrics(tokens, cost) {
  const tk = tokens || {};
  const parts = formatUsageBreakdownParts(tokens, cost);
  const byKey = Object.fromEntries(parts.map((p) => [p.key, p]));
  const reasonTok = Number(tk.reasoning ?? 0) || 0;
  return USAGE_METRIC_COLS.map((col) => {
    if (col.key === "reason") {
      return { key: col.key, tok: reasonTok, usd: 0, hasData: reasonTok > 0 };
    }
    const p = byKey[col.key];
    const tok = Number(p?.tok ?? 0) || 0;
    const usd = Number(p?.usd ?? 0) || 0;
    return { key: col.key, tok, usd, hasData: tok > 0 || usd > 0 };
  });
}
function UsageMetricCell({ tok, usd, showUsd = true }) {
  const tokLabel = formatUsageTokens(tok);
  const usdLabel = showUsd ? formatUsageUsd(usd) : null;
  const showMoney = Boolean(showUsd && usdLabel && usdLabel !== "\u2014");
  const empty = tokLabel === "\u2014" && !showMoney;
  return /* @__PURE__ */ jsxs3("span", { className: `meta-prompt-stat__usage-grid-cell${empty ? " meta-prompt-stat__usage-grid-cell--empty" : ""}`, children: [
    /* @__PURE__ */ jsx4("span", { className: "meta-prompt-stat__usage-tok", children: tokLabel }),
    showMoney ? /* @__PURE__ */ jsx4("span", { className: "meta-prompt-stat__usage-usd", children: usdLabel }) : null
  ] });
}
function MetaUsageGrid({ sections, hideRowLabels = false, className = "" }) {
  const rows = (sections || []).map((s) => ({
    ...s,
    metrics: buildUsageRowMetrics(s.tokens, s.cost)
  }));
  const visibleCols = USAGE_METRIC_COLS.filter(
    (col) => rows.some((r) => r.metrics.find((m) => m.key === col.key)?.hasData)
  );
  if (!visibleCols.length) return null;
  const gridTemplateColumns = hideRowLabels ? `repeat(${visibleCols.length}, minmax(5.5rem, 1fr))` : `5.75rem repeat(${visibleCols.length}, minmax(5.5rem, 1fr))`;
  const gridStyle = { display: "grid", gridTemplateColumns };
  return /* @__PURE__ */ jsxs3("div", { className: `meta-prompt-stat__usage-grid ${className}`.trim(), children: [
    /* @__PURE__ */ jsxs3("div", { className: "meta-prompt-stat__usage-grid-head", style: gridStyle, children: [
      !hideRowLabels ? /* @__PURE__ */ jsx4("span", { className: "meta-prompt-stat__usage-grid-corner", "aria-hidden": "true" }) : null,
      visibleCols.map((col) => /* @__PURE__ */ jsx4("span", { className: "meta-prompt-stat__usage-grid-col-h", children: col.label }, col.key))
    ] }),
    rows.map((row) => /* @__PURE__ */ jsxs3("div", { className: `meta-prompt-stat__usage-grid-row meta-prompt-stat__usage-grid-row--${row.key}`, style: gridStyle, children: [
      !hideRowLabels ? /* @__PURE__ */ jsx4("span", { className: `meta-prompt-stat__usage-group-label meta-prompt-stat__usage-group-label--${row.key}`, children: row.label }) : null,
      visibleCols.map((col) => {
        const metric = row.metrics.find((m) => m.key === col.key);
        const usd = col.key === "reason" ? 0 : metric?.usd ?? 0;
        return /* @__PURE__ */ jsx4(
          UsageMetricCell,
          {
            tok: metric?.tok ?? 0,
            usd,
            showUsd: col.key !== "reason"
          },
          col.key
        );
      })
    ] }, row.key))
  ] });
}
function UsageMetricsGrid(props) {
  return MetaUsageGrid(props);
}
function filterDisplayableImages(list) {
  return (list || []).filter((src) => {
    const s = String(src || "").trim();
    if (!s || /^\[file_id:/i.test(s)) return false;
    return s.startsWith("data:image/") || /^https?:\/\//i.test(s);
  });
}
function MetaDialogImages({ items, onImageClick, topGap = 0 }) {
  const renderable = filterDisplayableImages(items);
  if (!renderable.length) return null;
  return /* @__PURE__ */ jsx4(
    Box2,
    {
      className: "conv-msg-images conv-msg-images--left meta-dialog-images",
      sx: { display: "flex", flexWrap: "wrap", gap: 1, mt: topGap },
      children: renderable.map((src, idx) => /* @__PURE__ */ jsx4(
        "button",
        {
          type: "button",
          className: "conv-msg-image-lightbox-btn",
          "aria-label": `Ver imagen adjunta ${idx + 1} en tama\xF1o completo`,
          onClick: () => onImageClick?.(src),
          children: /* @__PURE__ */ jsx4("img", { src, alt: `Adjunto ${idx + 1}`, loading: "lazy" })
        },
        `${idx}-${src.slice(0, 32)}`
      ))
    }
  );
}
function PromptSummaryCard({ meta, tokens, usageStats, isUserMessage = false }) {
  const promptChars = meta.prompt_chars ?? String(meta.prompt_markdown ?? "").length;
  const responseChars = meta.response_chars;
  const imageCount = filterDisplayableImages(meta.imagenes).length;
  const charStats = [
    ...promptChars ? [{
      key: "prompt-ch",
      label: isUserMessage ? "Caracteres consulta" : "Caracteres prompt",
      value: Number(promptChars).toLocaleString("es-CO"),
      tone: "accent"
    }] : [],
    ...imageCount ? [{ key: "img-n", label: "Im\xE1genes adjuntas", value: String(imageCount), tone: "neutral" }] : [],
    ...typeof responseChars === "number" ? [{ key: "resp-ch", label: "Caracteres respuesta", value: responseChars.toLocaleString("es-CO"), tone: "neutral" }] : []
  ];
  const currentTokens = usageStats?.tokens ?? tokens;
  const currentCost = usageStats?.cost ?? meta?.cost;
  const usageSections = usageStats ? [
    { key: "msg", label: "Mensaje", tokens: usageStats.tokens, cost: usageStats.cost, show: true },
    {
      key: "cum",
      label: "Acumulado",
      tokens: usageStats.cumulativeTokens,
      cost: usageStats.cumulativeCost,
      show: usageHasData(usageStats.cumulativeTokens, usageStats.cumulativeCost)
    }
  ].filter((s) => s.show) : [{ key: "msg", label: "Mensaje", tokens: currentTokens, cost: currentCost, show: usageHasData(currentTokens, currentCost) }];
  const hasUsage = usageSections.some((s) => usageHasData(s.tokens, s.cost));
  const hasCharStats = charStats.length > 0;
  return /* @__PURE__ */ jsxs3(Box2, { className: "meta-prompt-summary", children: [
    hasCharStats || hasUsage ? /* @__PURE__ */ jsxs3(Stack2, { direction: "row", alignItems: "center", spacing: 0.75, className: "meta-prompt-summary__head", children: [
      /* @__PURE__ */ jsx4(
        "iconify-icon",
        {
          icon: isUserMessage ? "mdi:message-text-outline" : "mdi:file-document-edit-outline",
          width: "18",
          height: "18"
        }
      ),
      /* @__PURE__ */ jsx4(Typography2, { variant: "subtitle2", className: "meta-prompt-summary__title", sx: { flex: 1, fontWeight: 700 }, children: isUserMessage ? "Resumen de la consulta" : "Resumen del prompt" }),
      hasUsage ? /* @__PURE__ */ jsx4(
        Chip2,
        {
          size: "small",
          className: "meta-prompt-summary__badge",
          label: isUserMessage ? "tokens + costo" : "tokens + costo",
          icon: /* @__PURE__ */ jsx4("iconify-icon", { icon: "mdi:finance", width: "13", height: "13" })
        }
      ) : null
    ] }) : null,
    /* @__PURE__ */ jsxs3("div", { className: "meta-prompt-summary__grid", children: [
      charStats.map((s) => /* @__PURE__ */ jsxs3("div", { className: `meta-prompt-stat meta-prompt-stat--${s.tone || "neutral"}`, children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-prompt-stat__k", children: s.label }),
        /* @__PURE__ */ jsx4("span", { className: "meta-prompt-stat__v", children: s.value })
      ] }, s.key)),
      hasUsage ? /* @__PURE__ */ jsxs3("div", { className: "meta-prompt-stat meta-prompt-stat--usage", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-prompt-stat__k", children: "Tokens y costo" }),
        /* @__PURE__ */ jsx4("div", { className: "meta-prompt-stat__usage-body", children: /* @__PURE__ */ jsx4(MetaUsageGrid, { sections: usageSections }) })
      ] }) : null
    ] })
  ] });
}
var theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3b82f6" },
    secondary: { main: "#14b8a6" },
    background: { default: "#0f172a", paper: "#1e293b" }
  },
  typography: { fontFamily: '"IBM Plex Sans", system-ui, sans-serif' },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
    MuiTab: { styleOverrides: { root: { textTransform: "none" } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: "none" } } },
    MuiTooltip: {
      defaultProps: { disableInteractive: true },
      styleOverrides: {
        popper: { pointerEvents: "none" },
        tooltip: { pointerEvents: "none" }
      }
    }
  }
});
function shortId(s, head = 10, tail = 4) {
  if (!s) return "";
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}\u2026${s.slice(-tail)}`;
}
function metaWorthDialog(meta, isUser) {
  if (!meta) return false;
  if (!isUser) return true;
  if (String(meta.prompt_markdown ?? "").trim()) return true;
  if (filterDisplayableImages(meta.imagenes).length) return true;
  const tk = meta.tokens?.total ? meta.tokens : tokensFromUsage(meta.usage);
  if (tk?.total > 0 || meta.usage) return true;
  if (meta.latency_ms != null && meta.latency_ms > 0) return true;
  if (meta.itdconsulta || meta.model || meta.premisas?.length) return true;
  if (bdInstructionKey(meta)) return true;
  if (meta.stream_ok === false) return true;
  if (meta.extra?.operativa_key) return true;
  if (Array.isArray(meta.archivos_citados) && meta.archivos_citados.length) return true;
  if (Array.isArray(meta.file_search) && meta.file_search.length) return true;
  if (meta.file_search && typeof meta.file_search === "object" && !Array.isArray(meta.file_search)) return true;
  if (Array.isArray(meta.files_adjuntos) && meta.files_adjuntos.length) return true;
  if (Array.isArray(meta.vector_store_ids) && meta.vector_store_ids.length) return true;
  const pv = meta.prompt_variables;
  if (pv && typeof pv === "object") {
    if (Object.keys(pv).some((k) => k !== "nombre_usuario")) return true;
  }
  return false;
}
function FileSearchMetaSection({ meta }) {
  const { Typography: Typography9, Box: Box12, Stack: Stack7, Chip: Chip5, IconButton: IconButton7, Tooltip: Tooltip6 } = getMaterialUI();
  const { useState: useState12, useMemo: useMemo11 } = getReact();
  const trace = fileSearchFromMeta(meta);
  const archivos = archivosCitadosFromMeta(meta);
  const chunks = useMemo11(() => chunksFromMeta(meta), [meta]);
  const vectorStores = useMemo11(() => vectorStoresFromMeta(meta), [meta]);
  const [expandedKey, setExpandedKey] = useState12(null);
  const [openChunk, setOpenChunk] = useState12(null);
  if (!trace?.length && !archivos.length && !chunks.length && !vectorStores.length) return null;
  function toggleChunk(key) {
    setExpandedKey((prev) => prev === key ? null : key);
  }
  return /* @__PURE__ */ jsxs3(Box12, { className: "meta-file-search", sx: { mt: 1.5 }, children: [
    vectorStores.length ? /* @__PURE__ */ jsxs3(Box12, { className: "meta-file-search__vector-stores meta-vs-card", sx: { mb: 1.5 }, children: [
      /* @__PURE__ */ jsx4(Typography9, { variant: "subtitle2", fontWeight: 700, sx: { mb: 0.5 }, children: "Vector stores" }),
      /* @__PURE__ */ jsxs3(Typography9, { variant: "caption", color: "text.secondary", display: "block", sx: { mb: 0.85, lineHeight: 1.45 }, children: [
        "\xCDndice = posici\xF3n en ",
        /* @__PURE__ */ jsx4("code", { children: "vector_store_ids" }),
        " (0 = primero). Copia el ID para verificar en OpenAI o BD."
      ] }),
      /* @__PURE__ */ jsx4(Stack7, { spacing: 0.5, children: vectorStores.map((vs) => /* @__PURE__ */ jsxs3(
        Box12,
        {
          className: "meta-file-search__vs-row",
          sx: {
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: 0.75,
            fontSize: "0.82rem"
          },
          children: [
            /* @__PURE__ */ jsx4(Chip5, { size: "small", variant: "outlined", label: `\xEDndice ${vs.index}`, className: "meta-file-search__vs-index" }),
            /* @__PURE__ */ jsx4(Typography9, { component: "code", variant: "body2", sx: { wordBreak: "break-all", fontFamily: "monospace" }, children: vs.id })
          ]
        },
        vs.id
      )) })
    ] }) : null,
    /* @__PURE__ */ jsx4(Typography9, { variant: "subtitle2", fontWeight: 700, sx: { mb: 0.75 }, children: "File Search (archivos citados)" }),
    archivos.length ? /* @__PURE__ */ jsx4(Stack7, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, sx: { mb: chunks.length ? 1 : 0 }, children: archivos.map((name) => /* @__PURE__ */ jsx4(
      Chip5,
      {
        size: "small",
        variant: "outlined",
        icon: /* @__PURE__ */ jsx4("iconify-icon", { icon: "mdi:file-document-outline", width: "14", height: "14" }),
        label: name,
        title: name
      },
      name
    )) }) : null,
    chunks.length ? /* @__PURE__ */ jsx4(Stack7, { spacing: 0.5, className: "meta-file-search__chunk-list", children: chunks.map((c) => {
      const expanded = expandedKey === c.key;
      const vsIdx = c.vectorStoreId ? vectorStoreIndexLabel(vectorStores, c.vectorStoreId) : null;
      const label = c.filename || c.fileId || "fragmento";
      return /* @__PURE__ */ jsxs3(
        Box12,
        {
          className: `meta-file-search__chunk${expanded ? " meta-file-search__chunk--expanded" : ""}`,
          children: [
            /* @__PURE__ */ jsxs3(
              Box12,
              {
                className: "meta-file-search__chunk-summary",
                role: "button",
                tabIndex: 0,
                "aria-expanded": expanded,
                title: label,
                onClick: () => toggleChunk(c.key),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleChunk(c.key);
                  }
                },
                children: [
                  /* @__PURE__ */ jsx4("iconify-icon", { icon: "mdi:text-box-search-outline", width: "15", height: "15", "aria-hidden": true }),
                  /* @__PURE__ */ jsx4(Typography9, { variant: "body2", fontWeight: 600, noWrap: true, className: "meta-file-search__chunk-title", children: label }),
                  vsIdx != null ? /* @__PURE__ */ jsx4(
                    Chip5,
                    {
                      size: "small",
                      variant: "outlined",
                      label: `VS ${vsIdx}`,
                      title: c.vectorStoreId || void 0,
                      className: "meta-file-search__vs-chip"
                    }
                  ) : null,
                  c.score != null ? /* @__PURE__ */ jsx4(
                    Chip5,
                    {
                      size: "small",
                      variant: "outlined",
                      label: Number(c.score).toFixed(3),
                      className: "meta-file-search__score"
                    }
                  ) : null,
                  /* @__PURE__ */ jsx4(Tooltip6, { title: "Ver en pantalla completa", children: /* @__PURE__ */ jsx4(
                    IconButton7,
                    {
                      size: "small",
                      "aria-label": `Ver fragmento de ${label}`,
                      className: "meta-file-search__open",
                      onClick: (e) => {
                        e.stopPropagation();
                        setOpenChunk(c);
                      },
                      children: /* @__PURE__ */ jsx4("iconify-icon", { icon: "mdi:fullscreen", width: "15", height: "15" })
                    }
                  ) }),
                  /* @__PURE__ */ jsx4(
                    "iconify-icon",
                    {
                      icon: "mdi:chevron-down",
                      width: "18",
                      height: "18",
                      className: `meta-file-search__chevron${expanded ? " meta-file-search__chevron--open" : ""}`,
                      "aria-hidden": true
                    }
                  )
                ]
              }
            ),
            expanded ? /* @__PURE__ */ jsxs3(Box12, { className: "meta-file-search__chunk-body", children: [
              c.queries?.length ? /* @__PURE__ */ jsxs3(Typography9, { variant: "caption", color: "text.secondary", display: "block", className: "meta-file-search__queries", children: [
                "Queries: ",
                c.queries.join(" \xB7 ")
              ] }) : null,
              /* @__PURE__ */ jsx4(MdRenderer, { source: c.text || "", className: "meta-file-search__md" })
            ] }) : null
          ]
        },
        c.key
      );
    }) }) : null,
    /* @__PURE__ */ jsx4(
      MdFullPageDialog,
      {
        open: Boolean(openChunk),
        onClose: () => setOpenChunk(null),
        source: openChunk?.text || "",
        title: openChunk ? `Fragmento \xB7 ${openChunk.filename || openChunk.fileId || "texto exacto"}` : "Fragmento",
        subtitle: openChunk ? [
          openChunk.vectorStoreId ? `VS \xEDndice ${vectorStoreIndexLabel(vectorStores, openChunk.vectorStoreId) ?? "?"} \xB7 ${openChunk.vectorStoreId}` : "",
          openChunk.score != null ? `score ${Number(openChunk.score).toFixed(3)}` : "",
          openChunk.queries?.length ? `Queries: ${openChunk.queries.join(" \xB7 ")}` : ""
        ].filter(Boolean).join("  \xB7  ") : "",
        accent: "#7c3aed",
        icon: "mdi:text-box-search-outline"
      }
    )
  ] });
}
function FileSearchDialog({ open, onClose, meta, title = "File Search", subtitle = "" }) {
  const { DialogContent: DialogContent4 } = getMaterialUI();
  if (!meta || !metaHasFileSearch(meta)) return null;
  const headerMeta = resolveMetaDialogHeader(title, false);
  return /* @__PURE__ */ jsxs3(GlassDialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsx4(
      GlassDialogHeader,
      {
        icon: headerMeta.icon,
        title: headerMeta.title,
        subtitle: subtitle || "Archivos citados y fragmentos consultados",
        accent: headerMeta.accent,
        onClose
      }
    ),
    /* @__PURE__ */ jsx4(DialogContent4, { dividers: true, sx: glassDialogContentSx(), children: /* @__PURE__ */ jsx4(FileSearchMetaSection, { meta }) }),
    /* @__PURE__ */ jsx4(GlassDialogCloseActions, { onClose })
  ] });
}
function MetaDialog({
  open,
  onClose,
  meta,
  title,
  isUserMessage = false,
  usageStats = null,
  userContent = "",
  imagenes = null,
  logFragment = null,
  showLog = false
}) {
  const [tab, setTab] = useState3(0);
  const [lightboxSrc, setLightboxSrc] = useState3(null);
  const resolvedMeta = useMemo2(() => {
    if (!meta) return null;
    if (!isUserMessage) return meta;
    const text = String(meta.prompt_markdown || userContent || "").trim();
    const imgs = filterDisplayableImages(
      Array.isArray(meta.imagenes) && meta.imagenes.length ? meta.imagenes : imagenes
    );
    return {
      ...meta,
      ...text ? { prompt_markdown: text, prompt_chars: meta.prompt_chars ?? text.length } : {},
      ...imgs.length ? { imagenes: imgs } : {}
    };
  }, [meta, isUserMessage, userContent, imagenes]);
  const promptMarkdown = String(resolvedMeta?.prompt_markdown ?? "").trim();
  const userImagenes = filterDisplayableImages(resolvedMeta?.imagenes);
  const iinstruccion = bdInstructionKey(resolvedMeta) || String(resolvedMeta?.extra?.operativa_key ?? "").trim();
  const isMcpOperativa = /^contapymeMcp(Login|Session|Unavailable)$/i.test(iinstruccion) || String(resolvedMeta?.extra?.operativa_engine || "").toLowerCase() === "mcp" || Boolean(resolvedMeta?.http_request?.session_id || resolvedMeta?.http_request?.login_url || resolvedMeta?.http_response?.tools);
  const hasPrompt = Boolean(promptMarkdown) || Boolean(iinstruccion) || userImagenes.length > 0;
  const promptTabLabel = isUserMessage ? "Consulta" : isMcpOperativa ? "Payload MCP" : "Prompt";
  const filesAdjuntos = Array.isArray(resolvedMeta?.files_adjuntos) && resolvedMeta.files_adjuntos.length ? resolvedMeta.files_adjuntos : logFragment?.others?.files_adjuntos || null;
  const canShowLog = Boolean(showLog && logFragment);
  const tabCount = (hasPrompt ? 2 : 1) + (canShowLog ? 1 : 0);
  useEffect3(() => {
    if (open) setTab(0);
  }, [open, resolvedMeta?.ts, resolvedMeta?.prompt_id, promptMarkdown, userImagenes.length]);
  useEffect3(() => {
    if (!open) setLightboxSrc(null);
  }, [open]);
  if (!resolvedMeta && !(showLog && logFragment)) return null;
  const tk = resolvedMeta?.tokens?.total ? resolvedMeta.tokens : tokensFromUsage(resolvedMeta?.usage);
  const httpReq = resolvedMeta?.http_request && typeof resolvedMeta.http_request === "object" ? resolvedMeta.http_request : null;
  const httpRes = resolvedMeta?.http_response && typeof resolvedMeta.http_response === "object" ? resolvedMeta.http_response : null;
  function renderMetaGrid() {
    if (!resolvedMeta) {
      return /* @__PURE__ */ jsx4("div", { className: "meta-grid meta-dialog-panel", children: /* @__PURE__ */ jsx4(Typography2, { variant: "body2", color: "text.secondary", children: "Sin trazabilidad en este mensaje. Abre la pesta\xF1a Log." }) });
    }
    return /* @__PURE__ */ jsxs3("div", { className: "meta-grid meta-dialog-panel", children: [
      resolvedMeta.nombre_usuario && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Nombre" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: /* @__PURE__ */ jsx4("strong", { children: resolvedMeta.nombre_usuario }) })
      ] }),
      resolvedMeta.itdconsulta && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Consulta" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: /* @__PURE__ */ jsx4("span", { className: "badge badge-itd", children: resolvedMeta.itdconsulta }) })
      ] }),
      !isUserMessage && iinstruccion && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: isMcpOperativa ? "Operativa" : "Instrucci\xF3n" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: /* @__PURE__ */ jsx4("code", { children: iinstruccion }) })
      ] }),
      isMcpOperativa && resolvedMeta.extra?.operativa_engine && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Engine" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: /* @__PURE__ */ jsx4("code", { children: String(resolvedMeta.extra.operativa_engine) }) })
      ] }),
      isMcpOperativa && httpReq?.session_id && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Session" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: /* @__PURE__ */ jsx4("code", { children: String(httpReq.session_id) }) })
      ] }),
      isMcpOperativa && httpReq?.transport && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Transport" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: /* @__PURE__ */ jsx4("code", { children: String(httpReq.transport) }) })
      ] }),
      isMcpOperativa && httpRes?.kind && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Kind" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: /* @__PURE__ */ jsx4("span", { className: "badge badge-itd", children: String(httpRes.kind) }) })
      ] }),
      isMcpOperativa && Array.isArray(httpRes?.tools) && httpRes.tools.length > 0 && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Tools" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: httpRes.tools.map((t) => String(t?.name ?? "tool")).filter(Boolean).join(", ") })
      ] }),
      isMcpOperativa && resolvedMeta.login_url && /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Login" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", style: { wordBreak: "break-all" }, children: String(resolvedMeta.login_url) })
      ] }),
      resolvedMeta.premisas?.length ? /* @__PURE__ */ jsxs3("div", { className: "meta-row", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "Premisas" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v", children: resolvedMeta.premisas.join(", ") })
      ] }) : null,
      resolvedMeta.usage && /* @__PURE__ */ jsxs3("div", { className: "meta-row meta-row--block", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "usage" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v meta-v--full", children: /* @__PURE__ */ jsx4(
          CodeMirrorPanel,
          {
            value: JSON.stringify(resolvedMeta.usage, null, 2),
            readOnly: true,
            json: true,
            minHeight: "5rem",
            maxHeight: "18rem",
            lineWrapping: true
          }
        ) })
      ] }),
      isMcpOperativa && httpReq && /* @__PURE__ */ jsxs3("div", { className: "meta-row meta-row--block", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "http_request" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v meta-v--full", children: /* @__PURE__ */ jsx4(
          CodeMirrorPanel,
          {
            value: JSON.stringify(httpReq, null, 2),
            readOnly: true,
            json: true,
            minHeight: "6rem",
            maxHeight: "22rem",
            lineWrapping: true
          }
        ) })
      ] }),
      isMcpOperativa && httpRes && /* @__PURE__ */ jsxs3("div", { className: "meta-row meta-row--block", children: [
        /* @__PURE__ */ jsx4("span", { className: "meta-k", children: "http_response" }),
        /* @__PURE__ */ jsx4("span", { className: "meta-v meta-v--full", children: /* @__PURE__ */ jsx4(
          CodeMirrorPanel,
          {
            value: JSON.stringify(httpRes, null, 2),
            readOnly: true,
            json: true,
            minHeight: "6rem",
            maxHeight: "22rem",
            lineWrapping: true
          }
        ) })
      ] }),
      filesAdjuntos?.length ? /* @__PURE__ */ jsx4(MetaFilesStrip, { files: filesAdjuntos }) : null,
      /* @__PURE__ */ jsx4(FileSearchMetaSection, { meta: resolvedMeta })
    ] });
  }
  const headerMeta = resolveMetaDialogHeader(title, isUserMessage);
  return /* @__PURE__ */ jsxs3(Fragment, { children: [
    /* @__PURE__ */ jsxs3(
      GlassDialog,
      {
        open,
        onClose,
        maxWidth: "md",
        fullWidth: true,
        header: /* @__PURE__ */ jsx4(
          GlassDialogHeader,
          {
            icon: headerMeta.icon,
            title: headerMeta.title,
            subtitle: headerMeta.subtitle,
            accent: headerMeta.accent,
            onClose
          }
        ),
        children: [
          (hasPrompt || canShowLog) && /* @__PURE__ */ jsxs3(Tabs, { value: tab, onChange: (_, next) => setTab(next), sx: glassDialogTabsSx(), children: [
            /* @__PURE__ */ jsx4(Tab, { label: "Trazabilidad" }),
            hasPrompt ? /* @__PURE__ */ jsx4(Tab, { label: promptTabLabel }) : null,
            canShowLog ? /* @__PURE__ */ jsx4(Tab, { label: "Log" }) : null
          ] }),
          /* @__PURE__ */ jsxs3(DialogContent, { dividers: true, sx: glassDialogContentSx(), children: [
            /* @__PURE__ */ jsx4(Box2, { sx: { display: tab === 0 || tabCount <= 1 ? "block" : "none", minHeight: 0 }, children: renderMetaGrid() }),
            hasPrompt && /* @__PURE__ */ jsx4(Box2, { sx: { display: tab === 1 ? "block" : "none", minHeight: 0, flex: 1 }, children: /* @__PURE__ */ jsx4(
              PromptPanelBody,
              {
                resolvedMeta,
                tk,
                usageStats,
                isUserMessage,
                promptMarkdown,
                userImagenes,
                setLightboxSrc,
                iinstruccion,
                dialogTitle: headerMeta.subtitle || headerMeta.title,
                isMcpOperativa
              }
            ) }),
            canShowLog && /* @__PURE__ */ jsx4(Box2, { sx: { display: tab === (hasPrompt ? 2 : 1) ? "block" : "none", minHeight: 0 }, children: /* @__PURE__ */ jsx4("div", { className: "meta-prompt-panel custom-scrollbar", children: /* @__PURE__ */ jsx4(LogJsonPanel, { value: logFragment, files: filesAdjuntos }) }) })
          ] }),
          /* @__PURE__ */ jsx4(GlassDialogCloseActions, { onClose })
        ]
      }
    ),
    /* @__PURE__ */ jsx4(ImageLightboxDialog, { open: Boolean(lightboxSrc), src: lightboxSrc, onClose: () => setLightboxSrc(null) })
  ] });
}
function PromptPanelBody({
  resolvedMeta,
  tk,
  usageStats,
  isUserMessage,
  promptMarkdown,
  userImagenes,
  setLightboxSrc,
  iinstruccion,
  dialogTitle,
  isMcpOperativa = false
}) {
  const [fullPage, setFullPage] = useState3(false);
  const exactTitle = isUserMessage ? "Consulta \xB7 texto exacto" : isMcpOperativa ? "Payload MCP \xB7 request / respuesta" : "Prompt \xB7 texto exacto";
  const emptyCopy = isUserMessage ? "Sin texto ni im\xE1genes en el log de este mensaje." : isMcpOperativa ? "Sin payload MCP (input / session_id / tools) en el log de este turno." : "Sin texto de instrucciones en el log de este turno.";
  return /* @__PURE__ */ jsxs3("div", { className: "meta-prompt-panel custom-scrollbar", children: [
    /* @__PURE__ */ jsx4(PromptSummaryCard, { meta: resolvedMeta, tokens: tk, usageStats, isUserMessage }),
    promptMarkdown ? /* @__PURE__ */ jsxs3(Box2, { className: "meta-prompt-exact-wrap", children: [
      /* @__PURE__ */ jsxs3(Stack2, { direction: "row", alignItems: "center", spacing: 0.75, sx: { mb: 0.75 }, children: [
        /* @__PURE__ */ jsx4("iconify-icon", { icon: isMcpOperativa ? "mdi:api" : "mdi:file-document-outline", width: "18", height: "18" }),
        /* @__PURE__ */ jsx4(Typography2, { variant: "subtitle1", sx: { flex: 1, fontWeight: 700 }, children: exactTitle }),
        /* @__PURE__ */ jsx4(
          Chip2,
          {
            size: "small",
            clickable: true,
            onClick: () => setFullPage(true),
            className: "meta-prompt-exact-preview__open",
            label: "Ver full-page",
            icon: /* @__PURE__ */ jsx4("iconify-icon", { icon: "mdi:fullscreen", width: "14", height: "14" })
          }
        ),
        /* @__PURE__ */ jsx4(
          Chip2,
          {
            size: "small",
            clickable: true,
            onClick: () => {
              try {
                if (navigator.clipboard?.writeText) navigator.clipboard.writeText(promptMarkdown);
              } catch {
              }
            },
            className: "meta-prompt-exact-preview__copy",
            label: "Copiar",
            icon: /* @__PURE__ */ jsx4("iconify-icon", { icon: "mdi:content-copy", width: "14", height: "14" })
          }
        )
      ] }),
      /* @__PURE__ */ jsx4(Box2, { className: "meta-prompt-exact-preview__body isa-md-content", children: /* @__PURE__ */ jsx4(MdRenderer, { source: promptMarkdown }) }),
      /* @__PURE__ */ jsx4(
        MdFullPageDialog,
        {
          open: fullPage,
          onClose: () => setFullPage(false),
          source: promptMarkdown,
          title: exactTitle,
          subtitle: dialogTitle || (isUserMessage ? "Vista consulta full-page" : "Vista prompt full-page"),
          icon: isUserMessage ? "mdi:message-text-outline" : isMcpOperativa ? "mdi:api" : "mdi:file-document-outline",
          accent: isUserMessage ? "#1e90ff" : isMcpOperativa ? "#f59e0b" : "#22c55e"
        }
      )
    ] }) : null,
    userImagenes.length ? /* @__PURE__ */ jsx4(MetaDialogImages, { items: userImagenes, onImageClick: setLightboxSrc, topGap: promptMarkdown ? 1.25 : 0 }) : null,
    !promptMarkdown && !userImagenes.length ? /* @__PURE__ */ jsx4(Typography2, { variant: "body2", color: "text.secondary", children: emptyCopy }) : null
  ] });
}
function MdRenderer({ source, className = "" }) {
  const html = mdToHtml(String(source ?? ""));
  return /* @__PURE__ */ jsx4(
    "div",
    {
      className: `md-renderer isa-md-content ${className}`.trim(),
      dangerouslySetInnerHTML: { __html: html }
    }
  );
}
function MdFullPageDialog({
  open,
  onClose,
  source,
  title = "Visor full-page",
  subtitle = "",
  accent = "#1e90ff",
  icon = "mdi:file-document-outline"
}) {
  const { Dialog: Dialog2, DialogTitle: DialogTitle2, DialogContent: DialogContent4, IconButton: IconButton7, Typography: Typography9, Box: Box12 } = getMaterialUI();
  const { Icon: Icon11 } = UI;
  const html = mdToHtml(String(source ?? ""));
  return /* @__PURE__ */ jsxs3(
    Dialog2,
    {
      open: Boolean(open),
      onClose,
      fullScreen: true,
      scroll: "paper",
      className: "md-full-page-dialog",
      PaperProps: {
        sx: {
          backgroundImage: (theme2) => `linear-gradient(160deg, ${theme2.palette.mode === "light" ? "#f8fbff" : "#0b1220"} 0%, ${theme2.palette.mode === "light" ? "#e8f1ff" : "#0f1a30"} 100%)`
        }
      },
      children: [
        /* @__PURE__ */ jsxs3(
          DialogTitle2,
          {
            className: "md-full-page-dialog__head",
            sx: {
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderBottom: 1,
              borderColor: "divider",
              py: 0.75,
              px: { xs: 1.5, sm: 2 },
              minHeight: 0
            },
            children: [
              /* @__PURE__ */ jsx4(
                Box12,
                {
                  sx: {
                    width: 28,
                    height: 28,
                    borderRadius: "0.4rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${accent}44`
                  },
                  children: /* @__PURE__ */ jsx4(Icon11, { icon, size: 16 })
                }
              ),
              /* @__PURE__ */ jsxs3(Box12, { sx: { flex: 1, minWidth: 0, lineHeight: 1.2 }, children: [
                /* @__PURE__ */ jsx4(Typography9, { variant: "subtitle1", fontWeight: 700, noWrap: true, sx: { lineHeight: 1.25, fontSize: "0.95rem" }, children: title }),
                subtitle ? /* @__PURE__ */ jsx4(Typography9, { variant: "caption", color: "text.secondary", noWrap: true, sx: { display: "block", lineHeight: 1.3, mt: 0.15, fontSize: "0.72rem" }, children: subtitle }) : null
              ] }),
              /* @__PURE__ */ jsx4(IconButton7, { onClick: onClose, "aria-label": "Cerrar visor", size: "small", sx: { p: 0.5 }, children: /* @__PURE__ */ jsx4("iconify-icon", { icon: "mdi:close", width: "16", height: "16" }) })
            ]
          }
        ),
        /* @__PURE__ */ jsx4(
          DialogContent4,
          {
            dividers: true,
            sx: {
              px: { xs: 2, sm: 3, md: 4, lg: 5 },
              py: { xs: 2, sm: 2.5, md: 3 },
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box"
            },
            children: /* @__PURE__ */ jsx4(
              "div",
              {
                className: "md-full-page-dialog__body isa-md-content",
                dangerouslySetInnerHTML: { __html: html }
              }
            )
          }
        )
      ]
    }
  );
}

// src/js/tools/chat/useChatTool.ts
init_platform();
init_patyia_jwt();
init_patyiaChatApi();

// src/js/api/adjuntosApi.ts
init_patyia();
init_patyiaTokens();
var DEFAULT_CONCURRENCY = 3;
function unwrapIss(raw) {
  const d = raw;
  const enc = d?.encabezado;
  if (enc && typeof enc === "object" && enc.resultado === false) {
    throw new Error(String(enc.mensaje || "Error en la respuesta del servidor"));
  }
  if (d?.respuesta && typeof d.respuesta === "object" && !Array.isArray(d.respuesta)) return d.respuesta;
  if (d?.body && typeof d.body === "object" && !Array.isArray(d.body)) return d.body;
  return d;
}
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function variantUrl(v) {
  const u = String(v?.url || "").trim();
  return u || void 0;
}
function rowToAdjunto(row, fallbackName, kind) {
  const variants = row.jfile?.variants;
  const original = variants?.original;
  const url = original?.url || variants?.med?.url;
  if (!url) throw new Error("ISS file/upload sin variants.original.url");
  const variantUrls = {
    ...variantUrl(variants?.thumb) ? { thumb: variantUrl(variants?.thumb) } : {},
    ...variantUrl(variants?.med) ? { med: variantUrl(variants?.med) } : {},
    ...variantUrl(original) ? { original: variantUrl(original) } : {}
  };
  return {
    key: String(original?.key || ""),
    url: String(url),
    mime: String(original?.mime || row.jfile?.mime || "application/octet-stream"),
    bytes: Number(original?.bytes ?? row.jfile?.meta?.sizeBytes ?? 0),
    filename: String(row.jfile?.filename || fallbackName),
    ifile: row.ifile ? String(row.ifile) : void 0,
    kind,
    ...Object.keys(variantUrls).length ? { variants: variantUrls } : {}
  };
}
async function uploadOneFile(kind, jwt, file, signal) {
  const base = resolveIssApiBase();
  const headers = { "Content-Type": "application/json", ...jwt ? patyAuthHeaders(jwt) : {} };
  const buf = await file.arrayBuffer();
  const mime = (file.type || (kind === "audio" ? "audio/webm" : "image/jpeg")).split(";")[0].trim();
  const res = await fetch(`${base}/api/file/upload`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      kind,
      mime,
      filename: file.name || `${kind}-${Date.now()}`,
      base64: arrayBufferToBase64(buf)
    })
  });
  const ct = res.headers.get("content-type") || "";
  const json = ct.includes("json") ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    const err = json && typeof json === "object" && (json.error || json.message) || `HTTP ${res.status}`;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }
  const row = unwrapIss(json);
  return rowToAdjunto(row, file.name || kind, kind);
}
async function uploadFiles(kind, jwt, input) {
  const { files, concurrency = DEFAULT_CONCURRENCY, onProgress, signal } = input;
  if (!files?.length) return [];
  const results = new Array(files.length);
  let cursor = 0;
  const totalBytes = files.reduce((s, f) => s + (f?.size || 0), 0);
  let loadedBytes = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= files.length) return;
      const f = files[i];
      try {
        results[i] = await uploadOneFile(kind, jwt, f, signal);
        loadedBytes += f.size;
        onProgress?.({ loaded: loadedBytes, total: totalBytes, fileIndex: i });
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        throw new Error(`Subida fall\xF3 (${f.name || i}): ${err?.message || err}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  return results;
}
async function uploadAudios(jwt, files, onProgress, signal) {
  return uploadFiles("audio", jwt, { files, onProgress, signal });
}
async function uploadImagenes(jwt, files, onProgress, signal) {
  return uploadFiles("imagen", jwt, { files, onProgress, signal });
}
function chatRefsFromAdjuntos(items, kind) {
  return items.map((i) => {
    if (!i.ifile) return i.url;
    return {
      url: i.url,
      ifile: i.ifile,
      kind: i.kind || kind,
      ...i.variants ? { variants: i.variants } : {}
    };
  }).filter((r) => typeof r === "string" ? Boolean(r) : Boolean(r.url));
}

// src/js/tools/chat/useChatTool.ts
init_issListFilter();
init_apiClient();
init_sessionApi();
init_platform();

// src/js/core/urlState.ts
init_patyia();
var STATE_VERSION = 1;
function normalizeLog(raw) {
  if (!raw || typeof raw !== "object") return {};
  const o = { ...raw };
  const w = Number(o.sidebarW);
  if (Number.isFinite(w) && w > 0) o.sidebarW = Math.round(w);
  else delete o.sidebarW;
  return o;
}
function initial() {
  return { v: STATE_VERSION, tool: "home", log: {}, prompts: {}, chat: { pane: "conv" }, todos: {}, config: { pane: "prompts" } };
}
function normalizeChatPane(raw) {
  return raw === "logs" ? "logs" : "conv";
}
function normalizeConfigPane(raw) {
  if (raw === "permisos") return "permisos";
  if (raw === "sistema") return "sistema";
  return "prompts";
}
function legacyConfigPaneFromLs() {
  try {
    const v = localStorage.getItem("isa-patyia:config-tab");
    if (v === "permisos" || v === "sistema" || v === "prompts") return v;
    return "prompts";
  } catch {
    return "prompts";
  }
}
function normalizeTool(raw) {
  if (raw === "log") return "chat";
  if (raw === "prompts") return "config";
  if (raw === "home") return "home";
  if (raw === "chat") return "chat";
  if (raw === "todos") return "todos";
  if (raw === "config") return "config";
  return "home";
}
function normalizeChatBag(chat, legacyTool) {
  const bag = chat && typeof chat === "object" ? { ...chat } : {};
  if ((bag.mode == null || String(bag.mode).trim() === "") && bag.jailbreak != null) {
    bag.mode = bag.jailbreak === true ? "libre" : "patyia";
    delete bag.jailbreak;
  } else if (bag.jailbreak != null) {
    delete bag.jailbreak;
  }
  if (legacyTool === "log") {
    bag.pane = "logs";
  } else {
    bag.pane = normalizeChatPane(bag.pane);
  }
  return bag;
}
function normalizeConfigBag(config, legacyTool) {
  const bag = config && typeof config === "object" ? { ...config } : {};
  if (legacyTool === "prompts") {
    bag.pane = "prompts";
  } else if (bag.pane !== "sistema" && bag.pane !== "permisos" && bag.pane !== "prompts") {
    bag.pane = legacyConfigPaneFromLs();
  } else {
    bag.pane = normalizeConfigPane(bag.pane);
  }
  return bag;
}
function normalize(raw, _prev) {
  if (!raw || typeof raw !== "object") return initial();
  const legacyTool = raw.tool;
  const tool = normalizeTool(legacyTool);
  const chat = normalizeChatBag(raw.chat, legacyTool);
  const todos = raw.todos && typeof raw.todos === "object" ? raw.todos : {};
  const config = normalizeConfigBag(raw.config, legacyTool);
  return {
    v: raw.v ?? STATE_VERSION,
    tool,
    log: normalizeLog(raw.log),
    prompts: raw.prompts && typeof raw.prompts === "object" ? raw.prompts : {},
    chat,
    todos,
    config
  };
}
function slimForUrl(src) {
  const slim = { ...src };
  const log = slim.log;
  if (log) {
    const nextLog = { ...log };
    if (nextLog.jsonInput && String(nextLog.jsonInput).length > 4e3) {
      slim.log = {
        convId: nextLog.convId || "",
        ...nextLog.sidebarW != null ? { sidebarW: nextLog.sidebarW } : {}
      };
    } else {
      slim.log = nextLog;
    }
  }
  const prompts = slim.prompts;
  if (prompts?.bodies) {
    const bodies = {};
    let total = 0;
    for (const [k, v] of Object.entries(prompts.bodies)) {
      const t = String(v ?? "");
      if (total + t.length > 6e3) break;
      bodies[k] = t;
      total += t.length;
    }
    slim.prompts = { ...prompts, bodies };
  }
  return slim;
}
function mergeConfig(state, partial) {
  const prev = state.config && typeof state.config === "object" ? { ...state.config } : {};
  const next = partial && typeof partial === "object" ? partial : {};
  const prevPermisos = prev.permisos && typeof prev.permisos === "object" ? { ...prev.permisos } : {};
  const nextPermisos = next.permisos && typeof next.permisos === "object" ? next.permisos : null;
  return {
    ...prev,
    ...next,
    ...nextPermisos ? { permisos: { ...prevPermisos, ...nextPermisos } } : {}
  };
}
function merge(state, partial) {
  const nextLog = { ...state.log, ...partial.log || {} };
  if ("jsonInput" in nextLog) delete nextLog.jsonInput;
  return {
    ...state,
    ...partial,
    log: nextLog,
    prompts: {
      ...state.prompts,
      ...partial.prompts || {}
    },
    chat: {
      ...state.chat,
      ...partial.chat || {}
    },
    todos: {
      ...state.todos,
      ...partial.todos || {}
    },
    config: mergeConfig(state, partial.config)
  };
}
var URL_STATE_PARAM = "s";
function stripUrlStateParam() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has(URL_STATE_PARAM)) return;
    url.searchParams.delete(URL_STATE_PARAM);
    history.replaceState(null, "", url);
  } catch {
  }
}
function migrateLegacyFlatQuery() {
  if (typeof window === "undefined" || !window.ISAFront?.b64urlEncode) return;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has(URL_STATE_PARAM)) return;
    const tool = url.searchParams.get("tool");
    const legacyKeys = [...url.searchParams.keys()].filter(
      (k) => k === "tool" || k === "local" || k.includes(".")
    );
    if (!legacyKeys.length) return;
    const next = {
      v: STATE_VERSION,
      tool: normalizeTool(tool),
      log: {},
      prompts: {},
      chat: {},
      todos: {},
      config: {}
    };
    for (const [key, raw] of url.searchParams.entries()) {
      if (key === "tool" || key === "local") continue;
      const dot = key.indexOf(".");
      if (dot < 0) continue;
      const section = key.slice(0, dot);
      const field = key.slice(dot + 1);
      if (section !== "log" && section !== "prompts" && section !== "chat" && section !== "todos") continue;
      const bag = next[section] || {};
      if (field === "convId" && (section === "chat" || section === "log")) {
        const n = Number(raw);
        bag.convId = Number.isFinite(n) && n > 0 ? n : String(raw ?? "").trim();
      } else if (field === "mode") {
        bag.mode = String(raw ?? "").trim().toLowerCase() || "patyia";
      } else if (field === "jailbreak") {
        bag.mode = raw === "1" || raw === "true" ? "libre" : "patyia";
      } else if (field === "boardId" || field === "milestoneId" || field === "taskId") {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) bag[field] = n;
      } else {
        bag[field] = raw;
      }
      next[section] = bag;
    }
    legacyKeys.forEach((k) => url.searchParams.delete(k));
    const slim = slimForUrl(next);
    const json = JSON.stringify(slim);
    if (json !== "{}") url.searchParams.set(URL_STATE_PARAM, window.ISAFront.b64urlEncode(json));
    history.replaceState(null, "", url);
  } catch {
  }
}
migrateLegacyFlatQuery();
var urlState = window.ISAFront.createUrlState({
  param: URL_STATE_PARAM,
  debounceMs: 350,
  maxB64Len: 12e3,
  historyKey: "patyAppState",
  initial,
  normalize,
  slimForUrl,
  merge,
  onInit() {
    ensureIssLocalDefault();
  },
  brandHomeReset(api) {
    const snap = api.reset();
    stripUrlStateParam();
    return snap;
  }
});
var bootState = urlState.boot;
var getSnapshot = urlState.getSnapshot;
var mergePartial = urlState.mergePartial;
var hrefFor = urlState.hrefFor;
var subscribe = urlState.subscribe;
var PARAM = urlState.PARAM;
function persistChatConvId(convId) {
  const snap = getSnapshot();
  const id = convId != null && Number(convId) > 0 ? Number(convId) : null;
  const prev = Number(snap.chat?.convId) || null;
  if (prev === id) return snap;
  return mergePartial({ tool: "chat", chat: { convId: id } });
}
function persistChatMessageSource(source) {
  const snap = getSnapshot();
  const prev = snap.chat?.messageSource;
  if (prev === source) return snap;
  return mergePartial({ tool: "chat", chat: { messageSource: source } });
}
function persistChatMode(mode) {
  const normalized = String(mode || "patyia").trim().toLowerCase() || "patyia";
  const snap = getSnapshot();
  const prev = String(snap.chat?.mode || "patyia");
  if (prev === normalized) return snap;
  return mergePartial({ tool: "chat", chat: { mode: normalized } });
}
function persistChatLlmProvider(provider) {
  const normalized = String(provider || "openai").trim().toLowerCase() || "openai";
  const snap = getSnapshot();
  const prev = String(snap.chat?.provider || "openai").toLowerCase();
  if (prev === normalized) return snap;
  if (normalized === "openai") {
    return mergePartial({ tool: "chat", chat: { provider: void 0 } });
  }
  return mergePartial({ tool: "chat", chat: { provider: normalized } });
}

// src/js/tools/chat/constants.ts
var CHAT_SIDEBAR_W = 320;
var MAX_CHAT_IMAGES = 10;
var MAX_CHAT_AUDIOS = 5;
var TERCEROS_AUDIT_PAGE_SIZE = 15;
var CONV_LIST_PAGE_SIZE_OPTIONS = [30, 15, 50];
var CONV_LIST_PAGE_SIZE_LS_KEY = "patyia:chat:conv-list-page-size:v2";
var CONV_LIST_PAGE_SIZE_LS_KEY_LEGACY = "patyia:chat:conv-list-page-size";
var CONV_LIST_PAGE_SIZE_DEFAULT = 30;
function parseConvListPageSize(raw) {
  if (raw == null || raw === "") return CONV_LIST_PAGE_SIZE_DEFAULT;
  const n = Number(raw);
  return CONV_LIST_PAGE_SIZE_OPTIONS.includes(n) ? n : CONV_LIST_PAGE_SIZE_DEFAULT;
}
function readConvListPageSize() {
  try {
    const stored = localStorage.getItem(CONV_LIST_PAGE_SIZE_LS_KEY);
    if (stored != null && stored !== "") return parseConvListPageSize(stored);
    const legacy = localStorage.getItem(CONV_LIST_PAGE_SIZE_LS_KEY_LEGACY);
    if (legacy === "50") {
      persistConvListPageSize(50);
      return 50;
    }
    return CONV_LIST_PAGE_SIZE_DEFAULT;
  } catch {
    return CONV_LIST_PAGE_SIZE_DEFAULT;
  }
}
function persistConvListPageSize(size) {
  try {
    localStorage.setItem(CONV_LIST_PAGE_SIZE_LS_KEY, String(size));
  } catch {
  }
}
var CHAT_MODE_PATYIA = "patyia";
var CHAT_MODE_LIBRE = "libre";
var CHAT_PROVIDER_OPENAI = "openai";
var CHAT_PROVIDER_MINIMAX = "minimax";
function parseChatLlmProvider(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === CHAT_PROVIDER_MINIMAX || t === "mini-max" || t === "mm") return CHAT_PROVIDER_MINIMAX;
  return CHAT_PROVIDER_OPENAI;
}
function isMinimaxChatProvider(provider) {
  return parseChatLlmProvider(provider) === CHAT_PROVIDER_MINIMAX;
}
var CHAT_PROVIDER_DEFAULT = CHAT_PROVIDER_OPENAI;
function parseChatMode(raw) {
  if (typeof raw === "string") {
    const m = raw.trim().toLowerCase();
    if (m === CHAT_MODE_LIBRE || m === "free") return CHAT_MODE_LIBRE;
    if (m === CHAT_MODE_PATYIA) return CHAT_MODE_PATYIA;
    if (m) return m;
  }
  if (raw === true || raw === 1 || String(raw ?? "").toLowerCase() === "true") return CHAT_MODE_LIBRE;
  if (raw === false || raw === 0 || String(raw ?? "").toLowerCase() === "false") return CHAT_MODE_PATYIA;
  return CHAT_MODE_PATYIA;
}
function isLibreChatMode(mode) {
  return parseChatMode(mode) === CHAT_MODE_LIBRE;
}
function chatBagMode(chat) {
  if (!chat) return null;
  if (chat.mode != null && String(chat.mode).trim() !== "") return parseChatMode(chat.mode);
  if (chat.jailbreak === true) return CHAT_MODE_LIBRE;
  if (chat.jailbreak === false) return CHAT_MODE_PATYIA;
  return null;
}
function readChatMode(bootChat) {
  if (bootChat) {
    if (bootChat.mode != null && String(bootChat.mode).trim() !== "") return parseChatMode(bootChat.mode);
    if (bootChat.jailbreak === true) return CHAT_MODE_LIBRE;
    if (bootChat.jailbreak === false) return CHAT_MODE_PATYIA;
  }
  const chat = getSnapshot().chat;
  return chatBagMode(chat) ?? CHAT_MODE_PATYIA;
}
function chatModeFromUrl(chat) {
  return chatBagMode(chat);
}
function readChatMessageSource(bootChat) {
  if (bootChat?.messageSource === "prod" || bootChat?.messageSource === "logs") return bootChat.messageSource;
  const chat = getSnapshot().chat;
  if (chat?.messageSource === "prod" || chat?.messageSource === "logs") return chat.messageSource;
  return "logs";
}
function messageSourceFromUrl(chat) {
  if (chat?.messageSource === "prod" || chat?.messageSource === "logs") return chat.messageSource;
  return null;
}

// src/js/tools/chat/threadScroll.ts
init_platform();
var { useEffect: useEffect4, useLayoutEffect, useCallback, useRef: useRef2, useMemo: useMemo3 } = getReact();
var THREAD_SCROLL_NEAR_BOTTOM = 72;
function useThreadScrollAnchor(scrollRef, mensajes, { sending = false } = {}) {
  const snapshotRef = useRef2(null);
  const mensajesKey = useMemo3(
    () => (mensajes || []).map((m) => m.idMsg === "stream-live" ? `${m.idMsg}:${String(m.contenido || "").length}` : m.idMsg).join("|"),
    [mensajes]
  );
  const captureSnapshot = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    snapshotRef.current = {
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight
    };
  }, [scrollRef]);
  const applyScrollAnchor = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const snap = snapshotRef.current;
    const distBottom = snap ? snap.scrollHeight - snap.scrollTop - snap.clientHeight : 0;
    const pinBottom = sending || !snap || distBottom <= THREAD_SCROLL_NEAR_BOTTOM;
    if (pinBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTop = Math.max(0, el.scrollHeight - distBottom - el.clientHeight);
    }
    captureSnapshot();
  }, [scrollRef, sending, captureSnapshot]);
  const onThreadScroll = useCallback(() => {
    captureSnapshot();
  }, [captureSnapshot]);
  useLayoutEffect(() => {
    applyScrollAnchor();
  }, [mensajesKey, sending, applyScrollAnchor]);
  useEffect4(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return void 0;
    const ro = new ResizeObserver(() => {
      applyScrollAnchor();
    });
    for (const child of el.children) ro.observe(child);
    return () => ro.disconnect();
  }, [mensajesKey, applyScrollAnchor, scrollRef]);
  return onThreadScroll;
}

// src/js/tools/chat/auditScope.ts
init_patyia_jwt();
function auditScopeKey(scope) {
  if (!scope) return "";
  return `${scope.itercero}|${scope.icontacto}`;
}
function auditScopeIsOwnJwt(scope, claims) {
  if (!claims?.itercero) return !scope;
  if (!scope) return true;
  return convBelongsToJwt(scope, claims);
}
function mergeConvOwnerFields(conv, row, scope) {
  return {
    itercero: conv?.itercero ?? row?.itercero ?? scope?.itercero,
    icontacto: conv?.icontacto ?? row?.icontacto ?? scope?.icontacto
  };
}
function convBelongsToJwtResolved(conv, row, scope, claims, strictOwner = false) {
  const owner = mergeConvOwnerFields(conv, row, scope);
  const t = String(owner.itercero ?? "").trim();
  if (!t) return strictOwner ? false : true;
  return convBelongsToJwt(owner, claims);
}
function resolveOwnerDisplayName(jwt, displayScope) {
  const scopeName = String(displayScope?.nombre ?? "").trim();
  if (scopeName) return scopeName;
  const actingName = String(jwt?.actingAsDisplayName ?? "").trim();
  if (actingName) return actingName;
  return jwtUserDisplayName(jwt?.claims) || jwtUserShortName(jwt?.claims) || "";
}
function displayNick(value) {
  return String(value ?? "").trim().toUpperCase().split("@")[0];
}
function resolveOwnerNickname(jwt, sessionUser) {
  const acting = displayNick(jwt?.actingAsUsername);
  if (acting) return acting;
  const saved = displayNick(jwt?.savedBy);
  if (saved) return saved;
  return displayNick(sessionUser);
}
function convOwnerCodesLabel(scope) {
  const t = String(scope?.itercero ?? "").trim();
  const c = String(scope?.icontacto ?? "").trim();
  if (t && c) return `${t} \xB7 ${c}`;
  return t || c || "";
}
function convOwnerDisplayLabel(scope, jwt, sessionUser) {
  const nick = resolveOwnerNickname(jwt, sessionUser);
  if (nick) return nick;
  const codes = convOwnerCodesLabel(scope);
  return codes || "Usuario";
}
function activeConvOwnerScope(auditScope, claims) {
  if (auditScope?.itercero && auditScope?.icontacto) return auditScope;
  if (claims?.itercero) {
    return {
      itercero: claims.itercero,
      icontacto: claims.icontacto ?? "",
      nombre: jwtUserDisplayName(claims) || jwtUserShortName(claims) || null
    };
  }
  return null;
}
function resolveConvListOwnerLabel(listScope, jwt, sessionUser) {
  return convOwnerDisplayLabel(activeConvOwnerScope(listScope, jwt?.claims), jwt, sessionUser);
}
function resolveConvListHeader(listScope, jwt, sessionUser) {
  const scopeName = String(listScope?.nombre ?? "").trim();
  if (scopeName && !auditScopeIsOwnJwt(listScope, jwt?.claims)) return scopeName;
  return resolveConvListOwnerLabel(listScope, jwt, sessionUser);
}
function formatAuditTs(v) {
  if (!v) return "\u2014";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v).slice(0, 16) : d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

// src/js/tools/chat/mensajesModel.ts
function vistaFechas(raw) {
  const { label, iso } = formatMsgFecha(raw);
  return { fecha: label, fechaIso: iso || void 0 };
}
function resolveUserName(msg, fallbackUserName) {
  const meta = msg?.meta;
  const promptVars = meta?.prompt_variables;
  return String(meta?.nombre_usuario ?? "") || String(promptVars?.nombre_usuario ?? "") || fallbackUserName || "";
}
function butilToCalificacion(butil) {
  if (butil === void 0 || butil === null) return void 0;
  return butil === true || butil === 1 || butil === "1" ? 1 : 0;
}
var FILE_ID_REF_RE = /^\[file_id:/i;
function filterDisplayableImagenes(list) {
  return (list || []).filter((src) => {
    const s = String(src || "").trim();
    if (!s || FILE_ID_REF_RE.test(s)) return false;
    return s.startsWith("data:image/") || /^https?:\/\//i.test(s);
  });
}
function mergeDisplayableImagenes(...lists) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const list of lists) {
    for (const src of filterDisplayableImagenes(list)) {
      if (!seen.has(src)) {
        seen.add(src);
        out.push(src);
      }
    }
  }
  return out.length ? out : void 0;
}
function resolveMensajeImagenes(m) {
  let raw;
  if (Array.isArray(m?.imagenes) && m.imagenes.length) {
    raw = m.imagenes.filter(Boolean);
  } else {
    const meta = m?.meta;
    const others = meta && typeof meta === "object" ? meta.others : void 0;
    if (others && Array.isArray(others.imagenes_adjuntas) && others.imagenes_adjuntas.length) {
      raw = others.imagenes_adjuntas.filter(Boolean);
    }
  }
  return mergeDisplayableImagenes(raw);
}
function findCalificadoForMsg(calificados, { imensaje, contenido }) {
  const rated = (calificados || []).map((c) => ({
    imensaje: Number(c.imensaje) || 0,
    butil: c.butil,
    contenido: String(c.contenido ?? "").trim()
  })).filter((c) => c.imensaje > 0);
  if (!rated.length) return null;
  if (imensaje) {
    const match = rated.find((r) => r.imensaje === imensaje);
    if (match) return match;
  }
  const text = String(contenido ?? "").trim();
  if (text) {
    return rated.find((r) => {
      const c = r.contenido;
      return c === text || text.length >= 24 && c.startsWith(text.slice(0, 24));
    }) || null;
  }
  return null;
}
function attachCalificacionesToVista(vista, openAiMsgs, calificados) {
  let oi = 0;
  return (vista || []).map((v) => {
    if (v.esUsuario || v.esOperativa) return v;
    const msgs = openAiMsgs || [];
    let raw;
    if (msgs.length) {
      while (oi < msgs.length && String(msgs[oi]?.autor || "").toLowerCase().includes("usuario")) oi += 1;
      raw = msgs[oi];
      oi += 1;
    }
    const imensaje = Number(v.imensaje) || Number(raw?.imensaje) || void 0;
    const match = findCalificadoForMsg(calificados, { imensaje, contenido: v.contenido });
    return {
      ...v,
      ...match?.imensaje || imensaje ? { imensaje: match?.imensaje || imensaje } : {},
      ...match ? { calificacion: butilToCalificacion(match.butil) } : {}
    };
  });
}
function attachCalificacionesOnly(vista, calificados) {
  return (vista || []).map((v) => {
    if (v.esUsuario || v.esOperativa) return v;
    const imensaje = Number(v.imensaje) || void 0;
    const match = findCalificadoForMsg(calificados, { imensaje, contenido: v.contenido });
    if (!match) return v;
    return {
      ...v,
      ...match.imensaje ? { imensaje: match.imensaje } : {},
      calificacion: butilToCalificacion(match.butil)
    };
  });
}
function attachUserImagenesFromOpenAi(vista, openAiMsgs) {
  let oi = 0;
  return (vista || []).map((v) => {
    if (!v.esUsuario) return v;
    const msgs = openAiMsgs || [];
    while (oi < msgs.length && !String(msgs[oi]?.autor || "").toLowerCase().includes("usuario")) oi += 1;
    const raw = msgs[oi];
    oi += 1;
    const imagenes = mergeDisplayableImagenes(v.imagenes, resolveMensajeImagenes(raw));
    if (!imagenes?.length) return v;
    if (v.imagenes?.length === imagenes.length && v.imagenes.every((u, i) => u === imagenes[i])) return v;
    return { ...v, imagenes };
  });
}
function attachAssistantTextFromOpenAi(vista, openAiMsgs) {
  const openAiByImensaje = /* @__PURE__ */ new Map();
  let seqAssistant = 0;
  for (const raw of openAiMsgs || []) {
    if (!String(raw?.autor || "").toLowerCase().includes("asistente")) continue;
    const text = String(resolveOpenAiMensajeText(raw) ?? "").trim();
    if (!text || isStreamErrorDisplay(text)) continue;
    const im = Number(raw.imensaje);
    if (im > 0) openAiByImensaje.set(im, text);
    else openAiByImensaje.set(-++seqAssistant, text);
  }
  let seqFallback = 0;
  return (vista || []).map((v) => {
    if (v.esUsuario || v.esOperativa) return v;
    const im = Number(v.imensaje);
    const openAiText = (im > 0 ? openAiByImensaje.get(im) : void 0) ?? openAiByImensaje.get(-++seqFallback) ?? "";
    const logText = String(v.contenido ?? "").trim();
    const logBad = !logText || isStreamErrorDisplay(logText);
    if (openAiText && logBad) {
      return { ...v, contenido: openAiText };
    }
    if (isStreamErrorDisplay(logText)) {
      return {
        ...v,
        contenido: "",
        streamFailed: v.streamFailed ?? true,
        streamError: v.streamError ?? formatStreamError(logText)
      };
    }
    return v;
  });
}
function countLogAssistants(log) {
  return (log?.mensajes || []).filter((m) => String(m.role) === "assistant").length;
}
function logHasOperativas(log) {
  return Boolean((log?.mensajes || []).some((m) => String(m.role) === "operativa"));
}
function countOpenAiAssistants(detail) {
  return (detail?.mensajesOpenAI || []).filter(
    (m) => String(m.autor || "").toLowerCase().includes("asistente")
  ).length;
}
function openAiFallbackVista(mensajes, fallbackUserName) {
  return (mensajes || []).map((m, i) => {
    const isUser = String(m.autor || "").toLowerCase().includes("usuario");
    const nombreUsuario = isUser ? resolveUserName(m, fallbackUserName) : "";
    let meta = m.meta && typeof m.meta === "object" ? { ...m.meta } : null;
    if (isUser && nombreUsuario) {
      meta = meta ? { ...meta, nombre_usuario: meta.nombre_usuario || nombreUsuario } : { nombre_usuario: nombreUsuario };
    }
    const contenido = resolveOpenAiMensajeText(m);
    const metaRecord = meta;
    const fechaRaw = m.fecha_hora || metaRecord?.ts || "";
    const { fecha, fechaIso } = vistaFechas(fechaRaw);
    const imensaje = Number(m.imensaje) || void 0;
    const imagenes = resolveMensajeImagenes(m);
    return {
      idMsg: imensaje ? `msg-${imensaje}` : `openai-${i}`,
      rol: isUser ? "user" : "assistant",
      contenido,
      fecha,
      fechaIso,
      esUsuario: isUser,
      esOperativa: false,
      meta,
      nombreUsuario: nombreUsuario || void 0,
      ...imensaje ? { imensaje } : {},
      ...imagenes?.length ? { imagenes } : {}
    };
  });
}
function stripMetaFromVista(mensajes) {
  return (mensajes || []).map(({ meta: _meta, usageStats: _usageStats, ...rest }) => ({
    ...rest,
    meta: null
  }));
}
function enrichLogVista(mensajes, fallbackUserName) {
  return (mensajes || []).map((m) => {
    if (!m.esUsuario) return m;
    const meta = m.meta;
    const promptVars = meta?.prompt_variables;
    const name = m.nombreUsuario || String(meta?.nombre_usuario ?? "") || String(promptVars?.nombre_usuario ?? "") || fallbackUserName;
    if (!name) return m;
    return {
      ...m,
      nombreUsuario: name,
      meta: m.meta ? { ...meta, nombre_usuario: meta?.nombre_usuario || name } : { nombre_usuario: name }
    };
  });
}
function isEphemeralMsgId(idMsg) {
  if (!idMsg || idMsg === "stream-live") return true;
  const id = String(idMsg);
  return id.startsWith("pending-user-") || id.startsWith("assistant-final-");
}
function mensajeVistaStableEqual(a, b) {
  if (!a || !b) return false;
  return a.contenido === b.contenido && a.fecha === b.fecha && a.rol === b.rol && a.calificacion === b.calificacion && a.esUsuario === b.esUsuario && a.esOperativa === b.esOperativa && !a.isStreaming && !b.isStreaming && JSON.stringify(a.usageStats ?? null) === JSON.stringify(b.usageStats ?? null) && JSON.stringify(a.imagenes ?? null) === JSON.stringify(b.imagenes ?? null);
}
function mergeMensajesVista(prev, next) {
  if (!next?.length) return prev || [];
  const prevById = /* @__PURE__ */ new Map();
  for (const m of prev || []) {
    if (isEphemeralMsgId(m.idMsg) || m.isStreaming) continue;
    prevById.set(m.idMsg, m);
  }
  const merged = next.map((m) => {
    const old = prevById.get(m.idMsg);
    return old && mensajeVistaStableEqual(old, m) ? old : m;
  });
  for (const m of prev || []) {
    if (!isEphemeralMsgId(m.idMsg) || m.isStreaming) continue;
    if (!m.esUsuario) continue;
    const already = merged.some((n) => n.esUsuario && mensajeVistaStableEqual(m, n));
    if (!already) merged.push(m);
  }
  return merged;
}
function vistaFromLogAndDetail(d, log, name) {
  if (!log?.mensajes?.length) return null;
  const rated = d?.mensajesCalificados || [];
  let vista = enrichLogVista(logToMensajesVista(log), name);
  if (d?.mensajesOpenAI?.length) {
    vista = attachCalificacionesToVista(vista, d.mensajesOpenAI, rated);
    vista = attachAssistantTextFromOpenAi(vista, d.mensajesOpenAI);
    vista = attachUserImagenesFromOpenAi(vista, d.mensajesOpenAI);
  } else if (rated.length) {
    vista = attachCalificacionesOnly(vista, rated);
  }
  return vista;
}
function finalizeStreamInLog(mensajes, finalText, stream) {
  const safeFinal = isStreamErrorDisplay(finalText) ? "" : String(finalText ?? "").trim();
  return appendStreamMsg(mensajes, safeFinal, true).map((m) => {
    if (m.idMsg !== "stream-live" && !m.isStreaming) return m;
    const prev = isStreamErrorDisplay(m.contenido) ? "" : String(m.contenido ?? "").trim();
    const now = vistaFechas(/* @__PURE__ */ new Date());
    return {
      ...m,
      idMsg: m.idMsg === "stream-live" ? `assistant-final-${Date.now()}` : m.idMsg,
      contenido: safeFinal || prev,
      isStreaming: false,
      fecha: m.fecha || now.fecha,
      fechaIso: m.fechaIso || now.fechaIso,
      ...stream?.failed ? { streamFailed: true, streamError: stream.error } : {}
    };
  });
}
function appendStreamMsg(mensajes, streamText, active) {
  if (!active) return mensajes || [];
  const list = [...mensajes || []];
  const liveText = String(streamText ?? "");
  let lastUserIdx = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].esUsuario) {
      lastUserIdx = i;
      break;
    }
  }
  let lastAsstIdx = -1;
  for (let i = list.length - 1; i > lastUserIdx; i--) {
    const m = list[i];
    if (!m.esUsuario && !m.esOperativa) {
      lastAsstIdx = i;
      break;
    }
  }
  if (lastAsstIdx >= 0) {
    const cur = list[lastAsstIdx];
    const logText = String(cur.contenido ?? "");
    const contenido = liveText.length >= logText.length ? liveText : logText;
    list[lastAsstIdx] = { ...cur, contenido, isStreaming: true };
    return list;
  }
  return [
    ...list,
    {
      idMsg: "stream-live",
      rol: "assistant",
      contenido: liveText,
      fecha: "",
      esUsuario: false,
      esOperativa: false,
      meta: null,
      isStreaming: true
    }
  ];
}
function buildOptimisticUserMsg({
  text,
  imagenes,
  audios,
  userName
}) {
  const imgs = (imagenes || []).filter(Boolean);
  const audioUrls = (audios || []).filter(Boolean);
  const { fecha, fechaIso } = vistaFechas(/* @__PURE__ */ new Date());
  return {
    idMsg: `pending-user-${Date.now()}`,
    rol: "user",
    contenido: text || (imgs.length ? "(imagen adjunta)" : audioUrls.length ? "(nota de voz)" : ""),
    fecha,
    fechaIso,
    esUsuario: true,
    esOperativa: false,
    meta: userName ? { nombre_usuario: userName } : null,
    nombreUsuario: userName || void 0,
    imagenes: imgs.length ? imgs : void 0,
    audios: audioUrls.length ? audioUrls : void 0
  };
}

// src/js/tools/chat/images.ts
var IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i;
var BACKEND_IMAGE_MIMES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
function mimeFromFileName(name) {
  const lower = name.trim().toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/i.test(lower)) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (/\.heic$/i.test(lower)) return "image/heic";
  if (/\.heif$/i.test(lower)) return "image/heif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return void 0;
}
function isChatImageFile(file) {
  if (!file) return false;
  if (file.type?.startsWith("image/")) return true;
  return IMAGE_EXT_RE.test(file.name || "");
}
function isHeicLikeFile(file) {
  const name = (file.name || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();
  return mime === "image/heic" || mime === "image/heif" || /\.heic$/i.test(name) || /\.heif$/i.test(name);
}
function isBackendSupportedMime(mime) {
  if (!mime) return false;
  return BACKEND_IMAGE_MIMES.has(mime.toLowerCase());
}
function readImagesFromClipboard(items) {
  const out = [];
  for (const item of items || []) {
    if (item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}
function blobToPreviewUrl(blob) {
  try {
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}
async function filesToImageEntries(files) {
  const added = [];
  for (const file of files || []) {
    if (!isChatImageFile(file)) continue;
    if (isHeicLikeFile(file)) continue;
    const mime = (file.type || mimeFromFileName(file.name || "") || "image/png").toLowerCase();
    if (!isBackendSupportedMime(mime)) continue;
    const dims = await fileImageDimensions(file).catch(() => void 0);
    added.push({
      name: file.name || "imagen",
      blob: file,
      mime,
      ...dims?.width ? { width: dims.width } : {},
      ...dims?.height ? { height: dims.height } : {}
    });
  }
  return added;
}
function fileImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Error ? e : new Error("decode"));
    };
    img.src = url;
  });
}
function hasHeicLikeFiles(files) {
  for (const file of files || []) {
    if (isHeicLikeFile(file)) return true;
  }
  return false;
}

// src/js/tools/chat/audio.ts
var AUDIO_EXT_RE = /\.(webm|mp3|m4a|wav|ogg|aac|mp4)$/i;
var BACKEND_AUDIO_MIMES = /* @__PURE__ */ new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
  "audio/aac"
]);
function mimeFromFileName2(name) {
  const lower = name.trim().toLowerCase();
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return void 0;
}
function isBackendSupportedAudioMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m && BACKEND_AUDIO_MIMES.has(m)) return true;
  if (m.startsWith("audio/webm")) return true;
  if (m.startsWith("audio/mp4") || m.startsWith("audio/m4a")) return true;
  if (m.startsWith("audio/mpeg")) return true;
  return false;
}
function isChatAudioFile(file) {
  if (!file) return false;
  if (file.type?.startsWith("audio/")) return true;
  return AUDIO_EXT_RE.test(file.name || "");
}
async function filesToAudioEntries(files) {
  const added = [];
  for (const file of files || []) {
    if (!isChatAudioFile(file)) continue;
    const mime = (file.type || mimeFromFileName2(file.name || "") || "audio/webm").toLowerCase().split(";")[0];
    if (!isBackendSupportedAudioMime(mime)) continue;
    added.push({ name: file.name || "audio", blob: file, mime });
  }
  return added;
}
function blobToPreviewUrl2(blob) {
  try {
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}
function createVoiceRecorder() {
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;
  const stopStream = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };
  const chooseExt = (recMime) => {
    if (recMime.includes("webm")) return "webm";
    if (recMime.includes("mp4") || recMime.includes("m4a")) return "m4a";
    if (recMime.includes("mpeg") || recMime.includes("mp3")) return "mp3";
    if (recMime.includes("wav")) return "wav";
    if (recMime.includes("ogg")) return "ogg";
    return "webm";
  };
  return {
    async start() {
      if (mediaRecorder?.state === "recording") return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      mediaRecorder.start();
    },
    stop() {
      return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
          stopStream();
          resolve(null);
          return;
        }
        const recorder = mediaRecorder;
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          stopStream();
          mediaRecorder = null;
          chunks = [];
          if (!blob.size) {
            resolve(null);
            return;
          }
          const mime = (recorder.mimeType || "audio/webm").toLowerCase().split(";")[0];
          const fileName = `nota-voz-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.${chooseExt(mime)}`;
          const file = new File([blob], fileName, { type: mime });
          resolve({ name: fileName, blob: file, mime });
        };
        recorder.stop();
      });
    },
    cancel() {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
      }
      mediaRecorder = null;
      chunks = [];
      stopStream();
    },
    isActive() {
      return mediaRecorder?.state === "recording";
    }
  };
}
function isVoiceRecordingSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
}

// src/js/tools/chat/useChatTool.ts
var { useState: useState4, useEffect: useEffect5, useCallback: useCallback2, useRef: useRef3, useMemo: useMemo4 } = getReact();
function readBootConvId(bootChat) {
  const fromBoot = Number(bootChat?.convId);
  if (fromBoot > 0) return fromBoot;
  const fromUrl = Number(getSnapshot().chat?.convId);
  return fromUrl > 0 ? fromUrl : null;
}
function convIdsEqual(a, b) {
  return Number(a) > 0 && Number(a) === Number(b);
}
function urlChatConvId() {
  return readBootConvId();
}
function isNotFoundError(e) {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /not found|\b404\b/i.test(msg);
}
async function fetchLogsModeDetail(jwt, id, { freshLog = false, minMensajes = 0 } = {}) {
  const loadDetail = () => freshLog ? getConversacionLogsWithRetry(jwt, id, { minMensajes }).catch(() => null) : getConversacionLogs(jwt, id).catch(() => null);
  try {
    const d2 = await loadDetail();
    if (!d2) {
      const fallback = await getConversacion(jwt, id).catch(() => null);
      if (!fallback) return { d: null, log: null, openAiDirect: false };
      const log2 = convLogFromDetalle(fallback, id);
      const assistantsInLog2 = countLogAssistants(log2);
      const assistantsInApi2 = countOpenAiAssistants(fallback);
      const logComplete2 = Boolean(log2?.mensajes?.length && assistantsInLog2 >= assistantsInApi2);
      const preferLogMeta2 = Boolean(log2?.mensajes?.length && (logHasOperativas(log2) || logComplete2));
      const openAiDirect2 = Boolean(fallback?.mensajesOpenAI?.length) && !preferLogMeta2;
      return { d: fallback, log: log2, openAiDirect: openAiDirect2 };
    }
    const log = convLogFromDetalle(d2, id);
    const assistantsInLog = countLogAssistants(log);
    const assistantsInApi = countOpenAiAssistants(d2);
    const logComplete = Boolean(log?.mensajes?.length && assistantsInLog >= assistantsInApi);
    const preferLogMeta = Boolean(log?.mensajes?.length && (logHasOperativas(log) || logComplete));
    const openAiDirect = Boolean(d2?.mensajesOpenAI?.length) && !preferLogMeta;
    return { d: d2, log, openAiDirect };
  } catch (e) {
    if (!isNotFoundError(e)) throw e;
  }
  const d = await getConversacion(jwt, id).catch(() => null);
  return { d, log: null, openAiDirect: false };
}
function useChatTool({ bootChat }) {
  const [jwt, setJwt] = useState4(() => loadPatyJwt());
  const [jwtOpen, setJwtOpen] = useState4(false);
  const [jwtLoading, setJwtLoading] = useState4(false);
  const [authTick, setAuthTick] = useState4(0);
  const [rows, setRows] = useState4([]);
  const [selectedId, setSelectedId] = useState4(() => readBootConvId(bootChat));
  const [detail, setDetail] = useState4(null);
  const [loadingList, setLoadingList] = useState4(false);
  const [sending, setSending] = useState4(false);
  const [draft, setDraft] = useState4("");
  const [images, setImages] = useState4([]);
  const [audios, setAudios] = useState4([]);
  const [isRecording, setIsRecording] = useState4(false);
  const [streamText, setStreamText] = useState4("");
  const [logMensajes, setLogMensajes] = useState4([]);
  const [ratingMsgId, setRatingMsgId] = useState4(null);
  const [loadingThread, setLoadingThread] = useState4(false);
  const [logError, setLogError] = useState4("");
  const [metaOpen, setMetaOpen] = useState4(false);
  const [metaMsg, setMetaMsg] = useState4(null);
  const [payloadPreviewOpen, setPayloadPreviewOpen] = useState4(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState4(false);
  const [auditScope, setAuditScope] = useState4(null);
  const [sessionBrowseScope, setSessionBrowseScope] = useState4(null);
  const [sessionScopeLoading, setSessionScopeLoading] = useState4(false);
  const [convListPage, setConvListPage] = useState4(1);
  const [convListPageSize, setConvListPageSize] = useState4(() => readConvListPageSize());
  const [convListSearch, setConvListSearch] = useState4("");
  const [convListMeta, setConvListMeta] = useState4(null);
  const [messageSource, setMessageSource] = useState4(() => readChatMessageSource(bootChat));
  const [chatMode, setChatMode] = useState4(() => readChatMode(bootChat));
  const [llmProvider, setLlmProvider] = useState4(CHAT_PROVIDER_DEFAULT);
  const inputRef = useRef3(null);
  const attachInputRef = useRef3(null);
  const voiceRecorderRef = useRef3(createVoiceRecorder());
  const threadScrollRef = useRef3(null);
  const lastLogApiCountRef = useRef3(0);
  const skipThreadReloadRef = useRef3(null);
  const lastOpenedConvRef = useRef3(null);
  const openConvRef = useRef3(async () => {
  });
  const pendingListConvRef = useRef3(null);
  const contapymeResumeLockRef = useRef3(false);
  const sendingRef = useRef3(false);
  const jwtRef = useRef3(jwt);
  jwtRef.current = jwt;
  const onSendRef = useRef3(async () => {
  });
  const mcpPollRef = useRef3(null);
  const logMensajesRef = useRef3(logMensajes);
  logMensajesRef.current = logMensajes;
  sendingRef.current = sending;
  const MCP_POLL_MS = 5e3;
  const MCP_POLL_TIMEOUT_MS = 6e5;
  const stopMcpSessionPoll = useCallback2(() => {
    const s = mcpPollRef.current;
    if (s?.timer) clearInterval(s.timer);
    mcpPollRef.current = null;
  }, []);
  const resumeMcpAfterLogin = useCallback2((prompt) => {
    if (sendingRef.current || contapymeResumeLockRef.current) return;
    contapymeResumeLockRef.current = true;
    toastInfo("Sesi\xF3n ContaPyme lista \u2014 consultando\u2026");
    void Promise.resolve(onSendRef.current(String(prompt || "ya inici\xE9 sesi\xF3n").trim() || "ya inici\xE9 sesi\xF3n")).finally(() => {
      window.setTimeout(() => {
        contapymeResumeLockRef.current = false;
      }, 8e3);
    });
  }, []);
  const tickMcpSessionPoll = useCallback2(async () => {
    const cur = mcpPollRef.current;
    const tokenJwt = jwtRef.current;
    if (!cur || cur.resumed || cur.inFlight || !tokenJwt?.token) return;
    if (Date.now() - cur.startedAt > MCP_POLL_TIMEOUT_MS) {
      stopMcpSessionPoll();
      toastWarning("Tiempo de espera de sesi\xF3n ContaPyme agotado. Vuelve a preguntar.");
      return;
    }
    cur.inFlight = true;
    try {
      const st = await getConversacionMcpSession(tokenJwt, cur.convId, cur.sessionId);
      if (st.sessionId) cur.sessionId = st.sessionId;
      if (st.ready) {
        cur.resumed = true;
        const prompt = String(st.pendingPrompt || cur.pendingPrompt || "ya inici\xE9 sesi\xF3n").trim();
        stopMcpSessionPoll();
        resumeMcpAfterLogin(prompt);
        return;
      }
      if (st.kind === "gone") stopMcpSessionPoll();
    } catch {
    } finally {
      if (mcpPollRef.current) mcpPollRef.current.inFlight = false;
    }
  }, [resumeMcpAfterLogin, stopMcpSessionPoll]);
  const startMcpSessionPoll = useCallback2((opts) => {
    const id = Number(opts.convId);
    if (!Number.isInteger(id) || id <= 0) return;
    stopMcpSessionPoll();
    mcpPollRef.current = {
      convId: id,
      sessionId: opts.sessionId ? String(opts.sessionId) : void 0,
      pendingPrompt: String(opts.pendingPrompt || "").trim() || "ya inici\xE9 sesi\xF3n",
      startedAt: Date.now(),
      timer: null,
      inFlight: false,
      resumed: false
    };
    mcpPollRef.current.timer = setInterval(() => {
      void tickMcpSessionPoll();
    }, MCP_POLL_MS);
    void tickMcpSessionPoll();
  }, [stopMcpSessionPoll, tickMcpSessionPoll]);
  useEffect5(() => () => {
    stopMcpSessionPoll();
  }, [stopMcpSessionPoll]);
  useEffect5(() => {
    const cur = mcpPollRef.current;
    if (cur && selectedId != null && cur.convId !== selectedId) stopMcpSessionPoll();
  }, [selectedId, stopMcpSessionPoll]);
  const loggedIn = Session.isLoggedIn();
  const sessionUser = Session.username();
  const canAdminJwt = canAdminPortalJwt();
  const canAuditChat = useMemo4(
    () => canAccessOthers2(),
    [authTick]
  );
  const canInteract = canInteractPatyChat(sessionUser, jwt);
  const listScope = useMemo4(() => {
    const own = activeConvOwnerScope(null, jwt?.claims) ?? sessionBrowseScope;
    if (!canAuditChat) return own;
    return auditScope ?? own;
  }, [canAuditChat, auditScope, jwt?.claims, sessionBrowseScope]);
  const selectedConvRow = selectedId ? rows.find((r) => convIdsEqual(r.iconversacion, selectedId)) : null;
  const selectedConvOwned = convBelongsToJwtResolved(
    detail,
    selectedConvRow,
    activeConvOwnerScope(listScope, jwt?.claims),
    jwt?.claims
  );
  const canSend = canInteract && auditScopeIsOwnJwt(auditScope, jwt?.claims) && selectedConvOwned;
  const viewingAuditOther = Boolean(
    auditScope && (jwt?.claims ? !auditScopeIsOwnJwt(auditScope, jwt.claims) : sessionBrowseScope && browseScopeKey(auditScope) !== browseScopeKey(sessionBrowseScope))
  );
  const viewOnly = loggedIn && !canSend;
  const needsJwt = loggedIn && !jwt?.token && !jwtLoading;
  const displayScope = activeConvOwnerScope(listScope, jwt?.claims);
  useEffect5(() => {
    function onSessionAuth() {
      setAuthTick((n) => n + 1);
    }
    function onPatyJwt() {
      setJwt(loadPatyJwt());
    }
    window.addEventListener("isa-patyia:paty-jwt", onPatyJwt);
    window.addEventListener(Session.EVENT, onSessionAuth);
    window.addEventListener("isa-patyia:auth", onSessionAuth);
    window.addEventListener("patyia-apptools:caps-changed", onSessionAuth);
    return () => {
      window.removeEventListener("isa-patyia:paty-jwt", onPatyJwt);
      window.removeEventListener(Session.EVENT, onSessionAuth);
      window.removeEventListener("isa-patyia:auth", onSessionAuth);
      window.removeEventListener("patyia-apptools:caps-changed", onSessionAuth);
    };
  }, []);
  useEffect5(() => {
    if (canAuditChat) return;
    if (auditScope) {
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      persistChatConvId(null);
    }
    if (auditDialogOpen) setAuditDialogOpen(false);
  }, [canAuditChat, auditScope, auditDialogOpen]);
  const prevSessionUserRef = useRef3(null);
  useEffect5(() => {
    const prev = prevSessionUserRef.current;
    if (prev && prev !== sessionUser) {
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setConvListMeta(null);
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      setDraft("");
      setImages([]);
      setAudios([]);
      voiceRecorderRef.current.cancel();
      setIsRecording(false);
      persistChatConvId(null);
    }
    prevSessionUserRef.current = sessionUser;
  }, [sessionUser]);
  useEffect5(() => {
    if (!loggedIn || !sessionUser) {
      setJwt(null);
      setJwtLoading(false);
      return;
    }
    let cancelled = false;
    const u = sessionUser.trim().toUpperCase();
    const cached = loadPatyJwt();
    if (cached?.token && cached.savedBy?.toUpperCase() === u) {
      setJwt(cached);
      setJwtLoading(false);
    } else {
      setJwt(null);
      setJwtLoading(true);
    }
    hydratePatyJwtFromServer(sessionUser).then((rec) => {
      if (!cancelled) setJwt(rec);
    }).finally(() => {
      if (!cancelled) setJwtLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, sessionUser]);
  useEffect5(() => {
    if (!loggedIn || !sessionUser) {
      setSessionBrowseScope(null);
      setSessionScopeLoading(false);
      return void 0;
    }
    if (jwt?.token) {
      setSessionBrowseScope(null);
      setSessionScopeLoading(false);
      return void 0;
    }
    let cancelled = false;
    setSessionScopeLoading(true);
    resolveSessionBrowseScope(sessionUser).then((scope) => {
      if (!cancelled) setSessionBrowseScope(scope);
    }).finally(() => {
      if (!cancelled) setSessionScopeLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, sessionUser, jwt?.token]);
  const reloadList = useCallback2(async () => {
    if (!loggedIn || jwtLoading || sessionScopeLoading) return;
    setLoadingList(true);
    try {
      const page = convListPage;
      const limit = convListPageSize;
      const search = convListSearch.trim() || void 0;
      const listSort = CONVERSACIONES_LIST_SORT_DEFAULT;
      const auditOther = Boolean(
        canAuditChat && auditScope?.itercero && auditScope?.icontacto && !auditScopeIsOwnJwt(auditScope, jwt?.claims)
      );
      const listInput = {
        page,
        limit,
        search,
        sort: listSort,
        ...auditOther ? { itercero: auditScope.itercero, icontacto: auditScope.icontacto } : {}
      };
      if (jwt?.token) {
        const res = await listConversaciones(jwt, listInput);
        setRows(
          [...res.conversaciones].sort(
            (a, b) => Number(b.iconversacion) - Number(a.iconversacion)
          )
        );
        setConvListMeta({ total: res.total, page: res.page, pages: res.pages });
      } else {
        setRows([]);
        setConvListMeta(null);
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }, [loggedIn, jwtLoading, sessionScopeLoading, jwt?.token, jwt?.claims, canAuditChat, auditScope?.itercero, auditScope?.icontacto, convListPage, convListPageSize, convListSearch]);
  const handleConvListSearchChange = useCallback2((text) => {
    setConvListSearch((prev) => {
      if (prev === text) return prev;
      setConvListPage(1);
      return text;
    });
  }, []);
  const handleSelectAuditScope = useCallback2((row) => {
    if (!canAccessOthers2()) {
      setAuditDialogOpen(false);
      toastInfo("Tu rol solo puede ver tus propias conversaciones");
      setAuditScope(null);
      return;
    }
    if (row.esJwt) {
      if (!jwt?.claims?.itercero) {
        setAuditDialogOpen(false);
        toastInfo("Configura JWT para filtrar por tu contacto");
        return;
      }
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setConvListMeta(null);
      setRows([]);
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      persistChatConvId(null);
      setAuditDialogOpen(false);
      toastInfo("Conversaciones de tu JWT");
      return;
    }
    if (row.esSesion) {
      const sessionScope = row.itercero && row.icontacto ? {
        itercero: String(row.itercero),
        icontacto: String(row.icontacto),
        nombre: row.nombre || sessionUser || null
      } : sessionBrowseScope;
      const sameAsJwt = Boolean(
        sessionScope && jwt?.claims?.itercero && convBelongsToJwt(sessionScope, jwt.claims)
      );
      setAuditScope(sameAsJwt ? null : sessionScope);
      setConvListPage(1);
      setConvListSearch("");
      setConvListMeta(null);
      setRows([]);
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      persistChatConvId(null);
      setAuditDialogOpen(false);
      toastInfo(`Conversaciones \xB7 ${row.nombre || sessionUser || "sesi\xF3n"}`);
      return;
    }
    const next = {
      itercero: String(row.itercero ?? ""),
      icontacto: String(row.icontacto ?? ""),
      nombre: row.nombre || null
    };
    setAuditScope(next);
    setConvListPage(1);
    setConvListSearch("");
    setConvListMeta(null);
    setRows([]);
    setSelectedId(null);
    setDetail(null);
    setLogMensajes([]);
    setStreamText("");
    setLogError("");
    persistChatConvId(null);
    setAuditDialogOpen(false);
    toastInfo(`Filtro \xB7 ${row.nombre || row.icontacto}`);
  }, [jwt?.claims?.itercero, jwt?.claims?.icontacto, sessionBrowseScope, sessionUser]);
  const applyThreadFromDetail = useCallback2((d, log, name, { openAiDirect = false, stripMeta = false } = {}) => {
    const rated = d?.mensajesCalificados || [];
    const logAssistants = countLogAssistants(log);
    const openAiAssistants = countOpenAiAssistants(d);
    const logComplete = Boolean(log?.mensajes?.length && logAssistants >= openAiAssistants);
    const buildFromLog = Boolean(log?.mensajes?.length && (logHasOperativas(log) || logComplete));
    const finalizeVista = (vista) => stripMeta ? stripMetaFromVista(vista) : vista;
    if (log?.mensajes?.length) {
      lastLogApiCountRef.current = log.mensajes.length;
    }
    if (buildFromLog) {
      let vista = enrichLogVista(logToMensajesVista(log), name);
      if (d?.mensajesOpenAI?.length) {
        vista = attachCalificacionesToVista(vista, d.mensajesOpenAI, rated);
        vista = attachAssistantTextFromOpenAi(vista, d.mensajesOpenAI);
        vista = attachUserImagenesFromOpenAi(vista, d.mensajesOpenAI);
      } else if (rated.length) {
        vista = attachCalificacionesOnly(vista, rated);
      }
      setLogMensajes(finalizeVista(vista));
      setLogError("");
      return;
    }
    if (openAiDirect && d?.mensajesOpenAI?.length) {
      const vista = finalizeVista(attachUserImagenesFromOpenAi(
        attachCalificacionesToVista(
          enrichLogVista(openAiFallbackVista(d.mensajesOpenAI, name), name),
          d.mensajesOpenAI,
          rated
        ),
        d.mensajesOpenAI
      ));
      setLogMensajes(vista);
      setLogError("");
      return;
    }
    if (d?.mensajesOpenAI?.length) {
      const vista = finalizeVista(attachUserImagenesFromOpenAi(
        attachCalificacionesToVista(
          enrichLogVista(openAiFallbackVista(d.mensajesOpenAI, name), name),
          d.mensajesOpenAI,
          rated
        ),
        d.mensajesOpenAI
      ));
      setLogMensajes(vista);
      setLogError("");
      return;
    }
    if (log?.mensajes?.length) {
      let vista = enrichLogVista(logToMensajesVista(log), name);
      if (d?.mensajesOpenAI?.length) {
        vista = attachCalificacionesToVista(vista, d.mensajesOpenAI, rated);
        vista = attachAssistantTextFromOpenAi(vista, d.mensajesOpenAI);
        vista = attachUserImagenesFromOpenAi(vista, d.mensajesOpenAI);
      } else if (rated.length) {
        vista = attachCalificacionesOnly(vista, rated);
      }
      setLogMensajes(finalizeVista(vista));
      setLogError("");
      return;
    }
    setLogMensajes([]);
    if (log === null) {
      setLogError("");
    }
  }, []);
  const patchThreadAfterSend = useCallback2(async (id, { minLogMensajes = 0, ownerLabel } = {}) => {
    if (!loggedIn || !id) return;
    const name = ownerLabel || convOwnerDisplayLabel(activeConvOwnerScope(listScope, jwt?.claims), jwt, sessionUser);
    const useLogBridge = !jwt?.token;
    const prodMode = messageSource === "prod" && Boolean(jwt?.token);
    const logsApiMode = messageSource === "logs" && Boolean(jwt?.token);
    try {
      if (prodMode) {
        const d2 = await getConversacion(jwt, id).catch(() => null);
        if (d2) {
          setDetail(d2);
          applyThreadFromDetail(d2, null, name, { openAiDirect: true, stripMeta: true });
        }
        return;
      }
      if (logsApiMode) {
        try {
          const { d: d2, log, openAiDirect } = await fetchLogsModeDetail(jwt, id, { freshLog: true, minMensajes: minLogMensajes });
          if (d2) {
            const row = rows.find((r) => convIdsEqual(r.iconversacion, id));
            setDetail({
              ...row,
              ...d2,
              itercero: d2.itercero ?? row?.itercero,
              icontacto: d2.icontacto ?? row?.icontacto
            });
            applyThreadFromDetail(d2, log, name, { openAiDirect });
          } else if (log?.mensajes?.length) {
            applyThreadFromDetail(null, log, name);
          }
        } catch {
        }
        return;
      }
      const logResult = await fetchConvLogByIdWithRetry(id, { minMensajes: minLogMensajes }).catch(() => null);
      let d = null;
      if (!useLogBridge) {
        d = await getConversacion(jwt, id).catch(() => null);
        if (d) setDetail(d);
      }
      if (logResult?.mensajes?.length) {
        lastLogApiCountRef.current = logResult.mensajes.length;
        const vista = vistaFromLogAndDetail(d, logResult, name);
        if (vista?.length) {
          setLogMensajes((prev) => mergeMensajesVista(prev, vista));
          setLogError("");
        }
      }
    } catch {
    }
  }, [loggedIn, jwt, viewingAuditOther, listScope, messageSource, applyThreadFromDetail, rows, sessionUser]);
  const openConv = useCallback2(async (id, { silent = false, keepStream = false, freshLog = false, minLogMensajes = 0, sourceOverride } = {}) => {
    if (!loggedIn || !id) return;
    if (!canAuditChat && jwt?.claims?.itercero) {
      const row = rows.find((r) => convIdsEqual(r.iconversacion, id));
      if (row && !convBelongsToJwt(row, jwt.claims)) {
        toastError("Tu rol solo puede abrir tus propias conversaciones");
        return;
      }
    }
    if (freshLog || sourceOverride !== void 0) lastOpenedConvRef.current = null;
    skipThreadReloadRef.current = id;
    setSelectedId(id);
    persistChatConvId(id);
    if (!silent) setLoadingThread(true);
    if (!keepStream) {
      setStreamText("");
      setLogMensajes([]);
    }
    setLogError("");
    const ownerLabel = convOwnerDisplayLabel(activeConvOwnerScope(listScope, jwt?.claims), jwt, sessionUser);
    const useLogBridge = !jwt?.token;
    const activeSource = sourceOverride ?? messageSource;
    const prodMode = activeSource === "prod" && Boolean(jwt?.token);
    const logsApiMode = activeSource === "logs" && Boolean(jwt?.token);
    const minMensajes = freshLog ? Math.max(minLogMensajes, lastLogApiCountRef.current + 2) : 0;
    const assertOwnDetail = (d) => {
      if (!canAuditChat && d && jwt?.claims?.itercero && !convBelongsToJwt(d, jwt.claims)) {
        toastError("Tu rol solo puede abrir tus propias conversaciones");
        setSelectedId(null);
        setDetail(null);
        setLogMensajes([]);
        persistChatConvId(null);
        return false;
      }
      return true;
    };
    try {
      if (prodMode) {
        const d = await getConversacion(jwt, id);
        if (!assertOwnDetail(d)) return;
        setDetail(d);
        applyThreadFromDetail(d, null, ownerLabel, { openAiDirect: true, stripMeta: true });
        return;
      }
      if (logsApiMode) {
        const { d, log, openAiDirect } = await fetchLogsModeDetail(jwt, id, { freshLog, minMensajes });
        if (d && !assertOwnDetail(d)) return;
        if (d) {
          const row = rows.find((r) => convIdsEqual(r.iconversacion, id));
          setDetail({
            ...row,
            ...d,
            itercero: d.itercero ?? row?.itercero,
            icontacto: d.icontacto ?? row?.icontacto
          });
        } else {
          const row = rows.find((r) => r.iconversacion === id);
          setDetail(row || { iconversacion: id, titulo: `Conv #${id}` });
        }
        applyThreadFromDetail(d, log, ownerLabel, { openAiDirect });
        return;
      }
      if (useLogBridge) {
        const logResult = freshLog ? await fetchConvLogByIdWithRetry(id, { minMensajes }).catch(() => null) : await fetchConvLogById(id).catch(() => null);
        const row = rows.find((r) => r.iconversacion === id);
        if (row && !assertOwnDetail(row)) return;
        setDetail(row || { iconversacion: id, titulo: `Conv #${id}` });
        applyThreadFromDetail(null, logResult, ownerLabel);
        return;
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
      setDetail(null);
      setLogMensajes([]);
    } finally {
      if (!silent) setLoadingThread(false);
      lastOpenedConvRef.current = id;
    }
  }, [loggedIn, jwt, sessionUser, canAuditChat, viewingAuditOther, listScope, rows, messageSource, applyThreadFromDetail]);
  openConvRef.current = openConv;
  const onMessageSourceChange = useCallback2((next) => {
    if (next === messageSource) return;
    persistChatMessageSource(next);
    setMessageSource(next);
    if (selectedId) {
      void openConv(selectedId, { silent: false, sourceOverride: next });
    }
  }, [messageSource, selectedId, openConv]);
  const onChatModeChange = useCallback2(async (next) => {
    const mode = String(next || "patyia").trim().toLowerCase() || "patyia";
    if (mode === chatMode) return;
    if (isLibreChatMode(mode)) {
      const ok = await requestConfirm({
        title: "Modo Libre",
        message: [
          "Al activar Libre, PatyIA deja de aplicar las instrucciones de producto, la clasificaci\xF3n de consultas y la b\xFAsqueda en documentaci\xF3n.",
          "",
          "Las respuestas pueden no alinearse con soporte ContaPyme\xAE ni con las pol\xEDticas de asesor\xEDa. El uso queda registrado en el log (mode: libre).",
          "",
          "Usa este modo solo para pruebas en staging. \xBFActivar Libre?"
        ].join("\n"),
        confirmLabel: "Activar Libre",
        cancelLabel: "Cancelar"
      });
      if (!ok) return;
    }
    persistChatMode(mode);
    setChatMode(mode);
  }, [chatMode]);
  const onLlmProviderChange = useCallback2((next) => {
    const provider = String(next || CHAT_PROVIDER_OPENAI).trim().toLowerCase() === CHAT_PROVIDER_MINIMAX ? CHAT_PROVIDER_MINIMAX : CHAT_PROVIDER_OPENAI;
    if (provider === llmProvider) return;
    setLlmProvider(provider);
  }, [llmProvider]);
  const onConvListPageSizeChange = useCallback2((next) => {
    const size = parseConvListPageSize(next);
    if (size === convListPageSize) return;
    persistConvListPageSize(size);
    setConvListPageSize(size);
    setConvListPage(1);
  }, [convListPageSize]);
  useEffect5(() => subscribe((snap) => {
    const chat = snap.chat;
    const urlId = Number(chat?.convId) || null;
    setSelectedId((prev) => prev === urlId ? prev : urlId);
    const urlSource = messageSourceFromUrl(chat);
    if (urlSource) setMessageSource((prev) => prev === urlSource ? prev : urlSource);
    const urlMode = chatModeFromUrl(chat);
    if (urlMode !== null) setChatMode((prev) => prev === urlMode ? prev : urlMode);
  }), []);
  useEffect5(() => {
    persistChatLlmProvider(CHAT_PROVIDER_OPENAI);
  }, []);
  const prevSelectedIdRef = useRef3(selectedId);
  useEffect5(() => {
    const prev = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedId;
    if (prev === selectedId) return;
    if (prev === null) return;
    setLlmProvider((p) => p === CHAT_PROVIDER_OPENAI ? p : CHAT_PROVIDER_OPENAI);
  }, [selectedId]);
  useEffect5(() => {
    if (jwtLoading) return;
    reloadList();
  }, [reloadList, authTick, jwtLoading]);
  useEffect5(() => {
    if (loadingList || jwtLoading || sending) return;
    if (!selectedId) return;
    if (pendingListConvRef.current === selectedId) {
      if (rows.some((r) => convIdsEqual(r.iconversacion, selectedId))) {
        pendingListConvRef.current = null;
      }
      return;
    }
    if (rows.length === 0) return;
    if (rows.some((r) => convIdsEqual(r.iconversacion, selectedId))) return;
    if (convIdsEqual(urlChatConvId(), selectedId)) return;
  }, [rows, loadingList, jwtLoading, sending, selectedId]);
  useEffect5(() => {
    if (!selectedId) {
      lastOpenedConvRef.current = null;
      return;
    }
    if (loadingList) return;
    if (jwtLoading && !jwt?.token) return;
    if (skipThreadReloadRef.current === selectedId) {
      skipThreadReloadRef.current = null;
      lastOpenedConvRef.current = selectedId;
      return;
    }
    if (pendingListConvRef.current === selectedId) return;
    const inList = rows.some((r) => convIdsEqual(r.iconversacion, selectedId));
    if (!inList && rows.length > 0 && !convIdsEqual(urlChatConvId(), selectedId)) return;
    if (lastOpenedConvRef.current === selectedId) return;
    void openConvRef.current(selectedId);
  }, [selectedId, jwtLoading, jwt?.token, rows, loadingList]);
  async function onNewChat() {
    if (!canSend) {
      toastWarning("Modo lectura.");
      return;
    }
    stopMcpSessionPoll();
    setSelectedId(null);
    setDetail(null);
    setStreamText("");
    setLogMensajes([]);
    setLogError("");
    setLlmProvider(CHAT_PROVIDER_OPENAI);
    persistChatConvId(null);
    inputRef.current?.focus();
  }
  async function onDelete(id) {
    if (!canSend) return;
    const conv = rows.find((r) => r.iconversacion === id);
    if (conv && !convBelongsToJwt(conv, jwt?.claims)) {
      toastError("No puedes eliminar conversaciones de otro contacto");
      return;
    }
    const ok = await requestConfirm({ title: "Eliminar conversaci\xF3n", message: `\xBFEliminar conv #${id}?` });
    if (!ok) return;
    try {
      await deleteConversacion(jwt, id);
      toastSuccess("Conversaci\xF3n eliminada");
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
        setLogMensajes([]);
      }
      reloadList();
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    }
  }
  async function onSend(overrideText) {
    if (!canSend || !jwt) return;
    const text = resolveChatSendText(overrideText, draft);
    if (!text && !images.length && !audios.length) return;
    if (selectedId && !convBelongsToJwtResolved(
      detail,
      rows.find((r) => convIdsEqual(r.iconversacion, selectedId)),
      displayScope,
      jwt.claims
    )) {
      toastError("No puedes enviar mensajes en conversaciones de otro contacto");
      return;
    }
    setSending(true);
    setStreamText("");
    stopMcpSessionPoll();
    const imageEntries = [...images];
    const audioEntries = [...audios];
    const imagenesPlaceholder = imageEntries.map((_, i) => `__img_pending_${i}__`);
    const audioUrlsPlaceholder = audioEntries.map((_, i) => `__aud_pending_${i}__`);
    const convIdBefore = selectedId;
    const userName = convOwnerDisplayLabel(displayScope, jwt, sessionUser);
    const logCountBefore = lastLogApiCountRef.current;
    setDraft("");
    setImages([]);
    setAudios([]);
    if (attachInputRef.current) attachInputRef.current.value = "";
    setLogMensajes((prev) => enrichLogVista(
      [...prev, buildOptimisticUserMsg({ text, imagenes: imagenesPlaceholder, audios: audioUrlsPlaceholder, userName })],
      userName
    ));
    let uploadedImages = [];
    let uploadedAudios = [];
    try {
      if (imageEntries.length) {
        uploadedImages = await uploadImagenes(
          jwt,
          imageEntries.map((i) => i.blob),
          void 0
        );
      }
      if (audioEntries.length) {
        uploadedAudios = await uploadAudios(
          jwt,
          audioEntries.map((a) => a.blob),
          void 0
        );
      }
      const imagenesWire = chatRefsFromAdjuntos(uploadedImages, "imagen");
      const audiosWire = chatRefsFromAdjuntos(uploadedAudios, "audio");
      const bindSidebarRow = (payload, opts) => {
        const id = Number(payload.iconversacion);
        if (!Number.isInteger(id) || id <= 0) return null;
        const tituloEarly = String(payload.titulo || "").trim();
        const rowPatch = {
          iconversacion: id,
          ...tituloEarly ? { titulo: tituloEarly } : {},
          ...payload.qmensajes != null ? { qmensajes: payload.qmensajes } : {},
          ...payload.fhcre ? { fhcre: payload.fhcre } : {},
          ...payload.fhultact ? { fhultact: payload.fhultact } : {},
          ...payload.itercero ? { itercero: payload.itercero } : jwt.claims?.itercero ? { itercero: jwt.claims.itercero } : {},
          ...payload.icontacto ? { icontacto: payload.icontacto } : jwt.claims?.icontacto ? { icontacto: jwt.claims.icontacto } : {}
        };
        setRows((prev) => {
          const exists = prev.some((r) => convIdsEqual(r.iconversacion, id));
          if (exists) return prev.map((r) => convIdsEqual(r.iconversacion, id) ? { ...r, ...rowPatch } : r);
          return [rowPatch, ...prev];
        });
        if (opts?.select !== false && id !== convIdBefore) {
          pendingListConvRef.current = id;
          skipThreadReloadRef.current = id;
          setSelectedId(id);
          persistChatConvId(id);
        }
        return rowPatch;
      };
      let boundEarly = false;
      const result = await sendConversacionStream(
        jwt,
        { prompt: text, iconversacion: selectedId || void 0, imagenes: imagenesWire, audios: audiosWire, mode: chatMode, provider: llmProvider },
        (partial, payload) => {
          if (partial) setStreamText(partial);
          if (!boundEarly && !convIdBefore && payload && Number(payload.iconversacion) > 0) {
            boundEarly = true;
            bindSidebarRow(payload);
          }
        }
      );
      const finalText = String(result.respuesta || "").trim();
      if (finalText) setStreamText(finalText);
      const streamMeta = result.meta;
      const emptyStream = !finalText && streamMeta?.stream_ok !== true;
      const streamFailed = streamMeta?.stream_ok === false || emptyStream;
      const streamError = formatStreamError(streamMeta?.stream_error) || (emptyStream ? `El proveedor ${llmProvider === CHAT_PROVIDER_MINIMAX ? "MiniMax" : "OpenAI"} no devolvi\xF3 respuesta. Vuelve a intentar${llmProvider === CHAT_PROVIDER_MINIMAX ? " o cambia a OpenAI" : ""}.` : void 0);
      const newId = Number(result.iconversacion) || convIdBefore;
      const tituloStream = String(result.titulo || "").trim();
      setLogMensajes((prev) => enrichLogVista(
        finalizeStreamInLog(prev, finalText, streamFailed ? { failed: true, error: streamError } : void 0),
        userName
      ));
      if (streamFailed) {
        toastWarning(streamError || "La respuesta no se complet\xF3 correctamente.");
      }
      setSending(false);
      setStreamText("");
      if (newId) {
        const rowPatch = bindSidebarRow({
          iconversacion: newId,
          ...tituloStream ? { titulo: tituloStream } : {},
          ...result.qmensajes != null ? { qmensajes: result.qmensajes } : {},
          ...result.fhcre ? { fhcre: result.fhcre } : {},
          ...result.fhultact ? { fhultact: result.fhultact } : {},
          ...result.itercero ? { itercero: result.itercero } : {},
          ...result.icontacto ? { icontacto: result.icontacto } : {}
        }) || {
          iconversacion: newId,
          ...tituloStream ? { titulo: tituloStream } : {}
        };
        setDetail((d) => d && convIdsEqual(d.iconversacion, newId) ? { ...d, ...rowPatch } : d);
        void reloadList().then(() => {
          setRows((prev) => {
            const exists = prev.some((r) => convIdsEqual(r.iconversacion, newId));
            if (exists) return prev.map((r) => convIdsEqual(r.iconversacion, newId) ? { ...r, ...rowPatch } : r);
            return [rowPatch, ...prev];
          });
        });
        void patchThreadAfterSend(newId, {
          minLogMensajes: logCountBefore + 2,
          ownerLabel: userName
        }).then(() => {
          if (!tituloStream) return;
          setDetail((d) => d && convIdsEqual(d.iconversacion, newId) && d.titulo !== tituloStream ? { ...d, titulo: tituloStream } : d);
          setRows((prev) => prev.map((r) => convIdsEqual(r.iconversacion, newId) && r.titulo !== tituloStream ? { ...r, titulo: tituloStream } : r));
        });
        const meta = result.meta || {};
        const loginUrl = String(meta.login_url || "").trim();
        const needsMcpPoll = Boolean(
          meta.mcp_await_front_poll || meta.contapyme_mcp_login || loginUrl || /ia\.contapyme\.com\/api\/login\/asw/i.test(String(result.respuesta || ""))
        );
        if (needsMcpPoll) {
          startMcpSessionPoll({
            convId: newId,
            sessionId: String(meta.session_id || "").trim() || void 0,
            pendingPrompt: String(meta.pending_prompt || text || "ya inici\xE9 sesi\xF3n").trim()
          });
        }
      } else if (result?.mensajesOpenAI?.length) {
        applyThreadFromDetail(result, null, userName);
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
      if (text) setDraft(text);
      if (imageEntries.length) {
        setImages(imageEntries);
      }
      if (audioEntries.length) {
        setAudios(audioEntries);
      }
      setLogMensajes((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i -= 1) {
          if (isEphemeralMsgId(copy[i].idMsg) && copy[i].esUsuario) {
            copy.splice(i, 1);
            break;
          }
        }
        return copy;
      });
      setSending(false);
      setStreamText("");
    }
  }
  async function appendImagesFromFiles(files) {
    if (!files?.length) return;
    try {
      const list = Array.from(files);
      if (hasHeicLikeFiles(list)) {
        toastWarning("HEIC/HEIF no se admite; usa PNG, JPEG, WebP o GIF");
      }
      const added = await filesToImageEntries(list);
      if (!added.length) {
        toastWarning("Solo se admiten im\xE1genes (PNG, JPEG, WebP, GIF)");
        return;
      }
      setImages((prev) => {
        const merged = [...prev, ...added];
        if (merged.length > MAX_CHAT_IMAGES) {
          toastWarning(`M\xE1ximo ${MAX_CHAT_IMAGES} im\xE1genes por mensaje`);
        }
        return merged.slice(0, MAX_CHAT_IMAGES);
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : String(err));
    }
  }
  async function appendAudiosFromFiles(files) {
    if (!files?.length) return;
    try {
      const added = await filesToAudioEntries(files);
      if (!added.length) {
        toastWarning("Solo se admiten audios (WebM, MP3, M4A, WAV, OGG)");
        return;
      }
      setAudios((prev) => {
        const merged = [...prev, ...added];
        if (merged.length > MAX_CHAT_AUDIOS) {
          toastWarning(`M\xE1ximo ${MAX_CHAT_AUDIOS} audios por mensaje`);
        }
        return merged.slice(0, MAX_CHAT_AUDIOS);
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : String(err));
    }
  }
  async function onToggleVoiceRecord() {
    if (!canSend || sending) return;
    const recorder = voiceRecorderRef.current;
    if (recorder.isActive()) {
      setIsRecording(false);
      try {
        const entry = await recorder.stop();
        if (!entry) {
          toastWarning("La grabaci\xF3n qued\xF3 vac\xEDa");
          return;
        }
        setAudios((prev) => {
          const merged = [...prev, entry];
          if (merged.length > MAX_CHAT_AUDIOS) {
            toastWarning(`M\xE1ximo ${MAX_CHAT_AUDIOS} audios por mensaje`);
          }
          return merged.slice(0, MAX_CHAT_AUDIOS);
        });
      } catch (err) {
        toastError(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    if (!isVoiceRecordingSupported()) {
      toastWarning("Tu navegador no admite grabaci\xF3n de voz");
      return;
    }
    if (audios.length >= MAX_CHAT_AUDIOS) {
      toastWarning(`M\xE1ximo ${MAX_CHAT_AUDIOS} audios por mensaje`);
      return;
    }
    try {
      await recorder.start();
      setIsRecording(true);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "No se pudo acceder al micr\xF3fono");
    }
  }
  function onAttachClick() {
    attachInputRef.current?.click();
  }
  async function onAttachChange(e) {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    const imageFiles = list.filter(isChatImageFile);
    const audioFiles = list.filter(isChatAudioFile);
    const unsupported = list.filter((f) => !isChatImageFile(f) && !isChatAudioFile(f));
    if (unsupported.length) {
      toastWarning("Solo se admiten im\xE1genes y audios");
    }
    if (imageFiles.length) await appendImagesFromFiles(imageFiles);
    if (audioFiles.length) await appendAudiosFromFiles(audioFiles);
    e.target.value = "";
  }
  async function onPaste(e) {
    if (!canSend) return;
    const files = readImagesFromClipboard(e.clipboardData?.items);
    if (!files.length) return;
    e.preventDefault();
    await appendImagesFromFiles(files);
  }
  const onMeta = useCallback2((msg) => {
    setMetaMsg(msg);
    setMetaOpen(true);
  }, []);
  onSendRef.current = onSend;
  const onContapymeLoginDone = useCallback2(() => {
    if (sendingRef.current || contapymeResumeLockRef.current || !canSend || !jwt) return;
    if (mcpPollRef.current) {
      void tickMcpSessionPoll();
      return;
    }
    const msgs = logMensajesRef.current || [];
    let pending = false;
    let pendingPrompt = "ya inici\xE9 sesi\xF3n";
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.esUsuario || m.esOperativa) continue;
      const t = String(m.contenido || "");
      if (/Sesión ContaPyme® activa|Sesión activa/i.test(t)) break;
      if (/ia\.contapyme\.com\/api\/login\/asw/i.test(t) || Boolean(m.meta?.login_url || m.meta?.extra?.login_url || m.meta?.contapyme_mcp_login || m.meta?.mcp_await_front_poll)) {
        pending = true;
        const sid = String(m.meta?.session_id || "").trim();
        const pp = String(m.meta?.pending_prompt || "").trim();
        if (pp) pendingPrompt = pp;
        if (selectedId) {
          startMcpSessionPoll({
            convId: selectedId,
            sessionId: sid || void 0,
            pendingPrompt
          });
          return;
        }
      }
      break;
    }
    if (!pending) return;
    contapymeResumeLockRef.current = true;
    void Promise.resolve(onSendRef.current("ya inici\xE9 sesi\xF3n")).finally(() => {
      window.setTimeout(() => {
        contapymeResumeLockRef.current = false;
      }, 8e3);
    });
  }, [canSend, jwt, selectedId, startMcpSessionPoll, tickMcpSessionPoll]);
  const onRateMessage = useCallback2(async (msg, butil) => {
    if (!canSend || !jwt?.token || !selectedId) return;
    if (msg.calificacion !== void 0) return;
    const imensaje = Number(msg.imensaje);
    if (!imensaje) {
      toastWarning("No se puede calificar este mensaje (sin identificador de mensaje).");
      return;
    }
    const contenido = String(msg.contenido || "").trim();
    if (!contenido) {
      toastWarning("No se puede calificar un mensaje vac\xEDo.");
      return;
    }
    setRatingMsgId(msg.idMsg);
    try {
      const saved = await postMensajeCalificado(jwt, {
        iconversacion: selectedId,
        contenido,
        imensaje,
        butil
      });
      const calificacion = butil ? 1 : 0;
      const imensajeDb = Number(saved?.imensaje) || msg.imensaje;
      setLogMensajes((prev) => prev.map((m) => m.idMsg === msg.idMsg ? { ...m, calificacion, imensaje: imensajeDb, idMsg: imensajeDb ? `msg-${imensajeDb}` : m.idMsg } : m));
      toastSuccess(butil ? "Marcado como \xFAtil" : "Marcado como no \xFAtil");
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setRatingMsgId(null);
    }
  }, [canSend, jwt, selectedId]);
  const chatUserDisplayName = useMemo4(
    () => resolveOwnerDisplayName(jwt, displayScope),
    [displayScope, jwt]
  );
  const chatUserNick = useMemo4(
    () => resolveOwnerNickname(jwt, sessionUser),
    [jwt, sessionUser]
  );
  const displayMensajes = useMemo4(
    () => appendStreamMsg(logMensajes, streamText, sending),
    [logMensajes, sending, streamText]
  );
  const showThread = Boolean(
    sending || selectedId && (loadingThread || detail || logMensajes.length > 0)
  );
  const onThreadScroll = useThreadScrollAnchor(threadScrollRef, displayMensajes, { sending });
  const postBodyPreview = useMemo4(
    () => buildConversacionPostBody({
      prompt: draft,
      iconversacion: selectedId || void 0,
      // preview sin URLs (se generan tras subir); muestra placeholders.
      imagenes: images.map((i) => i.uploadedUrl ?? `[local image: ${i.name} \xB7 ${i.mime} \xB7 ${i.blob.size}B]`),
      audios: audios.map((a) => a.uploadedUrl ?? `[local audio: ${a.name} \xB7 ${a.mime} \xB7 ${a.blob.size}B]`),
      mode: chatMode,
      provider: llmProvider
    }),
    [draft, selectedId, images, audios, chatMode, llmProvider]
  );
  const clearAuditFilter = useCallback2(() => {
    if (jwt?.claims?.itercero) {
      handleSelectAuditScope({ esJwt: true, itercero: jwt.claims.itercero, icontacto: jwt.claims.icontacto });
    } else {
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
    }
  }, [jwt?.claims?.itercero, jwt?.claims?.icontacto, handleSelectAuditScope]);
  const auditCurrentScope = listScope;
  const convListOwnerLabel = useMemo4(
    () => resolveConvListOwnerLabel(listScope, jwt, sessionUser),
    [listScope, jwt, sessionUser]
  );
  const convListHeader = useMemo4(
    () => resolveConvListHeader(listScope, jwt, sessionUser),
    [listScope, jwt, sessionUser]
  );
  return {
    loggedIn,
    jwt,
    jwtOpen,
    jwtLoading,
    sessionUser,
    canAdminJwt,
    canAuditChat,
    canInteract,
    canSend,
    viewOnly,
    needsJwt,
    displayScope,
    listScope,
    sessionScopeLoading,
    viewingAuditOther,
    auditScope,
    rows,
    selectedId,
    detail,
    loadingList,
    loadingThread,
    sending,
    draft,
    images,
    audios,
    isRecording,
    logError,
    metaOpen,
    metaMsg,
    payloadPreviewOpen,
    auditDialogOpen,
    convListPage,
    convListPageSize,
    convListMeta,
    convListSearch,
    messageSource,
    chatMode,
    llmProvider,
    chatUserDisplayName,
    chatUserNick,
    convListOwnerLabel,
    convListHeader,
    displayMensajes,
    showThread,
    ratingMsgId,
    threadScrollRef,
    inputRef,
    attachInputRef,
    postBodyPreview,
    auditCurrentScope,
    onThreadScroll,
    setJwt,
    setJwtOpen,
    setAuditDialogOpen,
    setPayloadPreviewOpen,
    setMetaOpen,
    setConvListPage,
    handleConvListSearchChange,
    handleSelectAuditScope,
    clearAuditFilter,
    openConv,
    onNewChat,
    onDelete,
    onSend,
    onContapymeLoginDone,
    onPaste,
    onAttachClick,
    onAttachChange,
    onToggleVoiceRecord,
    onMeta,
    onRateMessage,
    onMessageSourceChange,
    onChatModeChange,
    onLlmProviderChange,
    onConvListPageSizeChange,
    setDraft,
    setImages,
    setAudios
  };
}

// src/js/tools/chat/ChatLoggedOutShell.jsx
init_platform();
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
var {
  Box: Box3,
  Typography: Typography3,
  Stack: Stack3,
  Alert
} = getMaterialUI();
var { Icon: Icon2 } = UI;
function ChatLoggedOutShell() {
  return /* @__PURE__ */ jsxs4(
    Box3,
    {
      className: "conv-log-shell paty-chat-shell paty-chat-shell--logged-out",
      sx: { display: "flex", height: "100%", minHeight: 0, flexDirection: { xs: "column", md: "row" } },
      children: [
        /* @__PURE__ */ jsxs4(
          Box3,
          {
            className: "conv-log-sidebar paty-chat-sidebar",
            sx: {
              width: { xs: "100%", md: CHAT_SIDEBAR_W },
              flexShrink: 0,
              borderBottom: { xs: 1, md: 0 },
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              maxHeight: { xs: "42vh", md: "none" },
              opacity: 0.55,
              pointerEvents: "none"
            },
            "aria-hidden": "true",
            children: [
              /* @__PURE__ */ jsx5(Stack3, { direction: "row", spacing: 1, alignItems: "center", className: "conv-log-sidebar-block", sx: { py: 1, borderBottom: 1, borderColor: "divider" }, children: /* @__PURE__ */ jsx5(Icon2, { icon: "mdi:chat-outline", size: 20 }) }),
              /* @__PURE__ */ jsx5(Box3, { className: "conv-log-sidebar-block paty-chat-sidebar-meta", sx: { pt: 0.75, pb: 0.75 }, children: /* @__PURE__ */ jsxs4(Box3, { className: "paty-chat-session paty-chat-session--skeleton", children: [
                /* @__PURE__ */ jsx5(Box3, { className: "paty-chat-session__avatar", children: /* @__PURE__ */ jsx5(Icon2, { icon: "mdi:account-outline", size: 20 }) }),
                /* @__PURE__ */ jsxs4(Box3, { className: "paty-chat-session__body", children: [
                  /* @__PURE__ */ jsx5("span", { className: "paty-chat-skeleton-line paty-chat-skeleton-line--md" }),
                  /* @__PURE__ */ jsx5("span", { className: "paty-chat-skeleton-line paty-chat-skeleton-line--sm" })
                ] })
              ] }) }),
              /* @__PURE__ */ jsxs4(Box3, { className: "conv-log-sidebar-block", sx: { flex: 1, pb: 1.5 }, children: [
                /* @__PURE__ */ jsx5(Typography3, { variant: "caption", color: "text.secondary", sx: { mb: 1, display: "block" }, children: "Conversaciones" }),
                [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxs4(Box3, { className: "paty-chat-skeleton-conv", children: [
                  /* @__PURE__ */ jsx5("span", { className: "paty-chat-skeleton-line paty-chat-skeleton-line--xs" }),
                  /* @__PURE__ */ jsx5("span", { className: "paty-chat-skeleton-line paty-chat-skeleton-line--lg" })
                ] }, i))
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxs4(Box3, { sx: { flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }, children: [
          /* @__PURE__ */ jsx5(Box3, { sx: convLogSurfaceSx({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, opacity: 0.45, pointerEvents: "none" }), "aria-hidden": "true", children: /* @__PURE__ */ jsx5(Box3, { sx: { textAlign: "center", maxWidth: 420, p: 2, borderRadius: 2, border: 1, borderColor: "divider", borderStyle: "dashed" }, children: /* @__PURE__ */ jsx5(Typography3, { variant: "body2", color: "text.secondary", children: "\xC1rea de conversaci\xF3n" }) }) }),
          /* @__PURE__ */ jsx5(Box3, { className: "paty-chat-gate paty-chat-gate--overlay", children: /* @__PURE__ */ jsxs4(
            Box3,
            {
              className: "paty-chat-gate__inner isa-glass-card",
              sx: { p: { xs: 2.5, sm: 3 }, display: "flex", flexDirection: "column", gap: 2, alignItems: "stretch", boxSizing: "border-box", maxWidth: 520, width: "100%" },
              children: [
                /* @__PURE__ */ jsxs4(Stack3, { direction: "row", spacing: 1, alignItems: "center", justifyContent: "center", children: [
                  /* @__PURE__ */ jsx5(Icon2, { icon: "mdi:login", width: "1.35em", height: "1.35em", style: { opacity: 0.85, flexShrink: 0 } }),
                  /* @__PURE__ */ jsx5(Typography3, { variant: "h6", sx: { fontWeight: 700 }, children: "Chat" })
                ] }),
                /* @__PURE__ */ jsx5(Alert, { severity: "info", sx: { textAlign: "left", py: 0.75, px: 1.25 }, children: "Inicia sesi\xF3n con el bot\xF3n de la barra superior para ver conversaciones." })
              ]
            }
          ) })
        ] })
      ]
    }
  );
}

// src/js/tools/chat/ChatThreadSidebar.jsx
init_platform();
init_patyia_jwt();

// src/js/tools/chat/ChatSessionPanel.jsx
init_platform();
init_patyia();
init_patyia_jwt();
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var { useState: useState5, useEffect: useEffect6, useMemo: useMemo5 } = getReact();
var { Box: Box4, Typography: Typography4, CircularProgress, Chip: Chip3 } = getMaterialUI();
var { Icon: Icon3 } = UI;
var CHIP_SX = {
  live: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.6rem", fontWeight: 600 } },
  readonly: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.6rem", fontWeight: 600 } },
  loading: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.6rem", fontWeight: 600 } }
};
function SessionModeChip({ canSend, jwtLoading }) {
  if (canSend) {
    return /* @__PURE__ */ jsx6(
      Chip3,
      {
        size: "small",
        variant: "outlined",
        label: "Interactivo",
        icon: /* @__PURE__ */ jsx6(Icon3, { icon: "mdi:chat-processing-outline", size: 12, "aria-hidden": true }),
        className: "paty-chat-session__badge paty-chat-session__badge--live",
        sx: CHIP_SX.live
      }
    );
  }
  if (jwtLoading) {
    return /* @__PURE__ */ jsx6(
      Chip3,
      {
        size: "small",
        variant: "outlined",
        label: "Token\u2026",
        icon: /* @__PURE__ */ jsx6(CircularProgress, { size: 9, color: "inherit" }),
        className: "paty-chat-session__badge paty-chat-session__badge--loading",
        sx: CHIP_SX.loading
      }
    );
  }
  return /* @__PURE__ */ jsx6(
    Chip3,
    {
      size: "small",
      variant: "outlined",
      label: "Solo lectura",
      icon: /* @__PURE__ */ jsx6(Icon3, { icon: "mdi:eye-outline", size: 12, "aria-hidden": true }),
      className: "paty-chat-session__badge paty-chat-session__badge--readonly",
      sx: CHIP_SX.readonly
    }
  );
}
function ChatSessionPanel({ claims, displayScope, sessionUser: _sessionUser, ownerDisplayName, canSend, jwtLoading, canAudit = false, onOpenAudit }) {
  const tercero = displayScope?.itercero ?? claims?.itercero;
  const contacto = displayScope?.icontacto ?? claims?.icontacto;
  const codes = [tercero, contacto].filter(Boolean).join(" \xB7 ");
  const scopeName = String(displayScope?.nombre ?? "").trim();
  const claimsName = jwtUserDisplayName(claims) || jwtUserShortName(claims);
  const primaryLabel = String(ownerDisplayName ?? "").trim() || scopeName || claimsName || codes || "ISA PatyIA";
  const avatarUrl = useMemo5(() => buildUserAvatarUrl(primaryLabel, 72), [primaryLabel]);
  const [avatarOk, setAvatarOk] = useState5(true);
  useEffect6(() => {
    setAvatarOk(true);
  }, [avatarUrl]);
  const interactive = !!canAudit && typeof onOpenAudit === "function";
  return /* @__PURE__ */ jsxs5(
    Box4,
    {
      className: `paty-chat-session${interactive ? " paty-chat-session--clickable" : ""}`,
      role: interactive ? "button" : void 0,
      tabIndex: interactive ? 0 : void 0,
      title: interactive ? "Filtrar conversaciones por usuario" : void 0,
      "aria-label": interactive ? `Filtrar por ${primaryLabel}` : void 0,
      onClick: interactive ? () => onOpenAudit?.() : void 0,
      onKeyDown: interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenAudit?.();
        }
      } : void 0,
      children: [
        /* @__PURE__ */ jsx6(Box4, { className: "paty-chat-session__avatar", "aria-hidden": true, children: avatarOk ? /* @__PURE__ */ jsx6("img", { className: "paty-chat-session__avatar-img", src: avatarUrl, alt: "", width: 36, height: 36, loading: "lazy", decoding: "async", onError: () => setAvatarOk(false) }) : /* @__PURE__ */ jsx6(Icon3, { icon: "mdi:account-circle", size: 28 }) }),
        /* @__PURE__ */ jsxs5(Box4, { className: "paty-chat-session__body", children: [
          /* @__PURE__ */ jsx6(Typography4, { className: "paty-chat-session__name", noWrap: true, title: primaryLabel, children: primaryLabel }),
          /* @__PURE__ */ jsxs5(Box4, { className: "paty-chat-session__meta", children: [
            /* @__PURE__ */ jsx6(SessionModeChip, { canSend, jwtLoading }),
            codes ? /* @__PURE__ */ jsx6(
              Typography4,
              {
                className: "paty-chat-session__ids",
                variant: "caption",
                component: "span",
                title: codes,
                sx: { fontSize: "0.58rem", lineHeight: 1.15, color: "rgba(148, 163, 184, 0.72)", fontWeight: 400 },
                children: codes
              }
            ) : null
          ] })
        ] }),
        /* @__PURE__ */ jsx6(Box4, { className: "paty-chat-session__action", "aria-hidden": true, children: /* @__PURE__ */ jsx6(Icon3, { icon: "mdi:filter-variant", size: 14 }) })
      ]
    }
  );
}

// src/js/tools/chat/ConvSearchAutocomplete.jsx
init_platform();
import { Fragment as Fragment2, jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
import { createElement } from "react";
var { useState: useState6, useEffect: useEffect7, useRef: useRef4, useCallback: useCallback3, useMemo: useMemo6 } = getReact();
var { Autocomplete, TextField, Typography: Typography5, Box: Box5, IconButton: IconButton2, InputAdornment } = getMaterialUI();
var { Icon: Icon4 } = UI;
var DEBOUNCE_MS = 300;
function convSearchFilter(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  const head = raw.split("\xB7")[0].trim();
  const digits = head.replace(/\D/g, "");
  return digits || "";
}
function convOptionLabel(row) {
  if (!row) return "";
  const title = String(row.titulo ?? "").trim() || "Sin t\xEDtulo";
  return `${row.iconversacion} \xB7 ${title}`;
}
function convSelectedLabel(row) {
  if (!row?.iconversacion) return "";
  return String(row.iconversacion);
}
function ConvSearchAutocomplete({
  rows = [],
  loading = false,
  search = "",
  onSearchChange,
  selectedId,
  onSelectConv,
  disabled = false,
  placeholder = "Buscar por # conversaci\xF3n\u2026"
}) {
  const [inputValue, setInputValue] = useState6(search ?? "");
  const debounceRef = useRef4(null);
  useEffect7(() => {
    setInputValue(search ?? "");
  }, [search]);
  const selected = useMemo6(() => {
    if (!selectedId) return null;
    return rows.find((r) => Number(r.iconversacion) === Number(selectedId)) ?? null;
  }, [rows, selectedId]);
  const scheduleSearch = useCallback3((text) => {
    const filter = convSearchFilter(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange?.(filter), DEBOUNCE_MS);
  }, [onSearchChange]);
  const applySearchNow = useCallback3((text) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const filter = convSearchFilter(text);
    onSearchChange?.(filter);
    return filter;
  }, [onSearchChange]);
  const clearSearch = useCallback3(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue("");
    onSearchChange?.("");
  }, [onSearchChange]);
  useEffect7(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);
  const showClear = Boolean(inputValue?.trim());
  const [menuOpen, setMenuOpen] = useState6(false);
  const fusedOpen = menuOpen ? " paty-chat-conv-search--open" : "";
  return /* @__PURE__ */ jsx7(
    Autocomplete,
    {
      fullWidth: true,
      size: "small",
      className: `paty-chat-conv-search${fusedOpen}`,
      open: menuOpen,
      onOpen: () => setMenuOpen(true),
      onClose: () => setMenuOpen(false),
      openOnFocus: true,
      autoHighlight: true,
      clearOnBlur: false,
      disableClearable: true,
      disabled,
      loading,
      options: rows,
      value: selected,
      inputValue,
      filterOptions: (x) => x,
      getOptionLabel: convOptionLabel,
      isOptionEqualToValue: (a, b) => Number(a?.iconversacion) === Number(b?.iconversacion),
      noOptionsText: loading ? "Buscando\u2026" : "Sin conversaciones",
      loadingText: "Buscando\u2026",
      slotProps: {
        paper: { className: menuOpen ? "paty-chat-conv-search__paper paty-chat-conv-search__paper--open" : "paty-chat-conv-search__paper" },
        popper: {
          className: menuOpen ? "paty-chat-conv-search__popper paty-chat-conv-search__popper--open" : "paty-chat-conv-search__popper",
          modifiers: [{ name: "offset", options: { offset: [0, 0] } }]
        }
      },
      onInputChange: (_e, text, reason) => {
        if (reason === "reset") {
          const id = selected ? convSelectedLabel(selected) : convSearchFilter(text);
          setInputValue(id);
          return;
        }
        setInputValue(text);
        scheduleSearch(text);
      },
      onChange: (_e, row) => {
        if (row?.iconversacion) {
          const id = convSelectedLabel(row);
          applySearchNow(id);
          setInputValue(id);
          onSelectConv?.(row.iconversacion);
        }
      },
      renderOption: (props, row) => /* @__PURE__ */ createElement(
        Box5,
        {
          component: "li",
          ...props,
          key: row.iconversacion,
          className: "paty-chat-conv-search__option",
          sx: { display: "flex", alignItems: "center", justifyContent: "flex-start", py: 0.75 }
        },
        /* @__PURE__ */ jsxs6(Typography5, { variant: "body2", className: "paty-chat-conv-search__option-label", sx: { fontWeight: 600 }, noWrap: true, children: [
          /* @__PURE__ */ jsx7(Box5, { component: "span", className: "paty-chat-conv-search__option-id", children: row.iconversacion }),
          /* @__PURE__ */ jsx7(Box5, { component: "span", className: "paty-chat-conv-search__option-title", children: String(row.titulo ?? "").trim() || "Sin t\xEDtulo" })
        ] })
      ),
      renderInput: (params) => {
        const inputProps = params.InputProps ?? params.slotProps?.input ?? {};
        return /* @__PURE__ */ jsx7(
          TextField,
          {
            ...params,
            size: "small",
            placeholder,
            InputProps: {
              ...inputProps,
              endAdornment: /* @__PURE__ */ jsxs6(Fragment2, { children: [
                showClear ? /* @__PURE__ */ jsx7(InputAdornment, { position: "end", children: /* @__PURE__ */ jsx7(IconButton2, { size: "small", "aria-label": "Limpiar b\xFAsqueda", className: "paty-chat-conv-search__clear", onMouseDown: (e) => e.preventDefault(), onClick: clearSearch, children: /* @__PURE__ */ jsx7(Icon4, { icon: "mdi:close", size: 16 }) }) }) : null,
                inputProps.endAdornment
              ] })
            }
          }
        );
      }
    }
  );
}

// src/js/tools/chat/ChatThreadSidebar.jsx
import { Fragment as Fragment3, jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
var {
  Box: Box6,
  Typography: Typography6,
  Button,
  IconButton: IconButton3,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress: CircularProgress2,
  Tooltip: Tooltip2,
  Stack: Stack4,
  Divider,
  Select,
  MenuItem,
  FormControl
} = getMaterialUI();
var { Icon: Icon5 } = UI;
function MessageSourceSwitch({ messageSource, onChange }) {
  const isProd = messageSource === "prod";
  const title = isProd ? "Modo producci\xF3n (sin meta)" : "Modo logs (con meta)";
  const hint = isProd ? "Clic para ver logs" : "Clic para ver producci\xF3n";
  const icon = isProd ? "mdi:earth" : "mdi:code-json";
  return /* @__PURE__ */ jsx8(Tooltip2, { title: `${title} \xB7 ${hint}`, children: /* @__PURE__ */ jsx8(IconButton3, { color: "inherit", size: "small", onClick: () => onChange?.(isProd ? "logs" : "prod"), "aria-label": title, "aria-pressed": !isProd, children: /* @__PURE__ */ jsx8(Icon5, { icon, size: 18 }) }) });
}
function ChatModeSwitch({ mode, onChange }) {
  const isLibre = isLibreChatMode(mode);
  const title = isLibre ? "Libre" : "Patyia";
  const icon = isLibre ? "game-icons:freedom-dove" : "game-icons:bird-cage";
  return /* @__PURE__ */ jsx8(Tooltip2, { title, children: /* @__PURE__ */ jsx8(
    IconButton3,
    {
      color: "inherit",
      size: "small",
      className: `paty-chat-mode-btn${isLibre ? " paty-chat-mode-btn--libre" : ""}`,
      onClick: () => onChange?.(isLibre ? CHAT_MODE_PATYIA : CHAT_MODE_LIBRE),
      "aria-label": title,
      "aria-pressed": isLibre,
      children: /* @__PURE__ */ jsx8(Icon5, { icon, size: 18 })
    }
  ) });
}
function LlmProviderSwitch({ provider, onChange }) {
  const isMm = isMinimaxChatProvider(provider);
  const title = isMm ? "MiniMax M3" : "OpenAI";
  const hint = isMm ? "Clic \u2192 OpenAI (default)" : "Clic \u2192 MiniMax M3 (experimental)";
  const icon = isMm ? "mdi:creation" : "simple-icons:openai";
  return /* @__PURE__ */ jsx8(Tooltip2, { title: `${title} \xB7 ${hint}`, children: /* @__PURE__ */ jsx8(
    Button,
    {
      size: "small",
      variant: "text",
      color: "inherit",
      className: `paty-chat-provider-btn${isMm ? " paty-chat-provider-btn--minimax" : ""}`,
      onClick: () => onChange?.(isMm ? CHAT_PROVIDER_OPENAI : CHAT_PROVIDER_MINIMAX),
      "aria-label": title,
      "aria-pressed": isMm,
      startIcon: /* @__PURE__ */ jsx8(Icon5, { icon, size: 16 }),
      sx: { textTransform: "none", minWidth: 0, px: 0.75, py: 0.25, fontWeight: 600, fontSize: "0.75rem", lineHeight: 1.2, bgcolor: "transparent", boxShadow: "none", "&:hover": { bgcolor: "transparent" } },
      children: isMm ? "MiniMax" : "OpenAI"
    }
  ) });
}
function ChatSidebarHeaderActions({
  onClose,
  messageSource = "logs",
  mode = CHAT_MODE_PATYIA,
  llmProvider = CHAT_PROVIDER_OPENAI,
  onMessageSourceChange,
  onChatModeChange,
  onLlmProviderChange
}) {
  return /* @__PURE__ */ jsxs7(
    Stack4,
    {
      direction: "row",
      spacing: 0.35,
      alignItems: "center",
      className: "paty-chat-sidebar-head-actions",
      onClick: (e) => e.stopPropagation(),
      onKeyDown: (e) => e.stopPropagation(),
      children: [
        onClose ? /* @__PURE__ */ jsx8(Tooltip2, { title: "Cerrar panel", children: /* @__PURE__ */ jsx8(IconButton3, { size: "small", onClick: onClose, "aria-label": "Cerrar panel", children: /* @__PURE__ */ jsx8(Icon5, { icon: "mdi:close", size: 18 }) }) }) : null,
        onMessageSourceChange ? /* @__PURE__ */ jsx8(MessageSourceSwitch, { messageSource, onChange: onMessageSourceChange }) : null,
        onChatModeChange ? /* @__PURE__ */ jsx8(ChatModeSwitch, { mode, onChange: onChatModeChange }) : null,
        onLlmProviderChange ? /* @__PURE__ */ jsx8(LlmProviderSwitch, { provider: llmProvider, onChange: onLlmProviderChange }) : null
      ]
    }
  );
}
function ChatNewConversationButton({ canSend, onNewChat, onClose, compact = false }) {
  const handleClick = () => {
    onNewChat?.();
    onClose?.();
  };
  return /* @__PURE__ */ jsx8(Tooltip2, { title: "Nueva conversaci\xF3n", children: /* @__PURE__ */ jsx8("span", { children: compact ? /* @__PURE__ */ jsx8(IconButton3, { size: "small", color: "primary", disabled: !canSend, onClick: handleClick, "aria-label": "Nueva conversaci\xF3n", children: /* @__PURE__ */ jsx8(Icon5, { icon: "mdi:plus", size: 20 }) }) : /* @__PURE__ */ jsx8(Button, { variant: "contained", size: "small", disabled: !canSend, startIcon: /* @__PURE__ */ jsx8(Icon5, { icon: "mdi:plus", size: 16 }), onClick: handleClick, children: "Nueva" }) }) });
}
function ChatSidebarBody({
  jwt,
  displayScope,
  sessionUser,
  canSend,
  canAuditChat = false,
  jwtLoading,
  needsJwt,
  listScope,
  sessionScopeLoading,
  viewingAuditOther,
  convListOwnerLabel,
  convListHeader,
  loadingList,
  rows,
  selectedId,
  convListMeta,
  convListPage,
  convListPageSize,
  convListSearch,
  onConvListSearchChange,
  onOpenAudit,
  onNewChat,
  onOpenConv,
  onDelete,
  onConvListPageChange,
  onConvListPageSizeChange,
  onClose
}) {
  const handleOpenConv = (id) => {
    onOpenConv(id);
    onClose?.();
  };
  return /* @__PURE__ */ jsxs7(Fragment3, { children: [
    /* @__PURE__ */ jsx8(Box6, { className: "conv-log-sidebar-block paty-chat-sidebar-meta", sx: { pt: 0.75, pb: 0.75, flexShrink: 0 }, children: /* @__PURE__ */ jsx8(
      ChatSessionPanel,
      {
        claims: jwt?.claims ?? null,
        displayScope,
        sessionUser,
        ownerDisplayName: resolveOwnerDisplayName(jwt, displayScope),
        canSend,
        jwtLoading,
        canAudit: canAuditChat,
        onOpenAudit
      }
    ) }),
    /* @__PURE__ */ jsx8(Divider, { sx: { my: 1 } }),
    /* @__PURE__ */ jsxs7(Box6, { className: "conv-log-sidebar-block paty-chat-sidebar-list-head", sx: { flexShrink: 0, pb: 0.5 }, children: [
      /* @__PURE__ */ jsxs7(Stack4, { direction: "row", alignItems: "flex-start", spacing: 0.75, sx: { mb: 0.5, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxs7(Typography6, { variant: "caption", color: "text.secondary", sx: { flex: 1, minWidth: 0, fontWeight: 600 }, children: [
          "Conversaciones",
          (jwt?.token || listScope) && (convListHeader || convListOwnerLabel) ? /* @__PURE__ */ jsx8(Stack4, { direction: "row", spacing: 0.5, alignItems: "center", useFlexGap: true, flexWrap: "wrap", sx: { mt: 0.25 }, children: /* @__PURE__ */ jsx8(Typography6, { variant: "caption", sx: { fontWeight: 500, color: "text.primary" }, children: convListHeader || convListOwnerLabel }) }) : null,
          needsJwt ? /* @__PURE__ */ jsx8(Typography6, { component: "span", variant: "caption", sx: { display: "block", color: "info.main", mt: 0.25 }, children: listScope?.nombre ? `${listScope.nombre} \xB7 modo lectura` : sessionScopeLoading ? "Buscando tus conversaciones\u2026" : "Sin contacto identificado \xB7 filtra por usuario" }) : null
        ] }),
        /* @__PURE__ */ jsx8(Box6, { sx: { flexShrink: 0, pt: 0.1 }, children: /* @__PURE__ */ jsx8(ChatNewConversationButton, { canSend, onNewChat, onClose }) })
      ] }),
      /* @__PURE__ */ jsx8(
        ConvSearchAutocomplete,
        {
          rows,
          loading: loadingList,
          search: convListSearch,
          onSearchChange: onConvListSearchChange,
          selectedId,
          onSelectConv: handleOpenConv,
          disabled: needsJwt && !listScope?.icontacto
        }
      )
    ] }),
    /* @__PURE__ */ jsxs7(
      Box6,
      {
        className: "conv-log-sidebar-block paty-chat-sidebar-list-scroll",
        sx: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" },
        children: [
          /* @__PURE__ */ jsx8(Box6, { className: "paty-chat-sidebar-list-inner", sx: { flex: 1, minHeight: 0, overflow: "auto" }, children: /* @__PURE__ */ jsxs7(List, { dense: true, disablePadding: true, children: [
            loadingList && !rows.length && /* @__PURE__ */ jsx8(Box6, { sx: { py: 2, textAlign: "center" }, children: /* @__PURE__ */ jsx8(CircularProgress2, { size: 22 }) }),
            rows.map((r) => {
              const convTitle = r.titulo || "Sin t\xEDtulo";
              const convTip = `${r.iconversacion} \xB7 ${convTitle}`;
              return /* @__PURE__ */ jsxs7(
                ListItemButton,
                {
                  className: "paty-chat-conv-item",
                  selected: Number(selectedId) > 0 && Number(selectedId) === Number(r.iconversacion),
                  onClick: () => handleOpenConv(r.iconversacion),
                  title: convTip,
                  "aria-label": convTip,
                  sx: {
                    py: 0.5,
                    px: 0,
                    minHeight: 36,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 0.5
                  },
                  children: [
                    /* @__PURE__ */ jsx8(
                      ListItemText,
                      {
                        sx: { flex: 1, minWidth: 0, m: 0 },
                        primary: /* @__PURE__ */ jsxs7(Stack4, { direction: "row", spacing: 0.5, alignItems: "center", className: "paty-chat-conv-item__title", sx: { minWidth: 0, pointerEvents: "none" }, children: [
                          /* @__PURE__ */ jsx8("span", { className: "paty-chat-conv-id-badge", children: r.iconversacion }),
                          /* @__PURE__ */ jsx8(Typography6, { component: "span", variant: "body2", noWrap: true, sx: { fontWeight: 600, minWidth: 0, flex: 1 }, children: convTitle })
                        ] }),
                        secondary: /* @__PURE__ */ jsx8(
                          Typography6,
                          {
                            component: "span",
                            variant: "caption",
                            color: "text.secondary",
                            noWrap: true,
                            className: "paty-chat-conv-item__meta",
                            sx: { pointerEvents: "none", display: "block", lineHeight: 1.3, opacity: 0.5 },
                            children: `${formatTs(r.fhultact)} \xB7 ${r.qmensajes ?? 0} msgs`
                          }
                        ),
                        slotProps: {
                          primary: { sx: { pointerEvents: "none", mb: 0.2 } },
                          secondary: { sx: { pointerEvents: "none", m: 0, opacity: 0.5 } }
                        }
                      }
                    ),
                    canSend && convBelongsToJwt(r, jwt.claims) ? /* @__PURE__ */ jsx8(IconButton3, { size: "small", color: "error", "aria-label": "Eliminar", className: "paty-chat-conv-item__delete", onClick: (e) => {
                      e.stopPropagation();
                      onDelete(r.iconversacion);
                    }, sx: { flexShrink: 0, mr: 0 }, children: /* @__PURE__ */ jsx8(Icon5, { icon: "mdi:delete-outline", size: 16 }) }) : null
                  ]
                },
                r.iconversacion
              );
            })
          ] }) }),
          convListMeta ? /* @__PURE__ */ jsx8(Box6, { className: "conv-log-sidebar-block paty-chat-sidebar-list-foot paty-chat-sidebar-list-foot--sticky", sx: { flexShrink: 0, pt: 0.5, pb: 0.5, px: 0 }, children: /* @__PURE__ */ jsxs7(Box6, { className: "paty-chat-conv-pager", role: "navigation", "aria-label": "Paginaci\xF3n de conversaciones", children: [
            /* @__PURE__ */ jsxs7(
              Typography6,
              {
                component: "span",
                variant: "caption",
                className: "paty-chat-conv-pager__meta",
                "aria-label": `P\xE1gina ${convListMeta.page} de ${Math.max(convListMeta.pages, 1)}`,
                children: [
                  convListMeta.page,
                  "/",
                  Math.max(convListMeta.pages, 1)
                ]
              }
            ),
            /* @__PURE__ */ jsxs7(Stack4, { direction: "row", spacing: 0.35, alignItems: "center", className: "paty-chat-conv-pager__controls", children: [
              onConvListPageSizeChange ? /* @__PURE__ */ jsx8(
                Tooltip2,
                {
                  title: "Conversaciones por p\xE1gina",
                  slotProps: { popper: { sx: { pointerEvents: "none" } } },
                  children: /* @__PURE__ */ jsx8(FormControl, { className: "paty-chat-conv-pager__size", sx: { m: 0, minWidth: 44 }, children: /* @__PURE__ */ jsx8(
                    Select,
                    {
                      size: "small",
                      value: convListPageSize,
                      onChange: (e) => onConvListPageSizeChange(Number(e.target.value)),
                      "aria-label": "Conversaciones por p\xE1gina",
                      disabled: loadingList,
                      variant: "outlined",
                      MenuProps: { PaperProps: { sx: { "& .MuiMenuItem-root": { minHeight: 24, py: 0.2, fontSize: "0.68rem" } } } },
                      children: CONV_LIST_PAGE_SIZE_OPTIONS.map((n) => /* @__PURE__ */ jsx8(MenuItem, { value: n, children: n }, n))
                    }
                  ) })
                }
              ) : null,
              convListMeta.pages > 1 ? /* @__PURE__ */ jsxs7(Stack4, { direction: "row", spacing: 0.5, className: "paty-chat-conv-pager__nav", children: [
                /* @__PURE__ */ jsx8(Tooltip2, { title: "P\xE1gina anterior", children: /* @__PURE__ */ jsx8("span", { children: /* @__PURE__ */ jsx8(
                  IconButton3,
                  {
                    size: "small",
                    className: "paty-chat-conv-pager__btn",
                    "aria-label": "P\xE1gina anterior",
                    disabled: loadingList || convListPage <= 1,
                    onClick: () => onConvListPageChange((p) => Math.max(1, p - 1)),
                    children: /* @__PURE__ */ jsx8(Icon5, { icon: "mdi:chevron-left", size: 16 })
                  }
                ) }) }),
                /* @__PURE__ */ jsx8(Tooltip2, { title: "P\xE1gina siguiente", children: /* @__PURE__ */ jsx8("span", { children: /* @__PURE__ */ jsx8(
                  IconButton3,
                  {
                    size: "small",
                    className: "paty-chat-conv-pager__btn",
                    "aria-label": "P\xE1gina siguiente",
                    disabled: loadingList || convListPage >= convListMeta.pages,
                    onClick: () => onConvListPageChange((p) => p + 1),
                    children: /* @__PURE__ */ jsx8(Icon5, { icon: "mdi:chevron-right", size: 16 })
                  }
                ) }) })
              ] }) : null
            ] })
          ] }) }) : null
        ]
      }
    )
  ] });
}
function ChatThreadSidebar({
  jwt,
  displayScope,
  sessionUser,
  canInteract,
  viewOnly,
  jwtLoading,
  canSend,
  canAuditChat = false,
  needsJwt,
  listScope,
  sessionScopeLoading,
  viewingAuditOther,
  auditScope,
  convListOwnerLabel,
  convListHeader,
  loadingList,
  rows,
  selectedId,
  convListMeta,
  convListPage,
  convListPageSize = CONV_LIST_PAGE_SIZE_DEFAULT,
  convListSearch = "",
  onConvListSearchChange,
  messageSource = "logs",
  mode = CHAT_MODE_PATYIA,
  llmProvider = CHAT_PROVIDER_OPENAI,
  onMessageSourceChange,
  onChatModeChange,
  onLlmProviderChange,
  onOpenJwt,
  onOpenAudit,
  onNewChat,
  onOpenConv,
  onDelete,
  onConvListPageChange,
  onConvListPageSizeChange,
  drawerMode = false,
  splitMode = false,
  onClose
}) {
  const bodyProps = {
    jwt,
    displayScope,
    sessionUser,
    canSend,
    canAuditChat,
    jwtLoading,
    needsJwt,
    listScope,
    sessionScopeLoading,
    viewingAuditOther,
    convListOwnerLabel,
    convListHeader,
    loadingList,
    rows,
    selectedId,
    convListMeta,
    convListPage,
    convListPageSize,
    convListSearch,
    onConvListSearchChange,
    onOpenAudit,
    onNewChat,
    onOpenConv,
    onDelete,
    onConvListPageChange,
    onConvListPageSizeChange,
    onClose
  };
  if (splitMode) {
    return /* @__PURE__ */ jsx8(
      Box6,
      {
        className: "paty-chat-sidebar-inner",
        sx: { display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "hidden" },
        children: /* @__PURE__ */ jsx8(ChatSidebarBody, { ...bodyProps })
      }
    );
  }
  return /* @__PURE__ */ jsxs7(
    Box6,
    {
      className: "conv-log-sidebar paty-chat-sidebar",
      sx: {
        position: "relative",
        width: drawerMode ? "100%" : { xs: "100%", md: CHAT_SIDEBAR_W },
        flexShrink: 0,
        borderRight: drawerMode ? 0 : { md: 0 },
        borderBottom: drawerMode ? 0 : { xs: 1, md: 0 },
        borderColor: "divider",
        bgcolor: "background.paper",
        display: drawerMode ? "flex" : { xs: "none", md: "flex" },
        flexDirection: "column",
        minHeight: 0,
        height: drawerMode ? "100%" : "auto",
        maxHeight: drawerMode ? "100%" : { xs: "42vh", md: "none" },
        overflow: drawerMode ? "hidden" : "visible",
        boxSizing: "border-box"
      },
      children: [
        onClose || onMessageSourceChange || onChatModeChange || onLlmProviderChange ? /* @__PURE__ */ jsx8(
          Stack4,
          {
            direction: "row",
            spacing: 1,
            alignItems: "center",
            justifyContent: "flex-end",
            className: "conv-log-sidebar-block",
            sx: { py: 0.5, borderBottom: 1, borderColor: "divider", flexShrink: 0 },
            children: /* @__PURE__ */ jsx8(
              ChatSidebarHeaderActions,
              {
                onClose,
                messageSource,
                mode,
                llmProvider,
                onMessageSourceChange,
                onChatModeChange,
                onLlmProviderChange
              }
            )
          }
        ) : null,
        /* @__PURE__ */ jsx8(ChatSidebarBody, { ...bodyProps })
      ]
    }
  );
}

// src/js/tools/chat/ChatMainPanel.jsx
init_platform();

// src/js/ui/ConvLogThread.jsx
init_platform();

// src/js/ui/ConvLogWebView.jsx
init_platform();
init_platform();
init_platform();
import { Fragment as Fragment4, jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
var { useMemo: useMemo7, useState: useState7, useRef: useRef5, useEffect: useEffect8, memo } = getReact();
function useOperativaEnterIds(mensajes, threadKey, { enabled = true } = {}) {
  const seenIdsRef = useRef5(/* @__PURE__ */ new Set());
  const primedKeyRef = useRef5(null);
  const [enterIds, setEnterIds] = useState7(() => /* @__PURE__ */ new Set());
  useEffect8(() => {
    if (primedKeyRef.current === threadKey) return;
    primedKeyRef.current = threadKey;
    seenIdsRef.current = /* @__PURE__ */ new Set();
    setEnterIds(/* @__PURE__ */ new Set());
  }, [threadKey]);
  useEffect8(() => {
    if (!enabled) return;
    const msgs = mensajes || [];
    if (primedKeyRef.current !== threadKey) return;
    if (!seenIdsRef.current.size && msgs.length) {
      for (const m of msgs) seenIdsRef.current.add(m.idMsg);
      return;
    }
    const nextEnter = /* @__PURE__ */ new Set();
    const newlySeen = [];
    for (const m of msgs) {
      if (seenIdsRef.current.has(m.idMsg)) continue;
      seenIdsRef.current.add(m.idMsg);
      newlySeen.push(m);
      if (m.esOperativa) nextEnter.add(m.idMsg);
    }
    if (nextEnter.size && newlySeen.length === 1) {
      setEnterIds((prev) => /* @__PURE__ */ new Set([...prev, ...nextEnter]));
    }
  }, [mensajes, threadKey, enabled]);
  return enterIds;
}
var ROLE_META = {
  user: { icon: "mdi:account-outline", title: "Usuario", accent: "#1e90ff" },
  assistant: { icon: "mdi:robot-outline", title: "PatyIA", accent: "#10b981" },
  operativa: { icon: "mdi:cog-outline", title: "Operativa", accent: "#f59e0b" }
};
var ROLE_META_CHAT = {
  ...ROLE_META,
  operativa: { icon: "mdi:cog-sync-outline", title: "Operativa", accent: "#f59e0b" }
};
function roleMetaFor(msg, compactMeta) {
  const rk = roleKey2(msg);
  const table = compactMeta ? ROLE_META_CHAT : ROLE_META;
  return table[rk] || ROLE_META.assistant;
}
function roleKey2(msg) {
  if (msg.esOperativa) return "operativa";
  if (msg.esUsuario) return "user";
  return "assistant";
}
function msgStoredUserName(msg) {
  return msg.nombreUsuario || msg.meta?.nombre_usuario || msg.meta?.prompt_variables?.nombre_usuario || "";
}
function looksLikeUsername(name, nick) {
  const n = String(name ?? "").trim().toUpperCase();
  const k = String(nick ?? "").trim().toUpperCase();
  return Boolean(n && k && (n === k || n.split("@")[0] === k.split("@")[0]));
}
function roleTitle(msg, chatUserDisplayName, chatUserNick) {
  if (msg.esOperativa) return msg.rol || "Operativa";
  if (msg.esUsuario) {
    const fromMsg = String(msgStoredUserName(msg)).trim();
    if (fromMsg && !looksLikeUsername(fromMsg, chatUserNick) && /\s/.test(fromMsg)) return fromMsg;
    if (chatUserDisplayName) return chatUserDisplayName;
    if (fromMsg && !looksLikeUsername(fromMsg, chatUserNick)) return fromMsg;
    return "Usuario";
  }
  return "PatyIA";
}
function roleUserCaption(msg, chatUserNick) {
  if (!msg.esUsuario) return "";
  const nick = String(chatUserNick ?? "").trim();
  if (nick) return nick;
  const fromMsg = String(msgStoredUserName(msg)).trim().split("@")[0];
  return fromMsg && !/\s/.test(fromMsg) ? fromMsg : "";
}
function SectionCard({ icon, title, titleCaption, accent, children, id, onMeta, metaChips, align = "left", muted = false, operativa = false, fecha, fechaIso, streaming = false, footerExtra = null, compact = false }) {
  const { Paper, Stack: Stack7, Typography: Typography9, Box: Box12, IconButton: IconButton7, Tooltip: Tooltip6 } = getMaterialUI();
  const { Icon: Icon11 } = UI;
  const color = accent || "#1e90ff";
  const isRight = align === "right";
  const softMuted = muted && !operativa;
  const fullNeon = !compact;
  return /* @__PURE__ */ jsxs8(
    Paper,
    {
      id,
      className: [
        "conv-msg-card",
        streaming ? "conv-msg-card--streaming" : "",
        compact ? "conv-msg-card--compact" : "conv-msg-card--full",
        operativa ? "conv-msg-card--operativa" : "conv-msg-card--neon"
      ].filter(Boolean).join(" "),
      elevation: 0,
      sx: (theme2) => {
        const isLight = theme2.palette.mode === "light";
        const base = {
          borderRadius: fullNeon ? "0.75rem" : "0.5rem",
          overflow: "hidden",
          border: 1,
          scrollMarginTop: 12,
          width: fullNeon ? "fit-content" : "100%",
          maxWidth: "100%"
        };
        if (softMuted) {
          return {
            ...base,
            borderColor: theme2.palette.action.disabled,
            bgcolor: "transparent",
            background: isLight ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.08)",
            boxShadow: "none",
            transition: "none"
          };
        }
        if (isLight) {
          return {
            ...base,
            borderColor: `${color}40`,
            bgcolor: "transparent",
            background: operativa ? `linear-gradient(165deg, ${color}18 0%, rgba(255,251,235,0.72) 42%, rgba(255,255,255,0.55) 100%)` : `linear-gradient(165deg, ${color}14 0%, rgba(255,255,255,0.72) 48%, rgba(248,250,252,0.55) 100%)`,
            boxShadow: "0 1px 0 rgba(255,255,255,0.65) inset, 0 8px 28px rgba(15,23,42,0.06)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            transition: "none"
          };
        }
        return {
          ...base,
          borderColor: `${color}32`,
          bgcolor: "transparent",
          background: operativa ? `linear-gradient(165deg, ${color}1f 0%, rgba(15,23,42,0.28) 52%, rgba(11,18,32,0.14) 100%)` : `linear-gradient(165deg, ${color}16 0%, rgba(15,34,54,0.28) 46%, rgba(11,18,32,0.14) 100%)`,
          boxShadow: fullNeon ? `0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 22px rgba(0,0,0,0.16), 0 0 0 1px ${color}1a` : `0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px ${color}14`,
          backdropFilter: "blur(14px) saturate(1.15)",
          WebkitBackdropFilter: "blur(14px) saturate(1.15)",
          transition: fullNeon ? "transform 0.2s ease, box-shadow 0.2s ease" : "none",
          ...fullNeon ? {
            "&:hover": {
              transform: { sm: "translateY(-1px)" },
              boxShadow: `0 1px 0 rgba(255,255,255,0.07) inset, 0 10px 28px rgba(0,0,0,0.2), 0 0 18px ${color}14`
            }
          } : {}
        };
      },
      children: [
        /* @__PURE__ */ jsxs8(
          Box12,
          {
            className: "conv-msg-card__header",
            sx: (theme2) => {
              const isLight = theme2.palette.mode === "light";
              const base = {
                px: compact ? { xs: 1.25, sm: 1.5 } : { xs: 2, sm: 2.5 },
                py: compact ? 1 : 1.5,
                borderBottom: 1,
                borderColor: "divider"
              };
              if (fullNeon) {
                if (isLight) {
                  return {
                    ...base,
                    bgcolor: "transparent",
                    background: `${color}14`,
                    borderColor: "rgba(148,163,184,0.18)",
                    ...isRight ? { borderRight: 3, borderRightColor: color } : { borderLeft: 3, borderLeftColor: color }
                  };
                }
                return {
                  ...base,
                  bgcolor: "transparent",
                  borderColor: "rgba(148,163,184,0.12)",
                  background: isRight ? `linear-gradient(270deg, ${color}24, transparent 78%)` : `linear-gradient(90deg, ${color}24, transparent 78%)`,
                  ...isRight ? { borderRight: 3, borderRightColor: color } : { borderLeft: 3, borderLeftColor: color }
                };
              }
              if (operativa) {
                return {
                  ...base,
                  bgcolor: isLight ? `${color}14` : void 0,
                  background: isLight ? void 0 : `linear-gradient(90deg, ${color}30, transparent 72%)`
                };
              }
              if (isLight) {
                return {
                  ...base,
                  bgcolor: `${color}10`
                };
              }
              return {
                ...base,
                background: isRight ? `linear-gradient(270deg, ${color}24, transparent 72%)` : `linear-gradient(90deg, ${color}24, transparent 72%)`
              };
            },
            children: [
              /* @__PURE__ */ jsxs8(
                Stack7,
                {
                  direction: "row",
                  spacing: 1.25,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  useFlexGap: true,
                  sx: { flexDirection: isRight ? "row-reverse" : "row" },
                  children: [
                    /* @__PURE__ */ jsxs8(
                      Stack7,
                      {
                        direction: "row",
                        spacing: 1.25,
                        alignItems: "flex-start",
                        sx: { flex: 1, minWidth: 0, flexDirection: isRight ? "row-reverse" : "row" },
                        children: [
                          /* @__PURE__ */ jsx9(
                            Box12,
                            {
                              className: "conv-msg-card__icon",
                              sx: (theme2) => {
                                const isLight = theme2.palette.mode === "light";
                                return {
                                  width: compact ? 28 : 32,
                                  height: compact ? 28 : 32,
                                  borderRadius: fullNeon ? "0.5rem" : "0.375rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: operativa || !softMuted ? `linear-gradient(135deg, ${color}, ${color}99)` : `${color}88`,
                                  color: "#fff",
                                  boxShadow: isLight ? "none" : fullNeon ? `0 4px 16px ${color}55` : operativa || !softMuted ? `0 4px 14px ${color}44` : "none",
                                  flexShrink: 0,
                                  mt: 0.1
                                };
                              },
                              children: /* @__PURE__ */ jsx9(Icon11, { icon, size: 18 })
                            }
                          ),
                          /* @__PURE__ */ jsxs8(
                            Box12,
                            {
                              className: isRight ? "conv-msg-card__title conv-msg-card__title--right" : "conv-msg-card__title",
                              sx: {
                                minWidth: 0,
                                flex: 1,
                                ...isRight ? { pr: 1.25, textAlign: "right" } : { pl: 0 }
                              },
                              children: [
                                /* @__PURE__ */ jsx9(
                                  Typography9,
                                  {
                                    variant: compact ? "body2" : "subtitle1",
                                    sx: {
                                      fontWeight: 700,
                                      letterSpacing: -0.2,
                                      lineHeight: 1.25,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      ...isRight ? { pr: 0.5 } : {}
                                    },
                                    children: title
                                  }
                                ),
                                titleCaption ? /* @__PURE__ */ jsx9(
                                  Typography9,
                                  {
                                    variant: "caption",
                                    color: "text.secondary",
                                    sx: {
                                      display: "block",
                                      mt: 0.15,
                                      lineHeight: 1.2,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      fontWeight: 500,
                                      letterSpacing: "0.02em"
                                    },
                                    children: titleCaption
                                  }
                                ) : null
                              ]
                            }
                          )
                        ]
                      }
                    ),
                    onMeta && /* @__PURE__ */ jsx9(Tooltip6, { title: "Trazabilidad del mensaje", arrow: true, children: /* @__PURE__ */ jsx9(IconButton7, { size: "small", onClick: onMeta, "aria-label": "Ver trazabilidad", sx: { alignSelf: "flex-start", mt: -0.25 }, children: /* @__PURE__ */ jsx9(Icon11, { icon: "mdi:information-outline", size: 20 }) }) })
                  ]
                }
              ),
              metaChips ? /* @__PURE__ */ jsx9(Box12, { className: `conv-msg-card__meta-row${isRight ? " conv-msg-card__meta-row--right" : ""}`, children: metaChips }) : null
            ]
          }
        ),
        /* @__PURE__ */ jsx9(Box12, { sx: { p: compact ? { xs: 1.25, sm: 1.5 } : { xs: 2, sm: 2.5 } }, children }),
        fecha || footerExtra ? /* @__PURE__ */ jsx9(
          Box12,
          {
            className: "conv-msg-card__footer",
            sx: {
              px: { xs: 2, sm: 2.5 },
              py: 0.65,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: softMuted ? "action.hover" : "transparent"
            },
            children: /* @__PURE__ */ jsxs8(
              Stack7,
              {
                direction: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                useFlexGap: true,
                gap: 0.75,
                sx: { flexDirection: align === "right" ? "row-reverse" : "row" },
                children: [
                  footerExtra,
                  fecha ? /* @__PURE__ */ jsx9(
                    Typography9,
                    {
                      component: "time",
                      dateTime: fechaIso || void 0,
                      variant: "caption",
                      color: "text.secondary",
                      sx: {
                        fontSize: "0.68rem",
                        letterSpacing: "0.02em",
                        opacity: 0.85,
                        ml: align === "right" ? 0 : "auto",
                        mr: align === "right" ? "auto" : 0,
                        textAlign: align === "right" ? "right" : "left"
                      },
                      children: /* @__PURE__ */ jsx9("span", { className: "conv-msg-card__fecha", children: fecha })
                    }
                  ) : null
                ]
              }
            )
          }
        ) : null
      ]
    }
  );
}
function modelBadgeLabel(raw, maxLen = 28) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? shortId(s, 16, 10) : s;
}
function visionAutoswitchBadge(meta) {
  if (!meta?.modelo_autoswitch_vision) return null;
  const configured = String(meta.modelo_configurado ?? "").trim();
  const used = String(meta.model ?? "").trim();
  if (!configured) {
    return {
      tag: "Visi\xF3n",
      label: "autoswitch",
      title: used ? `Autoswitch visi\xF3n activo \xB7 modelo usado: ${used}` : "Autoswitch visi\xF3n por im\xE1genes adjuntas"
    };
  }
  const label = modelBadgeLabel(configured);
  return {
    tag: "Config",
    label,
    title: used && configured !== used ? `Autoswitch visi\xF3n: ${configured} \u2192 ${used}` : `Modelo configurado (${configured}); autoswitch visi\xF3n por im\xE1genes adjuntas`
  };
}
function formatUsageTs(ts) {
  const raw = String(ts || "").trim();
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "medium" });
  } catch {
    return raw;
  }
}
function friendlyItdconsulta(value) {
  const s = String(value || "").trim();
  if (!s) return s;
  if (/^DATOS_CONTAPYME_MCP$/i.test(s)) return "ContaPyme MCP \xB7 datos vivos";
  if (/^REQUIERE_CONTEXTO$/i.test(s)) return "Requiere contexto";
  return s.replace(/_/g, " ");
}
function buildUsageDialogCtxItems(meta) {
  const latency = formatLatencySeconds(meta?.latency_ms);
  const items = [];
  if (meta?.ts) {
    items.push({
      key: "ts",
      label: "Momento",
      value: formatUsageTs(meta.ts),
      icon: "mdi:clock-outline",
      mono: false
    });
  }
  if (meta?.modelo_autoswitch_vision) {
    const from = String(meta.modelo_configurado ?? "").trim();
    const to = String(meta.model ?? "").trim();
    if (from && to) {
      items.push({
        key: "vision_sw",
        label: "Autoswitch visi\xF3n",
        value: from === to ? `${from} (sin cambio)` : `${from} \u2192 ${to}`,
        icon: "mdi:eye-plus-outline",
        mono: true,
        wide: true,
        vision: true
      });
    } else {
      if (from) {
        items.push({ key: "model_from", label: "Modelo config.", value: from, icon: "mdi:cog-outline", mono: true, vision: true });
      }
      if (to) {
        items.push({ key: "model_to", label: "Modelo usado", value: to, icon: "mdi:robot-outline", mono: true, vision: true });
      }
      if (!from && !to) {
        items.push({
          key: "vision_sw",
          label: "Autoswitch visi\xF3n",
          value: "Activo (im\xE1genes adjuntas)",
          icon: "mdi:eye-plus-outline",
          mono: false,
          wide: true,
          vision: true
        });
      }
    }
  } else if (meta?.model) {
    items.push({ key: "model", label: "Modelo", value: meta.model, icon: "mdi:robot-outline", mono: true });
  }
  if (latency) {
    items.push({ key: "latency", label: "Latencia", value: latency, icon: "mdi:timer-outline", mono: true });
  }
  if (meta?.itdconsulta) {
    items.push({
      key: "itd",
      label: "Tipo",
      value: friendlyItdconsulta(meta.itdconsulta),
      icon: "mdi:tag-outline",
      mono: false,
      wide: /CONTAPYME|MCP/i.test(String(meta.itdconsulta))
    });
  } else {
    const opKey = String(meta?.extra?.operativa_key || "").trim();
    if (/^contapymeMcpSession$/i.test(opKey)) {
      items.push({
        key: "op",
        label: "Tipo",
        value: "ContaPyme MCP \xB7 sesi\xF3n / datos vivos",
        icon: "mdi:api",
        wide: true
      });
      const tools = Array.isArray(meta?.http_response?.tools) ? meta.http_response.tools : [];
      if (tools.length) {
        const names = tools.map((t) => String(t?.name ?? "tool")).filter(Boolean);
        items.push({
          key: "tools",
          label: "Tools MCP",
          value: names.join(", ") || `${tools.length} llamada${tools.length === 1 ? "" : "s"}`,
          icon: "mdi:hammer-wrench",
          mono: false,
          wide: true
        });
      }
    } else if (/^contapymeMcpLogin$/i.test(opKey)) {
      items.push({
        key: "op",
        label: "Tipo",
        value: "ContaPyme MCP \xB7 login ASW",
        icon: "mdi:login-variant",
        wide: true
      });
    }
  }
  return items;
}
function compactMetaLabel(value, maxLen = 14) {
  const v = String(value ?? "").trim();
  if (!v) return v;
  if (v.length <= maxLen) return v;
  return `${v.slice(0, maxLen - 1)}\u2026`;
}
function chipRedundantWithTitle(label, cardTitle) {
  const chip = String(label ?? "").trim();
  const title = String(cardTitle ?? "").trim();
  if (!chip || !title) return false;
  if (chip === title) return true;
  const titleKey = title.replace(/^OP\s*·\s*/i, "").trim();
  return chip === titleKey;
}
var META_CHIP_TONE_CLASS = {
  context: "conv-msg-meta-chip--context",
  premisa: "conv-msg-meta-chip--premisa",
  operativa: "conv-msg-meta-chip--operativa",
  model: "conv-msg-meta-chip--model",
  metric: "conv-msg-meta-chip--metric",
  error: "conv-msg-meta-chip--error",
  vision: "conv-msg-meta-chip--vision",
  files: "conv-msg-meta-chip--context",
  neutral: ""
};
function MetaBadge({ tag, label, tone = "neutral", title, onClick }) {
  const toneClass = META_CHIP_TONE_CLASS[tone] || "";
  const clickable = typeof onClick === "function";
  const chipLabel = tone === "files" ? compactFileChipLabel(label) : compactMetaLabel(label);
  return /* @__PURE__ */ jsx9(
    UsageSummaryChip,
    {
      tag,
      label: chipLabel,
      title: title || label,
      className: `conv-msg-usage-chip conv-msg-meta-chip ${toneClass}${clickable ? " conv-msg-meta-chip--clickable" : ""}`.trim(),
      onClick,
      role: clickable ? "button" : void 0,
      tabIndex: clickable ? 0 : void 0
    }
  );
}
function buildMetaClassificationChips(meta, cardTitle = "", { isUser = false } = {}) {
  if (!meta) return [];
  const chips = [];
  if (meta.premisas?.length) {
    for (const p of meta.premisas) {
      if (chipRedundantWithTitle(p, cardTitle)) continue;
      chips.push({ key: `p-${p}`, label: p, tone: "premisa", title: `Premisa: ${p}` });
    }
  }
  if (meta.extra?.operativa_key && !chipRedundantWithTitle(meta.extra.operativa_key, cardTitle)) {
    chips.push({
      key: "op",
      label: meta.extra.operativa_key,
      tone: "operativa",
      title: `Consulta operativa: ${meta.extra.operativa_key}`
    });
  }
  if (meta.itdconsulta && !chipRedundantWithTitle(meta.itdconsulta, cardTitle)) {
    chips.push({
      key: "itd",
      label: meta.itdconsulta,
      tone: "context",
      title: `itdconsulta: ${meta.itdconsulta}`
    });
  }
  const instrKey = !isUser ? instructionKeyFromMeta(meta) : null;
  if (instrKey && instrKey !== meta.extra?.operativa_key && instrKey !== meta.itdconsulta && !chipRedundantWithTitle(instrKey, cardTitle)) {
    chips.push({ key: "pmpt", label: instrKey, tone: "context", title: `Instrucci\xF3n: ${instrKey}` });
  }
  return chips;
}
function MetaChipRow({ meta, isUser = false, hideUsageMetrics = false, hideClassificationChips = false, align = "left", cardTitle = "", onFileSearch }) {
  if (!meta) return null;
  const hideUsage = hideUsageMetrics || isUser;
  const tk = meta.tokens?.total ? meta.tokens : tokensFromUsage(meta.usage);
  const chips = hideClassificationChips ? [] : buildMetaClassificationChips(meta, cardTitle, { isUser });
  if (!hideUsage && meta.model) {
    chips.push({
      key: "model",
      label: meta.model,
      tone: "model",
      title: meta.modelo_autoswitch_vision ? "Modelo usado (autoswitch visi\xF3n)" : "Modelo LLM"
    });
  }
  if (!hideUsage && meta.modelo_autoswitch_vision) {
    const sw = visionAutoswitchBadge(meta);
    if (sw) {
      chips.push({ key: "vision-sw", label: sw.label, tone: "vision", title: sw.title });
    }
  }
  if (!hideUsage && meta.latency_ms != null && meta.latency_ms > 0) {
    chips.push({ key: "lat", label: `${meta.latency_ms}ms`, tone: "metric", title: "Latencia" });
  }
  if (!hideUsage && tk?.total > 0) {
    chips.push({ key: "tok", label: tk.total.toLocaleString("es-CO"), tone: "metric", title: `Tokens: ${tk.total}` });
  }
  if (meta.stream_ok === false) {
    chips.push({ key: "stream", label: "err", tone: "error", title: meta.stream_error || "Stream fall\xF3" });
  }
  if (!isUser) {
    const archivos = archivosCitadosFromMeta(meta);
    const openFileSearch = typeof onFileSearch === "function" ? () => onFileSearch(meta) : void 0;
    for (const name of archivos) {
      chips.push({
        key: `file-${name}`,
        label: name,
        tone: "files",
        title: openFileSearch ? `Ver fragmento consultado: ${name}` : name,
        onClick: openFileSearch
      });
    }
  }
  if (!chips.length) return null;
  const { Stack: Stack7 } = getMaterialUI();
  return /* @__PURE__ */ jsx9(
    Stack7,
    {
      direction: "row",
      spacing: 0.25,
      flexWrap: "wrap",
      useFlexGap: true,
      className: "conv-msg-meta-chips",
      sx: { justifyContent: align === "right" ? "flex-end" : "flex-start" },
      children: chips.map((c) => /* @__PURE__ */ jsx9(MetaBadge, { tag: c.tag, label: c.label, tone: c.tone, title: c.title, onClick: c.onClick }, c.key))
    }
  );
}
function extractContapymeLoginUrl(text, metaUrl) {
  const fromMeta = String(metaUrl || "").trim();
  if (/^https:\/\/ia\.contapyme\.com\/api\/login\/asw\?/i.test(fromMeta)) return fromMeta;
  const m = String(text || "").match(/https:\/\/ia\.contapyme\.com\/api\/login\/asw\?[^\s<>"'`]+/i);
  return m?.[0] ? m[0].replace(/[),.;]+$/, "") : null;
}
function scrubContapymeLoginFromText(text) {
  return String(text || "").replace(/https:\/\/ia\.contapyme\.com\/api\/login\/asw\?[^\s<>"'`]+/gi, "").replace(/^login_url:\s*.*$/gim, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function forceIframeRepaint(iframe) {
  if (!iframe) return;
  const rect = iframe.getBoundingClientRect();
  const w = Math.round(rect.width) || iframe.clientWidth || 0;
  const h = Math.round(rect.height) || iframe.clientHeight || 0;
  if (w < 8 || h < 8) return;
  const prev = { w: iframe.style.width, h: iframe.style.height, v: iframe.style.visibility };
  iframe.style.visibility = "hidden";
  iframe.style.width = `${Math.max(8, w - 1)}px`;
  iframe.style.height = `${Math.max(8, h - 1)}px`;
  void iframe.offsetHeight;
  requestAnimationFrame(() => {
    iframe.style.width = prev.w || "100%";
    iframe.style.height = prev.h || "100%";
    iframe.style.visibility = prev.v || "visible";
    void iframe.offsetHeight;
    window.dispatchEvent(new Event("resize"));
  });
}
function scheduleIframeRepaint(iframe, delaysMs = [0, 80, 200, 500, 1e3, 2e3, 4e3]) {
  if (!iframe) return () => {
  };
  const timers = delaysMs.map((ms) => window.setTimeout(() => forceIframeRepaint(iframe), ms));
  return () => timers.forEach((id) => window.clearTimeout(id));
}
function ContapymeLoginEmbed({ url, onLoginDone }) {
  const { Stack: Stack7, Button: Button6, Dialog: Dialog2, DialogContent: DialogContent4 } = getMaterialUI();
  const { Icon: Icon11 } = UI;
  const [open, setOpen] = useState7(false);
  const [hostReady, setHostReady] = useState7(false);
  const [geomNudge, setGeomNudge] = useState7(0);
  const iframeRef = useRef5(null);
  const contentRef = useRef5(null);
  const tabOpenedRef = useRef5(false);
  const doneOnceRef = useRef5(false);
  const cancelRepaintRef = useRef5(null);
  const signalDone = () => {
    if (doneOnceRef.current) return;
    doneOnceRef.current = true;
    onLoginDone?.();
  };
  const close = () => {
    cancelRepaintRef.current?.();
    cancelRepaintRef.current = null;
    setOpen(false);
    setHostReady(false);
    setGeomNudge(0);
    signalDone();
  };
  useEffect8(() => {
    if (!open) {
      setHostReady(false);
      return void 0;
    }
    let cancelled = false;
    let ready = false;
    const mark = () => {
      if (cancelled || ready) return false;
      const el = contentRef.current;
      if ((el?.clientWidth || 0) < 80 || (el?.clientHeight || 0) < 80) return false;
      ready = true;
      setHostReady(true);
      return true;
    };
    if (mark()) return void 0;
    const host = contentRef.current;
    let ro;
    if (host && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (mark()) ro?.disconnect();
      });
      ro.observe(host);
    }
    const poll = window.setInterval(() => {
      if (mark()) window.clearInterval(poll);
    }, 50);
    const fallback = window.setTimeout(() => {
      if (!cancelled && !ready) setHostReady(true);
    }, 2500);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(fallback);
    };
  }, [open, url]);
  useEffect8(() => {
    if (!open || !hostReady) return void 0;
    const host = contentRef.current;
    const iframe = iframeRef.current;
    cancelRepaintRef.current?.();
    const onLoad = () => {
      cancelRepaintRef.current?.();
      cancelRepaintRef.current = scheduleIframeRepaint(iframeRef.current);
      setGeomNudge((n) => n === 0 ? 1 : 0);
      window.setTimeout(() => setGeomNudge(0), 60);
    };
    iframe?.addEventListener("load", onLoad);
    cancelRepaintRef.current = scheduleIframeRepaint(iframe);
    let ro;
    if (host && typeof ResizeObserver !== "undefined") {
      let last = "";
      ro = new ResizeObserver(() => {
        const key = `${host.clientWidth}x${host.clientHeight}`;
        if (key === last) return;
        last = key;
        forceIframeRepaint(iframeRef.current);
      });
      ro.observe(host);
    }
    return () => {
      iframe?.removeEventListener("load", onLoad);
      cancelRepaintRef.current?.();
      cancelRepaintRef.current = null;
      ro?.disconnect();
    };
  }, [open, hostReady, url]);
  useEffect8(() => {
    if (!tabOpenedRef.current) return void 0;
    const onVis = () => {
      if (document.visibilityState === "visible") signalDone();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [url]);
  if (!url) return null;
  return /* @__PURE__ */ jsxs8(Fragment4, { children: [
    /* @__PURE__ */ jsxs8(
      Stack7,
      {
        className: "contapyme-login-embed",
        direction: { xs: "column", sm: "row" },
        spacing: 1,
        useFlexGap: true,
        sx: { mt: 1.5, alignItems: { xs: "stretch", sm: "center" } },
        children: [
          /* @__PURE__ */ jsx9(
            Button6,
            {
              variant: "contained",
              size: "medium",
              onClick: (e) => {
                doneOnceRef.current = false;
                e.currentTarget.blur();
                setOpen(true);
              },
              startIcon: /* @__PURE__ */ jsx9(Icon11, { icon: "mdi:login-variant", size: 18 }),
              sx: { textTransform: "none", fontWeight: 700, alignSelf: { sm: "flex-start" } },
              children: "Iniciar sesi\xF3n ContaPyme\xAE"
            }
          ),
          /* @__PURE__ */ jsx9(
            Button6,
            {
              href: url,
              target: "_blank",
              rel: "noopener noreferrer",
              size: "small",
              variant: "text",
              onClick: () => {
                tabOpenedRef.current = true;
              },
              sx: { textTransform: "none", fontWeight: 600, alignSelf: { sm: "flex-start" } },
              children: "Abrir en pesta\xF1a"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxs8(
      Dialog2,
      {
        open,
        onClose: close,
        maxWidth: false,
        fullWidth: false,
        transitionDuration: 0,
        disableRestoreFocus: true,
        className: "contapyme-asw-login-dialog",
        slotProps: {
          backdrop: {
            sx: {
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundColor: "rgba(11,18,32,0.72)"
            }
          }
        },
        PaperProps: {
          elevation: 8,
          className: "contapyme-asw-login-paper",
          sx: {
            width: `calc(95vw + ${geomNudge}px)`,
            height: `calc(95vh + ${geomNudge}px)`,
            maxWidth: "95vw",
            maxHeight: "95vh",
            m: "2.5vh auto",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 2,
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            filter: "none",
            transform: "none",
            bgcolor: "#0b1220",
            backgroundImage: "none"
          }
        },
        children: [
          /* @__PURE__ */ jsx9(
            GlassDialogHeader,
            {
              title: "Conectar ContaPyme\xAE",
              subtitle: "Sesi\xF3n ASW \xB7 inicia sesi\xF3n y cierra cuando veas \xABEn l\xEDnea\xBB",
              icon: "mdi:domain",
              accent: "#1e90ff",
              onClose: close,
              closeAutoFocus: true
            }
          ),
          /* @__PURE__ */ jsx9(
            DialogContent4,
            {
              ref: contentRef,
              dividers: true,
              className: "contapyme-asw-login-content",
              sx: {
                p: 0,
                display: "flex",
                flexDirection: "column",
                flex: "1 1 0",
                minHeight: 0,
                position: "relative",
                overflow: "hidden",
                bgcolor: "#fff",
                backgroundImage: "none",
                borderTop: 0
              },
              children: hostReady ? /* @__PURE__ */ jsx9(
                "iframe",
                {
                  ref: iframeRef,
                  title: "Iniciar sesi\xF3n en ContaPyme",
                  src: url,
                  loading: "eager",
                  referrerPolicy: "no-referrer-when-downgrade",
                  allow: "clipboard-read; clipboard-write",
                  className: "contapyme-asw-login-iframe"
                }
              ) : null
            }
          )
        ]
      }
    )
  ] });
}
function formatOperativaContenidoForLog(msg, text) {
  if (!msg?.esOperativa) return text;
  const key = String(msg.meta?.extra?.operativa_key ?? msg.rol ?? "");
  if (!/validarTranscripcionAudio|VALIDAR_TRANSCRIPCION_AUDIO/i.test(key)) return text;
  const t = String(text ?? "").trim();
  if (t === "0") return "0 = false";
  if (t === "1") return "1 = true";
  return text;
}
function MsgBody({ text, imagenes, audios, audiosTranscripcion, align = "left", onImageClick, streaming = false, loginUrl: loginUrlProp, disableLoginEmbed = false, onContapymeLoginDone }) {
  const { Typography: Typography9, Box: Box12 } = getMaterialUI();
  const raw = String(text || "");
  const placeholderOnly = /^\((?:imagen adjunta|nota de voz)\)$/i.test(raw.trim());
  const hasText = Boolean(raw.trim()) && !placeholderOnly;
  const loginUrl = disableLoginEmbed ? null : extractContapymeLoginUrl(raw, loginUrlProp);
  const displayRaw = disableLoginEmbed ? scrubContapymeLoginFromText(raw) : loginUrl ? raw.replace(loginUrl, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : raw;
  const html = mdToHtml(displayRaw || (loginUrl ? "Inicia sesi\xF3n en ContaPyme\xAE con el bot\xF3n de abajo." : ""));
  return /* @__PURE__ */ jsxs8(Fragment4, { children: [
    streaming && !hasText && !audios?.length ? /* @__PURE__ */ jsxs8(Box12, { className: "conv-stream-typing", "aria-label": "PatyIA est\xE1 escribiendo", role: "status", children: [
      /* @__PURE__ */ jsx9("span", {}),
      /* @__PURE__ */ jsx9("span", {}),
      /* @__PURE__ */ jsx9("span", {})
    ] }) : /* @__PURE__ */ jsxs8(Box12, { className: `conv-msg-body-wrap${streaming ? " conv-msg-body-wrap--streaming" : ""}`, children: [
      displayRaw || !loginUrl ? /* @__PURE__ */ jsx9(
        Typography9,
        {
          component: "div",
          variant: "body1",
          className: `conv-msg-body${streaming ? " conv-msg-body--streaming" : ""}`,
          sx: {
            lineHeight: 1.65,
            color: "text.primary",
            "& p": { m: 0, mb: 1.25 },
            "& p:last-child": { mb: 0 },
            "& a": { color: "primary.main", wordBreak: "break-word" },
            "& img": {
              width: 100,
              height: 100,
              maxWidth: 100,
              maxHeight: 100,
              objectFit: "cover",
              objectPosition: "center",
              borderRadius: "0.5rem",
              my: 1,
              cursor: "zoom-in",
              display: "inline-block",
              verticalAlign: "middle"
            },
            "& pre, & code": { fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.85em" }
          },
          dangerouslySetInnerHTML: { __html: html },
          onClick: (e) => {
            const img = e.target?.closest?.("img");
            if (img?.src && onImageClick) {
              e.preventDefault();
              onImageClick(img.src);
            }
          }
        }
      ) : null,
      streaming && hasText ? /* @__PURE__ */ jsx9(Box12, { component: "span", className: "conv-stream-cursor", "aria-hidden": true }) : null,
      loginUrl ? /* @__PURE__ */ jsx9(ContapymeLoginEmbed, { url: loginUrl, onLoginDone: streaming ? void 0 : onContapymeLoginDone }) : null
    ] }),
    imagenes?.length > 0 && /* @__PURE__ */ jsx9(ConvMsgImages, { items: imagenes, align, onImageClick }),
    audios?.length > 0 && /* @__PURE__ */ jsx9(ConvMsgAudios, { items: audios, transcriptions: audiosTranscripcion, align })
  ] });
}
function ConvMsgAudios({ items, transcriptions, align = "right" }) {
  const { Box: Box12, Typography: Typography9 } = getMaterialUI();
  const renderable = (items || []).filter((src) => String(src || "").trim().startsWith("data:audio/") || /^https?:\/\//i.test(String(src || "").trim()));
  if (!renderable.length) return null;
  return /* @__PURE__ */ jsx9(
    Box12,
    {
      className: `conv-msg-audios conv-msg-audios--${align}`,
      sx: {
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mt: 1.25,
        alignItems: align === "right" ? "flex-end" : "flex-start"
      },
      children: renderable.map((src, idx) => /* @__PURE__ */ jsxs8(Box12, { className: "conv-msg-audio-item", children: [
        /* @__PURE__ */ jsx9("audio", { controls: true, preload: "metadata", src, "aria-label": `Nota de voz ${idx + 1}` }),
        transcriptions?.[idx] ? /* @__PURE__ */ jsx9(Typography9, { variant: "caption", component: "p", className: "conv-msg-audio-transcript", sx: { mt: 0.5, opacity: 0.85 }, children: transcriptions[idx] }) : null
      ] }, `${idx}-${String(src).slice(0, 32)}`))
    }
  );
}
function ConvMsgImages({ items, align = "right", onImageClick }) {
  const { Box: Box12 } = getMaterialUI();
  const renderable = (items || []).filter((src) => {
    const s = String(src || "").trim();
    if (/^\[file_id:/i.test(s)) return false;
    return s.startsWith("data:image/") || s.startsWith("http://") || s.startsWith("https://");
  });
  if (!renderable.length) return null;
  return /* @__PURE__ */ jsx9(
    Box12,
    {
      className: `conv-msg-images conv-msg-images--${align}`,
      sx: {
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        mt: 1.25,
        justifyContent: align === "right" ? "flex-end" : "flex-start"
      },
      children: renderable.map((src, idx) => /* @__PURE__ */ jsx9(
        "button",
        {
          type: "button",
          className: "conv-msg-image-lightbox-btn",
          "aria-label": `Ver imagen adjunta ${idx + 1} en tama\xF1o completo`,
          onClick: () => onImageClick?.(src),
          children: /* @__PURE__ */ jsx9("img", { src, alt: `Adjunto ${idx + 1}`, loading: "lazy" })
        },
        `${idx}-${src.slice(0, 32)}`
      ))
    }
  );
}
function UsageSummaryChip({ label, className = "", title, tag, onClick, role, tabIndex }) {
  const showVal = label != null && String(label).trim() !== "";
  const clickable = typeof onClick === "function";
  const handleKeyDown = clickable ? (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e);
    }
  } : void 0;
  return /* @__PURE__ */ jsx9(
    "span",
    {
      className: className || "conv-msg-usage-chip",
      title: title || (showVal ? label : tag),
      onClick,
      onKeyDown: handleKeyDown,
      role,
      tabIndex,
      children: /* @__PURE__ */ jsxs8("span", { className: "conv-msg-usage-chip__inner", children: [
        tag ? /* @__PURE__ */ jsx9("span", { className: "conv-msg-usage-chip__key", children: tag }) : null,
        showVal ? /* @__PURE__ */ jsx9("span", { className: "conv-msg-usage-chip__val", children: label }) : null
      ] })
    }
  );
}
function isContapymeMcpMeta(meta) {
  const hay = [
    meta?.itdconsulta,
    meta?.engine,
    meta?.extra?.operativa_key,
    meta?.extra?.operativa
  ].filter(Boolean).join(" ");
  return /CONTAPYME|MCP|contapymeMcp/i.test(hay);
}
function UsageDialogMetaPanel({ meta }) {
  const { Box: Box12 } = getMaterialUI();
  const { Icon: Icon11 } = UI;
  const ctxItems = buildUsageDialogCtxItems(meta);
  if (!ctxItems.length) return null;
  const isMcp = isContapymeMcpMeta(meta);
  return /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__meta conv-usage-dialog__meta--ctx", children: [
    /* @__PURE__ */ jsxs8("div", { className: "conv-usage-dialog__meta-head", children: [
      /* @__PURE__ */ jsx9("span", { className: "conv-usage-dialog__meta-eyebrow", children: "Contexto del turno" }),
      isMcp ? /* @__PURE__ */ jsxs8("span", { className: "conv-usage-dialog__meta-badge conv-usage-dialog__meta-badge--mcp", children: [
        /* @__PURE__ */ jsx9(Icon11, { icon: "mdi:api", size: 14 }),
        "Sin costo LLM"
      ] }) : null
    ] }),
    /* @__PURE__ */ jsx9("div", { className: "conv-usage-dialog__ctx-grid", children: ctxItems.map((item) => /* @__PURE__ */ jsxs8(
      "div",
      {
        className: [
          "conv-usage-dialog__ctx-item",
          item.wide ? "conv-usage-dialog__ctx-item--wide" : "",
          item.vision ? "conv-usage-dialog__ctx-item--vision" : ""
        ].filter(Boolean).join(" ") || void 0,
        children: [
          /* @__PURE__ */ jsx9("span", { className: "conv-usage-dialog__ctx-icon", "aria-hidden": true, children: /* @__PURE__ */ jsx9(Icon11, { icon: item.icon || "mdi:information-outline", size: 16 }) }),
          /* @__PURE__ */ jsxs8("span", { className: "conv-usage-dialog__ctx-copy", children: [
            /* @__PURE__ */ jsx9("span", { className: "conv-usage-dialog__ctx-k", children: item.label }),
            /* @__PURE__ */ jsx9("span", { className: `conv-usage-dialog__ctx-v${item.mono ? " conv-usage-dialog__mono" : ""}`, children: item.value })
          ] })
        ]
      },
      item.key
    )) })
  ] });
}
function safeJsonPreview(value, maxLen = 600) {
  if (value == null) return "";
  let raw;
  try {
    raw = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    raw = String(value);
  }
  raw = raw.replace(/\r\n/g, "\n").trim();
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}\u2026 [truncado ${raw.length} chars]`;
}
function McpToolsSection({ tools, GlassSection, GlassInner }) {
  const { Typography: Typography9, Box: Box12, Chip: Chip5, Stack: Stack7 } = getMaterialUI();
  if (!Array.isArray(tools) || !tools.length) return null;
  const body = /* @__PURE__ */ jsx9(Box12, { className: "conv-usage-dialog__section-body", children: /* @__PURE__ */ jsx9(Stack7, { spacing: 1.5, children: tools.map((tool, idx) => {
    const name = String(tool?.name ?? `Tool ${idx + 1}`);
    const status = String(tool?.status ?? "");
    const error = tool?.error;
    const args = safeJsonPreview(tool?.arguments);
    const output = safeJsonPreview(tool?.output);
    return /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__mcp-tool", children: [
      /* @__PURE__ */ jsxs8(Stack7, { direction: "row", spacing: 0.75, alignItems: "center", sx: { mb: 0.5 }, children: [
        /* @__PURE__ */ jsx9("iconify-icon", { icon: "mdi:hammer-wrench", width: "16", height: "16" }),
        /* @__PURE__ */ jsx9(Typography9, { variant: "body2", fontWeight: 600, sx: { flex: 1, minWidth: 0 }, children: name }),
        status ? /* @__PURE__ */ jsx9(
          Chip5,
          {
            size: "small",
            variant: "outlined",
            label: status,
            className: `conv-usage-dialog__mcp-tool-status${error ? " conv-usage-dialog__mcp-tool-status--error" : ""}`
          }
        ) : null
      ] }),
      args ? /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__mcp-tool-block", sx: { mb: 0.75 }, children: [
        /* @__PURE__ */ jsx9(Typography9, { variant: "caption", color: "text.secondary", component: "div", sx: { mb: 0.25 }, children: "Argumentos" }),
        /* @__PURE__ */ jsx9(Typography9, { variant: "caption", component: "pre", sx: { whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }, children: args })
      ] }) : null,
      output ? /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__mcp-tool-block", children: [
        /* @__PURE__ */ jsx9(Typography9, { variant: "caption", color: "text.secondary", component: "div", sx: { mb: 0.25 }, children: "Resultado" }),
        /* @__PURE__ */ jsx9(Typography9, { variant: "caption", component: "pre", sx: { whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }, children: output })
      ] }) : null,
      error ? /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__mcp-tool-block conv-usage-dialog__mcp-tool-block--error", children: [
        /* @__PURE__ */ jsx9(Typography9, { variant: "caption", color: "error", component: "div", sx: { mb: 0.25 }, children: "Error" }),
        /* @__PURE__ */ jsx9(Typography9, { variant: "caption", component: "pre", sx: { whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }, children: safeJsonPreview(error) })
      ] }) : null
    ] }, `${name}-${idx}`);
  }) }) });
  if (GlassSection && GlassInner) {
    return /* @__PURE__ */ jsx9(
      GlassSection,
      {
        sectionKey: "conv-usage-mcp-tools",
        className: "conv-usage-dialog__mcp-tools-section",
        title: "Tools MCP",
        subtitle: `${tools.length} llamada${tools.length === 1 ? "" : "s"} al servidor ContaPyme`,
        accent: "#f59e0b",
        tone: "warn",
        headerSx: { borderRadius: "0.75rem 0.75rem 0 0" },
        bodySx: { pt: { xs: 1.25, sm: 1.5 } },
        children: /* @__PURE__ */ jsx9(GlassInner, { children: body })
      }
    );
  }
  return /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__section-card conv-usage-dialog__section-card--mcp-tools", children: [
    /* @__PURE__ */ jsxs8("div", { className: "conv-usage-dialog__section-head", children: [
      /* @__PURE__ */ jsx9(Typography9, { component: "h3", variant: "subtitle2", className: "conv-usage-dialog__section-title", children: "Tools MCP" }),
      /* @__PURE__ */ jsxs8(Typography9, { variant: "caption", color: "text.secondary", className: "conv-usage-dialog__section-sub", children: [
        tools.length,
        " llamada",
        tools.length === 1 ? "" : "s",
        " al servidor ContaPyme"
      ] })
    ] }),
    body
  ] });
}
function UsageStatsDialog({ open, onClose, stats, msgLabel, fecha, meta }) {
  const { DialogContent: DialogContent4, Typography: Typography9, Box: Box12, Chip: Chip5, Stack: Stack7, Tooltip: Tooltip6, IconButton: IconButton7 } = getMaterialUI();
  const { useMemo: useMemo11, useState: useState12 } = getReact();
  let glass = null;
  try {
    glass = getGlass();
  } catch (_) {
    glass = null;
  }
  const { GlassSection, GlassInner } = glass || {};
  if (!stats) return null;
  const sections = [
    {
      key: "msg",
      title: "Mensaje",
      subtitle: "Costo y tokens de este turno",
      tokens: stats.tokens,
      cost: stats.cost,
      accent: "#34d399",
      tone: "success",
      icon: /* @__PURE__ */ jsx9(UI.Icon, { icon: "mdi:message-text-outline", size: 18 }),
      show: true
    },
    {
      key: "prev",
      title: "Acumulado anterior",
      subtitle: "Suma del hilo antes de este mensaje",
      tokens: stats.previousTokens,
      cost: stats.previousCost,
      accent: "#60a5fa",
      tone: "blue",
      icon: /* @__PURE__ */ jsx9(UI.Icon, { icon: "mdi:history", size: 18 }),
      show: usageHasData(stats.previousTokens, stats.previousCost)
    },
    {
      key: "cum",
      title: "Total acumulado",
      subtitle: "Suma del hilo incluyendo este mensaje",
      tokens: stats.cumulativeTokens,
      cost: stats.cumulativeCost,
      accent: "#f59e0b",
      tone: "warn",
      icon: /* @__PURE__ */ jsx9(UI.Icon, { icon: "mdi:sigma", size: 18 }),
      show: usageHasData(stats.cumulativeTokens, stats.cumulativeCost)
    }
  ].filter((s) => s.show);
  const chunks = useMemo11(() => chunksFromMeta(meta), [meta]);
  const archivos = useMemo11(() => archivosCitadosFromMeta(meta), [meta]);
  const mcpTools = useMemo11(() => {
    const opKey2 = String(meta?.extra?.operativa_key ?? "");
    if (!/^contapymeMcpSession$/i.test(opKey2)) return [];
    const tools = meta?.http_response?.tools;
    return Array.isArray(tools) ? tools : [];
  }, [meta]);
  const [openChunk, setOpenChunk] = useState12(null);
  const opKey = meta?.extra?.operativa_key;
  const header = resolveUsageDialogHeader(msgLabel, fecha, opKey);
  const showMetaPanel = Boolean(
    meta?.ts || meta?.model || meta?.modelo_autoswitch_vision || formatLatencySeconds(meta?.latency_ms) || meta?.itdconsulta
  );
  return /* @__PURE__ */ jsxs8(Fragment4, { children: [
    /* @__PURE__ */ jsxs8(
      GlassDialog,
      {
        open,
        onClose,
        maxWidth: "md",
        fullWidth: true,
        paperMaxWidth: "42rem",
        paperClassName: "conv-usage-dialog-paper",
        header: /* @__PURE__ */ jsx9(
          GlassDialogHeader,
          {
            icon: header.icon,
            title: header.title,
            subtitle: header.subtitle,
            accent: header.accent,
            onClose
          }
        ),
        children: [
          /* @__PURE__ */ jsx9(
            DialogContent4,
            {
              dividers: true,
              className: "conv-usage-dialog",
              sx: glassDialogContentSx({
                p: { xs: 1.75, sm: 2.25 },
                maxHeight: "min(72dvh, 40rem)",
                overflow: "auto"
              }),
              children: /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__stack", children: [
                showMetaPanel ? /* @__PURE__ */ jsx9(UsageDialogMetaPanel, { meta }) : null,
                mcpTools.length ? /* @__PURE__ */ jsx9(McpToolsSection, { tools: mcpTools, GlassSection, GlassInner }) : null,
                sections.map((section) => /* @__PURE__ */ jsx9(
                  UsageDialogSection,
                  {
                    section,
                    GlassSection,
                    GlassInner
                  },
                  section.key
                )),
                chunks.length || archivos.length ? GlassSection ? /* @__PURE__ */ jsxs8(
                  GlassSection,
                  {
                    sectionKey: "conv-usage-chunks",
                    className: "conv-usage-dialog__chunks-section",
                    title: "Fragmentos citados",
                    accent: "#7c3aed",
                    tone: "purple",
                    headerSx: { borderRadius: "0.75rem 0.75rem 0 0" },
                    bodySx: { pt: { xs: 1.25, sm: 1.5 } },
                    children: [
                      /* @__PURE__ */ jsx9(Typography9, { variant: "caption", color: "text.secondary", component: "div", className: "conv-usage-dialog__section-sub", sx: { mb: 1 }, children: archivos.length ? `Chunks extra\xEDdos por file_search (${chunks.length} de ${archivos.length} archivo${archivos.length === 1 ? "" : "s"}).` : `${chunks.length} fragmento${chunks.length === 1 ? "" : "s"} del message.` }),
                      archivos.length ? /* @__PURE__ */ jsx9(Stack7, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, className: "conv-usage-dialog__files", sx: { mb: 1 }, children: archivos.map((name) => {
                        const clickable = chunks.some((c) => c.filename === name);
                        return /* @__PURE__ */ jsx9(
                          Chip5,
                          {
                            size: "small",
                            variant: "outlined",
                            clickable,
                            onClick: clickable ? () => {
                              const first = chunks.find((c) => c.filename === name);
                              if (first) setOpenChunk(first);
                            } : void 0,
                            icon: /* @__PURE__ */ jsx9("iconify-icon", { icon: "mdi:file-document-outline", width: "14", height: "14" }),
                            label: name,
                            title: clickable ? `Ver fragmentos de ${name}` : name,
                            className: "conv-usage-dialog__file-chip"
                          },
                          name
                        );
                      }) }) : null,
                      /* @__PURE__ */ jsx9(Stack7, { spacing: 0.75, className: "conv-usage-dialog__chunks", children: chunks.map((c) => /* @__PURE__ */ jsxs8(
                        Box12,
                        {
                          className: "conv-usage-dialog__chunk",
                          onClick: () => setOpenChunk(c),
                          role: "button",
                          tabIndex: 0,
                          onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOpenChunk(c);
                            }
                          },
                          "aria-label": `Ver fragmento de ${c.filename || c.fileId || "texto"}`,
                          children: [
                            /* @__PURE__ */ jsxs8(Stack7, { direction: "row", spacing: 0.75, alignItems: "center", sx: { mb: 0.35 }, children: [
                              /* @__PURE__ */ jsx9("iconify-icon", { icon: "mdi:text-box-search-outline", width: "16", height: "16" }),
                              /* @__PURE__ */ jsx9(Typography9, { variant: "body2", fontWeight: 600, sx: { flex: 1, minWidth: 0 }, children: c.filename || c.fileId || "fragmento" }),
                              c.score != null ? /* @__PURE__ */ jsx9(
                                Chip5,
                                {
                                  size: "small",
                                  variant: "outlined",
                                  label: `score ${Number(c.score).toFixed(3)}`,
                                  className: "conv-usage-dialog__chunk-score"
                                }
                              ) : null,
                              /* @__PURE__ */ jsx9(Tooltip6, { title: "Ver fragmento en full-page", children: /* @__PURE__ */ jsx9(IconButton7, { size: "small", "aria-label": "Abrir fragmento", className: "conv-usage-dialog__chunk-open", children: /* @__PURE__ */ jsx9("iconify-icon", { icon: "mdi:fullscreen", width: "16", height: "16" }) }) })
                            ] }),
                            /* @__PURE__ */ jsx9(
                              Typography9,
                              {
                                variant: "caption",
                                component: "pre",
                                className: "conv-usage-dialog__chunk-preview",
                                sx: { whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0, fontFamily: "inherit" },
                                children: chunkPreview(c.text, 280)
                              }
                            )
                          ]
                        },
                        c.key
                      )) })
                    ]
                  }
                ) : /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__section-card conv-usage-dialog__section-card--chunks", children: [
                  /* @__PURE__ */ jsxs8("div", { className: "conv-usage-dialog__section-head", children: [
                    /* @__PURE__ */ jsx9(Typography9, { component: "h3", variant: "subtitle2", className: "conv-usage-dialog__section-title", children: "Fragmentos citados" }),
                    /* @__PURE__ */ jsx9(Typography9, { variant: "caption", color: "text.secondary", className: "conv-usage-dialog__section-sub", children: archivos.length ? `Chunks extra\xEDdos por file_search (${chunks.length} de ${archivos.length} archivo${archivos.length === 1 ? "" : "s"}).` : `${chunks.length} fragmento${chunks.length === 1 ? "" : "s"} del message.` })
                  ] }),
                  archivos.length ? /* @__PURE__ */ jsx9(Stack7, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, className: "conv-usage-dialog__files", children: archivos.map((name) => {
                    const clickable = chunks.some((c) => c.filename === name);
                    return /* @__PURE__ */ jsx9(
                      Chip5,
                      {
                        size: "small",
                        variant: "outlined",
                        clickable,
                        onClick: clickable ? () => {
                          const first = chunks.find((c) => c.filename === name);
                          if (first) setOpenChunk(first);
                        } : void 0,
                        icon: /* @__PURE__ */ jsx9("iconify-icon", { icon: "mdi:file-document-outline", width: "14", height: "14" }),
                        label: name,
                        title: clickable ? `Ver fragmentos de ${name}` : name,
                        className: "conv-usage-dialog__file-chip"
                      },
                      name
                    );
                  }) }) : null,
                  /* @__PURE__ */ jsx9(Stack7, { spacing: 0.75, className: "conv-usage-dialog__chunks", children: chunks.map((c) => /* @__PURE__ */ jsxs8(
                    Box12,
                    {
                      className: "conv-usage-dialog__chunk",
                      onClick: () => setOpenChunk(c),
                      role: "button",
                      tabIndex: 0,
                      onKeyDown: (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenChunk(c);
                        }
                      },
                      "aria-label": `Ver fragmento de ${c.filename || c.fileId || "texto"}`,
                      children: [
                        /* @__PURE__ */ jsxs8(Stack7, { direction: "row", spacing: 0.75, alignItems: "center", sx: { mb: 0.35 }, children: [
                          /* @__PURE__ */ jsx9("iconify-icon", { icon: "mdi:text-box-search-outline", width: "16", height: "16" }),
                          /* @__PURE__ */ jsx9(Typography9, { variant: "body2", fontWeight: 600, sx: { flex: 1, minWidth: 0 }, children: c.filename || c.fileId || "fragmento" }),
                          c.score != null ? /* @__PURE__ */ jsx9(
                            Chip5,
                            {
                              size: "small",
                              variant: "outlined",
                              label: `score ${Number(c.score).toFixed(3)}`,
                              className: "conv-usage-dialog__chunk-score"
                            }
                          ) : null,
                          /* @__PURE__ */ jsx9(Tooltip6, { title: "Ver fragmento en full-page", children: /* @__PURE__ */ jsx9(IconButton7, { size: "small", "aria-label": "Abrir fragmento", className: "conv-usage-dialog__chunk-open", children: /* @__PURE__ */ jsx9("iconify-icon", { icon: "mdi:fullscreen", width: "16", height: "16" }) }) })
                        ] }),
                        /* @__PURE__ */ jsx9(
                          Typography9,
                          {
                            variant: "caption",
                            component: "pre",
                            className: "conv-usage-dialog__chunk-preview",
                            sx: { whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0, fontFamily: "inherit" },
                            children: chunkPreview(c.text, 280)
                          }
                        )
                      ]
                    },
                    c.key
                  )) })
                ] }) : null
              ] })
            }
          ),
          /* @__PURE__ */ jsx9(GlassDialogCloseActions, { onClose })
        ]
      }
    ),
    /* @__PURE__ */ jsx9(
      MdFullPageDialog,
      {
        open: Boolean(openChunk),
        onClose: () => setOpenChunk(null),
        source: openChunk?.text || "",
        title: openChunk ? `Fragmento \xB7 ${openChunk.filename || openChunk.fileId || "texto exacto"}` : "Fragmento",
        subtitle: openChunk ? [
          openChunk.score != null ? `score ${Number(openChunk.score).toFixed(3)}` : "",
          openChunk.queries?.length ? `Queries: ${openChunk.queries.join(" \xB7 ")}` : ""
        ].filter(Boolean).join("  \xB7  ") : "",
        accent: "#7c3aed",
        icon: "mdi:text-box-search-outline"
      }
    )
  ] });
}
function UsageDialogSection({ section, GlassSection, GlassInner }) {
  const { Box: Box12, Typography: Typography9, Stack: Stack7 } = getMaterialUI();
  const { Icon: Icon11 } = UI;
  const cost = section?.cost;
  const tokens = section?.tokens;
  const totalCost = Number(cost?.total ?? 0) || 0;
  const totalTokens = Number(tokens?.total ?? 0) || 0;
  const reasoning = Number(tokens?.reason ?? tokens?.reasoning ?? 0) || 0;
  const totalTokLabel = totalTokens ? totalTokens.toLocaleString("es-CO") : "\u2014";
  const costLabel = totalCost > 0 ? `$${totalCost.toFixed(6)}` : "\u2014";
  const reasonLabel = reasoning > 0 ? `${reasoning.toLocaleString("es-CO")} razon.` : null;
  const empty = totalCost <= 0 && totalTokens <= 0;
  const body = /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__section-body", children: [
    empty ? /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__empty", role: "status", children: [
      /* @__PURE__ */ jsx9("span", { className: "conv-usage-dialog__empty-icon", "aria-hidden": true, children: /* @__PURE__ */ jsx9(Icon11, { icon: "mdi:currency-usd-off", size: 18 }) }),
      /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__empty-copy", children: [
        /* @__PURE__ */ jsx9(Typography9, { component: "p", className: "conv-usage-dialog__empty-title", children: "Sin costo ni tokens LLM" }),
        /* @__PURE__ */ jsx9(Typography9, { component: "p", className: "conv-usage-dialog__empty-sub", children: "Este turno no pas\xF3 por OpenAI (p. ej. ContaPyme MCP u operativa local)." })
      ] })
    ] }) : /* @__PURE__ */ jsxs8(
      Stack7,
      {
        direction: { xs: "column", sm: "row" },
        spacing: { xs: 1.25, sm: 2 },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        className: "conv-usage-dialog__headline",
        children: [
          /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__headline-main", children: [
            /* @__PURE__ */ jsx9(Typography9, { variant: "overline", className: "conv-usage-dialog__headline-k", sx: { lineHeight: 1, display: "block", opacity: 0.7 }, children: "Costo" }),
            /* @__PURE__ */ jsx9(
              Typography9,
              {
                variant: "h4",
                component: "span",
                className: `conv-usage-dialog__headline-v conv-usage-dialog__headline-v--${section.key}`,
                sx: { fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.05, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' },
                children: costLabel
              }
            )
          ] }),
          /* @__PURE__ */ jsxs8(Stack7, { direction: "row", spacing: 1, alignItems: "center", className: "conv-usage-dialog__headline-meta", children: [
            /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__headline-meta-item", children: [
              /* @__PURE__ */ jsx9(Typography9, { variant: "overline", sx: { lineHeight: 1, display: "block", opacity: 0.7 }, children: "Tokens" }),
              /* @__PURE__ */ jsx9(
                Typography9,
                {
                  variant: "h6",
                  component: "span",
                  className: "conv-usage-dialog__headline-meta-v",
                  sx: { fontWeight: 700, lineHeight: 1.1, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' },
                  children: totalTokLabel
                }
              )
            ] }),
            reasonLabel ? /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__headline-meta-item conv-usage-dialog__headline-meta-item--reason", children: [
              /* @__PURE__ */ jsx9(Typography9, { variant: "overline", sx: { lineHeight: 1, display: "block", opacity: 0.7 }, children: "Razonamiento" }),
              /* @__PURE__ */ jsx9(
                Typography9,
                {
                  variant: "body1",
                  component: "span",
                  sx: { fontWeight: 600, lineHeight: 1.1, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' },
                  children: reasonLabel
                }
              )
            ] }) : null
          ] })
        ]
      }
    ),
    !empty ? /* @__PURE__ */ jsxs8(Box12, { className: "conv-usage-dialog__metrics-wrap", children: [
      /* @__PURE__ */ jsx9(Typography9, { component: "p", variant: "caption", className: "conv-usage-dialog__metrics-caption", children: "Desglose por etapa" }),
      /* @__PURE__ */ jsx9(
        UsageMetricsGrid,
        {
          className: "conv-usage-dialog__metrics",
          hideRowLabels: true,
          sections: [{ key: section.key, label: section.title, tokens: section.tokens, cost: section.cost }]
        }
      )
    ] }) : null
  ] });
  if (!GlassSection) {
    return /* @__PURE__ */ jsxs8(Box12, { className: `conv-usage-dialog__section-card conv-usage-dialog__section-card--${section.key}`, children: [
      /* @__PURE__ */ jsxs8("div", { className: "conv-usage-dialog__section-head", children: [
        /* @__PURE__ */ jsx9(Typography9, { component: "h3", variant: "subtitle2", className: "conv-usage-dialog__section-title", children: section.title }),
        /* @__PURE__ */ jsx9(Typography9, { variant: "caption", color: "text.secondary", className: "conv-usage-dialog__section-sub", children: section.subtitle })
      ] }),
      body
    ] });
  }
  return /* @__PURE__ */ jsx9(
    GlassSection,
    {
      sectionKey: `conv-usage-${section.key}`,
      className: `conv-usage-dialog__glass-section conv-usage-dialog__glass-section--${section.key}`,
      title: /* @__PURE__ */ jsxs8(Stack7, { direction: "row", spacing: 1, alignItems: "baseline", sx: { minWidth: 0, flex: 1 }, children: [
        /* @__PURE__ */ jsx9(Typography9, { component: "span", variant: "subtitle1", sx: { fontWeight: 700, letterSpacing: -0.2 }, children: section.title }),
        /* @__PURE__ */ jsx9(Typography9, { component: "span", variant: "caption", color: "text.secondary", sx: { flex: 1, minWidth: 0 }, children: section.subtitle })
      ] }),
      icon: section.icon,
      accent: section.accent,
      tone: section.tone,
      headerSx: { borderRadius: "0.75rem 0.75rem 0 0" },
      bodySx: { pt: 1.25, pb: { xs: 1.25, sm: 1.5 } },
      children: body
    }
  );
}
function UsageStatsColumn({ stats, align = "right", msgLabel, fecha, meta, isUser = false }) {
  const { Box: Box12 } = getMaterialUI();
  const [open, setOpen] = useState7(false);
  const modelRaw = String(meta?.model ?? "").trim();
  const modelLabel = modelRaw ? modelBadgeLabel(modelRaw) : "";
  const latencyLabel = formatLatencySeconds(meta?.latency_ms);
  const autoswitchBadge = visionAutoswitchBadge(meta);
  const metaTk = meta?.tokens?.total ? meta.tokens : tokensFromUsage(meta?.usage);
  const metaTokTotal = Number(metaTk?.total ?? 0) || 0;
  const metaTokLabel = metaTokTotal > 0 ? metaTokTotal.toLocaleString("es-CO") : "";
  const contextChips = buildMetaClassificationChips(meta, msgLabel, { isUser });
  const showMetaBadges = Boolean(modelLabel || latencyLabel || autoswitchBadge || metaTokLabel || contextChips.length);
  const hasUsage = Boolean(
    stats && (usageHasData(stats.tokens, stats.cost) || usageHasData(stats.previousTokens, stats.previousCost))
  );
  if (!showMetaBadges && !hasUsage) return null;
  const msgSummary = hasUsage ? formatUsageSummary(stats.tokens, stats.cost) : null;
  const cumSummary = hasUsage ? formatUsageSummary(stats.cumulativeTokens, stats.cumulativeCost) : null;
  const showCum = hasUsage && !isUser && usageHasData(stats.cumulativeTokens, stats.cumulativeCost);
  const groups = hasUsage ? [
    { key: "msg", label: "Mensaje", summary: msgSummary },
    ...showCum ? [{ key: "cum", label: "Acumulado", summary: cumSummary }] : []
  ] : [];
  const openDialog = (e) => {
    if (!hasUsage) return;
    e?.stopPropagation?.();
    setOpen(true);
  };
  return /* @__PURE__ */ jsxs8(Fragment4, { children: [
    /* @__PURE__ */ jsxs8(
      Box12,
      {
        className: [
          "conv-msg-usage-stats",
          `conv-msg-usage-stats--${align}`,
          hasUsage ? "conv-msg-usage-stats--clickable" : ""
        ].filter(Boolean).join(" "),
        role: hasUsage ? "button" : void 0,
        tabIndex: hasUsage ? 0 : void 0,
        title: hasUsage ? "Clic para ver desglose completo" : void 0,
        "aria-label": hasUsage ? "Ver detalle de uso: costo USD y tokens" : void 0,
        onClick: hasUsage ? openDialog : void 0,
        onKeyDown: hasUsage ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openDialog();
          }
        } : void 0,
        sx: {
          flexShrink: 0,
          width: "fit-content",
          height: "fit-content",
          minHeight: 0,
          maxWidth: { xs: "min(100%, 18rem)", sm: groups.length > 1 ? "22rem" : "18rem" },
          pt: 0.25,
          alignSelf: "flex-start",
          cursor: hasUsage ? "pointer" : void 0,
          ...hasUsage ? {
            transition: "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.16s ease",
            "&:hover": {
              borderColor: "rgba(0, 229, 255, 0.72)",
              background: "linear-gradient(165deg, rgba(14, 26, 48, 0.98), rgba(20, 32, 58, 0.92))",
              boxShadow: "0 0 0 1px rgba(0, 229, 255, 0.35), 0 12px 36px rgba(30, 144, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
              transform: "translateY(-2px)"
            },
            "&:active": {
              transform: "translateY(0)",
              boxShadow: "0 0 0 1px rgba(0, 229, 255, 0.22), 0 4px 16px rgba(30, 144, 255, 0.18)"
            },
            'html[data-mui-color-scheme="light"] &:hover': {
              borderColor: "rgba(30, 144, 255, 0.48)",
              background: "linear-gradient(165deg, #f0f9ff, #eef2ff)",
              boxShadow: "0 0 0 1px rgba(30, 144, 255, 0.16), 0 8px 24px rgba(30, 144, 255, 0.14)"
            },
            'html[data-mui-color-scheme="light"] &:active': {
              background: "#e0f2fe"
            }
          } : {}
        },
        children: [
          showMetaBadges ? /* @__PURE__ */ jsxs8(Box12, { className: `conv-msg-usage-stats__meta conv-msg-usage-stats__meta--${align}`, children: [
            contextChips.map((c) => /* @__PURE__ */ jsx9(MetaBadge, { label: c.label, tone: c.tone, title: c.title }, c.key)),
            modelLabel ? /* @__PURE__ */ jsx9(
              UsageSummaryChip,
              {
                tag: "MODELO",
                label: modelLabel,
                className: "conv-msg-usage-chip conv-msg-usage-chip--model",
                title: meta?.modelo_autoswitch_vision ? modelRaw && modelRaw !== modelLabel ? `Modelo usado (autoswitch visi\xF3n): ${modelRaw}` : "Modelo usado tras autoswitch visi\xF3n" : modelRaw && modelRaw !== modelLabel ? `Modelo: ${modelRaw}` : "Modelo LLM"
              }
            ) : null,
            autoswitchBadge ? /* @__PURE__ */ jsx9(
              UsageSummaryChip,
              {
                tag: autoswitchBadge.tag,
                label: autoswitchBadge.label,
                className: "conv-msg-usage-chip conv-msg-usage-chip--vision",
                title: autoswitchBadge.title
              }
            ) : null,
            latencyLabel ? /* @__PURE__ */ jsx9(
              UsageSummaryChip,
              {
                tag: "LAT",
                label: latencyLabel,
                className: "conv-msg-usage-chip conv-msg-usage-chip--latency",
                title: "Tiempo de respuesta"
              }
            ) : null,
            metaTokLabel && !hasUsage ? /* @__PURE__ */ jsx9(
              UsageSummaryChip,
              {
                tag: "TOK",
                label: metaTokLabel,
                className: "conv-msg-usage-chip conv-msg-usage-chip--tokens",
                title: `Tokens: ${metaTokLabel}`
              }
            ) : null
          ] }) : null,
          groups.length > 0 ? /* @__PURE__ */ jsx9(Box12, { className: `conv-msg-usage-stats__groups conv-msg-usage-stats__groups--${align}`, children: groups.map((group) => /* @__PURE__ */ jsxs8(Box12, { className: `conv-msg-usage-stats__group conv-msg-usage-stats__group--${group.key}`, children: [
            /* @__PURE__ */ jsx9(
              UsageSummaryChip,
              {
                tag: group.key === "msg" ? "MSG" : "ACUM",
                className: [
                  "conv-msg-usage-chip",
                  "conv-msg-usage-chip--scope",
                  group.key === "msg" ? "conv-msg-usage-chip--scope-msg" : "conv-msg-usage-chip--scope-prev"
                ].join(" "),
                title: group.label
              }
            ),
            /* @__PURE__ */ jsx9(
              UsageSummaryChip,
              {
                tag: "USD",
                label: group.summary.usdText,
                className: "conv-msg-usage-chip conv-msg-usage-chip--usd",
                title: "Costo USD"
              }
            ),
            /* @__PURE__ */ jsx9(
              UsageSummaryChip,
              {
                tag: "TOK",
                label: group.summary.tokensText,
                className: "conv-msg-usage-chip conv-msg-usage-chip--tokens",
                title: group.key === "msg" ? "Tokens de este mensaje" : "Tokens acumulados del hilo (incluye este mensaje)"
              }
            )
          ] }, group.key)) }) : null
        ]
      }
    ),
    /* @__PURE__ */ jsx9(
      UsageStatsDialog,
      {
        open: open && hasUsage,
        onClose: () => setOpen(false),
        stats,
        msgLabel,
        fecha,
        meta
      }
    )
  ] });
}
function MsgRatingRow({ calificacion, onRate, disabled = false, busy = false, align = "right" }) {
  const { Stack: Stack7, IconButton: IconButton7, Tooltip: Tooltip6, CircularProgress: CircularProgress6 } = getMaterialUI();
  const { Icon: Icon11 } = UI;
  const rated = calificacion !== void 0 && calificacion !== null;
  const useful = calificacion === 1;
  const notUseful = calificacion === 0;
  const readOnly = disabled && !rated && !busy;
  const upTooltip = (() => {
    if (busy && !rated) return "Guardando calificaci\xF3n\u2026";
    if (useful) return "Calificado como \xFAtil";
    if (rated && notUseful) return "Calificado como no \xFAtil \xB7 no se puede cambiar";
    if (readOnly) return "Calificaci\xF3n no disponible (modo lectura)";
    return "Marcar como \xFAtil";
  })();
  const downTooltip = (() => {
    if (busy && !rated) return "Guardando calificaci\xF3n\u2026";
    if (notUseful) return "Calificado como no \xFAtil";
    if (rated && useful) return "Calificado como \xFAtil \xB7 no se puede cambiar";
    if (readOnly) return "Calificaci\xF3n no disponible (modo lectura)";
    return "Marcar como no \xFAtil";
  })();
  const upRatedSx = useful ? { color: "#16a34a !important" } : void 0;
  const downRatedSx = notUseful ? { color: "#ef4444 !important" } : void 0;
  return /* @__PURE__ */ jsxs8(
    Stack7,
    {
      direction: "row",
      spacing: 0.25,
      alignItems: "center",
      justifyContent: align === "right" ? "flex-end" : "flex-start",
      className: `conv-msg-rating conv-msg-rating--${align}${rated ? " conv-msg-rating--rated" : ""}`,
      role: "group",
      "aria-label": "Calificaci\xF3n del mensaje",
      children: [
        /* @__PURE__ */ jsx9(Tooltip6, { title: upTooltip, arrow: true, children: /* @__PURE__ */ jsx9("span", { children: /* @__PURE__ */ jsx9(
          IconButton7,
          {
            size: "small",
            className: `conv-msg-rating__btn conv-msg-rating__btn--up${useful ? " conv-msg-rating__btn--active" : ""}`,
            "aria-label": useful ? "Calificado como \xFAtil" : "Marcar como \xFAtil",
            "aria-pressed": useful,
            disabled: disabled || busy || rated,
            onClick: () => onRate(true),
            sx: upRatedSx,
            children: busy && !rated ? /* @__PURE__ */ jsx9(CircularProgress6, { size: 16 }) : /* @__PURE__ */ jsx9(
              Icon11,
              {
                icon: useful ? "mdi:thumb-up" : "mdi:thumb-up-outline",
                size: 18,
                style: useful ? { color: "#16a34a" } : void 0
              }
            )
          }
        ) }) }),
        /* @__PURE__ */ jsx9(Tooltip6, { title: downTooltip, arrow: true, children: /* @__PURE__ */ jsx9("span", { children: /* @__PURE__ */ jsx9(
          IconButton7,
          {
            size: "small",
            className: `conv-msg-rating__btn conv-msg-rating__btn--down${notUseful ? " conv-msg-rating__btn--active" : ""}`,
            "aria-label": notUseful ? "Calificado como no \xFAtil" : "Marcar como no \xFAtil",
            "aria-pressed": notUseful,
            disabled: disabled || busy || rated,
            onClick: () => onRate(false),
            sx: downRatedSx,
            children: /* @__PURE__ */ jsx9(
              Icon11,
              {
                icon: notUseful ? "mdi:thumb-down" : "mdi:thumb-down-outline",
                size: 18,
                style: notUseful ? { color: "#ef4444" } : void 0
              }
            )
          }
        ) }) })
      ]
    }
  );
}
function resolveMsgImensaje(msg) {
  const imensaje = Number(msg?.imensaje);
  return imensaje > 0 ? imensaje : void 0;
}
var MensajeSection = memo(function MensajeSection2({ msg, onMeta, compactMeta = false, chatUserDisplayName, chatUserNick, showUsageStats = false, onImageClick, streamingMsgId = null, onRateMessage = null, canRate = false, ratingMsgId = null, operativaEnter = false, onContapymeLoginDone = null }) {
  const { Alert: Alert5, Box: Box12 } = getMaterialUI();
  const [fileSearchOpen, setFileSearchOpen] = useState7(false);
  const meta = roleMetaFor(msg, compactMeta);
  const title = roleTitle(msg, chatUserDisplayName, chatUserNick);
  const titleCaption = roleUserCaption(msg, chatUserNick);
  const fecha = msg.fecha ? String(msg.fecha) : "";
  const fechaIso = msg.fechaIso ? String(msg.fechaIso) : "";
  const isUser = msg.esUsuario;
  const isOperativa = msg.esOperativa;
  const isStreaming = Boolean(msg.isStreaming || streamingMsgId && msg.idMsg === streamingMsgId);
  const showMetaBtn = Boolean(onMeta && (msg.logFragment || msg.meta && metaWorthDialog(msg.meta, isUser)));
  const showFileSearchChips = Boolean(!compactMeta && !isUser && msg.meta && metaHasFileSearch(msg.meta));
  const showMetaChips = Boolean(!compactMeta && (onMeta || showFileSearchChips));
  const statsSide = isUser ? "left" : "right";
  const msgImensaje = resolveMsgImensaje(msg);
  const showRating = Boolean(
    onRateMessage && !isUser && !isOperativa && !isStreaming && msgImensaje && (canRate || msg.calificacion !== void 0)
  );
  const ratingRow = showRating ? /* @__PURE__ */ jsx9(
    MsgRatingRow,
    {
      calificacion: msg.calificacion,
      disabled: !canRate,
      busy: ratingMsgId === msg.idMsg,
      align: "left",
      onRate: (butil) => onRateMessage({ ...msg, imensaje: msgImensaje }, butil)
    }
  ) : null;
  const showMetricsColumn = Boolean(showUsageStats && sideLogPanelWorthShowing(msg));
  const showSideColumn = Boolean(showMetricsColumn || ratingRow);
  const hideUsageInChips = showMetricsColumn;
  const fullLayout = !compactMeta;
  const rowMaxWidth = showMetricsColumn ? "100%" : fullLayout ? isOperativa ? "min(96%, 52rem)" : isUser ? "min(96%, 44rem)" : "min(96%, 48rem)" : isOperativa ? "92%" : "min(96%, 42rem)";
  const cardMaxWidth = showMetricsColumn ? isOperativa ? "72%" : { xs: "100%", sm: "min(48rem, calc(100% - 11.5rem))" } : "100%";
  const roleClass = isOperativa ? `conv-msg--operativa${operativaEnter ? " conv-msg--operativa-enter" : ""}` : "";
  return /* @__PURE__ */ jsxs8(
    Box12,
    {
      className: [compactMeta ? "conv-msg--compact" : "", roleClass].filter(Boolean).join(" ") || void 0,
      sx: {
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        width: "100%",
        mb: isOperativa ? compactMeta ? 1 : 1.75 : compactMeta ? 2.5 : 2
      },
      children: [
        /* @__PURE__ */ jsxs8(
          Box12,
          {
            className: [
              "conv-msg-row",
              compactMeta ? "conv-msg-row--compact" : "",
              showMetricsColumn ? "conv-msg-row--logs" : "",
              isUser ? "conv-msg-row--user" : "conv-msg-row--assistant"
            ].filter(Boolean).join(" "),
            sx: {
              display: "flex",
              flexDirection: isUser ? "row-reverse" : "row",
              alignItems: showSideColumn ? "flex-start" : "flex-start",
              gap: { xs: 0.75, sm: 1.25 },
              width: showMetricsColumn ? "100%" : "fit-content",
              maxWidth: showMetricsColumn ? "100%" : rowMaxWidth,
              minWidth: 0,
              opacity: 1
            },
            children: [
              /* @__PURE__ */ jsx9(
                Box12,
                {
                  className: "conv-msg-card-wrap",
                  sx: {
                    flex: "0 1 auto",
                    width: "fit-content",
                    maxWidth: cardMaxWidth,
                    minWidth: 0
                  },
                  children: /* @__PURE__ */ jsxs8(
                    SectionCard,
                    {
                      id: `conv-msg-${msg.idMsg}`,
                      icon: meta.icon,
                      title,
                      titleCaption: titleCaption || void 0,
                      fecha: fecha || void 0,
                      fechaIso: fechaIso || void 0,
                      accent: meta.accent,
                      align: isUser ? "right" : "left",
                      operativa: isOperativa,
                      compact: compactMeta,
                      streaming: isStreaming,
                      onMeta: showMetaBtn ? () => onMeta(msg) : void 0,
                      metaChips: showMetaChips ? /* @__PURE__ */ jsx9(
                        MetaChipRow,
                        {
                          meta: msg.meta,
                          isUser,
                          hideUsageMetrics: hideUsageInChips || isUser,
                          hideClassificationChips: showUsageStats,
                          align: isUser ? "right" : "left",
                          cardTitle: title,
                          onFileSearch: showFileSearchChips ? () => setFileSearchOpen(true) : void 0
                        }
                      ) : null,
                      children: [
                        msg.streamFailed && msg.streamError && /* @__PURE__ */ jsx9(Alert5, { severity: "warning", sx: { mb: 1.5, py: 0.25, fontSize: "0.78rem" }, children: msg.streamError }),
                        msg.contenido?.trim() || msg.imagenes?.length || msg.audios?.length || isStreaming ? /* @__PURE__ */ jsx9(
                          MsgBody,
                          {
                            text: formatOperativaContenidoForLog(msg, msg.contenido),
                            imagenes: msg.imagenes,
                            audios: msg.audios,
                            audiosTranscripcion: msg.audiosTranscripcion,
                            align: isUser ? "right" : "left",
                            onImageClick,
                            streaming: isStreaming,
                            disableLoginEmbed: isOperativa,
                            loginUrl: isOperativa ? void 0 : msg.meta?.login_url || msg.meta?.extra?.login_url,
                            onContapymeLoginDone: isOperativa || isUser ? void 0 : onContapymeLoginDone
                          }
                        ) : null
                      ]
                    }
                  )
                }
              ),
              showSideColumn && /* @__PURE__ */ jsxs8(
                Box12,
                {
                  className: `conv-msg-side-column conv-msg-side-column--${statsSide}`,
                  sx: {
                    flexShrink: 0,
                    maxWidth: { xs: "100%", sm: "18rem" },
                    width: { xs: "100%", sm: "auto" },
                    pt: 0.25,
                    pb: 0.25,
                    alignSelf: { xs: "flex-start", sm: "stretch" },
                    height: { xs: "fit-content", sm: "auto" },
                    minHeight: { xs: 0, sm: "auto" }
                  },
                  children: [
                    showMetricsColumn ? /* @__PURE__ */ jsx9(
                      UsageStatsColumn,
                      {
                        stats: msg.usageStats,
                        align: statsSide,
                        msgLabel: title,
                        fecha,
                        meta: msg.meta,
                        isUser
                      }
                    ) : null,
                    ratingRow ? /* @__PURE__ */ jsx9(Box12, { className: "conv-msg-rating-slot", children: ratingRow }) : null
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx9(
          FileSearchDialog,
          {
            open: fileSearchOpen,
            onClose: () => setFileSearchOpen(false),
            meta: msg.meta,
            title: `File Search \xB7 ${title}`
          }
        )
      ]
    }
  );
}, (prev, next) => prev.msg === next.msg && prev.streamingMsgId === next.streamingMsgId && prev.compactMeta === next.compactMeta && prev.chatUserDisplayName === next.chatUserDisplayName && prev.chatUserNick === next.chatUserNick && prev.showUsageStats === next.showUsageStats && prev.ratingMsgId === next.ratingMsgId && prev.canRate === next.canRate && prev.operativaEnter === next.operativaEnter);
function ConvLogWebView({ mensajes, onMeta, compactMeta = false, emptyHint, chatUserDisplayName, chatUserNick, showUsageStats = true, streamingMsgId = null, onRateMessage = null, canRate = false, ratingMsgId = null, threadKey = null, threadClassName = "", onContapymeLoginDone = null }) {
  const { Box: Box12, Typography: Typography9 } = getMaterialUI();
  const [lightboxSrc, setLightboxSrc] = useState7(null);
  const operativaEnterIds = useOperativaEnterIds(mensajes, threadKey, { enabled: !compactMeta });
  const mensajesConStats = useMemo7(
    () => attachUsageStats(mensajes || []),
    [mensajes]
  );
  const hasUsageStats = showUsageStats && threadHasUsageStats(mensajesConStats);
  const onImageClick = useMemo7(() => (src) => setLightboxSrc(src), []);
  if (!mensajes?.length) {
    if (emptyHint === null) return null;
    return /* @__PURE__ */ jsx9(Typography9, { variant: "body2", color: "text.secondary", sx: { textAlign: "center", py: 6 }, children: emptyHint || "Recupera por ID o pega un log para ver el hilo." });
  }
  return /* @__PURE__ */ jsxs8(Box12, { className: threadClassName || void 0, sx: { width: "100%", maxWidth: "100%" }, children: [
    mensajesConStats.map((m) => /* @__PURE__ */ jsx9(
      MensajeSection,
      {
        msg: m,
        onMeta,
        compactMeta,
        chatUserDisplayName,
        chatUserNick,
        showUsageStats: hasUsageStats,
        onImageClick,
        streamingMsgId,
        onRateMessage,
        canRate,
        ratingMsgId,
        operativaEnter: operativaEnterIds.has(m.idMsg),
        onContapymeLoginDone
      },
      m.idMsg
    )),
    /* @__PURE__ */ jsx9(ImageLightboxDialog, { open: Boolean(lightboxSrc), src: lightboxSrc, onClose: () => setLightboxSrc(null) })
  ] });
}

// src/js/ui/ConvLogThread.jsx
import { jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
var { Box: Box7, Alert: Alert2 } = getMaterialUI();
function ThreadLoading({ label = "Cargando conversaci\xF3n\u2026" }) {
  return /* @__PURE__ */ jsx10(Box7, { className: "isa-app-boot isa-app-boot--inline", sx: { position: "absolute", inset: 0, zIndex: 2, minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", pointerEvents: "none" }, children: /* @__PURE__ */ jsxs9("div", { className: "isa-app-boot__card isa-app-boot__card--compact", role: "status", "aria-live": "polite", style: { background: "rgba(8, 16, 32, 0.72)" }, children: [
    /* @__PURE__ */ jsx10("div", { className: "isa-app-boot__icon-wrap isa-app-boot__icon-wrap--sm", children: /* @__PURE__ */ jsx10("iconify-icon", { icon: "mdi:loading", class: "isa-spin", width: "1.375em", height: "1.375em" }) }),
    /* @__PURE__ */ jsx10("p", { className: "isa-app-boot__label", children: label }),
    /* @__PURE__ */ jsx10("div", { className: "isa-app-boot__bar", "aria-hidden": "true", children: /* @__PURE__ */ jsx10("span", { className: "isa-app-boot__bar-fill" }) })
  ] }) });
}
function ConvLogThread({
  mensajes,
  onMeta,
  compactMeta = false,
  showUsageStats = true,
  chatUserDisplayName,
  chatUserNick,
  threadKey = null,
  streamingMsgId = null,
  onRateMessage = null,
  canRate = false,
  ratingMsgId = null,
  emptyHint,
  loading = false,
  loadingOnlyWhenEmpty = true,
  error = null,
  scrollRef = null,
  onScroll = null,
  surfaceClassName = "",
  sx = {},
  onContapymeLoginDone = null
}) {
  const threadClassName = compactMeta ? "paty-chat-thread--compact" : "paty-chat-log-thread";
  const showSpinner = loading && (loadingOnlyWhenEmpty ? !mensajes?.length : true);
  return /* @__PURE__ */ jsxs9(
    Box7,
    {
      ref: scrollRef,
      onScroll,
      className: [
        "conv-log-thread-surface",
        compactMeta ? "conv-log-thread-surface--compact" : "",
        surfaceClassName
      ].filter(Boolean).join(" "),
      sx: { ...convLogSurfaceSx(), flex: 1, minHeight: 0, ...sx },
      children: [
        showSpinner ? /* @__PURE__ */ jsx10(ThreadLoading, {}) : null,
        error ? /* @__PURE__ */ jsx10(Alert2, { severity: "warning", sx: { mb: 2 }, children: error }) : null,
        /* @__PURE__ */ jsx10(
          ConvLogWebView,
          {
            mensajes,
            onMeta,
            compactMeta,
            showUsageStats,
            threadClassName,
            chatUserDisplayName,
            chatUserNick,
            streamingMsgId,
            emptyHint: showSpinner ? null : emptyHint,
            canRate,
            onRateMessage,
            ratingMsgId,
            threadKey,
            onContapymeLoginDone
          }
        )
      ]
    }
  );
}

// src/js/tools/chat/ChatComposer.jsx
init_platform();
init_patyia_jwt();

// src/js/tools/chat/ChatPayloadPreview.jsx
init_platform();
init_patyiaChatApi();
import { jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
var { useMemo: useMemo8 } = getReact();
var { Icon: Icon6 } = UI;
function ChatPayloadPreview({ open, body, endpoint, onClose }) {
  const { Box: Box12, Typography: Typography9, Paper, IconButton: IconButton7, Tooltip: Tooltip6 } = getMaterialUI();
  const previewJson = useMemo8(
    () => formatConversacionPostBodyPreview(body),
    [body]
  );
  const imageCount = Array.isArray(body.imagenes) ? body.imagenes.length : 0;
  const audioCount = Array.isArray(body.audios) ? body.audios.length : 0;
  if (!open) return null;
  return /* @__PURE__ */ jsxs10(
    Paper,
    {
      className: "paty-chat-payload-preview",
      elevation: 8,
      role: "region",
      "aria-label": "Vista previa del body POST",
      children: [
        /* @__PURE__ */ jsxs10(Box12, { className: "paty-chat-payload-preview__head", children: [
          /* @__PURE__ */ jsxs10(Box12, { className: "paty-chat-payload-preview__head-main", children: [
            /* @__PURE__ */ jsx11(Typography9, { variant: "caption", className: "paty-chat-payload-preview__method", children: "POST" }),
            /* @__PURE__ */ jsx11(Typography9, { variant: "caption", component: "code", className: "paty-chat-payload-preview__path", children: endpoint }),
            imageCount > 0 ? /* @__PURE__ */ jsxs10(Typography9, { variant: "caption", className: "paty-chat-payload-preview__meta", children: [
              imageCount,
              " imagen",
              imageCount !== 1 ? "es" : "",
              " \xB7 base64"
            ] }) : null,
            audioCount > 0 ? /* @__PURE__ */ jsxs10(Typography9, { variant: "caption", className: "paty-chat-payload-preview__meta", children: [
              audioCount,
              " audio",
              audioCount !== 1 ? "s" : "",
              " \xB7 base64"
            ] }) : null
          ] }),
          /* @__PURE__ */ jsx11(Tooltip6, { title: "Cerrar vista previa", children: /* @__PURE__ */ jsx11(
            IconButton7,
            {
              size: "small",
              className: "paty-chat-payload-preview__close",
              "aria-label": "Cerrar vista previa del body POST",
              onClick: onClose,
              children: /* @__PURE__ */ jsx11(Icon6, { icon: "mdi:close", size: 18 })
            }
          ) })
        ] }),
        /* @__PURE__ */ jsx11(Box12, { className: "paty-chat-payload-preview__body", children: /* @__PURE__ */ jsx11(
          CodeMirrorPanel,
          {
            value: previewJson,
            json: true,
            readOnly: true,
            lineWrapping: true,
            maxHeight: "min(36vh, 280px)",
            minHeight: "7rem",
            copyTitle: "Copiar JSON del POST",
            enableFullPage: true,
            fullPageTitle: "Body POST \xB7 /conversacion",
            className: "paty-chat-payload-preview__cm"
          }
        ) }),
        /* @__PURE__ */ jsxs10(Typography9, { variant: "caption", className: "paty-chat-payload-preview__foot", children: [
          "Vista previa en vivo \u2014 el env\xEDo incluye base64 completo en ",
          /* @__PURE__ */ jsx11("code", { children: "imagenes[]" }),
          " y ",
          /* @__PURE__ */ jsx11("code", { children: "audios[]" }),
          ".",
          " ",
          "ISS acepta im\xE1genes ",
          /* @__PURE__ */ jsx11("code", { children: "data:image/(png|jpeg|webp|gif);base64,\u2026" }),
          " (m\xE1x. 10) y audios ",
          /* @__PURE__ */ jsx11("code", { children: "data:audio/*;base64,\u2026" }),
          " (m\xE1x. 5, transcritos con Whisper)."
        ] })
      ]
    }
  );
}

// src/js/tools/chat/ChatComposer.jsx
import { jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
var { useState: useState8, useMemo: useMemo9, useEffect: useEffect9 } = getReact();
var {
  Box: Box8,
  Button: Button2,
  IconButton: IconButton4,
  TextField: TextField2,
  CircularProgress: CircularProgress3,
  Tooltip: Tooltip3
} = getMaterialUI();
var { Icon: Icon7 } = UI;
function ChatComposer({
  canSend,
  sending,
  draft,
  images,
  audios,
  isRecording,
  payloadPreviewOpen,
  postBodyPreview,
  inputRef,
  attachInputRef,
  onDraftChange,
  onPaste,
  onSend,
  onTogglePayloadPreview,
  onAttachClick,
  onAttachChange,
  onToggleVoiceRecord,
  onRemoveImage,
  onRemoveAudio
}) {
  const [lightboxSrc, setLightboxSrc] = useState8(null);
  const canRecord = isVoiceRecordingSupported();
  const hasContent = Boolean(draft.trim() || images.length || audios.length);
  const imagePreviewUrls = useMemo9(
    () => images.map((img) => blobToPreviewUrl(img.blob)),
    [images]
  );
  const audioPreviewUrls = useMemo9(
    () => audios.map((aud) => blobToPreviewUrl2(aud.blob)),
    [audios]
  );
  useEffect9(() => () => {
    [...imagePreviewUrls, ...audioPreviewUrls].forEach((u) => {
      if (u) URL.revokeObjectURL(u);
    });
  }, [imagePreviewUrls, audioPreviewUrls]);
  if (!canSend) return null;
  return /* @__PURE__ */ jsxs11(Box8, { className: "paty-chat-compose", children: [
    /* @__PURE__ */ jsx12(
      ChatPayloadPreview,
      {
        open: payloadPreviewOpen,
        body: postBodyPreview,
        endpoint: `${PATYIA_API_BASE}/conversacion`,
        onClose: onTogglePayloadPreview
      }
    ),
    images.length > 0 && /* @__PURE__ */ jsx12(Box8, { className: "paty-chat-image-previews", children: images.map((img, idx) => {
      const previewSrc = img.uploadedUrl || imagePreviewUrls[idx] || "";
      return /* @__PURE__ */ jsxs11("figure", { children: [
        /* @__PURE__ */ jsx12(
          "button",
          {
            type: "button",
            className: "paty-chat-image-previews__thumb-btn",
            "aria-label": `Ver ${img.name || "adjunto"} en tama\xF1o completo`,
            onClick: () => previewSrc && setLightboxSrc(previewSrc),
            children: /* @__PURE__ */ jsx12(
              "img",
              {
                src: previewSrc,
                alt: img.name || "adjunto",
                onError: (e) => {
                  e.currentTarget.classList.add("paty-chat-image-previews__img--broken");
                  e.currentTarget.removeAttribute("src");
                }
              }
            )
          }
        ),
        /* @__PURE__ */ jsx12("button", { type: "button", className: "paty-chat-image-previews__remove", "aria-label": "Quitar", onClick: () => onRemoveImage(idx), children: "\xD7" })
      ] }, idx);
    }) }),
    audios.length > 0 && /* @__PURE__ */ jsx12(Box8, { className: "paty-chat-audio-previews", children: audios.map((aud, idx) => {
      const previewSrc = aud.uploadedUrl || audioPreviewUrls[idx] || "";
      return /* @__PURE__ */ jsxs11("figure", { children: [
        /* @__PURE__ */ jsx12("audio", { controls: true, preload: "metadata", src: previewSrc, "aria-label": aud.name || `Nota de voz ${idx + 1}` }),
        /* @__PURE__ */ jsx12("figcaption", { children: aud.name || `Nota ${idx + 1}` }),
        /* @__PURE__ */ jsx12("button", { type: "button", className: "paty-chat-audio-previews__remove", "aria-label": "Quitar audio", onClick: () => onRemoveAudio(idx), children: "\xD7" })
      ] }, idx);
    }) }),
    /* @__PURE__ */ jsxs11(Box8, { className: "paty-chat-input-wrap", children: [
      /* @__PURE__ */ jsx12(
        "input",
        {
          ref: attachInputRef,
          type: "file",
          accept: "image/png,image/jpeg,image/jpg,image/webp,image/gif,audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/ogg,.webm,.mp3,.m4a,.wav,.ogg",
          multiple: true,
          hidden: true,
          "aria-hidden": true,
          tabIndex: -1,
          onChange: onAttachChange
        }
      ),
      /* @__PURE__ */ jsx12(Tooltip3, { title: payloadPreviewOpen ? "Ocultar body POST" : "Ver body POST (JSON en vivo)", children: /* @__PURE__ */ jsx12("span", { children: /* @__PURE__ */ jsx12(IconButton4, { color: "inherit", className: `paty-chat-payload-btn${payloadPreviewOpen ? " paty-chat-payload-btn--active" : ""}`, "aria-label": payloadPreviewOpen ? "Ocultar vista previa JSON" : "Ver vista previa JSON del POST", "aria-pressed": payloadPreviewOpen, disabled: sending, onClick: onTogglePayloadPreview, size: "small", children: /* @__PURE__ */ jsx12(Icon7, { icon: "mdi:code-json", size: 22 }) }) }) }),
      /* @__PURE__ */ jsx12(Tooltip3, { title: "Adjuntar imagen o audio", children: /* @__PURE__ */ jsx12("span", { children: /* @__PURE__ */ jsx12(
        IconButton4,
        {
          color: "inherit",
          className: "paty-chat-attach-btn",
          "aria-label": "Adjuntar imagen o audio",
          disabled: sending || images.length >= MAX_CHAT_IMAGES && audios.length >= MAX_CHAT_AUDIOS,
          onClick: onAttachClick,
          size: "small",
          children: /* @__PURE__ */ jsx12(Icon7, { icon: "mdi:paperclip", size: 22 })
        }
      ) }) }),
      /* @__PURE__ */ jsx12(Tooltip3, { title: canRecord ? isRecording ? "Detener grabaci\xF3n" : "Grabar nota de voz" : "Grabaci\xF3n no disponible en este navegador", children: /* @__PURE__ */ jsx12("span", { children: /* @__PURE__ */ jsx12(
        IconButton4,
        {
          color: isRecording ? "error" : "inherit",
          className: `paty-chat-mic-btn${isRecording ? " paty-chat-mic-btn--recording" : ""}`,
          "aria-label": isRecording ? "Detener grabaci\xF3n" : "Grabar nota de voz",
          "aria-pressed": isRecording,
          disabled: sending || !canRecord || audios.length >= MAX_CHAT_AUDIOS,
          onClick: onToggleVoiceRecord,
          size: "small",
          children: /* @__PURE__ */ jsx12(Icon7, { icon: isRecording ? "mdi:stop-circle-outline" : "mdi:microphone-outline", size: 22 })
        }
      ) }) }),
      /* @__PURE__ */ jsx12(
        TextField2,
        {
          inputRef,
          fullWidth: true,
          multiline: true,
          maxRows: 6,
          size: "small",
          placeholder: isRecording ? "Grabando nota de voz\u2026" : "Escribe tu consulta\u2026 (Ctrl+V, imagen o nota de voz)",
          value: draft,
          onChange: onDraftChange,
          onPaste,
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          },
          disabled: sending || isRecording
        }
      ),
      /* @__PURE__ */ jsx12(Button2, { variant: "contained", disabled: sending || isRecording || !hasContent, onClick: () => onSend(), children: sending ? /* @__PURE__ */ jsx12(CircularProgress3, { size: 20, color: "inherit" }) : "Enviar" })
    ] }),
    /* @__PURE__ */ jsx12(ImageLightboxDialog, { open: Boolean(lightboxSrc), src: lightboxSrc, onClose: () => setLightboxSrc(null) })
  ] });
}

// src/js/tools/chat/ChatMainPanel.jsx
import { jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
var {
  Box: Box9,
  Typography: Typography7,
  Button: Button3,
  IconButton: IconButton5,
  Tooltip: Tooltip4,
  Alert: Alert3,
  Stack: Stack5
} = getMaterialUI();
var { Icon: Icon8 } = UI;
function RefreshConvButton({ onClick, busy = false }) {
  return /* @__PURE__ */ jsx13(Tooltip4, { title: "Actualizar conversaci\xF3n", arrow: true, children: /* @__PURE__ */ jsx13("span", { children: /* @__PURE__ */ jsx13(
    IconButton5,
    {
      size: "small",
      onClick,
      disabled: busy,
      "aria-label": "Actualizar",
      title: "Actualizar",
      className: busy ? "paty-chat-refresh-spin" : void 0,
      children: /* @__PURE__ */ jsx13(Icon8, { icon: busy ? "mdi:loading" : "mdi:refresh", size: 20 })
    }
  ) }) });
}
function ChatMainPanel({ jwt, needsJwt, viewingAuditOther, selectedId, detail, canSend, loadingThread, refreshingThread = false, sending, showThread, logError, displayMensajes, chatUserDisplayName, chatUserNick, ratingMsgId, threadScrollRef, onThreadScroll, onOpenJwt, onClearAuditFilter, onRefreshConv, draft, images, audios, isRecording, payloadPreviewOpen, postBodyPreview, inputRef, attachInputRef, onDraftChange, onPaste, onSend, onTogglePayloadPreview, onAttachClick, onAttachChange, onToggleVoiceRecord, onRemoveImage, onRemoveAudio, onMeta, onRateMessage, onOpenSidebar, messageSource = "logs", mode, llmProvider = "openai", onMessageSourceChange, onChatModeChange, onLlmProviderChange, onContapymeLoginDone = null }) {
  const isProdView = messageSource === "prod";
  const hasThread = Boolean(selectedId || detail);
  const providerBtn = onLlmProviderChange ? /* @__PURE__ */ jsx13(LlmProviderSwitch, { provider: llmProvider, onChange: onLlmProviderChange }) : null;
  const headerActions = /* @__PURE__ */ jsx13(
    ChatSidebarHeaderActions,
    {
      messageSource,
      mode,
      onMessageSourceChange,
      onChatModeChange
    }
  );
  return /* @__PURE__ */ jsxs12(Box9, { sx: { flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }, children: [
    onOpenSidebar ? /* @__PURE__ */ jsxs12(
      Stack5,
      {
        direction: "row",
        spacing: 1,
        alignItems: "center",
        className: "paty-chat-main-toolbar",
        sx: { px: 1, py: 0.5, minHeight: 40, flexShrink: 0 },
        children: [
          /* @__PURE__ */ jsx13(Tooltip4, { title: "Conversaciones", arrow: true, children: /* @__PURE__ */ jsx13(IconButton5, { size: "small", onClick: onOpenSidebar, "aria-label": "Abrir conversaciones", children: /* @__PURE__ */ jsx13(Icon8, { icon: "mdi:menu-open", size: 20 }) }) }),
          providerBtn,
          /* @__PURE__ */ jsx13(Typography7, { variant: "subtitle2", sx: { fontWeight: 700, flex: 1, minWidth: 0 }, noWrap: true, children: "Conversaciones" }),
          headerActions,
          hasThread ? /* @__PURE__ */ jsx13(RefreshConvButton, { onClick: onRefreshConv, busy: refreshingThread }) : null
        ]
      }
    ) : /* @__PURE__ */ jsxs12(
      Stack5,
      {
        direction: "row",
        spacing: 1,
        alignItems: "center",
        className: "paty-chat-main-toolbar paty-chat-main-toolbar--desktop",
        sx: { px: 2, py: 0.75, flexShrink: 0 },
        children: [
          providerBtn,
          /* @__PURE__ */ jsx13(Box9, { sx: { flex: 1 } }),
          headerActions,
          hasThread ? /* @__PURE__ */ jsx13(RefreshConvButton, { onClick: onRefreshConv, busy: refreshingThread }) : null
        ]
      }
    ),
    needsJwt && /* @__PURE__ */ jsx13(
      Alert3,
      {
        severity: "info",
        sx: { mx: 2, mt: 1, flexShrink: 0 },
        action: /* @__PURE__ */ jsx13(Button3, { color: "inherit", size: "small", onClick: onOpenJwt, children: "Configurar JWT" }),
        children: "Modo lectura \u2014 puedes explorar conversaciones. Para enviar mensajes inicia sesi\xF3n con tu cuenta ContaPyme o configura un JWT de portal (v\xE1lido en staging y producci\xF3n)."
      }
    ),
    viewingAuditOther && /* @__PURE__ */ jsx13(Alert3, { severity: "info", sx: { mx: 2, mt: 1, flexShrink: 0 }, action: /* @__PURE__ */ jsx13(
      IconButton5,
      {
        color: "inherit",
        size: "small",
        "aria-label": jwt?.claims?.itercero ? "Volver a mi JWT" : "Ver recientes",
        onClick: onClearAuditFilter,
        children: /* @__PURE__ */ jsx13(Icon8, { icon: "mdi:close", size: 18 })
      }
    ), children: "Viendo conversaciones de otro usuario \u2014 lectura." }),
    !showThread ? /* @__PURE__ */ jsx13(
      Box9,
      {
        className: "paty-chat-thread-surface",
        sx: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, ...convLogSurfaceSx({ flex: 1 }) },
        children: /* @__PURE__ */ jsx13(Box9, { sx: { textAlign: "center", maxWidth: 420, p: 2, borderRadius: 2, border: 1, borderColor: "divider", borderStyle: "dashed" }, children: /* @__PURE__ */ jsx13(Typography7, { variant: "body1", children: canSend ? "Escribe un mensaje abajo para iniciar una conversaci\xF3n." : needsJwt ? "Selecciona una conversaci\xF3n del listado o inicia sesi\xF3n / configura JWT para chatear." : "Selecciona una conversaci\xF3n o crea una nueva." }) })
      }
    ) : /* @__PURE__ */ jsx13(
      ConvLogThread,
      {
        scrollRef: threadScrollRef,
        onScroll: onThreadScroll,
        mensajes: displayMensajes,
        onMeta: isProdView ? void 0 : onMeta,
        compactMeta: false,
        showUsageStats: !isProdView,
        chatUserDisplayName,
        chatUserNick,
        surfaceClassName: "paty-chat-thread-surface",
        streamingMsgId: sending ? "stream-live" : null,
        emptyHint: "Sin mensajes en esta conversaci\xF3n.",
        canRate: canSend && Boolean(jwt?.token),
        onRateMessage,
        ratingMsgId,
        threadKey: selectedId ?? "draft",
        loading: loadingThread,
        loadingOnlyWhenEmpty: !sending,
        error: logError,
        onContapymeLoginDone
      }
    ),
    /* @__PURE__ */ jsx13(
      ChatComposer,
      {
        canSend,
        sending,
        draft,
        images,
        audios,
        isRecording,
        payloadPreviewOpen,
        postBodyPreview,
        inputRef,
        attachInputRef,
        onDraftChange,
        onPaste,
        onSend,
        onTogglePayloadPreview,
        onAttachClick,
        onAttachChange,
        onToggleVoiceRecord,
        onRemoveImage,
        onRemoveAudio
      }
    )
  ] });
}

// src/js/tools/chat/JwtModal.jsx
init_platform();
init_patyia_jwt();
init_platform();
import { jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
var { useState: useState9, useEffect: useEffect10 } = getReact();
var { Button: Button4, TextField: TextField3, DialogContent: DialogContent2, DialogActions, CircularProgress: CircularProgress4 } = getMaterialUI();
function JwtModal({ open, onClose, initialToken, onSave }) {
  const [value, setValue] = useState9(initialToken || "");
  const [saving, setSaving] = useState9(false);
  useEffect10(() => {
    if (open) setValue(initialToken || "");
  }, [open, initialToken]);
  async function submit() {
    try {
      const user = Session.username();
      if (!user) throw new Error("Inicia sesi\xF3n en ISA PatyIA");
      setSaving(true);
      const rec = await savePatyJwtAsync(value, user);
      onSave(rec);
      toastSuccess("Token JWT guardado en tu cuenta");
      onClose();
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs13(
    GlassDialog,
    {
      open,
      onClose: saving ? void 0 : onClose,
      maxWidth: "sm",
      fullWidth: true,
      paperClassName: "paty-chat-jwt-dialog",
      header: /* @__PURE__ */ jsx14(
        GlassDialogHeader,
        {
          icon: "mdi:key-chain",
          title: "Token JWT PatyIA",
          subtitle: "Pega el token de sesi\xF3n para el chat staging",
          accent: "#6366f1",
          onClose: saving ? void 0 : onClose
        }
      ),
      children: [
        /* @__PURE__ */ jsx14(DialogContent2, { sx: glassDialogContentSx({ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1 }), children: /* @__PURE__ */ jsx14(
          TextField3,
          {
            fullWidth: true,
            multiline: true,
            minRows: 4,
            value,
            onChange: (e) => setValue(e.target.value),
            placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            inputProps: { spellCheck: false }
          }
        ) }),
        /* @__PURE__ */ jsxs13(DialogActions, { sx: glassDialogActionsSx(), children: [
          /* @__PURE__ */ jsx14(Button4, { onClick: onClose, disabled: saving, children: "Cancelar" }),
          /* @__PURE__ */ jsx14(Button4, { variant: "contained", onClick: submit, disabled: saving, children: saving ? /* @__PURE__ */ jsx14(CircularProgress4, { size: 20, color: "inherit" }) : "Guardar" })
        ] })
      ]
    }
  );
}

// src/js/tools/chat/TercerosAuditDialog.jsx
init_platform();
init_patyia_jwt();
init_apiClient();
import { jsx as jsx15, jsxs as jsxs14 } from "react/jsx-runtime";
var { useState: useState10, useEffect: useEffect11, useMemo: useMemo10 } = getReact();
var {
  Box: Box10,
  Typography: Typography8,
  Button: Button5,
  TextField: TextField4,
  Dialog,
  DialogTitle,
  DialogContent: DialogContent3,
  DialogActions: DialogActions2,
  CircularProgress: CircularProgress5,
  Alert: Alert4,
  Stack: Stack6,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip: Chip4
} = getMaterialUI();
var { Icon: Icon9 } = UI;
var CELL_SX = { py: 0.5, px: 1, fontSize: "0.75rem", lineHeight: 1.25 };
var HEAD_SX = { ...CELL_SX, fontWeight: 650, whiteSpace: "nowrap" };
function rowsWithActiveFirst(rows, currentKey, currentScope) {
  const list = Array.isArray(rows) ? [...rows] : [];
  list.sort((a, b) => (Number(b.total_conversaciones) || 0) - (Number(a.total_conversaciones) || 0));
  if (!currentKey) return list;
  const idx = list.findIndex((r) => `${r.itercero}|${r.icontacto}` === currentKey);
  if (idx === 0) return list;
  if (idx > 0) {
    const [active] = list.splice(idx, 1);
    list.unshift(active);
    return list;
  }
  if (!currentScope?.itercero) return list;
  list.unshift({
    itercero: String(currentScope.itercero),
    icontacto: String(currentScope.icontacto ?? ""),
    nombre: currentScope.nombre ?? null,
    total_conversaciones: Number(currentScope.total_conversaciones ?? 0) || 0,
    total_mensajes: Number(currentScope.total_mensajes ?? 0) || 0,
    ultima_actividad: currentScope.ultima_actividad ?? null,
    es_jwt: !!currentScope.esJwt,
    es_sesion: !!currentScope.esSesion
  });
  return list;
}
function TercerosAuditDialog({ open, onClose, jwt, sessionUser, onSelect, currentScope, canAudit = true }) {
  const [q, setQ] = useState10("");
  const [qDebounced, setQDebounced] = useState10("");
  const [page, setPage] = useState10(1);
  const [loading, setLoading] = useState10(false);
  const [error, setError] = useState10("");
  const [data, setData] = useState10(null);
  useEffect11(() => {
    if (!open) return void 0;
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q, open]);
  useEffect11(() => {
    if (!open) return;
    setPage(1);
  }, [qDebounced, open]);
  useEffect11(() => {
    if (!open) return void 0;
    if (!canAudit) {
      setData(null);
      setError("");
      setLoading(false);
      return void 0;
    }
    const claims = jwt?.token ? jwt.claims?.itercero ? jwt.claims : parseJwtClaims(jwt.token) || {} : {};
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchTercerosAudit({
      page,
      limit: TERCEROS_AUDIT_PAGE_SIZE,
      q: qDebounced,
      jwtToken: jwt?.token,
      jwtTercero: claims.itercero,
      jwtContacto: claims.icontacto,
      jwtNombre: jwt?.token ? jwtUserDisplayName(claims) : void 0,
      appUser: sessionUser || void 0
    }).then((res) => {
      if (cancelled) return;
      const claimsOwn = jwt?.token ? jwt.claims?.itercero ? jwt.claims : parseJwtClaims(jwt.token) || {} : {};
      const ownT = String(claimsOwn.itercero ?? currentScope?.itercero ?? "").trim();
      const ownC = String(claimsOwn.icontacto ?? currentScope?.icontacto ?? "").trim();
      const rows2 = Array.isArray(res?.rows) ? res.rows : [];
      const scoped = canAudit ? rows2 : rows2.filter((r) => String(r.itercero) === ownT && String(r.icontacto) === ownC);
      setData({ ...res, rows: scoped, total: canAudit ? res.total : scoped.length });
    }).catch((err) => {
      if (!cancelled) {
        setData(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, page, qDebounced, jwt?.token, jwt?.claims?.itercero, jwt?.claims?.icontacto, sessionUser, canAudit, currentScope?.itercero, currentScope?.icontacto]);
  const currentKey = auditScopeKey(currentScope);
  const rows = useMemo10(() => {
    if (!canAudit) {
      const own = currentScope?.itercero ? [{
        itercero: String(currentScope.itercero),
        icontacto: String(currentScope.icontacto ?? ""),
        nombre: currentScope.nombre ?? null,
        total_conversaciones: Number(currentScope.total_conversaciones ?? 0) || 0,
        total_mensajes: Number(currentScope.total_mensajes ?? 0) || 0,
        ultima_actividad: currentScope.ultima_actividad ?? null,
        es_jwt: !!currentScope.esJwt,
        es_sesion: true
      }] : data?.rows ?? [];
      return own;
    }
    return rowsWithActiveFirst(data?.rows, currentKey, currentScope);
  }, [canAudit, data?.rows, currentKey, currentScope]);
  return /* @__PURE__ */ jsxs14(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, scroll: "paper", className: "paty-chat-terceros-dialog", children: [
    /* @__PURE__ */ jsx15(DialogTitle, { sx: { py: 1.25, px: 2, fontSize: "1rem" }, children: canAudit ? "Filtrar por usuario" : "Tu usuario" }),
    /* @__PURE__ */ jsxs14(DialogContent3, { dividers: true, sx: { pt: 1.25, px: 2, pb: 1 }, children: [
      canAudit ? /* @__PURE__ */ jsx15(
        TextField4,
        {
          size: "small",
          fullWidth: true,
          placeholder: "Buscar tercero o contacto\u2026",
          value: q,
          onChange: (e) => setQ(e.target.value),
          className: "paty-chat-terceros-search",
          sx: { mb: 1 },
          InputProps: {
            startAdornment: /* @__PURE__ */ jsx15(Icon9, { icon: "mdi:magnify", size: 16, style: { marginRight: 6, opacity: 0.6 } })
          }
        }
      ) : /* @__PURE__ */ jsx15(Alert4, { severity: "info", sx: { mb: 1, py: 0.5 }, children: "Tu rol solo puede ver tus propias conversaciones." }),
      error ? /* @__PURE__ */ jsx15(Alert4, { severity: "error", sx: { mb: 1, py: 0.5 }, children: error }) : null,
      loading ? /* @__PURE__ */ jsx15(Box10, { sx: { py: 3, textAlign: "center" }, children: /* @__PURE__ */ jsx15(CircularProgress5, { size: 24 }) }) : /* @__PURE__ */ jsx15(TableContainer, { className: "paty-chat-terceros-table", children: /* @__PURE__ */ jsxs14(Table, { size: "small", stickyHeader: true, children: [
        /* @__PURE__ */ jsx15(TableHead, { children: /* @__PURE__ */ jsxs14(TableRow, { children: [
          /* @__PURE__ */ jsx15(TableCell, { sx: HEAD_SX, children: "Nombre (Tercero / Contacto)" }),
          /* @__PURE__ */ jsx15(TableCell, { align: "right", sx: HEAD_SX, children: "Convs" }),
          /* @__PURE__ */ jsx15(TableCell, { align: "right", sx: HEAD_SX, children: "Msgs" }),
          /* @__PURE__ */ jsx15(TableCell, { sx: HEAD_SX, children: "\xDAltima act." }),
          /* @__PURE__ */ jsx15(TableCell, { align: "center", sx: HEAD_SX, children: "Ver" })
        ] }) }),
        /* @__PURE__ */ jsxs14(TableBody, { children: [
          rows.map((row) => {
            const key = `${row.itercero}|${row.icontacto}`;
            const selected = currentKey === key;
            const codes = [row.itercero, row.icontacto].filter(Boolean).join(" \xB7 ");
            return /* @__PURE__ */ jsxs14(TableRow, { hover: true, selected, children: [
              /* @__PURE__ */ jsx15(TableCell, { sx: CELL_SX, children: /* @__PURE__ */ jsxs14(Stack6, { direction: "row", spacing: 0.5, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [
                /* @__PURE__ */ jsxs14(Box10, { sx: { minWidth: 0 }, children: [
                  row.nombre ? /* @__PURE__ */ jsx15(Typography8, { variant: "body2", sx: { fontWeight: 600, lineHeight: 1.2, fontSize: "0.78rem" }, children: shortDisplayName(row.nombre) }) : null,
                  /* @__PURE__ */ jsx15(
                    Typography8,
                    {
                      component: "span",
                      variant: "caption",
                      color: "text.secondary",
                      sx: {
                        display: "block",
                        fontWeight: 400,
                        fontSize: "0.65rem",
                        lineHeight: 1.2,
                        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                        letterSpacing: "0.02em"
                      },
                      children: codes
                    }
                  )
                ] }),
                selected ? /* @__PURE__ */ jsx15(Chip4, { size: "small", label: "Viendo", color: "primary", sx: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" } } }) : null,
                row.es_sesion ? /* @__PURE__ */ jsx15(Chip4, { size: "small", label: "Sesi\xF3n", color: "success", sx: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" } } }) : null
              ] }) }),
              /* @__PURE__ */ jsx15(TableCell, { align: "right", sx: CELL_SX, children: Number(row.total_conversaciones || 0).toLocaleString("es-CO") }),
              /* @__PURE__ */ jsx15(TableCell, { align: "right", sx: CELL_SX, children: Number(row.total_mensajes || 0).toLocaleString("es-CO") }),
              /* @__PURE__ */ jsx15(TableCell, { sx: CELL_SX, children: formatAuditTs(row.ultima_actividad) }),
              /* @__PURE__ */ jsx15(TableCell, { align: "center", sx: CELL_SX, children: /* @__PURE__ */ jsx15(
                Button5,
                {
                  size: "small",
                  variant: selected ? "contained" : "outlined",
                  disabled: !canAudit && !row.es_sesion && !row.es_jwt,
                  sx: { minWidth: 0, px: 1, py: 0.15, fontSize: "0.7rem", lineHeight: 1.2 },
                  onClick: () => {
                    if (!canAudit && !row.es_sesion && !row.es_jwt) return;
                    onSelect({
                      itercero: row.itercero,
                      icontacto: row.icontacto,
                      esJwt: row.es_jwt,
                      esSesion: row.es_sesion,
                      nombre: row.nombre ? shortDisplayName(row.nombre) : null
                    });
                  },
                  children: selected ? "Viendo" : row.es_sesion ? "Mis convs" : "Ver"
                }
              ) })
            ] }, key);
          }),
          !loading && !error && !rows.length ? /* @__PURE__ */ jsx15(TableRow, { children: /* @__PURE__ */ jsxs14(TableCell, { colSpan: 5, align: "center", sx: { py: 2.5, color: "text.secondary", fontSize: "0.8rem" }, children: [
            "Sin resultados",
            qDebounced ? ` para \u201C${qDebounced}\u201D` : "",
            "."
          ] }) }) : null
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs14(DialogActions2, { sx: { justifyContent: "space-between", px: 2, py: 1 }, children: [
      /* @__PURE__ */ jsx15(Typography8, { variant: "caption", color: "text.secondary", children: data ? `${data.total.toLocaleString("es-CO")} contactos \xB7 p\xE1g. ${data.page}/${Math.max(data.pages, 1)}` : "\u2014" }),
      /* @__PURE__ */ jsxs14(Stack6, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsx15(
          Button5,
          {
            size: "small",
            disabled: !canAudit || loading || !data || page <= 1,
            onClick: () => setPage((p) => Math.max(1, p - 1)),
            startIcon: /* @__PURE__ */ jsx15(Icon9, { icon: "mdi:chevron-left", size: 16 }),
            children: "Anterior"
          }
        ),
        /* @__PURE__ */ jsx15(
          Button5,
          {
            size: "small",
            disabled: !canAudit || loading || !data || page >= (data.pages || 1),
            onClick: () => setPage((p) => p + 1),
            endIcon: /* @__PURE__ */ jsx15(Icon9, { icon: "mdi:chevron-right", size: 16 }),
            children: "Siguiente"
          }
        ),
        /* @__PURE__ */ jsx15(Button5, { size: "small", onClick: onClose, children: "Cerrar" })
      ] })
    ] })
  ] });
}

// src/js/ui/mobileDrawer.ts
var MOBILE_DRAWER_PAPER_SX = {
  width: "min(300px, calc(100vw - 12px))",
  maxWidth: "100%",
  height: "100%",
  maxHeight: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
};
function mobileDrawerPaperProps(className) {
  return {
    className,
    sx: MOBILE_DRAWER_PAPER_SX
  };
}

// src/js/tools/ChatTool.jsx
import { Fragment as Fragment5, jsx as jsx16, jsxs as jsxs15 } from "react/jsx-runtime";
var { Box: Box11, Drawer, IconButton: IconButton6, Tooltip: Tooltip5, useTheme, useMediaQuery } = getMaterialUI();
var { useState: useState11 } = getReact();
var { Icon: Icon10 } = UI;
function ChatTool({ bootChat, onNeedLogin }) {
  const chat = useChatTool({ bootChat });
  const theme2 = useTheme();
  const isMobile = useMediaQuery(theme2.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState11(false);
  const [refreshingThread, setRefreshingThread] = useState11(false);
  if (!chat.loggedIn) {
    return /* @__PURE__ */ jsx16(ChatLoggedOutShell, {});
  }
  const IsaSplitView = getIsaSplitView();
  const sidebarProps = {
    jwt: chat.jwt,
    displayScope: chat.displayScope,
    sessionUser: chat.sessionUser,
    canInteract: chat.canInteract,
    viewOnly: chat.viewOnly,
    jwtLoading: chat.jwtLoading,
    convListOwnerLabel: chat.convListOwnerLabel,
    convListHeader: chat.convListHeader,
    canSend: chat.canSend,
    canAuditChat: chat.canAuditChat,
    needsJwt: chat.needsJwt,
    listScope: chat.listScope,
    sessionScopeLoading: chat.sessionScopeLoading,
    viewingAuditOther: chat.viewingAuditOther,
    auditScope: chat.auditScope,
    loadingList: chat.loadingList,
    rows: chat.rows,
    selectedId: chat.selectedId,
    convListMeta: chat.convListMeta,
    convListPage: chat.convListPage,
    convListPageSize: chat.convListPageSize,
    convListSearch: chat.convListSearch,
    onConvListSearchChange: chat.handleConvListSearchChange,
    messageSource: chat.messageSource,
    onMessageSourceChange: chat.onMessageSourceChange,
    mode: chat.chatMode,
    llmProvider: chat.llmProvider,
    onChatModeChange: chat.onChatModeChange,
    onLlmProviderChange: chat.onLlmProviderChange,
    onOpenJwt: () => chat.setJwtOpen(true),
    onOpenAudit: () => {
      if (!chat.canAuditChat) {
        toastInfo("Tu rol solo puede ver tus propias conversaciones");
        return;
      }
      chat.setAuditDialogOpen(true);
    },
    onNewChat: chat.onNewChat,
    onOpenConv: chat.openConv,
    onDelete: chat.onDelete,
    onConvListPageChange: chat.setConvListPage,
    onConvListPageSizeChange: chat.onConvListPageSizeChange
  };
  const mainPanel = /* @__PURE__ */ jsx16(
    ChatMainPanel,
    {
      jwt: chat.jwt,
      needsJwt: chat.needsJwt,
      viewingAuditOther: chat.viewingAuditOther,
      selectedId: chat.selectedId,
      detail: chat.detail,
      canSend: chat.canSend,
      loadingThread: chat.loadingThread,
      refreshingThread,
      sending: chat.sending,
      showThread: chat.showThread,
      logError: chat.logError,
      displayMensajes: chat.displayMensajes,
      chatUserDisplayName: chat.chatUserDisplayName,
      chatUserNick: chat.chatUserNick,
      ratingMsgId: chat.ratingMsgId,
      threadScrollRef: chat.threadScrollRef,
      onThreadScroll: chat.onThreadScroll,
      onOpenJwt: () => chat.setJwtOpen(true),
      onClearAuditFilter: chat.clearAuditFilter,
      onRefreshConv: async () => {
        if (!chat.selectedId || refreshingThread) return;
        setRefreshingThread(true);
        try {
          await chat.openConv(chat.selectedId, { freshLog: true, silent: true, keepStream: true });
        } finally {
          setRefreshingThread(false);
        }
      },
      draft: chat.draft,
      images: chat.images,
      audios: chat.audios,
      isRecording: chat.isRecording,
      payloadPreviewOpen: chat.payloadPreviewOpen,
      postBodyPreview: chat.postBodyPreview,
      inputRef: chat.inputRef,
      attachInputRef: chat.attachInputRef,
      onDraftChange: (e) => chat.setDraft(e.target.value),
      onPaste: chat.onPaste,
      onSend: chat.onSend,
      onContapymeLoginDone: chat.onContapymeLoginDone,
      onTogglePayloadPreview: () => chat.setPayloadPreviewOpen((v) => !v),
      onAttachClick: chat.onAttachClick,
      onAttachChange: chat.onAttachChange,
      onToggleVoiceRecord: chat.onToggleVoiceRecord,
      onRemoveImage: (idx) => chat.setImages((p) => p.filter((_, j) => j !== idx)),
      onRemoveAudio: (idx) => chat.setAudios((p) => p.filter((_, j) => j !== idx)),
      onMeta: chat.onMeta,
      onRateMessage: chat.onRateMessage,
      messageSource: chat.messageSource,
      mode: chat.chatMode,
      llmProvider: chat.llmProvider,
      onMessageSourceChange: chat.onMessageSourceChange,
      onChatModeChange: chat.onChatModeChange,
      onLlmProviderChange: chat.onLlmProviderChange,
      onOpenSidebar: isMobile ? () => setSidebarOpen(true) : void 0
    }
  );
  return /* @__PURE__ */ jsxs15(
    Box11,
    {
      className: "conv-log-shell paty-chat-shell",
      sx: { display: "flex", height: "100%", minHeight: 0, flexDirection: "column", position: "relative" },
      children: [
        isMobile ? /* @__PURE__ */ jsxs15(Fragment5, { children: [
          /* @__PURE__ */ jsx16(
            Drawer,
            {
              anchor: "left",
              open: sidebarOpen,
              onClose: () => setSidebarOpen(false),
              ModalProps: { keepMounted: true },
              PaperProps: mobileDrawerPaperProps("paty-mobile-sidebar-drawer"),
              children: /* @__PURE__ */ jsx16(
                ChatThreadSidebar,
                {
                  ...sidebarProps,
                  drawerMode: true,
                  onClose: () => setSidebarOpen(false)
                }
              )
            }
          ),
          mainPanel
        ] }) : /* @__PURE__ */ jsx16(
          IsaSplitView,
          {
            className: "conv-log-shell-split paty-chat-shell-split",
            sx: { flex: 1, minHeight: 0 },
            panelClassName: "conv-log-sidebar paty-chat-sidebar",
            storageKey: "isa-patyia:chat-sidebar-width",
            defaultWidth: CHAT_SIDEBAR_W,
            maxWidth: 520,
            panelTitle: "Conversaciones",
            panelIcon: "mdi:chat-outline",
            UI,
            collapsedRail: ({ expand }) => /* @__PURE__ */ jsxs15(Box11, { className: "conv-log-collapsed-rail paty-chat-collapsed-rail", children: [
              /* @__PURE__ */ jsx16(Tooltip5, { title: "Nueva conversaci\xF3n", placement: "right", children: /* @__PURE__ */ jsx16(
                IconButton6,
                {
                  size: "small",
                  className: "isa-neon-rail-btn isa-neon-rail-btn--new",
                  "aria-label": "Nueva conversaci\xF3n",
                  disabled: !chat.canSend,
                  onClick: () => {
                    chat.onNewChat();
                    expand();
                  },
                  children: /* @__PURE__ */ jsx16(Icon10, { icon: "mdi:plus", size: 20 })
                }
              ) }),
              /* @__PURE__ */ jsx16(Tooltip5, { title: "Cambiar token JWT", placement: "right", children: /* @__PURE__ */ jsx16(
                IconButton6,
                {
                  size: "small",
                  className: "isa-neon-rail-btn isa-neon-rail-btn--jwt",
                  "aria-label": "JWT",
                  onClick: () => {
                    chat.setJwtOpen(true);
                    expand();
                  },
                  children: /* @__PURE__ */ jsx16(Icon10, { icon: "mdi:key-variant", size: 20 })
                }
              ) })
            ] }),
            panel: /* @__PURE__ */ jsx16(ChatThreadSidebar, { ...sidebarProps, splitMode: true }),
            children: mainPanel
          }
        ),
        /* @__PURE__ */ jsx16(
          JwtModal,
          {
            open: chat.jwtOpen,
            onClose: () => chat.setJwtOpen(false),
            initialToken: chat.jwt?.token || "",
            onSave: chat.setJwt
          }
        ),
        /* @__PURE__ */ jsx16(
          MetaDialog,
          {
            open: chat.metaOpen,
            onClose: () => chat.setMetaOpen(false),
            meta: chat.metaMsg?.meta,
            usageStats: chat.metaMsg?.usageStats ?? null,
            title: chat.metaMsg ? `Trazabilidad \xB7 ${chat.metaMsg.rol}` : "",
            isUserMessage: Boolean(chat.metaMsg?.esUsuario),
            userContent: chat.metaMsg?.contenido ?? "",
            imagenes: chat.metaMsg?.imagenes ?? null,
            logFragment: chat.metaMsg?.logFragment ?? null,
            showLog: chat.messageSource !== "prod"
          }
        ),
        /* @__PURE__ */ jsx16(
          TercerosAuditDialog,
          {
            open: chat.auditDialogOpen,
            onClose: () => chat.setAuditDialogOpen(false),
            jwt: chat.jwt,
            sessionUser: chat.sessionUser,
            currentScope: chat.auditCurrentScope,
            canAudit: chat.canAuditChat,
            onSelect: chat.handleSelectAuditScope
          }
        )
      ]
    }
  );
}
export {
  ChatTool
};
