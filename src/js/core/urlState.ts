/** Estado de la app en ?s= — esquema isa-patyia sobre url-state compartido. */
import { ensureIssLocalDefault } from "./patyia.ts";

const STATE_VERSION = 1;

function normalizeLog(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const o = { ...(raw as Record<string, unknown>) };
  const w = Number(o.sidebarW);
  if (Number.isFinite(w) && w > 0) o.sidebarW = Math.round(w);
  else delete o.sidebarW;
  return o;
}

function initial() { return { v: STATE_VERSION, tool: "home", log: {}, prompts: {}, chat: { pane: "conv" }, todos: {}, config: { pane: "prompts" } }; }

function normalizeChatPane(raw: unknown): "conv" | "logs" {
  return raw === "logs" ? "logs" : "conv";
}

function normalizeConfigPane(raw: unknown): "sistema" | "permisos" | "prompts" {
  if (raw === "permisos") return "permisos";
  if (raw === "sistema") return "sistema";
  return "prompts";
}

/** Lee tab Config legacy en LS (antes vivía fuera de ?s=). */
function legacyConfigPaneFromLs(): "sistema" | "permisos" | "prompts" {
  try {
    const v = localStorage.getItem("isa-patyia:config-tab");
    if (v === "permisos" || v === "sistema" || v === "prompts") return v;
    return "prompts";
  } catch {
    return "prompts";
  }
}

function normalizeTool(raw: unknown) {
  // Legacy: tool=log → chat + pane=logs; tool=prompts → config + pane=prompts.
  if (raw === "log") return "chat";
  if (raw === "prompts") return "config";
  if (raw === "home") return "home";
  if (raw === "chat") return "chat";
  if (raw === "todos") return "todos";
  if (raw === "config") return "config";
  return "home";
}

function normalizeChatBag(chat: unknown, legacyTool?: unknown) {
  const bag = chat && typeof chat === "object" ? { ...(chat as Record<string, unknown>) } : {};
  if ((bag.mode == null || String(bag.mode).trim() === "") && bag.jailbreak != null) {
    bag.mode = bag.jailbreak === true ? "libre" : "patyia";
    delete bag.jailbreak;
  } else if (bag.jailbreak != null) {
    delete bag.jailbreak;
  }
  if (legacyTool === "log") {
    bag.pane = "logs";
  } else {
    bag.pane = normalizeChatPane(bag.pane);
  }
  return bag;
}

function normalizeConfigBag(config: unknown, legacyTool?: unknown) {
  const bag = config && typeof config === "object" ? { ...(config as Record<string, unknown>) } : {};
  if (legacyTool === "prompts") {
    bag.pane = "prompts";
  } else if (bag.pane !== "sistema" && bag.pane !== "permisos" && bag.pane !== "prompts") {
    bag.pane = legacyConfigPaneFromLs();
  } else {
    bag.pane = normalizeConfigPane(bag.pane);
  }
  return bag;
}

function normalize(raw: Record<string, unknown> | null, _prev: unknown) {
  if (!raw || typeof raw !== "object") return initial();
  const legacyTool = raw.tool;
  const tool = normalizeTool(legacyTool);
  const chat = normalizeChatBag(raw.chat, legacyTool);
  const todos = raw.todos && typeof raw.todos === "object" ? raw.todos : {};
  const config = normalizeConfigBag(raw.config, legacyTool);
  return {
    v: raw.v ?? STATE_VERSION, tool,
    log: normalizeLog(raw.log),
    prompts: raw.prompts && typeof raw.prompts === "object" ? raw.prompts : {},
    chat, todos, config,
  };
}

function slimForUrl(src: Record<string, unknown>) {
  const slim = { ...src };
  const log = slim.log as Record<string, unknown> | undefined;
  if (log) {
    const nextLog = { ...log };
    if (nextLog.jsonInput && String(nextLog.jsonInput).length > 4000) {
      slim.log = {
        convId: nextLog.convId || "",
        ...(nextLog.sidebarW != null ? { sidebarW: nextLog.sidebarW } : {}),
      };
    } else {
      slim.log = nextLog;
    }
  }
  const prompts = slim.prompts as Record<string, unknown> | undefined;
  if (prompts?.bodies) {
    const bodies: Record<string, string> = {};
    let total = 0;
    for (const [k, v] of Object.entries(prompts.bodies as Record<string, unknown>)) {
      const t = String(v ?? "");
      if (total + t.length > 6000) break;
      bodies[k] = t;
      total += t.length;
    }
    slim.prompts = { ...prompts, bodies };
  }
  return slim;
}

