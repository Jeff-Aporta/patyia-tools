/** Catálogo de rutas JWT protegidas — orden y etiquetas para el editor de roles. */
import { filterFromRestriction } from "./permFilter.js";
export const ROUTE_GROUPS = [
  {
    id: "conversaciones",
    title: "Conversaciones",
    routes: [
      { key: "QUERY:/api/conversaciones", label: "Listar conversaciones", scoped: true },
      { key: "GET:/api/conversacion/*", label: "Ver conversación", scoped: true },
      { key: "GET:/api/conversacion/logs/*", label: "Logs de conversación" },
      { key: "POST:/api/conversacion", label: "Crear conversación", scoped: true },
      { key: "POST:/api/mensaje", label: "Enviar mensaje", scoped: true },
      { key: "DELETE:/api/conversacion/*", label: "Eliminar conversación", scoped: true },
    ],
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
      { key: "PUT:/api/system/*", label: "PUT sistema (wildcard)" },
    ],
  },
  {
    id: "patyia",
    title: "PatyIA",
    routes: [
      { key: "GET:/api/patyia/admin/roles", label: "Admin roles PatyIA" },
      { key: "PUT:/api/patyia/admin/roles/*", label: "Asignar rol contacto" },
      { key: "GET:/api/patyia/admin/acciones", label: "Admin acciones x rol" },
      { key: "PUT:/api/patyia/admin/acciones", label: "Upsert acción x rol" },
    ],
  },
  {
    id: "documentacion",
    title: "Documentación",
    routes: [
      { key: "PUT:/api/swagger.json", label: "Swagger declarativo" },
    ],
  },
];

const CATALOG_KEYS = new Set(ROUTE_GROUPS.flatMap((g) => g.routes.map((r) => r.key)));

export function isWildcardRole(permisos) {
  return permisos?.["*"] === true;
}

/** Filas { key, mode, label?, scoped? } para editor / vista. */
export function routesForRoleEditor(permisos, { includeInactive = false } = {}) {
  const wildcard = isWildcardRole(permisos);
  const modeByKey = new Map();
  const filterByKey = new Map();
  for (const [key, value] of Object.entries(permisos ?? {})) {
    if (key === "*" || key === "descripcion" || key === "namedisplay" || key === "roles"
      || key === "impersonate" || key === "manage_permissions") continue;
    const hasFilter = !!(value && typeof value === "object" && value.filter && typeof value.filter === "object" && !Array.isArray(value.filter) && Object.keys(value.filter).length);
    const mode = value === true ? "allow" : hasFilter ? "filtered" : value && typeof value === "object" ? "allow" : "off";
    if (mode !== "off") modeByKey.set(key, mode);
    const f = filterFromRestriction(value);
    if (f) filterByKey.set(key, f);
  }

  const groups = ROUTE_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    routes: g.routes.map((def) => {
      let mode = "off";
      if (wildcard) mode = def.scoped ? "filtered" : "allow";
      else if (modeByKey.has(def.key)) mode = modeByKey.get(def.key);
      return { ...def, mode, filter: filterByKey.get(def.key), active: mode !== "off" };
    }).filter((r) => includeInactive || r.active),
  })).filter((g) => g.routes.length > 0);

  const extras = [...modeByKey.entries()]
    .filter(([key]) => !CATALOG_KEYS.has(key))
    .map(([key, mode]) => ({
      key, label: key, mode, filter: filterByKey.get(key), active: true, scoped: mode === "filtered",
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return { groups, extras, wildcard, activeCount: [...modeByKey.keys()].length + (wildcard ? 1 : 0) };
}

export function routesArrayFromPermisos(permisos, includeInactive) {
  const { groups, extras } = routesForRoleEditor(permisos, { includeInactive });
  const rows = [];
  for (const g of groups) {
    for (const r of g.routes) rows.push({ key: r.key, mode: r.mode, ...(r.filter ? { filter: r.filter } : {}) });
  }
  for (const r of extras) rows.push({ key: r.key, mode: r.mode, ...(r.filter ? { filter: r.filter } : {}) });
  return rows;
}

export function groupsFromRouteRows(routes, flags, { includeInactive = false } = {}) {
  const permisos = {};
  if (flags?.["*"]) permisos["*"] = true;
  for (const r of routes ?? []) {
    if (!r?.key || r.mode === "off") continue;
    if (r.mode === "allow") permisos[r.key] = true;
    else if (r.mode === "filtered") permisos[r.key] = r.filter ? { filter: r.filter } : true;
  }
  return routesForRoleEditor(permisos, { includeInactive });
}