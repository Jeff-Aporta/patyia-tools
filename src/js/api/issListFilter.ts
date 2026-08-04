/** Filtro ISS listados — desde jun 2026 el listado usa HTTP QUERY + body JSON (no GET ?f=). */

export const ISS_LIST_FILTER_QUERY_PARAM = "f"; // legacy; no usar en listados QUERY

/** Orden por defecto del listado de conversaciones (desc por iconversacion). */
export const CONVERSACIONES_LIST_SORT_DEFAULT = "-iconversacion";

export type IssListFilter = {
  search?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  eq?: Record<string, string | number | boolean>;
  itercero?: string;
  icontacto?: string;
};

export function encodeIssListFilterB64(filter: IssListFilter | Record<string, unknown>): string {
  const json = JSON.stringify(filter);
  return btoa(unescape(encodeURIComponent(json)));
}

/** Body QUERY /api/conversaciones (limit/offset/sort/search + dueño opcional). */
export function buildConversacionesListFilter(input: {
  search?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  itercero?: string;
  icontacto?: string;
} = {}): IssListFilter {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const offset = Math.max(0, Math.floor(Number(input.offset) || 0));
  const sort = String(input.sort || CONVERSACIONES_LIST_SORT_DEFAULT).trim() || CONVERSACIONES_LIST_SORT_DEFAULT;
  const search = String(input.search ?? "").trim().slice(0, 200);
  const itercero = String(input.itercero ?? "").trim();
  const icontacto = String(input.icontacto ?? "").trim();
  return {
    limit,
    offset,
    sort,
    ...(search ? { search } : {}),
    ...(itercero && icontacto ? { itercero, icontacto } : {}),
  };
}

/** Body listo para QUERY /api/conversaciones (page → offset). */
export function conversacionesListBody(input: {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  itercero?: string;
  icontacto?: string;
} = {}): IssListFilter {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  return buildConversacionesListFilter({
    search: input.search,
    limit,
    offset: (page - 1) * limit,
    sort: input.sort,
    itercero: input.itercero,
    icontacto: input.icontacto,
  });
}

/** @deprecated Prefer conversacionesListBody + method QUERY. */
export function conversacionesListQueryParams(input: {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  itercero?: string;
  icontacto?: string;
} = {}): URLSearchParams {
  const body = conversacionesListBody(input);
  const qs = new URLSearchParams();
  qs.set(ISS_LIST_FILTER_QUERY_PARAM, encodeIssListFilterB64(body));
  if (body.itercero && body.icontacto) {
    qs.set("itercero", body.itercero);
    qs.set("icontacto", body.icontacto);
  }
  return qs;
}

/** Body QUERY /api/auditoria/terceros (page → offset, q → search; jwt* top-level). */
export function tercerosAuditListBody(input: {
  page?: number;
  limit?: number;
  q?: string;
  search?: string;
  jwtTercero?: string;
  jwtContacto?: string;
  jwtNombre?: string;
  eq?: Record<string, string | number | boolean>;
} = {}): Record<string, unknown> {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 20)));
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const search = String(input.search ?? input.q ?? "").trim().slice(0, 200);
  const jwtTercero = String(input.jwtTercero ?? "").trim();
  const jwtContacto = String(input.jwtContacto ?? "").trim();
  const jwtNombre = String(input.jwtNombre ?? "").trim();
  const body: Record<string, unknown> = {
    limit,
    offset: (page - 1) * limit,
  };
  if (search) body.search = search;
  if (input.eq && typeof input.eq === "object" && !Array.isArray(input.eq) && Object.keys(input.eq).length) {
    body.eq = input.eq;
  }
  if (jwtTercero) body.jwtTercero = jwtTercero;
  if (jwtContacto) body.jwtContacto = jwtContacto;
  if (jwtNombre) body.jwtNombre = jwtNombre;
  return body;
}
