/** Configuración, avatares y streaming SSE — dominio PatyIA (isa-patyia). */

/// <reference path="../global.d.ts" />



window.ISAFront.migrateLegacyGatewayKeys?.({ "jeff:gateway-local": "", "patyia-apptools:gateway-local": "", "patyia-apptools:lab-local": "" });



export const ORCH_ONLINE = "https://main-orchestrator.jeffaporta.workers.dev";

/** ISS-AyudasCPIA (canónico) — backend único de isa-patyia (antes `iss-patyia-bridge`). */
export const PATYIA_ISS_URL = "https://ayudascp-ia-staging.azurewebsites.net";

/** ISS-AyudasCPIA — slot de producción (canónico para el botón "Copiar a producción"). */
export const PATYIA_ISS_PROD_URL = "https://ayudascp-ia.azurewebsites.net";

/** ISS AyudasCPIA local (Azure Functions routePrefix api). */
export const PATYIA_ISS_LOCAL = "http://127.0.0.1:8802";

/** Workers locales — canónico: Personal/apps/src/protocolos/dev-ports.json (npm run sync:ports). */
export const ORCH_LOCAL = "http://localhost:8790";
export const SCRUM_LOCAL = "http://localhost:8798";
export const TREE_MSGS_LOCAL = "http://localhost:8799";

/** ISS-AyudasCPIA local con prefijo /api. */
export const PATYIA_ISS_LOCAL_API = `${PATYIA_ISS_LOCAL}/api`;

/** ISS-AyudasCPIA producción con prefijo /api. */
export const PATYIA_ISS_PROD_API = `${PATYIA_ISS_PROD_URL}/api`;

/** ISS-AyudasCPIA staging con prefijo /api. */
export const PATYIA_ISS_STAGING_API = `${PATYIA_ISS_URL}/api`;

/** LS keys. */
export const PATYIA_ISS_TARGET_LS_KEY = "patyia-apptools:iss-target";
export const PATYIA_ISS_LOCAL_LS_KEY = "patyia-apptools:iss-local";
export const GATEWAY_LS_KEY = "jeff:gateway-local";

/** Tipos de target disponibles. */
export type IssTarget = "production" | "staging" | "local";



export function isPatyiaApiPath(path: string) {

  const p = path.startsWith("/") ? path : `/${path}`;

  return p.startsWith("/patyia") || p.startsWith("/api/patyia");

}

/** URL base sin /api para capFetch (normalizeApiPath lo añade). */
export function patyiaIssBase() {
  const t = getIssTarget();
  if (t === "local") return PATYIA_ISS_LOCAL.replace(/\/$/, "");
  if (t === "production") return PATYIA_ISS_PROD_URL.replace(/\/$/, "");
  return PATYIA_ISS_URL.replace(/\/$/, "");
}

/** Base para capFetch: sin /api. */
export function patyiaIssCapFetchBase() {
  return patyiaIssBase();
}

/** Base con /api al final. */
export function resolveIssApiBase() {
  const base = patyiaIssBase();
  return base.endsWith("/api") ? base : `${base}/api`;
}

/** Lee el target actual desde LS. Default: "staging" si web, "local" si dev host. */
export function getIssTarget(): IssTarget {
  try {
    const raw = localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY);
    if (raw === "production" || raw === "staging" || raw === "local") return raw;
  } catch { /* ignore */ }
  return isDevHost() ? "local" : "staging";
}

/** Persiste el target y dispara el evento para que el front reaccione. */
export function setIssTarget(target: IssTarget): void {
  try { localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, target); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("patyia-apptools:iss-target-changed", { detail: { target } })); } catch { /* ignore */ }
  // forcePermsOpen() depende del target: re-evaluar caps UI (prod abierto vs SEG en staging/local).
  try { window.dispatchEvent(new Event("patyia-apptools:caps-changed")); } catch { /* ignore */ }
}

/** @deprecated Mantener para compatibilidad — el switch real es setIssTarget. */
export function setLocalMode(_on: boolean) {
  return true;
}

/** Front servido desde localhost (QA http-server :8766, etc.). */
export function isDevHost() {
  try { return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname); } catch { return false; }
}

/** Primera visita: setea target default. Web → staging, dev → local. */
export function ensureIssLocalDefault() {
  try {
    if (localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY) != null) return;
    const def = isDevHost() ? "local" : "staging";
    localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, def);
  } catch { /* ignore */ }
}



/** Migra LS legacy (`patyia-apptools:iss-local` / `jeff:gateway-local`) al nuevo target 3-way. Idempotente. */
export function migrateIssLocalFromGatewayFlag() {
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
  } catch { /* ignore */ }
}

/** @deprecated Mantener para compatibilidad. */
export function isLocalMode() {
  return getIssTarget() === "local";
}



/** Paleta estable para fondo de avatar (hash del nombre → color). */
const AVATAR_BG_PALETTE = [
  "1e90ff", "0ea5e9", "14b8a6", "22c55e", "84cc16",
  "eab308", "f97316", "ef4444", "ec4899", "a855f7",
  "6366f1", "64748b",
];

function avatarBgFromName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_BG_PALETTE[h % AVATAR_BG_PALETTE.length];
}

/**
 * Avatar generado por nombre — SVG inline (data URL), sin servicio externo.
 * ui-avatars.com quedaba en rojo en la red (bloqueos / offline); local siempre funciona.
 * Fuente canónica compartida: también en `window.ISAFront.buildUserAvatarUrl`
 * (UserSessionMenu / chip de sesión). Cambiar API aquí afecta todo.
 */
export function buildUserAvatarUrl(name: string | null | undefined, size = 72): string {
  const label = String(name ?? "").trim() || "Usuario";
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";
  const bg = avatarBgFromName(label.toLowerCase());
  const half = size / 2;
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${half}" cy="${half}" r="${half}" fill="#${bg}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

try {
  window.ISAFront.buildUserAvatarUrl = buildUserAvatarUrl;
} catch { /* ignore */ }



/** Parser SSE del stream POST /api/conversacion (PatyIA). */

export type PatySseEvent = { event: string; data: Record<string, unknown> };



export async function readPatyiaSseStream(

  response: Response,

  onEvent: (ev: PatySseEvent) => void,

): Promise<Record<string, unknown>> {

  if (!response.ok) {

    let msg = response.statusText;

    try {

      const j = await response.json();

      msg = String(j?.error || j?.message || msg);

    } catch { /* ignore */ }

    throw new Error(msg || `HTTP ${response.status}`);

  }

  const reader = response.body?.getReader();

  if (!reader) throw new Error("Stream no disponible");



  const dec = new TextDecoder();

  let buf = "";

  let lastPayload: Record<string, unknown> = {};



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

        const data = JSON.parse(dataLine) as Record<string, unknown>;

        lastPayload = data;

        onEvent({ event, data });

      } catch { /* ignore malformed */ }

    }

  }

  return lastPayload;

}

