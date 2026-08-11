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
function frontSharedLazy() {
  const api = window.ISAFront;
  return api?.ensureCodeMirrorLoaded ? api : null;
}
function getGlass() {
  const g = window.ISAFront?.Glass;
  if (!g?.GlassCard) {
    throw new Error("ISAFront.Glass no cargado \u2014 recargue sin cach\xE9 (Ctrl+Shift+R).");
  }
  return g;
}
function toastError(text, timeout) {
  fb()?.toast?.error?.(text, timeout);
}
function toastSuccess(text, timeout) {
  fb()?.toast?.success?.(text, timeout);
}
var bridge, UI, Session, Config, Assets, getReact, getReactDOM, getMaterialUI, fb;
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
    getReact = () => window.ISAFront.getReact();
    getReactDOM = () => window.ISAFront.getReactDOM();
    getMaterialUI = () => window.ISAFront.getMaterialUI();
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
async function jsonFetchSegAdmin(path, init) {
  let local = null;
  let localErr = null;
  try {
    local = await jsonFetchAt(systemApiBase(), path, init);
  } catch (err) {
    localErr = err;
  }
  const thin = local != null && Array.isArray(local.contactos) && local.contactos.length === 0 && Array.isArray(local.acciones) && local.acciones.length < 10;
  if (isLocalMode() && (localErr || thin)) {
    try {
      const stg = await jsonFetchAt(PATYIA_ISS_STAGING_API, path, init);
      console.warn(`[seg-front] admin ${path} v\xEDa staging (${localErr ? "error local" : "local vac\xEDo"})`);
      return stg;
    } catch (stgErr) {
      if (local) return local;
      throw localErr || stgErr;
    }
  }
  if (local) return local;
  throw localErr instanceof Error ? localErr : new Error(String(localErr ?? "SEG admin fall\xF3"));
}
function permEntityKey(entry) {
  return String(entry?.ientity ?? entry?.iusuario ?? "").trim();
}
function normalizePermEntry(entry) {
  const key = permEntityKey(entry);
  return {
    iusuario: key,
    ientity: key || void 0,
    itipo: entry?.itipo === "user" ? "user" : "role",
    permisos: entry?.permisos && typeof entry.permisos === "object" ? entry.permisos : {},
    bactivo: entry?.bactivo !== false
  };
}
function normalizePermissionsPayload(raw) {
  const roles = (Array.isArray(raw?.roles) ? raw.roles : []).map((e) => normalizePermEntry(e));
  const users = (Array.isArray(raw?.users) ? raw.users : []).map((e) => normalizePermEntry(e));
  const contactos = raw?.contactos && typeof raw.contactos === "object" && !Array.isArray(raw.contactos) ? raw.contactos : {};
  return { ...raw, roles, users, contactos };
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
function applyPermissionsMeToKanban(data, me) {
  if (!me) return data;
  const caps = capsFromPermisosEfectivos(me.permisosEfectivos);
  return {
    ...data,
    canManage: caps.canManagePermissions,
    canAssignUserRoles: caps.canAssignUserRoles,
    canEditRoleDescriptions: caps.canEditRoleDescriptions || caps.canManagePermissions,
    actorRoles: me.roles,
    _permissionsMe: me
  };
}
async function fetchPatyiaAdminRoles() {
  return jsonFetchSegAdmin(`/patyia/admin/roles`, {
    method: "GET",
    headers: systemApiHeaders()
  });
}
async function assignPatyiaRolContacto({ irol, icontacto, bprincipal = true }) {
  return jsonFetch(`/patyia/admin/roles/${encodeURIComponent(irol)}`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ icontacto, op: "add", bprincipal })
  });
}
async function removePatyiaRolContacto({ irol, icontacto }) {
  return jsonFetch(`/patyia/admin/roles/${encodeURIComponent(irol)}`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ icontacto, op: "remove" })
  });
}
function invalidatePermisosCache() {
  PERMISOS_LIST_CACHE.clear();
  PERMISOS_LIST_INFLIGHT.clear();
  clearPermissionsMeCache();
}
async function permisosMutation(p) {
  const data = await p;
  PERMISOS_LIST_CACHE.clear();
  clearPermissionsMeCache();
  return data;
}
function permissionsFromAdminRoles(admin) {
  const roleRows = Array.isArray(admin?.roles) ? admin.roles : [];
  const roles = roleRows.map((r) => ({
    iusuario: `ROLE:${String(r.irol ?? "").trim().toUpperCase()}`,
    itipo: "role",
    permisos: {},
    bactivo: true
  })).filter((r) => r.iusuario !== "ROLE:");
  if (!roles.some((r) => r.iusuario === "ROLE:DEVISS")) {
    roles.unshift({ iusuario: "ROLE:DEVISS", itipo: "role", permisos: {}, bactivo: true });
  }
  if (!roles.some((r) => r.iusuario === "ROLE:USR")) {
    roles.push({ iusuario: "ROLE:USR", itipo: "role", permisos: {}, bactivo: true });
  }
  const byUser = /* @__PURE__ */ new Map();
  for (const c of Array.isArray(admin?.contactos) ? admin.contactos : []) {
    const uname = String(c.username ?? "").trim().toUpperCase() || (c.icontacto != null ? String(c.icontacto) : "");
    if (!uname) continue;
    const irol = String(c.irol ?? "").trim().toUpperCase();
    const cur = byUser.get(uname) ?? { roles: /* @__PURE__ */ new Set(), nombre: c.nombre ?? null, icontacto: c.icontacto };
    if (irol) cur.roles.add(irol);
    if (c.nombre) cur.nombre = c.nombre;
    if (c.icontacto != null) cur.icontacto = c.icontacto;
    byUser.set(uname, cur);
  }
  const users = [...byUser.entries()].map(([username, meta]) => ({
    iusuario: username,
    itipo: "user",
    permisos: {
      roles: [...meta.roles],
      ...meta.nombre ? { nombre: meta.nombre } : {}
    },
    bactivo: true
  }));
  const contactos = {};
  for (const [username, meta] of byUser) {
    if (meta.icontacto == null) continue;
    contactos[username] = { itercero: "", icontacto: meta.icontacto, nombre: meta.nombre ?? null };
  }
  return { roles, users, contactos, usersTotal: users.length, usersTruncated: false };
}
function fetchPermisosListRaw(q) {
  const cached = PERMISOS_LIST_CACHE.get(q);
  if (cached && Date.now() - cached.iat < PERMISOS_LIST_TTL_MS) return Promise.resolve(cached.raw);
  const inflight = PERMISOS_LIST_INFLIGHT.get(q);
  if (inflight) return inflight;
  const req = fetchPatyiaAdminRoles().then((admin) => permissionsFromAdminRoles(admin)).then((raw) => {
    const qs = new URLSearchParams(q);
    const search = String(qs.get("search") ?? "").trim().toUpperCase();
    const role = String(qs.get("role") ?? "").trim().toUpperCase();
    const limitRaw = qs.get("limit");
    const limit = limitRaw != null && Number.isFinite(Number(limitRaw)) ? Math.min(500, Math.max(1, Math.floor(Number(limitRaw)))) : void 0;
    let users = Array.isArray(raw.users) ? [...raw.users] : [];
    if (search) {
      users = users.filter((u) => {
        const name = String(u.iusuario ?? "").toUpperCase();
        const nombre = String(u.permisos?.nombre ?? "").toUpperCase();
        return name.includes(search) || nombre.includes(search);
      });
    }
    if (role) {
      users = users.filter((u) => {
        const roles = u.permisos?.roles;
        return Array.isArray(roles) && roles.some((r) => String(r).toUpperCase() === role);
      });
    }
    const truncated = limit != null && users.length > limit;
    if (limit != null) users = users.slice(0, limit);
    return { ...raw, users, usersTotal: users.length, usersTruncated: truncated };
  }).then((raw) => {
    PERMISOS_LIST_CACHE.set(q, { raw, iat: Date.now() });
    return raw;
  }).finally(() => {
    PERMISOS_LIST_INFLIGHT.delete(q);
  });
  PERMISOS_LIST_INFLIGHT.set(q, req);
  return req;
}
async function fetchPermisos(opts) {
  const qs = new URLSearchParams();
  const search = String(opts?.search ?? "").trim();
  const role = String(opts?.role ?? "").trim().toUpperCase();
  const limit = opts?.limit != null && Number.isFinite(Number(opts.limit)) ? Math.min(500, Math.max(1, Math.floor(Number(opts.limit)))) : void 0;
  if (search) qs.set("search", search);
  if (role) qs.set("role", role);
  if (limit != null) qs.set("limit", String(limit));
  const q = qs.toString();
  const [raw, me] = await Promise.all([
    fetchPermisosListRaw(q),
    fetchPermissionsMe().catch(() => null)
  ]);
  return applyPermissionsMeToKanban(normalizePermissionsPayload(raw), me);
}
async function searchPermisosUsers(query = "", opts) {
  const q = String(query ?? "").trim();
  const limit = opts?.limit != null && Number.isFinite(Number(opts.limit)) ? Math.min(500, Math.max(1, Math.floor(Number(opts.limit)))) : 10;
  const result = await fetchPermisos({
    ...q ? { search: q } : {},
    ...opts?.role ? { role: opts.role } : {},
    limit
  });
  return (result.users ?? []).map((e) => ({
    username: String(e.iusuario ?? "").trim().toUpperCase(),
    displayName: (() => {
      const p = e.permisos;
      const name = p?.nombre ?? p?.namedisplay;
      return name != null && String(name).trim() ? String(name).trim() : null;
    })()
  })).filter((u) => u.username).slice(0, limit);
}
async function putPermisoRolePath(name, permisos, bactivo) {
  const role = encodeURIComponent(String(name).trim().toUpperCase().replace(/^ROLE:/i, ""));
  const body = { permisos };
  if (bactivo !== void 0) body.bactivo = bactivo;
  return permisosMutation(jsonFetch(`/system/permisos/roles/${role}`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }));
}
async function putUsuarioRoles(username, body) {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  const payload = {
    ...body,
    fromRole: String(body.fromRole ?? "").trim().toUpperCase(),
    toRole: String(body.toRole ?? "").trim().toUpperCase()
  };
  return permisosMutation(jsonFetch(`/system/permisos/usuarios/${u}/roles`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }));
}
async function addUsuarioRole(username, role) {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  return permisosMutation(jsonFetch(`/system/permisos/usuarios/${u}/roles`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ toRole: String(role).trim().toUpperCase(), mode: "add" })
  }));
}
async function removeUsuarioRole(username, role) {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  return permisosMutation(jsonFetch(`/system/permisos/usuarios/${u}/roles`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ fromRole: String(role).trim().toUpperCase(), mode: "remove" })
  }));
}
function requireAppSession(onNeedLogin) {
  if (Session.isLoggedIn()) return true;
  onNeedLogin?.();
  return false;
}
var CONTAPYME_NOAUTH_RX, PERMISSIONS_ME_CACHE, PERMISSIONS_ME_INFLIGHT, PERMISOS_LIST_TTL_MS, PERMISOS_LIST_CACHE, PERMISOS_LIST_INFLIGHT;
var init_systemConfigApi = __esm({
  "src/js/api/systemConfigApi.ts"() {
    init_platform();
    init_patyia();
    init_patyia_jwt();
    init_permAccessFromMap();
    CONTAPYME_NOAUTH_RX = /par[aá]metro de autenticaci[oó]n|enviando el header.*authorization/i;
    PERMISSIONS_ME_CACHE = { value: null, iat: 0, ttlMs: 0, key: "" };
    PERMISSIONS_ME_INFLIGHT = null;
    PERMISOS_LIST_TTL_MS = 6e4;
    PERMISOS_LIST_CACHE = /* @__PURE__ */ new Map();
    PERMISOS_LIST_INFLIGHT = /* @__PURE__ */ new Map();
  }
});

// src/js/tools/PermisosPanel.jsx
init_platform();

// src/js/ui/shared.jsx
init_platform();
init_platform();

// src/js/ui/ImageLightboxDialog.jsx
init_platform();
init_platform();
import { jsx } from "react/jsx-runtime";
var { useEffect, useState } = getReact();

