/** Contacto actual desde JWT PatyIA — reemplaza SYS_VALUES.contactos[username]. Skill: dsclientes-contapyme. */
import { loadPatyJwt } from "../core/patyia-jwt";

export type Contacto = {
  username: string;
  itercero: string;
  icontacto: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  controlkey: string;
  iapp: number;
  idmaquina: string;
  roles: string[];
  source: "jwt";
  cachedAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, Contacto>();

function decodeClaims(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) return {};
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  try {
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function usernameFromJwt(jwt: { token?: string; claims?: Record<string, unknown> } | null): string {
  const c = jwt?.claims || (jwt?.token ? decodeClaims(jwt.token) : {});
  const raw = String(c.ientity ?? c.iusuario ?? "").trim();
  if (!raw) return "";
  return raw.split("@")[0].toUpperCase();
}

/** Info del contacto logueado (offline desde JWT + roles vía /system/permisos). */
export async function getContactoActual(): Promise<Contacto | null> {
  const jwt = loadPatyJwt();
  if (!jwt?.token) return null;
  const username = usernameFromJwt(jwt);
  if (!username) return null;

  const hit = cache.get(username);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return hit;

  const c = jwt.claims || decodeClaims(jwt.token);
  const nombres = String(c.nombres ?? "");
  const apellidos = String(c.apellidos ?? "");
  const contacto: Contacto = {
    username,
    itercero: String(c.itercero ?? ""),
    icontacto: String(c.icontacto ?? ""),
    nombres,
    apellidos,
    nombreCompleto: [nombres, apellidos].filter(Boolean).join(" ").trim(),
    controlkey: String(c.controlkey ?? ""),
    iapp: Number(c.iapp ?? 0),
    idmaquina: String(c.idmaquina ?? ""),
    roles: [],
    source: "jwt",
    cachedAt: Date.now(),
  };

  try {
    const r = await fetch("/api/system/permisos", {
      headers: { Authorization: `Bearer ${jwt.token}`, Accept: "application/json" },
    });
    if (r.ok) {
      const j = await r.json();
      const roles = (j?.respuesta?.roles ?? j?.roles ?? [])
        .map((x: { ientity?: string }) => x?.ientity)
        .filter(Boolean) as string[];
      contacto.roles = roles;
      const map = j?.respuesta?.contactos ?? j?.contactos;
      if (map && typeof map === "object" && map[username]) {
        const e = map[username];
        if (e?.nombre) contacto.nombreCompleto = String(e.nombre);
        if (e?.icontacto != null) contacto.icontacto = String(e.icontacto);
        if (e?.itercero) contacto.itercero = String(e.itercero);
      }
    }
  } catch {
    /* contacto sin roles */
  }

  cache.set(username, contacto);
  return contacto;
}

export function clearContactoCache(username?: string) {
  if (username) cache.delete(username.toUpperCase());
  else cache.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("isa-patyia:paty-jwt", () => clearContactoCache());
}
