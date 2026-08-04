import { getReact, getMaterialUI, getIsaSplitView, getGlass } from "../core/platform.ts";
import { UI } from "../core/platform.ts";
import { MetaDialog } from "../ui/shared.jsx";
import { ButtonIconify } from "../ui/shared.jsx";
import { JsonCodeEditor } from "../editors/jsonEditor.jsx";
import { ConvLogThread } from "../ui/ConvLogThread.jsx";
import { convLogNavItems } from "../ui/ConvLogWebView.jsx";
import { logToMensajesVista, parseLogInput } from "../core/convLog.ts";
import * as Api from "../api/apiClient.ts";
import { persistLogMeta, getSnapshot, persistLogSidebarWidth } from "../core/urlState.ts";
import { toastWarning, toastSuccess, toastError } from "../core/platform.ts";
import { formatTs } from "../core/msgDateFormat.ts";
import { mobileDrawerPaperProps } from "../ui/mobileDrawer.ts";

const LOG_SIDEBAR_DEFAULT_W = 400;

function readLogSidebarWidthFromUrl() {
  const w = Number((getSnapshot().log)?.sidebarW);
  return Number.isFinite(w) && w > 0 ? w : null;
}

const { useState, useCallback, useMemo, useEffect } = getReact();
const {
  Box, Typography, TextField, Stack, Alert, Chip, Divider, Tooltip,
  List, ListItemButton, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Drawer, Fab, IconButton, useTheme, useMediaQuery,
} = getMaterialUI();

function MsgNavList({ items, selectedId, onSelect }) {
  const { Icon } = UI;
  if (!items.length) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ py: 1, display: "block" }}>
        Sin mensajes en el hilo.
      </Typography>
    );
  }
  return (
    <List dense disablePadding sx={{ py: 0.5 }}>
      {items.map((it) => (
        <Tooltip key={it.id} title={it.secondary} placement="right" enterDelay={400}>
          <ListItemButton
            selected={selectedId === it.id}
            onClick={() => onSelect(it.id)}
            sx={{
              py: 0.5,
              pl: 1.5,
              pr: 1,
              minHeight: 36,
              "&.Mui-selected": { bgcolor: "action.selected" },
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flexShrink: 0,
                mr: 1,
                bgcolor: it.accent,
                boxShadow: `0 0 0 2px ${it.accent}33`,
              }}
            />
            <Icon icon={it.icon} size={15} style={{ opacity: 0.75, flexShrink: 0, marginRight: 6 }} />
            <ListItemText
              primary={it.label}
              secondary={it.secondary}
              primaryTypographyProps={{ variant: "body2", noWrap: true, sx: { fontWeight: 600 } }}
              secondaryTypographyProps={{ variant: "caption", noWrap: true }}
            />
          </ListItemButton>
        </Tooltip>
      ))}
    </List>
  );
}

