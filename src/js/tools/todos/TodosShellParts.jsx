import { getMaterialUI, UI, toastSuccess } from "../../core/platform.ts";
import { buildPublicScrumUrl } from "../../api/todosApi.ts";

const { Box, Typography, Button, Stack, Alert, CircularProgress, Tooltip, IconButton } = getMaterialUI();
const { Icon } = UI;

export function TodosLoggedOutShell() {
  return (
    <Box className="paty-todos-shell">
      <Box className="paty-todos-gate">
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 420, p: 2 }}>
          <Icon icon="mdi:view-column" width="2.5em" height="2.5em" style={{ opacity: 0.7 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Scrum</Typography>
          <Alert severity="info" sx={{ width: "100%" }}>
            Inicia sesión con el botón de la barra superior para acceder al tablero Scrum.
          </Alert>
        </Stack>
      </Box>
    </Box>
  );
}

export function TodosBoardToolbar({
  boardTitle, boardMeta, onHome, onNewBoard, onRefresh, onOpenSettings, loadingBoard,
}) {
  const publicSlug = boardMeta?.publicSlug;

  function copyPublicLink() {
    if (!publicSlug) return;
    const url = buildPublicScrumUrl(publicSlug);
    navigator.clipboard.writeText(url);
    toastSuccess("Enlace público copiado");
  }

  return (
    <Box className="paty-todos-toolbar">
      <Tooltip title="Volver a mis tableros">
        <IconButton
          size="small"
          onClick={onHome}
          className="paty-todos-back-btn"
          aria-label="Volver a mis tableros"
        >
          <Icon icon="mdi:arrow-left" size={22} />
        </IconButton>
      </Tooltip>
      <Icon icon="mdi:view-column" size={22} />
      <span className="paty-todos-board-title">{boardTitle || "Tablero SCRUM"}</span>
      <Tooltip title="Detalles del tablero">
        <IconButton
          size="small"
          onClick={onOpenSettings}
          aria-label="Detalles del tablero"
          className="paty-todos-settings-btn"
        >
          <Icon icon="mdi:cog-outline" size={20} />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <Button size="small" variant="outlined" startIcon={<Icon icon="mdi:plus" size={16} />} onClick={onNewBoard}>
        Nuevo
      </Button>
      {publicSlug ? (
        <Tooltip title="Copiar enlace público (solo lectura)">
          <IconButton size="small" onClick={copyPublicLink} aria-label="Copiar enlace público">
            <Icon icon="mdi:link-variant" size={20} />
          </IconButton>
        </Tooltip>
      ) : null}
      <Button
        size="small"
        variant="text"
        onClick={onRefresh}
        disabled={loadingBoard}
        startIcon={loadingBoard ? <CircularProgress size={14} /> : <Icon icon="mdi:refresh" size={16} />}
      >
        Actualizar
      </Button>
    </Box>
  );
}
