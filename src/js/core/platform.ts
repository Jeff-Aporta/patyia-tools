/** Puente al runtime ISAFront (window.ISA). */
import { ensureIssLocalDefault, migrateIssLocalFromGatewayFlag, isLocalMode, isDevHost, getIssTarget, setIssTarget, patyiaIssBase, ORCH_ONLINE, GATEWAY_LS_KEY, PATYIA_ISS_LOCAL, PATYIA_ISS_PROD_URL, PATYIA_ISS_URL } from "./patyia.ts";

const bridge = () => window.ISAFront.createPlatformBridge("ISA");

export const UI = {
  get Icon() { return bridge().UI.Icon; },
  get TargetSwitch() { return bridge().UI.TargetSwitch; },
  get ThemeSwitch() { return bridge().UI.ThemeSwitch; },
  get useRealtimeStatus() { return bridge().UI.useRealtimeStatus; },
  get RealtimeStatusDot() { return bridge().UI.RealtimeStatusDot; },
  get Loading() { return bridge().UI.Loading; },
  get ErrorBox() { return bridge().UI.ErrorBox; },
  get LoginGate() { return bridge().UI.LoginGate; },
  get LoginButton() { return bridge().UI.LoginButton; },
};

export const Session = {
  current: () => bridge().Session.current(),
  isLoggedIn: () => bridge().Session.isLoggedIn(),
  username: () => bridge().Session.username(),
  realUsername: () => bridge().Session.realUsername?.() ?? bridge().Session.username(),
  auditAuthor: () => bridge().Session.auditAuthor?.() ?? String(bridge().Session.username() || "").trim().toUpperCase(),
  authHeader: () => bridge().Session.authHeader(),
  appHeader: () => bridge().Session.appHeader(),
  appId: () => bridge().Session.appId(),
  login: (u: string, p: string, opts?: Record<string, unknown>) => bridge().Session.login(u, p, opts),
  logout: () => bridge().Session.logout(),
  refreshProfile: () => bridge().Session.refreshProfile(),
  capabilities: () => bridge().Session.capabilities(),
  adminCapabilities: () => bridge().Session.adminCapabilities?.() ?? bridge().Session.capabilities(),
  capabilityCatalog: () => bridge().Session.capabilityCatalog?.() ?? [],
  can: (cap: string) => bridge().Session.can(cap),
  blockReason: (cap: string) => bridge().Session.blockReason(cap),
  get EVENT() { return bridge().Session.EVENT; },
};

export const Toast = {
  show: (opts: { message: string; severity?: string; durationMs?: number }) => bridge().Toast.show(opts),
};

export const Config = {
  base: () => bridge().Config.base(),
  apiUrl: (path: string) => bridge().Config.apiUrl(path),
  isLocal: () => bridge().Config.isLocal(),
  setLocal: (on: boolean) => bridge().Config.setLocal(on),
  get EVENT() { return bridge().Config.EVENT; },
};

function frontShared(): IsaFrontApi {
  const api = window.ISAFront;
  if (!api?.ensureCodeMirrorLoaded) {
    throw new Error("ISAFront lazy-assets no cargado — recargue sin caché (Ctrl+Shift+R).");
  }
  return api;
}

function frontSharedLazy() {
  const api = window.ISAFront;
  return api?.ensureCodeMirrorLoaded ? api : null;
}