// src/js/ui/LogJsonPanel.jsx
init_platform();
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var { useMemo } = getReact();
var { Box, Typography, Stack, Chip, Tooltip, IconButton } = getMaterialUI();
var { Icon } = UI;

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
function GlassDialogHeader({ icon = "mdi:information-outline", title, subtitle, accent = "#1e90ff", onClose, closeAutoFocus = false }) {
  const { Box: Box8, Typography: Typography8, IconButton: IconButton3, Stack: Stack7 } = getMaterialUI();
  const { Icon: Icon4 } = UI;
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
  return /* @__PURE__ */ jsxs2(Box8, { className: "isa-glass-dialog__header", sx: { position: "relative", flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx3(Box8, { sx: bandSx, children: /* @__PURE__ */ jsxs2(Stack7, { direction: "row", spacing: 1.25, alignItems: "center", sx: { pr: onClose ? 4 : 0 }, children: [
      /* @__PURE__ */ jsx3(Box8, { sx: iconSx, children: /* @__PURE__ */ jsx3(Icon4, { icon, size: 24 }) }),
      /* @__PURE__ */ jsxs2(Box8, { sx: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx3(Typography8, { variant: "h5", component: "h2", sx: titleSx, children: title }),
        subtitle ? /* @__PURE__ */ jsx3(Typography8, { variant: "caption", color: "text.secondary", display: "block", sx: { mt: 0.35, lineHeight: 1.4 }, children: subtitle }) : null
      ] })
    ] }) }),
    onClose ? /* @__PURE__ */ jsx3(
      IconButton3,
      {
        size: "small",
        onClick: onClose,
        "aria-label": "Cerrar",
        autoFocus: closeAutoFocus,
        className: "isa-glass-dialog__close",
        sx: { position: "absolute", top: 10, right: 10 },
        children: /* @__PURE__ */ jsx3(Icon4, { icon: "mdi:close", size: 18 })
      }
    ) : null
  ] });
}
function GlassDialog({ children, header = null, maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps }) {
  const { Dialog } = getMaterialUI();
  const props = resolveGlassDialogProps({ maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps });
  return /* @__PURE__ */ jsxs2(Dialog, { ...props, children: [
    header,
    children
  ] });
}

