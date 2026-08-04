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
var ORCH_ONLINE, PATYIA_ISS_URL, PATYIA_ISS_PROD_URL, PATYIA_ISS_LOCAL, ORCH_LOCAL, SCRUM_LOCAL, PATYIA_ISS_LOCAL_API, PATYIA_ISS_PROD_API, PATYIA_ISS_STAGING_API, PATYIA_ISS_TARGET_LS_KEY, AVATAR_BG_PALETTE;
var init_patyia = __esm({
  "src/js/core/patyia.ts"() {
    window.ISAFront.migrateLegacyGatewayKeys?.({ "jeff:gateway-local": "", "patyia-apptools:gateway-local": "", "patyia-apptools:lab-local": "" });
    ORCH_ONLINE = "https://main-orchestrator.jeffaporta.workers.dev";
    PATYIA_ISS_URL = "https://ayudascp-ia-staging.azurewebsites.net";
    PATYIA_ISS_PROD_URL = "https://ayudascp-ia.azurewebsites.net";
    PATYIA_ISS_LOCAL = "http://127.0.0.1:8802";
    ORCH_LOCAL = "http://localhost:8790";
    SCRUM_LOCAL = "http://localhost:8798";
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
function toastWarning(text, timeout) {
  fb()?.toast?.warning?.(text, timeout);
}
var bridge, Session, Config, fb;
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
function handleApiError(err, cap) {
  window.ISAFront.handleApiError(err, cap, { blockReason, clearSession, toastWarning, toastError });
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

// src/js/api/todosApi.ts
init_platform();
init_patyia();
init_sessionApi();
var scrumHttp = window.ISAFront.createCapFetch({
  Session,
  Config,
  getApiBase: () => ORCH_ONLINE.replace(/\/$/, ""),
  localDirect: [
    {
      test: (p) => {
        const n = p.startsWith("/") ? p : `/${p}`;
        return n.startsWith("/scrum") || n.startsWith("/api/scrum");
      },
      base: SCRUM_LOCAL
    }
  ],
  orchOnlineInLocal: false,
  isLocal: isLocalMode,
  handleApiError,
  clearSession
});
var SCRUM_APP_ID = "isa-patyia";
function qs(extra) {
  const params = new URLSearchParams({ app: SCRUM_APP_ID, ...extra });
  return `?${params.toString()}`;
}
async function searchScrumAppUsers(query = "", limit = 12) {
  if (!Session.isLoggedIn()) return [];
  const params = new URLSearchParams({ app: SCRUM_APP_ID, limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  const rel = `/api/scrum/users/search?${params}`;
  const headers = { Accept: "application/json" };
  Object.assign(headers, Session.authHeader(), Session.appHeader());
  const tryBase = async (base) => {
    try {
      const res = await fetch(`${String(base).replace(/\/$/, "")}${rel}`, { method: "GET", headers });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      if (data.ok === false) return null;
      return data.users ?? [];
    } catch {
      return null;
    }
  };
  const bases = isDevHost() && isLocalMode() ? [SCRUM_LOCAL, ORCH_LOCAL] : [ORCH_ONLINE.replace(/\/$/, "")];
  for (const base of bases) {
    const users = await tryBase(base);
    if (users !== null) return users;
  }
  return [];
}
async function fetchTodoBoards(boardType = "scrum") {
  const data = await scrumHttp.capFetch(`/scrum/boards${qs({ boardType })}`, { method: "GET" });
  return data.boards ?? [];
}
async function createTodoBoard(payload) {
  const data = await scrumHttp.capFetch(`/scrum/boards${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardType: "scrum", ...payload })
  });
  return data;
}
async function updateTodoBoard(boardId, patch) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  return data;
}
async function deleteTodoBoard(boardId) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}${qs()}`, { method: "DELETE" });
  return data;
}
async function fetchTodoBoardMembers(boardId) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}/members${qs()}`, { method: "GET" });
  return data.members ?? [];
}
async function saveTodoBoardMembers(boardId, members) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}/members${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ members })
  });
  return data.members ?? [];
}
async function fetchPublicTodoBoards(boardType = "scrum") {
  const base = ORCH_ONLINE.replace(/\/$/, "");
  const params = new URLSearchParams({ app: SCRUM_APP_ID, boardType });
  const res = await fetch(`${base}/api/scrum/public?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.boards ?? [];
}
async function fetchPublicTodoBoard(slug) {
  const base = ORCH_ONLINE.replace(/\/$/, "");
  const params = new URLSearchParams({ app: SCRUM_APP_ID });
  const res = await fetch(`${base}/api/scrum/public/${encodeURIComponent(slug)}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}
function buildPublicScrumUrl(publicSlug) {
  const origin = typeof location !== "undefined" ? location.origin + location.pathname : "";
  const snap = { v: 1, tool: "todos", local: false, log: {}, prompts: {}, chat: {}, todos: { publicSlug } };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(snap))));
  return `${origin}?s=${encodeURIComponent(b64)}`;
}
async function fetchTodoBoard(boardId) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}${qs()}`, { method: "GET" });
  return data;
}
async function createTodoTask(boardId, payload) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}/tasks${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return data.task;
}
async function fetchTodoTask(taskId) {
  const data = await scrumHttp.capFetch(`/scrum/tasks/${taskId}${qs()}`, { method: "GET" });
  return data.task;
}
async function updateTodoTask(taskId, patch) {
  const data = await scrumHttp.capFetch(`/scrum/tasks/${taskId}${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  return data.task;
}
async function createTodoMilestone(taskId, payload) {
  const data = await scrumHttp.capFetch(`/scrum/tasks/${taskId}/milestones${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return data.milestone;
}
async function updateTodoMilestone(milestoneId, patch) {
  const data = await scrumHttp.capFetch(`/scrum/milestones/${milestoneId}${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  return data.milestone;
}
async function deleteTodoTask(taskId) {
  await scrumHttp.capFetch(`/scrum/tasks/${taskId}${qs()}`, { method: "DELETE" });
}
async function deleteTodoMilestone(milestoneId) {
  await scrumHttp.capFetch(`/scrum/milestones/${milestoneId}${qs()}`, { method: "DELETE" });
}
async function addTodoComment(taskId, body) {
  const data = await scrumHttp.capFetch(`/scrum/tasks/${taskId}/comments${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body })
  });
  return data.event;
}
export {
  SCRUM_APP_ID,
  addTodoComment,
  buildPublicScrumUrl,
  createTodoBoard,
  createTodoMilestone,
  createTodoTask,
  deleteTodoBoard,
  deleteTodoMilestone,
  deleteTodoTask,
  fetchPublicTodoBoard,
  fetchPublicTodoBoards,
  fetchTodoBoard,
  fetchTodoBoardMembers,
  fetchTodoBoards,
  fetchTodoTask,
  saveTodoBoardMembers,
  searchScrumAppUsers,
  updateTodoBoard,
  updateTodoMilestone,
  updateTodoTask
};
