import { getMaterialUI, getIsaSplitView, getReact, UI, toastInfo } from "../core/platform.ts";
import { MetaDialog } from "../ui/shared.jsx";
import { useChatTool } from "./chat/useChatTool.ts";
import { ChatLoggedOutShell } from "./chat/ChatLoggedOutShell.jsx";
import { ChatThreadSidebar } from "./chat/ChatThreadSidebar.jsx";
import { ChatMainPanel } from "./chat/ChatMainPanel.jsx";
import { JwtModal } from "./chat/JwtModal.jsx";
import { TercerosAuditDialog } from "./chat/TercerosAuditDialog.jsx";
import { CHAT_SIDEBAR_W } from "./chat/constants.ts";
import { mobileDrawerPaperProps } from "../ui/mobileDrawer.ts";

const { Box, Drawer, IconButton, Tooltip, useTheme, useMediaQuery } = getMaterialUI();
const { useState } = getReact();
const { Icon } = UI;

export function ChatTool({ bootChat, onNeedLogin }) {
  const chat = useChatTool({ bootChat });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshingThread, setRefreshingThread] = useState(false);

  if (!chat.loggedIn) {
    return <ChatLoggedOutShell />;
  }

  const IsaSplitView = getIsaSplitView();

  const sidebarProps = {
    jwt: chat.jwt,
    displayScope: chat.displayScope,
    sessionUser: chat.sessionUser,
    canInteract: chat.canInteract,
    viewOnly: chat.viewOnly,
    jwtLoading: chat.jwtLoading,
    convListOwnerLabel: chat.convListOwnerLabel,
    convListHeader: chat.convListHeader,
    canSend: chat.canSend,
    canAuditChat: chat.canAuditChat,
    needsJwt: chat.needsJwt,
    listScope: chat.listScope,
    sessionScopeLoading: chat.sessionScopeLoading,
    viewingAuditOther: chat.viewingAuditOther,
    auditScope: chat.auditScope,
    loadingList: chat.loadingList,
    rows: chat.rows,
    selectedId: chat.selectedId,
    convListMeta: chat.convListMeta,
    convListPage: chat.convListPage,
    convListPageSize: chat.convListPageSize,
    convListSearch: chat.convListSearch,
    onConvListSearchChange: chat.handleConvListSearchChange,
    messageSource: chat.messageSource,
    onMessageSourceChange: chat.onMessageSourceChange,
    mode: chat.chatMode,
    llmProvider: chat.llmProvider,
    onChatModeChange: chat.onChatModeChange,
    onLlmProviderChange: chat.onLlmProviderChange,
    onOpenJwt: () => chat.setJwtOpen(true),
    onOpenAudit: () => {
      if (!chat.canAuditChat) {
        toastInfo("Tu rol solo puede ver tus propias conversaciones");
        return;
      }
      chat.setAuditDialogOpen(true);
    },
    onNewChat: chat.onNewChat,
    onOpenConv: chat.openConv,
    onDelete: chat.onDelete,
    onConvListPageChange: chat.setConvListPage,
    onConvListPageSizeChange: chat.onConvListPageSizeChange,
  };

  const mainPanel = (
      <ChatMainPanel
        jwt={chat.jwt}
        needsJwt={chat.needsJwt}
        viewingAuditOther={chat.viewingAuditOther}
        selectedId={chat.selectedId}
        detail={chat.detail}
        canSend={chat.canSend}
        loadingThread={chat.loadingThread}
        refreshingThread={refreshingThread}
        sending={chat.sending}
        showThread={chat.showThread}
        logError={chat.logError}
        displayMensajes={chat.displayMensajes}
        chatUserDisplayName={chat.chatUserDisplayName}
        chatUserNick={chat.chatUserNick}
        ratingMsgId={chat.ratingMsgId}
        threadScrollRef={chat.threadScrollRef}
        onThreadScroll={chat.onThreadScroll}
        onOpenJwt={() => chat.setJwtOpen(true)}
        onClearAuditFilter={chat.clearAuditFilter}
        onRefreshConv={async () => {
          if (!chat.selectedId || refreshingThread) return;
          setRefreshingThread(true);
          try {
            await chat.openConv(chat.selectedId, { freshLog: true, silent: true, keepStream: true });
          } finally {
            setRefreshingThread(false);
          }
        }}
        draft={chat.draft}
        images={chat.images}
        audios={chat.audios}
        isRecording={chat.isRecording}
        payloadPreviewOpen={chat.payloadPreviewOpen}
        postBodyPreview={chat.postBodyPreview}
        inputRef={chat.inputRef}
        attachInputRef={chat.attachInputRef}
        onDraftChange={(e) => chat.setDraft(e.target.value)}
        onPaste={chat.onPaste}
        onSend={chat.onSend}
        onContapymeLoginDone={chat.onContapymeLoginDone}
        onTogglePayloadPreview={() => chat.setPayloadPreviewOpen((v) => !v)}
        onAttachClick={chat.onAttachClick}
        onAttachChange={chat.onAttachChange}
        onToggleVoiceRecord={chat.onToggleVoiceRecord}
        onRemoveImage={(idx) => chat.setImages((p) => p.filter((_, j) => j !== idx))}
        onRemoveAudio={(idx) => chat.setAudios((p) => p.filter((_, j) => j !== idx))}
        onMeta={chat.onMeta}
        onRateMessage={chat.onRateMessage}
        messageSource={chat.messageSource}
        mode={chat.chatMode}
        llmProvider={chat.llmProvider}
        onMessageSourceChange={chat.onMessageSourceChange}
        onChatModeChange={chat.onChatModeChange}
        onLlmProviderChange={chat.onLlmProviderChange}
        onOpenSidebar={isMobile ? () => setSidebarOpen(true) : undefined}
      />
  );

  return (
    <Box
      className="conv-log-shell paty-chat-shell"
      sx={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column", position: "relative" }}
    >
      {isMobile ? (
        <>
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={mobileDrawerPaperProps("paty-mobile-sidebar-drawer")}
          >
            <ChatThreadSidebar
              {...sidebarProps}
              drawerMode
              onClose={() => setSidebarOpen(false)}
            />
          </Drawer>
          {mainPanel}
        </>
      ) : (
        <IsaSplitView
          className="conv-log-shell-split paty-chat-shell-split"
          sx={{ flex: 1, minHeight: 0 }}
          panelClassName="conv-log-sidebar paty-chat-sidebar"
          storageKey="isa-patyia:chat-sidebar-width"
          defaultWidth={CHAT_SIDEBAR_W}
          maxWidth={520}
          panelTitle="Conversaciones"
          panelIcon="mdi:chat-outline"
          UI={UI}
          collapsedRail={({ expand }) => (
            <Box className="conv-log-collapsed-rail paty-chat-collapsed-rail">
              <Tooltip title="Nueva conversación" placement="right">
                <IconButton
                  size="small"
                  className="isa-neon-rail-btn isa-neon-rail-btn--new"
                  aria-label="Nueva conversación"
                  disabled={!chat.canSend}
                  onClick={() => { chat.onNewChat(); expand(); }}
                >
                  <Icon icon="mdi:plus" size={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cambiar token JWT" placement="right">
                <IconButton
                  size="small"
                  className="isa-neon-rail-btn isa-neon-rail-btn--jwt"
                  aria-label="JWT"
                  onClick={() => { chat.setJwtOpen(true); expand(); }}
                >
                  <Icon icon="mdi:key-variant" size={20} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          panel={<ChatThreadSidebar {...sidebarProps} splitMode />}
        >
          {mainPanel}
        </IsaSplitView>
      )}

      <JwtModal
        open={chat.jwtOpen}
        onClose={() => chat.setJwtOpen(false)}
        initialToken={chat.jwt?.token || ""}
        onSave={chat.setJwt}
      />
      <MetaDialog
        open={chat.metaOpen}
        onClose={() => chat.setMetaOpen(false)}
        meta={chat.metaMsg?.meta}
        usageStats={chat.metaMsg?.usageStats ?? null}
        title={chat.metaMsg ? `Trazabilidad · ${chat.metaMsg.rol}` : ""}
        isUserMessage={Boolean(chat.metaMsg?.esUsuario)}
        userContent={chat.metaMsg?.contenido ?? ""}
        imagenes={chat.metaMsg?.imagenes ?? null}
        logFragment={chat.metaMsg?.logFragment ?? null}
        showLog={chat.messageSource !== "prod"}
      />
      <TercerosAuditDialog
        open={chat.auditDialogOpen}
        onClose={() => chat.setAuditDialogOpen(false)}
        jwt={chat.jwt}
        sessionUser={chat.sessionUser}
        currentScope={chat.auditCurrentScope}
        canAudit={chat.canAuditChat}
        onSelect={chat.handleSelectAuditScope}
      />
    </Box>
  );
}
