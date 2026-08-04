import { roleDescripcion } from "./permisosForm.js";
import { roleNameFromEntry, roleTitleFromEntry, USR_ROLE } from "./permisosKanbanShared.js";
import { SESSION_OWNER_FILTER, withSessionOwnerFilter } from "./permFilter.js";

export const VISITANTE_ROLE = USR_ROLE;

export const VISITANTE_DEFAULT_PERMISOS = {
  namedisplay: "Usuario",
  descripcion: "Usuario — solo sus propias conversaciones; logs abiertos; resto lectura",
  "QUERY:/api/conversaciones": { filter: { ...SESSION_OWNER_FILTER } },
  "GET:/api/conversacion/*": { filter: { ...SESSION_OWNER_FILTER } },
  "GET:/api/conversacion/logs/*": true,
  "POST:/api/conversacion": { filter: { ...SESSION_OWNER_FILTER } },
  "POST:/api/mensaje": { filter: { ...SESSION_OWNER_FILTER } },
  "DELETE:/api/conversacion/*": { filter: { ...SESSION_OWNER_FILTER } },
};

/** Rutas de conversación con filter fijo «dueño de sesión» (no editable). */
export const VISITANTE_LOCKED_OWN_KEYS = new Set([
  "QUERY:/api/conversaciones",
  "GET:/api/conversacion/*",
  "POST:/api/conversacion",
  "POST:/api/mensaje",
  "DELETE:/api/conversacion/*",
]);

export const VISITANTE_REQUIRED_OWN_KEYS = new Set([
  "QUERY:/api/conversaciones",
  "GET:/api/conversacion/*",
]);

export function isVisitanteRole(roleName) {
  return String(roleName ?? "").trim().toUpperCase() === VISITANTE_ROLE;
}

export function enforceVisitantePermisos(permisos) {
  const out = { ...(permisos ?? {}) };
  delete out["*"];
  delete out.impersonate;
  delete out.manage_permissions;
  for (const key of VISITANTE_REQUIRED_OWN_KEYS) {
    out[key] = withSessionOwnerFilter({ filter: { ...SESSION_OWNER_FILTER } });
  }
  for (const key of VISITANTE_LOCKED_OWN_KEYS) {
    const v = out[key];
    if (v == null || v === false) continue;
    if (v === true) out[key] = withSessionOwnerFilter(v);
    else if (typeof v === "object") out[key] = withSessionOwnerFilter(v);
  }
  return out;
}

export function visitanteRouteLocked(key) {
  return VISITANTE_LOCKED_OWN_KEYS.has(key);
}

export function getVisitanteRoleEntry(data) {
  const hit = (data?.roles ?? []).find((r) => roleNameFromEntry(r) === VISITANTE_ROLE);
  if (hit) return hit;
  return {
    iusuario: VISITANTE_ROLE,
    itipo: "role",
    permisos: { ...VISITANTE_DEFAULT_PERMISOS },
    bactivo: true,
  };
}

export function buildVisitanteConfigColumn(data) {
  const entry = getVisitanteRoleEntry(data);
  return {
    id: VISITANTE_ROLE,
    roleName: VISITANTE_ROLE,
    title: roleTitleFromEntry(entry),
    descripcion: roleDescripcion(entry.permisos),
    entry,
    accent: "#64748b",
    icon: "mdi:account-outline",
    users: [],
  };
}