/** Carga lazy de scripts/CSS y markdown (front-shared). */
export const Assets = {
  ensureCodeMirrorLoaded: (opts?: { sql?: boolean }) => {
    const api = frontSharedLazy();
    return api ? api.ensureCodeMirrorLoaded!(opts) : Promise.resolve();
  },
  ensureMarked: () => {
    const api = frontSharedLazy();
    return api ? api.ensureMarked!() : Promise.resolve();
  },
  ensureStylesheet: (href: string) => {
    const api = frontSharedLazy();
    return api ? api.ensureLazyStylesheet!(href) : Promise.resolve();
  },
  ensureChatStagingCss: () => {
    const api = frontSharedLazy();
    if (!api) return;
    const prefix = typeof window !== "undefined" && (window as Window & { __ISA_DIST__?: boolean }).__ISA_DIST__ ? "dist/" : "";
    api.ensureLazyStylesheet!(`${prefix}css/chat-staging.css`).catch((err) => {
      console.warn("chat-staging.css:", err);
    });
  },
  ensureTodosCss: () => {
    const api = frontSharedLazy();
    if (!api) return;
    const prefix = typeof window !== "undefined" && (window as Window & { __ISA_DIST__?: boolean }).__ISA_DIST__ ? "dist/" : "";
    api.ensureLazyStylesheet!(`${prefix}css/todos-staging.css`).catch((err) => {
      console.warn("todos-staging.css:", err);
    });
  },
  ensureWelcomeCss: () => {
    const api = frontSharedLazy();
    if (!api) return;
    const prefix = typeof window !== "undefined" && (window as Window & { __ISA_DIST__?: boolean }).__ISA_DIST__ ? "dist/" : "";
    api.ensureLazyStylesheet!(`${prefix}css/welcome-home.css`).catch((err) => {
      console.warn("welcome-home.css:", err);
    });
  },
};

export function mdToHtml(src: string): string {
  const api = frontSharedLazy();
  if (api?.mdToHtml) return api.mdToHtml(src);
  return String(src ?? "");
}

/** Estimación de tokens de prompt (ISAFront o fallback chars/4). */
export const Tokens = {
  estimatePrompt: (text: unknown): number => {
    const fn = window.ISAFront?.estimatePromptTokens;
    if (typeof fn === "function") return fn(text);
    const s = String(text ?? "");
    return s.trim() ? Math.ceil(s.length / 4) : 0;
  },
};

/** Puente al stack React/MUI (front-shared). */
export const getReact = () => window.ISAFront.getReact();
export const getReactDOM = () => window.ISAFront.getReactDOM();
export const getMaterialUI = (): MaterialUIApi => window.ISAFront.getMaterialUI();

/** Layout panel izquierdo redimensionable + contenido (ISAFront.Layout.IsaSplitView). */
export function getIsaSplitView() {
  const C = window.ISAFront?.Layout?.IsaSplitView;
  if (!C) {
    throw new Error("IsaSplitView no cargado — recargue sin caché (Ctrl+Shift+R).");
  }
  return C;
}

/** Kit neon-glass — GlassCard, GlassSection, tokens (ISAFront.Glass). */
export function getGlass() {
  const g = window.ISAFront?.Glass;
  if (!g?.GlassCard) {
    throw new Error("ISAFront.Glass no cargado — recargue sin caché (Ctrl+Shift+R).");
  }
  return g;
}

function lightboxApi() {
  const api = window.ISAComponents?.LightboxZoom;
  if (!api?.LightboxZoomDialog) {
    throw new Error("ISAComponents.LightboxZoom no cargado — recargue sin caché (Ctrl+Shift+R).");
  }
  return api;
}

/** Visor lightbox-zoom (@isa-components/lightbox). */
export const LightboxZoom = {
  get LightboxZoomDialog() { return lightboxApi().LightboxZoomDialog; },
  get LightboxZoomImage() { return lightboxApi().LightboxZoomImage; },
  get useLightboxZoom() { return lightboxApi().useLightboxZoom; },
  get ZOOM_MIN() { return lightboxApi().ZOOM_MIN; },
  get ZOOM_MAX() { return lightboxApi().ZOOM_MAX; },
  get PAN_STEP() { return lightboxApi().PAN_STEP; },
};

/** Alias legacy (migración desde ISAFront.Lightbox). */
export const Lightbox = {
  get ImageLightboxDialog() { return lightboxApi().LightboxZoomDialog; },
  get LightboxImage() { return lightboxApi().LightboxZoomImage; },
  get useImageLightboxZoom() { return lightboxApi().useLightboxZoom; },
};

/** Puente a ISAFront.CodeMirrorPanel (front-shared). */
export function CodeMirrorPanel(props: Record<string, unknown>) {
  const Panel = window.ISAFront?.CodeMirrorPanel;
  if (!Panel) throw new Error("CodeMirrorPanel no cargado — recargue sin caché (Ctrl+Shift+R).");
  return Panel(props);
}

