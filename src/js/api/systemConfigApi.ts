import { Session } from "../core/platform.ts";
import { isLocalMode, PATYIA_ISS_STAGING_API, resolveIssApiBase } from "../core/patyia.ts";
import { isPatyJwtExpired, loadPatyJwt } from "../core/patyia-jwt.ts";
import { capsFromPermisosEfectivos } from "../tools/permAccessFromMap.js";

export type OpenAiSystemConfig = {
  max_num_results: number;
  modeloOperativo: string;
  modeloConversacion: string;
  canEdit?: boolean;
};

const OPENAI_DEFAULTS: OpenAiSystemConfig = {
  max_num_results: 8,
  modeloOperativo: "gpt-4.1-nano",
  modeloConversacion: "gpt-5-nano",
};

function systemApiBase(): string {
  return resolveIssApiBase();
}

/** Rutas ClientesIS SEG_ — en local, si el ISS local falla, el front reintenta contra staging. */
function isSegApiPath(path: string): boolean {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.startsWith("/permissions/me")
    || p.startsWith("/patyia/admin/")
    || p.startsWith("/system/permisos");
}

function shouldRetrySegOnStaging(err: unknown): boolean {
  if (!isLocalMode()) return false;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /timeout|terminated|ECONN|ENOTFOUND|Failed to fetch|NetworkError|HTTP 5\d\d|Connection|sin METHOD:path/i.test(msg);
}

/** ispserver TErr401.noauthorization ignora sMsg y muestra este boilerplate ContaPyme (401020). */
const CONTAPYME_NOAUTH_RX = /par[aá]metro de autenticaci[oó]n|enviando el header.*authorization/i;

/** Traduce el 401020 mentiroso a causa real probable (SEG / JWT / header legacy). */
export function humanizeIssAuthMessage(msg: string): string {
  const m = String(msg ?? "").trim();
  if (!m) return m;
  if (!CONTAPYME_NOAUTH_RX.test(m)) return m;
  return (
    "El servidor rechazó la operación (permiso SEG, JWT o cabecera inválida), no falta el header Authorization. " +
    "Si estás en Producción: el bypass del front solo abre la UI; el ISS de prod debe permitir PUT " +
    "(SEG o permsOpen). No envíes X-Patyia-Auth-Mode=w (rompe auth ContaPyme en prod)."
  );
}

/** Headers hacia ISS: JWT InSoft (Paty) si hay caché válida; Session solo como fallback.
 *  No enviar X-Patyia-Auth-Mode: en prod ContaPyme, el valor "w" dispara 401020 falso. */
function systemApiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };
  const paty = loadPatyJwt();
  if (paty?.token && !isPatyJwtExpired(paty.token)) {
    h.Authorization = `Bearer ${paty.token}`;
    if (Session.isLoggedIn()) {
      const app = { ...Session.appHeader() };
      for (const k of Object.keys(app)) {
        if (/^authorization$/i.test(k)) delete app[k];
      }
      Object.assign(h, app);
    }
  } else if (Session.isLoggedIn()) {
    Object.assign(h, Session.authHeader(), Session.appHeader());
  }
  return h;
}

function unwrapBody<T>(data: unknown): T {
  const d = data as Record<string, unknown>;
  const enc = d?.encabezado;
  if (enc && typeof enc === "object" && !Array.isArray(enc) && (enc as { resultado?: boolean }).resultado === false) {
    const e = enc as { mensaje?: unknown; imensaje?: unknown };
    const msg = String(e.mensaje ?? e.imensaje ?? "").trim();
    throw new Error(humanizeIssAuthMessage(msg) || "Error en la respuesta del servidor");
  }
  let inner: unknown = d;
  if (d?.respuesta && typeof d.respuesta === "object" && !Array.isArray(d.respuesta)) {
    inner = d.respuesta;
  } else if (d?.body && typeof d.body === "object" && !Array.isArray(d.body)) {
    inner = d.body;
  }
  const nested = inner as Record<string, unknown>;
  if (nested?.respuesta && typeof nested.respuesta === "object" && !Array.isArray(nested.respuesta)) {
    inner = nested.respuesta;
  }
  return inner as T;
}

