// src/js/tools/permisosForm.js
var FLAG_DEFS = [
  { key: "*", label: "Acceso total", hint: "Wildcard \u2014 anula el resto de restricciones de ruta." },
  { key: "impersonate", label: "Suplantar chat", hint: "Actuar como otro usuario en conversaciones." },
  { key: "manage_permissions", label: "Gestionar permisos", hint: "CRUD de dbo.SYS_USR_PERMISSIONS (DEVISS)." }
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

// src/js/tools/roleCanonicalMeta.js
var CANONICAL_ROLE_META = {
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
function canonicalRoleMeta(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  return CANONICAL_ROLE_META[key] ?? null;
}

// src/js/tools/permisosKanbanShared.js
var USR_ROLE = "USR";
var VISITANTE = USR_ROLE;
var ROLE_ACCENTS = ["#1e90ff", "#10b981", "#a855f7", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];
var ROLE_ICONS = ["mdi:shield-account", "mdi:file-document-edit-outline", "mdi:code-braces", "mdi:robot-outline", "mdi:eye-outline", "mdi:account-group-outline"];
function permEntryKey(entry) {
  return String(entry?.iusuario ?? entry?.ientity ?? "").trim();
}
function roleNameFromEntry(entry) {
  return permEntryKey(entry).toUpperCase().replace(/^ROLE:/i, "");
}
function formatRoleTitle(roleName) {
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
  const formatted = formatRoleTitle(roleName);
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
  const activeRoles = roles.filter((entry) => entry?.itipo !== "user" && entry?.bactivo !== false && roleNameFromEntry(entry));
  const columns = activeRoles.map((entry, index) => {
    const roleName = roleNameFromEntry(entry);
    const theme = themeForRole(roleName, index, entry.permisos);
    return {
      id: roleName,
      roleName,
      title: roleTitleFromEntry(entry),
      descripcion: roleDescripcionFromEntry(entry),
      entry,
      accent: theme.accent,
      icon: theme.icon,
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
function buildRolePermisosIndex(roles) {
  const out = {};
  for (const r of roles ?? []) {
    const key = roleNameFromEntry(r);
    if (key) out[key] = r.permisos ?? {};
  }
  return out;
}
function canActorManageColumn(_actorRoles, targetColumn) {
  return !!targetColumn;
}
function canActorTransferUser(_actorRoles, fromColumn, toColumn) {
  return !!fromColumn && !!toColumn;
}
function pointInRef(ref, clientX, clientY) {
  const el = ref?.current;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}
export {
  USR_ROLE,
  VISITANTE,
  buildPermisosBoard,
  buildRolePermisosIndex,
  buildUserDirectoryFromPermisos,
  canActorManageColumn,
  canActorTransferUser,
  columnAtPoint,
  displayNameFromUserEntry,
  matchesUserFilter,
  normalizePermisosUsername,
  permEntryKey,
  pointInRef,
  roleDescripcionFromEntry,
  roleNameFromEntry,
  roleTitleFromEntry,
  sortPermisosColumnsByMembers,
  themeForRole,
  userCardLabels
};
