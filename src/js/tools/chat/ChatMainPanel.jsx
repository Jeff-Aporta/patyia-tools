import { getMaterialUI, UI } from "../../core/platform.ts";
import { convLogSurfaceSx } from "../../core/convLog.ts";
import { ConvLogThread } from "../../ui/ConvLogThread.jsx";
import { ChatComposer } from "./ChatComposer.jsx";
import { ChatSidebarHeaderActions, LlmProviderSwitch } from "./ChatThreadSidebar.jsx";

const {
  Box, Typography, Button, IconButton, Tooltip, Alert, Stack,
} = getMaterialUI();
const { Icon } = UI;

function RefreshConvButton({ onClick, busy = false }) {
  return (
    <Tooltip title="Actualizar conversación" arrow>
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={busy}
          aria-label="Actualizar"
          title="Actualizar"
          className={busy ? "paty-chat-refresh-spin" : undefined}
        >
          <Icon icon={busy ? "mdi:loading" : "mdi:refresh"} size={20} />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function ChatMainPanel({ jwt, needsJwt, viewingAuditOther, selectedId, detail, canSend, loadingThread, refreshingThread = false, sending, showThread, logError, displayMensajes, chatUserDisplayName, chatUserNick, ratingMsgId, threadScrollRef, onThreadScroll, onOpenJwt, onClearAuditFilter, onRefreshConv, draft, images, audios, isRecording, payloadPreviewOpen, postBodyPreview, inputRef, attachInputRef, onDraftChange, onPaste, onSend, onTogglePayloadPreview, onAttachClick, onAttachChange, onToggleVoiceRecord, onRemoveImage, onRemoveAudio, onMeta, onRateMessage, onOpenSidebar, messageSource = "logs", mode, llmProvider = "openai", onMessageSourceChange, onChatModeChange, onLlmProviderChange, onContapymeLoginDone = null }) {
  const isProdView = messageSource === "prod";
  const hasThread = Boolean(selectedId || detail);
  const providerBtn = onLlmProviderChange
    ? <LlmProviderSwitch provider={llmProvider} onChange={onLlmProviderChange} />
    : null;
  const headerActions = (
    <ChatSidebarHeaderActions
      messageSource={messageSource}
      mode={mode}
      onMessageSourceChange={onMessageSourceChange}
      onChatModeChange={onChatModeChange}
    />
  );
  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {onOpenSidebar ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          className="paty-chat-main-toolbar"
          sx={{ px: 1, py: 0.5, minHeight: 40, flexShrink: 0 }}
        >
          <Tooltip title="Conversaciones" arrow>
            <IconButton size="small" onClick={onOpenSidebar} aria-label="Abrir conversaciones">
              <Icon icon="mdi:menu-open" size={20} />
            </IconButton>
          </Tooltip>
          {providerBtn}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
            Conversaciones
          </Typography>
          {headerActions}
          {hasThread ? <RefreshConvButton onClick={onRefreshConv} busy={refreshingThread} /> : null}
        </Stack>
      ) : (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          className="paty-chat-main-toolbar paty-chat-main-toolbar--desktop"
          sx={{ px: 2, py: 0.75, flexShrink: 0 }}
        >
          {providerBtn}
          <Box sx={{ flex: 1 }} />
          {headerActions}
          {hasThread ? <RefreshConvButton onClick={onRefreshConv} busy={refreshingThread} /> : null}
        </Stack>
      )}
      {needsJwt && (
        <Alert
          severity="info"
          sx={{ mx: 2, mt: 1, flexShrink: 0 }}
          action={(
            <Button color="inherit" size="small" onClick={onOpenJwt}>
              Configurar JWT
            </Button>
          )}
        >
          Modo lectura — puedes explorar conversaciones. Para enviar mensajes inicia sesión
          con tu cuenta ContaPyme o configura un JWT de portal (válido en staging y producción).
        </Alert>
      )}
      {viewingAuditOther && (
        <Alert severity="info" sx={{ mx: 2, mt: 1, flexShrink: 0 }} action={(
          <IconButton
            color="inherit"
            size="small"
            aria-label={jwt?.claims?.itercero ? "Volver a mi JWT" : "Ver recientes"}
            onClick={onClearAuditFilter}
          >
            <Icon icon="mdi:close" size={18} />
          </IconButton>
        )}>
          Viendo conversaciones de otro usuario — lectura.
        </Alert>
      )}

      {!showThread ? (
        <Box
          className="paty-chat-thread-surface"
          sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, ...convLogSurfaceSx({ flex: 1 }) }}
        >
          <Box sx={{ textAlign: "center", maxWidth: 420, p: 2, borderRadius: 2, border: 1, borderColor: "divider", borderStyle: "dashed" }}>
            <Typography variant="body1">
              {canSend
                ? "Escribe un mensaje abajo para iniciar una conversación."
                : needsJwt
                  ? "Selecciona una conversación del listado o inicia sesión / configura JWT para chatear."
                  : "Selecciona una conversación o crea una nueva."}
            </Typography>
          </Box>
        </Box>
      ) : (
        <ConvLogThread
          scrollRef={threadScrollRef}
          onScroll={onThreadScroll}
          mensajes={displayMensajes}
          onMeta={isProdView ? undefined : onMeta}
          compactMeta={false}
          showUsageStats={!isProdView}
          chatUserDisplayName={chatUserDisplayName}
          chatUserNick={chatUserNick}
          surfaceClassName="paty-chat-thread-surface"
          streamingMsgId={sending ? "stream-live" : null}
          emptyHint="Sin mensajes en esta conversación."
          canRate={canSend && Boolean(jwt?.token)}
          onRateMessage={onRateMessage}
          ratingMsgId={ratingMsgId}
          threadKey={selectedId ?? "draft"}
          loading={loadingThread}
          loadingOnlyWhenEmpty={!sending}
          error={logError}
          onContapymeLoginDone={onContapymeLoginDone}
        />
      )}

      <ChatComposer
        canSend={canSend}
        sending={sending}
        draft={draft}
        images={images}
        audios={audios}
        isRecording={isRecording}
        payloadPreviewOpen={payloadPreviewOpen}
        postBodyPreview={postBodyPreview}
        inputRef={inputRef}
        attachInputRef={attachInputRef}
        onDraftChange={onDraftChange}
        onPaste={onPaste}
        onSend={onSend}
        onTogglePayloadPreview={onTogglePayloadPreview}
        onAttachClick={onAttachClick}
        onAttachChange={onAttachChange}
        onToggleVoiceRecord={onToggleVoiceRecord}
        onRemoveImage={onRemoveImage}
        onRemoveAudio={onRemoveAudio}
      />
    </Box>
  );
}
