/** JWT portal ContaPyme — persistido en BD_AUTH por usuario (system-login). Token `app`.
 *  El id `soporte-staging` es solo la clave histórica en BD_AUTH; el mismo JWT vale
 *  para ISS staging y producción (misma auth ContaPyme).
 *
 * NO usar Config.apiUrl: en isa-patyia Config.base se remapea al ISS (Staging/Prod/Local).
 * portal-jwt vive en system-login vía main-orchestrator.
 */
import { Session } from "../core/platform.ts";
import { ORCH_ONLINE } from "../core/patyia.ts";

export const PATYIA_PORTAL_ID = "soporte-staging";

export type PortalJwtResponse = {
  ok: boolean;
  portal?: string;
  username?: string;
  token?: string | null;
  expiresAt?: string | null;
  savedAt?: string | null;
  expired?: boolean;
  claims?: {
    itercero?: string;
    icontacto?: string;
    nombres?: string;
    apellidos?: string;
  };
  error?: string;
};

export type PortalJwtCatalogEntry = {
  username: string;
  expiresAt?: string | null;
  savedAt?: string | null;
  claims?: {
    itercero?: string;
    icontacto?: string;
    nombres?: string;
    apellidos?: string;
  } | null;
};

export type PortalJwtCatalogResponse = {
  ok: boolean;
  portal?: string;
  entries?: PortalJwtCatalogEntry[];
  error?: string;
};

function orchBase(): string {
  return ORCH_ONLINE.replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" };
  if (Session.isLoggedIn()) {
    Object.assign(h, Session.authHeader(), Session.appHeader());
  }
  return h;
}

function portalUrl(portal: string, query = "") {
  const q = `portal=${encodeURIComponent(portal)}${query ? `&${query}` : ""}`;
  return `${orchBase()}/api/auth/portal-jwt?${q}`;
}

export async function fetchPortalJwt(portal = PATYIA_PORTAL_ID): Promise<PortalJwtResponse> {
  const res = await fetch(portalUrl(portal), { headers: authHeaders() });
  const data = (await res.json().catch(() => ({}))) as PortalJwtResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo cargar el JWT del portal");
  }
  return data;
}

/** JWT portal de otro usuario ISA — requiere capacidad patyia.jwt.admin. */
export async function fetchPortalJwtForUser(
  username: string,
  portal = PATYIA_PORTAL_ID,
): Promise<PortalJwtResponse> {
  const q = `username=${encodeURIComponent(String(username).trim().toUpperCase())}`;
  const res = await fetch(portalUrl(portal, q), { headers: authHeaders() });
  const data = (await res.json().catch(() => ({}))) as PortalJwtResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo cargar el JWT del usuario");
  }
  return data;
}

/** Catálogo de JWT guardados en BD_AUTH — solo admin. */
export async function fetchPortalJwtCatalog(portal = PATYIA_PORTAL_ID): Promise<PortalJwtCatalogResponse> {
  const res = await fetch(
    `${orchBase()}/api/auth/portal-jwt/catalog?portal=${encodeURIComponent(portal)}`,
    { headers: authHeaders() },
  );
  const data = (await res.json().catch(() => ({}))) as PortalJwtCatalogResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo listar JWT de portal");
  }
  return data;
}

export async function savePortalJwt(token: string, portal = PATYIA_PORTAL_ID): Promise<PortalJwtResponse> {
  const res = await fetch(portalUrl(portal), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ portal, token }),
  });
  const data = (await res.json().catch(() => ({}))) as PortalJwtResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo guardar el JWT del portal");
  }
  return data;
}

export async function removePortalJwt(portal = PATYIA_PORTAL_ID): Promise<void> {
  const res = await fetch(portalUrl(portal), { method: "DELETE", headers: authHeaders() });
  const data = (await res.json().catch(() => ({}))) as PortalJwtResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "No se pudo eliminar el JWT del portal");
  }
}