function ResumenDialog({ open, onClose, logInfo, navItems, selectedId, onSelectMsg }) {
  const resumen = logInfo?.resumen;
  const tk = resumen?.tokens;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Resumen
        {logInfo?.iconversacion ? ` · conv #${logInfo.iconversacion}` : ""}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1.5 }}>
        {resumen && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Métricas
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1.5 }}>
              {resumen.totalMensajes != null && (
                <Chip size="small" variant="outlined" label={`${resumen.totalMensajes} mensajes`} />
              )}
              {resumen.totalTurnos != null && (
                <Chip size="small" variant="outlined" label={`${resumen.totalTurnos} turnos`} />
              )}
              {resumen.totalOperativas != null && (
                <Chip size="small" variant="outlined" label={`${resumen.totalOperativas} operativas`} />
              )}
              {tk?.total != null && (
                <Chip size="small" variant="outlined" color="secondary" label={`${tk.total} tokens`} />
              )}
            </Stack>
            {(resumen.ultimoModelo || resumen.ultimoPromptId || resumen.ultimaItdconsulta || resumen.ultimoNombreUsuario) && (
              <Stack spacing={0.75} sx={{ typography: "body2", color: "text.secondary" }}>
                {resumen.ultimoNombreUsuario && (
                  <Typography variant="body2"><strong>Usuario:</strong> {resumen.ultimoNombreUsuario}</Typography>
                )}
                {resumen.ultimaItdconsulta && (
                  <Typography variant="body2"><strong>itdconsulta:</strong> {resumen.ultimaItdconsulta}</Typography>
                )}
                {resumen.ultimoModelo && (
                  <Typography variant="body2"><strong>Modelo:</strong> {resumen.ultimoModelo}</Typography>
                )}
                {resumen.ultimoPromptId && (
                  <Typography variant="body2" noWrap title={resumen.ultimoPromptId}>
                    <strong>Prompt:</strong> {resumen.ultimoPromptId}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
        )}
        {!resumen && logInfo?.iconversacion && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sin bloque resumen en el log; usa el índice para saltar a un mensaje.
          </Typography>
        )}
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          Índice ({navItems.length})
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Vista compacta; el detalle completo está en el panel derecho.
        </Typography>
        <MsgNavList
          items={navItems}
          selectedId={selectedId}
          onSelect={(id) => {
            onSelectMsg(id);
            onClose();
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

function LogEntradaPanel({
  drawerMode = false,
  onClose,
  convId,
  loading,
  jsonInput,
  error,
  canClear,
  focusTarget = null,
  onFocusApplied,
  onConvIdChange,
  onConvIdKeyDown,
  recuperarPorId,
  limpiar,
  onJsonInputChange,
}) {
  const { Icon } = UI;
  const { GlassPanel, NEON_COLORS } = getGlass();

  useEffect(() => {
    if (!focusTarget) return undefined;
    const timer = window.setTimeout(() => {
      if (focusTarget === "convId") {
        const input = document.querySelector(".conv-log-entrada .conv-log-action-grp__input input");
        input?.focus();
        input?.select?.();
      } else if (focusTarget === "json") {
        const cmEl = document.querySelector(".conv-log-entrada .log-json-editor-wrap .CodeMirror");
        if (cmEl?.CodeMirror) cmEl.CodeMirror.focus();
        else cmEl?.querySelector("textarea")?.focus();
      }
      onFocusApplied?.();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusTarget, onFocusApplied]);

  return (
    <Box
      className="conv-log-entrada"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: drawerMode ? "100%" : "auto",
        flex: drawerMode ? 1 : undefined,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {drawerMode ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
          className="conv-log-sidebar-block conv-log-entrada-drawer-head"
          sx={{ flexShrink: 0 }}
        >
          {onClose ? (
            <Tooltip title="Cerrar panel">
              <IconButton size="small" onClick={onClose} aria-label="Cerrar panel">
                <Icon icon="mdi:close" size={18} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      ) : null}

      <Box className="conv-log-sidebar-block conv-log-entrada-actions" sx={{ flexShrink: 0 }}>
        <GlassPanel
          tone="blue"
          className="conv-log-action-grp"
          role="group"
          aria-label="Acciones de entrada de log"
          sx={{ p: 0.65, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 0.75, width: "100%", flexWrap: "nowrap" }}
        >
          <TextField
            className="conv-log-action-grp__input"
            size="small"
            margin="none"
            type="number"
            hiddenLabel
            placeholder="iconversacion"
            aria-label="iconversacion"
            value={convId}
            disabled={loading}
            onChange={onConvIdChange}
            onKeyDown={onConvIdKeyDown}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ m: 0, "& .MuiOutlinedInput-root": { height: 32 } }}
          />
          <Box className="conv-log-action-grp__actions">
            <Tooltip title="Recuperar por ID (Enter)" arrow>
              <span>
                <ButtonIconify
                  icon="mdi:cloud-download-outline"
                  title="Recuperar por ID"
                  onClick={recuperarPorId}
                  disabled={!String(convId ?? "").trim()}
                  busy={loading}
                />
              </span>
            </Tooltip>
            <Tooltip title="Limpiar" arrow>
              <span>
                <ButtonIconify
                  icon="mdi:delete-outline"
                  title="Limpiar"
                  onClick={limpiar}
                  disabled={!canClear}
                />
              </span>
            </Tooltip>
          </Box>
        </GlassPanel>
        {error ? <Alert severity="error" className="conv-log-entrada-error">{error}</Alert> : null}
      </Box>

      <Box
        className="conv-log-sidebar-block conv-log-json-block"
        sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <Box className="conv-log-json-head isa-neon-section-label" aria-hidden>
          <Icon icon="mdi:code-json" size={15} />
          <Typography component="span" variant="caption" className="conv-log-json-head__label">
            JSON del log
          </Typography>
        </Box>
        <GlassPanel
          tone="purple"
          accent={NEON_COLORS.purple}
          className="log-json-editor-wrap"
          sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", p: 0 }}
        >
          <JsonCodeEditor
            value={jsonInput}
            onChange={onJsonInputChange}
            placeholder='{ "iconversacion": 1234, "mensajes": [ ... ] }'
          />
        </GlassPanel>
      </Box>
    </Box>
  );
}

export function LogViewer({ bootLog = {} }) {
  const IsaSplitView = getIsaSplitView();
  const { Icon } = UI;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [entradaOpen, setEntradaOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState(bootLog.jsonInput || "");
  const [convId, setConvId] = useState(bootLog.convId || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logInfo, setLogInfo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaMsg, setMetaMsg] = useState(null);
  const [resumenOpen, setResumenOpen] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [entradaFocus, setEntradaFocus] = useState(null);

  const navItems = useMemo(() => convLogNavItems(mensajes), [mensajes]);

  const aplicarLog = useCallback((log, { silent = false } = {}) => {
    const vista = logToMensajesVista(log);
    setLogInfo(log);
    setMensajes(vista);
    setSelectedMsgId(vista[0]?.idMsg ?? null);
    if (!vista.length) {
      const msg = "El log no tiene mensajes.";
      setError(msg);
      if (!silent) toastWarning(msg);
    } else {
      setError("");
      if (!silent) {
        toastSuccess(`${vista.length} mensaje(s) cargado(s)`);
        setEntradaOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!bootLog.jsonInput?.trim()) return;
    try {
      aplicarLog(parseLogInput(bootLog.jsonInput), { silent: true });
    } catch (_) { /* ignore restore errors */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => persistLogMeta(convId), 800);
    return () => clearTimeout(t);
  }, [convId]);

  const resumenChips = useMemo(() => {
    if (!logInfo) return [];
    const chips = [];
    if (logInfo.iconversacion) chips.push({ label: `conv #${logInfo.iconversacion}`, color: "primary" });
    if (logInfo.resumen?.totalMensajes != null) chips.push({ label: `${logInfo.resumen.totalMensajes} mensajes`, color: "default" });
    if (logInfo.resumen?.tokens?.total) chips.push({ label: `${logInfo.resumen.tokens.total} tokens`, color: "secondary" });
    if (mensajes.length) chips.push({ label: `${mensajes.length} en hilo`, color: "info" });
    return chips;
  }, [logInfo, mensajes.length]);

  const canClear = useMemo(
    () =>
      Boolean(
        String(convId ?? "").trim()
        || jsonInput.trim()
        || logInfo
        || mensajes.length
        || error,
      ),
    [convId, jsonInput, logInfo, mensajes.length, error],
  );

  /** Auto-parse del JSON pegado: 2s tras la última edición (sin botón manual). */
  useEffect(() => {
    if (!jsonInput.trim()) return undefined;
    const t = window.setTimeout(() => {
      try {
        aplicarLog(parseLogInput(jsonInput), { silent: true });
      } catch (err) {
        setLogInfo(null);
        setMensajes([]);
        setSelectedMsgId(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    }, 2000);
    return () => window.clearTimeout(t);
  }, [jsonInput, aplicarLog]);

  const recuperarPorId = useCallback(async ({ silent = false } = {}) => {
    if (!String(convId ?? "").trim()) return;
    setError("");
    setLoading(true);
    try {
      const log = await Api.fetchConvLogForQa(convId);
      setJsonInput(JSON.stringify(log, null, 2));
      aplicarLog(log, { silent });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const denied = {
        error: true,
        acceso: "denegado",
        iconversacion: Number(convId) || null,
        mensaje: msg,
      };
      setJsonInput(JSON.stringify(denied, null, 2));
      setLogInfo(null);
      setMensajes([]);
      setSelectedMsgId(null);
      setError(msg);
      if (!silent) toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [convId, aplicarLog]);

  /** Solo al montar: restaurar convId de la URL. No auto-consultar mientras el usuario escribe. */
  useEffect(() => {
    if (bootLog.jsonInput?.trim()) return;
    const id = String(bootLog.convId ?? "").trim();
    if (!id) return;
    recuperarPorId({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + bootLog.convId únicamente
  }, []);

  const onConvIdKeyDown = useCallback((e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!String(convId ?? "").trim() || loading) return;
    recuperarPorId();
  }, [convId, loading, recuperarPorId]);

  const limpiar = useCallback(() => {
    setJsonInput("");
    setConvId("");
    setLogInfo(null);
    setMensajes([]);
    setSelectedMsgId(null);
    setError("");
  }, []);

  const scrollToMsg = useCallback((id) => {
    setSelectedMsgId(id);
    const el = document.getElementById(`conv-msg-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const onMeta = useCallback((msg) => {
    setMetaMsg(msg);
    setMetaOpen(true);
  }, []);

  const entradaProps = {
    convId,
    loading,
    jsonInput,
    error,
    canClear,
    focusTarget: entradaFocus,
    onFocusApplied: () => setEntradaFocus(null),
    onConvIdChange: (e) => setConvId(e.target.value),
    onConvIdKeyDown,
    recuperarPorId,
    limpiar,
    onJsonInputChange: setJsonInput,
  };

  const mainPanel = (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {isMobile ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              px: 1,
              py: 0.5,
              borderBottom: 1,
              borderColor: "divider",
              flexShrink: 0,
              bgcolor: "background.paper",
            }}
          >
            <Tooltip title="Entrada de log" arrow>
              <IconButton size="small" onClick={() => setEntradaOpen(true)} aria-label="Abrir entrada de log">
                <Icon icon="mdi:database-import-outline" size={20} />
              </IconButton>
            </Tooltip>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }} noWrap>
              Hilo recuperado
            </Typography>
          </Stack>
        ) : null}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          className="conv-log-thread-head"
          sx={{ px: { xs: 1, md: 2 }, py: 1, flexShrink: 0 }}
        >
          <Chip
            className="conv-log-thread-title-chip isa-neon-glass-chip"
            size="small"
            label={
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <Icon icon="mdi:clipboard-text-clock-outline" size={16} />
                Hilo recuperado
              </Box>
            }
          />
          {resumenChips.map((c) => (
            <Chip key={c.label} size="small" label={c.label} color={c.color} variant="outlined" />
          ))}
          {mensajes.length > 0 && (
            <Tooltip title="Resumen e índice compacto de mensajes" arrow>
              <span>
                <ButtonIconify
                  variant="primary"
                  icon="mdi:text-box-outline"
                  title="Ver resumen"
                  onClick={() => setResumenOpen(true)}
                />
              </span>
            </Tooltip>
          )}
          <Box sx={{ flex: 1 }} />
          {logInfo?.createdAt && (
            <Typography variant="caption" color="text.secondary" title={String(logInfo.createdAt)}>
              {formatTs(logInfo.createdAt)}
            </Typography>
          )}
        </Stack>

        <ConvLogThread
          mensajes={mensajes}
          onMeta={onMeta}
          showUsageStats
          threadKey={convId || "log-paste"}
          emptyHint={error || "Recupera por ID o pega un log para ver el hilo."}
        />
    </Box>
  );

  return (
    <Box
      className="conv-log-shell"
      sx={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column", position: "relative" }}
    >
      {isMobile ? (
        <>
          <Drawer
            anchor="left"
            open={entradaOpen}
            onClose={() => setEntradaOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={mobileDrawerPaperProps("paty-mobile-sidebar-drawer")}
          >
            <LogEntradaPanel {...entradaProps} drawerMode onClose={() => setEntradaOpen(false)} />
          </Drawer>
          {mainPanel}
        </>
      ) : (
        <IsaSplitView
          className="conv-log-shell-split"
          sx={{ flex: 1, minHeight: 0 }}
          panelClassName="conv-log-sidebar"
          defaultWidth={LOG_SIDEBAR_DEFAULT_W}
          maxWidth={560}
          readPersistedWidth={readLogSidebarWidthFromUrl}
          writePersistedWidth={persistLogSidebarWidth}
          panelTitle="Entrada"
          panelIcon="mdi:database-import-outline"
          UI={UI}
          collapsedRail={({ expand }) => (
            <Box className="conv-log-collapsed-rail">
              <Tooltip title="Buscar por iconversacion" placement="right">
                <IconButton
                  size="small"
                  className="isa-neon-rail-btn isa-neon-rail-btn--search"
                  aria-label="Buscar por iconversacion"
                  onClick={() => {
                    setEntradaFocus("convId");
                    expand();
                  }}
                >
                  <Icon icon="mdi:magnify" size={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Ver o editar JSON del log" placement="right">
                <IconButton
                  size="small"
                  className="isa-neon-rail-btn isa-neon-rail-btn--json"
                  aria-label="Ver o editar JSON del log"
                  onClick={() => {
                    setEntradaFocus("json");
                    expand();
                  }}
                >
                  <Icon icon="mdi:code-braces" size={20} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          panel={<LogEntradaPanel {...entradaProps} />}
        >
          {mainPanel}
        </IsaSplitView>
      )}
      {isMobile ? (
        <Fab
          color="primary"
          size="medium"
          className="paty-mobile-sidebar-fab paty-mobile-sidebar-fab--log"
          aria-label="Abrir entrada de log"
          onClick={() => setEntradaOpen(true)}
          sx={{
            position: "absolute",
            left: 12,
            zIndex: 6,
            display: entradaOpen ? "none" : "flex",
          }}
        >
          <Icon icon="mdi:database-import-outline" size={22} />
        </Fab>
      ) : null}

      <MetaDialog
        open={metaOpen}
        onClose={() => setMetaOpen(false)}
        meta={metaMsg?.meta}
        usageStats={metaMsg?.usageStats ?? null}
        title={metaMsg ? `Trazabilidad · ${metaMsg.rol}` : ""}
        isUserMessage={Boolean(metaMsg?.esUsuario)}
        userContent={metaMsg?.contenido ?? ""}
        imagenes={metaMsg?.imagenes ?? null}
      />
      <ResumenDialog
        open={resumenOpen}
        onClose={() => setResumenOpen(false)}
        logInfo={logInfo}
        navItems={navItems}
        selectedId={selectedMsgId}
        onSelectMsg={scrollToMsg}
      />
    </Box>
  );
}