// src/js/ui/shared.jsx
import { Fragment, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function ButtonIconify({ icon, title = "", label = "", onClick, disabled = false, busy = false, color = "", variant = "", className = "", type = "button" }) {
  const shown = busy ? "mdi:loading" : icon;
  const variantCls = variant ? `btn-iconify--${variant}` : "";
  const colorCls = color ? `btn-iconify--${color}` : "";
  const labeledCls = label ? "btn-iconify--labeled" : "";
  const aria = label || title || void 0;
  return /* @__PURE__ */ jsxs3(
    "button",
    {
      type,
      className: `btn-iconify ${variantCls} ${colorCls} ${labeledCls} ${className}`.trim(),
      title: title || label || void 0,
      "aria-label": aria,
      onClick,
      disabled: disabled || busy,
      children: [
        /* @__PURE__ */ jsx4("iconify-icon", { icon: shown, width: "1.15em", height: "1.15em" }),
        label ? /* @__PURE__ */ jsx4("span", { className: "btn-iconify__lbl", children: label }) : null
      ]
    }
  );
}
var { useState: useState2, useEffect: useEffect2, useMemo: useMemo2 } = getReact();
var { createTheme, Tabs, Tab, Box: Box2, Typography: Typography2, DialogContent, Stack: Stack2, Chip: Chip2 } = getMaterialUI();
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

// src/js/tools/PermisosPanel.jsx
init_systemConfigApi();

// src/js/tools/permFilter.js
var SESSION_OWNER_FILTER = {
  itercero: "{{itercero}}",
  icontacto: "{{icontacto}}"
};

// src/js/tools/permisosForm.js
var FLAG_DEFS = [
  { key: "*", label: "Acceso total", hint: "Wildcard \u2014 anula el resto de restricciones de ruta." },
  { key: "impersonate", label: "Suplantar chat", hint: "Actuar como otro usuario en conversaciones." },
  { key: "manage_permissions", label: "Gestionar permisos", hint: "CRUD de dbo.SYS_USR_PERMISSIONS (DEVISS)." }
];
var ACCESS_MODES = [
  { value: "off", label: "Sin acceso" },
  { value: "allow", label: "Permitido" },
  { value: "filtered", label: "Filtrado (filter)" }
];
var FLAG_KEYS = new Set(FLAG_DEFS.map((f) => f.key));
function roleDescripcion(permisos) {
  const d = permisos?.descripcion;
  return d != null && String(d).trim() ? String(d).trim() : "";
}
function roleNamedisplay(permisos) {
  const d = permisos?.namedisplay;
  return d != null && String(d).trim() ? String(d).trim() : "";
}
function userRoles(permisos) {
  const r = permisos?.roles;
  return Array.isArray(r) ? r.map((x) => String(x).trim().toUpperCase()).filter(Boolean) : [];
}

// src/js/tools/permisosKanbanShared.js
init_roleCanonicalMeta();
var USR_ROLE = "USR";
var ROLE_ACCENTS = ["#1e90ff", "#10b981", "#a855f7", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];
var ROLE_ICONS = ["mdi:shield-account", "mdi:file-document-edit-outline", "mdi:code-braces", "mdi:robot-outline", "mdi:eye-outline", "mdi:account-group-outline"];
function permEntryKey(entry) {
  return String(entry?.iusuario ?? entry?.ientity ?? "").trim();
}
function roleNameFromEntry(entry) {
  return permEntryKey(entry).toUpperCase().replace(/^ROLE:/i, "");
}
function formatRoleTitle2(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  if (key === "USR") return "Usuario";
  if (key === "ADMN") return "Admn";
  if (key === "DEVISS") return "Dev ISS";
  if (key === "AUDITOR") return "Auditor";
  return key;
}
function roleTitleFromEntry(entry) {
  const roleName = roleNameFromEntry(entry);
  const canon = canonicalRoleMeta(roleName);
  if (canon?.namedisplay) return canon.namedisplay;
  const namedisplay = roleNamedisplay(entry?.permisos);
  const formatted = formatRoleTitle2(roleName);
  if (!namedisplay) return formatted;
  if (formatted.length > namedisplay.length) return formatted;
  return namedisplay;
}
function roleDescripcionFromEntry(entry) {
  const roleName = roleNameFromEntry(entry);
  const canon = canonicalRoleMeta(roleName);
  if (canon?.descripcion) return canon.descripcion;
  return roleDescripcion(entry?.permisos);
}
function themeForRole(roleName, index = 0, permisos = null) {
  const accent = permisos?.accent ?? permisos?.color;
  const icon = permisos?.icon;
  if (accent && icon) return { accent: String(accent), icon: String(icon) };
  const i = index % ROLE_ACCENTS.length;
  return { accent: ROLE_ACCENTS[i], icon: ROLE_ICONS[i % ROLE_ICONS.length] };
}
function userCardLabels(username, displayName, contact) {
  const user = String(username ?? "").trim().toUpperCase();
  const name = String(displayName ?? "").trim();
  const itercero = contact?.itercero != null ? String(contact.itercero).trim() : "";
  const rawC = contact?.icontacto;
  const icontacto = rawC != null && rawC !== "" ? String(rawC).trim() : "";
  const idsCaption = itercero || icontacto ? `(${itercero || "\u2014"}${icontacto ? ` / ${icontacto}` : ""})` : null;
  if (name) return { primary: name, secondary: idsCaption || user, idsCaption };
  return { primary: user, secondary: idsCaption, idsCaption };
}
function matchesUserFilter(username, displayName, query, contact) {
  const q = String(query ?? "").trim().toUpperCase();
  if (!q) return true;
  const u = String(username ?? "").trim().toUpperCase();
  const n = String(displayName ?? "").trim().toUpperCase();
  const itercero = String(contact?.itercero ?? "").trim().toUpperCase();
  const icontacto = String(contact?.icontacto ?? "").trim().toUpperCase();
  return u.includes(q) || n && n.includes(q) || itercero && itercero.includes(q) || icontacto && icontacto.includes(q);
}
function displayNameFromUserEntry(entry) {
  const fromMeta = entry?.permisos?.nombre ?? entry?.permisos?.namedisplay;
  return fromMeta != null && String(fromMeta).trim() ? String(fromMeta).trim() : null;
}
function normalizePermisosUsername(raw) {
  const s = String(raw ?? "").trim().toUpperCase();
  return s || null;
}
function buildUserDirectoryFromPermisos(users) {
  const map = {};
  for (const e of users ?? []) {
    const key = normalizePermisosUsername(permEntryKey(e));
    if (!key) continue;
    const name = displayNameFromUserEntry(e);
    if (name) map[key] = name;
  }
  return map;
}
function resolveDisplayName(username, userEntry, userDirectory) {
  const fromMeta = displayNameFromUserEntry(userEntry);
  if (fromMeta) return fromMeta;
  const key = normalizePermisosUsername(username);
  const fromDir = key ? userDirectory?.[key] : null;
  if (fromDir != null && String(fromDir).trim()) return String(fromDir).trim();
  return null;
}
function sortPermisosColumnsByMembers(columns) {
  return [...columns].sort((a, b) => {
    const byCount = b.users.length - a.users.length;
    if (byCount !== 0) return byCount;
    return a.sortIndex - b.sortIndex;
  });
}
function buildPermisosBoard(data, filters = {}) {
  const roles = data?.roles ?? [];
  const users = data?.users ?? [];
  const userQuery = filters.userSearch ?? "";
  const roleFiltersRaw = filters.roleFilters ?? filters.roleFilter ?? [];
  const roleFilters = (Array.isArray(roleFiltersRaw) ? roleFiltersRaw : [roleFiltersRaw]).map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean);
  const roleFilterSet = roleFilters.length ? new Set(roleFilters) : null;
  const userDirectory = filters.userDirectory ?? null;
  const contactos = filters.contactos && typeof filters.contactos === "object" ? filters.contactos : {};
  const filterActive = Boolean(String(userQuery ?? "").trim()) || Boolean(roleFilterSet?.size);
  const activeRoles2 = roles.filter((entry) => entry?.itipo !== "user" && entry?.bactivo !== false && roleNameFromEntry(entry));
  const columns = activeRoles2.map((entry, index) => {
    const roleName = roleNameFromEntry(entry);
    const theme2 = themeForRole(roleName, index, entry.permisos);
    return {
      id: roleName,
      roleName,
      title: roleTitleFromEntry(entry),
      descripcion: roleDescripcionFromEntry(entry),
      entry,
      accent: theme2.accent,
      icon: theme2.icon,
      sortIndex: index,
      users: [],
      roleFilteredOut: !!(roleFilterSet && !roleFilterSet.has(roleName))
    };
  }).filter((c) => {
    if (!c.id || c.id === USR_ROLE) return false;
    return true;
  });
  const colById = new Map(columns.map((c) => [c.id, c]));
  for (const userEntry of users) {
    const username = permEntryKey(userEntry).toUpperCase();
    const displayName = resolveDisplayName(username, userEntry, userDirectory);
    const contact = contactos[username] ?? null;
    if (!matchesUserFilter(username, displayName, userQuery, contact)) continue;
    for (const role of userRoles(userEntry.permisos)) {
      const col = colById.get(role);
      if (!col) continue;
      if (roleFilterSet && !roleFilterSet.has(role)) continue;
      if (col.users.some((u) => u.username === username)) continue;
      const labels = userCardLabels(username, displayName, contact);
      col.users.push({
        id: `${username}@${role}`,
        username,
        displayName,
        labels,
        userEntry,
        itercero: contact?.itercero ?? null,
        icontacto: contact?.icontacto ?? null
      });
    }
  }
  for (const col of columns) {
    col.users.sort((a, b) => a.labels.primary.localeCompare(b.labels.primary, "es"));
  }
  const sorted = sortPermisosColumnsByMembers(columns);
  const hideEmpty = !!filters.hideEmptyColumns;
  const visible = hideEmpty ? sorted.filter((c) => c.users.length > 0 || roleFilterSet?.has(c.id)) : sorted;
  const noUsersVisible = filterActive && !columns.some((c) => c.users.length > 0);
  return { columns: visible, filterActive, noUsersVisible, hideEmptyColumns: hideEmpty };
}
function columnAtPoint(columnIds, listRefs, clientX, clientY) {
  for (const colId of columnIds) {
    const el = listRefs.current[colId];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return colId;
  }
  return null;
}
function pointInRef(ref, clientX, clientY) {
  const el = ref?.current;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

// src/js/tools/PermisosKanban.jsx
init_platform();

// src/js/tools/permisosRoleConfig.jsx
init_platform();

// src/js/editors/jsonEditor.jsx
init_platform();
import { jsx as jsx5 } from "react/jsx-runtime";

// src/js/tools/permisosRouteCatalog.js
var ROUTE_GROUPS = [
  {
    id: "conversaciones",
    title: "Conversaciones",
    routes: [
      { key: "QUERY:/api/conversaciones", label: "Listar conversaciones", scoped: true },
      { key: "GET:/api/conversacion/*", label: "Ver conversaci\xF3n", scoped: true },
      { key: "GET:/api/conversacion/logs/*", label: "Logs de conversaci\xF3n" },
      { key: "POST:/api/conversacion", label: "Crear conversaci\xF3n", scoped: true },
      { key: "POST:/api/mensaje", label: "Enviar mensaje", scoped: true },
      { key: "DELETE:/api/conversacion/*", label: "Eliminar conversaci\xF3n", scoped: true }
    ]
  },
  {
    id: "sistema",
    title: "Sistema",
    routes: [
      { key: "GET:/api/system/openai", label: "Leer config OpenAI" },
      { key: "PUT:/api/system/openai", label: "Guardar config OpenAI" },
      { key: "GET:/api/system/prompts-operativos", label: "Leer prompts operativos" },
      { key: "PUT:/api/system/prompts-operativos", label: "Guardar prompts operativos" },
      { key: "GET:/api/system/instrucciones", label: "Leer instrucciones PatyIA" },
      { key: "PUT:/api/system/instrucciones", label: "Guardar instrucciones PatyIA" },
      { key: "GET:/api/system/permisos", label: "Leer permisos" },
      { key: "PUT:/api/system/permisos", label: "Actualizar permisos" },
      { key: "PUT:/api/system/permisos/roles/*", label: "Editar rol" },
      { key: "PUT:/api/system/permisos/usuarios/*", label: "Editar usuario" },
      // Decisión 18-jul-2026: en InSoft NO usamos PATCH; el endpoint pasó a PUT.
      { key: "PUT:/api/system/permisos/usuarios/*/roles", label: "Asignar roles a usuario" },
      { key: "POST:/api/system/*", label: "POST sistema (wildcard)" },
      { key: "PUT:/api/system/*", label: "PUT sistema (wildcard)" }
    ]
  },
  {
    id: "patyia",
    title: "PatyIA",
    routes: [
      { key: "GET:/api/patyia/admin/roles", label: "Admin roles PatyIA" },
      { key: "PUT:/api/patyia/admin/roles/*", label: "Asignar rol contacto" },
      { key: "GET:/api/patyia/admin/acciones", label: "Admin acciones x rol" },
      { key: "PUT:/api/patyia/admin/acciones", label: "Upsert acci\xF3n x rol" }
    ]
  },
  {
    id: "documentacion",
    title: "Documentaci\xF3n",
    routes: [
      { key: "PUT:/api/swagger.json", label: "Swagger declarativo" }
    ]
  }
];
var CATALOG_KEYS = new Set(ROUTE_GROUPS.flatMap((g) => g.routes.map((r) => r.key)));

// src/js/tools/permisosRoleTransfer.js
function isTopDevLeadRole(roleName) {
  return String(roleName ?? "").trim().toUpperCase() === "DEVISS";
}
function isSamePermisosUser(a, b) {
  const x = String(a ?? "").trim().toUpperCase();
  const y = String(b ?? "").trim().toUpperCase();
  return !!x && x === y;
}
function moveRoleImpactBullets({ username, fromRoleTitle, toRoleTitle, isSelf, leavesDevLead }) {
  const user = String(username ?? "").trim().toUpperCase();
  const from = fromRoleTitle || "origen";
  const to = toRoleTitle || "destino";
  const bullets = [
    `${isSelf ? "Dejar\xE1s" : `${user} dejar\xE1`} de tener el rol **${from}** (solo quedar\xE1 en **${to}**).`,
    `${isSelf ? "Perder\xE1s" : "Perder\xE1"} permisos, rutas y privilegios asociados solo a **${from}**.`,
    `${isSelf ? "Desaparecer\xE1s" : "Desaparecer\xE1"} de la columna **${from}** en este tablero.`,
    "Los dem\xE1s roles que ya tenga el usuario no se modifican."
  ];
  if (leavesDevLead) {
    bullets.push(
      isSelf ? "Al salir de **DEVISS** (m\xE1ximo privilegio) perder\xE1s gesti\xF3n de permisos hasta que otro DEVISS te reasigne o un administrador ajuste la BD." : `Al salir de **DEVISS**, ${user} necesitar\xE1 que otro DEVISS lo reasigne o un ajuste manual en BD para recuperar el rol.`
    );
  }
  return bullets;
}
function removeRoleImpactBullets({ username, roleTitle, isSelf, isDevLead }) {
  const user = String(username ?? "").trim().toUpperCase();
  const role = roleTitle || "rol";
  const bullets = [
    `${isSelf ? "Perder\xE1s" : "Perder\xE1"} permisos, rutas y privilegios de **${role}**.`,
    `${isSelf ? "Dejar\xE1s" : "Dejar\xE1"} de aparecer en la columna **${role}** del tablero.`,
    "Los otros roles asignados no cambian."
  ];
  if (isDevLead) {
    bullets.push(
      isSelf ? "Si te quitas **DEVISS**, otro DEVISS deber\xE1 reasignarte o habr\xE1 que corregirlo en BD." : `Para restaurar **DEVISS** en ${user}, otro DEVISS deber\xE1 volver a asignar el rol.`
    );
  } else {
    bullets.push("Para restaurar el acceso, un DEVISS puede volver a asignar el rol.");
  }
  return bullets;
}
function canAddUserToRole({ username } = {}) {
  if (!String(username ?? "").trim()) {
    return { ok: false, reason: "Indique un usuario." };
  }
  return { ok: true };
}

// src/js/tools/PermisosUserAutocomplete.jsx
init_platform();
init_systemConfigApi();
import { jsx as jsx6 } from "react/jsx-runtime";
import { createElement } from "react";
var { useState: useState3, useEffect: useEffect3, useRef, useCallback } = getReact();
var { Autocomplete, TextField, Typography: Typography3, Box: Box3 } = getMaterialUI();
var DEBOUNCE_MS = 300;
var DEFAULT_LIMIT = 10;
function optionLabel(row) {
  if (!row) return "";
  return row.displayName ? `${row.displayName} (${row.username})` : row.username;
}
function usernameFromInput(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const paren = raw.match(/\(([A-Z0-9_.$-]+)\)\s*$/i);
  if (paren) return normalizePermisosUsername(paren[1]);
  return normalizePermisosUsername(raw.split(/\s+/)[0]);
}
function PermisosUserAutocomplete({
  value,
  onChange,
  disabled = false,
  label = "Usuario",
  roleFilter = null,
  allowNew = true,
  limit = DEFAULT_LIMIT,
  variant = "dialog",
  placeholder,
  className,
  sx
}) {
  const toolbar = variant === "toolbar";
  const username = value ? normalizePermisosUsername(value) : null;
  const [inputValue, setInputValue] = useState3("");
  const [options, setOptions] = useState3([]);
  const [loading, setLoading] = useState3(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const selected = username ? options.find((o) => o.username === username) ?? (username ? { username, displayName: null } : null) : null;
  const runSearch = useCallback(async (query) => {
    const id = ++requestIdRef.current;
    setLoading(true);
    try {
      const users = await searchPermisosUsers(query, {
        ...roleFilter ? { role: roleFilter } : {},
        limit
      });
      if (id !== requestIdRef.current) return users;
      setOptions(users);
      return users;
    } catch {
      if (id === requestIdRef.current) setOptions([]);
      return [];
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, [roleFilter, limit]);
  const scheduleSearch = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, DEBOUNCE_MS);
  }, [runSearch]);
  useEffect3(() => {
    if (!username) {
      setInputValue("");
      return;
    }
    if (value && username !== normalizePermisosUsername(value)) {
      onChange(username);
      return;
    }
    const match = options.find((o) => o.username === username);
    setInputValue(match ? optionLabel(match) : username);
  }, [value, username, options, onChange]);
  useEffect3(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);
  useEffect3(() => {
    if (disabled) return;
    runSearch("");
  }, [disabled, runSearch]);
  if (disabled) {
    return /* @__PURE__ */ jsx6(
      TextField,
      {
        label,
        fullWidth: !toolbar,
        size: "small",
        value: username || "",
        disabled: true,
        placeholder: "Sin usuario",
        className,
        sx
      }
    );
  }
  const ph = placeholder ?? (toolbar ? "Buscar usuario\u2026" : "Buscar login ISS\u2026");
  return /* @__PURE__ */ jsx6(
    Autocomplete,
    {
      fullWidth: !toolbar,
      size: "small",
      openOnFocus: true,
      autoHighlight: true,
      clearOnBlur: false,
      selectOnFocus: true,
      handleHomeEndKeys: true,
      freeSolo: allowNew,
      loading,
      options,
      value: selected,
      inputValue,
      filterOptions: (x) => x,
      getOptionLabel: optionLabel,
      isOptionEqualToValue: (a, b) => String(a?.username) === String(b?.username),
      noOptionsText: loading ? "Buscando\u2026" : toolbar ? "Sin coincidencias" : "Sin coincidencias \u2014 escriba login",
      loadingText: "Buscando\u2026",
      className,
      sx,
      onOpen: () => {
        if (!options.length) runSearch(inputValue);
      },
      onInputChange: (_e, text, reason) => {
        if (reason === "reset") return;
        setInputValue(text);
        scheduleSearch(text);
        if (allowNew) {
          const u = usernameFromInput(text);
          onChange(u);
        }
      },
      onChange: (_e, row) => {
        if (typeof row === "string") {
          const u = usernameFromInput(row);
          onChange(u);
          setInputValue(u ?? "");
          return;
        }
        onChange(row?.username ?? null);
        setInputValue(row ? optionLabel(row) : "");
      },
      renderOption: (props, row) => /* @__PURE__ */ createElement(Box3, { component: "li", ...props, key: row.username, sx: { display: "flex", flexDirection: "column", py: 0.75 } }, /* @__PURE__ */ jsx6(Typography3, { variant: "body2", sx: { fontWeight: 600 }, children: row.displayName || row.username }), row.displayName ? /* @__PURE__ */ jsx6(Typography3, { variant: "caption", color: "text.secondary", children: row.username }) : null),
      renderInput: (params) => /* @__PURE__ */ jsx6(
        TextField,
        {
          ...params,
          label: toolbar ? "" : label,
          placeholder: ph,
          InputLabelProps: { ...params.InputLabelProps, shrink: toolbar ? false : true },
          helperText: toolbar ? void 0 : allowNew ? "Usuarios en permisos ISS o login nuevo" : "Usuarios registrados en permisos ISS",
          sx: toolbar ? {
            "& .MuiOutlinedInput-root": { height: 28, minHeight: 28, maxHeight: 28, py: 0 },
            "& .MuiOutlinedInput-input": { py: "4px", fontSize: "0.8125rem", fontWeight: 600 },
            "& .MuiInputLabel-root": { display: "none" },
            "& .MuiOutlinedInput-notchedOutline legend": { width: 0, padding: 0 }
          } : void 0
        }
      )
    }
  );
}

// src/js/tools/permisosVisitante.js
var VISITANTE_DEFAULT_PERMISOS = {
  namedisplay: "Usuario",
  descripcion: "Usuario \u2014 solo sus propias conversaciones; logs abiertos; resto lectura",
  "QUERY:/api/conversaciones": { filter: { ...SESSION_OWNER_FILTER } },
  "GET:/api/conversacion/*": { filter: { ...SESSION_OWNER_FILTER } },
  "GET:/api/conversacion/logs/*": true,
  "POST:/api/conversacion": { filter: { ...SESSION_OWNER_FILTER } },
  "POST:/api/mensaje": { filter: { ...SESSION_OWNER_FILTER } },
  "DELETE:/api/conversacion/*": { filter: { ...SESSION_OWNER_FILTER } }
};

// src/js/tools/permisosRoleConfig.jsx
import { Fragment as Fragment2, jsx as jsx7, jsxs as jsxs4 } from "react/jsx-runtime";
var { useState: useState4, useEffect: useEffect4, useMemo: useMemo3 } = getReact();
var {
  Typography: Typography4,
  TextField: TextField2,
  Stack: Stack3,
  Alert,
  Chip: Chip3,
  Box: Box4,
  Checkbox,
  FormControlLabel,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  DialogContent: DialogContent2,
  DialogActions,
  Button,
  Tooltip: Tooltip2,
  CircularProgress
} = getMaterialUI();
var { Icon: Icon2 } = UI;
function renderImpactLine(text) {
  const parts = String(text ?? "").split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? /* @__PURE__ */ jsx7("strong", { children: part }, i) : part);
}
var MODE_LABEL = Object.fromEntries(ACCESS_MODES.map((m) => [m.value, m.label]));
function RoleDragDialog({ open, pending, busy, sessionUsername, onClose, onConfirm }) {
  if (!pending) return null;
  const { username, fromRole, toRole, fromRoleTitle, toRoleTitle } = pending;
  const fromLabel = fromRoleTitle || fromRole;
  const toLabel = toRoleTitle || toRole;
  const isSelf = isSamePermisosUser(username, sessionUsername);
  const leavesDevLead = isTopDevLeadRole(fromRole);
  const moveBullets = moveRoleImpactBullets({ username, fromRoleTitle: fromLabel, toRoleTitle: toLabel, isSelf, leavesDevLead });
  return /* @__PURE__ */ jsxs4(
    GlassDialog,
    {
      open,
      onClose: busy ? void 0 : onClose,
      maxWidth: "sm",
      fullWidth: true,
      disableEscapeKeyDown: busy,
      header: /* @__PURE__ */ jsx7(
        GlassDialogHeader,
        {
          icon: "mdi:alert-outline",
          title: "Confirmar movimiento",
          subtitle: `${username}: ${fromLabel} \u2192 ${toLabel}`,
          accent: "#f59e0b",
          onClose: busy ? void 0 : onClose
        }
      ),
      children: [
        /* @__PURE__ */ jsxs4(DialogContent2, { sx: glassDialogContentSx({ p: 2.5 }), children: [
          /* @__PURE__ */ jsxs4(Alert, { severity: "warning", sx: { mb: 2 }, children: [
            "Mover implica ",
            /* @__PURE__ */ jsx7("strong", { children: "quitar" }),
            " a ",
            isSelf ? "ti" : username,
            " de ",
            /* @__PURE__ */ jsx7("strong", { children: fromLabel }),
            ". Revisa el impacto antes de confirmar."
          ] }),
          /* @__PURE__ */ jsxs4(Typography4, { variant: "body2", color: "text.secondary", sx: { mb: 1.5 }, children: [
            username,
            " pasar\xE1 de ",
            /* @__PURE__ */ jsx7("strong", { children: fromLabel }),
            " a ",
            /* @__PURE__ */ jsx7("strong", { children: toLabel }),
            "."
          ] }),
          /* @__PURE__ */ jsx7(Box4, { component: "ul", sx: { m: 0, pl: 2.25, color: "text.secondary", fontSize: "0.875rem", "& li": { mb: 0.75 } }, children: moveBullets.map((line) => /* @__PURE__ */ jsx7("li", { children: renderImpactLine(line) }, line)) })
        ] }),
        /* @__PURE__ */ jsxs4(DialogActions, { sx: glassDialogActionsSx(), children: [
          /* @__PURE__ */ jsx7(Button, { onClick: onClose, disabled: busy, sx: { textTransform: "none" }, children: "Cancelar" }),
          /* @__PURE__ */ jsx7(
            Button,
            {
              variant: "contained",
              color: "warning",
              disabled: busy,
              onClick: () => {
                if (!busy) onConfirm("move");
              },
              sx: { textTransform: "none", minWidth: 140 },
              startIcon: busy ? /* @__PURE__ */ jsx7(CircularProgress, { size: 16, color: "inherit" }) : /* @__PURE__ */ jsx7(Icon2, { icon: "mdi:arrow-right-bold", size: 18 }),
              children: busy ? "Moviendo\u2026" : "Confirmar movimiento"
            }
          )
        ] })
      ]
    }
  );
}
function RoleAddDialog({ open, pending, busy, onClose, onConfirm }) {
  const [username, setUsername] = useState4(null);
  useEffect4(() => {
    if (open) setUsername(null);
  }, [open]);
  if (!pending) return null;
  const { roleTitle, role, existingUsernames } = pending;
  const roleLabel2 = roleTitle || role;
  const alreadyInRole = username && existingUsernames?.has(String(username).trim().toUpperCase());
  const addCheck = username && !alreadyInRole ? canAddUserToRole({ username }) : { ok: true };
  return /* @__PURE__ */ jsxs4(
    GlassDialog,
    {
      open,
      onClose: busy ? void 0 : onClose,
      maxWidth: "sm",
      fullWidth: true,
      header: /* @__PURE__ */ jsx7(GlassDialogHeader, { icon: "mdi:account-plus-outline", title: "Agregar al rol", subtitle: roleLabel2, accent: "#10b981", onClose: busy ? void 0 : onClose }),
      children: [
        /* @__PURE__ */ jsxs4(DialogContent2, { sx: glassDialogContentSx({ p: 2.5 }), children: [
          /* @__PURE__ */ jsxs4(Typography4, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: [
            "Busque un usuario en permisos ISS o escriba un login nuevo para asignarlo al rol ",
            /* @__PURE__ */ jsx7("strong", { children: roleLabel2 }),
            "."
          ] }),
          /* @__PURE__ */ jsx7(PermisosUserAutocomplete, { value: username, onChange: setUsername, disabled: busy, label: "Usuario" }),
          alreadyInRole ? /* @__PURE__ */ jsx7(Alert, { severity: "warning", sx: { mt: 1.5 }, children: "Este usuario ya est\xE1 en el rol." }) : null,
          username && !alreadyInRole && !addCheck.ok ? /* @__PURE__ */ jsx7(Alert, { severity: "warning", sx: { mt: 1.5 }, children: addCheck.reason }) : null
        ] }),
        /* @__PURE__ */ jsxs4(DialogActions, { sx: glassDialogActionsSx(), children: [
          /* @__PURE__ */ jsx7(Button, { onClick: onClose, disabled: busy, sx: { textTransform: "none" }, children: "Cancelar" }),
          /* @__PURE__ */ jsx7(
            Button,
            {
              variant: "contained",
              disabled: busy || !username || alreadyInRole || !addCheck.ok,
              onClick: () => onConfirm(username),
              sx: { textTransform: "none", minWidth: 120 },
              startIcon: busy ? /* @__PURE__ */ jsx7(CircularProgress, { size: 16, color: "inherit" }) : /* @__PURE__ */ jsx7(Icon2, { icon: "mdi:account-plus-outline", size: 18 }),
              children: busy ? "Agregando\u2026" : "Agregar"
            }
          )
        ] })
      ]
    }
  );
}
function RoleRemoveDialog({ open, pending, busy, sessionUsername, onClose, onConfirm }) {
  if (!pending) return null;
  const { username, roleTitle, role } = pending;
  const roleLabel2 = roleTitle || role;
  const isSelf = isSamePermisosUser(username, sessionUsername);
  const isDevLead = isTopDevLeadRole(role);
  const bullets = removeRoleImpactBullets({ username, roleTitle: roleLabel2, isSelf, isDevLead });
  return /* @__PURE__ */ jsxs4(
    GlassDialog,
    {
      open,
      onClose: busy ? void 0 : onClose,
      maxWidth: "sm",
      fullWidth: true,
      disableEscapeKeyDown: busy,
      header: /* @__PURE__ */ jsx7(GlassDialogHeader, { icon: "mdi:account-remove-outline", title: "Quitar del rol", subtitle: `${username} \xB7 ${roleLabel2}`, accent: "#f59e0b", onClose: busy ? void 0 : onClose }),
      children: [
        /* @__PURE__ */ jsxs4(DialogContent2, { sx: glassDialogContentSx({ p: 2.5 }), children: [
          /* @__PURE__ */ jsx7(Alert, { severity: "warning", sx: { mb: 2 }, children: isSelf && isDevLead ? "Te quitar\xE1s DEVISS (m\xE1ximo privilegio). Otro DEVISS o un ajuste en BD ser\xE1 necesario para recuperarlo." : "Esta acci\xF3n revoca permisos de forma inmediata. Revise las consecuencias antes de confirmar." }),
          /* @__PURE__ */ jsxs4(Typography4, { variant: "body2", color: "text.secondary", sx: { mb: 1.5 }, children: [
            "\xBFQuitar a ",
            /* @__PURE__ */ jsx7("strong", { children: username }),
            " del rol ",
            /* @__PURE__ */ jsx7("strong", { children: roleLabel2 }),
            "?"
          ] }),
          /* @__PURE__ */ jsx7(Box4, { component: "ul", sx: { m: 0, pl: 2.25, color: "text.secondary", fontSize: "0.875rem", "& li": { mb: 0.75 } }, children: bullets.map((line) => /* @__PURE__ */ jsx7("li", { children: renderImpactLine(line) }, line)) })
        ] }),
        /* @__PURE__ */ jsxs4(DialogActions, { sx: glassDialogActionsSx(), children: [
          /* @__PURE__ */ jsx7(Button, { onClick: onClose, disabled: busy, sx: { textTransform: "none" }, children: "Cancelar" }),
          /* @__PURE__ */ jsx7(
            Button,
            {
              variant: "contained",
              color: "warning",
              disabled: busy,
              onClick: onConfirm,
              sx: { textTransform: "none", minWidth: 120 },
              startIcon: busy ? /* @__PURE__ */ jsx7(CircularProgress, { size: 16, color: "inherit" }) : /* @__PURE__ */ jsx7(Icon2, { icon: "mdi:account-remove-outline", size: 18 }),
              children: busy ? "Quitando\u2026" : "Confirmar"
            }
          )
        ] })
      ]
    }
  );
}

