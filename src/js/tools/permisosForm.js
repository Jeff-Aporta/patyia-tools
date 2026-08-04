/** Metadatos dentro de PERMISOS — no son restricciones METHOD:/path. */
export const PERM_META = new Set(["descripcion", "namedisplay", "roles"]);

export const FLAG_DEFS = [
  { key: "*", label: "Acceso total", hint: "Wildcard — anula el resto de restricciones de ruta." },
  { key: "impersonate", label: "Suplantar chat", hint: "Actuar como otro usuario en conversaciones." },
  { key: "manage_permissions", label: "Gestionar permisos", hint: "CRUD de dbo.SYS_USR_PERMISSIONS (DEVISS)." },
];

export const ACCESS_MODES = [
  { value: "off", label: "Sin acceso" },
  { value: "allow", label: "Permitido" },
  { value: "filtered", label: "Filtrado (filter)" },
];

const FLAG_KEYS = new Set(FLAG_DEFS.map((f) => f.key));

export function prettyJson(obj) {
  try { return JSON.stringify(obj ?? {}, null, 2); } catch { return "{}"; }
}

export function roleDescripcion(permisos) {
  const d = permisos?.descripcion;
  return d != null && String(d).trim() ? String(d).trim() : "";
}

export function roleNamedisplay(permisos) {
  const d = permisos?.namedisplay;
  return d != null && String(d).trim() ? String(d).trim() : "";
}

export function userRoles(permisos) {
  const r = permisos?.roles;
  return Array.isArray(r) ? r.map((x) => String(x).trim().toUpperCase()).filter(Boolean) : [];
}

export function userOverrides(permisos) {
  const out = {};
  for (const [k, v] of Object.entries(permisos ?? {})) {
    if (!PERM_META.has(k)) out[k] = v;
  }
  return out;
}

export function restrictionToMode(value) {
  if (value === true) return "allow";
  if (value && typeof value === "object") {
    const f = value.filter;
    if (f && typeof f === "object" && !Array.isArray(f) && Object.keys(f).length) return "filtered";
    return "allow";
  }
  return "off";
}

import { filterFromRestriction } from "./permFilter.js";

export function modeToRestriction(mode, filter) {
  if (mode === "allow") return true;
  if (mode === "filtered") {
    const f = filterFromRestriction({ filter });
    return f ? { filter: f } : true;
  }
  return null;
}

/** { flags, routes: [{ key, mode }] } desde mapa de rol. */
export function splitRolePermisos(permisos) {
  const flags = Object.fromEntries(FLAG_DEFS.map((f) => [f.key, false]));
  const routes = [];
  for (const [key, value] of Object.entries(permisos ?? {})) {
    if (PERM_META.has(key)) continue;
    if (FLAG_KEYS.has(key)) {
      flags[key] = value === true;
      continue;
    }
    const mode = restrictionToMode(value);
    if (mode !== "off") {
      const filter = filterFromRestriction(value);
      routes.push(filter ? { key, mode, filter } : { key, mode });
    }
  }
  routes.sort((a, b) => a.key.localeCompare(b.key));
  return { flags, routes };
}

export function buildRolePermisos(desc, namedisplay, flags, routes) {
  const out = {};
  if (String(desc ?? "").trim()) out.descripcion = String(desc).trim();
  if (String(namedisplay ?? "").trim()) out.namedisplay = String(namedisplay).trim();
  for (const def of FLAG_DEFS) {
    if (flags[def.key]) out[def.key] = true;
  }
  for (const row of routes) {
    if (!row.key || row.mode === "off") continue;
    const restr = modeToRestriction(row.mode, row.filter);
    if (restr != null) out[row.key] = restr;
  }
  return out;
}

export function buildUserPermisos(selectedRoles, overrides = {}) {
  const roles = [...new Set(selectedRoles.map((r) => String(r).trim().toUpperCase()).filter(Boolean))];
  return { roles, ...overrides };
}

export function countActiveRoutes(routes) {
  return (routes || []).filter((r) => r.mode && r.mode !== "off").length;
}

export function activeFlags(permisos) {
  const { flags } = splitRolePermisos(permisos);
  return FLAG_DEFS.filter((f) => flags[f.key]);
}

export function summarizePermisos(permisos) {
  const { flags, routes } = splitRolePermisos(permisos);
  const flagCount = FLAG_DEFS.filter((f) => flags[f.key]).length;
  const routeCount = countActiveRoutes(routes);
  return { flagCount, routeCount };
}