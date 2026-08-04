import type {
  PatyConversacionDetalle,
  PatyConversacionRow,
  PatyMensaje,
  PatyMensajeCalificado,
} from "../../api/patyiaChatApi.ts";
import type { BrowseScope, PatyJwtRecord } from "../../core/patyia-jwt.ts";
import type { ChatMessageSource } from "./constants.ts";

export type { PatyConversacionDetalle, PatyConversacionRow, PatyMensaje, PatyMensajeCalificado, BrowseScope, PatyJwtRecord };

export type AuditScopeRow = {
  itercero?: string;
  icontacto?: string;
  nombre?: string | null;
  esJwt?: boolean;
  esSesion?: boolean;
};

export type ChatMensajeMeta = Record<string, unknown> | null;

/** Mensaje normalizado para ConvLogWebView / hilo del chat. */
export type ChatMensajeVista = {
  idMsg: string;
  rol: string;
  contenido: string;
  fecha: string;
  fechaIso?: string;
  esUsuario: boolean;
  esOperativa: boolean;
  meta?: ChatMensajeMeta;
  nombreUsuario?: string;
  imagenes?: string[];
  audios?: string[];
  audiosTranscripcion?: string[];
  imensaje?: number;
  calificacion?: number;
  isStreaming?: boolean;
  usageStats?: Record<string, unknown>;
  streamFailed?: boolean;
  streamError?: string;
};

export type ConvLogSnapshot = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
};

export type ChatImageEntry = {
  name: string;
  /** File binario (lista para multipart/form-data). */
  blob: File;
  mime: string;
  /** Ancho/alto (opcional — UI preview). */
  width?: number;
  height?: number;
  /** URL firmada R2 una vez subido; null todavía no subido. */
  uploadedUrl?: string | null;
};

export type ChatAudioEntry = {
  name: string;
  /** File binario (lista para multipart/form-data). */
  blob: File;
  mime: string;
  /** URL firmada R2 una vez subido; null todavía no subido. */
  uploadedUrl?: string | null;
};

export type ConvListMeta = {
  total: number;
  page: number;
  pages: number;
};

export type ConvLogPayload = {
  mensajes?: Array<{ role?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type ThreadApplyOptions = {
  /** Usar mensajesOpenAI del GET /conversacion/logs/{id} (incluye convLog en la misma respuesta). */
  openAiDirect?: boolean;
  /** Quitar meta/usageStats del hilo (vista prod; defensa si staging aún devuelve meta). */
  stripMeta?: boolean;
};

export type OpenConvOptions = {
  silent?: boolean;
  keepStream?: boolean;
  freshLog?: boolean;
  minLogMensajes?: number;
  sourceOverride?: ChatMessageSource;
};

export type PatchThreadOptions = {
  minLogMensajes?: number;
  ownerLabel?: string;
};

export type UseChatToolBoot = {
  convId?: number | string;
  messageSource?: ChatMessageSource;
  mode?: string;
};

export type ClipboardPasteEvent = {
  clipboardData?: DataTransfer | null;
  preventDefault(): void;
};

export type FileInputChangeEvent = {
  target: { files: FileList | null; value: string };
};
