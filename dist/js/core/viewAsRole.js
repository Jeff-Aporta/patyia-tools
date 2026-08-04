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

// src/js/core/viewAsRole.ts
var VIEW_AS_ROLE_LS_KEY = "isa-patyia:view-as-role";
var VIEW_AS_ROLE_EVENT = "patyia-apptools:view-as-role";
var VIEW_AS_ROLE_OPTIONS = [
  { id: "USR", label: "Usuario" },
  { id: "AUDITOR", label: "Auditor" },
  { id: "ADMN", label: "Admn" },
  { id: "DEVISS", label: "Dev ISS" }
];
var NONE = Object.freeze({
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
var ROLE_CAPS_PRESETS = Object.freeze({
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
function roleKey(name) {
  return String(name ?? "").trim().toUpperCase();
}
function isDevBranchRole(roleName) {
  return roleKey(roleName) === "DEVISS";
}
function formatViewAsRoleLabel(roleName) {
  const key = roleKey(roleName);
  if (!key) return "";
  const opt = VIEW_AS_ROLE_OPTIONS.find((o) => o.id === key);
  if (opt) return opt.label;
  const canon = canonicalRoleMeta(key);
  if (canon?.namedisplay) return canon.namedisplay;
  return key;
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
function capsForViewAsRole(roleName) {
  const key = roleKey(roleName);
  const preset = ROLE_CAPS_PRESETS[key];
  return preset ? { ...preset } : null;
}
function realRolesAllowViewAs(roles) {
  return (roles ?? []).some((r) => isDevBranchRole(r));
}
function clampViewAsCapsToReal(preset, realCaps) {
  const out = {};
  const real = realCaps && typeof realCaps === "object" ? realCaps : {};
  for (const [k, v] of Object.entries(preset ?? {})) {
    if (typeof v !== "boolean") continue;
    out[k] = v === true && real[k] === true;
  }
  return out;
}
export {
  ROLE_CAPS_PRESETS,
  VIEW_AS_ROLE_EVENT,
  VIEW_AS_ROLE_LS_KEY,
  VIEW_AS_ROLE_OPTIONS,
  capsForViewAsRole,
  clampViewAsCapsToReal,
  clearViewAsRole,
  formatViewAsRoleLabel,
  isDevBranchRole,
  readViewAsRole,
  realRolesAllowViewAs,
  writeViewAsRole
};
