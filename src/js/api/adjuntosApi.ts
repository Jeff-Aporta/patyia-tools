/**
 * Subida de audios e imágenes a R2 vía ISS `POST /api/file/upload`.
 * Audio → ffmpeg mp3 128k en servidor; imagen → variantes thumb/med/original.
 * Devuelve URL reproducible para el chat / auditoría (others.audios_adjuntas).
 */
import { resolveIssApiBase } from "../core/patyia.ts";
import type { PatyJwtRecord } from "../core/patyia-jwt.ts";
import { patyAuthHeaders } from "./patyiaTokens.ts";

export type AdjuntoSubido = {
  key: string;
  url: string;
  mime: string;
  bytes: number;
  filename: string;
  ifile?: string;
  expiresAt?: string;
};

export type UploadAdjuntosInput = {
  files: File[];
  concurrency?: number;
  onProgress?: (state: { loaded: number; total: number; fileIndex: number }) => void;
  signal?: AbortSignal;
};

const DEFAULT_CONCURRENCY = 3;

type FileUploadRow = {
  ifile?: string;
  jfile?: {
    kind?: string;
    mime?: string;
    filename?: string;
    variants?: { original?: { key?: string; url?: string; mime?: string; bytes?: number } };
    meta?: { sizeBytes?: number };
  };
};

function unwrapIss<T>(raw: unknown): T {
  const d = raw as Record<string, unknown>;
  const enc = d?.encabezado as { resultado?: boolean; mensaje?: string } | undefined;
  if (enc && typeof enc === "object" && enc.resultado === false) {
    throw new Error(String(enc.mensaje || "Error en la respuesta del servidor"));
  }
  if (d?.respuesta && typeof d.respuesta === "object" && !Array.isArray(d.respuesta)) return d.respuesta as T;
  if (d?.body && typeof d.body === "object" && !Array.isArray(d.body)) return d.body as T;
  return d as T;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function rowToAdjunto(row: FileUploadRow, fallbackName: string): AdjuntoSubido {
  const v = row.jfile?.variants?.original;
  if (!v?.url) throw new Error("ISS file/upload sin variants.original.url");
  return {
    key: String(v.key || ""),
    url: String(v.url),
    mime: String(v.mime || row.jfile?.mime || "application/octet-stream"),
    bytes: Number(v.bytes ?? row.jfile?.meta?.sizeBytes ?? 0),
    filename: String(row.jfile?.filename || fallbackName),
    ifile: row.ifile ? String(row.ifile) : undefined,
  };
}

async function uploadOneFile(
  kind: "audio" | "imagen",
  jwt: PatyJwtRecord | null,
  file: File,
  signal?: AbortSignal,
): Promise<AdjuntoSubido> {
  const base = resolveIssApiBase();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(jwt ? patyAuthHeaders(jwt) : {}) };
  const buf = await file.arrayBuffer();
  const mime = (file.type || (kind === "audio" ? "audio/webm" : "image/jpeg")).split(";")[0].trim();
  const res = await fetch(`${base}/api/file/upload`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      kind,
      mime,
      filename: file.name || `${kind}-${Date.now()}`,
      base64: arrayBufferToBase64(buf),
    }),
  });
  const ct = res.headers.get("content-type") || "";
  const json = ct.includes("json") ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    const err = (json && typeof json === "object" && ((json as { error?: unknown }).error || (json as { message?: unknown }).message)) || `HTTP ${res.status}`;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }
  const row = unwrapIss<FileUploadRow>(json);
  return rowToAdjunto(row, file.name || kind);
}

async function uploadFiles(
  kind: "audio" | "imagen",
  jwt: PatyJwtRecord | null,
  input: UploadAdjuntosInput,
): Promise<AdjuntoSubido[]> {
  const { files, concurrency = DEFAULT_CONCURRENCY, onProgress, signal } = input;
  if (!files?.length) return [];
  const results: AdjuntoSubido[] = new Array(files.length);
  let cursor = 0;
  const totalBytes = files.reduce((s, f) => s + (f?.size || 0), 0);
  let loadedBytes = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= files.length) return;
      const f = files[i];
      try {
        results[i] = await uploadOneFile(kind, jwt, f, signal);
        loadedBytes += f.size;
        onProgress?.({ loaded: loadedBytes, total: totalBytes, fileIndex: i });
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") throw err;
        throw new Error(`Subida falló (${f.name || i}): ${(err as Error)?.message || err}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));
  return results;
}

export async function uploadAudios(
  jwt: PatyJwtRecord | null,
  files: File[],
  onProgress?: UploadAdjuntosInput["onProgress"],
  signal?: AbortSignal,
): Promise<AdjuntoSubido[]> {
  return uploadFiles("audio", jwt, { files, onProgress, signal });
}

export async function uploadImagenes(
  jwt: PatyJwtRecord | null,
  files: File[],
  onProgress?: UploadAdjuntosInput["onProgress"],
  signal?: AbortSignal,
): Promise<AdjuntoSubido[]> {
  return uploadFiles("imagen", jwt, { files, onProgress, signal });
}

/** Recolecta las URLs en el orden de los archivos subidos. */
export function urlsFromAdjuntos(items: AdjuntoSubido[]): string[] {
  return items.map((i) => i.url).filter(Boolean);
}