function mergeConfig(state: Record<string, unknown>, partial: Record<string, unknown> | undefined) {
  const prev = state.config && typeof state.config === "object" ? { ...(state.config as Record<string, unknown>) } : {};
  const next = partial && typeof partial === "object" ? partial : {};
  const prevPermisos = prev.permisos && typeof prev.permisos === "object" ? { ...(prev.permisos as Record<string, unknown>) } : {};
  const nextPermisos = next.permisos && typeof next.permisos === "object" ? next.permisos as Record<string, unknown> : null;
  return {
    ...prev,
    ...next,
    ...(nextPermisos ? { permisos: { ...prevPermisos, ...nextPermisos } } : {}),
  };
}

function merge(state: Record<string, unknown>, partial: Record<string, unknown>) {
  const nextLog = { ...(state.log as object), ...((partial.log as object) || {}) };
  if ("jsonInput" in nextLog) delete (nextLog as Record<string, unknown>).jsonInput;
  return {
    ...state,
    ...partial,
    log: nextLog,
    prompts: {
      ...(state.prompts as Record<string, unknown>),
      ...((partial.prompts as Record<string, unknown>) || {}),
    },
    chat: {
      ...(state.chat as Record<string, unknown>),
      ...((partial.chat as Record<string, unknown>) || {}),
    },
    todos: {
      ...(state.todos as Record<string, unknown>),
      ...((partial.todos as Record<string, unknown>) || {}),
    },
    config: mergeConfig(state, partial.config as Record<string, unknown> | undefined),
  };
}

const URL_STATE_PARAM = "s";

function stripUrlStateParam() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has(URL_STATE_PARAM)) return;
    url.searchParams.delete(URL_STATE_PARAM);
    history.replaceState(null, "", url);
  } catch { /* ignore */ }
}

/** Migra ?tool=log&log.convId=… → ?s= (b64url JSON) antes de leer el estado. */
function migrateLegacyFlatQuery() {
  if (typeof window === "undefined" || !window.ISAFront?.b64urlEncode) return;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has(URL_STATE_PARAM)) return;
    const tool = url.searchParams.get("tool");
    const legacyKeys = [...url.searchParams.keys()].filter(
      (k) => k === "tool" || k === "local" || k.includes("."),
    );
    if (!legacyKeys.length) return;

    const next: Record<string, unknown> = {
      v: STATE_VERSION,
      tool: normalizeTool(tool),
      log: {},
      prompts: {},
      chat: {},
      todos: {},
      config: {},
    };

    for (const [key, raw] of url.searchParams.entries()) {
      if (key === "tool" || key === "local") continue;
      const dot = key.indexOf(".");
      if (dot < 0) continue;
      const section = key.slice(0, dot);
      const field = key.slice(dot + 1);
      if (section !== "log" && section !== "prompts" && section !== "chat" && section !== "todos") continue;
      const bag = (next[section] as Record<string, unknown>) || {};
      if (field === "convId" && (section === "chat" || section === "log")) {
        const n = Number(raw);
        bag.convId = Number.isFinite(n) && n > 0 ? n : String(raw ?? "").trim();
      } else if (field === "mode") {
        bag.mode = String(raw ?? "").trim().toLowerCase() || "patyia";
      } else if (field === "jailbreak") {
        bag.mode = raw === "1" || raw === "true" ? "libre" : "patyia";
      } else if (field === "boardId" || field === "milestoneId" || field === "taskId") {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) bag[field] = n;
      } else {
        bag[field] = raw;
      }
      next[section] = bag;
    }

    legacyKeys.forEach((k) => url.searchParams.delete(k));
    const slim = slimForUrl(next);
    const json = JSON.stringify(slim);
    if (json !== "{}") url.searchParams.set(URL_STATE_PARAM, window.ISAFront.b64urlEncode(json));
    history.replaceState(null, "", url);
  } catch { /* ignore */ }
}

migrateLegacyFlatQuery();

