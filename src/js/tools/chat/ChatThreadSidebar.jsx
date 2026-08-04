import { getMaterialUI, UI } from "../../core/platform.ts";
import { convBelongsToJwt } from "../../core/patyia-jwt.ts";
import { CHAT_SIDEBAR_W, CONV_LIST_PAGE_SIZE_DEFAULT, CONV_LIST_PAGE_SIZE_OPTIONS, CHAT_MODE_LIBRE, CHAT_MODE_PATYIA, CHAT_PROVIDER_OPENAI, CHAT_PROVIDER_MINIMAX, isLibreChatMode, isMinimaxChatProvider } from "./constants.ts";
import { formatTs } from "./mensajesModel.ts";
import { ChatSessionPanel } from "./ChatSessionPanel.jsx";
import { ConvSearchAutocomplete } from "./ConvSearchAutocomplete.jsx";
import { resolveOwnerDisplayName } from "./auditScope.ts";

const {
  Box, Typography, Button, IconButton, List, ListItemButton, ListItemText,
  CircularProgress, Tooltip, Stack, Divider, Select, MenuItem, FormControl,
} = getMaterialUI();
const { Icon } = UI;

function MessageSourceSwitch({ messageSource, onChange }) {
  const isProd = messageSource === "prod";
  const title = isProd ? "Modo producción (sin meta)" : "Modo logs (con meta)";
  const hint = isProd ? "Clic para ver logs" : "Clic para ver producción";
  const icon = isProd ? "mdi:earth" : "mdi:code-json";
  return (
    <Tooltip title={`${title} · ${hint}`}>
      <IconButton color="inherit" size="small" onClick={() => onChange?.(isProd ? "logs" : "prod")} aria-label={title} aria-pressed={!isProd}>
        <Icon icon={icon} size={18} />
      </IconButton>
    </Tooltip>
  );
}

function ChatModeSwitch({ mode, onChange }) {
  const isLibre = isLibreChatMode(mode);
  const title = isLibre ? "Libre" : "Patyia";
  const icon = isLibre ? "game-icons:freedom-dove" : "game-icons:bird-cage";
  return (
    <Tooltip title={title}>
      <IconButton
        color="inherit"
        size="small"
        className={`paty-chat-mode-btn${isLibre ? " paty-chat-mode-btn--libre" : ""}`}
        onClick={() => onChange?.(isLibre ? CHAT_MODE_PATYIA : CHAT_MODE_LIBRE)}
        aria-label={title}
        aria-pressed={isLibre}
      >
        <Icon icon={icon} size={18} />
      </IconButton>
    </Tooltip>
  );
}

export function LlmProviderSwitch({ provider, onChange }) {
  const isMm = isMinimaxChatProvider(provider);
  const title = isMm ? "MiniMax M3" : "OpenAI";
  const hint = isMm ? "Clic → OpenAI (default)" : "Clic → MiniMax M3 (experimental)";
  // Icono estable: mdi:openai a menudo no carga.
  const icon = isMm ? "mdi:creation" : "simple-icons:openai";
  return (
    <Tooltip title={`${title} · ${hint}`}>
      <Button
        size="small"
        variant="text"
        color="inherit"
        className={`paty-chat-provider-btn${isMm ? " paty-chat-provider-btn--minimax" : ""}`}
        onClick={() => onChange?.(isMm ? CHAT_PROVIDER_OPENAI : CHAT_PROVIDER_MINIMAX)}
        aria-label={title}
        aria-pressed={isMm}
        startIcon={<Icon icon={icon} size={16} />}
        sx={{ textTransform: "none", minWidth: 0, px: 0.75, py: 0.25, fontWeight: 600, fontSize: "0.75rem", lineHeight: 1.2, bgcolor: "transparent", boxShadow: "none", "&:hover": { bgcolor: "transparent" } }}
      >
        {isMm ? "MiniMax" : "OpenAI"}
      </Button>
    </Tooltip>
  );
}

