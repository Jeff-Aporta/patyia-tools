var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
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
var PATYIA_ISS_URL, PATYIA_ISS_PROD_URL, PATYIA_ISS_LOCAL, PATYIA_ISS_LOCAL_API, PATYIA_ISS_PROD_API, PATYIA_ISS_STAGING_API, PATYIA_ISS_TARGET_LS_KEY, AVATAR_BG_PALETTE;
var init_patyia = __esm({
  "src/js/core/patyia.ts"() {
    window.ISAFront.migrateLegacyGatewayKeys?.({ "jeff:gateway-local": "", "patyia-apptools:gateway-local": "", "patyia-apptools:lab-local": "" });
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
var bridge, Session, Config, getReact, fb;
var init_platform = __esm({
  "src/js/core/platform.ts"() {
    init_patyia();
    bridge = () => window.ISAFront.createPlatformBridge("ISA");
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
    fb = () => globalThis.ISAFront?.Feedback;
  }
});

// src/js/api/portalJwtApi.ts
var init_portalJwtApi = __esm({
  "src/js/api/portalJwtApi.ts"() {
    init_platform();
    init_patyia();
  }
});

// src/js/core/patyia-jwt.ts
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
var PATYIA_JWT_STORAGE_KEY;
var init_patyia_jwt = __esm({
  "src/js/core/patyia-jwt.ts"() {
    init_portalJwtApi();
    init_apiClient();
    init_platform();
    PATYIA_JWT_STORAGE_KEY = "isa-patyia:paty-jwt";
  }
});

// src/js/api/issListFilter.ts
var init_issListFilter = __esm({
  "src/js/api/issListFilter.ts"() {
  }
});

// src/js/api/patyiaTokens.ts
var init_patyiaTokens = __esm({
  "src/js/api/patyiaTokens.ts"() {
    init_platform();
  }
});

// src/js/api/patyiaChatApi.ts
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
function isSegApiPath(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.startsWith("/permissions/me") || p.startsWith("/patyia/admin/") || p.startsWith("/system/permisos");
}
function shouldRetrySegOnStaging(err) {
  if (!isLocalMode()) return false;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /timeout|terminated|ECONN|ENOTFOUND|Failed to fetch|NetworkError|HTTP 5\d\d|Connection|sin METHOD:path/i.test(msg);
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
function unwrapBody(data) {
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
async function jsonFetchAt(base, path, init) {
  const res = await fetch(`${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`, init);
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = res.statusText;
    if (ct.includes("json")) {
      try {
        const j = await res.json();
        const enc = j.encabezado;
        if (enc?.resultado === false && enc.mensaje) msg = String(enc.mensaje);
        else {
          const inner = j.respuesta || j.body || j;
          msg = String(inner?.message || inner?.error || j.message || j.error || msg);
        }
      } catch {
      }
    }
    throw new Error(humanizeIssAuthMessage(msg) || `HTTP ${res.status}`);
  }
  if (!ct.includes("json")) {
    throw new Error(`Respuesta no JSON (${res.status}) desde ${base}${path}`);
  }
  const raw = await res.json();
  return unwrapBody(raw);
}
async function jsonFetch(path, init) {
  try {
    return await jsonFetchAt(systemApiBase(), path, init);
  } catch (err) {
    if (!isSegApiPath(path) || !shouldRetrySegOnStaging(err)) throw err;
    console.warn(`[seg-front] local \u2192 staging ${path}:`, err instanceof Error ? err.message : err);
    return jsonFetchAt(PATYIA_ISS_STAGING_API, path, init);
  }
}
async function fetchInstruccionesSystemConfig() {
  const body = await jsonFetch("/system/instrucciones", { method: "GET", headers: systemApiHeaders() });
  const rows = Array.isArray(body.rows) ? body.rows : [];
  return {
    rows,
    canEdit: !!body.canEdit,
    storage: body.storage,
    schema: body.schema,
    rowCount: Number(body.rowCount ?? rows.length) || rows.length
  };
}
async function putInstruccionUpsert(payload) {
  return jsonFetch("/system/instrucciones", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
async function putInstruccionesPublish(sql) {
  return jsonFetch("/system/instrucciones", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ sql })
  });
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
      const data = unwrapBody(await res.json());
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
function setServerInstruccionesCanEdit(v) {
  ME_SERVER_INSTRUCCIONES_EDIT = v;
  window.dispatchEvent(new Event("patyia-apptools:caps-changed"));
}
function notifyAuth() {
  window.dispatchEvent(new Event(Session.EVENT));
  window.dispatchEvent(new Event("patyia-apptools:auth"));
  window.dispatchEvent(new Event("isa-patyia:auth"));
}
function meCapsHydrated() {
  return !!(sessionCacheKey() && sessionCacheKey() === ME_CAPS_KEY);
}
function resolveEditCap(meFlag, serverHint) {
  if (isViewingAsRole()) return !!meFlag;
  if (forcePermsOpen()) return true;
  if (meFlag) return true;
  if (serverHint === true) return true;
  if (!meCapsHydrated() && roleLooksLikeElevatedEdit(Session.current?.()?.role)) return true;
  if (!meCapsHydrated() && ME_ISS_ROLES.some((r) => roleLooksLikeElevatedEdit(r))) return true;
  try {
    if (!meCapsHydrated() && roleLooksLikeElevatedEdit(window.ISA?.AppSession?.resolveDisplayRole?.())) return true;
  } catch {
  }
  return false;
}
function canEditInstrucciones() {
  const caps = localMeCaps();
  return resolveEditCap(caps.canEditInstrucciones, ME_SERVER_INSTRUCCIONES_EDIT);
}
function canEditPromptsOperativos() {
  return resolveEditCap(localMeCaps().canEditPromptsOperativos);
}
function instruccionesPublishCap() {
  return canEditInstrucciones() ? INSTRUCCIONES_WRITE_CAP : null;
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
async function bootMeCaps() {
  return primeMeCaps(true);
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
function auditAuthor() {
  return String(Session.realUsername() || Session.username() || "").trim().toUpperCase();
}
function humanPermissionError(err, cap) {
  return window.ISAFront.humanPermissionError(err, cap, blockReason);
}
function handleApiError(err, cap) {
  window.ISAFront.handleApiError(err, cap, { blockReason, clearSession, toastWarning, toastError });
}
var ROLE_PRIORITY, INSTRUCCIONES_WRITE_CAP, OPEN_ME_CAPS, ME_CAP_KEYS, ME_CAPS, ME_CAPS_KEY, ME_ISS_ROLES, ME_LOGIN_ROLE, ME_CAPS_BOOTSTRAP_TS, ME_CAPS_INFLIGHT, ME_CAPS_RETRY_TIMER, ME_SERVER_INSTRUCCIONES_EDIT, ME_CAPS_FETCH_GUARD_MS, ME_CAPS_REENTRY_GUARD_MS, isLoggedIn, can, blockReason, clearSession;
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
    INSTRUCCIONES_WRITE_CAP = "patyia.instrucciones.publish";
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
async function fetchInstruccionesPaty() {
  const data = await fetchInstruccionesSystemConfig();
  setServerInstruccionesCanEdit(!!data.canEdit);
  return { rows: data.rows, canEdit: !!data.canEdit };
}
function publishInstruccionesPaty(sql) {
  if (!canEditInstrucciones()) {
    throw new Error(
      blockReason(INSTRUCCIONES_WRITE_CAP) || "Sin permiso para publicar instrucciones"
    );
  }
  return putInstruccionesPublish(sql);
}
async function upsertInstruccionPaty(payload) {
  if (!canEditInstrucciones()) {
    throw new Error(
      blockReason(INSTRUCCIONES_WRITE_CAP) || "Sin permiso para publicar instrucciones"
    );
  }
  return putInstruccionUpsert(payload);
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

// src/js/tools/promptsSql/usePromptsSqlTool.ts
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

// src/js/api/promptsSql.ts
var PATY_PROMPT_TIPOS = [
  "SALUDO_OTRO",
  "FUERA_DE_ALCANCE_TECNICO",
  "SOLICITUD_NO_PERMITIDA",
  "REQUIERE_CONTEXTO",
  "PASO_A_PASO",
  "INTERPRETACION_RESULTADO",
  "CONSULTA_NORMATIVA_NEGOCIO",
  "ASESORIA_PERSONALIZADA",
  "ERROR_TECNICO",
  "ERROR_CONFIGURACION",
  "ERROR_ACCESO",
  "ERROR_DIAN",
  "COMERCIAL"
];
var PATY_SYSTEM_INSTRUCTIONS = [
  {
    iinstruccion: "GENERAL",
    ninstruccion: "PROMPT_GENERAL",
    archivo: "PROMPT_GENERAL.txt",
    descripcion: "Prompt general de conversaci\xF3n Paty (PR_GENERAL)",
    defaultModel: "gpt-5-nano",
    kind: "system"
  },
  {
    iinstruccion: "TDCONSULTA",
    ninstruccion: "PROMPT_TDCONSULTA",
    archivo: "PROMPT_TDCONSULTA.txt",
    descripcion: "Clasificador tipo de consulta (PR_TIPO_CONSULTAS)",
    defaultModel: "gpt-4.1-nano",
    kind: "system"
  },
  {
    iinstruccion: "EXTRACTOR_CONSULTAS",
    ninstruccion: "PROMPT_EXTRACTOR_CONSULTAS",
    archivo: "PROMPT_EXTRACTOR_CONSULTAS.txt",
    descripcion: "Extractor de consultas \xFAtiles del usuario (PR_EXTRACTOR_CONSULTAS)",
    defaultModel: "gpt-4.1-nano",
    kind: "system"
  },
  {
    iinstruccion: "CLASIFICADOR_MODULO",
    ninstruccion: "PROMPT_CLASIFICADOR_MODULO",
    archivo: "PROMPT_CLASIFICADOR_MODULO.txt",
    descripcion: "Clasificador de m\xF3dulo ContaPyme (PR_CLASIFICADOR_MODULO)",
    defaultModel: "gpt-4.1-nano",
    kind: "system"
  }
];
var DEFAULT_JCONFIG = {
  provider: "openai",
  model: "gpt-5-nano",
  temperature: 0,
  top_p: 0.85
};
var INSTRUCTION_META_BY_KEY = (() => {
  const map = /* @__PURE__ */ new Map();
  for (const meta of PATY_SYSTEM_INSTRUCTIONS) {
    map.set(meta.iinstruccion, { ...meta, kind: "system" });
  }
  for (const tipo of PATY_PROMPT_TIPOS) {
    map.set(tipo, {
      iinstruccion: tipo,
      ninstruccion: `PROMPT_${tipo}`,
      archivo: `PROMPT_${tipo}.md`,
      descripcion: `Prompt espec\xEDfico para tipo de consulta ${tipo}`,
      defaultModel: DEFAULT_JCONFIG.model,
      kind: "tdconsulta"
    });
  }
  return map;
})();
function getInstructionCatalog() {
  return [...INSTRUCTION_META_BY_KEY.values()];
}
function allInstructionKeys(extraKeys = []) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const push = (k) => {
    const key = String(k ?? "").trim().toUpperCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };
  for (const meta of PATY_SYSTEM_INSTRUCTIONS) push(meta.iinstruccion);
  for (const tipo of PATY_PROMPT_TIPOS) push(tipo);
  const extras = [];
  for (const k of extraKeys) {
    const key = String(k ?? "").trim().toUpperCase();
    if (key && !seen.has(key)) extras.push(key);
  }
  extras.sort((a, b) => a.localeCompare(b));
  return [...out, ...extras];
}
function getInstructionMeta(iinstruccion) {
  const key = String(iinstruccion ?? "").trim().toUpperCase();
  if (!key) return null;
  const known = INSTRUCTION_META_BY_KEY.get(key);
  if (known) return known;
  return {
    iinstruccion: key,
    ninstruccion: `PROMPT_${key}`,
    archivo: `PROMPT_${key}.md`,
    descripcion: `Instrucci\xF3n ${key}`,
    defaultModel: DEFAULT_JCONFIG.model,
    kind: PATY_PROMPT_TIPOS.includes(key) ? "tdconsulta" : "unknown"
  };
}
function isTdConsultaInstruction(iinstruccion) {
  return getInstructionMeta(iinstruccion)?.kind === "tdconsulta";
}
function createPromptSlot(iinstruccion, patch = {}) {
  const meta = getInstructionMeta(iinstruccion);
  const model = patch.jconfig?.model || meta.defaultModel || DEFAULT_JCONFIG.model;
  return {
    archivo: patch.archivo || meta.archivo,
    tipo: meta.iinstruccion,
    iinstruccion: meta.iinstruccion,
    ninstruccion: meta.ninstruccion,
    kind: meta.kind,
    body: patch.body ?? "",
    source: patch.source ?? "plantilla",
    dirty: Boolean(patch.dirty),
    configDirty: Boolean(patch.configDirty),
    jconfig: patch.jconfig || { ...DEFAULT_JCONFIG, model },
    jconfigBaseline: patch.jconfigBaseline ?? null
  };
}
var PROMPT_FILE_RE = /^PROMPT_([A-Z0-9_]+)\.(md|txt)$/i;
function fileToTipo(name) {
  const m = String(name).trim().match(PROMPT_FILE_RE);
  if (!m) return null;
  const stem = m[1].toUpperCase();
  if (PATY_PROMPT_TIPOS.includes(stem)) return stem;
  if (INSTRUCTION_META_BY_KEY.has(stem)) return stem;
  return null;
}
function matchFilenameToIinstruccion(fileName) {
  const name = String(fileName ?? "").trim();
  const m = name.match(PROMPT_FILE_RE);
  if (!m) return [];
  const stem = m[1].toUpperCase();
  const matches = [];
  for (const meta of getInstructionCatalog()) {
    if (stem === meta.iinstruccion) matches.push(meta.iinstruccion);
    else if (stem === meta.ninstruccion) matches.push(meta.iinstruccion);
    else if (name.toUpperCase() === String(meta.archivo).toUpperCase()) matches.push(meta.iinstruccion);
  }
  return [...new Set(matches)];
}
function matchContentToIinstrucciones(content) {
  const text = String(content ?? "");
  if (!text.trim()) return [];
  const matches = [];
  for (const meta of getInstructionCatalog()) {
    const key = meta.iinstruccion;
    const ninst = meta.ninstruccion;
    const headerRe = new RegExp(`^#?\\s*iinstruccion\\s*:\\s*${key}\\s*$`, "im");
    const eqRe = new RegExp(`(?:^|\\n)\\s*iinstruccion\\s*=\\s*${key}\\s*(?:\\n|$)`, "i");
    const ninstRe = new RegExp(`^#?\\s*ninstruccion\\s*:\\s*${ninst}\\s*$`, "im");
    if (headerRe.test(text) || eqRe.test(text) || ninstRe.test(text)) matches.push(key);
  }
  return [...new Set(matches)];
}
function prepareFileImportRows(files) {
  return (files || []).map((f) => {
    const nameMatches = matchFilenameToIinstruccion(f.name);
    const contentMatches = matchContentToIinstrucciones(f.content);
    let suggested = "";
    let matchSource = "";
    if (nameMatches.length === 1 && (contentMatches.length === 0 || contentMatches.includes(nameMatches[0]))) {
      suggested = nameMatches[0];
      matchSource = contentMatches.length ? "filename+content" : "filename";
    } else if (nameMatches.length === 0 && contentMatches.length === 1) {
      suggested = contentMatches[0];
      matchSource = "content";
    } else if (nameMatches.length === 1 && contentMatches.length === 1 && nameMatches[0] === contentMatches[0]) {
      suggested = nameMatches[0];
      matchSource = "filename+content";
    }
    return {
      fileName: f.name,
      content: String(f.content ?? ""),
      suggested,
      matchSource,
      nameMatches,
      contentMatches,
      selected: suggested
    };
  });
}
function applyFileImportSelections(rows) {
  const updates = {};
  for (const row of rows || []) {
    const key = String(row.selected ?? "").trim().toUpperCase();
    if (!key) continue;
    updates[key] = {
      archivo: row.fileName,
      tipo: key,
      iinstruccion: key,
      body: String(row.content ?? "").trim(),
      source: "archivo",
      dirty: true
    };
  }
  return updates;
}
function sqlEscapeLiteral(text) {
  return `N'${String(text).replace(/'/g, "''")}'`;
}
function estimatePromptTokens(text) {
  const s = String(text ?? "");
  return s.trim() ? Math.ceil(s.length / 4) : 0;
}
function bodyMetrics(body) {
  const text = String(body ?? "");
  return { chars: text.length, tokens: estimatePromptTokens(text) };
}
function pickJconfigMeta(o) {
  const src = o && typeof o === "object" ? o : {};
  const meta = {};
  if (src.author != null && String(src.author).trim()) meta.author = String(src.author).trim();
  if (src.fmod != null && String(src.fmod).trim()) meta.fmod = String(src.fmod).trim();
  if (src.chars != null && Number.isFinite(Number(src.chars))) meta.chars = Number(src.chars);
  if (src.tokens != null && Number.isFinite(Number(src.tokens))) meta.tokens = Number(src.tokens);
  return meta;
}
var PATY_MODEL_OPTIONS = [
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-5-codex",
  "gpt-5-chat-latest",
  "gpt-5",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini"
];
function mergeModelOptions(...models) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const add = (id) => {
    const m = String(id ?? "").trim();
    if (!m || seen.has(m)) return;
    seen.add(m);
    out.push(m);
  };
  for (const id of PATY_MODEL_OPTIONS) add(id);
  for (const id of models) add(id);
  return out.sort((a, b) => a.localeCompare(b));
}
function parseJconfig(raw, fallbackModel) {
  const fb2 = String(fallbackModel || DEFAULT_JCONFIG.model).trim() || DEFAULT_JCONFIG.model;
  if (raw == null || !String(raw).trim()) {
    return { ...DEFAULT_JCONFIG, model: fb2 };
  }
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    const modelRaw = String(o.model ?? "").trim();
    return {
      provider: String(o.provider || DEFAULT_JCONFIG.provider),
      model: modelRaw || fb2,
      temperature: Number(o.temperature ?? DEFAULT_JCONFIG.temperature),
      top_p: Number(o.top_p ?? DEFAULT_JCONFIG.top_p),
      ...pickJconfigMeta(o)
    };
  } catch {
    return { ...DEFAULT_JCONFIG, model: fb2 };
  }
}
function serializeJconfig(jc) {
  const model = String(jc?.model ?? DEFAULT_JCONFIG.model).trim() || DEFAULT_JCONFIG.model;
  const out = {
    provider: jc?.provider || DEFAULT_JCONFIG.provider,
    model,
    temperature: Number(jc?.temperature ?? DEFAULT_JCONFIG.temperature),
    top_p: Number(jc?.top_p ?? DEFAULT_JCONFIG.top_p),
    ...pickJconfigMeta(jc)
  };
  return JSON.stringify(out);
}
function syncJconfigMetrics(jc, body) {
  const { chars, tokens } = bodyMetrics(body);
  return { ...jc, chars, tokens };
}
function enrichJconfigForSave(jc, { body, author } = {}) {
  const { chars, tokens } = bodyMetrics(body);
  const next = {
    ...jc,
    chars,
    tokens,
    fmod: (/* @__PURE__ */ new Date()).toISOString()
  };
  const who = String(author ?? jc?.author ?? "").trim();
  if (who) next.author = who;
  return next;
}
function mapEntryToInstruccion(entry) {
  const explicit = String(entry.iinstruccion ?? entry.tipo ?? "").trim().toUpperCase();
  const fromName = matchFilenameToIinstruccion(entry.archivo);
  const iinstruccion = explicit || (fromName.length === 1 ? fromName[0] : null) || fileToTipo(entry.archivo);
  const meta = iinstruccion ? getInstructionMeta(iinstruccion) : null;
  const jconfig = entry.jconfig || parseJconfig(entry.jconfigRaw, meta?.defaultModel);
  const known = Boolean(meta && meta.kind !== "unknown");
  return {
    archivo: entry.archivo,
    tipo: iinstruccion,
    iinstruccion,
    ninstruccion: meta?.ninstruccion ?? (iinstruccion ? `PROMPT_${iinstruccion}` : null),
    nitdconsulta: isTdConsultaInstruction(iinstruccion) ? iinstruccion : null,
    chars: (entry.body || "").length,
    known,
    kind: meta?.kind ?? "unknown",
    source: entry.source,
    body: entry.body,
    jconfig,
    status: !iinstruccion ? "sin_mapeo" : known ? "ok" : "tipo_desconocido"
  };
}
function buildTdConsultaLinkSql(iinstruccion) {
  return `
MERGE TDCONSULTAXINSTRUCCION AS t
USING (
	SELECT c.itdconsulta, N'${iinstruccion}' AS iinstruccion, 1 AS orden
	FROM TDCONSULTA c
	WHERE c.itdconsulta = N'${iinstruccion}'
) AS s
ON t.itdconsulta = s.itdconsulta AND t.iinstruccion = s.iinstruccion
WHEN MATCHED THEN UPDATE SET t.orden = s.orden
WHEN NOT MATCHED THEN INSERT (itdconsulta, iinstruccion, orden)
	VALUES (s.itdconsulta, s.iinstruccion, s.orden);`;
}
function buildMergeSql(rows) {
  const valid = rows.filter((r) => r.iinstruccion && r.body);
  if (!valid.length) return { sql: "", rows: valid, error: "No hay instrucciones v\xE1lidas para guardar." };
  const head = `-- =====================================================================
-- Carga de instrucciones PatyIA (generado por isa-patyia)
-- Fuente: PROMPT_* (.md / .txt)
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;
`;
  const stmts = valid.map((r) => {
    const key = r.iinstruccion;
    const meta = getInstructionMeta(key);
    const ninst = r.ninstruccion || meta.ninstruccion;
    const desc = meta.descripcion || `Instrucci\xF3n ${key}`;
    const jc = r.jconfig || parseJconfig(null, meta.defaultModel);
    const jconfigJson = sqlEscapeLiteral(serializeJconfig(jc));
    const tdLink = isTdConsultaInstruction(key) ? buildTdConsultaLinkSql(key) : "";
    return `
-- ----- ${key} (${r.archivo}) -----
MERGE INSTRUCCION AS t
USING (VALUES (
	N'${key}',
	N'${ninst}',
	${sqlEscapeLiteral(r.body)},
	N'${desc.replace(/'/g, "''")}',
	N'1.0',
	1,
	${jconfigJson}
)) AS s (iinstruccion, ninstruccion, instruccion, descripcion, version, bactivo, jconfig)
ON t.iinstruccion = s.iinstruccion
WHEN MATCHED THEN UPDATE SET
	t.ninstruccion = s.ninstruccion,
	t.instruccion  = s.instruccion,
	t.descripcion  = s.descripcion,
	t.version      = s.version,
	t.bactivo      = s.bactivo,
	t.jconfig      = s.jconfig
WHEN NOT MATCHED THEN INSERT (iinstruccion, ninstruccion, instruccion, descripcion, version, bactivo, jconfig, fhini)
	VALUES (s.iinstruccion, s.ninstruccion, s.instruccion, s.descripcion, s.version, s.bactivo, s.jconfig, SYSUTCDATETIME());
${tdLink}
`;
  }).join("\n");
  const tail = `
COMMIT;

SELECT i.iinstruccion, i.ninstruccion, i.version, i.jconfig, LEN(i.instruccion) AS len_instruccion
FROM INSTRUCCION i
WHERE i.iinstruccion IN (${valid.map((r) => `N'${r.iinstruccion}'`).join(", ")})
ORDER BY i.iinstruccion;
`;
  return { sql: head + stmts + tail, rows: valid, error: null };
}
function analyzeFromEntries(entries) {
  const mapped = (entries || []).map((e) => mapEntryToInstruccion({
    archivo: e.archivo,
    body: e.body,
    source: e.source || "editor",
    iinstruccion: e.iinstruccion || e.tipo,
    jconfig: e.jconfig,
    jconfigRaw: e.jconfigRaw
  }));
  const mssql = buildMergeSql(mapped);
  return {
    mapped,
    sqlMssql: mssql.sql,
    validRows: mssql.rows,
    error: mssql.error
  };
}
function emptyPromptState() {
  const out = {};
  for (const key of allInstructionKeys()) {
    out[key] = createPromptSlot(key);
  }
  return out;
}

// src/js/api/labApi.ts
init_apiClient();

// src/js/tools/promptsSql/usePromptsSqlTool.ts
init_sessionApi();
init_platform();

// src/js/tools/promptsSql/helpers.ts
init_platform();
init_platform();
init_sessionApi();
var { createElement, Fragment } = getReact();
function isDraftPrompt(p) {
  if (!p) return false;
  return p.dirty || p.source === "url" || p.source === "editor" || p.source === "archivo";
}
function jconfigEqual(a, b) {
  if (!a || !b) return false;
  return a.model === b.model && Number(a.temperature) === Number(b.temperature) && Number(a.top_p) === Number(b.top_p);
}
function isConfigDirty(p) {
  if (!p?.configDirty) return false;
  if (!p.jconfigBaseline) return true;
  return !jconfigEqual(p.jconfig, p.jconfigBaseline);
}
function hasPendingChanges(p) {
  return isDraftPrompt(p) || isConfigDirty(p);
}
function readFilesAsText(fileList) {
  return Promise.all(
    [...fileList].map(async (f) => ({
      name: f.name,
      content: await f.text()
    }))
  );
}
function draftBodiesFromPrompts(prompts) {
  const bodies = {};
  for (const [tipo, p] of Object.entries(prompts)) {
    if (isDraftPrompt(p) && p?.body?.trim()) bodies[tipo] = p.body;
  }
  return bodies;
}
function urlDraftTipoSet(bootPrompts) {
  const bodies = bootPrompts?.bodies || {};
  const listed = Array.isArray(bootPrompts?.draftTipos) ? bootPrompts.draftTipos.map((t) => String(t).toUpperCase()).filter(Boolean) : Object.keys(bodies).map((t) => String(t).toUpperCase());
  return new Set(listed);
}
function ensurePublishCap(onNeedLogin) {
  if (forcePermsOpen() && !isViewingAsRole() && isLoggedIn()) return true;
  const cap = instruccionesPublishCap();
  if (cap) return true;
  const reason = "Sin permiso para publicar instrucciones";
  toastWarning(reason);
  if (!isLoggedIn()) onNeedLogin?.();
  return false;
}

// src/js/core/promptVariables.ts
var MALFORMED_PROMPT_VAR_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}(?!\})/g;
var INSTRUCCION_TIPO_SLOT_RES = [/\{\{\s*instruccion_tipo\s*\}\}/i, /\{\{\s*instrucion_tipo\s*\}\}/i];
function repairPromptVarBraces(text) {
  return String(text ?? "").replace(MALFORMED_PROMPT_VAR_PATTERN, (_m, name) => `{{${name}}}`);
}
function hasInstruccionTipoSlot(text) {
  return INSTRUCCION_TIPO_SLOT_RES.some((re) => re.test(String(text ?? "")));
}
function preparePromptBodyForSave(text) {
  return repairPromptVarBraces(String(text ?? "").trim());
}

// src/js/tools/promptsSql/cloudRows.ts
function buildInitialPromptState(bootPrompts, urlBodies) {
  const base = emptyPromptState();
  for (const [tipo, body] of Object.entries(urlBodies)) {
    if (!urlDraftTipoSet(bootPrompts).has(String(tipo).toUpperCase())) continue;
    const key = String(tipo).toUpperCase();
    if (!base[key] && !String(body).trim()) continue;
    if (!base[key]) base[key] = createPromptSlot(key);
    if (!String(body).trim()) continue;
    base[key] = { ...base[key], body: String(body), dirty: true, source: "url" };
  }
  return base;
}
function mergeCloudRows(prev, rows, { onlyTipo = null, onlyTipos = null, ignoreUrl = false } = {}, { urlBodies, urlDraftTipos }) {
  const scope = onlyTipos?.length ? new Set(onlyTipos.map((t) => String(t).toUpperCase())) : onlyTipo ? /* @__PURE__ */ new Set([String(onlyTipo).toUpperCase()]) : null;
  const unknownKeys = [];
  const next = { ...prev };
  const touched = /* @__PURE__ */ new Set();
  for (const row of rows) {
    const tipo = String(rowVal(row, "IINSTRUCCION") ?? "").trim().toUpperCase();
    if (!tipo) continue;
    if (!next[tipo]) {
      unknownKeys.push(tipo);
      next[tipo] = createPromptSlot(tipo);
    }
    const rawBody = String(rowVal(row, "INSTRUCCION") ?? rowVal(row, "instruccion") ?? "").trim();
    const body = preparePromptBodyForSave(rawBody);
    const bodyRepaired = Boolean(rawBody && body !== rawBody);
    const rawJconfig = rowVal(row, "JCONFIG") ?? rowVal(row, "jconfig");
    const jconfig = syncJconfigMetrics(
      rawJconfig && typeof rawJconfig === "object" && !Array.isArray(rawJconfig) ? rawJconfig : parseJconfig(rawJconfig),
      body
    );
    if (scope && !scope.has(tipo)) continue;
    touched.add(tipo);
    const urlBody = ignoreUrl ? "" : urlBodies[tipo]?.trim();
    const urlIsDraft = !ignoreUrl && urlDraftTipos.has(tipo) && Boolean(urlBody);
    const basePatch = { jconfig, jconfigBaseline: { ...jconfig }, configDirty: false };
    if (urlIsDraft) {
      if (body && urlBody === body) {
        next[tipo] = { ...next[tipo], ...basePatch, body, dirty: bodyRepaired, source: "bd" };
      } else {
        next[tipo] = { ...next[tipo], ...basePatch, body: urlBody, dirty: true, source: "url" };
      }
    } else {
      next[tipo] = {
        ...next[tipo],
        ...basePatch,
        ...body ? { body, dirty: bodyRepaired, source: "bd" } : {}
      };
    }
  }
  if (ignoreUrl && scope) {
    for (const tipo of scope) {
      if (!next[tipo] || touched.has(tipo)) continue;
      next[tipo] = { ...next[tipo], body: "", dirty: false, source: "bd" };
    }
  }
  return { next, unknownKeys };
}

// src/js/tools/promptsSql/promptActions.ts
init_sessionApi();
init_systemConfigApi();
init_platform();
async function discardAllPrompts({
  instruccionKeys,
  prompts,
  applyCloudRows,
  clearUrlBodies,
  setActionBusy,
  setLoadErr
}) {
  const toReset = instruccionKeys.filter((t) => hasPendingChanges(prompts[t]));
  if (!toReset.length) {
    toastInfo("No hay cambios locales que descartar");
    return;
  }
  setActionBusy(true);
  setLoadErr("");
  try {
    const { rows } = await fetchInstruccionesPaty();
    applyCloudRows(rows, { onlyTipos: toReset, ignoreUrl: true });
    clearUrlBodies(toReset);
    toastInfo(`${toReset.length} instrucci\xF3n(es) restaurada(s) desde la base`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setLoadErr(msg);
    toastError(msg);
  } finally {
    setActionBusy(false);
  }
}
async function saveAllPrompts({
  pendingTipos,
  prompts,
  onNeedLogin,
  applyCloudRows,
  clearUrlBodies,
  setActionBusy,
  setLoadErr
}) {
  if (!pendingTipos.length) {
    toastWarning("No hay cambios pendientes para guardar");
    return;
  }
  if (!ensurePublishCap(onNeedLogin)) return;
  const author = auditAuthor();
  const entries = pendingTipos.map((t) => ({
    archivo: prompts[t].archivo,
    iinstruccion: t,
    tipo: t,
    body: prompts[t].body || "",
    source: prompts[t].source,
    jconfig: enrichJconfigForSave(prompts[t].jconfig, {
      body: prompts[t].body,
      author
    })
  }));
  const { sqlMssql, error } = analyzeFromEntries(entries);
  if (error || !sqlMssql?.trim()) {
    toastError(error || "No se pudo generar SQL");
    return;
  }
  setActionBusy(true);
  setLoadErr("");
  try {
    await publishInstruccionesPaty(sqlMssql);
    const savedTipos = [...pendingTipos];
    clearUrlBodies(savedTipos);
    const { rows } = await fetchInstruccionesPaty();
    applyCloudRows(rows, { onlyTipos: savedTipos, ignoreUrl: true });
    toastSuccess(`${savedTipos.length} instrucci\xF3n(es) guardada(s) en Paty`);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = humanizeIssAuthMessage(raw);
    setLoadErr(msg);
    if (e?.code === "FORBIDDEN" || e?.code === "NO_SESSION") {
      handleApiError(e, INSTRUCCIONES_WRITE_CAP);
    } else if (/permiso|autoriz|403|503|verify-access|SEG|JWT/i.test(msg)) {
      toastWarning(humanPermissionError(e, INSTRUCCIONES_WRITE_CAP) || msg);
    } else {
      toastError(msg);
    }
  } finally {
    setActionBusy(false);
  }
}
async function saveOnePrompt({
  tipo,
  body,
  prompts,
  editBlockReason,
  onNeedLogin,
  applyCloudRows,
  clearUrlBodies,
  setActionBusy,
  setLoadErr
}) {
  const key = String(tipo ?? "").trim().toUpperCase();
  const text = preparePromptBodyForSave(body);
  if (!key) throw new Error("Instrucci\xF3n no v\xE1lida");
  if (!text) throw new Error("El contenido no puede estar vac\xEDo");
  if (key === "GENERAL" && !hasInstruccionTipoSlot(text)) {
    throw new Error("El prompt GENERAL debe incluir {{instruccion_tipo}} con ambas llaves de cierre.");
  }
  if (!ensurePublishCap(onNeedLogin)) {
    throw new Error(editBlockReason || "Sin permiso para guardar en Paty");
  }
  const author = auditAuthor();
  const slot = prompts[key];
  const jconfig = enrichJconfigForSave(slot?.jconfig, { body: text, author });
  setActionBusy(true);
  setLoadErr("");
  try {
    await upsertInstruccionPaty({
      iinstruccion: key,
      instruccion: text,
      jconfig,
      author
    });
    clearUrlBodies([key]);
    const { rows } = await fetchInstruccionesPaty();
    applyCloudRows(rows, { onlyTipos: [key], ignoreUrl: true });
    toastSuccess(`${key.replace(/_/g, " ")} guardada en Paty`);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = humanizeIssAuthMessage(raw);
    setLoadErr(msg);
    if (e?.code === "FORBIDDEN" || e?.code === "NO_SESSION") {
      handleApiError(e, INSTRUCCIONES_WRITE_CAP);
    } else if (/permiso|autoriz|403|503|verify-access|SEG|JWT/i.test(msg)) {
      toastWarning(humanPermissionError(e, INSTRUCCIONES_WRITE_CAP) || msg);
    } else {
      toastError(msg);
    }
    throw e;
  } finally {
    setActionBusy(false);
  }
}
async function applyPromptFiles(fileList, setImportDlg) {
  const files = await readFilesAsText(fileList);
  if (!files.length) return;
  const rows = prepareFileImportRows(files).filter((r) => /^PROMPT_/i.test(r.fileName));
  if (!rows.length) {
    toastWarning("Ning\xFAn PROMPT_*.md / PROMPT_*.txt reconocido en los archivos");
    return;
  }
  setImportDlg({ open: true, rows });
}
function confirmPromptFileImport(importRows, instruccionKeys, setPrompts, setActiveTab, setImportDlg) {
  const updates = applyFileImportSelections(importRows);
  const keys = Object.keys(updates);
  if (!keys.length) {
    toastWarning("Selecciona al menos una instrucci\xF3n destino");
    return;
  }
  setPrompts((prev) => {
    const next = { ...prev };
    for (const [key, data] of Object.entries(updates)) {
      if (!next[key]) next[key] = createPromptSlot(key);
      next[key] = {
        ...next[key],
        ...data,
        jconfig: syncJconfigMetrics(next[key].jconfig, data.body)
      };
    }
    return next;
  });
  const first = keys[0];
  const idx = instruccionKeys.indexOf(first);
  if (idx >= 0) setActiveTab(idx);
  setImportDlg({ open: false, rows: [] });
  toastSuccess(`${keys.length} instrucci\xF3n(es) importada(s)`);
}
async function confirmResetPromptConfig(tipo, prompts, resetConfigToDefaults) {
  const jc = prompts[tipo]?.jconfig || parseJconfig(null);
  const d = DEFAULT_JCONFIG;
  const ok = await requestConfirm({
    title: "Restablecer configuraci\xF3n",
    message: [
      `\xBFRestablecer modelo, temperatura y top_p de ${tipo.replace(/_/g, " ")}?`,
      "",
      `Modelo: ${jc.model ?? d.model} \u2192 ${d.model}`,
      `Temp: ${jc.temperature ?? d.temperature} \u2192 ${d.temperature}`,
      `Top_p: ${jc.top_p ?? d.top_p} \u2192 ${d.top_p}`
    ].join("\n"),
    confirmLabel: "Restablecer",
    cancelLabel: "Cancelar"
  });
  if (ok) resetConfigToDefaults(tipo);
}
function resetPromptConfigToDefaults(tipo, setPrompts) {
  const defaults = { ...DEFAULT_JCONFIG };
  setPrompts((prev) => {
    const current = prev[tipo];
    if (!current) return prev;
    const nextJconfig = syncJconfigMetrics(
      { ...defaults, author: current.jconfig?.author, fmod: current.jconfig?.fmod },
      current.body
    );
    if (jconfigEqual(current.jconfig, nextJconfig)) return prev;
    const baseline = current.jconfigBaseline;
    return {
      ...prev,
      [tipo]: {
        ...current,
        jconfig: nextJconfig,
        configDirty: baseline ? !jconfigEqual(nextJconfig, baseline) : false
      }
    };
  });
}

// src/js/tools/promptsSql/usePromptsSqlTool.ts
var { useState, useEffect, useCallback, useMemo, useRef } = getReact();
var EMPTY_BODIES = Object.freeze({});
function usePromptsSqlTool({ bootPrompts = {}, onNeedLogin }) {
  const [authTick, setAuthTick] = useState(0);
  const [instruccionesCanEdit, setInstruccionesCanEdit] = useState(false);
  useEffect(() => {
    const onAuth = () => setAuthTick((n) => n + 1);
    window.addEventListener("isa-patyia:auth", onAuth);
    window.addEventListener(Session.EVENT, onAuth);
    window.addEventListener("patyia-apptools:caps-changed", onAuth);
    if (Session.isLoggedIn()) {
      void bootMeCaps(true);
      Session.refreshProfile().finally(onAuth);
    }
    return () => {
      window.removeEventListener("isa-patyia:auth", onAuth);
      window.removeEventListener(Session.EVENT, onAuth);
      window.removeEventListener("patyia-apptools:caps-changed", onAuth);
    };
  }, []);
  const canPublish = useMemo(() => {
    if (isViewingAsRole()) {
      return canEditInstrucciones() || canEditPromptsOperativos();
    }
    if (forcePermsOpen()) return true;
    return instruccionesCanEdit || canEditInstrucciones() || canEditPromptsOperativos();
  }, [authTick, instruccionesCanEdit]);
  const loggedIn = useMemo(() => isLoggedIn(), [authTick]);
  const canEdit = canPublish;
  const editBlockReason = useMemo(() => {
    if (canEdit) return "";
    if (!loggedIn) return "Inicia sesi\xF3n para editar instrucciones";
    return "Sin permiso para editar instrucciones";
  }, [authTick, canEdit, loggedIn]);
  const saveTitle = useMemo(() => {
    if (canPublish) return "Guardar instrucciones y configuraci\xF3n en Paty (MSSQL)";
    return "Sin permiso para guardar en Paty";
  }, [authTick, canPublish]);
  const importTitle = useMemo(() => {
    if (canPublish) return "Importar archivos PROMPT_*.md / .txt";
    if (!loggedIn) return "Inicia sesi\xF3n para importar instrucciones";
    return "Sin permiso para importar instrucciones";
  }, [authTick, canPublish, loggedIn]);
  const [extraInstructionKeys, setExtraInstructionKeys] = useState([]);
  const instruccionKeys = useMemo(
    () => allInstructionKeys(extraInstructionKeys),
    [extraInstructionKeys]
  );
  const [importDlg, setImportDlg] = useState({ open: false, rows: [] });
  const urlBodies = bootPrompts.bodies ?? EMPTY_BODIES;
  const urlDraftTipos = useMemo(() => urlDraftTipoSet(bootPrompts), [bootPrompts]);
  const [prompts, setPrompts] = useState(() => buildInitialPromptState(bootPrompts, urlBodies));
  const [activeTab, setActiveTab] = useState(
    Number.isInteger(bootPrompts.activeTab) ? bootPrompts.activeTab : 0
  );
  const [jconfigDlg, setJconfigDlg] = useState({ open: false, tipo: null });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [mapped, setMapped] = useState([]);
  const [loadBusy, setLoadBusy] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [envRev, setEnvRev] = useState(0);
  const urlSyncRef = useRef(null);
  const applyCloudRows = useCallback((rows, options = {}) => {
    const unknownKeys = [];
    setPrompts((prev) => {
      const merged = mergeCloudRows(prev, rows, options, { urlBodies, urlDraftTipos });
      unknownKeys.push(...merged.unknownKeys);
      return merged.next;
    });
    if (unknownKeys.length) {
      setExtraInstructionKeys((prev) => {
        const merged = /* @__PURE__ */ new Set([...prev, ...unknownKeys]);
        return [...merged].sort((a, b) => a.localeCompare(b));
      });
    }
  }, [urlBodies, urlDraftTipos]);
  const clearUrlBodies = useCallback((instruccionKeysToClear) => {
    const snap = getSnapshot();
    const bodies = { ...snap.prompts?.bodies || {} };
    const draftTipos = (snap.prompts?.draftTipos || []).map((t) => String(t).toUpperCase()).filter((t) => !instruccionKeysToClear.map((x) => String(x).toUpperCase()).includes(t));
    for (const t of instruccionKeysToClear) delete bodies[t];
    mergePartial({ prompts: { activeTab, bodies, draftTipos } });
  }, [activeTab]);
  useEffect(() => {
    const onTarget = () => setEnvRev((n) => n + 1);
    window.addEventListener("jeff:gateway-target", onTarget);
    window.addEventListener("patyia-apptools:lab-target", onTarget);
    return () => {
      window.removeEventListener("jeff:gateway-target", onTarget);
      window.removeEventListener("patyia-apptools:lab-target", onTarget);
    };
  }, []);
  const activeTipo = instruccionKeys[activeTab] || instruccionKeys[0];
  const activePrompt = prompts[activeTipo];
  const recompute = useCallback((state) => {
    const entries = Object.values(state).filter((p) => p.body?.trim() || isConfigDirty(p));
    const { mapped: m } = analyzeFromEntries(entries);
    setMapped(m);
  }, []);
  useEffect(() => {
    recompute(prompts);
  }, [prompts, recompute]);
  const applyCloudRowsRef = useRef(applyCloudRows);
  applyCloudRowsRef.current = applyCloudRows;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadBusy(true);
      setLoadErr("");
      try {
        const { rows, canEdit: canEdit2 } = await fetchInstruccionesPaty();
        if (cancelled) return;
        setInstruccionesCanEdit(!!canEdit2);
        applyCloudRowsRef.current(rows);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setLoadErr(msg);
          toastWarning(`Carga de instrucciones: ${msg}`);
        }
      } finally {
        if (!cancelled) setLoadBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [envRev]);
  const pendingTipos = useMemo(
    () => instruccionKeys.filter((t) => {
      const p = prompts[t];
      if (!p?.body?.trim()) return false;
      return isDraftPrompt(p) || isConfigDirty(p);
    }),
    [prompts, instruccionKeys]
  );
  const hasLocalChanges = useMemo(
    () => instruccionKeys.some((t) => hasPendingChanges(prompts[t])),
    [prompts, instruccionKeys]
  );
  const modelSelectOptions = useMemo(
    () => mergeModelOptions(
      ...instruccionKeys.map((t) => prompts[t]?.jconfig?.model),
      ...instruccionKeys.map((t) => prompts[t]?.jconfigBaseline?.model)
    ),
    [prompts, instruccionKeys]
  );
  const filledCount = useMemo(
    () => instruccionKeys.filter((k) => prompts[k]?.body?.trim()).length,
    [prompts, instruccionKeys]
  );
  useEffect(() => {
    mergePartial({ prompts: { activeTab } });
  }, [activeTab]);
  useEffect(() => {
    if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    urlSyncRef.current = setTimeout(() => {
      const bodies = draftBodiesFromPrompts(prompts);
      mergePartial({
        prompts: { activeTab, bodies, draftTipos: Object.keys(bodies) }
      });
    }, 500);
    return () => {
      if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    };
  }, [prompts, activeTab]);
  const discardAll = useCallback(
    () => discardAllPrompts({
      instruccionKeys,
      prompts,
      applyCloudRows,
      clearUrlBodies,
      setActionBusy,
      setLoadErr
    }),
    [applyCloudRows, clearUrlBodies, prompts, instruccionKeys]
  );
  const saveAll = useCallback(
    () => saveAllPrompts({
      pendingTipos,
      prompts,
      onNeedLogin,
      applyCloudRows,
      clearUrlBodies,
      setActionBusy,
      setLoadErr
    }),
    [applyCloudRows, clearUrlBodies, pendingTipos, onNeedLogin, prompts]
  );
  const saveOneInstruction = useCallback(
    (tipo, body) => saveOnePrompt({
      tipo,
      body,
      prompts,
      editBlockReason,
      onNeedLogin,
      applyCloudRows,
      clearUrlBodies,
      setActionBusy,
      setLoadErr
    }),
    [applyCloudRows, clearUrlBodies, editBlockReason, onNeedLogin, prompts]
  );
  const onImportRowChange = useCallback((idx, selected) => {
    setImportDlg((d) => {
      const rows = d.rows.map((row, i) => i === idx ? { ...row, selected } : row);
      return { ...d, rows };
    });
  }, []);
  const confirmFileImport = useCallback(
    () => confirmPromptFileImport(importDlg.rows, instruccionKeys, setPrompts, setActiveTab, setImportDlg),
    [importDlg.rows, instruccionKeys]
  );
  const applyFiles = useCallback(
    (fileList) => {
      if (!ensurePublishCap(onNeedLogin)) return Promise.resolve();
      return applyPromptFiles(fileList, setImportDlg);
    },
    [onNeedLogin]
  );
  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    await applyFiles(dt.files);
  }, [applyFiles]);
  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const onDragLeave = useCallback((e) => {
    const zone = e.currentTarget;
    const next = e.relatedTarget;
    if (!next || !zone.contains(next)) setDragOver(false);
  }, []);
  const onDragOverZone = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);
  const onFileInput = useCallback(async (e) => {
    if (e.target.files?.length) await applyFiles(e.target.files);
    e.target.value = "";
  }, [applyFiles]);
  const updateBody = useCallback((tipo, body) => {
    setPrompts((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        body,
        dirty: true,
        source: "editor",
        jconfig: syncJconfigMetrics(prev[tipo].jconfig, body)
      }
    }));
  }, []);
  const updateConfig = useCallback((tipo, patch) => {
    setPrompts((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        jconfig: { ...prev[tipo].jconfig, ...patch },
        configDirty: true
      }
    }));
  }, []);
  const resetConfigToDefaults = useCallback(
    (tipo) => resetPromptConfigToDefaults(tipo, setPrompts),
    []
  );
  const confirmResetConfig = useCallback(
    (tipo) => confirmResetPromptConfig(tipo, prompts, resetConfigToDefaults),
    [prompts, resetConfigToDefaults]
  );
  return {
    canPublish,
    loggedIn,
    canEdit,
    editBlockReason,
    saveTitle,
    importTitle,
    instruccionKeys,
    importDlg,
    setImportDlg,
    onImportRowChange,
    confirmFileImport,
    prompts,
    activeTab,
    setActiveTab,
    jconfigDlg,
    setJconfigDlg,
    dragOver,
    fileInputRef,
    onDragEnter,
    onDragLeave,
    onDragOverZone,
    onDrop,
    onFileInput,
    mapped,
    loadBusy,
    loadErr,
    actionBusy,
    activeTipo,
    activePrompt,
    pendingTipos,
    hasLocalChanges,
    modelSelectOptions,
    filledCount,
    discardAll,
    saveAll,
    saveOneInstruction,
    updateBody,
    updateConfig,
    confirmResetConfig
  };
}
export {
  usePromptsSqlTool
};
