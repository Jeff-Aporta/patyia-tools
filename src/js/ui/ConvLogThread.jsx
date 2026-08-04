/** Hilo de conversación compartido — chat staging y visor de log. */
import { getMaterialUI } from "../core/platform.ts";
import { convLogSurfaceSx } from "../core/convLog.ts";
import { ConvLogWebView } from "./ConvLogWebView.jsx";

const { Box, Alert } = getMaterialUI();

function ThreadLoading({ label = "Cargando conversación…" }) {
  return (
    <Box className="isa-app-boot isa-app-boot--inline" sx={{ position: "absolute", inset: 0, zIndex: 2, minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", pointerEvents: "none" }}>
      <div className="isa-app-boot__card isa-app-boot__card--compact" role="status" aria-live="polite" style={{ background: "rgba(8, 16, 32, 0.72)" }}>
        <div className="isa-app-boot__icon-wrap isa-app-boot__icon-wrap--sm">
          <iconify-icon icon="mdi:loading" class="isa-spin" width="1.375em" height="1.375em" />
        </div>
        <p className="isa-app-boot__label">{label}</p>
        <div className="isa-app-boot__bar" aria-hidden="true">
          <span className="isa-app-boot__bar-fill" />
        </div>
      </div>
    </Box>
  );
}

export function ConvLogThread({
  mensajes,
  onMeta,
  compactMeta = false,
  showUsageStats = true,
  chatUserDisplayName,
  chatUserNick,
  threadKey = null,
  streamingMsgId = null,
  onRateMessage = null,
  canRate = false,
  ratingMsgId = null,
  emptyHint,
  loading = false,
  loadingOnlyWhenEmpty = true,
  error = null,
  scrollRef = null,
  onScroll = null,
  surfaceClassName = "",
  sx = {},
  onContapymeLoginDone = null,
}) {
  const threadClassName = compactMeta ? "paty-chat-thread--compact" : "paty-chat-log-thread";
  const showSpinner = loading && (loadingOnlyWhenEmpty ? !mensajes?.length : true);

  return (
    <Box
      ref={scrollRef}
      onScroll={onScroll}
      className={[
        "conv-log-thread-surface",
        compactMeta ? "conv-log-thread-surface--compact" : "",
        surfaceClassName,
      ].filter(Boolean).join(" ")}
      sx={{ ...convLogSurfaceSx(), flex: 1, minHeight: 0, ...sx }}
    >
      {showSpinner ? <ThreadLoading /> : null}
      {error ? <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert> : null}
      <ConvLogWebView
        mensajes={mensajes}
        onMeta={onMeta}
        compactMeta={compactMeta}
        showUsageStats={showUsageStats}
        threadClassName={threadClassName}
        chatUserDisplayName={chatUserDisplayName}
        chatUserNick={chatUserNick}
        streamingMsgId={streamingMsgId}
        emptyHint={showSpinner ? null : emptyHint}
        canRate={canRate}
        onRateMessage={onRateMessage}
        ratingMsgId={ratingMsgId}
        threadKey={threadKey}
        onContapymeLoginDone={onContapymeLoginDone}
      />
    </Box>
  );
}
