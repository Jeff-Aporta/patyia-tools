import {
  type PatyJwtRecord,
  type PatyJwtClaims,
} from "../core/patyia-jwt.ts";
import { conversacionesListBody } from "./issListFilter.ts";
import { patyAuthHeaders } from "./patyiaTokens.ts";
import { readPatyiaSseStream, resolveIssApiBase } from "../core/patyia.ts";

function authHeaders(jwt: PatyJwtRecord, extra: Record<string, string> = {}): HeadersInit {
  return patyAuthHeaders(jwt, extra);
}

function unwrapBody<T>(data: unknown): T {
  const d = data as Record<string, unknown>;
  if (d?.respuesta && typeof d.respuesta === "object") return d.respuesta as T;
  if (d?.body && typeof d.body === "object") return d.body as T;
  return d as T;
}

async function jsonFetch<T>(path: string, jwt: PatyJwtRecord, init?: RequestInit): Promise<T> {
  const base = resolveIssApiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...authHeaders(jwt),
      ...(init?.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = res.statusText;
    if (ct.includes("json")) {
      try {
        const j = await res.json() as Record<string, unknown>;
        const enc = j.encabezado as { mensaje?: unknown; resultado?: boolean } | undefined;
        if (enc?.mensaje) msg = String(enc.mensaje);
        else {
          const inner = j.respuesta || j.body || j;
          msg = String((inner as Record<string, unknown>)?.error || (inner as Record<string, unknown>)?.mensaje || j.error || j.message || msg);
        }
      } catch { /* ignore */ }
    }
    const err = new Error(msg || `HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (ct.includes("json")) {
    const raw = await res.json();
    return unwrapBody<T>(raw);
  }
  return {} as T;
}

export type PatyConversacionRow = {
  iconversacion: number;
  titulo?: string;
  fhcre?: string;
  fhultact?: string;
  qmensajes?: number;
  itercero?: string;
  icontacto?: string;
  itdestado?: number;
  prompt?: string;
};

export type PatyMensaje = {
  imensaje?: number;
  autor?: string;
  mensaje?: string;
  fecha_hora?: string | number;
  imagenes?: string[];
  meta?: {
    nombre_usuario?: string;
    prompt_variables?: { nombre_usuario?: string };
    [key: string]: unknown;
  };
};

export type PatyMensajeCalificado = {
  imensaje?: number;
  butil?: boolean | number;
  contenido?: string;
  iconversacion?: number;
};

export type PatyConvLogPayload = {
  iconversacion?: number;
  mensajes?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type PatyConversacionDetalle = PatyConversacionRow & {
  mensajesOpenAI?: PatyMensaje[];
  mensajesCalificados?: PatyMensajeCalificado[];
  convLog?: PatyConvLogPayload | null;
  hilo?: string;
  respuesta?: string;
};

export type PostMensajeCalificadoInput = {
  iconversacion: number;
  contenido: string;
  imensaje: number;
  butil: boolean;
};

export type ListConversacionesInput = {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  itercero?: string;
  icontacto?: string;
};

export type ListConversacionesResult = {
  conversaciones: PatyConversacionRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export async function listConversaciones(
  jwt: PatyJwtRecord,
  input: ListConversacionesInput = {},
): Promise<ListConversacionesResult> {
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  // ISS: QUERY:/api/conversaciones + body JSON (GET ?f= → 404 desde jun 2026).
  const body = await jsonFetch<{
    conversaciones?: PatyConversacionRow[];
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  }>("/conversaciones", jwt, {
    method: "QUERY",
    body: JSON.stringify(conversacionesListBody(input)),
  });
  const conversaciones = Array.isArray(body.conversaciones) ? body.conversaciones : [];
  const total = Number(body.total ?? 0) || 0;
  const resLimit = Number(body.limit ?? limit) || limit;
  const resPage = Number(body.page ?? page) || page;
  const pages = Number(body.pages ?? 0) || (total > 0 ? Math.ceil(total / resLimit) : 0);
  return { conversaciones, total, page: resPage, limit: resLimit, pages };
}

export async function getConversacion(jwt: PatyJwtRecord, id: number): Promise<PatyConversacionDetalle> {
  return jsonFetch<PatyConversacionDetalle>(`/conversacion/${id}`, jwt);
}

/** Mensajes con meta + convLog (GET /conversacion/logs/{id}) — visor ISA PatyIA. */
export async function getConversacionLogs(jwt: PatyJwtRecord, id: number): Promise<PatyConversacionDetalle> {
  return jsonFetch<PatyConversacionDetalle>(`/conversacion/logs/${id}`, jwt);
}

/** Poll ContaPyme MCP: ¿sesión ASW lista? (GET /conversacion/{id}/mcp-session). */
export type McpSessionStatus = {
  ready: boolean;
  kind: "pending" | "ready" | "gone";
  sessionId?: string;
  pendingPrompt?: string;
  loginUrl?: string;
};

export async function getConversacionMcpSession(
  jwt: PatyJwtRecord,
  id: number,
  sessionId?: string,
): Promise<McpSessionStatus> {
  const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return jsonFetch<McpSessionStatus>(`/conversacion/${id}/mcp-session${q}`, jwt);
}

export function convLogFromDetalle(detail: PatyConversacionDetalle | null | undefined, id?: number): PatyConvLogPayload | null {
  const raw = detail?.convLog;
  if (!raw || !Array.isArray(raw.mensajes) || !raw.mensajes.length) return null;
  const convId = Number(raw.iconversacion ?? detail?.iconversacion ?? id ?? 0);
  return { ...raw, iconversacion: convId > 0 ? convId : raw.iconversacion };
}

/** Reintenta hasta que convLog tenga minMensajes (p. ej. tras POST /conversacion). */
export async function getConversacionLogsWithRetry(
  jwt: PatyJwtRecord,
  id: number,
  { minMensajes = 0, attempts = 8, delayMs = 300 }: { minMensajes?: number; attempts?: number; delayMs?: number } = {},
): Promise<PatyConversacionDetalle> {
  let last: PatyConversacionDetalle | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const detail = await getConversacionLogs(jwt, id);
      last = detail;
      const n = convLogFromDetalle(detail, id)?.mensajes?.length ?? 0;
      if (!minMensajes || n >= minMensajes) return detail;
    } catch (e) {
      if (i === attempts - 1 && !last) throw e;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => { setTimeout(resolve, delayMs); });
    }
  }
  if (!last) throw new Error(`Log conv-${id} no encontrado`);
  return last;
}

export async function deleteConversacion(jwt: PatyJwtRecord, id: number): Promise<void> {
  await jsonFetch(`/conversacion/${id}`, jwt, { method: "DELETE" });
}

export async function postMensajeCalificado(
  jwt: PatyJwtRecord,
  input: PostMensajeCalificadoInput,
): Promise<PatyMensajeCalificado> {
  return jsonFetch<PatyMensajeCalificado>("/mensaje", jwt, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type SendMessageInput = {
  prompt: string;
  iconversacion?: number;
  /**
   * URLs R2 firmadas (multimedia/...). Subidas en cliente vía POST /api/adjuntos/imagenes.
   * Compatibilidad: data URLs base64 legacy se rechazan (subir antes).
   */
  imagenes?: string[];
  /** URLs R2 firmadas (multimedia/...). Subidas en cliente vía POST /api/adjuntos/audios. */
  audios?: string[];
  mode?: string;
  /** Solo enviar si no es openai (default servidor). */
  provider?: string;
};

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(String(s || "").trim());
}

function isLegacyDataUrl(s: string): boolean {
  const v = String(s || "").trim();
  return v.startsWith("data:audio/") || v.startsWith("data:image/");
}

/**
 * Texto a enviar en chat. Solo acepta string: si llega un Event/objeto
 * (p. ej. onClick={onSend} → SyntheticEvent), se ignora y se usa el draft.
 * Evita persistir literalmente "[object Object]" en CONVERSACIONES/log.
 */
export function resolveChatSendText(overrideText: unknown, draft: unknown = ""): string {
  if (typeof overrideText === "string") return overrideText.trim();
  if (typeof draft === "string") return draft.trim();
  return "";
}

/** Prompt seguro para el body: nunca String(obj) → "[object Object]". */
export function coerceConversacionPrompt(prompt: unknown): string {
  return typeof prompt === "string" ? prompt.trim() : "";
}

/** Cuerpo JSON del POST /conversacion (URLs R2 firmadas; sin base64). */
export function buildConversacionPostBody(input: SendMessageInput): Record<string, unknown> {
  const text = coerceConversacionPrompt(input.prompt);
  const imagenes = (input.imagenes || [])
    .map((s) => String(s || "").trim())
    .filter((s) => isHttpUrl(s) || isLegacyDataUrl(s));
  const audios = (input.audios || [])
    .map((s) => String(s || "").trim())
    .filter((s) => isHttpUrl(s) || isLegacyDataUrl(s));
  const hasMedia = imagenes.length > 0 || audios.length > 0;
  const body: Record<string, unknown> = {
    prompt: text || (imagenes.length ? "(imagen adjunta)" : audios.length ? "(nota de voz)" : ""),
  };
  if (input.iconversacion) body.iconversacion = input.iconversacion;
  if (imagenes.length) body.imagenes = imagenes;
  if (audios.length) body.audios = audios;
  if (input.mode && String(input.mode).trim().toLowerCase() !== "patyia") {
    body.mode = String(input.mode).trim().toLowerCase();
  }
  const provider = String(input.provider || "").trim().toLowerCase();
  if (provider && provider !== "openai") {
    body.provider = provider;
  }
  if (!String(body.prompt || "").trim() && hasMedia) {
    body.prompt = imagenes.length ? "(imagen adjunta)" : "(nota de voz)";
  }
  return body;
}

/** JSON legible para vista previa; resume URLs firmadas (no base64). */
export function formatConversacionPostBodyPreview(
  body: Record<string, unknown>,
  { maxUrl = 80 }: { maxUrl?: number } = {},
): string {
  const clone = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  const summarize = (u: unknown, label: string, i: number): string => {
    const s = String(u ?? "");
    if (s.length <= maxUrl + 24) return s;
    if (s.startsWith("data:") || s.startsWith("http")) {
      const mime = s.startsWith("data:") ? s.slice(5, s.indexOf(";")) || "?" : "url";
      return `${s.slice(0, maxUrl)}… [${mime}, ${s.length.toLocaleString("es-CO")} chars, ${label} ${i + 1}]`;
    }
    return `${s.slice(0, maxUrl)}…`;
  };
  if (Array.isArray(clone.imagenes)) clone.imagenes = clone.imagenes.map((img, i) => summarize(img, "img", i));
  if (Array.isArray(clone.audios)) clone.audios = clone.audios.map((a, i) => summarize(a, "audio", i));
  return JSON.stringify(clone, null, 2);
}

export async function sendConversacionStream(
  jwt: PatyJwtRecord,
  input: SendMessageInput,
  onDelta: (text: string, payload: Record<string, unknown>) => void,
): Promise<PatyConversacionDetalle> {
  const body = buildConversacionPostBody(input);

  const base = resolveIssApiBase();
  const res = await fetch(`${base}/conversacion`, {
    method: "POST",
    headers: authHeaders(jwt, {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    }),
    body: JSON.stringify(body),
  });

  let streamingText = "";
  const finalPayload = await readPatyiaSseStream(res, (ev) => {
    if (ev.event === "begin") {
      onDelta("", ev.data);
      return;
    }
    if ((ev.event === "message" || ev.event === "end") && typeof ev.data.respuesta === "string") {
      streamingText = ev.data.respuesta;
      onDelta(streamingText, ev.data);
    }
    if (ev.event === "error") {
      throw new Error(String(ev.data.respuesta || ev.data.error || "Error en stream"));
    }
  });

  return {
    ...(finalPayload as PatyConversacionDetalle),
    respuesta: streamingText || String(finalPayload.respuesta || ""),
  };
}
