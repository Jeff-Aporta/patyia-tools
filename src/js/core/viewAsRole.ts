/**
 * Ver como rol — simulación SOLO front para DEVISS.
 * No altera JWT, no envía headers al ISS, no cambia loadEffectivePermisos del servidor.
 * Solo capabilities locales de UI (localMeCaps). Nunca eleva: preset ∩ caps reales del login.
 */
import { canonicalRoleMeta } from "../tools/roleCanonicalMeta.js";

export const VIEW_AS_ROLE_LS_KEY = "isa-patyia:view-as-role";
export const VIEW_AS_ROLE_EVENT = "patyia-apptools:view-as-role";

/** Roles que se pueden simular desde el menú (nombres SEG exactos). */
export const VIEW_AS_ROLE_OPTIONS = [
  { id: "USR", label: "Usuario" },
  { id: "AUDITOR", label: "Auditor" },
  { id: "ADMN", label: "Admn" },
  { id: "DEVISS", label: "Dev ISS" },
];

const NONE = Object.freeze({
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
  canSendChat: true,
});

/** Presets aproximados al outcome típico de GET /api/permissions/me por rol. */
export const ROLE_CAPS_PRESETS = Object.freeze({
  USR: { ...NONE },
  AUDITOR: {
    ...NONE,
    canViewPrompts: true,
    canViewConfig: true,
    canAccessOthers: true,
    canViewKanban: true,
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
    canEditKanbanCards: true,
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
    canSendChat: true,
  },
});

function roleKey(name: unknown): string {
  return String(name ?? "").trim().toUpperCase();
}

/** Solo DEVISS puede abrir el simulador «Ver como». */
export function isDevBranchRole(roleName: unknown): boolean {
  return roleKey(roleName) === "DEVISS";
}

export function formatViewAsRoleLabel(roleName: unknown): string {
  const key = roleKey(roleName);
  if (!key) return "";
  const opt = VIEW_AS_ROLE_OPTIONS.find((o) => o.id === key);
  if (opt) return opt.label;
  const canon = canonicalRoleMeta(key);
  if (canon?.namedisplay) return canon.namedisplay;
  return key;
}

export function readViewAsRole(): string {
  try {
    const v = roleKey(localStorage.getItem(VIEW_AS_ROLE_LS_KEY));
    if (!v || v === "DEVISS") return "";
    if (!ROLE_CAPS_PRESETS[v as keyof typeof ROLE_CAPS_PRESETS]) return "";
    return v;
  } catch {
    return "";
  }
}

export function writeViewAsRole(roleName: unknown): void {
  const key = roleKey(roleName);
  try {
    if (!key || key === "DEVISS" || !ROLE_CAPS_PRESETS[key as keyof typeof ROLE_CAPS_PRESETS]) {
      localStorage.removeItem(VIEW_AS_ROLE_LS_KEY);
    } else {
      localStorage.setItem(VIEW_AS_ROLE_LS_KEY, key);
    }
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent(VIEW_AS_ROLE_EVENT, { detail: { role: readViewAsRole() } }));
    window.dispatchEvent(new Event("patyia-apptools:caps-changed"));
  } catch { /* ignore */ }
}

export function clearViewAsRole(): void {
  writeViewAsRole("");
}

export function capsForViewAsRole(roleName: unknown): Record<string, boolean> | null {
  const key = roleKey(roleName);
  const preset = ROLE_CAPS_PRESETS[key as keyof typeof ROLE_CAPS_PRESETS];
  return preset ? { ...preset } : null;
}

/** Solo DEVISS puede abrir el simulador. */
export function realRolesAllowViewAs(roles: unknown[]): boolean {
  return (roles ?? []).some((r) => isDevBranchRole(r));
}

/**
 * Nunca elevar: cada cap del preset solo queda true si el login real también la tiene.
 * Si el rol base no tiene una función, «ver como» no la enciende.
 */
export function clampViewAsCapsToReal(
  preset: Record<string, boolean> | null | undefined,
  realCaps: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const real = realCaps && typeof realCaps === "object" ? realCaps : {};
  for (const [k, v] of Object.entries(preset ?? {})) {
    if (typeof v !== "boolean") continue;
    out[k] = v === true && real[k] === true;
  }
  return out;
}
