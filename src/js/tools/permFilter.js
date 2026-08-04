/** Plantillas estándar: dueño de conversación = sesión JWT. */
export const SESSION_OWNER_FILTER = {
  itercero: "{{itercero}}",
  icontacto: "{{icontacto}}",
};

export const FILTER_VAR_HINT = "itercero, icontacto, iusuario, nombres";

export function formatFilter(filter) {
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) return "";
  return Object.entries(filter)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export function filterFromRestriction(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const f = value.filter;
  if (!f || typeof f !== "object" || Array.isArray(f)) return undefined;
  return { ...f };
}

/** Añade filter de sesión a cualquier restricción de rol. */
export function withSessionOwnerFilter(restriction) {
  if (restriction === true) return { filter: { ...SESSION_OWNER_FILTER } };
  if (!restriction || typeof restriction !== "object") return restriction;
  return { ...restriction, filter: { ...SESSION_OWNER_FILTER } };
}