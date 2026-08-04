import { getSnapshot } from "../../core/urlState.ts";

export const CHAT_SIDEBAR_W = 320;
export const MAX_CHAT_IMAGES = 10;
export const MAX_CHAT_AUDIOS = 5;
export const TERCEROS_AUDIT_PAGE_SIZE = 15;
/** Opciones de paginación del sidebar de conversaciones (30 por defecto). */
export const CONV_LIST_PAGE_SIZE_OPTIONS = [30, 15, 50] as const;
export type ConvListPageSize = (typeof CONV_LIST_PAGE_SIZE_OPTIONS)[number];
export const CONV_LIST_PAGE_SIZE_LS_KEY = "patyia:chat:conv-list-page-size:v2";
const CONV_LIST_PAGE_SIZE_LS_KEY_LEGACY = "patyia:chat:conv-list-page-size";
export const CONV_LIST_PAGE_SIZE_DEFAULT: ConvListPageSize = 30;

export function parseConvListPageSize(raw: unknown): ConvListPageSize {
  if (raw == null || raw === "") return CONV_LIST_PAGE_SIZE_DEFAULT;
  const n = Number(raw);
  return (CONV_LIST_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? (n as ConvListPageSize)
    : CONV_LIST_PAGE_SIZE_DEFAULT;
}

export function readConvListPageSize(): ConvListPageSize {
  try {
    const stored = localStorage.getItem(CONV_LIST_PAGE_SIZE_LS_KEY);
    if (stored != null && stored !== "") return parseConvListPageSize(stored);
    const legacy = localStorage.getItem(CONV_LIST_PAGE_SIZE_LS_KEY_LEGACY);
    if (legacy === "50") {
      persistConvListPageSize(50);
      return 50;
    }
    return CONV_LIST_PAGE_SIZE_DEFAULT;
  } catch {
    return CONV_LIST_PAGE_SIZE_DEFAULT;
  }
}

export function persistConvListPageSize(size: ConvListPageSize): void {
  try {
    localStorage.setItem(CONV_LIST_PAGE_SIZE_LS_KEY, String(size));
  } catch { /* ignore */ }
}

/** @deprecated usar readConvListPageSize() */
export const CONV_LIST_PAGE_SIZE = CONV_LIST_PAGE_SIZE_DEFAULT;
export type ChatMessageSource = "prod" | "logs";

export const CHAT_MODE_PATYIA = "patyia";
export const CHAT_MODE_LIBRE = "libre";
export type ChatMode = typeof CHAT_MODE_PATYIA | typeof CHAT_MODE_LIBRE | string;

export const CHAT_PROVIDER_OPENAI = "openai";
export const CHAT_PROVIDER_MINIMAX = "minimax";
export type ChatLlmProvider = typeof CHAT_PROVIDER_OPENAI | typeof CHAT_PROVIDER_MINIMAX;

export function parseChatLlmProvider(raw: unknown): ChatLlmProvider {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === CHAT_PROVIDER_MINIMAX || t === "mini-max" || t === "mm") return CHAT_PROVIDER_MINIMAX;
  return CHAT_PROVIDER_OPENAI;
}

export function isMinimaxChatProvider(provider: unknown): boolean {
  return parseChatLlmProvider(provider) === CHAT_PROVIDER_MINIMAX;
}

/**
 * Proveedor LLM por defecto. MiniMax es experimental: NO se persiste (ni en URL ni
 * en storage) y se resetea a OpenAI al iniciar, al abrir otra conversación y al
 * crear una nueva. Así los envíos van por OpenAI salvo que se active a propósito
 * para el mensaje en curso.
 */
export const CHAT_PROVIDER_DEFAULT: ChatLlmProvider = CHAT_PROVIDER_OPENAI;

export function parseChatMode(raw: unknown): ChatMode {
  if (typeof raw === "string") {
    const m = raw.trim().toLowerCase();
    if (m === CHAT_MODE_LIBRE || m === "free") return CHAT_MODE_LIBRE;
    if (m === CHAT_MODE_PATYIA) return CHAT_MODE_PATYIA;
    if (m) return m;
  }
  if (raw === true || raw === 1 || String(raw ?? "").toLowerCase() === "true") return CHAT_MODE_LIBRE;
  if (raw === false || raw === 0 || String(raw ?? "").toLowerCase() === "false") return CHAT_MODE_PATYIA;
  return CHAT_MODE_PATYIA;
}

export function isLibreChatMode(mode: unknown): boolean {
  return parseChatMode(mode) === CHAT_MODE_LIBRE;
}

function chatBagMode(chat: Record<string, unknown> | undefined): ChatMode | null {
  if (!chat) return null;
  if (chat.mode != null && String(chat.mode).trim() !== "") return parseChatMode(chat.mode);
  if (chat.jailbreak === true) return CHAT_MODE_LIBRE;
  if (chat.jailbreak === false) return CHAT_MODE_PATYIA;
  return null;
}

/** Modo de conversación — ?s=.chat.mode (legacy: jailbreak boolean). */
export function readChatMode(bootChat?: { mode?: unknown; jailbreak?: unknown }): ChatMode {
  if (bootChat) {
    if (bootChat.mode != null && String(bootChat.mode).trim() !== "") return parseChatMode(bootChat.mode);
    if (bootChat.jailbreak === true) return CHAT_MODE_LIBRE;
    if (bootChat.jailbreak === false) return CHAT_MODE_PATYIA;
  }
  const chat = getSnapshot().chat as Record<string, unknown> | undefined;
  return chatBagMode(chat) ?? CHAT_MODE_PATYIA;
}

/** null si la URL no define mode (ni legacy jailbreak). */
export function chatModeFromUrl(chat: Record<string, unknown> | undefined): ChatMode | null {
  return chatBagMode(chat);
}

export function parseChatMessageSource(raw: unknown): ChatMessageSource {
  return raw === "prod" || raw === "logs" ? raw : "logs";
}

/** Prefer URL ?s=.chat.messageSource; default logs si no está seteado. */
export function readChatMessageSource(bootChat?: { messageSource?: unknown }): ChatMessageSource {
  if (bootChat?.messageSource === "prod" || bootChat?.messageSource === "logs") return bootChat.messageSource;
  const chat = getSnapshot().chat as Record<string, unknown> | undefined;
  if (chat?.messageSource === "prod" || chat?.messageSource === "logs") return chat.messageSource;
  return "logs";
}

/** null si la URL no define messageSource (no resetear el default en memoria). */
export function messageSourceFromUrl(chat: Record<string, unknown> | undefined): ChatMessageSource | null {
  if (chat?.messageSource === "prod" || chat?.messageSource === "logs") return chat.messageSource;
  return null;
}