/** Acciones del header (split IsaSplitView o drawer). */
export function ChatSidebarHeaderActions({
  onClose,
  messageSource = "logs",
  mode = CHAT_MODE_PATYIA,
  llmProvider = CHAT_PROVIDER_OPENAI,
  onMessageSourceChange,
  onChatModeChange,
  onLlmProviderChange,
}) {
  return (
    <Stack
      direction="row"
      spacing={0.35}
      alignItems="center"
      className="paty-chat-sidebar-head-actions"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {onClose ? (
        <Tooltip title="Cerrar panel">
          <IconButton size="small" onClick={onClose} aria-label="Cerrar panel">
            <Icon icon="mdi:close" size={18} />
          </IconButton>
        </Tooltip>
      ) : null}
      {onMessageSourceChange ? <MessageSourceSwitch messageSource={messageSource} onChange={onMessageSourceChange} /> : null}
      {onChatModeChange ? <ChatModeSwitch mode={mode} onChange={onChatModeChange} /> : null}
      {onLlmProviderChange ? <LlmProviderSwitch provider={llmProvider} onChange={onLlmProviderChange} /> : null}
    </Stack>
  );
}

export function ChatNewConversationButton({ canSend, onNewChat, onClose, compact = false }) {
  const handleClick = () => { onNewChat?.(); onClose?.(); };
  return (
    <Tooltip title="Nueva conversación">
      <span>
        {compact ? (
          <IconButton size="small" color="primary" disabled={!canSend} onClick={handleClick} aria-label="Nueva conversación">
            <Icon icon="mdi:plus" size={20} />
          </IconButton>
        ) : (
          <Button variant="contained" size="small" disabled={!canSend} startIcon={<Icon icon="mdi:plus" size={16} />} onClick={handleClick}>
            Nueva
          </Button>
        )}
      </span>
    </Tooltip>
  );
}

