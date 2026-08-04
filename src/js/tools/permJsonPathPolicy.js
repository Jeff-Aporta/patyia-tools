/** Espejo frontend de perm-json-path-policy.ts — rutas editables por rol actor. */

export const PERM_DOC_FIELD_RULES = [/^namedisplay$/, /^descripcion$/];

export const PERM_SECURITY_FIELD_RULES = [
  /^(\*|impersonate|manage_permissions|manage_sampling)$/,
  // Decisión 18-jul-2026: en InSoft NO usamos PATCH; solo GET/POST/PUT/DELETE.
  /^(GET|POST|PUT|DELETE):\/api\//,
];

export function resolvePermFieldRules({ canManage, canEditDesc }) {
  if (canManage && canEditDesc) return "all";
  if (canManage) return PERM_SECURITY_FIELD_RULES;
  if (canEditDesc) return PERM_DOC_FIELD_RULES;
  return [];
}

export function isPermFieldKeyAllowed(key, rules) {
  if (rules === "all") return true;
  return rules.some((re) => re.test(key));
}
