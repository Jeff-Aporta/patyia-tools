/** JWT InSoft (portal ContaPyme) para chat PatyIA — misma auth en staging y prod.
 *  Caché: sessionStorage. Persistencia opcional en BD_AUTH (portal id histórico `soporte-staging`).
 */

import { fetchPortalJwt, removePortalJwt, savePortalJwt, fetchPortalJwtForUser, PATYIA_PORTAL_ID } from "../api/portalJwtApi.ts";
import { fetchTercerosAudit, type TerceroAuditRow } from "../api/apiClient.ts";
import { Session } from "./platform.ts";

export const PATYIA_JWT_STORAGE_KEY = "isa-patyia:paty-jwt";
export { PATYIA_PORTAL_ID };
export const PATYIA_API_BASE = "https://ayudascp-ia-staging.azurewebsites.net/api";
export const PATYIA_MCP_URL = "https://ia.contapyme.com/runtime/webhooks/mcp";

export type PatyJwtClaims = { itercero?: string; icontacto?: string; nombres?: string; apellidos?: string; controlkey?: string; iapp?: number; idmaquina?: string };

/** actingAsUsername: dueño del token en BD_AUTH (admin). actingAsDisplayName: nombre del contacto dueño. */
export type PatyJwtRecord = { token: string; savedBy: string; savedAt: string; expiresAt?: string | null; claims: PatyJwtClaims; actingAsUsername?: string | null; actingAsDisplayName?: string | null };

/** Compara usuarios ISA (email vs nick). */
export function samePatyUser(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = String(a ?? "").trim().toUpperCase();
  const nb = String(b ?? "").trim().toUpperCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const strip = (s: string) => s.replace(/@CONTAPYME\.COM$/i, "").replace(/@.*$/, "");
  return strip(na) === strip(nb);
}

export function parseJwtExp(token: string): number | null {
  try {
    const part = String(token || "").trim().split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(json) as { exp?: number };
    return typeof raw.exp === "number" ? raw.exp : null;
  } catch {
    return null;
  }
}

export function isPatyJwtExpired(token: string, skewSec = 60): boolean {
  const exp = parseJwtExp(token);
  if (!exp) return false;
  return Date.now() / 1000 >= exp - skewSec;
}

export function parseJwtClaims(token: string): PatyJwtClaims | null {
  try {
    const part = String(token || "").trim().split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(json) as Record<string, unknown>;
    return { itercero: raw.itercero != null ? String(raw.itercero) : undefined, icontacto: raw.icontacto != null ? String(raw.icontacto) : undefined, nombres: raw.nombres != null ? String(raw.nombres) : undefined, apellidos: raw.apellidos != null ? String(raw.apellidos) : undefined, controlkey: raw.controlkey != null ? String(raw.controlkey) : undefined, iapp: typeof raw.iapp === "number" ? raw.iapp : undefined, idmaquina: raw.idmaquina != null ? String(raw.idmaquina) : undefined };
  } catch {
    return null;
  }
}

export function jwtOwnerLabel(claims: PatyJwtClaims | null | undefined): string {
  if (!claims) return "Sin token";
  const name = jwtUserDisplayName(claims);
  const id = claims.itercero ? ` · tercero ${claims.itercero}` : "";
  return (name || "Usuario JWT") + id;
}

/** Nombre completo del contacto (sin tercero). */
export function jwtUserDisplayName(claims: PatyJwtClaims | null | undefined): string {
  if (!claims) return "";
  return [claims.nombres, claims.apellidos].filter(Boolean).join(" ").trim();
}

/** Nombre corto: primer nombre + primer apellido. */
export function shortDisplayName(full: string | null | undefined): string {
  const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  return `${parts[0]} ${parts[2]}`;
}

export function jwtUserShortName(claims: PatyJwtClaims | null | undefined): string {
  if (!claims) return "";
  const n = String(claims.nombres ?? "").trim().split(/\s+/).filter(Boolean)[0];
  const a = String(claims.apellidos ?? "").trim().split(/\s+/).filter(Boolean)[0];
  if (n && a) return `${n} ${a}`;
  if (n) return n;
  if (a) return a;
  return shortDisplayName(jwtUserDisplayName(claims));
}