function ChatSidebarBody({
  jwt,
  displayScope,
  sessionUser,
  canSend,
  canAuditChat = false,
  jwtLoading,
  needsJwt,
  listScope,
  sessionScopeLoading,
  viewingAuditOther,
  convListOwnerLabel,
  convListHeader,
  loadingList,
  rows,
  selectedId,
  convListMeta,
  convListPage,
  convListPageSize,
  convListSearch,
  onConvListSearchChange,
  onOpenAudit,
  onNewChat,
  onOpenConv,
  onDelete,
  onConvListPageChange,
  onConvListPageSizeChange,
  onClose,
}) {
  const handleOpenConv = (id) => { onOpenConv(id); onClose?.(); };

  return (
    <>
      <Box className="conv-log-sidebar-block paty-chat-sidebar-meta" sx={{ pt: 0.75, pb: 0.75, flexShrink: 0 }}>
        <ChatSessionPanel
          claims={jwt?.claims ?? null}
          displayScope={displayScope}
          sessionUser={sessionUser}
          ownerDisplayName={resolveOwnerDisplayName(jwt, displayScope)}
          canSend={canSend}
          jwtLoading={jwtLoading}
          canAudit={canAuditChat}
          onOpenAudit={onOpenAudit}
        />
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box className="conv-log-sidebar-block paty-chat-sidebar-list-head" sx={{ flexShrink: 0, pb: 0.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={0.75} sx={{ mb: 0.5, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
            Conversaciones
            {(jwt?.token || listScope) && (convListHeader || convListOwnerLabel) ? (
              <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.25 }}>
                <Typography variant="caption" sx={{ fontWeight: 500, color: "text.primary" }}>
                  {convListHeader || convListOwnerLabel}
                </Typography>
              </Stack>
            ) : null}
            {needsJwt ? (
              <Typography component="span" variant="caption" sx={{ display: "block", color: "info.main", mt: 0.25 }}>
                {listScope?.nombre
                  ? `${listScope.nombre} · modo lectura`
                  : sessionScopeLoading
                    ? "Buscando tus conversaciones…"
                    : "Sin contacto identificado · filtra por usuario"}
              </Typography>
            ) : null}
          </Typography>
          <Box sx={{ flexShrink: 0, pt: 0.1 }}>
            <ChatNewConversationButton canSend={canSend} onNewChat={onNewChat} onClose={onClose} />
          </Box>
        </Stack>
        <ConvSearchAutocomplete
          rows={rows}
          loading={loadingList}
          search={convListSearch}
          onSearchChange={onConvListSearchChange}
          selectedId={selectedId}
          onSelectConv={handleOpenConv}
          disabled={needsJwt && !listScope?.icontacto}
        />
      </Box>

      <Box
        className="conv-log-sidebar-block paty-chat-sidebar-list-scroll"
        sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <Box className="paty-chat-sidebar-list-inner" sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <List dense disablePadding>
            {loadingList && !rows.length && (
              <Box sx={{ py: 2, textAlign: "center" }}><CircularProgress size={22} /></Box>
            )}
            {rows.map((r) => {
              const convTitle = r.titulo || "Sin título";
              const convTip = `${r.iconversacion} · ${convTitle}`;
              return (
                <ListItemButton
                  key={r.iconversacion}
                  className="paty-chat-conv-item"
                  selected={Number(selectedId) > 0 && Number(selectedId) === Number(r.iconversacion)}
                  onClick={() => handleOpenConv(r.iconversacion)}
                  title={convTip}
                  aria-label={convTip}
                  sx={{
                    py: 0.5,
                    px: 0,
                    minHeight: 36,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <ListItemText
                    sx={{ flex: 1, minWidth: 0, m: 0 }}
                    primary={(
                      <Stack direction="row" spacing={0.5} alignItems="center" className="paty-chat-conv-item__title" sx={{ minWidth: 0, pointerEvents: "none" }}>
                        <span className="paty-chat-conv-id-badge">
                          {r.iconversacion}
                        </span>
                        <Typography component="span" variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0, flex: 1 }}>
                          {convTitle}
                        </Typography>
                      </Stack>
                    )}
                    secondary={(
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        className="paty-chat-conv-item__meta"
                        sx={{ pointerEvents: "none", display: "block", lineHeight: 1.3, opacity: 0.5 }}
                      >
                        {`${formatTs(r.fhultact)} · ${r.qmensajes ?? 0} msgs`}
                      </Typography>
                    )}
                    slotProps={{
                      primary: { sx: { pointerEvents: "none", mb: 0.2 } },
                      secondary: { sx: { pointerEvents: "none", m: 0, opacity: 0.5 } },
                    }}
                  />
                  {canSend && convBelongsToJwt(r, jwt.claims) ? (
                    <IconButton size="small" color="error" aria-label="Eliminar" className="paty-chat-conv-item__delete" onClick={(e) => { e.stopPropagation(); onDelete(r.iconversacion); }} sx={{ flexShrink: 0, mr: 0 }}>
                      <Icon icon="mdi:delete-outline" size={16} />
                    </IconButton>
                  ) : null}
                </ListItemButton>
              );
            })}
          </List>
        </Box>
        {convListMeta ? (
          <Box className="conv-log-sidebar-block paty-chat-sidebar-list-foot paty-chat-sidebar-list-foot--sticky" sx={{ flexShrink: 0, pt: 0.5, pb: 0.5, px: 0 }}>
            <Box className="paty-chat-conv-pager" role="navigation" aria-label="Paginación de conversaciones">
              <Typography
                component="span"
                variant="caption"
                className="paty-chat-conv-pager__meta"
                aria-label={`Página ${convListMeta.page} de ${Math.max(convListMeta.pages, 1)}`}
              >
                {convListMeta.page}/{Math.max(convListMeta.pages, 1)}
              </Typography>
              <Stack direction="row" spacing={0.35} alignItems="center" className="paty-chat-conv-pager__controls">
                {onConvListPageSizeChange ? (
                  <Tooltip
                    title="Conversaciones por página"
                    slotProps={{ popper: { sx: { pointerEvents: "none" } } }}
                  >
                    <FormControl className="paty-chat-conv-pager__size" sx={{ m: 0, minWidth: 44 }}>
                      <Select
                        size="small"
                        value={convListPageSize}
                        onChange={(e) => onConvListPageSizeChange(Number(e.target.value))}
                        aria-label="Conversaciones por página"
                        disabled={loadingList}
                        variant="outlined"
                        MenuProps={{ PaperProps: { sx: { "& .MuiMenuItem-root": { minHeight: 24, py: 0.2, fontSize: "0.68rem" } } } }}
                      >
                        {CONV_LIST_PAGE_SIZE_OPTIONS.map((n) => (
                          <MenuItem key={n} value={n}>{n}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Tooltip>
                ) : null}
                {convListMeta.pages > 1 ? (
                  <Stack direction="row" spacing={0.5} className="paty-chat-conv-pager__nav">
                    <Tooltip title="Página anterior">
                      <span>
                        <IconButton
                          size="small"
                          className="paty-chat-conv-pager__btn"
                          aria-label="Página anterior"
                          disabled={loadingList || convListPage <= 1}
                          onClick={() => onConvListPageChange((p) => Math.max(1, p - 1))}
                        >
                          <Icon icon="mdi:chevron-left" size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Página siguiente">
                      <span>
                        <IconButton
                          size="small"
                          className="paty-chat-conv-pager__btn"
                          aria-label="Página siguiente"
                          disabled={loadingList || convListPage >= convListMeta.pages}
                          onClick={() => onConvListPageChange((p) => p + 1)}
                        >
                          <Icon icon="mdi:chevron-right" size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          </Box>
        ) : null}
      </Box>
    </>
  );
}

export function ChatThreadSidebar({
  jwt,
  displayScope,
  sessionUser,
  canInteract,
  viewOnly,
  jwtLoading,
  canSend,
  canAuditChat = false,
  needsJwt,
  listScope,
  sessionScopeLoading,
  viewingAuditOther,
  auditScope,
  convListOwnerLabel,
  convListHeader,
  loadingList,
  rows,
  selectedId,
  convListMeta,
  convListPage,
  convListPageSize = CONV_LIST_PAGE_SIZE_DEFAULT,
  convListSearch = "",
  onConvListSearchChange,
  messageSource = "logs",
  mode = CHAT_MODE_PATYIA,
  llmProvider = CHAT_PROVIDER_OPENAI,
  onMessageSourceChange,
  onChatModeChange,
  onLlmProviderChange,
  onOpenJwt,
  onOpenAudit,
  onNewChat,
  onOpenConv,
  onDelete,
  onConvListPageChange,
  onConvListPageSizeChange,
  drawerMode = false,
  splitMode = false,
  onClose,
}) {
  const bodyProps = {
    jwt,
    displayScope,
    sessionUser,
    canSend,
    canAuditChat,
    jwtLoading,
    needsJwt,
    listScope,
    sessionScopeLoading,
    viewingAuditOther,
    convListOwnerLabel,
    convListHeader,
    loadingList,
    rows,
    selectedId,
    convListMeta,
    convListPage,
    convListPageSize,
    convListSearch,
    onConvListSearchChange,
    onOpenAudit,
    onNewChat,
    onOpenConv,
    onDelete,
    onConvListPageChange,
    onConvListPageSizeChange,
    onClose,
  };

  if (splitMode) {
    return (
      <Box
        className="paty-chat-sidebar-inner"
        sx={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "hidden" }}
      >
        <ChatSidebarBody {...bodyProps} />
      </Box>
    );
  }

  return (
    <Box
      className="conv-log-sidebar paty-chat-sidebar"
      sx={{
        position: "relative",
        width: drawerMode ? "100%" : { xs: "100%", md: CHAT_SIDEBAR_W },
        flexShrink: 0,
        borderRight: drawerMode ? 0 : { md: 0 },
        borderBottom: drawerMode ? 0 : { xs: 1, md: 0 },
        borderColor: "divider",
        bgcolor: "background.paper",
        display: drawerMode ? "flex" : { xs: "none", md: "flex" },
        flexDirection: "column",
        minHeight: 0,
        height: drawerMode ? "100%" : "auto",
        maxHeight: drawerMode ? "100%" : { xs: "42vh", md: "none" },
        overflow: drawerMode ? "hidden" : "visible",
        boxSizing: "border-box",
      }}
    >
      {(onClose || onMessageSourceChange || onChatModeChange || onLlmProviderChange) ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
          className="conv-log-sidebar-block"
          sx={{ py: 0.5, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
        >
          <ChatSidebarHeaderActions
            onClose={onClose}
            messageSource={messageSource}
            mode={mode}
            llmProvider={llmProvider}
            onMessageSourceChange={onMessageSourceChange}
            onChatModeChange={onChatModeChange}
            onLlmProviderChange={onLlmProviderChange}
          />
        </Stack>
      ) : null}
      <ChatSidebarBody {...bodyProps} />
    </Box>
  );
}
