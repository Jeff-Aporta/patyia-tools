import { convBelongsToJwt, jwtUserShortName, jwtUserDisplayName, type BrowseScope, type PatyJwtClaims, type PatyJwtRecord } from "../../core/patyia-jwt.ts";

export function auditScopeKey(scope: BrowseScope | null | undefined): string {
  if (!scope) return "";
  return `${scope.itercero}|${scope.icontacto}`;
}

export function auditScopeIsOwnJwt(scope: BrowseScope | null | undefined, claims: PatyJwtClaims | null | undefined): boolean {
  if (!claims?.itercero) return !scope;
  if (!scope) return true;
  return convBelongsToJwt(scope, claims);
}

type ConvOwnerRef = {
  itercero?: string | number;
  icontacto?: string | number;
};

/** Une dueño de conv desde detalle, fila del listado o alcance activo (JWT/auditoría). */
export function mergeConvOwnerFields(
  conv: ConvOwnerRef | null | undefined,
  row: ConvOwnerRef | null | undefined,
  scope: BrowseScope | null | undefined,
): ConvOwnerRef {
  return {
    itercero: conv?.itercero ?? row?.itercero ?? scope?.itercero,
    icontacto: conv?.icontacto ?? row?.icontacto ?? scope?.icontacto,
  };
}

/** Bloquea solo si hay itercero/icontacto conocidos y no coinciden con el JWT. */
export function convBelongsToJwtResolved(
  conv: ConvOwnerRef | null | undefined,
  row: ConvOwnerRef | null | undefined,
  scope: BrowseScope | null | undefined,
  claims: PatyJwtClaims | null | undefined,
  strictOwner = false,
): boolean {
  const owner = mergeConvOwnerFields(conv, row, scope);
  const t = String(owner.itercero ?? "").trim();
  if (!t) return strictOwner ? false : true;
  return convBelongsToJwt(owner, claims);
}

/** Nombre legible del dueño (JWT, auditoría o actingAs). Sin username. */
export function resolveOwnerDisplayName(
  jwt: PatyJwtRecord | null | undefined,
  displayScope: BrowseScope | null | undefined,
): string {
  const scopeName = String(displayScope?.nombre ?? "").trim();
  if (scopeName) return scopeName;
  const actingName = String(jwt?.actingAsDisplayName ?? "").trim();
  if (actingName) return actingName;
  return jwtUserDisplayName(jwt?.claims) || jwtUserShortName(jwt?.claims) || "";
}

/** Nick visible: si el username es un correo, solo la parte local (sin @dominio). */
function displayNick(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase().split("@")[0];
}

/** Nick ISA / AUTH (username): dueño del JWT o sesión activa. */
export function resolveOwnerNickname(jwt: PatyJwtRecord | null | undefined, sessionUser: string | null | undefined): string {
  const acting = displayNick(jwt?.actingAsUsername);
  if (acting) return acting;
  const saved = displayNick(jwt?.savedBy);
  if (saved) return saved;
  return displayNick(sessionUser);
}

/** Solo códigos tercero y contacto (sin nombre legible). */
export function convOwnerCodesLabel(scope: BrowseScope | null | undefined): string {
  const t = String(scope?.itercero ?? "").trim();
  const c = String(scope?.icontacto ?? "").trim();
  if (t && c) return `${t} · ${c}`;
  return t || c || "";
}

/** Etiqueta del dueño: nick si existe; si no, códigos tercero/contacto. */
export function convOwnerDisplayLabel(
  scope: BrowseScope | null | undefined,
  jwt: PatyJwtRecord | null | undefined,
  sessionUser: string | null | undefined,
): string {
  const nick = resolveOwnerNickname(jwt, sessionUser);
  if (nick) return nick;
  const codes = convOwnerCodesLabel(scope);
  return codes || "Usuario";
}

export function activeConvOwnerScope(
  auditScope: BrowseScope | null | undefined,
  claims: PatyJwtClaims | null | undefined,
): BrowseScope | null {
  if (auditScope?.itercero && auditScope?.icontacto) return auditScope;
  if (claims?.itercero) {
    return {
      itercero: claims.itercero,
      icontacto: claims.icontacto ?? "",
      nombre: jwtUserDisplayName(claims) || jwtUserShortName(claims) || null,
    };
  }
  return null;
}

/** Etiqueta del dueño de las conversaciones listadas (auditoría, JWT ajeno o propio). */
export function resolveConvListOwnerLabel(
  listScope: BrowseScope | null | undefined,
  jwt: PatyJwtRecord | null | undefined,
  sessionUser: string | null | undefined,
): string {
  return convOwnerDisplayLabel(activeConvOwnerScope(listScope, jwt?.claims), jwt, sessionUser);
}

/** Línea bajo «Conversaciones»: nick o códigos (sin nombre completo del JWT). */
export function resolveConvListHeader(
  listScope: BrowseScope | null | undefined,
  jwt: PatyJwtRecord | null | undefined,
  sessionUser: string | null | undefined,
): string {
  const scopeName = String(listScope?.nombre ?? "").trim();
  if (scopeName && !auditScopeIsOwnJwt(listScope, jwt?.claims)) return scopeName;
  return resolveConvListOwnerLabel(listScope, jwt, sessionUser);
}

export function formatAuditTs(v: string | number | Date | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v).slice(0, 16) : d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}
