import { getReact, getMaterialUI, UI } from "../../core/platform.ts";
import { PATYIA_API_BASE } from "../../core/patyia-jwt.ts";
import { MAX_CHAT_IMAGES, MAX_CHAT_AUDIOS } from "./constants.ts";
import { ChatPayloadPreview } from "./ChatPayloadPreview.jsx";
import { ImageLightboxDialog } from "../../ui/ImageLightboxDialog.jsx";
import { isVoiceRecordingSupported, blobToPreviewUrl as blobToAudioPreviewUrl } from "./audio.ts";
import { blobToPreviewUrl } from "./images.ts";

const { useState, useMemo, useEffect } = getReact();
const {
  Box, Button, IconButton, TextField, CircularProgress, Tooltip,
} = getMaterialUI();
const { Icon } = UI;

export function ChatComposer({
  canSend,
  sending,
  draft,
  images,
  audios,
  isRecording,
  payloadPreviewOpen,
  postBodyPreview,
  inputRef,
  attachInputRef,
  onDraftChange,
  onPaste,
  onSend,
  onTogglePayloadPreview,
  onAttachClick,
  onAttachChange,
  onToggleVoiceRecord,
  onRemoveImage,
  onRemoveAudio,
}) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const canRecord = isVoiceRecordingSupported();
  const hasContent = Boolean(draft.trim() || images.length || audios.length);

  // Object URLs para preview local desde Blob (sin base64).
  const imagePreviewUrls = useMemo(
    () => images.map((img) => blobToPreviewUrl(img.blob)),
    [images],
  );
  const audioPreviewUrls = useMemo(
    () => audios.map((aud) => blobToAudioPreviewUrl(aud.blob)),
    [audios],
  );
  useEffect(() => () => {
    // Libera Object URLs al desmontar o cambiar adjuntos.
    [...imagePreviewUrls, ...audioPreviewUrls].forEach((u) => { if (u) URL.revokeObjectURL(u); });
  }, [imagePreviewUrls, audioPreviewUrls]);

  if (!canSend) return null;

  return (
    <Box className="paty-chat-compose">
      <ChatPayloadPreview
        open={payloadPreviewOpen}
        body={postBodyPreview}
        endpoint={`${PATYIA_API_BASE}/conversacion`}
        onClose={onTogglePayloadPreview}
      />
      {images.length > 0 && (
        <Box className="paty-chat-image-previews">
          {images.map((img, idx) => {
            const previewSrc = img.uploadedUrl || imagePreviewUrls[idx] || "";
            return (
              <figure key={idx}>
                <button
                  type="button"
                  className="paty-chat-image-previews__thumb-btn"
                  aria-label={`Ver ${img.name || "adjunto"} en tamaño completo`}
                  onClick={() => previewSrc && setLightboxSrc(previewSrc)}
                >
                  <img
                    src={previewSrc}
                    alt={img.name || "adjunto"}
                    onError={(e) => {
                      e.currentTarget.classList.add("paty-chat-image-previews__img--broken");
                      e.currentTarget.removeAttribute("src");
                    }}
                  />
                </button>
                <button type="button" className="paty-chat-image-previews__remove" aria-label="Quitar" onClick={() => onRemoveImage(idx)}>×</button>
              </figure>
            );
          })}
        </Box>
      )}
      {audios.length > 0 && (
        <Box className="paty-chat-audio-previews">
          {audios.map((aud, idx) => {
            const previewSrc = aud.uploadedUrl || audioPreviewUrls[idx] || "";
            return (
              <figure key={idx}>
                <audio controls preload="metadata" src={previewSrc} aria-label={aud.name || `Nota de voz ${idx + 1}`} />
                <figcaption>{aud.name || `Nota ${idx + 1}`}</figcaption>
                <button type="button" className="paty-chat-audio-previews__remove" aria-label="Quitar audio" onClick={() => onRemoveAudio(idx)}>×</button>
              </figure>
            );
          })}
        </Box>
      )}
      <Box className="paty-chat-input-wrap">
        <input
          ref={attachInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/ogg,.webm,.mp3,.m4a,.wav,.ogg"
          multiple
          hidden
          aria-hidden
          tabIndex={-1}
          onChange={onAttachChange}
        />
        <Tooltip title={payloadPreviewOpen ? "Ocultar body POST" : "Ver body POST (JSON en vivo)"}>
          <span>
            <IconButton color="inherit" className={`paty-chat-payload-btn${payloadPreviewOpen ? " paty-chat-payload-btn--active" : ""}`} aria-label={payloadPreviewOpen ? "Ocultar vista previa JSON" : "Ver vista previa JSON del POST"} aria-pressed={payloadPreviewOpen} disabled={sending} onClick={onTogglePayloadPreview} size="small">
              <Icon icon="mdi:code-json" size={22} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Adjuntar imagen o audio">
          <span>
            <IconButton
              color="inherit"
              className="paty-chat-attach-btn"
              aria-label="Adjuntar imagen o audio"
              disabled={sending || (images.length >= MAX_CHAT_IMAGES && audios.length >= MAX_CHAT_AUDIOS)}
              onClick={onAttachClick}
              size="small"
            >
              <Icon icon="mdi:paperclip" size={22} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={canRecord ? (isRecording ? "Detener grabación" : "Grabar nota de voz") : "Grabación no disponible en este navegador"}>
          <span>
            <IconButton
              color={isRecording ? "error" : "inherit"}
              className={`paty-chat-mic-btn${isRecording ? " paty-chat-mic-btn--recording" : ""}`}
              aria-label={isRecording ? "Detener grabación" : "Grabar nota de voz"}
              aria-pressed={isRecording}
              disabled={sending || !canRecord || audios.length >= MAX_CHAT_AUDIOS}
              onClick={onToggleVoiceRecord}
              size="small"
            >
              <Icon icon={isRecording ? "mdi:stop-circle-outline" : "mdi:microphone-outline"} size={22} />
            </IconButton>
          </span>
        </Tooltip>
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={6}
          size="small"
          placeholder={isRecording ? "Grabando nota de voz…" : "Escribe tu consulta… (Ctrl+V, imagen o nota de voz)"}
          value={draft}
          onChange={onDraftChange}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          disabled={sending || isRecording}
        />
        <Button variant="contained" disabled={sending || isRecording || !hasContent} onClick={() => onSend()}>
          {sending ? <CircularProgress size={20} color="inherit" /> : "Enviar"}
        </Button>
      </Box>
      <ImageLightboxDialog open={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </Box>
  );
}

