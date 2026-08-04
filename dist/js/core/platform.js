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
function setIssTarget(target) {
  try {
    localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, target);
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent("patyia-apptools:iss-target-changed", { detail: { target } }));
  } catch {
  }
  try {
    window.dispatchEvent(new Event("patyia-apptools:caps-changed"));
  } catch {
  }
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
function migrateIssLocalFromGatewayFlag() {
  try {
    const legacy = localStorage.getItem(PATYIA_ISS_LOCAL_LS_KEY);
    const hasNew = localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY) != null;
    if (!hasNew && legacy === "1") {
      localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, "local");
    }
    if (localStorage.getItem(GATEWAY_LS_KEY) === "1") {
      if (localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY) == null) {
        localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, "local");
      }
      localStorage.setItem(GATEWAY_LS_KEY, "0");
    }
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
var ORCH_ONLINE, PATYIA_ISS_URL, PATYIA_ISS_PROD_URL, PATYIA_ISS_LOCAL, PATYIA_ISS_LOCAL_API, PATYIA_ISS_PROD_API, PATYIA_ISS_STAGING_API, PATYIA_ISS_TARGET_LS_KEY, PATYIA_ISS_LOCAL_LS_KEY, GATEWAY_LS_KEY, AVATAR_BG_PALETTE;
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
    PATYIA_ISS_LOCAL_LS_KEY = "patyia-apptools:iss-local";
    GATEWAY_LS_KEY = "jeff:gateway-local";
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
function realRolesAllowViewAs(roles) {
  return (roles ?? []).some((r) => isDevBranchRole(r));
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

// src/js/api/sysValuesCopy.ts
function prodBase() {
  return PATYIA_ISS_PROD_URL.replace(/\/$/, "");
}
async function getFromCurrent(path) {
  try {
    const res = await capFetch(path, { method: "GET" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, data, error: `GET ${path} \u2192 ${res.status} ${res.statusText}` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}
async function putToProd(path, body) {
  const url = `${prodBase()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const sess = window.ISA?.Session;
    const headers = { "Content-Type": "application/json" };
    if (sess?.authHeader) {
      const ah = sess.authHeader();
      if (ah && typeof ah === "object") Object.assign(headers, ah);
    }
    if (sess?.appHeader) {
      const ap = sess.appHeader();
      if (ap && typeof ap === "object") Object.assign(headers, ap);
    }
    const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `PUT ${path} \u2192 ${res.status} ${res.statusText}${text ? ` (${text.slice(0, 200)})` : ""}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
function instruccionesGetToPutList(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    iinstruccion: Number(r?.iinstruccion ?? r?.IINSTRUCCION),
    instruccion: String(r?.instruccion ?? r?.INSTRUCCION ?? ""),
    jconfig: r?.jconfig ?? r?.JCONFIG,
    ninstruccion: r?.ninstruccion ?? r?.NINSTRUCCION,
    descripcion: r?.descripcion ?? r?.DESCRIPCION,
    author: r?.author ?? r?.AUTHOR
  })).filter((x) => Number.isInteger(x.iinstruccion) && x.iinstruccion > 0);
}
async function copySysValuesToProduction() {
  const steps = [];
  for (const ep of ENDPOINTS) {
    toastInfo(`Copiando ${ep.key}\u2026`, 2e3);
    const g = await getFromCurrent(ep.path);
    if (!g.ok) {
      steps.push({ name: ep.key, ok: false, error: g.error || "GET fall\xF3" });
      toastError(`Fall\xF3 GET ${ep.key}: ${g.error}`);
      return { ok: false, steps, abortedAt: ep.key };
    }
    let body = g.data;
    if (ep.isInstrucciones) {
      const rows = instruccionesGetToPutList(g.data?.rows);
      let allOk = true;
      for (const row of rows) {
        const r = await putToProd(ep.path, row);
        if (!r.ok) {
          allOk = false;
          steps.push({ name: `${ep.key}#${row.iinstruccion}`, ok: false, error: r.error });
        }
      }
      steps.push({ name: ep.key, ok: allOk });
      if (!allOk) {
        toastError(`Fall\xF3 PUT ${ep.key}`);
        return { ok: false, steps, abortedAt: ep.key };
      }
    } else {
      const payload = g.data?.value !== void 0 ? g.data.value : g.data;
      const r = await putToProd(ep.path, payload);
      steps.push({ name: ep.key, ok: r.ok, error: r.error });
      if (!r.ok) {
        toastError(`Fall\xF3 PUT ${ep.key}: ${r.error}`);
        return { ok: false, steps, abortedAt: ep.key };
      }
    }
  }
  toastSuccess("sys_values copiados a producci\xF3n", 4e3);
  return { ok: true, steps };
}
var ENDPOINTS;
var init_sysValuesCopy = __esm({
  "src/js/api/sysValuesCopy.ts"() {
    init_apiClient();
    init_platform();
    init_patyia();
    ENDPOINTS = [
      { key: "config/conversacion", path: "/api/system/config/conversacion" },
      { key: "openai", path: "/api/system/openai" },
      { key: "instrucciones", path: "/api/system/instrucciones", isInstrucciones: true },
      { key: "prompts_operativos", path: "/api/system/prompts-operativos" }
    ];
  }
});

// src/js/components/CopySysValuesModal.jsx
function openCopyModal(result) {
  closeCopyModal();
  const container = document.createElement("div");
  container.id = "patyia-copy-modal-container";
  container.style.cssText = "position:fixed;inset:0;z-index:2000;pointer-events:none";
  document.body.appendChild(container);
  const root = window.ISAFront?.getReactDOM?.() ?? window.ReactDOM;
  if (!root?.createRoot) {
    console.warn("CopySysValuesModal: no ReactDOM.createRoot");
    return;
  }
  const reactRoot = root.createRoot(container);
  const handleClose = () => closeCopyModal();
  const node = React.createElement(Wrapper, { result, onClose: handleClose });
  reactRoot.render(node);
  openDialog = {
    close: () => {
      try {
        reactRoot.unmount();
      } catch {
      }
      try {
        container.remove();
      } catch {
      }
    }
  };
}
function closeCopyModal() {
  if (openDialog) {
    openDialog.close();
    openDialog = null;
  }
}
function Wrapper({ result, onClose }) {
  return React.createElement(
    "div",
    { style: { pointerEvents: "auto" } },
    React.createElement(CopyModal, { result, onClose })
  );
}
function CopyModal({ result, onClose }) {
  return React.createElement(
    MUI.Dialog,
    { open: true, onClose, maxWidth: "sm", fullWidth: true },
    React.createElement(
      MUI.DialogTitle,
      { sx: { display: "flex", alignItems: "center", gap: 1 } },
      Icon ? React.createElement(Icon, { icon: result.ok ? "mdi:check-circle-outline" : "mdi:alert-circle-outline", size: 22, color: result.ok ? "success.main" : "error.main" }) : null,
      result.ok ? "sys_values copiados a producci\xF3n" : "Fall\xF3 la copia a producci\xF3n"
    ),
    React.createElement(
      MUI.DialogContent,
      { dividers: true },
      React.createElement(
        MUI.List,
        { dense: true },
        result.steps.map(
          (s) => React.createElement(
            MUI.ListItem,
            { key: s.name, sx: { py: 0.5 } },
            React.createElement(
              MUI.ListItemIcon,
              { sx: { minWidth: 32 } },
              Icon ? React.createElement(Icon, {
                icon: s.ok ? "mdi:check" : "mdi:close",
                size: 18,
                color: s.ok ? "success.main" : "error.main"
              }) : null
            ),
            React.createElement(MUI.ListItemText, {
              primary: s.name,
              secondary: s.error || null,
              secondaryTypographyProps: { color: "error", variant: "caption" }
            })
          )
        )
      ),
      result.abortedAt ? React.createElement(
        MUI.Typography,
        { variant: "caption", color: "text.secondary", sx: { mt: 1, display: "block" } },
        `Abortado en: ${result.abortedAt}`
      ) : null
    ),
    React.createElement(
      MUI.DialogActions,
      null,
      React.createElement(MUI.Button, { onClick: onClose, variant: "contained" }, "Cerrar")
    )
  );
}
var MUI, React, Icon, openDialog;
var init_CopySysValuesModal = __esm({
  "src/js/components/CopySysValuesModal.jsx"() {
    MUI = window.MaterialUI;
    React = window.React;
    Icon = window.ISA?.UI?.Icon;
    openDialog = null;
  }
});

// src/js/components/IssTargetSwitch.jsx
var IssTargetSwitch_exports = {};
__export(IssTargetSwitch_exports, {
  IssTargetChip: () => IssTargetChip,
  IssTargetMenu: () => IssTargetMenu,
  IssTargetMenuWithAdmin: () => IssTargetMenuWithAdmin
});
function issUrlForTarget(id) {
  if (id === "local") return PATYIA_ISS_LOCAL.replace(/\/$/, "");
  if (id === "production") return PATYIA_ISS_PROD_URL.replace(/\/$/, "");
  return PATYIA_ISS_URL.replace(/\/$/, "");
}
function availableTargets() {
  return isDevHost() ? TARGETS_DEV : TARGETS_WEB;
}
function headerClearBackdropTop() {
  const bar = document.querySelector("header.MuiAppBar-root");
  return bar ? Math.ceil(bar.getBoundingClientRect().bottom) : 56;
}
function TargetMenuItem({ t, selected, onClick, value }) {
  const url = issUrlForTarget(t.id);
  const item = React2.createElement(
    MUI2.MenuItem,
    {
      value,
      selected,
      onClick,
      title: url
    },
    Icon2 ? React2.createElement(MUI2.ListItemIcon, { sx: { minWidth: 32 } }, React2.createElement(Icon2, { icon: t.icon, size: 18 })) : null,
    React2.createElement(MUI2.ListItemText, {
      primary: t.label,
      secondary: url,
      secondaryTypographyProps: {
        variant: "caption",
        noWrap: true,
        sx: { maxWidth: 240, opacity: 0.72, fontFamily: "ui-monospace, Consolas, monospace", fontSize: "0.65rem" }
      }
    })
  );
  return React2.createElement(
    MUI2.Tooltip,
    { title: url, placement: "left", enterDelay: 200, arrow: true },
    // span: Tooltip necesita un hijo que acepte ref; MenuItem dentro de Select a veces no.
    React2.createElement("span", { style: { display: "block" } }, item)
  );
}
function IssTargetChip() {
  const [anchor, setAnchor] = React2.useState(null);
  const [target, setTarget] = React2.useState(
    /** @type {IssTarget} */
    getIssTarget()
  );
  const open = !!anchor;
  const meta = availableTargets().find((x) => x.id === target) ?? availableTargets()[0];
  const currentUrl = issUrlForTarget(target);
  const onPick = (id) => {
    setAnchor(null);
    if (id === target) return;
    setIssTarget(id);
    setTarget(id);
    setTimeout(() => window.location.reload(), 50);
  };
  return React2.createElement(
    React2.Fragment,
    null,
    React2.createElement(
      MUI2.Tooltip,
      { title: `${meta.label}: ${currentUrl}`, arrow: true },
      React2.createElement(
        MUI2.Chip,
        {
          size: "small",
          color: meta.color,
          variant: "outlined",
          className: `iss-target-chip iss-target-chip--${meta.id}`,
          icon: Icon2 ? React2.createElement(Icon2, { icon: meta.icon, size: 16 }) : void 0,
          label: meta.label,
          onClick: (e) => setAnchor(e.currentTarget),
          "aria-haspopup": "true",
          "aria-expanded": open ? "true" : "false",
          sx: { height: 28, cursor: "pointer", "& .MuiChip-label": { px: 0.75 } }
        }
      )
    ),
    React2.createElement(
      MUI2.Menu,
      {
        anchorEl: anchor,
        open,
        onClose: () => setAnchor(null),
        slotProps: {
          backdrop: {
            sx: { top: open ? headerClearBackdropTop() : 0 }
          }
        }
      },
      availableTargets().map(
        (t) => React2.createElement(TargetMenuItem, {
          key: t.id,
          t,
          selected: t.id === target,
          onClick: () => onPick(t.id)
        })
      )
    )
  );
}
function IssTargetMenu() {
  const [target, setTarget] = React2.useState(
    /** @type {IssTarget} */
    getIssTarget()
  );
  const meta = availableTargets().find((x) => x.id === target) ?? availableTargets()[0];
  const onChange = (e) => {
    const id = String(e.target.value);
    if (id === target) return;
    setIssTarget(id);
    setTarget(id);
    setTimeout(() => window.location.reload(), 50);
  };
  return React2.createElement(
    MUI2.Box,
    { sx: { display: "flex", alignItems: "center", gap: 1, pl: 1, pr: 1, minHeight: 36, width: "100%" } },
    Icon2 ? React2.createElement(Icon2, { icon: meta.icon, size: 18 }) : null,
    React2.createElement(
      MUI2.Select,
      {
        value: target,
        onChange,
        size: "small",
        variant: "standard",
        sx: { fontSize: 14, minWidth: 120, "& .MuiSelect-select": { py: 0.25 } }
      },
      availableTargets().map((t) => {
        const url = issUrlForTarget(t.id);
        return React2.createElement(
          MUI2.MenuItem,
          { key: t.id, value: t.id, title: url },
          React2.createElement(MUI2.ListItemText, {
            primary: t.label,
            secondary: url,
            secondaryTypographyProps: {
              variant: "caption",
              noWrap: true,
              sx: { maxWidth: 240, opacity: 0.72, fontFamily: "ui-monospace, Consolas, monospace", fontSize: "0.65rem" }
            }
          })
        );
      })
    )
  );
}
function isAdminPatyia() {
  try {
    const sess = window.ISA?.Session?.current?.();
    if (!sess) return false;
    const roles = Array.isArray(sess.roles) ? sess.roles : Array.isArray(sess.role) ? [sess.role] : [];
    const norm = roles.map((r) => String(r ?? "").trim().toLowerCase()).filter(Boolean);
    return norm.includes("admn_isapatyia") || norm.includes("dev_lead");
  } catch {
    return false;
  }
}
function IssTargetMenuWithAdmin() {
  const [target, setTarget] = React2.useState(
    /** @type {IssTarget} */
    getIssTarget()
  );
  const meta = availableTargets().find((x) => x.id === target) ?? availableTargets()[0];
  const showCopy = isAdminPatyia() && target === "staging";
  const onChange = (e) => {
    const id = String(e.target.value);
    if (id === target) return;
    setIssTarget(id);
    setTarget(id);
    setTimeout(() => window.location.reload(), 50);
  };
  const onCopy = async () => {
    const res = await copySysValuesToProduction();
    openCopyModal(res);
  };
  return React2.createElement(
    MUI2.Box,
    { sx: { display: "flex", flexDirection: "column", gap: 0.25, pl: 1, pr: 1, minHeight: 36, width: "100%" } },
    React2.createElement(
      MUI2.Box,
      { sx: { display: "flex", alignItems: "center", gap: 1 } },
      Icon2 ? React2.createElement(Icon2, { icon: meta.icon, size: 18 }) : null,
      React2.createElement(
        MUI2.Select,
        {
          value: target,
          onChange,
          size: "small",
          variant: "standard",
          sx: { fontSize: 14, minWidth: 120, "& .MuiSelect-select": { py: 0.25 } }
        },
        availableTargets().map((t) => {
          const url = issUrlForTarget(t.id);
          return React2.createElement(
            MUI2.MenuItem,
            { key: t.id, value: t.id, title: url },
            React2.createElement(MUI2.ListItemText, {
              primary: t.label,
              secondary: url,
              secondaryTypographyProps: {
                variant: "caption",
                noWrap: true,
                sx: { maxWidth: 240, opacity: 0.72, fontFamily: "ui-monospace, Consolas, monospace", fontSize: "0.65rem" }
              }
            })
          );
        })
      )
    ),
    showCopy ? React2.createElement(
      MUI2.MenuItem,
      {
        onClick: (e) => {
          e.stopPropagation();
          onCopy();
        },
        sx: { pl: 3, py: 0.25, fontSize: 13, color: "warning.main" }
      },
      Icon2 ? React2.createElement(MUI2.ListItemIcon, { sx: { minWidth: 28 } }, React2.createElement(Icon2, { icon: "mdi:cloud-upload-outline", size: 16 })) : null,
      React2.createElement(MUI2.ListItemText, { primary: "Copiar sys_values a producci\xF3n", primaryTypographyProps: { fontSize: 13 } })
    ) : null
  );
}
var MUI2, React2, Icon2, TARGETS_DEV, TARGETS_WEB;
var init_IssTargetSwitch = __esm({
  "src/js/components/IssTargetSwitch.jsx"() {
    init_patyia();
    init_sysValuesCopy();
    init_CopySysValuesModal();
    MUI2 = window.MaterialUI;
    React2 = window.React;
    Icon2 = window.ISA?.UI?.Icon;
    TARGETS_DEV = [
      { id: "production", label: "Producci\xF3n", icon: "mdi:server", color: "success" },
      { id: "staging", label: "Staging", icon: "mdi:test-tube", color: "primary" },
      { id: "local", label: "Local", icon: "mdi:laptop", color: "warning" }
    ];
    TARGETS_WEB = [
      { id: "production", label: "Producci\xF3n", icon: "mdi:server", color: "success" },
      { id: "staging", label: "Staging", icon: "mdi:test-tube", color: "primary" }
    ];
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
function shouldSuppressAuthDownOverlay(url) {
  if (!url) return false;
  try {
    const u = new URL(url, location.href);
    if (u.origin === location.origin) return true;
    return AUTH_DOWN_OVERLAY_SKIP_PATTERNS.some((re) => re.test(u.pathname + u.search));
  } catch {
    return false;
  }
}
function isAuthCriticalUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url, location.href);
    const path = u.pathname + u.search;
    if (/\/api\/auth\/portal-login(\?|$)/i.test(path)) return true;
    if (/main-orchestrator/i.test(u.host) && /\/api\/auth\//i.test(path)) return true;
    return false;
  } catch {
    return /portal-login/i.test(url);
  }
}
function hasPortalSessionToken() {
  try {
    const fromApi = window.ISA?.AuthApi?.readSession?.();
    if (fromApi && typeof fromApi === "object" && fromApi.token) return true;
    const cur = window.ISA?.Session?.current;
    if (cur && typeof cur === "object" && cur.token) return true;
    const raw = localStorage.getItem("system-login:session:isa-patyia");
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.token) return true;
    }
    return false;
  } catch {
    return false;
  }
}
function normalizeLoginEmail(user) {
  const s = String(user ?? "").trim();
  if (!s) return "";
  return s.includes("@") ? s.toLowerCase() : `${s.toLowerCase()}@contapyme.com`;
}
async function portalLoginRequest(base, body, fetchImpl = fetch) {
  const res = await fetchImpl(base.replace(/\/$/, "") + PORTAL_LOGIN_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-App-Id": "isa-patyia" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (data?.code === "MULTI_EMPRESA" || res.status === 409 && Array.isArray(data?.terceros)) {
    const e = new Error(String(data?.error || "Elija la empresa para continuar."));
    e.code = "MULTI_EMPRESA";
    e.terceros = Array.isArray(data?.terceros) ? data.terceros : [];
    throw e;
  }
  if (!res.ok || !data?.ok || !data?.token) {
    const e = new Error(String(data?.error || `Server error (HTTP status ${res.status})`));
    e.status = res.status;
    e.retryable = res.status === 402 || res.status === 404 || res.status >= 500;
    throw e;
  }
  return data;
}
function patchIsaPatyiaAuthEvents() {
  const Session2 = window.ISA?.Session;
  if (!Session2?.login || !Session2?.logout) return;
  const AUTH_DOWN_PATTERNS = [
    /compute time quota/i,
    /HTTP status 402/,
    /Server error \(HTTP status (5\d\d|402)\)/,
    /Failed to fetch/i,
    /NetworkError when attempting to fetch/i,
    /Load failed/i,
    /getaddrinfo ENOTFOUND/i,
    /ECONNREFUSED/i,
    /status 502/,
    /status 503/,
    /status 504/,
    /server unavailable/i,
    /server is down/i,
    /servicio de acceso no/i
  ];
  const isAuthServerDown = (raw) => {
    const msg = String(raw ?? "");
    return AUTH_DOWN_PATTERNS.some((re) => re.test(msg));
  };
  const resolveAuthTarget = () => {
    try {
      const orch = String(ORCH_ONLINE).replace(/\/$/, "");
      return `${orch}${PORTAL_LOGIN_PATH} \u2192 ${patyiaIssBase()}${PORTAL_LOGIN_PATH} (DataSnap ContaPyme)`;
    } catch {
      return "https://main-orchestrator.jeffaporta.workers.dev/api/auth/portal-login \u2192 DataSnap ContaPyme";
    }
  };
  const announceAuthServerDown = (reason, source, target) => {
    const targetUrl = target || resolveAuthTarget();
    try {
      window.dispatchEvent(new CustomEvent("isa-patyia:auth-server-down", { detail: { reason, source, target: targetUrl, at: Date.now() } }));
    } catch {
    }
    try {
      toastError(`Servidor de autenticaci\xF3n ca\xEDdo: ${targetUrl}`, 8e3);
    } catch {
    }
  };
  const announceAuthServerUp = () => {
    try {
      window.dispatchEvent(new CustomEvent("isa-patyia:auth-server-up", { detail: { at: Date.now() } }));
    } catch {
    }
  };
  const origFetch = window.fetch.bind(window);
  const origLogout = Session2.logout.bind(Session2);
  const cachePortalTokenAsPatyJwt = (token, savedBy, expiresAt) => {
    try {
      const part = String(token || "").split(".")[1];
      const raw = part ? JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) : {};
      if (raw.itercero == null) return;
      const claims = {
        itercero: String(raw.itercero),
        icontacto: raw.icontacto != null ? String(raw.icontacto) : void 0,
        nombres: raw.nombres != null ? String(raw.nombres) : void 0,
        apellidos: raw.apellidos != null ? String(raw.apellidos) : void 0,
        controlkey: raw.controlkey != null ? String(raw.controlkey) : void 0,
        iapp: typeof raw.iapp === "number" ? raw.iapp : void 0,
        idmaquina: raw.idmaquina != null ? String(raw.idmaquina) : void 0
      };
      const exp = typeof raw.exp === "number" ? new Date(raw.exp * 1e3).toISOString() : null;
      const rec = {
        token: token.trim(),
        savedBy: String(savedBy || "").trim().toUpperCase(),
        savedAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt: expiresAt ?? exp,
        claims
      };
      sessionStorage.setItem("isa-patyia:paty-jwt", JSON.stringify(rec));
      window.dispatchEvent(new Event("isa-patyia:paty-jwt"));
    } catch {
    }
  };
  const portalLogin = async (u, p, opts) => {
    const semail = normalizeLoginEmail(u);
    if (!semail || !p) throw new Error("Usuario y contrase\xF1a requeridos");
    const body = { semail, password: p };
    const itercero = String(opts?.itercero ?? "").trim();
    if (itercero) body.itercero = itercero;
    let data = null;
    try {
      data = await portalLoginRequest(ORCH_ONLINE, body, origFetch);
    } catch (err) {
      const e = err;
      if (e?.code === "MULTI_EMPRESA") throw e;
      const msg = e instanceof Error ? e.message : String(e);
      const workerDown = e?.retryable || isAuthServerDown(msg) || !(e instanceof Error && "status" in e);
      if (!workerDown) throw e;
      const directBase = patyiaIssBase();
      try {
        data = await portalLoginRequest(directBase, body, origFetch);
      } catch (err2) {
        const e2 = err2;
        if (e2?.code === "MULTI_EMPRESA") throw e2;
        const staging = PATYIA_ISS_URL.replace(/\/$/, "");
        if (directBase.replace(/\/$/, "") !== staging && (e2?.retryable || isAuthServerDown(e2 instanceof Error ? e2.message : String(e2)))) {
          data = await portalLoginRequest(staging, body, origFetch);
        } else {
          throw e2;
        }
      }
    }
    const username = String(data.username || semail);
    const session = {
      username,
      displayName: data.displayName || null,
      role: null,
      token: String(data.token),
      expiresAt: data.expiresAt ?? null,
      capabilities: [],
      adminCapabilities: [],
      capabilityCatalog: []
    };
    window.ISA?.AuthApi?.saveSession?.(session);
    cachePortalTokenAsPatyJwt(String(data.token), username, data.expiresAt ?? null);
    return session;
  };
  const wrapLogin = async (u, p, opts) => {
    try {
      const session = await portalLogin(u, p, opts);
      announceAuthServerUp();
      window.dispatchEvent(new Event("isa-patyia:auth"));
      return session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = err?.code;
      if (code !== "MULTI_EMPRESA" && isAuthServerDown(msg)) announceAuthServerDown(msg, "login", resolveAuthTarget());
      throw err;
    }
  };
  const wrapFetch = async (input, init) => {
    try {
      const res = await origFetch(input, init);
      if (res.status === 401 || res.status === 403) return res;
      if (res.status === 402 || res.status >= 500) {
        try {
          const body = await res.clone().text();
          if (isAuthServerDown(body) || isAuthServerDown(res.statusText)) {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input.url || "");
            if (shouldSuppressAuthDownOverlay(url) || !isAuthCriticalUrl(url)) return res;
            if (hasPortalSessionToken() && !/portal-login/i.test(url)) return res;
            announceAuthServerDown(`HTTP ${res.status} ${res.statusText || ""}`.trim(), "fetch", url || resolveAuthTarget());
          }
        } catch {
        }
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input?.url || "");
      if (isAuthServerDown(msg) && !shouldSuppressAuthDownOverlay(url) && isAuthCriticalUrl(url) && !(hasPortalSessionToken() && !/portal-login/i.test(url))) {
        announceAuthServerDown(msg, "fetch");
      }
      throw err;
    }
  };
  Session2.login = wrapLogin;
  if (window.ISA?.Auth?.login) window.ISA.Auth.login = wrapLogin;
  try {
    window.fetch = wrapFetch.bind(window);
  } catch {
  }
  Session2.logout = () => {
    origLogout();
    window.dispatchEvent(new Event("isa-patyia:auth"));
  };
}
function patchIssOnlyLocalConfig() {
  ensureIssLocalDefault();
  migrateIssLocalFromGatewayFlag();
  try {
    localStorage.setItem(GATEWAY_LS_KEY, "0");
  } catch {
  }
  const cfg = window.ISA?.Config;
  if (!cfg) return;
  const online = String(cfg.ONLINE || ORCH_ONLINE).replace(/\/$/, "");
  const recompute = () => {
    const t = getIssTarget();
    cfg.isLocal = () => t === "local";
    cfg.setLocal = (on) => {
      setIssTarget(on ? "local" : isDevHost() ? "local" : "staging");
      return true;
    };
    const base = t === "local" ? PATYIA_ISS_LOCAL.replace(/\/$/, "") : t === "production" ? PATYIA_ISS_PROD_URL.replace(/\/$/, "") : PATYIA_ISS_URL.replace(/\/$/, "");
    cfg.base = () => base;
    cfg.apiUrl = (path) => base + (path.charAt(0) === "/" ? path : `/${path}`);
    cfg.label = () => t === "local" ? "Local" : t === "production" ? "Producci\xF3n" : "Staging";
    cfg.connectionHint = () => "";
  };
  recompute();
  cfg.EVENT = "patyia-apptools:iss-target-changed";
  try {
    window.addEventListener("patyia-apptools:iss-target-changed", recompute);
  } catch {
  }
}
function patchIsaPatyiaTargetSwitchReadOnly() {
  const bag = window.ISA;
  if (!bag?.UI) return;
  Promise.resolve().then(() => (init_IssTargetSwitch(), IssTargetSwitch_exports)).then((mod) => {
    if (mod?.IssTargetChip) bag.UI.TargetSwitch = mod.IssTargetChip;
    if (mod?.IssTargetMenuWithAdmin) bag.UI.TargetSwitchMenu = mod.IssTargetMenuWithAdmin;
    else if (mod?.IssTargetMenu) bag.UI.TargetSwitchMenu = mod.IssTargetMenu;
  }).catch((e) => console.warn("IssTargetSwitch load:", e));
}
function patyiaIssBaseForLogin() {
  return patyiaIssBase();
}
function patchCompactFormThemeDefaults() {
  const Theme = window.ISA?.Theme;
  const MUI3 = window.MaterialUI;
  if (!Theme?.useThemeMode || !MUI3?.createTheme) return;
  const lightContained = {
    boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
    "&:hover": { boxShadow: "0 2px 6px rgba(15,23,42,0.12)" }
  };
  const darkContained = {
    boxShadow: "0 0 20px rgba(30,144,255,0.35)",
    "&:hover": { boxShadow: "0 0 28px rgba(30,144,255,0.55)" }
  };
  const buttonPatch = (mode) => ({
    MuiButton: {
      styleOverrides: {
        containedPrimary: mode === "light" ? lightContained : darkContained
      }
    }
  });
  const formDefaults = {
    MuiTextField: { defaultProps: { size: "small", margin: "dense" } },
    MuiFormControl: { defaultProps: { size: "small", margin: "dense" } },
    MuiAutocomplete: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiInputBase: { defaultProps: { size: "small" } }
  };
  const orig = Theme.useThemeMode.bind(Theme);
  Theme.useThemeMode = () => {
    const tm = orig();
    const mode = String(tm?.mode ?? tm?.theme?.palette?.mode ?? "dark");
    const theme = MUI3.createTheme(tm.theme, {
      components: { ...formDefaults, ...buttonPatch(mode) }
    });
    return { ...tm, theme };
  };
  if (typeof Theme.makeTheme === "function") {
    const origMake = Theme.makeTheme.bind(Theme);
    Theme.makeTheme = (mode) => MUI3.createTheme(origMake(mode), {
      components: { ...formDefaults, ...buttonPatch(mode) }
    });
  }
}
function bootstrapIsaPatyia() {
  ensureIssLocalDefault();
  window.ISAFront.registerApp({
    ns: "ISA",
    app: "isa-patyia",
    theme: true,
    widgets: { targetStyle: "chip", targetReadOnlyLocal: false },
    session: true,
    auth: false,
    toast: true,
    loginButton: {
      showTarget: false,
      runUnitTestUrl: () => `${patyiaIssBaseForLogin()}/api/run-unit-test`,
      getAuthHeaders: () => {
        const tok = window.ISA?.Session?.current?.()?.token;
        return tok ? window.ISA.Session.authHeader() : {};
      },
      unitTestTitle: "Test unitario \u2014 ISS-AyudasCPIA"
    }
  });
  patchIssOnlyLocalConfig();
  patchIsaPatyiaTargetSwitchReadOnly();
  patchIsaPatyiaAuthEvents();
  patchCompactFormThemeDefaults();
  if (window.ISAFront?.registerCodeMirror && window.React && window.MaterialUI) {
    window.ISAFront.registerCodeMirror(window.React, window.MaterialUI);
  }
  if (!window.ISA?.Session) {
    throw new Error("No se pudo iniciar la aplicaci\xF3n. Recargue sin cach\xE9 (Ctrl+Shift+R).");
  }
}
var bridge, UI, Session, Toast, Config, Assets, Tokens, getReact, getReactDOM, getMaterialUI, LightboxZoom, Lightbox, fb, PORTAL_LOGIN_PATH, AUTH_DOWN_OVERLAY_SKIP_PATTERNS;
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
    Toast = {
      show: (opts) => bridge().Toast.show(opts)
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
    Assets = {
      ensureCodeMirrorLoaded: (opts) => {
        const api = frontSharedLazy();
        return api ? api.ensureCodeMirrorLoaded(opts) : Promise.resolve();
      },
      ensureMarked: () => {
        const api = frontSharedLazy();
        return api ? api.ensureMarked() : Promise.resolve();
      },
      ensureStylesheet: (href) => {
        const api = frontSharedLazy();
        return api ? api.ensureLazyStylesheet(href) : Promise.resolve();
      },
      ensureChatStagingCss: () => {
        const api = frontSharedLazy();
        if (!api) return;
        const prefix = typeof window !== "undefined" && window.__ISA_DIST__ ? "dist/" : "";
        api.ensureLazyStylesheet(`${prefix}css/chat-staging.css`).catch((err) => {
          console.warn("chat-staging.css:", err);
        });
      },
      ensureTodosCss: () => {
        const api = frontSharedLazy();
        if (!api) return;
        const prefix = typeof window !== "undefined" && window.__ISA_DIST__ ? "dist/" : "";
        api.ensureLazyStylesheet(`${prefix}css/todos-staging.css`).catch((err) => {
          console.warn("todos-staging.css:", err);
        });
      },
      ensureWelcomeCss: () => {
        const api = frontSharedLazy();
        if (!api) return;
        const prefix = typeof window !== "undefined" && window.__ISA_DIST__ ? "dist/" : "";
        api.ensureLazyStylesheet(`${prefix}css/welcome-home.css`).catch((err) => {
          console.warn("welcome-home.css:", err);
        });
      }
    };
    Tokens = {
      estimatePrompt: (text) => {
        const fn = window.ISAFront?.estimatePromptTokens;
        if (typeof fn === "function") return fn(text);
        const s = String(text ?? "");
        return s.trim() ? Math.ceil(s.length / 4) : 0;
      }
    };
    getReact = () => window.ISAFront.getReact();
    getReactDOM = () => window.ISAFront.getReactDOM();
    getMaterialUI = () => window.ISAFront.getMaterialUI();
    LightboxZoom = {
      get LightboxZoomDialog() {
        return lightboxApi().LightboxZoomDialog;
      },
      get LightboxZoomImage() {
        return lightboxApi().LightboxZoomImage;
      },
      get useLightboxZoom() {
        return lightboxApi().useLightboxZoom;
      },
      get ZOOM_MIN() {
        return lightboxApi().ZOOM_MIN;
      },
      get ZOOM_MAX() {
        return lightboxApi().ZOOM_MAX;
      },
      get PAN_STEP() {
        return lightboxApi().PAN_STEP;
      }
    };
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
    PORTAL_LOGIN_PATH = "/api/auth/portal-login";
    AUTH_DOWN_OVERLAY_SKIP_PATTERNS = [
      /\/api\/auth\/portal-jwt(\/catalog)?(\?|$)/,
      /\/api\/auth\/verify-access(\?|$)/,
      /\/api\/auth\/service-token(\?|$)/,
      /\/api\/auth\/test-token(\?|$)/,
      /\/api\/session(\?|$)/
    ];
  }
});
init_platform();
export {
  Assets,
  CodeMirrorPanel,
  Config,
  Lightbox,
  LightboxZoom,
  Session,
  Toast,
  Tokens,
  UI,
  bootstrapIsaPatyia,
  getGlass,
  getIsaSplitView,
  getMaterialUI,
  getReact,
  getReactDOM,
  mdToHtml,
  requestConfirm,
  toastError,
  toastInfo,
  toastSuccess,
  toastWarning
};