const urlState = window.ISAFront.createUrlState({
  param: URL_STATE_PARAM,
  debounceMs: 350,
  maxB64Len: 12000,
  historyKey: "patyAppState",
  initial,
  normalize,
  slimForUrl,
  merge,
  onInit() {
    ensureIssLocalDefault();
  },
  brandHomeReset(api) {
    const snap = api.reset();
    stripUrlStateParam();
    return snap;
  },
});

export const bootState = urlState.boot;
export const getSnapshot = urlState.getSnapshot;
export const mergePartial = urlState.mergePartial;
export const hrefFor = urlState.hrefFor;
export const subscribe = urlState.subscribe;
export const PARAM = urlState.PARAM;

/** Reinicia estado de la app y elimina por completo ?s= de la URL. */
export function resetUrlState() { const snap = urlState.reset(); stripUrlStateParam(); return snap; }

/** Ancho del panel Entrada (visor log) en ?s=.log.sidebarW */
export function persistLogSidebarWidth(width: number) {
  const n = Math.round(Number(width));
  if (!Number.isFinite(n) || n <= 0) return getSnapshot();
  const snap = getSnapshot();
  const prev = Number((snap.log as Record<string, unknown>)?.sidebarW);
  if (prev === n) return snap;
  return mergePartial({ log: { sidebarW: n } });
}

/** Solo metadatos ligeros del visor de log (iconversacion), no el JSON completo. */
export function persistLogMeta(convId: string) {
  const snap = getSnapshot();
  const id = convId || "";
  if (String((snap.log as Record<string, unknown>)?.convId ?? "") === id) return snap;
  return mergePartial({ log: { convId: id } });
}

/** Conversación activa del chat staging — iconversacion en ?s=.chat.convId */
export function persistChatConvId(convId: number | null | undefined) {
  const snap = getSnapshot();
  const id = convId != null && Number(convId) > 0 ? Number(convId) : null;
  const prev = Number((snap.chat as Record<string, unknown>)?.convId) || null;
  if (prev === id) return snap;
  return mergePartial({ tool: "chat", chat: { convId: id } });
}

/** Fuente de mensajes del chat — prod | logs en ?s=.chat.messageSource */
export function persistChatMessageSource(source: "prod" | "logs") {
  const snap = getSnapshot();
  const prev = (snap.chat as Record<string, unknown>)?.messageSource;
  if (prev === source) return snap;
  return mergePartial({ tool: "chat", chat: { messageSource: source } });
}

/** Modo de conversación — patyia | libre en ?s=.chat.mode */
export function persistChatMode(mode: string) {
  const normalized = String(mode || "patyia").trim().toLowerCase() || "patyia";
  const snap = getSnapshot();
  const prev = String((snap.chat as Record<string, unknown>)?.mode || "patyia");
  if (prev === normalized) return snap;
  return mergePartial({ tool: "chat", chat: { mode: normalized } });
}

/** Proveedor LLM — openai | minimax en ?s=.chat.provider (openai = omitir en URL). */
export function persistChatLlmProvider(provider: string) {
  const normalized = String(provider || "openai").trim().toLowerCase() || "openai";
  const snap = getSnapshot();
  const prev = String((snap.chat as Record<string, unknown>)?.provider || "openai").toLowerCase();
  if (prev === normalized) return snap;
  if (normalized === "openai") {
    return mergePartial({ tool: "chat", chat: { provider: undefined } });
  }
  return mergePartial({ tool: "chat", chat: { provider: normalized } });
}

function configPermisosBag(snap?: Record<string, unknown>) {
  const cfg = (snap ?? getSnapshot()).config as Record<string, unknown> | undefined;
  const permisos = cfg?.permisos;
  return permisos && typeof permisos === "object" ? permisos as Record<string, unknown> : undefined;
}

/** Switch «Ocultar vacíos» en Permisos — default true; solo false si ?s= lo fija. */
export function readPermisosHideEmptyFromUrl(snap?: Record<string, unknown>) {
  return configPermisosBag(snap)?.hideEmpty !== false;
}

export function persistPermisosHideEmpty(hide: boolean) {
  const prev = readPermisosHideEmptyFromUrl();
  if (prev === hide) return getSnapshot();
  return mergePartial({ tool: "config", config: { permisos: { hideEmpty: !!hide } } });
}