/** Puente isa-patyia → ISAFront.Feedback (toasts y confirm). */
const fb = () => globalThis.ISAFront?.Feedback;

export function toastError(text: string, timeout?: number) { fb()?.toast?.error?.(text, timeout); }
export function toastSuccess(text: string, timeout?: number) { fb()?.toast?.success?.(text, timeout); }
export function toastInfo(text: string, timeout?: number) { fb()?.toast?.info?.(text, timeout); }
export function toastWarning(text: string, timeout?: number) { fb()?.toast?.warning?.(text, timeout); }
export function requestConfirm(opts: Record<string, unknown>) { return fb()?.confirm?.(opts) ?? Promise.resolve(false); }

/** Login portal ContaPyme (DataSnap vía ISS). Reemplaza el legacy /api/auth/token (eliminado de los workers). */
const PORTAL_LOGIN_PATH = "/api/auth/portal-login";

/** Endpoints opcionales para el overlay de "auth-server-down":
 *  /api/auth/portal-jwt* y rutas administrativas no rompen la app (la sesión portal-login basta
 *  para leer conversaciones). Si portal-jwt falla, la app cae en "lectura sin admin features". */
const AUTH_DOWN_OVERLAY_SKIP_PATTERNS: RegExp[] = [
  /\/api\/auth\/portal-jwt(\/catalog)?(\?|$)/,
  /\/api\/auth\/verify-access(\?|$)/,
  /\/api\/auth\/service-token(\?|$)/,
  /\/api\/auth\/test-token(\?|$)/,
  /\/api\/session(\?|$)/,
];

function shouldSuppressAuthDownOverlay(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, location.href);
    if (u.origin === location.origin) return true;
    return AUTH_DOWN_OVERLAY_SKIP_PATTERNS.some((re) => re.test(u.pathname + u.search));
  } catch {
    return false;
  }
}

