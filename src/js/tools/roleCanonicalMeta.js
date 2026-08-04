/** Etiquetas oficiales — solo front. Roles planos ClientesIS: AUDITOR|ADMN|DEVISS|USR. */
export const CANONICAL_ROLE_META = {
  AUDITOR: {
    namedisplay: "Auditor",
    descripcion: "Ve conversaciones de todos; chatea solo en las propias",
  },
  ADMN: {
    namedisplay: "Admn ISA-Paty",
    descripcion: "Administración PatyIA — sin acceso total de desarrollo",
  },
  DEVISS: {
    namedisplay: "Dev Lead ISS",
    descripcion: "Líder de desarrollo — acceso total",
  },
  USR: {
    namedisplay: "Usuario",
    descripcion: "Acceso básico de sesión",
  },
};

export function canonicalRoleMeta(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  return CANONICAL_ROLE_META[key] ?? null;
}
