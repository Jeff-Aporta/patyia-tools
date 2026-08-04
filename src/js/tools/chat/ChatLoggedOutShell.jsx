import { getMaterialUI, UI } from "../../core/platform.ts";
import { convLogSurfaceSx } from "../../core/convLog.ts";
import { CHAT_SIDEBAR_W } from "./constants.ts";

const {
  Box, Typography, Stack, Alert,
} = getMaterialUI();
const { Icon } = UI;

export function ChatLoggedOutShell() {
  return (
    <Box
      className="conv-log-shell paty-chat-shell paty-chat-shell--logged-out"
      sx={{ display: "flex", height: "100%", minHeight: 0, flexDirection: { xs: "column", md: "row" } }}
    >
      <Box
        className="conv-log-sidebar paty-chat-sidebar"
        sx={{
          width: { xs: "100%", md: CHAT_SIDEBAR_W },
          flexShrink: 0,
          borderBottom: { xs: 1, md: 0 },
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxHeight: { xs: "42vh", md: "none" },
          opacity: 0.55,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <Stack direction="row" spacing={1} alignItems="center" className="conv-log-sidebar-block" sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
          <Icon icon="mdi:chat-outline" size={20} />
        </Stack>
        <Box className="conv-log-sidebar-block paty-chat-sidebar-meta" sx={{ pt: 0.75, pb: 0.75 }}>
          <Box className="paty-chat-session paty-chat-session--skeleton">
            <Box className="paty-chat-session__avatar"><Icon icon="mdi:account-outline" size={20} /></Box>
            <Box className="paty-chat-session__body">
              <span className="paty-chat-skeleton-line paty-chat-skeleton-line--md" />
              <span className="paty-chat-skeleton-line paty-chat-skeleton-line--sm" />
            </Box>
          </Box>
        </Box>
        <Box className="conv-log-sidebar-block" sx={{ flex: 1, pb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>Conversaciones</Typography>
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} className="paty-chat-skeleton-conv">
              <span className="paty-chat-skeleton-line paty-chat-skeleton-line--xs" />
              <span className="paty-chat-skeleton-line paty-chat-skeleton-line--lg" />
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        <Box sx={convLogSurfaceSx({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, opacity: 0.45, pointerEvents: "none" })} aria-hidden="true">
          <Box sx={{ textAlign: "center", maxWidth: 420, p: 2, borderRadius: 2, border: 1, borderColor: "divider", borderStyle: "dashed" }}>
            <Typography variant="body2" color="text.secondary">Área de conversación</Typography>
          </Box>
        </Box>
        <Box className="paty-chat-gate paty-chat-gate--overlay">
          <Box
            className="paty-chat-gate__inner isa-glass-card"
            sx={{ p: { xs: 2.5, sm: 3 }, display: "flex", flexDirection: "column", gap: 2, alignItems: "stretch", boxSizing: "border-box", maxWidth: 520, width: "100%" }}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Icon icon="mdi:login" width="1.35em" height="1.35em" style={{ opacity: 0.85, flexShrink: 0 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Chat</Typography>
            </Stack>
            <Alert severity="info" sx={{ textAlign: "left", py: 0.75, px: 1.25 }}>
              Inicia sesión con el botón de la barra superior para ver conversaciones.
            </Alert>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
