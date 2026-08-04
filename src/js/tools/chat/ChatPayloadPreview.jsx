import { getReact, getMaterialUI, CodeMirrorPanel, UI } from "../../core/platform.ts";
import { formatConversacionPostBodyPreview } from "../../api/patyiaChatApi.ts";

const { useMemo } = getReact();
const { Icon } = UI;

export function ChatPayloadPreview({ open, body, endpoint, onClose }) {
  const { Box, Typography, Paper, IconButton, Tooltip } = getMaterialUI();
  const previewJson = useMemo(
    () => formatConversacionPostBodyPreview(body),
    [body],
  );
  const imageCount = Array.isArray(body.imagenes) ? body.imagenes.length : 0;
  const audioCount = Array.isArray(body.audios) ? body.audios.length : 0;

  if (!open) return null;

  return (
    <Paper
      className="paty-chat-payload-preview"
      elevation={8}
      role="region"
      aria-label="Vista previa del body POST"
    >
      <Box className="paty-chat-payload-preview__head">
        <Box className="paty-chat-payload-preview__head-main">
          <Typography variant="caption" className="paty-chat-payload-preview__method">
            POST
          </Typography>
          <Typography variant="caption" component="code" className="paty-chat-payload-preview__path">
            {endpoint}
          </Typography>
          {imageCount > 0 ? (
            <Typography variant="caption" className="paty-chat-payload-preview__meta">
              {imageCount} imagen{imageCount !== 1 ? "es" : ""} · base64
            </Typography>
          ) : null}
          {audioCount > 0 ? (
            <Typography variant="caption" className="paty-chat-payload-preview__meta">
              {audioCount} audio{audioCount !== 1 ? "s" : ""} · base64
            </Typography>
          ) : null}
        </Box>
        <Tooltip title="Cerrar vista previa">
          <IconButton
            size="small"
            className="paty-chat-payload-preview__close"
            aria-label="Cerrar vista previa del body POST"
            onClick={onClose}
          >
            <Icon icon="mdi:close" size={18} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box className="paty-chat-payload-preview__body">
        <CodeMirrorPanel
          value={previewJson}
          json
          readOnly
          lineWrapping
          maxHeight="min(36vh, 280px)"
          minHeight="7rem"
          copyTitle="Copiar JSON del POST"
          enableFullPage
          fullPageTitle="Body POST · /conversacion"
          className="paty-chat-payload-preview__cm"
        />
      </Box>
      <Typography variant="caption" className="paty-chat-payload-preview__foot">
        Vista previa en vivo — el envío incluye base64 completo en <code>imagenes[]</code> y <code>audios[]</code>.
        {" "}ISS acepta imágenes <code>data:image/(png|jpeg|webp|gif);base64,…</code> (máx. 10) y audios <code>data:audio/*;base64,…</code> (máx. 5, transcritos con Whisper).
      </Typography>
    </Paper>
  );
}
