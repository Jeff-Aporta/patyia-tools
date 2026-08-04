import type { ChatAudioEntry } from "./types.ts";

const AUDIO_EXT_RE = /\.(webm|mp3|m4a|wav|ogg|aac|mp4)$/i;
const BACKEND_AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-m4a",
  "audio/aac",
]);

function mimeFromFileName(name: string): string | undefined {
  const lower = name.trim().toLowerCase();
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return undefined;
}

function isBackendSupportedAudioMime(mime: string | undefined): boolean {
  const m = String(mime || "").toLowerCase();
  if (m && BACKEND_AUDIO_MIMES.has(m)) return true;
  // MediaRecorder a veces declara "audio/webm;codecs=opus" — recortamos al tipo base.
  if (m.startsWith("audio/webm")) return true;
  if (m.startsWith("audio/mp4") || m.startsWith("audio/m4a")) return true;
  if (m.startsWith("audio/mpeg")) return true;
  return false;
}

export function isChatAudioFile(file: File | null | undefined): boolean {
  if (!file) return false;
  if (file.type?.startsWith("audio/")) return true;
  return AUDIO_EXT_RE.test(file.name || "");
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("No se pudo leer el audio"));
    r.readAsDataURL(file);
  });
}

/**
 * Construye entradas de audio en **binario puro**: cada ChatAudioEntry trae
 * `Blob` + `File` listo para `multipart/form-data`. NO se genera base64 en
 * el cliente (binario de extremo a extremo: Blobs → POST /adjuntos/audios →
 * R2 URL → chat payload).
 *
 * Si alguien necesita preview local en el hilo, use `previewUrl(dataUrl)` con
 * un Object URL temporal a partir del blob.
 */
export async function filesToAudioEntries(files: Iterable<File> | null | undefined): Promise<ChatAudioEntry[]> {
  const added: ChatAudioEntry[] = [];
  for (const file of files || []) {
    if (!isChatAudioFile(file)) continue;
    const mime = (file.type || mimeFromFileName(file.name || "") || "audio/webm").toLowerCase().split(";")[0];
    if (!isBackendSupportedAudioMime(mime)) continue;
    added.push({ name: file.name || "audio", blob: file, mime });
  }
  return added;
}

export function blobToPreviewUrl(blob: Blob): string {
  try { return URL.createObjectURL(blob); } catch { return ""; }
}

export type VoiceRecorderHandle = {
  start(): Promise<void>;
  stop(): Promise<ChatAudioEntry | null>;
  cancel(): void;
  isActive(): boolean;
};

export function createVoiceRecorder(): VoiceRecorderHandle {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let stream: MediaStream | null = null;

  const stopStream = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  const chooseExt = (recMime: string): "webm" | "m4a" | "mp3" | "wav" | "ogg" => {
    if (recMime.includes("webm")) return "webm";
    if (recMime.includes("mp4") || recMime.includes("m4a")) return "m4a";
    if (recMime.includes("mpeg") || recMime.includes("mp3")) return "mp3";
    if (recMime.includes("wav")) return "wav";
    if (recMime.includes("ogg")) return "ogg";
    return "webm";
  };

  return {
    async start() {
      if (mediaRecorder?.state === "recording") return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      mediaRecorder.start();
    },
    stop() {
      return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
          stopStream();
          resolve(null);
          return;
        }
        const recorder = mediaRecorder;
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          stopStream();
          mediaRecorder = null;
          chunks = [];
          if (!blob.size) {
            resolve(null);
            return;
          }
          const mime = (recorder.mimeType || "audio/webm").toLowerCase().split(";")[0];
          const fileName = `nota-voz-${new Date().toISOString().replace(/[:.]/g, "-")}.${chooseExt(mime)}`;
          // Wrap como File (nombre + última modificación) — no requiere base64.
          const file = new File([blob], fileName, { type: mime });
          resolve({ name: fileName, blob: file, mime });
        };
        recorder.stop();
      });
    },
    cancel() {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
      }
      mediaRecorder = null;
      chunks = [];
      stopStream();
    },
    isActive() {
      return mediaRecorder?.state === "recording";
    },
  };
}

export function isVoiceRecordingSupported(): boolean {
  return typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== "undefined";
}