// src/js/tools/PermisosKanban.jsx
import { Fragment as Fragment3, jsx as jsx8, jsxs as jsxs5 } from "react/jsx-runtime";
var { useState: useState5, useMemo: useMemo4, useRef: useRef2, useEffect: useEffect5, memo } = getReact();
var { createPortal } = getReactDOM();
var { Box: Box5, Paper, Typography: Typography5, Stack: Stack4, Chip: Chip4, IconButton: IconButton2, Tooltip: Tooltip3, CircularProgress: CircularProgress2 } = getMaterialUI();
var { Icon: Icon3 } = UI;
var DRAG_THRESHOLD_PX = 6;
var UserCard = memo(function UserCard2({ card, columnId, columnTitle, canDragUser, isDragSource, userBusy, isSelected, isDimmed, onPointerDragStart, onRoleRemoveRequest, onUserSelect, onUserSummary, suppressClickRef }) {
  const canDragRole = !!canDragUser && !userBusy;
  const labels = card.labels ?? userCardLabels(card.username, card.displayName);
  const cardClass = [
    "paty-todos-card",
    "paty-permisos-user-card",
    "isa-glass-card",
    canDragRole ? "paty-todos-card--draggable" : "",
    isDragSource ? "paty-todos-card--drag-source" : "",
    userBusy ? "paty-permisos-user-card--user-busy" : "",
    isSelected ? "paty-permisos-user-card--selected" : "",
    isDimmed ? "paty-permisos-user-card--dimmed" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx8(
    Paper,
    {
      className: cardClass,
      elevation: 0,
      "aria-busy": userBusy || void 0,
      onPointerDown: canDragRole ? (e) => {
        if (e.button !== 0 && e.pointerType !== "touch") return;
        if (e.target.closest(".paty-permisos-user-card__remove, .paty-permisos-user-card__busy")) return;
        onPointerDragStart(card.id, columnId, card.username, e);
      } : void 0,
      onClick: (e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        if (userBusy || e.target.closest(".paty-permisos-user-card__remove, .paty-permisos-user-card__busy")) return;
        e.stopPropagation();
        onUserSelect?.(card.username);
      },
      onDoubleClick: (e) => {
        if (userBusy || e.target.closest(".paty-permisos-user-card__remove, .paty-permisos-user-card__busy")) return;
        e.stopPropagation();
        onUserSummary?.(card.username);
      },
      children: /* @__PURE__ */ jsxs5(Stack4, { direction: "row", alignItems: "center", spacing: 0.25, className: "paty-permisos-user-card__row", sx: { minWidth: 0 }, children: [
        /* @__PURE__ */ jsx8(Box5, { className: "paty-permisos-user-card__body", sx: { minWidth: 0, flex: 1 }, children: /* @__PURE__ */ jsxs5(Typography5, { className: "paty-todos-card__title", component: "div", variant: "body2", fontWeight: 700, noWrap: true, title: [labels.primary, labels.idsCaption].filter(Boolean).join(" "), children: [
          /* @__PURE__ */ jsx8("span", { className: "paty-permisos-user-card__name", children: labels.primary }),
          labels.idsCaption ? /* @__PURE__ */ jsxs5("span", { className: "paty-todos-card__caption paty-permisos-user-card__ids", children: [
            " ",
            labels.idsCaption
          ] }) : null
        ] }) }),
        userBusy ? /* @__PURE__ */ jsx8(Tooltip3, { title: "Procesando\u2026", children: /* @__PURE__ */ jsx8("span", { className: "paty-permisos-user-card__busy", "aria-label": "Procesando", children: /* @__PURE__ */ jsx8(CircularProgress2, { size: 14, thickness: 5, color: "inherit" }) }) }) : canDragRole ? /* @__PURE__ */ jsx8(Tooltip3, { title: `Quitar de ${columnTitle || columnId}`, children: /* @__PURE__ */ jsx8("span", { className: "paty-permisos-user-card__remove-wrap", children: /* @__PURE__ */ jsx8(
          IconButton2,
          {
            size: "small",
            type: "button",
            className: "paty-permisos-user-card__remove",
            "aria-label": `Quitar de ${columnTitle || columnId}`,
            onPointerDown: (e) => {
              e.stopPropagation();
            },
            onClick: (e) => {
              e.stopPropagation();
              e.preventDefault();
              onRoleRemoveRequest?.({ cardId: card.id, username: card.username, role: columnId, roleTitle: columnTitle });
            },
            children: /* @__PURE__ */ jsx8(Icon3, { icon: "mdi:close", size: 14 })
          }
        ) }) }) : null
      ] })
    }
  );
});
function DragGhost({ card, column, x, y, width }) {
  if (column) {
    const node2 = /* @__PURE__ */ jsx8(
      Paper,
      {
        className: "paty-todos-card paty-permisos-column-ghost paty-todos-card--ghost isa-glass-card",
        elevation: 8,
        style: { position: "fixed", left: x, top: y, width, zIndex: 1e4, pointerEvents: "none", margin: 0 },
        "aria-hidden": true,
        children: /* @__PURE__ */ jsxs5(Stack4, { direction: "row", alignItems: "center", spacing: 0.75, sx: { minWidth: 0 }, children: [
          /* @__PURE__ */ jsx8(Icon3, { icon: column.icon, size: 16 }),
          /* @__PURE__ */ jsx8(Typography5, { className: "paty-todos-card__title", variant: "body2", fontWeight: 700, noWrap: true, children: column.title })
        ] })
      }
    );
    return typeof document !== "undefined" ? createPortal(node2, document.body) : node2;
  }
  if (!card) return null;
  const labels = card.labels ?? userCardLabels(card.username, card.displayName);
  const node = /* @__PURE__ */ jsx8(
    Paper,
    {
      className: "paty-todos-card paty-permisos-user-card paty-permisos-drag-ghost paty-todos-card--ghost isa-glass-card",
      elevation: 8,
      style: { position: "fixed", left: x, top: y, width, zIndex: 1e4, pointerEvents: "none", margin: 0 },
      "aria-hidden": true,
      children: /* @__PURE__ */ jsxs5(Typography5, { className: "paty-todos-card__title", variant: "body2", fontWeight: 700, noWrap: true, children: [
        /* @__PURE__ */ jsx8("span", { className: "paty-permisos-user-card__name", children: labels.primary }),
        labels.idsCaption ? /* @__PURE__ */ jsxs5("span", { className: "paty-todos-card__caption paty-permisos-user-card__ids", children: [
          " ",
          labels.idsCaption
        ] }) : null
      ] })
    }
  );
  return typeof document !== "undefined" ? createPortal(node, document.body) : node;
}
function PermisosKanban({ boardData, loggedIn, canAssignRoles, readOnly, canManage, canEditRoleDescriptions, busy, sessionUsername, filterToolbarRef, onUserFilterDrop, onRoleFilterDrop, onDragOverFilterChange, onRoleDrag, onRoleRemove, onRoleAdd, onUserSummary }) {
  const [dragOverCol, setDragOverCol] = useState5(null);
  const [draggingId, setDraggingId] = useState5(null);
  const [dragGhost, setDragGhost] = useState5(null);
  const [configCol] = useState5(null);
  const [dragPending, setDragPending] = useState5(null);
  const [removePending, setRemovePending] = useState5(null);
  const [addPending, setAddPending] = useState5(null);
  const [addingRoleId, setAddingRoleId] = useState5(null);
  const [processingUsername, setProcessingUsername] = useState5(null);
  const [selectedUsername, setSelectedUsername] = useState5(null);
  const [dragSourceCol, setDragSourceCol] = useState5(null);
  const columns = boardData?.columns ?? [];
  const listRefs = useRef2({});
  const columnRefs = useRef2({});
  const dragRef = useRef2(null);
  const cardElRef = useRef2(null);
  const suppressClickRef = useRef2(false);
  const processingUserRef = useRef2(null);
  const kanbanWrapRef = useRef2(null);
  const dragPendingRef = useRef2(null);
  const filterActive = !!boardData?.filterActive;
  const assignEnabled = !!loggedIn && !!canAssignRoles;
  const filterDragEnabled = !!loggedIn && !canAssignRoles;
  const noUsersVisible = !!boardData?.noUsersVisible;
  const columnIds = useMemo4(() => columns.map((c) => c.id), [columns]);
  const ghostColumn = useMemo4(() => {
    if (!dragGhost?.columnId) return null;
    return columns.find((c) => c.id === dragGhost.columnId) ?? null;
  }, [dragGhost, columns]);
  const ghostCard = useMemo4(() => {
    if (!dragGhost?.cardId) return null;
    for (const col of columns) {
      const hit = col.users.find((u) => u.id === dragGhost.cardId);
      if (hit) return hit;
    }
    return null;
  }, [dragGhost, columns]);
  const selectedUserKey = selectedUsername ? String(selectedUsername).trim().toUpperCase() : null;
  const processingUserKey = processingUsername ? String(processingUsername).trim().toUpperCase() : null;
  useEffect5(() => {
    dragPendingRef.current = dragPending;
  }, [dragPending]);
  function userKey(username) {
    return String(username ?? "").trim().toUpperCase();
  }
  function beginUserProcessing(username) {
    const key = userKey(username);
    if (!key || processingUserRef.current) return null;
    processingUserRef.current = key;
    setProcessingUsername(key);
    return key;
  }
  function endUserProcessing() {
    processingUserRef.current = null;
    setProcessingUsername(null);
  }
  useEffect5(() => {
    function onDocPointerDown(e) {
      if (e.target.closest(".paty-permisos-user-card")) return;
      if (e.target.closest(".MuiDialog-root, .isa-glass-dialog")) return;
      setSelectedUsername(null);
    }
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, []);
  function handleUserSelect(username) {
    const key = String(username ?? "").trim().toUpperCase();
    if (!key || processingUserKey === key) return;
    setSelectedUsername((prev) => prev && String(prev).trim().toUpperCase() === key ? null : key);
  }
  async function handleRemoveConfirm() {
    if (!removePending || !onRoleRemove || processingUserRef.current) return;
    if (!beginUserProcessing(removePending.username)) return;
    try {
      await onRoleRemove(removePending);
      setRemovePending(null);
    } catch {
    } finally {
      endUserProcessing();
    }
  }
  async function handleDragConfirm() {
    const pending = dragPendingRef.current;
    if (!pending || !onRoleDrag || processingUserRef.current) return;
    if (!beginUserProcessing(pending.username)) return;
    setDragPending(null);
    try {
      await onRoleDrag({ ...pending, mode: "move" });
    } catch {
    } finally {
      endUserProcessing();
    }
  }
  async function handleAddConfirm(username) {
    if (!addPending || !onRoleAdd || addingRoleId || !username) return;
    setAddingRoleId(addPending.role);
    try {
      await onRoleAdd({ username, role: addPending.role, roleTitle: addPending.roleTitle });
      setAddPending(null);
    } catch {
    } finally {
      setAddingRoleId(null);
    }
  }
  function finishDrag(clientX, clientY) {
    const state = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    setDragOverCol(null);
    setDragSourceCol(null);
    setDragGhost(null);
    cardElRef.current = null;
    if (!state?.moved) return;
    suppressClickRef.current = true;
    if (filterToolbarRef && pointInRef(filterToolbarRef, clientX, clientY)) {
      if (state.kind === "column") onRoleFilterDrop?.(state.columnId);
      else if (state.username && filterDragEnabled) onUserFilterDrop?.(state.username);
      return;
    }
    if (state.kind === "column") return;
    if (!assignEnabled) return;
    if (processingUserRef.current) return;
    const targetCol = columnAtPoint(columnIds, columnRefs, clientX, clientY);
    if (!targetCol || targetCol === state.sourceColumnId) return;
    const username = state.username;
    if (processingUserRef.current && userKey(username) === processingUserRef.current) return;
    const fromRole = state.sourceColumnId;
    const toRole = targetCol;
    const sourceColData = columns.find((c) => c.id === fromRole);
    const targetColData = columns.find((c) => c.id === toRole);
    if (targetColData?.users?.some((u) => u.username === username)) return;
    if (!assignEnabled) return;
    setDragPending({
      username: userKey(username),
      fromRole,
      toRole,
      fromRoleTitle: sourceColData?.title ?? fromRole,
      toRoleTitle: targetColData?.title ?? toRole
    });
  }
  function handleColumnHeadDragStart(col, e) {
    if (!filterDragEnabled) return;
    if (e.target.closest("button, .MuiIconButton-root")) return;
    if (processingUserRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      kind: "column",
      columnId: col.id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      ghostWidth: rect.width,
      moved: false,
      pointerId: e.pointerId
    };
    cardElRef.current = e.currentTarget;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
    }
  }
  function handlePointerDragStart(cardId, sourceColumnId, username, e) {
    const key = userKey(username);
    if (processingUserRef.current && key === processingUserRef.current) return;
    if (!assignEnabled) return;
    const sourceColData = columns.find((c) => c.id === sourceColumnId);
    if (!assignEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      kind: "user",
      cardId,
      sourceColumnId,
      username,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      ghostWidth: rect.width,
      moved: false,
      pointerId: e.pointerId
    };
    cardElRef.current = e.currentTarget;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
    }
  }
  useEffect5(() => {
    function onPointerMove(e) {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      const dx = Math.abs(e.clientX - state.startX);
      const dy = Math.abs(e.clientY - state.startY);
      if (!state.moved && dx + dy < DRAG_THRESHOLD_PX) return;
      if (!state.moved) {
        state.moved = true;
        if (state.kind === "column") setDraggingId(`col:${state.columnId}`);
        else setDraggingId(state.cardId);
        setDragSourceCol(state.sourceColumnId ?? null);
        if (state.ghostWidth != null) {
          setDragGhost({
            cardId: state.cardId,
            columnId: state.columnId,
            x: e.clientX - state.offsetX,
            y: e.clientY - state.offsetY,
            width: state.ghostWidth
          });
        }
      }
      e.preventDefault();
      if (state.ghostWidth != null) {
        setDragGhost({ cardId: state.cardId, columnId: state.columnId, x: e.clientX - state.offsetX, y: e.clientY - state.offsetY, width: state.ghostWidth });
      }
      const overFilter = filterToolbarRef && pointInRef(filterToolbarRef, e.clientX, e.clientY);
      onDragOverFilterChange?.(!!overFilter);
      if (overFilter || state.kind === "column") setDragOverCol(null);
      else setDragOverCol(assignEnabled ? columnAtPoint(columnIds, columnRefs, e.clientX, e.clientY) : null);
    }
    function onPointerUp(e) {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      onDragOverFilterChange?.(false);
      finishDrag(e.clientX, e.clientY);
    }
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [assignEnabled, columnIds, columns, processingUserKey, filterToolbarRef, onDragOverFilterChange, loggedIn, canAssignRoles]);
  if (!boardData) return null;
  const transferBusy = !!processingUserKey;
  const removeBusy = transferBusy && !!removePending;
  const addBusy = !!addingRoleId;
  return /* @__PURE__ */ jsxs5(Box5, { ref: kanbanWrapRef, className: "paty-todos-kanban-wrap paty-permisos-kanban-wrap", sx: { flex: 1, minHeight: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", p: 0 }, children: [
    /* @__PURE__ */ jsxs5(Box5, { className: `paty-todos-kanban paty-permisos-kanban${!assignEnabled ? " paty-permisos-kanban--no-assign" : ""}${draggingId ? " paty-todos-kanban--dragging" : ""}${selectedUserKey ? " paty-permisos-kanban--user-selected" : ""}${processingUserKey ? " paty-permisos-kanban--user-busy" : ""}`, sx: { flex: 1, minHeight: 0, maxHeight: "100%", display: "flex", alignItems: "stretch", alignSelf: "stretch", position: "relative" }, children: [
      dragGhost ? /* @__PURE__ */ jsx8(DragGhost, { card: ghostCard, column: ghostColumn, x: dragGhost.x, y: dragGhost.y, width: dragGhost.width }) : null,
      noUsersVisible ? /* @__PURE__ */ jsx8(Box5, { sx: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", p: 3, pointerEvents: "none", zIndex: 2 }, children: /* @__PURE__ */ jsx8(Typography5, { variant: "body2", color: "text.secondary", children: "Ning\xFAn usuario coincide con los filtros." }) }) : null,
      columns.length === 0 ? /* @__PURE__ */ jsx8(Box5, { sx: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }, children: /* @__PURE__ */ jsx8(Typography5, { variant: "body2", color: "text.secondary", children: boardData?.hideEmptyColumns ? "No hay columnas visibles (activa roles o desactiva \xABOcultar vac\xEDos\xBB)." : "No hay roles configurados." }) }) : null,
      columns.map((col) => {
        const canManageCol = assignEnabled;
        const canDropOnCol = canManageCol;
        const isOver = draggingId && !String(draggingId).startsWith("col:") && dragOverCol === col.id;
        const isOverAllowed = isOver && canDropOnCol;
        const isOverBlocked = isOver && !canDropOnCol;
        const isSource = draggingId && !String(draggingId).startsWith("col:") && dragSourceCol === col.id;
        const colClass = [
          "paty-todos-column",
          "paty-permisos-column",
          col.roleFilteredOut ? "paty-permisos-column--role-filtered" : "",
          isOverAllowed ? "paty-permisos-column--drag-over" : "",
          isOverBlocked ? "paty-permisos-column--drop-blocked" : "",
          isSource && !isOver ? "paty-permisos-column--drag-source" : "",
          draggingId && !String(draggingId).startsWith("col:") && !isOver && assignEnabled && !canDropOnCol ? "paty-permisos-column--drop-forbidden" : "",
          draggingId && !String(draggingId).startsWith("col:") && !isOver ? "paty-permisos-column--drag-idle" : ""
        ].filter(Boolean).join(" ");
        return /* @__PURE__ */ jsxs5(
          Box5,
          {
            ref: (el) => {
              columnRefs.current[col.id] = el;
            },
            className: colClass,
            style: { "--col-accent": col.accent },
            sx: { display: "flex", flexDirection: "column", minHeight: 0, height: "100%", alignSelf: "stretch" },
            children: [
              /* @__PURE__ */ jsxs5(
                Stack4,
                {
                  direction: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  spacing: 1,
                  className: `paty-todos-column__head${filterDragEnabled ? " paty-permisos-column__head--filter-draggable" : ""}`,
                  sx: { flexShrink: 0, px: 1.75, py: 1.25, pb: 1, cursor: filterDragEnabled ? "grab" : "default" },
                  onPointerDown: (e) => handleColumnHeadDragStart(col, e),
                  children: [
                    /* @__PURE__ */ jsxs5(Stack4, { direction: "row", alignItems: "center", spacing: 0.75, className: "paty-todos-column__title", sx: { minWidth: 0, flex: 1 }, children: [
                      /* @__PURE__ */ jsx8(Icon3, { icon: col.icon, size: 16 }),
                      /* @__PURE__ */ jsxs5(Box5, { sx: { minWidth: 0 }, children: [
                        /* @__PURE__ */ jsx8(Stack4, { direction: "row", alignItems: "baseline", spacing: 0.75, sx: { minWidth: 0 }, children: /* @__PURE__ */ jsx8(Box5, { component: "span", sx: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }, title: col.roleName && col.title !== col.roleName ? `${col.title} (${col.roleName})` : col.title, children: col.title }) }),
                        col.descripcion ? /* @__PURE__ */ jsx8(Typography5, { variant: "caption", color: "text.secondary", sx: { display: "block", lineHeight: 1.3, mt: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: col.descripcion, children: col.descripcion }) : null
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx8(Stack4, { direction: "row", alignItems: "center", spacing: 0.5, sx: { flexShrink: 0 }, children: canManageCol ? /* @__PURE__ */ jsx8(Tooltip3, { title: addBusy && addingRoleId === col.id ? "Agregando\u2026" : "Agregar usuario", children: /* @__PURE__ */ jsx8("span", { className: "paty-permisos-column__add-wrap", children: /* @__PURE__ */ jsx8(
                      IconButton2,
                      {
                        size: "small",
                        className: "paty-permisos-column__add",
                        disabled: addBusy,
                        "aria-label": `Agregar usuario a ${col.title || col.id}`,
                        onClick: () => {
                          if (addBusy) return;
                          setAddPending({
                            role: col.id,
                            roleTitle: col.title,
                            columns,
                            existingUsernames: new Set(col.users.map((u) => u.username))
                          });
                        },
                        children: addBusy && addingRoleId === col.id ? /* @__PURE__ */ jsx8(CircularProgress2, { size: 14, thickness: 5 }) : /* @__PURE__ */ jsx8(Icon3, { icon: "mdi:plus", size: 16 })
                      }
                    ) }) }) : null })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs5(
                Box5,
                {
                  ref: (el) => {
                    listRefs.current[col.id] = el;
                  },
                  "data-column-id": col.id,
                  className: `paty-todos-column__list paty-permisos-column__list${isOverAllowed ? " paty-todos-column__list--drag-over" : ""}${isOverBlocked ? " paty-todos-column__list--drop-blocked" : ""}`,
                  sx: { flex: 1, minHeight: 0, overflowY: "auto", p: 1.25, px: 1.5, boxSizing: "border-box" },
                  children: [
                    col.users.map((card) => {
                      const cardUserKey = userKey(card.username);
                      const userBusy = !!processingUserKey && processingUserKey === cardUserKey;
                      const isSelected = selectedUserKey === cardUserKey;
                      const isDimmed = !!selectedUserKey && !isSelected;
                      const canDragUser = canAssignRoles && !readOnly;
                      return /* @__PURE__ */ jsx8(
                        UserCard,
                        {
                          card,
                          columnId: col.id,
                          columnTitle: col.title,
                          canDragUser,
                          isDragSource: draggingId === card.id,
                          userBusy,
                          isSelected,
                          isDimmed,
                          onPointerDragStart: handlePointerDragStart,
                          onRoleRemoveRequest: setRemovePending,
                          onUserSelect: handleUserSelect,
                          onUserSummary,
                          suppressClickRef
                        },
                        card.id
                      );
                    }),
                    !col.users.length ? /* @__PURE__ */ jsx8(Typography5, { variant: "caption", color: "text.secondary", sx: { px: 0.5, py: 1 }, children: "Sin usuarios" }) : null
                  ]
                }
              )
            ]
          },
          col.id
        );
      })
    ] }),
    typeof document !== "undefined" ? createPortal(/* @__PURE__ */ jsxs5(Fragment3, { children: [
      /* @__PURE__ */ jsx8(
        RoleDragDialog,
        {
          open: !!dragPending,
          pending: dragPending,
          busy: transferBusy,
          sessionUsername,
          onClose: () => {
            if (!transferBusy) setDragPending(null);
          },
          onConfirm: handleDragConfirm
        }
      ),
      /* @__PURE__ */ jsx8(
        RoleRemoveDialog,
        {
          open: !!removePending,
          pending: removePending,
          busy: removeBusy,
          sessionUsername,
          onClose: () => {
            if (!removeBusy) setRemovePending(null);
          },
          onConfirm: handleRemoveConfirm
        }
      ),
      /* @__PURE__ */ jsx8(
        RoleAddDialog,
        {
          open: !!addPending,
          pending: addPending,
          busy: addBusy,
          onClose: () => {
            if (!addBusy) setAddPending(null);
          },
          onConfirm: handleAddConfirm
        }
      )
    ] }), document.body) : null
  ] });
}

// src/js/tools/PermisosRoleFilterAutocomplete.jsx
init_platform();
import { jsx as jsx9 } from "react/jsx-runtime";
var { Autocomplete: Autocomplete2, TextField: TextField3, Chip: Chip5 } = getMaterialUI();
function PermisosRoleFilterAutocomplete({ options, value, onChange, disabled = false }) {
  const selected = options.filter((o) => value.includes(o.id));
  return /* @__PURE__ */ jsx9(
    Autocomplete2,
    {
      multiple: true,
      size: "small",
      disabled,
      className: "config-permisos-toolbar__field config-permisos-toolbar__field--role",
      options,
      value: selected,
      onChange: (_, next) => onChange(next.map((o) => o.id)),
      getOptionLabel: (o) => o.label,
      isOptionEqualToValue: (a, b) => a.id === b.id,
      disableCloseOnSelect: true,
      limitTags: 2,
      renderTags: (tagValue, getTagProps) => tagValue.map((option, index) => {
        const { key, ...chipProps } = getTagProps({ index });
        return /* @__PURE__ */ jsx9(Chip5, { ...chipProps, label: option.label, size: "small", className: "isa-neon-glass-chip" }, key);
      }),
      renderInput: (params) => /* @__PURE__ */ jsx9(
        TextField3,
        {
          ...params,
          size: "small",
          label: "",
          placeholder: selected.length ? "" : "Filtrar por roles\u2026",
          InputLabelProps: { ...params.InputLabelProps, shrink: false },
          sx: {
            "& .MuiOutlinedInput-root": { minHeight: 28, height: 28, maxHeight: 28, py: 0 },
            "& .MuiOutlinedInput-input": { py: "4px", fontSize: "0.8125rem", fontWeight: 600 },
            "& .MuiInputLabel-root": { display: "none" },
            "& .MuiOutlinedInput-notchedOutline legend": { width: 0, padding: 0 }
          }
        }
      )
    }
  );
}

// src/js/tools/UserPermissionsSummaryDialog.jsx
init_platform();
import { Fragment as Fragment4, jsx as jsx10, jsxs as jsxs6 } from "react/jsx-runtime";
var { Typography: Typography6, Stack: Stack5, Box: Box6, Chip: Chip6, Divider: Divider2, CircularProgress: CircularProgress3 } = getMaterialUI();
var { useMemo: useMemo5 } = getReact();
var ROLE_KEYS_OMIT = /* @__PURE__ */ new Set(["descripcion", "namedisplay", "roles", "jerarquia", "accent", "color", "icon"]);
function getRoleEntry(roles, roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  return (roles ?? []).find((r) => String(r?.iusuario ?? "").trim().toUpperCase().replace(/^ROLE:/i, "") === key) ?? null;
}
function activeRoles(roles) {
  return (roles ?? []).filter((r) => r?.itipo !== "user" && r?.bactivo !== false);
}
function permissionValue(v) {
  if (v === true) return "allow";
  if (v && typeof v === "object") {
    if (Array.isArray(v.filter)) {
      return { kind: "filter", value: v.filter };
    }
    if (v.filter && typeof v.filter === "object") {
      return { kind: "filter", value: v.filter };
    }
    return { kind: "object", value: v };
  }
  return { kind: "other", value: v };
}
function summarizePerms(perms) {
  const allows = [];
  const filters = [];
  const others = [];
  for (const [k, v] of Object.entries(perms ?? {})) {
    if (ROLE_KEYS_OMIT.has(k)) continue;
    if (k.startsWith("__") || k === "*") {
      if (k === "*" && v === true) allows.unshift("*");
      continue;
    }
    const pv = permissionValue(v);
    if (pv === "allow") allows.push(k);
    else if (pv.kind === "filter") filters.push({ key: k, filter: pv.value });
    else others.push({ key: k, value: pv.value });
  }
  return { allows, filters, others };
}
function RoleCard({ roleName, roles }) {
  const entry = getRoleEntry(roles, roleName);
  const title = roleTitleFromEntry(entry) || roleName;
  return /* @__PURE__ */ jsx10(Box6, { className: "isa-glass-card paty-permisos-summary__role", sx: { p: 1.25, borderRadius: 1.5 }, children: /* @__PURE__ */ jsxs6(Stack5, { direction: "row", alignItems: "center", spacing: 0.75, children: [
    /* @__PURE__ */ jsx10(
      Chip6,
      {
        size: "small",
        color: "primary",
        label: title,
        sx: { fontFamily: "monospace", fontSize: 11, fontWeight: 700 },
        title: roleName
      }
    ),
    title !== roleName ? /* @__PURE__ */ jsx10(Typography6, { variant: "caption", color: "text.secondary", sx: { fontFamily: "monospace" }, children: roleName }) : null
  ] }) });
}
function PermList({ title, items, kind }) {
  if (!items.length) return null;
  return /* @__PURE__ */ jsxs6(Box6, { sx: { mt: 1 }, children: [
    /* @__PURE__ */ jsxs6(Typography6, { variant: "overline", color: "text.secondary", sx: { letterSpacing: 1 }, children: [
      title,
      " (",
      items.length,
      ")"
    ] }),
    /* @__PURE__ */ jsxs6(Box6, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }, children: [
      items.slice(0, kind === "filter" ? 50 : 100).map((it, i) => {
        if (kind === "filter") {
          const fSummary = Object.entries(it.filter ?? {}).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
          return /* @__PURE__ */ jsx10(
            Chip6,
            {
              size: "small",
              variant: "outlined",
              color: "warning",
              label: `${it.key} \xB7 ${fSummary}`,
              title: `${it.key} \u2014 restringido a: ${fSummary}`,
              sx: { fontFamily: "monospace", fontSize: 11 }
            },
            `${it.key}-${i}`
          );
        }
        if (kind === "allow") {
          return /* @__PURE__ */ jsx10(
            Chip6,
            {
              size: "small",
              color: "success",
              variant: "outlined",
              label: it,
              title: it,
              sx: { fontFamily: "monospace", fontSize: 11 }
            },
            it
          );
        }
        return /* @__PURE__ */ jsx10(
          Chip6,
          {
            size: "small",
            variant: "outlined",
            label: `${it.key} \u2192 ${JSON.stringify(it.value)}`,
            title: it.key,
            sx: { fontFamily: "monospace", fontSize: 11 }
          },
          `${it.key}-${i}`
        );
      }),
      items.length > (kind === "filter" ? 50 : 100) ? /* @__PURE__ */ jsx10(Chip6, { size: "small", label: `+${items.length - (kind === "filter" ? 50 : 100)} m\xE1s`, sx: { fontFamily: "monospace", fontSize: 11 } }) : null
    ] })
  ] });
}
function UserPermissionsSummaryDialog({ open, onClose, username, users, roles }) {
  const data = useMemo5(() => {
    if (!open || !username) return null;
    const targetUser = (users ?? []).find((u) => String(u?.iusuario ?? "").trim().toUpperCase() === username.toUpperCase());
    if (!targetUser) return null;
    const active = activeRoles(roles);
    const directRoles = userRoles(targetUser.permisos);
    const { allows, filters, others } = summarizePerms(targetUser.permisos);
    return { targetUser, directRoles, activeRoles: active, allows, filters, others };
  }, [open, username, users, roles]);
  return /* @__PURE__ */ jsxs6(
    GlassDialog,
    {
      open,
      onClose,
      maxWidth: "md",
      fullWidth: true,
      paperClassName: "permisos-user-summary-dialog",
      header: /* @__PURE__ */ jsx10(
        GlassDialogHeader,
        {
          icon: "mdi:shield-account-outline",
          title: `Resumen de permisos \u2014 ${username || ""}`,
          subtitle: "Solo lectura \xB7 composici\xF3n en cliente \xB7 roles planos asignados",
          accent: "#1e90ff",
          onClose
        }
      ),
      children: [
        /* @__PURE__ */ jsx10(Box6, { sx: { ...glassDialogContentSx(), minHeight: 360 }, children: !username ? /* @__PURE__ */ jsx10(Typography6, { color: "text.secondary", children: "Sin usuario seleccionado." }) : !data ? /* @__PURE__ */ jsxs6(Stack5, { direction: "row", spacing: 1.5, alignItems: "center", children: [
          /* @__PURE__ */ jsx10(CircularProgress3, { size: 20 }),
          /* @__PURE__ */ jsx10(Typography6, { color: "text.secondary", children: "Usuario no encontrado en los datos cargados." })
        ] }) : /* @__PURE__ */ jsxs6(Fragment4, { children: [
          /* @__PURE__ */ jsxs6(Box6, { children: [
            /* @__PURE__ */ jsx10(Typography6, { variant: "overline", color: "text.secondary", children: "Usuario" }),
            /* @__PURE__ */ jsx10(Typography6, { variant: "h6", fontWeight: 700, children: data.targetUser.iusuario }),
            data.targetUser.permisos?.nombre || data.targetUser.permisos?.namedisplay ? /* @__PURE__ */ jsx10(Typography6, { variant: "body2", color: "text.secondary", children: data.targetUser.permisos.nombre || data.targetUser.permisos.namedisplay }) : null
          ] }),
          /* @__PURE__ */ jsx10(Divider2, { sx: { my: 1.5 } }),
          /* @__PURE__ */ jsxs6(Typography6, { variant: "overline", color: "text.secondary", children: [
            "Roles asignados ",
            data.directRoles.length ? `(${data.directRoles.length})` : ""
          ] }),
          data.directRoles.length === 0 ? /* @__PURE__ */ jsx10(Typography6, { variant: "body2", color: "text.secondary", sx: { mt: 0.5 }, children: "El usuario no tiene roles asignados. Permisos efectivos = USR por defecto." }) : /* @__PURE__ */ jsx10(Stack5, { spacing: 1, sx: { mt: 1 }, children: data.directRoles.map((rn) => /* @__PURE__ */ jsx10(RoleCard, { roleName: rn, roles: data.activeRoles }, rn)) }),
          /* @__PURE__ */ jsx10(Divider2, { sx: { my: 1.5 } }),
          /* @__PURE__ */ jsx10(Typography6, { variant: "overline", color: "text.secondary", children: "Permisos efectivos del usuario" }),
          /* @__PURE__ */ jsx10(Typography6, { variant: "caption", color: "text.secondary", sx: { display: "block", mt: 0.25 }, children: "Calculados a partir de sus roles directos (sin herencia jer\xE1rquica)." }),
          data.allows.length === 0 && data.filters.length === 0 && data.others.length === 0 ? /* @__PURE__ */ jsx10(Typography6, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "Sin permisos materializados m\xE1s all\xE1 del USR por defecto." }) : /* @__PURE__ */ jsxs6(Fragment4, { children: [
            /* @__PURE__ */ jsx10(PermList, { title: "Permitidos", items: data.allows, kind: "allow" }),
            /* @__PURE__ */ jsx10(PermList, { title: "Con filtro fijo", items: data.filters, kind: "filter" }),
            /* @__PURE__ */ jsx10(PermList, { title: "Otros", items: data.others, kind: "other" })
          ] }),
          /* @__PURE__ */ jsx10(Divider2, { sx: { my: 1.5 } }),
          /* @__PURE__ */ jsx10(Typography6, { variant: "caption", color: "text.secondary", children: "Los detalles completos por rol se obtienen al abrir cada columna. Este resumen es de solo lectura y se actualiza al recargar el panel." })
        ] }) }),
        /* @__PURE__ */ jsx10(Box6, { sx: glassDialogActionsSx(), children: /* @__PURE__ */ jsx10(
          "button",
          {
            type: "button",
            className: "MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-colorPrimary",
            onClick: onClose,
            children: "Cerrar"
          }
        ) })
      ]
    }
  );
}

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
function configPermisosBag(snap) {
  const cfg = (snap ?? getSnapshot()).config;
  const permisos = cfg?.permisos;
  return permisos && typeof permisos === "object" ? permisos : void 0;
}
function readPermisosHideEmptyFromUrl(snap) {
  return configPermisosBag(snap)?.hideEmpty !== false;
}
function persistPermisosHideEmpty(hide) {
  const prev = readPermisosHideEmptyFromUrl();
  if (prev === hide) return getSnapshot();
  return mergePartial({ tool: "config", config: { permisos: { hideEmpty: !!hide } } });
}

// src/js/tools/PermisosPanel.jsx
import { jsx as jsx11, jsxs as jsxs7 } from "react/jsx-runtime";
var { useState: useState6, useEffect: useEffect6, useCallback: useCallback2, useMemo: useMemo6, useRef: useRef3 } = getReact();
var { Typography: Typography7, Stack: Stack6, Alert: Alert2, CircularProgress: CircularProgress4, Box: Box7, Chip: Chip7, DialogContent: DialogContent3, DialogActions: DialogActions2, Button: Button2, FormControlLabel: FormControlLabel2, Switch } = getMaterialUI();
function PermisosPanel({ onNeedLogin }) {
  const [loading, setLoading] = useState6(true);
  const [busy, setBusy] = useState6(false);
  const [canManage, setCanManage] = useState6(false);
  const [canAssignUserRoles, setCanAssignUserRoles] = useState6(false);
  const [canEditRoleDescriptions, setCanEditRoleDescriptions] = useState6(false);
  const [authTick, setAuthTick] = useState6(0);
  const loggedIn = useMemo6(() => !!Session?.isLoggedIn?.(), [authTick]);
  const sessionUsername = useMemo6(() => String(Session.username?.() ?? "").trim().toUpperCase(), [authTick]);
  const [err, setErr] = useState6("");
  const [data, setData] = useState6({ roles: [], users: [], contactos: {} });
  const [userSearch, setUserSearch] = useState6("");
  const [roleFilters, setRoleFilters] = useState6([]);
  const [hideEmptyStacks, setHideEmptyStacks] = useState6(readPermisosHideEmptyFromUrl);
  const [filterBusy, setFilterBusy] = useState6(false);
  const [dragOverFilter, setDragOverFilter] = useState6(false);
  const [actorRoles, setActorRoles] = useState6([]);
  const [patyiaRoles, setPatyiaRoles] = useState6([]);
  const [patyiaContactos, setPatyiaContactos] = useState6([]);
  const [patyiaBusy, setPatyiaBusy] = useState6(false);
  const [summaryUsername, setSummaryUsername] = useState6(null);
  const filterToolbarRef = useRef3(null);
  const filterFetchSkipRef = useRef3(true);
  const filterDropFetchRef = useRef3(false);
  const rolesRef = useRef3(data.roles);
  const usersRef = useRef3(data.users);
  rolesRef.current = data.roles;
  usersRef.current = data.users;
  const usersPaginated = !!data.usersTruncated;
  const applyFlags = useCallback2((result) => {
    setCanManage(!!result.canManage);
    setCanAssignUserRoles(!!result.canAssignUserRoles);
    setCanEditRoleDescriptions(!!result.canEditRoleDescriptions);
    const roles = Array.isArray(result.actorRoles) ? result.actorRoles : Array.isArray(Session?.roles) ? Session.roles : [];
    setActorRoles(roles.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean));
  }, []);
  const load = useCallback2(async () => {
    setLoading(true);
    setErr("");
    try {
      const result = await fetchPermisos();
      if (!Array.isArray(result.roles) || result.roles.length === 0) {
        throw new Error("ISS no devolvi\xF3 roles activos. Verifique modo Local (ISS :8802) o recargue tras iniciar func start.");
      }
      setData(result);
      applyFlags(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [applyFlags]);
  const refreshPermisos = useCallback2(async () => {
    const result = await fetchPermisos();
    if (!Array.isArray(result.roles) || result.roles.length === 0) {
      throw new Error("ISS no devolvi\xF3 roles activos. Verifique modo Local (ISS :8802) o recargue tras iniciar func start.");
    }
    setData(result);
    applyFlags(result);
    return result;
  }, [applyFlags]);
  const loadPatyia = useCallback2(async () => {
    setPatyiaBusy(true);
    try {
      const r = await fetchPatyiaAdminRoles();
      setPatyiaRoles(Array.isArray(r?.roles) ? r.roles : []);
      setPatyiaContactos(Array.isArray(r?.contactos) ? r.contactos : []);
    } catch (e) {
      toastError?.((e instanceof Error ? e.message : String(e)) ?? "Error cargando roles PatyIA");
    } finally {
      setPatyiaBusy(false);
    }
  }, []);
  const handlePatyiaAssign = useCallback2(async ({ irol, icontacto, op, bprincipal }) => {
    if (!requireAppSession(onNeedLogin)) return;
    setPatyiaBusy(true);
    try {
      if (op === "remove") {
        await removePatyiaRolContacto({ irol, icontacto });
      } else {
        await assignPatyiaRolContacto({ irol, icontacto, bprincipal });
      }
      await loadPatyia();
      toastSuccess?.(`${icontacto} \u2192 ${irol}`);
    } catch (e) {
      toastError?.((e instanceof Error ? e.message : String(e)) ?? "Error PatyIA");
    } finally {
      setPatyiaBusy(false);
    }
  }, [loadPatyia, onNeedLogin]);
  const loadRef = useRef3(load);
  loadRef.current = load;
  useEffect6(() => {
    loadRef.current();
  }, []);
  useEffect6(() => {
    void loadPatyia();
  }, [loadPatyia]);
  useEffect6(() => subscribe((snap) => {
    const hide = readPermisosHideEmptyFromUrl(snap);
    setHideEmptyStacks((prev) => prev === hide ? prev : hide);
  }), []);
  const setHideEmptyStacksPersist = useCallback2((hide) => {
    setHideEmptyStacks(hide);
    persistPermisosHideEmpty(hide);
  }, []);
  const userDirectory = useMemo6(() => buildUserDirectoryFromPermisos(data.users), [data.users]);
  useEffect6(() => {
    Assets.ensureTodosCss();
    const onAuth = () => {
      setAuthTick((t) => t + 1);
      loadRef.current();
    };
    window.addEventListener(Session.EVENT, onAuth);
    window.addEventListener("isa-patyia:auth", onAuth);
    return () => {
      window.removeEventListener(Session.EVENT, onAuth);
      window.removeEventListener("isa-patyia:auth", onAuth);
    };
  }, []);
  async function run(fn, okMsg) {
    if (!requireAppSession(onNeedLogin)) return;
    setBusy(true);
    setErr("");
    try {
      const result = await fn();
      setData(result);
      applyFlags(result);
      if (okMsg) toastSuccess(okMsg);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      toastError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const handleRoleRemove = useCallback2(async ({ username, role }) => {
    if (!requireAppSession(onNeedLogin)) throw new Error("Sesi\xF3n requerida");
    if (!canAssignUserRoles) throw new Error("Sin permiso para mover usuarios entre roles");
    await removeUsuarioRole(String(username).trim().toUpperCase(), role);
    await refreshPermisos();
  }, [onNeedLogin, canAssignUserRoles, refreshPermisos]);
  const handleRoleAdd = useCallback2(async ({ username, role }) => {
    if (!requireAppSession(onNeedLogin)) throw new Error("Sesi\xF3n requerida");
    if (!canAssignUserRoles) throw new Error("Sin permiso para mover usuarios entre roles");
    await addUsuarioRole(String(username).trim().toUpperCase(), role);
    await refreshPermisos();
  }, [onNeedLogin, canAssignUserRoles, refreshPermisos]);
  const handleRoleDrag = useCallback2(async ({ username, fromRole, toRole }) => {
    if (!requireAppSession(onNeedLogin)) throw new Error("Sesi\xF3n requerida");
    if (!canAssignUserRoles) throw new Error("Sin permiso para mover usuarios entre roles");
    await putUsuarioRoles(String(username).trim().toUpperCase(), { fromRole, toRole, mode: "move" });
    await refreshPermisos();
  }, [onNeedLogin, canAssignUserRoles, refreshPermisos]);
  const fetchPermisosWithSearch = useCallback2(async (search) => {
    const q = String(search ?? "").trim();
    return fetchPermisos(q ? { search: q } : void 0);
  }, []);
  const handleUserFilterDrop = useCallback2(async (username) => {
    const q = String(username ?? "").trim();
    if (!q) return;
    setUserSearch(q);
    if (!usersPaginated) return;
    filterDropFetchRef.current = true;
    setFilterBusy(true);
    setErr("");
    try {
      const result = await fetchPermisosWithSearch(q);
      setData(result);
      applyFlags(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      toastError(msg);
    } finally {
      setFilterBusy(false);
    }
  }, [usersPaginated, fetchPermisosWithSearch, applyFlags]);
  const handleRoleFilterDrop = useCallback2((roleId) => {
    const id = String(roleId ?? "").trim().toUpperCase();
    if (!id) return;
    setRoleFilters((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);
  const clearFilters = useCallback2(async () => {
    setUserSearch("");
    setRoleFilters([]);
    if (!usersPaginated) return;
    setFilterBusy(true);
    setErr("");
    try {
      const result = await fetchPermisos();
      setData(result);
      applyFlags(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      toastError(msg);
    } finally {
      setFilterBusy(false);
    }
  }, [usersPaginated, applyFlags]);
  useEffect6(() => {
    if (!usersPaginated) return void 0;
    if (filterFetchSkipRef.current) {
      filterFetchSkipRef.current = false;
      return void 0;
    }
    if (filterDropFetchRef.current) {
      filterDropFetchRef.current = false;
      return void 0;
    }
    const t = window.setTimeout(async () => {
      setFilterBusy(true);
      setErr("");
      try {
        const result = await fetchPermisosWithSearch(userSearch);
        setData(result);
        applyFlags(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
        toastError(msg);
      } finally {
        setFilterBusy(false);
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [userSearch, usersPaginated, fetchPermisosWithSearch]);
  const roleOptions = useMemo6(
    () => (data.roles || []).map((r) => ({ id: roleNameFromEntry(r), label: roleTitleFromEntry(r) })).filter((r) => r.id && r.id !== USR_ROLE),
    [data.roles]
  );
  const boardData = useMemo6(
    () => buildPermisosBoard(data, { userSearch, roleFilters, userDirectory, hideEmptyColumns: hideEmptyStacks, contactos: data.contactos }),
    [data, userSearch, roleFilters, userDirectory, hideEmptyStacks]
  );
  const readOnly = !canAssignUserRoles;
  const managePermisos = canManage;
  const editRoleMeta = canEditRoleDescriptions || canManage;
  const filtersActive = !!(userSearch.trim() || roleFilters.length);
  const { GlassToolbar } = getGlass();
  const handleSaveRolePermisos = useCallback2(async (name, permisos, bactivo) => {
    if (!editRoleMeta || !requireAppSession(onNeedLogin)) return;
    setBusy(true);
    setErr("");
    try {
      const result = await putPermisoRolePath(name, permisos, managePermisos ? bactivo : void 0);
      setData(result);
      applyFlags(result);
      toastSuccess(`Rol ${name} guardado`);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      toastError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [editRoleMeta, onNeedLogin, managePermisos, applyFlags]);
  if (loading) {
    return /* @__PURE__ */ jsx11(Box7, { className: "config-permisos-loading", children: /* @__PURE__ */ jsx11(CircularProgress4, { size: 26 }) });
  }
  return /* @__PURE__ */ jsxs7(Box7, { className: "paty-permisos-shell", sx: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }, children: [
    /* @__PURE__ */ jsx11(Box7, { ref: filterToolbarRef, className: "config-permisos-toolbar-wrap", sx: { flexShrink: 0 }, children: /* @__PURE__ */ jsxs7(GlassToolbar, { className: `config-permisos-toolbar${dragOverFilter ? " config-permisos-toolbar--filter-drop" : ""}`, sx: { borderRadius: 0, mb: 0, flexShrink: 0, gap: 0.75, px: { xs: 1.25, sm: 1.75 }, py: 0.5, alignItems: "center", minHeight: 40 }, children: [
      /* @__PURE__ */ jsx11(
        PermisosUserAutocomplete,
        {
          variant: "toolbar",
          label: "",
          placeholder: "Buscar usuario\u2026",
          value: userSearch || null,
          onChange: (u) => setUserSearch(u ?? ""),
          disabled: filterBusy,
          allowNew: true,
          limit: 10,
          roleFilter: roleFilters.length === 1 ? roleFilters[0] : null,
          className: "config-permisos-toolbar__field config-permisos-toolbar__field--search"
        }
      ),
      /* @__PURE__ */ jsx11(PermisosRoleFilterAutocomplete, { options: roleOptions, value: roleFilters, onChange: setRoleFilters, disabled: filterBusy }),
      filtersActive ? /* @__PURE__ */ jsx11(
        Chip7,
        {
          size: "small",
          variant: "outlined",
          className: "isa-neon-glass-chip",
          label: "Filtros",
          onDelete: clearFilters,
          disabled: filterBusy
        }
      ) : null,
      /* @__PURE__ */ jsx11(
        FormControlLabel2,
        {
          className: "config-permisos-toolbar__hide-empty",
          control: /* @__PURE__ */ jsx11(Switch, { size: "small", checked: hideEmptyStacks, onChange: (e) => setHideEmptyStacksPersist(e.target.checked), disabled: filterBusy }),
          label: "Ocultar vac\xEDos",
          sx: { mr: 0, ml: 0.25, flexShrink: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem", whiteSpace: "nowrap" } }
        }
      ),
      /* @__PURE__ */ jsx11(Box7, { sx: { flex: 1, minWidth: 8 } }),
      /* @__PURE__ */ jsxs7(Stack6, { direction: "row", spacing: 0.5, alignItems: "center", className: "config-form-section__actions config-permisos-toolbar__actions", children: [
        /* @__PURE__ */ jsx11(ButtonIconify, { icon: "mdi:shield-account", title: "Roles planos PatyIA", onClick: () => void loadPatyia(), disabled: busy || filterBusy || patyiaBusy }),
        /* @__PURE__ */ jsx11(ButtonIconify, { icon: "mdi:refresh", title: "Recargar", onClick: load, disabled: busy || filterBusy })
      ] })
    ] }) }),
    err ? /* @__PURE__ */ jsx11(Alert2, { severity: "warning", className: "config-form-alert config-permisos-alert", children: err }) : null,
    /* @__PURE__ */ jsx11(
      PermisosKanban,
      {
        boardData,
        loggedIn,
        sessionUsername,
        canAssignRoles: canAssignUserRoles,
        readOnly,
        canManage: managePermisos,
        canEditRoleDescriptions: editRoleMeta,
        busy: busy || filterBusy,
        patyiaRoles,
        patyiaContactos,
        onPatyiaAssign: handlePatyiaAssign,
        onUserSummary: (username) => setSummaryUsername(username),
        filterToolbarRef,
        onUserFilterDrop: handleUserFilterDrop,
        onRoleFilterDrop: handleRoleFilterDrop,
        onDragOverFilterChange: setDragOverFilter,
        onRoleDrag: handleRoleDrag,
        onRoleRemove: handleRoleRemove,
        onRoleAdd: handleRoleAdd
      }
    ),
    /* @__PURE__ */ jsx11(
      UserPermissionsSummaryDialog,
      {
        open: !!summaryUsername,
        onClose: () => setSummaryUsername(null),
        username: summaryUsername,
        users: data?.users ?? [],
        roles: data?.roles ?? []
      }
    )
  ] });
}
export {
  PermisosPanel
};
