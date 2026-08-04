/**
 * Subida paralela de audios e imágenes a R2 (sin base64).
 *
 * API:
 *   POST /api/adjuntos/imagenes   multipart/form-data  → { ok, items: [{ url, mime, ... }, ...] }
 *   POST /api/adjuntos/audios     multipart/form-data  → { ok, items: [{ url, mime, ... }, ...] }
 *
 * Subida en bloques concurrentes (limite seguro) — devuelve array de URLs en el mismo
 * orden en que se pasaron los archivos.
 *
 * Compatible con `resolveIssApiBase()` (las funciones SSE ya lo usan) y headers ISS-JWT
 * (`patyAuthHeaders`) más authorization Paty/legacy. Sin uso del navegador ad-hoc.
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
  expiresAt?: string;
};

export type UploadAdjuntosInput = {
  /** Files binarios (File desde <input type=file> o MediaRecorder). */
  files: File[];
  /** Concurrencia máxima; default 3. */
  concurrency?: number;
  /** Callback por progreso (bytes cargados / total). */
  onProgress?: (state: { loaded: number; total: number; fileIndex: number }) => void;
  /** AbortController global para cancelar. */
  signal?: AbortSignal;
};

const DEFAULT_CONCURRENCY = 3;

async function uploadFilesMultipart(
  path: string,
  jwt: PatyJwtRecord | null,
  input: UploadAdjuntosInput,
): Promise<AdjuntoSubido[]> {
  const { files, concurrency = DEFAULT_CONCURRENCY, onProgress, signal } = input;
  if (!files?.length) return [];
  const base = resolveIssApiBase();
  const headers: Record<string, string> = {};
  if (jwt) Object.assign(headers, patyAuthHeaders(jwt));
  const results: AdjuntoSubido[] = new Array(files.length);

  let cursor = 0;
  const totalBytes = files.reduce((s, f) => s + (f?.size || 0), 0);
  let loadedBytes = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= files.length) return;
      const f = files[i];
      const prevBytes = loadedBytes;
      try {
        const fd = new FormData();
        // El ISS espera `files` (1..N) en multipart.
        fd.append("files", f, f.name || `adjunto-${i + 1}`);
        const res = await fetch(`${base}${path}`, {
          method: "POST",
          headers,
          body: fd,
          signal,
        });
        const ct = res.headers.get("content-type") || "";
        const json = ct.includes("json") ? await res.json().catch(() => ({})) : {};
        if (!res.ok) {
          const err = (json && typeof json === "object" && (json.error || json.message)) || `HTTP ${res.status}`;
          throw new Error(typeof err === "string" ? err : JSON.stringify(err));
        }
        const itemsRaw = (json && typeof json === "object" && Array.isArray((json as { items?: unknown }).items))
          ? (json as { items: AdjuntoSubido[] }).items
          : [];
        const uploaded: AdjuntoSubido | undefined = itemsRaw[i] ?? itemsRaw[0];
        if (!uploaded?.url) {
          throw new Error("ISS devolvió items sin url");
        }
        results[i] = { ...uploaded, filename: f.name };
        loadedBytes = prevBytes + f.size;
        onProgress?.({ loaded: loadedBytes, total: totalBytes, fileIndex: i });
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          throw err;
        }
        throw new Error(`Subida falló (${f.name || i}): ${(err as Error)?.message || err}`);
      }
    }
  };

  const lanes = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
  await Promise.all(lanes);
  return results;
}

export async function uploadAudios(
  jwt: PatyJwtRecord | null,
  files: File[],
  onProgress?: UploadAdjuntosInput["onProgress"],
  signal?: AbortSignal,
): Promise<AdjuntoSubido[]> {
  return uploadFilesMultipart("/adjuntos/audios", jwt, { files, onProgress, signal });
}

export async function uploadImagenes(
  jwt: PatyJwtRecord | null,
  files: File[],
  onProgress?: UploadAdjuntosInput["onProgress"],
  signal?: AbortSignal,
): Promise<AdjuntoSubido[]> {
  return uploadFilesMultipart("/adjuntos/imagenes", jwt, { files, onProgress, signal });
}

/** Recolecta las URLs en el orden de los archivos subidos. */
export function pluckUrls(items: AdjuntoSubido[]): string[] {
  return items.filter(Boolean).map((it) => it.url);
}