function cachePatyJwt(rec: PatyJwtRecord): PatyJwtRecord {
  const prevRaw = sessionStorage.getItem(PATYIA_JWT_STORAGE_KEY);
  let prev: PatyJwtRecord | null = null;
  try {
    prev = prevRaw ? (JSON.parse(prevRaw) as PatyJwtRecord) : null;
  } catch {
    prev = null;
  }
  sessionStorage.setItem(PATYIA_JWT_STORAGE_KEY, JSON.stringify(rec));
  const changed = !prev
    || prev.token !== rec.token
    || String(prev.savedBy ?? "").toUpperCase() !== String(rec.savedBy ?? "").toUpperCase();
  if (changed) window.dispatchEvent(new Event("isa-patyia:paty-jwt"));
  return rec;
}

export function loadPatyJwt(): PatyJwtRecord | null {
  try {
    const raw = sessionStorage.getItem(PATYIA_JWT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PatyJwtRecord;
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

function buildPatyJwtRecord(token: string, savedBy: string, expiresAt?: string | null): PatyJwtRecord {
  const claims = parseJwtClaims(token);
  if (!claims?.itercero) throw new Error("Token JWT inválido o sin itercero");
  const exp = parseJwtExp(token);
  return { token: token.trim(), savedBy: String(savedBy || "").trim().toUpperCase(), savedAt: new Date().toISOString(), expiresAt: expiresAt ?? (exp ? new Date(exp * 1000).toISOString() : null), claims };
}

/**
 * Reusa el JWT ContaPyme de la sesión ISA (login portal).
 * Misma firma sirve para ISS staging y producción — no depende del chip target.
 */
export function syncPatyJwtFromSession(): PatyJwtRecord | null {
  if (!Session.isLoggedIn()) return null;
  const sess = Session.current() as { token?: string; username?: string; expiresAt?: string | null } | null;
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

/** Guarda en caché local (sessionStorage). Preferir savePatyJwtAsync para persistir en BD. */
export function savePatyJwt(token: string, savedBy: string, expiresAt?: string | null): PatyJwtRecord {
  return cachePatyJwt(buildPatyJwtRecord(token, savedBy, expiresAt));
}

export async function savePatyJwtAsync(token: string, savedBy: string): Promise<PatyJwtRecord> {
  const saved = await savePortalJwt(token.trim(), PATYIA_PORTAL_ID);
  return cachePatyJwt(buildPatyJwtRecord(token, savedBy, saved.expiresAt));
}

export function clearPatyJwtLocal(options?: { silent?: boolean }): void {
  const had = sessionStorage.getItem(PATYIA_JWT_STORAGE_KEY);
  sessionStorage.removeItem(PATYIA_JWT_STORAGE_KEY);
  if (!options?.silent && had) window.dispatchEvent(new Event("isa-patyia:paty-jwt"));
}

export async function clearPatyJwtAsync(): Promise<void> {
  try {
    await removePortalJwt(PATYIA_PORTAL_ID);
  } catch {
    /* si falla la BD, igual limpiamos caché local */
  }
  clearPatyJwtLocal();
}

/** Carga JWT: caché → sesión ContaPyme → BD_AUTH (si el orchestrator/Neon responde). */
export async function hydratePatyJwtFromServer(username: string | null | undefined): Promise<PatyJwtRecord | null> {
  const u = String(username || "").trim().toUpperCase();
  if (!u) {
    clearPatyJwtLocal({ silent: true });
    return null;
  }

  const cached = loadPatyJwt();
  if (cached?.actingAsUsername) return cached;
  if (cached && samePatyUser(cached.savedBy, u)) return cached;

  // Sesión ISA ya trae el JWT portal (staging=prod auth). No depender de Neon.
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
    console.warn("[paty-jwt] hydrate BD falló (uso sesión si hay):", err instanceof Error ? err.message : err);
    return loadPatyJwt() || syncPatyJwtFromSession();
  }
}

/** @deprecated usar clearPatyJwtAsync */
export function clearPatyJwt(): void {
  clearPatyJwtLocal();
}

/* Suplantación erradicada (21-jul-2026): sin modo «impersonation» en el chat. */

/** Interactúa quien usa su JWT propio; JWT ajeno sigue restringido a administración. */
export function canInteractPatyChat(sessionUser: string | null | undefined, jwt: PatyJwtRecord | null): boolean {
  const u = String(sessionUser || "").trim().toUpperCase();
  if (!u || !jwt?.token) return false;
  if (samePatyUser(jwt.savedBy, u)) return true;
  if (!Session.can("patyia.chat.interact")) return false;
  if (jwt.actingAsUsername && Session.can("patyia.jwt.admin")) return true;
  return false;
}

export function canAdminPortalJwt(): boolean {
  return Session.can("patyia.jwt.admin");
}

export function jwtDisplayNameFromClaims(claims: PatyJwtClaims | null | undefined): string {
  return jwtUserDisplayName(claims) || jwtUserShortName(claims) || "";
}

function buildActingJwtRecord(
  token: string,
  sessionUser: string,
  ownerUsername: string,
  expiresAt?: string | null,
  actingAsDisplayName?: string | null,
): PatyJwtRecord {
  const rec = buildPatyJwtRecord(token, sessionUser, expiresAt);
  const displayName = String(actingAsDisplayName ?? "").trim()
    || jwtDisplayNameFromClaims(rec.claims)
    || undefined;
  return { ...rec, actingAsUsername: ownerUsername.trim().toUpperCase(), actingAsDisplayName: displayName ?? null };
}

/** Admin: carga JWT portal de otro usuario ISA (sin guardarlo en su fila BD). */
export async function activatePortalJwtAsAdmin(
  ownerUsername: string,
  sessionUser: string,
  displayName?: string | null,
): Promise<PatyJwtRecord> {
  const owner = String(ownerUsername || "").trim().toUpperCase();
  const u = String(sessionUser || "").trim().toUpperCase();
  if (!owner || !u) throw new Error("Sesión y usuario dueño requeridos");
  if (!canAdminPortalJwt()) throw new Error("Sin permiso para usar JWT de otros usuarios");

  const data = await fetchPortalJwtForUser(owner, PATYIA_PORTAL_ID);
  if (!data.token || isPatyJwtExpired(data.token)) {
    throw new Error(`Sin JWT vigente en BD para ${owner}`);
  }
  const nameFromApi = jwtDisplayNameFromClaims(data.claims ?? null)
    || jwtDisplayNameFromClaims(parseJwtClaims(data.token));
  const actingName = String(displayName ?? "").trim() || nameFromApi || null;
  return cachePatyJwt(buildActingJwtRecord(data.token, u, owner, data.expiresAt ?? null, actingName));
}

export function convBelongsToJwt(
  conv: { itercero?: string | number; icontacto?: string | number },
  claims: PatyJwtClaims | null | undefined,
): boolean {
  if (!claims?.itercero) return false;
  return String(conv.itercero ?? "") === String(claims.itercero)
    && String(conv.icontacto ?? "") === String(claims.icontacto ?? "");
}

/** Alcance de navegación por tercero/contacto (auditoría de sesión). */

export type BrowseScope = { itercero: string; icontacto: string; nombre?: string | null };

export function findAuditRowForSessionUser(
  rows: TerceroAuditRow[],
  _sessionUser: string | null | undefined,
): TerceroAuditRow | null {
  return rows.find((r) => r.es_sesion) ?? null;
}

export function auditRowToBrowseScope(row: TerceroAuditRow): BrowseScope {
  return { itercero: row.itercero, icontacto: row.icontacto, nombre: row.nombre ? shortDisplayName(row.nombre) : null };
}

export async function resolveSessionBrowseScope(
  sessionUser: string | null | undefined,
): Promise<BrowseScope | null> {
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

export function browseScopeKey(scope: BrowseScope | null | undefined): string {
  if (!scope?.itercero || !scope?.icontacto) return "";
  return `${scope.itercero}|${scope.icontacto}`;
}