/** Solo caídas de portal-login / auth del orchestrator merecen overlay full-screen. */
function isAuthCriticalUrl(url: string): boolean {
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

function hasPortalSessionToken(): boolean {
  try {
    const fromApi = window.ISA?.AuthApi?.readSession?.();
    if (fromApi && typeof fromApi === "object" && (fromApi as { token?: string }).token) return true;
    const cur = window.ISA?.Session?.current;
    if (cur && typeof cur === "object" && (cur as { token?: string }).token) return true;
    const raw = localStorage.getItem("system-login:session:isa-patyia");
    if (raw) {
      const s = JSON.parse(raw) as { token?: string };
      if (s?.token) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function normalizeLoginEmail(user: string): string {
  const s = String(user ?? "").trim();
  if (!s) return "";
  return s.includes("@") ? s.toLowerCase() : `${s.toLowerCase()}@contapyme.com`;
}

type PortalLoginData = {
  ok?: boolean;
  token?: string;
  username?: string;
  displayName?: string;
  expiresAt?: string | null;
  error?: string;
  code?: string;
  terceros?: unknown[];
};

type PortalLoginError = Error & { code?: string; terceros?: unknown[]; status?: number; retryable?: boolean };

async function portalLoginRequest(base: string, body: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<PortalLoginData> {
  const res = await fetchImpl(base.replace(/\/$/, "") + PORTAL_LOGIN_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-App-Id": "isa-patyia" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as PortalLoginData;
  if (data?.code === "MULTI_EMPRESA" || (res.status === 409 && Array.isArray(data?.terceros))) {
    const e = new Error(String(data?.error || "Elija la empresa para continuar.")) as PortalLoginError;
    e.code = "MULTI_EMPRESA";
    e.terceros = Array.isArray(data?.terceros) ? data.terceros : [];
    throw e;
  }
  if (!res.ok || !data?.ok || !data?.token) {
    const e = new Error(String(data?.error || `Server error (HTTP status ${res.status})`)) as PortalLoginError;
    e.status = res.status;
    // 402 (quota Neon), 404 (endpoint eliminado) y 5xx justifican el fallback directo a DataSnap.
    e.retryable = res.status === 402 || res.status === 404 || res.status >= 500;
    throw e;
  }
  return data;
}

function patchIsaPatyiaAuthEvents(): void {
  const Session = window.ISA?.Session;
  if (!Session?.login || !Session?.logout) return;

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
    /servicio de acceso no/i,
  ];

  const isAuthServerDown = (raw: unknown): boolean => {
    const msg = String(raw ?? "");
    return AUTH_DOWN_PATTERNS.some((re) => re.test(msg));
  };

  const resolveAuthTarget = (): string => {
    try {
      const orch = String(ORCH_ONLINE).replace(/\/$/, "");
      return `${orch}${PORTAL_LOGIN_PATH} → ${patyiaIssBase()}${PORTAL_LOGIN_PATH} (DataSnap ContaPyme)`;
    } catch {
      return "https://main-orchestrator.jeffaporta.workers.dev/api/auth/portal-login → DataSnap ContaPyme";
    }
  };

  const announceAuthServerDown = (reason: string, source: "login" | "fetch", target?: string): void => {
    const targetUrl = target || resolveAuthTarget();
    try {
      window.dispatchEvent(new CustomEvent("isa-patyia:auth-server-down", { detail: { reason, source, target: targetUrl, at: Date.now() } }));
    } catch { /* ignore */ }
    try { toastError(`Servidor de autenticación caído: ${targetUrl}`, 8000); } catch { /* ignore */ }
  };

  const announceAuthServerUp = (): void => {
    try {
      window.dispatchEvent(new CustomEvent("isa-patyia:auth-server-up", { detail: { at: Date.now() } }));
    } catch { /* ignore */ }
  };

  const origFetch = window.fetch.bind(window);
  const origLogout = Session.logout.bind(Session);

  /** Guarda el token portal (firma ISS/InSoft) también como JWT Paty para el chat — verify directo al DataSnap. */
  const cachePortalTokenAsPatyJwt = (token: string, savedBy: string, expiresAt: string | null): void => {
    try {
      const part = String(token || "").split(".")[1];
      const raw = part ? (JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>) : {};
      if (raw.itercero == null) return;
      const claims = {
        itercero: String(raw.itercero),
        icontacto: raw.icontacto != null ? String(raw.icontacto) : undefined,
        nombres: raw.nombres != null ? String(raw.nombres) : undefined,
        apellidos: raw.apellidos != null ? String(raw.apellidos) : undefined,
        controlkey: raw.controlkey != null ? String(raw.controlkey) : undefined,
        iapp: typeof raw.iapp === "number" ? raw.iapp : undefined,
        idmaquina: raw.idmaquina != null ? String(raw.idmaquina) : undefined,
      };
      const exp = typeof raw.exp === "number" ? new Date(raw.exp * 1000).toISOString() : null;
      const rec = {
        token: token.trim(),
        savedBy: String(savedBy || "").trim().toUpperCase(),
        savedAt: new Date().toISOString(),
        expiresAt: expiresAt ?? exp,
        claims,
      };
      sessionStorage.setItem("isa-patyia:paty-jwt", JSON.stringify(rec));
      window.dispatchEvent(new Event("isa-patyia:paty-jwt"));
    } catch { /* best-effort */ }
  };

  /** Login portal ContaPyme: orchestrator primero; si el worker falla (quota/404/red), DataSnap directo vía ISS. */
  const portalLogin = async (u: string, p: string, opts?: Record<string, unknown>) => {
    const semail = normalizeLoginEmail(u);
    if (!semail || !p) throw new Error("Usuario y contraseña requeridos");
    const body: Record<string, unknown> = { semail, password: p };
    const itercero = String((opts as { itercero?: unknown } | undefined)?.itercero ?? "").trim();
    if (itercero) body.itercero = itercero;

    let data: PortalLoginData | null = null;
    try {
      data = await portalLoginRequest(ORCH_ONLINE, body, origFetch);
    } catch (err) {
      const e = err as PortalLoginError;
      if (e?.code === "MULTI_EMPRESA") throw e;
      const msg = e instanceof Error ? e.message : String(e);
      const workerDown = e?.retryable || isAuthServerDown(msg) || !(e instanceof Error && "status" in e);
      if (!workerDown) throw e;
      // Fallback 1: ISS según target actual (local/staging/prod) — habla directo con el DataSnap.
      const directBase = patyiaIssBase();
      try {
        data = await portalLoginRequest(directBase, body, origFetch);
      } catch (err2) {
        const e2 = err2 as PortalLoginError;
        if (e2?.code === "MULTI_EMPRESA") throw e2;
        // Fallback 2: staging Azure si el target era otro (p. ej. local apagado).
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
      capabilityCatalog: [],
    };
    window.ISA?.AuthApi?.saveSession?.(session);
    cachePortalTokenAsPatyJwt(String(data.token), username, data.expiresAt ?? null);
    return session;
  };

  const wrapLogin = async (u: string, p: string, opts?: Record<string, unknown>) => {
    try {
      const session = await portalLogin(u, p, opts);
      announceAuthServerUp();
      window.dispatchEvent(new Event("isa-patyia:auth"));
      return session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      if (code !== "MULTI_EMPRESA" && isAuthServerDown(msg)) announceAuthServerDown(msg, "login", resolveAuthTarget());
      throw err;
    }
  };

  const wrapFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const res = await origFetch(input, init);
      if (res.status === 401 || res.status === 403) return res;
      if (res.status === 402 || res.status >= 500) {
        try {
          const body = await res.clone().text();
          if (isAuthServerDown(body) || isAuthServerDown(res.statusText)) {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : String((input as Request).url || "");
            if (shouldSuppressAuthDownOverlay(url) || !isAuthCriticalUrl(url)) return res;
            if (hasPortalSessionToken() && !/portal-login/i.test(url)) return res;
            announceAuthServerDown(`HTTP ${res.status} ${res.statusText || ""}`.trim(), "fetch", url || resolveAuthTarget());
          }
        } catch { /* ignore */ }
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : String((input as Request)?.url || "");
      // Failed to fetch en chat/API con sesión viva ≠ auth caído (no tumbar GH Pages).
      if (isAuthServerDown(msg) && !shouldSuppressAuthDownOverlay(url) && isAuthCriticalUrl(url) && !(hasPortalSessionToken() && !/portal-login/i.test(url))) {
        announceAuthServerDown(msg, "fetch");
      }
      throw err;
    }
  };

  Session.login = wrapLogin;
  if (window.ISA?.Auth?.login) window.ISA.Auth.login = wrapLogin;
  try { window.fetch = wrapFetch.bind(window); } catch { /* ignore */ }

  Session.logout = () => {
    origLogout();
    window.dispatchEvent(new Event("isa-patyia:auth"));
  };
}

/** Patches post-registro: mantiene `Config.base/apiUrl/isLocal/setLocal` reflejando el target 3-way.
 *  Antes bloqueaba el switch; ahora respeta `getIssTarget()` y dispara el evento correcto. */
function patchIssOnlyLocalConfig(): void {
  ensureIssLocalDefault();
  migrateIssLocalFromGatewayFlag();
  try { localStorage.setItem(GATEWAY_LS_KEY, "0"); } catch { /* auth/orquestador siempre prod */ }
  const cfg = window.ISA?.Config;
  if (!cfg) return;
  const online = String(cfg.ONLINE || ORCH_ONLINE).replace(/\/$/, "");
  const recompute = () => {
    const t = getIssTarget();
    cfg.isLocal = () => t === "local";
    cfg.setLocal = (on: boolean) => { setIssTarget(on ? "local" : (isDevHost() ? "local" : "staging")); return true; };
    const base = t === "local" ? PATYIA_ISS_LOCAL.replace(/\/$/, "") : t === "production" ? PATYIA_ISS_PROD_URL.replace(/\/$/, "") : PATYIA_ISS_URL.replace(/\/$/, "");
    cfg.base = () => base;
    cfg.apiUrl = (path: string) => base + (path.charAt(0) === "/" ? path : `/${path}`);
    cfg.label = () => t === "local" ? "Local" : t === "production" ? "Producción" : "Staging";
    cfg.connectionHint = () => "";
  };
  recompute();
  cfg.EVENT = "patyia-apptools:iss-target-changed";
  try { window.addEventListener("patyia-apptools:iss-target-changed", recompute); } catch { /* ignore */ }
}

/** Reemplaza el `TargetSwitch*` global con uno 3-way / 2-way según host. */
function patchIsaPatyiaTargetSwitchReadOnly(): void {
  const bag = window.ISA;
  if (!bag?.UI) return;
  // Lazy: el componente se importa de forma dinámica para evitar dependencia circular con App.jsx.
  import("../components/IssTargetSwitch.jsx").then((mod) => {
    if (mod?.IssTargetChip) bag.UI.TargetSwitch = mod.IssTargetChip;
    // IssTargetMenuWithAdmin incluye el botón "Copiar sys_values a producción" (admin patyia + staging).
    if (mod?.IssTargetMenuWithAdmin) bag.UI.TargetSwitchMenu = mod.IssTargetMenuWithAdmin;
    else if (mod?.IssTargetMenu) bag.UI.TargetSwitchMenu = mod.IssTargetMenu;
  }).catch((e) => console.warn("IssTargetSwitch load:", e));
  // ViewAsRoleMenu lo registra App.jsx (mismo bundle que sessionApi/bootMeCaps).
}

function patyiaIssBaseForLogin(): string {
  return patyiaIssBase();
}

/** MUI medium = 56px de alto. Forzar size=small en el Theme de AppShell.
 *  Light: sin glow neón en containedPrimary (se ve mal sobre fondos claros). */
function patchCompactFormThemeDefaults(): void {
  const Theme = window.ISA?.Theme;
  const MUI = window.MaterialUI;
  if (!Theme?.useThemeMode || !MUI?.createTheme) return;

  const lightContained = {
    boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
    "&:hover": { boxShadow: "0 2px 6px rgba(15,23,42,0.12)" },
  };
  const darkContained = {
    boxShadow: "0 0 20px rgba(30,144,255,0.35)",
    "&:hover": { boxShadow: "0 0 28px rgba(30,144,255,0.55)" },
  };
  const buttonPatch = (mode: string) => ({
    MuiButton: {
      styleOverrides: {
        containedPrimary: mode === "light" ? lightContained : darkContained,
      },
    },
  });
  const formDefaults = {
    MuiTextField: { defaultProps: { size: "small", margin: "dense" } },
    MuiFormControl: { defaultProps: { size: "small", margin: "dense" } },
    MuiAutocomplete: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiInputBase: { defaultProps: { size: "small" } },
  };

  const orig = Theme.useThemeMode.bind(Theme);
  Theme.useThemeMode = () => {
    const tm = orig();
    const mode = String(tm?.mode ?? tm?.theme?.palette?.mode ?? "dark");
    const theme = MUI.createTheme(tm.theme, {
      components: { ...formDefaults, ...buttonPatch(mode) },
    });
    return { ...tm, theme };
  };
  if (typeof Theme.makeTheme === "function") {
    const origMake = Theme.makeTheme.bind(Theme);
    Theme.makeTheme = (mode: string) =>
      MUI.createTheme(origMake(mode), {
        components: { ...formDefaults, ...buttonPatch(mode) },
      });
  }
}

/** Registra ISA PatyIA en ISAFront — invocado desde isa-setup.ts al arranque. */
export function bootstrapIsaPatyia(): void {
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
        return tok ? window.ISA!.Session.authHeader() : {};
      },
      unitTestTitle: "Test unitario — ISS-AyudasCPIA",
    },
  });

  patchIssOnlyLocalConfig();
  patchIsaPatyiaTargetSwitchReadOnly();
  patchIsaPatyiaAuthEvents();
  patchCompactFormThemeDefaults();

  if (window.ISAFront?.registerCodeMirror && window.React && window.MaterialUI) {
    window.ISAFront.registerCodeMirror(window.React, window.MaterialUI);
  }

  if (!window.ISA?.Session) {
    throw new Error("No se pudo iniciar la aplicación. Recargue sin caché (Ctrl+Shift+R).");
  }
}