async function jsonFetchAt<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`, init);
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = res.statusText;
    if (ct.includes("json")) {
      try {
        const j = await res.json() as Record<string, unknown>;
        const enc = j.encabezado as { mensaje?: unknown; resultado?: boolean } | undefined;
        if (enc?.resultado === false && enc.mensaje) msg = String(enc.mensaje);
        else {
          const inner = j.respuesta || j.body || j;
          msg = String((inner as Record<string, unknown>)?.message || (inner as Record<string, unknown>)?.error || j.message || j.error || msg);
        }
      } catch { /* ignore */ }
    }
    throw new Error(humanizeIssAuthMessage(msg) || `HTTP ${res.status}`);
  }
  if (!ct.includes("json")) {
    throw new Error(`Respuesta no JSON (${res.status}) desde ${base}${path}`);
  }
  const raw = await res.json();
  return unwrapBody<T>(raw);
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await jsonFetchAt<T>(systemApiBase(), path, init);
  } catch (err) {
    if (!isSegApiPath(path) || !shouldRetrySegOnStaging(err)) throw err;
    console.warn(`[seg-front] local → staging ${path}:`, err instanceof Error ? err.message : err);
    return jsonFetchAt<T>(PATYIA_ISS_STAGING_API, path, init);
  }
}

/** SEG admin: si local responde vacío (PG caído → stub), preferir staging. */
async function jsonFetchSegAdmin<T extends { contactos?: unknown[]; acciones?: unknown[]; roles?: unknown[] }>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let local: T | null = null;
  let localErr: unknown = null;
  try {
    local = await jsonFetchAt<T>(systemApiBase(), path, init);
  } catch (err) {
    localErr = err;
  }
  const thin = local != null
    && Array.isArray(local.contactos) && local.contactos.length === 0
    && Array.isArray(local.acciones) && local.acciones.length < 10;
  if (isLocalMode() && (localErr || thin)) {
    try {
      const stg = await jsonFetchAt<T>(PATYIA_ISS_STAGING_API, path, init);
      console.warn(`[seg-front] admin ${path} vía staging (${localErr ? "error local" : "local vacío"})`);
      return stg;
    } catch (stgErr) {
      if (local) return local;
      throw localErr || stgErr;
    }
  }
  if (local) return local;
  throw localErr instanceof Error ? localErr : new Error(String(localErr ?? "SEG admin falló"));
}

function permEntityKey(entry: Record<string, unknown> | null | undefined): string {
  return String(entry?.ientity ?? entry?.iusuario ?? "").trim();
}

function normalizePermEntry(entry: Record<string, unknown>): PermEntry {
  const key = permEntityKey(entry);
  return {
    iusuario: key,
    ientity: key || undefined,
    itipo: (entry?.itipo === "user" ? "user" : "role") as "user" | "role",
    permisos: (entry?.permisos && typeof entry.permisos === "object" ? entry.permisos : {}) as Record<string, unknown>,
    bactivo: entry?.bactivo !== false,
  };
}

function normalizePermissionsPayload(raw: PermissionsData): PermissionsData {
  const roles = (Array.isArray(raw?.roles) ? raw.roles : []).map((e) => normalizePermEntry(e as Record<string, unknown>));
  const users = (Array.isArray(raw?.users) ? raw.users : []).map((e) => normalizePermEntry(e as Record<string, unknown>));
  const contactos = raw?.contactos && typeof raw.contactos === "object" && !Array.isArray(raw.contactos)
    ? raw.contactos
    : {};
  return { ...raw, roles, users, contactos };
}

export async function fetchOpenAiSystemConfig(): Promise<OpenAiSystemConfig> {
  const body = await jsonFetch<{ config?: OpenAiSystemConfig; canEdit?: boolean }>("/system/openai", { method: "GET", headers: systemApiHeaders() });
  return { ...OPENAI_DEFAULTS, ...(body.config ?? {}), canEdit: !!body.canEdit };
}

export async function putOpenAiSystemConfig(config: OpenAiSystemConfig): Promise<OpenAiSystemConfig> {
  const { canEdit: _c, ...payload } = config;
  const body = await jsonFetch<{ config?: OpenAiSystemConfig }>("/system/openai", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const saved = body.config ?? payload;
  window.dispatchEvent(new CustomEvent("isa-patyia:openai-config", { detail: saved }));
  return saved;
}

export type PromptsOperativosConfig = Record<string, unknown>;

export async function fetchPromptsOperativosConfig(): Promise<{ config: PromptsOperativosConfig; canEdit: boolean }> {
  const body = await jsonFetch<{ config?: PromptsOperativosConfig; canEdit?: boolean }>("/system/prompts-operativos", { method: "GET", headers: systemApiHeaders() });
  return { config: body.config ?? {}, canEdit: !!body.canEdit };
}

export async function putPromptsOperativosConfig(config: PromptsOperativosConfig): Promise<PromptsOperativosConfig> {
  const body = await jsonFetch<{ config?: PromptsOperativosConfig }>("/system/prompts-operativos", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return body.config ?? config;
}

export type InstruccionesSystemRow = Record<string, unknown>;

export type InstruccionesSystemConfig = {
  rows: InstruccionesSystemRow[];
  canEdit: boolean;
  storage?: string;
  schema?: string;
  rowCount?: number;
};

export type InstruccionUpsertPayload = {
  iinstruccion: string;
  instruccion: string;
  jconfig?: Record<string, unknown>;
  ninstruccion?: string;
  descripcion?: string;
  author?: string;
};

/** GET /api/system/instrucciones — dbo.INSTRUCCION (canónico). */
export async function fetchInstruccionesSystemConfig(): Promise<InstruccionesSystemConfig> {
  const body = await jsonFetch<{
    rows?: InstruccionesSystemRow[];
    canEdit?: boolean;
    storage?: string;
    schema?: string;
    rowCount?: number;
  }>("/system/instrucciones", { method: "GET", headers: systemApiHeaders() });
  const rows = Array.isArray(body.rows) ? body.rows : [];
  return {
    rows,
    canEdit: !!body.canEdit,
    storage: body.storage,
    schema: body.schema,
    rowCount: Number(body.rowCount ?? rows.length) || rows.length,
  };
}

/** PUT upsert una instrucción. */
export async function putInstruccionUpsert(payload: InstruccionUpsertPayload): Promise<{ ok: boolean; iinstruccion?: string }> {
  return jsonFetch("/system/instrucciones", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** PUT publish batch MERGE SQL. */
export async function putInstruccionesPublish(sql: string): Promise<{ ok: boolean; mode?: string }> {
  return jsonFetch("/system/instrucciones", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
}

/** PERMISOS JSON único: roles de usuario en permisos.roles; descripción de rol en permisos.descripcion */
export type PermEntry = { iusuario: string; ientity?: string; itipo: "user" | "role"; permisos: Record<string, unknown>; bactivo: boolean };
export type PatyiaContactoEntry = { itercero: string; icontacto: number | null; nombre?: string | null };
export type PermissionsData = {
  roles: PermEntry[];
  users: PermEntry[];
  usersTotal?: number;
  usersTruncated?: boolean;
  contactos?: Record<string, PatyiaContactoEntry>;
  canManage?: boolean;
  canEditRoleDescriptions?: boolean;
  canAssignUserRoles?: boolean;
  actorRoles?: string[];
};

export type PermisosFetchOpts = { search?: string; role?: string; /** Top N usuarios (autocomplete). */ limit?: number };

/**
 * Shape insoft.permissions-me — v5 (SEG) o v2 prod (capabilities + permisos).
 * UI caps = mapa `permisosEfectivos|permisos` ∪ `capabilities` (sessionApi).
 */
export type PermissionsMe = {
  kind: "insoft.permissions-me";
  version: number;
  username: string;
  loginRole: string | null;
  roles: string[];
  irol?: string;
  permisos?: Record<string, true>;
  permisosEfectivos?: Record<string, unknown>;
  capabilities?: Record<string, boolean>;
  restricciones?: Record<string, unknown>;
  iat: number;
  ttlMs: number;
};

const PERMISSIONS_ME_CACHE: { value: PermissionsMe | null; iat: number; ttlMs: number; key: string } = { value: null, iat: 0, ttlMs: 0, key: "" };

/** Dedupe de llamadas concurrentes: la SPA hace UN solo GET /permissions/me y todos capturan de ahí. */
let PERMISSIONS_ME_INFLIGHT: Promise<PermissionsMe | null> | null = null;

function permissionsMeSessionKey(): string {
  if (!Session.isLoggedIn()) return "anon";
  const tok = Session?.current?.()?.token;
  const user = Session.username?.() || Session?.current?.()?.username;
  return String(tok || user || "anon").trim();
}

/** Devuelve los permisos del usuario actual. Cache en memoria con TTL del servidor. */
export async function fetchPermissionsMe(opts?: { force?: boolean; fetchImpl?: typeof fetch }): Promise<PermissionsMe | null> {
  if (!Session.isLoggedIn() && !loadPatyJwt()?.token) return null;
  const headers = systemApiHeaders();
  if (!headers.Authorization && !headers.authorization) {
    // Local sin JWT portal: no spamear 401 «falta authorization» (mensaje mentiroso de Rst401.noauthorization)
    return null;
  }
  const sessionKey = permissionsMeSessionKey();
  if (!opts?.force && PERMISSIONS_ME_CACHE.value && PERMISSIONS_ME_CACHE.key === sessionKey && Date.now() - PERMISSIONS_ME_CACHE.iat < PERMISSIONS_ME_CACHE.ttlMs) {
    return PERMISSIONS_ME_CACHE.value;
  }
  if (!opts?.force && PERMISSIONS_ME_INFLIGHT) return PERMISSIONS_ME_INFLIGHT;
  const f = opts?.fetchImpl ?? fetch;
  const req = (async (): Promise<PermissionsMe | null> => {
    const hit = async (base: string) => {
      const res = await f(`${base.replace(/\/+$/, "")}/permissions/me`, {
        method: "GET",
        headers: { ...headers, Accept: "application/json" },
        credentials: "omit",
      });
      if (res.status === 401) return { status: 401 as const, data: null };
      if (!res.ok) return { status: res.status, data: null };
      const data = unwrapBody<PermissionsMe>(await res.json());
      if (!data || data.kind !== "insoft.permissions-me") return { status: res.status, data: null };
      return { status: res.status, data };
    };
    let got = await hit(systemApiBase());
    // Local: el ISS puede devolver mapa stub (PG SEG inalcanzable). Preferir staging si responde.
    if (isLocalMode()) {
      try {
        const stg = await hit(PATYIA_ISS_STAGING_API);
        if (stg.data) {
          console.warn("[seg-front] permissions/me vía staging");
          got = stg;
        }
      } catch { /* keep local */ }
    }
    if (got.status === 401) {
      PERMISSIONS_ME_CACHE.value = null;
      return null;
    }
    if (!got.data) return PERMISSIONS_ME_CACHE.value;
    PERMISSIONS_ME_CACHE.value = got.data;
    PERMISSIONS_ME_CACHE.iat = got.data.iat || Date.now();
    // El ISS devuelve TODAS las acciones del usuario → captura única por sesión (ttl del server, default 8h).
    PERMISSIONS_ME_CACHE.ttlMs = got.data.ttlMs || 8 * 60 * 60 * 1000;
    PERMISSIONS_ME_CACHE.key = sessionKey;
    return got.data;
  })().finally(() => {
    if (PERMISSIONS_ME_INFLIGHT === req) PERMISSIONS_ME_INFLIGHT = null;
  });
  PERMISSIONS_ME_INFLIGHT = req;
  return req;
}

export function clearPermissionsMeCache(): void {
  PERMISSIONS_ME_CACHE.value = null;
  PERMISSIONS_ME_CACHE.iat = 0;
  PERMISSIONS_ME_CACHE.ttlMs = 0;
  PERMISSIONS_ME_CACHE.key = "";
}

/** Aplica flags de kanban derivados de permisosEfectivos (SEG). */
export function applyPermissionsMeToKanban(data: PermissionsData, me: PermissionsMe | null): PermissionsData {
  if (!me) return data;
  const caps = capsFromPermisosEfectivos(me.permisosEfectivos);
  return {
    ...data,
    canManage: caps.canManagePermissions,
    canAssignUserRoles: caps.canAssignUserRoles,
    canEditRoleDescriptions: caps.canEditRoleDescriptions || caps.canManagePermissions,
    actorRoles: me.roles,
    _permissionsMe: me,
  } as PermissionsData;
}

/** GET /api/patyia/admin/roles — roles planos PatyIA + contactos asignados. */
export type PatyiaRolAdmin = { irol: string; igrupo: string; itercero: string };
export type PatyiaContacto = { irol: string; icontacto: number; bprincipal?: boolean; nombre?: string | null; username?: string | null };
export async function fetchPatyiaAdminRoles(): Promise<{ igrupo: string; itercero: string; roles: PatyiaRolAdmin[]; contactos: PatyiaContacto[]; acciones: unknown[] }> {
  return jsonFetchSegAdmin<{ igrupo: string; itercero: string; roles: PatyiaRolAdmin[]; contactos: PatyiaContacto[]; acciones: unknown[] }>(`/patyia/admin/roles`, {
    method: "GET",
    headers: systemApiHeaders(),
  });
}

export async function assignPatyiaRolContacto({ irol, icontacto, bprincipal = true }: { irol: string; icontacto: number; bprincipal?: boolean }): Promise<unknown> {
  return jsonFetch(`/patyia/admin/roles/${encodeURIComponent(irol)}`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ icontacto, op: "add", bprincipal }),
  });
}

export async function removePatyiaRolContacto({ irol, icontacto }: { irol: string; icontacto: number }): Promise<unknown> {
  return jsonFetch(`/patyia/admin/roles/${encodeURIComponent(irol)}`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ icontacto, op: "remove" }),
  });
}

// ─── Cache SPA del listado /system/permisos ───
// Un GET por query (dedupe de concurrentes) + TTL corto; cualquier mutación de permisos lo invalida.
const PERMISOS_LIST_TTL_MS = 60_000;
const PERMISOS_LIST_CACHE = new Map<string, { raw: PermissionsData; iat: number }>();
const PERMISOS_LIST_INFLIGHT = new Map<string, Promise<PermissionsData>>();

/** Invalida los caches de permisos (listado + me). Llamar tras cualquier mutación de permisos. */
export function invalidatePermisosCache(): void {
  PERMISOS_LIST_CACHE.clear();
  PERMISOS_LIST_INFLIGHT.clear();
  clearPermissionsMeCache();
}

/** Marca el resultado de una mutación de permisos: invalida caches y devuelve el payload fresco. */
async function permisosMutation(p: Promise<PermissionsData>): Promise<PermissionsData> {
  const data = await p;
  PERMISOS_LIST_CACHE.clear();
  clearPermissionsMeCache();
  return data;
}

/** Kanban desde SEG admin cuando GET /system/permisos ya no existe (ISS post-migración). */
function permissionsFromAdminRoles(admin: {
  roles?: PatyiaRolAdmin[];
  contactos?: PatyiaContacto[];
}): PermissionsData {
  const roleRows = Array.isArray(admin?.roles) ? admin.roles : [];
  const roles: PermEntry[] = roleRows.map((r) => ({
    iusuario: `ROLE:${String(r.irol ?? "").trim().toUpperCase()}`,
    itipo: "role",
    permisos: {},
    bactivo: true,
  })).filter((r) => r.iusuario !== "ROLE:");
  if (!roles.some((r) => r.iusuario === "ROLE:DEVISS")) {
    roles.unshift({ iusuario: "ROLE:DEVISS", itipo: "role", permisos: {}, bactivo: true });
  }
  if (!roles.some((r) => r.iusuario === "ROLE:USR")) {
    roles.push({ iusuario: "ROLE:USR", itipo: "role", permisos: {}, bactivo: true });
  }
  const byUser = new Map<string, { roles: Set<string>; nombre?: string | null; icontacto?: number }>();
  for (const c of Array.isArray(admin?.contactos) ? admin.contactos : []) {
    const uname = String(c.username ?? "").trim().toUpperCase() || (c.icontacto != null ? String(c.icontacto) : "");
    if (!uname) continue;
    const irol = String(c.irol ?? "").trim().toUpperCase();
    const cur = byUser.get(uname) ?? { roles: new Set<string>(), nombre: c.nombre ?? null, icontacto: c.icontacto };
    if (irol) cur.roles.add(irol);
    if (c.nombre) cur.nombre = c.nombre;
    if (c.icontacto != null) cur.icontacto = c.icontacto;
    byUser.set(uname, cur);
  }
  const users: PermEntry[] = [...byUser.entries()].map(([username, meta]) => ({
    iusuario: username,
    itipo: "user" as const,
    permisos: {
      roles: [...meta.roles],
      ...(meta.nombre ? { nombre: meta.nombre } : {}),
    },
    bactivo: true,
  }));
  const contactos: Record<string, PatyiaContactoEntry> = {};
  for (const [username, meta] of byUser) {
    if (meta.icontacto == null) continue;
    contactos[username] = { itercero: "", icontacto: meta.icontacto, nombre: meta.nombre ?? null };
  }
  return { roles, users, contactos, usersTotal: users.length, usersTruncated: false };
}

function fetchPermisosListRaw(q: string): Promise<PermissionsData> {
  const cached = PERMISOS_LIST_CACHE.get(q);
  if (cached && Date.now() - cached.iat < PERMISOS_LIST_TTL_MS) return Promise.resolve(cached.raw);
  const inflight = PERMISOS_LIST_INFLIGHT.get(q);
  if (inflight) return inflight;
  const req = jsonFetch<PermissionsData>(`/system/permisos${q ? `?${q}` : ""}`, { method: "GET", headers: systemApiHeaders() })
    .catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      // ISS retiró el CRUD local GET /system/permisos — kanban se arma desde SEG admin.
      if (!/not found|404|no (existe|encontr)|HTTP 404/i.test(msg)) throw err;
      return permissionsFromAdminRoles(await fetchPatyiaAdminRoles());
    })
    .then((raw) => {
      PERMISOS_LIST_CACHE.set(q, { raw, iat: Date.now() });
      return raw;
    })
    .finally(() => { PERMISOS_LIST_INFLIGHT.delete(q); });
  PERMISOS_LIST_INFLIGHT.set(q, req);
  return req;
}

export async function fetchPermisos(opts?: PermisosFetchOpts): Promise<PermissionsData> {
  const qs = new URLSearchParams();
  const search = String(opts?.search ?? "").trim();
  const role = String(opts?.role ?? "").trim().toUpperCase();
  const limit = opts?.limit != null && Number.isFinite(Number(opts.limit))
    ? Math.min(500, Math.max(1, Math.floor(Number(opts.limit))))
    : undefined;
  if (search) qs.set("search", search);
  if (role) qs.set("role", role);
  if (limit != null) qs.set("limit", String(limit));
  const q = qs.toString();
  // Fuente de verdad: /permissions/me (permisosEfectivos SEG).
  // Ambos vienen de cache SPA: tras la primera captura no hay más red hasta invalidación/TTL.
  const [raw, me] = await Promise.all([
    fetchPermisosListRaw(q),
    fetchPermissionsMe().catch(() => null),
  ]);
  return applyPermissionsMeToKanban(normalizePermissionsPayload(raw), me);
}

export type PermisosUserOption = { username: string; displayName: string | null };

/** GET /api/system/permisos?search=&limit= — usuarios ISS (SYS_USR_PERMISSIONS). Default limit 10 (autocomplete). */
export async function searchPermisosUsers(query = "", opts?: { role?: string; limit?: number }): Promise<PermisosUserOption[]> {
  const q = String(query ?? "").trim();
  const limit = opts?.limit != null && Number.isFinite(Number(opts.limit))
    ? Math.min(500, Math.max(1, Math.floor(Number(opts.limit))))
    : 10;
  const result = await fetchPermisos({
    ...(q ? { search: q } : {}),
    ...(opts?.role ? { role: opts.role } : {}),
    limit,
  });
  return (result.users ?? []).map((e) => ({
    username: String(e.iusuario ?? "").trim().toUpperCase(),
    displayName: (() => {
      const p = e.permisos;
      const name = p?.nombre ?? p?.namedisplay;
      return name != null && String(name).trim() ? String(name).trim() : null;
    })(),
  })).filter((u) => u.username).slice(0, limit);
}

export async function putPermisoRole(name: string, permisos: Record<string, unknown>): Promise<PermissionsData> {
  return permisosMutation(jsonFetch<PermissionsData>("/system/permisos", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "role", name, permisos }),
  }));
}

export async function putPermisoRolePath(name: string, permisos: Record<string, unknown>, bactivo?: boolean): Promise<PermissionsData> {
  const role = encodeURIComponent(String(name).trim().toUpperCase().replace(/^ROLE:/i, ""));
  const body: Record<string, unknown> = { permisos };
  if (bactivo !== undefined) body.bactivo = bactivo;
  return permisosMutation(jsonFetch<PermissionsData>(`/system/permisos/roles/${role}`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

export async function createPermisoRole(name: string): Promise<PermissionsData> {
  return putPermisoRolePath(name, {});
}

export async function putPermisoUser(username: string, permisos: Record<string, unknown>): Promise<PermissionsData> {
  return permisosMutation(jsonFetch<PermissionsData>("/system/permisos", {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "user", username, permisos }),
  }));
}

export async function putPermisoUserPath(username: string, permisos: Record<string, unknown>): Promise<PermissionsData> {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  return permisosMutation(jsonFetch<PermissionsData>(`/system/permisos/usuarios/${u}`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ permisos }),
  }));
}

// PUT /api/system/permisos/usuarios/{username}/roles (era PATCH; migrado 18-jul-2026).
// En InSoft no usamos PATCH: solo PUT.
export async function putUsuarioRoles(username: string, body: { fromRole: string; toRole: string; mode?: "move" }): Promise<PermissionsData> {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  const payload = {
    ...body,
    fromRole: String(body.fromRole ?? "").trim().toUpperCase(),
    toRole: String(body.toRole ?? "").trim().toUpperCase(),
  };
  return permisosMutation(jsonFetch<PermissionsData>(`/system/permisos/usuarios/${u}/roles`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}

export async function addUsuarioRole(username: string, role: string): Promise<PermissionsData> {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  return permisosMutation(jsonFetch<PermissionsData>(`/system/permisos/usuarios/${u}/roles`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ toRole: String(role).trim().toUpperCase(), mode: "add" }),
  }));
}

export async function removeUsuarioRole(username: string, role: string): Promise<PermissionsData> {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  return permisosMutation(jsonFetch<PermissionsData>(`/system/permisos/usuarios/${u}/roles`, {
    method: "PUT",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ fromRole: String(role).trim().toUpperCase(), mode: "remove" }),
  }));
}

export async function deletePermisoUser(username: string): Promise<PermissionsData> {
  const u = encodeURIComponent(String(username).trim().toUpperCase());
  return permisosMutation(jsonFetch<PermissionsData>(`/system/permisos/usuarios/${u}`, {
    method: "DELETE",
    headers: systemApiHeaders(),
  }));
}

export async function deletePermiso(iusuario: string): Promise<PermissionsData> {
  return permisosMutation(jsonFetch<PermissionsData>("/system/permisos", {
    method: "DELETE",
    headers: { ...systemApiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ iusuario }),
  }));
}

export function requireAppSession(onNeedLogin?: () => void): boolean {
  if (Session.isLoggedIn()) return true;
  onNeedLogin?.();
  return false;
}
