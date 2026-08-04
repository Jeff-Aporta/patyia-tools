import { getReact, getMaterialUI, UI, mdToHtml } from "../core/platform.ts";
import {
  tokensFromUsage,
  formatUsageUsd,
  formatUsageTokens,
  formatUsageBreakdownParts,
  usageHasData,
} from "../core/convLog.ts";
import { CodeMirrorPanel } from "../core/platform.ts";
import { ImageLightboxDialog } from "./ImageLightboxDialog.jsx";
import { GlassDialog, GlassDialogHeader, glassDialogContentSx, glassDialogTabsSx, resolveMetaDialogHeader, GlassDialogCloseActions } from "./GlassDialog.jsx";
import { archivosCitadosFromMeta, fileSearchFromMeta, chunksFromMeta, metaHasFileSearch, vectorStoresFromMeta, vectorStoreIndexLabel } from "../core/fileSearchTrace.js";

export { mdToHtml };

/** Botón con icono Iconify (mismo patrón que ISP ButtonIconify). */
export function ButtonIconify({ icon, title = "", label = "", onClick, disabled = false, busy = false, color = "", variant = "", className = "", type = "button" }) {
  const shown = busy ? "mdi:loading" : icon;
  const variantCls = variant ? `btn-iconify--${variant}` : "";
  const colorCls = color ? `btn-iconify--${color}` : "";
  const labeledCls = label ? "btn-iconify--labeled" : "";
  const aria = label || title || undefined;
  return (
    <button
      type={type}
      className={`btn-iconify ${variantCls} ${colorCls} ${labeledCls} ${className}`.trim()}
      title={title || label || undefined}
      aria-label={aria}
      onClick={onClick}
      disabled={disabled || busy}
    >
      <iconify-icon icon={shown} width="1.15em" height="1.15em" />
      {label ? <span className="btn-iconify__lbl">{label}</span> : null}
    </button>
  );
}

const { useState, useEffect, useMemo } = getReact();
const { createTheme, Tabs, Tab, Box, Typography, DialogContent, Stack, Chip } = getMaterialUI();

function isOpenAiPmptId(id) {
  return /^pmpt_/i.test(String(id ?? "").trim());
}

function bdInstructionKey(meta) {
  const id = String(meta?.prompt_id ?? "").trim();
  return id && !isOpenAiPmptId(id) ? id : "";
}

export function instructionKeyFromMeta(meta) {
  return bdInstructionKey(meta) || String(meta?.extra?.operativa_key ?? "").trim();
}

const USAGE_METRIC_COLS = [
  { key: "in", label: "Entrada" },
  { key: "cache", label: "Caché" },
  { key: "out", label: "Salida" },
  { key: "total", label: "Total" },
  { key: "reason", label: "Razon." },
];

function buildUsageRowMetrics(tokens, cost) {
  const tk = tokens || {};
  const parts = formatUsageBreakdownParts(tokens, cost);
  const byKey = Object.fromEntries(parts.map((p) => [p.key, p]));
  const reasonTok = Number(tk.reasoning ?? 0) || 0;

  return USAGE_METRIC_COLS.map((col) => {
    if (col.key === "reason") {
      return { key: col.key, tok: reasonTok, usd: 0, hasData: reasonTok > 0 };
    }
    const p = byKey[col.key];
    const tok = Number(p?.tok ?? 0) || 0;
    const usd = Number(p?.usd ?? 0) || 0;
    return { key: col.key, tok, usd, hasData: tok > 0 || usd > 0 };
  });
}

function UsageMetricCell({ tok, usd, showUsd = true }) {
  const tokLabel = formatUsageTokens(tok);
  const usdLabel = showUsd ? formatUsageUsd(usd) : null;
  const empty = tokLabel === "—" && (!showUsd || usdLabel === "—");
  return (
    <span className={`meta-prompt-stat__usage-grid-cell${empty ? " meta-prompt-stat__usage-grid-cell--empty" : ""}`}>
      <span className="meta-prompt-stat__usage-tok">{tokLabel}</span>
      {showUsd ? <span className="meta-prompt-stat__usage-usd">{usdLabel}</span> : null}
    </span>
  );
}

function MetaUsageGrid({ sections, hideRowLabels = false, className = "" }) {
  const rows = (sections || []).map((s) => ({
    ...s,
    metrics: buildUsageRowMetrics(s.tokens, s.cost),
  }));

  const visibleCols = USAGE_METRIC_COLS.filter((col) =>
    rows.some((r) => r.metrics.find((m) => m.key === col.key)?.hasData),
  );

  if (!visibleCols.length) return null;

  const gridTemplateColumns = hideRowLabels
    ? `repeat(${visibleCols.length}, minmax(5.5rem, 1fr))`
    : `5.75rem repeat(${visibleCols.length}, minmax(5.5rem, 1fr))`;
  const gridStyle = { display: "grid", gridTemplateColumns };

  return (
    <div className={`meta-prompt-stat__usage-grid ${className}`.trim()}>
      <div className="meta-prompt-stat__usage-grid-head" style={gridStyle}>
        {!hideRowLabels ? <span className="meta-prompt-stat__usage-grid-corner" aria-hidden="true" /> : null}
        {visibleCols.map((col) => (
          <span key={col.key} className="meta-prompt-stat__usage-grid-col-h">
            {col.label}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className={`meta-prompt-stat__usage-grid-row meta-prompt-stat__usage-grid-row--${row.key}`} style={gridStyle}>
          {!hideRowLabels ? (
            <span className={`meta-prompt-stat__usage-group-label meta-prompt-stat__usage-group-label--${row.key}`}>
              {row.label}
            </span>
          ) : null}
          {visibleCols.map((col) => {
            const metric = row.metrics.find((m) => m.key === col.key);
            const usd = col.key === "reason" ? 0 : (metric?.usd ?? 0);
            return (
              <UsageMetricCell
                key={col.key}
                tok={metric?.tok ?? 0}
                usd={usd}
                showUsd={col.key !== "reason"}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Cuadrícula neon de tokens/USD — reutilizable en meta y diálogo de uso. */
export function UsageMetricsGrid(props) {
  return MetaUsageGrid(props);
}

function filterDisplayableImages(list) {
  return (list || []).filter((src) => {
    const s = String(src || "").trim();
    if (!s || /^\[file_id:/i.test(s)) return false;
    return s.startsWith("data:image/") || /^https?:\/\//i.test(s);
  });
}

function MetaDialogImages({ items, onImageClick, topGap = 0 }) {
  const renderable = filterDisplayableImages(items);
  if (!renderable.length) return null;
  return (
    <Box
      className="conv-msg-images conv-msg-images--left meta-dialog-images"
      sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: topGap }}
    >
      {renderable.map((src, idx) => (
        <button
          key={`${idx}-${src.slice(0, 32)}`}
          type="button"
          className="conv-msg-image-lightbox-btn"
          aria-label={`Ver imagen adjunta ${idx + 1} en tamaño completo`}
          onClick={() => onImageClick?.(src)}
        >
          <img src={src} alt={`Adjunto ${idx + 1}`} loading="lazy" />
        </button>
      ))}
    </Box>
  );
}

function PromptSummaryCard({ meta, tokens, usageStats, isUserMessage = false }) {
  const promptChars = meta.prompt_chars ?? String(meta.prompt_markdown ?? "").length;
  const responseChars = meta.response_chars;
  const imageCount = filterDisplayableImages(meta.imagenes).length;

  const charStats = [
    ...(promptChars
      ? [{
        key: "prompt-ch",
        label: isUserMessage ? "Caracteres consulta" : "Caracteres prompt",
        value: Number(promptChars).toLocaleString("es-CO"),
        tone: "accent",
      }]
      : []),
    ...(imageCount
      ? [{ key: "img-n", label: "Imágenes adjuntas", value: String(imageCount), tone: "neutral" }]
      : []),
    ...(typeof responseChars === "number"
      ? [{ key: "resp-ch", label: "Caracteres respuesta", value: responseChars.toLocaleString("es-CO"), tone: "neutral" }]
      : []),
  ];

  const currentTokens = usageStats?.tokens ?? tokens;
  const currentCost = usageStats?.cost ?? meta?.cost;
  const usageSections = usageStats
    ? [
        { key: "msg", label: "Mensaje", tokens: usageStats.tokens, cost: usageStats.cost, show: true },
        {
          key: "cum",
          label: "Acumulado",
          tokens: usageStats.cumulativeTokens,
          cost: usageStats.cumulativeCost,
          show: usageHasData(usageStats.cumulativeTokens, usageStats.cumulativeCost),
        },
      ].filter((s) => s.show)
    : [{ key: "msg", label: "Mensaje", tokens: currentTokens, cost: currentCost, show: usageHasData(currentTokens, currentCost) }];

  const hasUsage = usageSections.some((s) => usageHasData(s.tokens, s.cost));

  const hasCharStats = charStats.length > 0;

  return (
    <Box className="meta-prompt-summary">
      {hasCharStats || hasUsage ? (
        <Stack direction="row" alignItems="center" spacing={0.75} className="meta-prompt-summary__head">
          <iconify-icon
            icon={isUserMessage ? "mdi:message-text-outline" : "mdi:file-document-edit-outline"}
            width="18"
            height="18"
          />
          <Typography variant="subtitle2" className="meta-prompt-summary__title" sx={{ flex: 1, fontWeight: 700 }}>
            {isUserMessage ? "Resumen de la consulta" : "Resumen del prompt"}
          </Typography>
          {hasUsage ? (
            <Chip
              size="small"
              className="meta-prompt-summary__badge"
              label={isUserMessage ? "tokens + costo" : "tokens + costo"}
              icon={<iconify-icon icon="mdi:finance" width="13" height="13" />}
            />
          ) : null}
        </Stack>
      ) : null}
      <div className="meta-prompt-summary__grid">
        {charStats.map((s) => (
          <div key={s.key} className={`meta-prompt-stat meta-prompt-stat--${s.tone || "neutral"}`}>
            <span className="meta-prompt-stat__k">{s.label}</span>
            <span className="meta-prompt-stat__v">{s.value}</span>
          </div>
        ))}
        {hasUsage ? (
          <div className="meta-prompt-stat meta-prompt-stat--usage">
            <span className="meta-prompt-stat__k">Tokens y costo</span>
            <div className="meta-prompt-stat__usage-body">
              <MetaUsageGrid sections={usageSections} />
            </div>
          </div>
        ) : null}
      </div>
    </Box>
  );
}

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3b82f6" },
    secondary: { main: "#14b8a6" },
    background: { default: "#0f172a", paper: "#1e293b" },
  },
  typography: { fontFamily: '"IBM Plex Sans", system-ui, sans-serif' },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
    MuiTab: { styleOverrides: { root: { textTransform: "none" } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: "none" } } },
    MuiTooltip: {
      defaultProps: { disableInteractive: true },
      styleOverrides: {
        popper: { pointerEvents: "none" },
        tooltip: { pointerEvents: "none" },
      },
    },
  },
});

export function shortId(s, head = 10, tail = 4) {
  if (!s) return "";
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function metaWorthDialog(meta, isUser) {
  if (!meta) return false;
  if (!isUser) return true;
  if (String(meta.prompt_markdown ?? "").trim()) return true;
  if (filterDisplayableImages(meta.imagenes).length) return true;
  const tk = meta.tokens?.total ? meta.tokens : tokensFromUsage(meta.usage);
  if (tk?.total > 0 || meta.usage) return true;
  if (meta.latency_ms != null && meta.latency_ms > 0) return true;
  if (meta.itdconsulta || meta.model || meta.premisas?.length) return true;
  if (bdInstructionKey(meta)) return true;
  if (meta.stream_ok === false) return true;
  if (meta.extra?.operativa_key) return true;
  if (Array.isArray(meta.archivos_citados) && meta.archivos_citados.length) return true;
  if (Array.isArray(meta.file_search) && meta.file_search.length) return true;
  if (meta.file_search && typeof meta.file_search === "object" && !Array.isArray(meta.file_search)) return true;
  if (Array.isArray(meta.vector_store_ids) && meta.vector_store_ids.length) return true;
  const pv = meta.prompt_variables;
  if (pv && typeof pv === "object") {
    if (Object.keys(pv).some((k) => k !== "nombre_usuario")) return true;
  }
  return false;
}

function FileSearchMetaSection({ meta }) {
  const { Typography, Box, Stack, Chip, IconButton, Tooltip } = getMaterialUI();
  const { useState, useMemo } = getReact();
  const trace = fileSearchFromMeta(meta);
  const archivos = archivosCitadosFromMeta(meta);
  const chunks = useMemo(() => chunksFromMeta(meta), [meta]);
  const vectorStores = useMemo(() => vectorStoresFromMeta(meta), [meta]);
  const [expandedKey, setExpandedKey] = useState(null);
  const [openChunk, setOpenChunk] = useState(null);

  if (!trace?.length && !archivos.length && !chunks.length && !vectorStores.length) return null;

  function toggleChunk(key) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  return (
    <Box className="meta-file-search" sx={{ mt: 1.5 }}>
      {vectorStores.length ? (
        <Box className="meta-file-search__vector-stores" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
            Vector stores consultados
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
            Índice = posición en <code>vector_store_ids</code> enviado al modelo (0 = primero). Usa el ID completo para verificar en OpenAI/BD.
          </Typography>
          <Stack spacing={0.5}>
            {vectorStores.map((vs) => (
              <Box
                key={vs.id}
                className="meta-file-search__vs-row"
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  gap: 0.75,
                  fontSize: "0.82rem",
                }}
              >
                <Chip size="small" variant="outlined" label={`índice ${vs.index}`} className="meta-file-search__vs-index" />
                <Typography component="code" variant="body2" sx={{ wordBreak: "break-all", fontFamily: "monospace" }}>
                  {vs.id}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
        File Search (archivos citados)
      </Typography>
      {archivos.length ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: chunks.length ? 1 : 0 }}>
          {archivos.map((name) => (
            <Chip
              key={name}
              size="small"
              variant="outlined"
              icon={<iconify-icon icon="mdi:file-document-outline" width="14" height="14" />}
              label={name}
              title={name}
            />
          ))}
        </Stack>
      ) : null}
      {chunks.length ? (
        <Stack spacing={0.5} className="meta-file-search__chunk-list">
          {chunks.map((c) => {
            const expanded = expandedKey === c.key;
            const vsIdx = c.vectorStoreId ? vectorStoreIndexLabel(vectorStores, c.vectorStoreId) : null;
            const label = c.filename || c.fileId || "fragmento";
            return (
              <Box
                key={c.key}
                className={`meta-file-search__chunk${expanded ? " meta-file-search__chunk--expanded" : ""}`}
              >
                <Box
                  className="meta-file-search__chunk-summary"
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  title={label}
                  onClick={() => toggleChunk(c.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleChunk(c.key);
                    }
                  }}
                >
                  <iconify-icon icon="mdi:text-box-search-outline" width="15" height="15" aria-hidden />
                  <Typography variant="body2" fontWeight={600} noWrap className="meta-file-search__chunk-title">
                    {label}
                  </Typography>
                  {vsIdx != null ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`VS ${vsIdx}`}
                      title={c.vectorStoreId || undefined}
                      className="meta-file-search__vs-chip"
                    />
                  ) : null}
                  {c.score != null ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={Number(c.score).toFixed(3)}
                      className="meta-file-search__score"
                    />
                  ) : null}
                  <Tooltip title="Ver en pantalla completa">
                    <IconButton
                      size="small"
                      aria-label={`Ver fragmento de ${label}`}
                      className="meta-file-search__open"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenChunk(c);
                      }}
                    >
                      <iconify-icon icon="mdi:fullscreen" width="15" height="15" />
                    </IconButton>
                  </Tooltip>
                  <iconify-icon
                    icon="mdi:chevron-down"
                    width="18"
                    height="18"
                    className={`meta-file-search__chevron${expanded ? " meta-file-search__chevron--open" : ""}`}
                    aria-hidden
                  />
                </Box>
                {expanded ? (
                  <Box className="meta-file-search__chunk-body">
                    {c.queries?.length ? (
                      <Typography variant="caption" color="text.secondary" display="block" className="meta-file-search__queries">
                        Queries: {c.queries.join(" · ")}
                      </Typography>
                    ) : null}
                    <MdRenderer source={c.text || ""} className="meta-file-search__md" />
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      ) : null}
      <MdFullPageDialog
        open={Boolean(openChunk)}
        onClose={() => setOpenChunk(null)}
        source={openChunk?.text || ""}
        title={openChunk ? `Fragmento · ${openChunk.filename || openChunk.fileId || "texto exacto"}` : "Fragmento"}
        subtitle={
          openChunk
            ? [
                openChunk.vectorStoreId
                  ? `VS índice ${vectorStoreIndexLabel(vectorStores, openChunk.vectorStoreId) ?? "?"} · ${openChunk.vectorStoreId}`
                  : "",
                openChunk.score != null ? `score ${Number(openChunk.score).toFixed(3)}` : "",
                openChunk.queries?.length ? `Queries: ${openChunk.queries.join(" · ")}` : "",
              ].filter(Boolean).join("  ·  ")
            : ""
        }
        accent="#7c3aed"
        icon="mdi:text-box-search-outline"
      />
    </Box>
  );
}

/** Modal standalone: fragmentos File Search (mismo panel que MetaDialog). */
export function FileSearchDialog({ open, onClose, meta, title = "File Search", subtitle = "" }) {
  const { DialogContent } = getMaterialUI();
  if (!meta || !metaHasFileSearch(meta)) return null;
  const headerMeta = resolveMetaDialogHeader(title, false);
  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <GlassDialogHeader
        icon={headerMeta.icon}
        title={headerMeta.title}
        subtitle={subtitle || "Archivos citados y fragmentos consultados"}
        accent={headerMeta.accent}
        onClose={onClose}
      />
      <DialogContent dividers sx={glassDialogContentSx()}>
        <FileSearchMetaSection meta={meta} />
      </DialogContent>
      <GlassDialogCloseActions onClose={onClose} />
    </GlassDialog>
  );
}

export function MetaDialog({
  open,
  onClose,
  meta,
  title,
  isUserMessage = false,
  usageStats = null,
  userContent = "",
  imagenes = null,
}) {
  const [tab, setTab] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const resolvedMeta = useMemo(() => {
    if (!meta) return null;
    if (!isUserMessage) return meta;
    const text = String(meta.prompt_markdown || userContent || "").trim();
    const imgs = filterDisplayableImages(
      (Array.isArray(meta.imagenes) && meta.imagenes.length) ? meta.imagenes : imagenes,
    );
    return {
      ...meta,
      ...(text ? { prompt_markdown: text, prompt_chars: meta.prompt_chars ?? text.length } : {}),
      ...(imgs.length ? { imagenes: imgs } : {}),
    };
  }, [meta, isUserMessage, userContent, imagenes]);

  const promptMarkdown = String(resolvedMeta?.prompt_markdown ?? "").trim();
  const userImagenes = filterDisplayableImages(resolvedMeta?.imagenes);
  const iinstruccion = bdInstructionKey(resolvedMeta) || String(resolvedMeta?.extra?.operativa_key ?? "").trim();
  const isMcpOperativa = /^contapymeMcp(Login|Session|Unavailable)$/i.test(iinstruccion)
    || String(resolvedMeta?.extra?.operativa_engine || "").toLowerCase() === "mcp"
    || Boolean(resolvedMeta?.http_request?.session_id || resolvedMeta?.http_request?.login_url || resolvedMeta?.http_response?.tools);
  const hasPrompt = Boolean(promptMarkdown) || Boolean(iinstruccion) || userImagenes.length > 0;
  const promptTabLabel = isUserMessage ? "Consulta" : (isMcpOperativa ? "Payload MCP" : "Prompt");

  useEffect(() => {
    if (open) setTab(0);
  }, [open, resolvedMeta?.ts, resolvedMeta?.prompt_id, promptMarkdown, userImagenes.length]);

  useEffect(() => {
    if (!open) setLightboxSrc(null);
  }, [open]);

  if (!resolvedMeta) return null;
  const tk = resolvedMeta.tokens?.total ? resolvedMeta.tokens : tokensFromUsage(resolvedMeta.usage);
  const httpReq = resolvedMeta.http_request && typeof resolvedMeta.http_request === "object"
    ? resolvedMeta.http_request
    : null;
  const httpRes = resolvedMeta.http_response && typeof resolvedMeta.http_response === "object"
    ? resolvedMeta.http_response
    : null;

  function renderMetaGrid() {
    return (
      <div className="meta-grid meta-dialog-panel">
        {resolvedMeta.nombre_usuario && (
          <div className="meta-row"><span className="meta-k">nombre</span><span className="meta-v"><strong>{resolvedMeta.nombre_usuario}</strong></span></div>
        )}
        {resolvedMeta.itdconsulta && (
          <div className="meta-row"><span className="meta-k">itdconsulta</span><span className="meta-v"><span className="badge badge-itd">{resolvedMeta.itdconsulta}</span></span></div>
        )}
        {!isUserMessage && iinstruccion && (
          <div className="meta-row"><span className="meta-k">{isMcpOperativa ? "operativa" : "iinstruccion"}</span><span className="meta-v"><code>{iinstruccion}</code></span></div>
        )}
        {isMcpOperativa && resolvedMeta.extra?.operativa_engine && (
          <div className="meta-row"><span className="meta-k">engine</span><span className="meta-v"><code>{String(resolvedMeta.extra.operativa_engine)}</code></span></div>
        )}
        {isMcpOperativa && httpReq?.session_id && (
          <div className="meta-row"><span className="meta-k">session_id</span><span className="meta-v"><code>{String(httpReq.session_id)}</code></span></div>
        )}
        {isMcpOperativa && httpReq?.transport && (
          <div className="meta-row"><span className="meta-k">transport</span><span className="meta-v"><code>{String(httpReq.transport)}</code></span></div>
        )}
        {isMcpOperativa && httpRes?.kind && (
          <div className="meta-row"><span className="meta-k">kind</span><span className="meta-v"><span className="badge badge-itd">{String(httpRes.kind)}</span></span></div>
        )}
        {isMcpOperativa && Array.isArray(httpRes?.tools) && httpRes.tools.length > 0 && (
          <div className="meta-row"><span className="meta-k">tools</span><span className="meta-v">{httpRes.tools.map((t) => String(t?.name ?? "tool")).filter(Boolean).join(", ")}</span></div>
        )}
        {isMcpOperativa && resolvedMeta.login_url && (
          <div className="meta-row"><span className="meta-k">login_url</span><span className="meta-v" style={{ wordBreak: "break-all" }}>{String(resolvedMeta.login_url)}</span></div>
        )}
        {resolvedMeta.premisas?.length ? (
          <div className="meta-row"><span className="meta-k">premisas</span><span className="meta-v">{resolvedMeta.premisas.join(", ")}</span></div>
        ) : null}
        {resolvedMeta.usage && (
          <div className="meta-row meta-row--block">
            <span className="meta-k">usage</span>
            <span className="meta-v meta-v--full">
              <CodeMirrorPanel
                value={JSON.stringify(resolvedMeta.usage, null, 2)}
                readOnly
                json
                minHeight="5rem"
                maxHeight="18rem"
                lineWrapping
              />
            </span>
          </div>
        )}
        {isMcpOperativa && httpReq && (
          <div className="meta-row meta-row--block">
            <span className="meta-k">http_request</span>
            <span className="meta-v meta-v--full">
              <CodeMirrorPanel
                value={JSON.stringify(httpReq, null, 2)}
                readOnly
                json
                minHeight="6rem"
                maxHeight="22rem"
                lineWrapping
              />
            </span>
          </div>
        )}
        {isMcpOperativa && httpRes && (
          <div className="meta-row meta-row--block">
            <span className="meta-k">http_response</span>
            <span className="meta-v meta-v--full">
              <CodeMirrorPanel
                value={JSON.stringify(httpRes, null, 2)}
                readOnly
                json
                minHeight="6rem"
                maxHeight="22rem"
                lineWrapping
              />
            </span>
          </div>
        )}
        <FileSearchMetaSection meta={resolvedMeta} />
      </div>
    );
  }

  const headerMeta = resolveMetaDialogHeader(title, isUserMessage);

  return (
    <>
      <GlassDialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        header={(
          <GlassDialogHeader
            icon={headerMeta.icon}
            title={headerMeta.title}
            subtitle={headerMeta.subtitle}
            accent={headerMeta.accent}
            onClose={onClose}
          />
        )}
      >
        {hasPrompt && (
          <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={glassDialogTabsSx()}>
            <Tab label="Trazabilidad" />
            <Tab label={promptTabLabel} />
          </Tabs>
        )}
        <DialogContent dividers sx={glassDialogContentSx()}>
          <Box sx={{ display: tab === 0 || !hasPrompt ? "block" : "none", minHeight: 0 }}>
            {renderMetaGrid()}
          </Box>
          {hasPrompt && (
            <Box sx={{ display: tab === 1 ? "block" : "none", minHeight: 0, flex: 1 }}>
              <PromptPanelBody
                resolvedMeta={resolvedMeta}
                tk={tk}
                usageStats={usageStats}
                isUserMessage={isUserMessage}
                promptMarkdown={promptMarkdown}
                userImagenes={userImagenes}
                setLightboxSrc={setLightboxSrc}
                iinstruccion={iinstruccion}
                dialogTitle={headerMeta.subtitle || headerMeta.title}
                isMcpOperativa={isMcpOperativa}
              />
            </Box>
          )}
        </DialogContent>
        <GlassDialogCloseActions onClose={onClose} />
      </GlassDialog>
      <ImageLightboxDialog open={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}

function PromptPanelBody({
  resolvedMeta, tk, usageStats, isUserMessage,
  promptMarkdown, userImagenes, setLightboxSrc, iinstruccion, dialogTitle,
  isMcpOperativa = false,
}) {
  const [fullPage, setFullPage] = useState(false);
  const exactTitle = isUserMessage
    ? "Consulta · texto exacto"
    : (isMcpOperativa ? "Payload MCP · request / respuesta" : "Prompt · texto exacto");
  const emptyCopy = isUserMessage
    ? "Sin texto ni imágenes en el log de este mensaje."
    : (isMcpOperativa
      ? "Sin payload MCP (input / session_id / tools) en el log de este turno."
      : "Sin texto de instrucciones en el log de este turno.");
  return (
    <div className="meta-prompt-panel custom-scrollbar">
      <PromptSummaryCard meta={resolvedMeta} tokens={tk} usageStats={usageStats} isUserMessage={isUserMessage} />
      {promptMarkdown ? (
        <Box className="meta-prompt-exact-wrap">
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
            <iconify-icon icon={isMcpOperativa ? "mdi:api" : "mdi:file-document-outline"} width="18" height="18" />
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
              {exactTitle}
            </Typography>
            <Chip
              size="small"
              clickable
              onClick={() => setFullPage(true)}
              className="meta-prompt-exact-preview__open"
              label="Ver full-page"
              icon={<iconify-icon icon="mdi:fullscreen" width="14" height="14" />}
            />
            <Chip
              size="small"
              clickable
              onClick={() => {
                try {
                  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(promptMarkdown);
                } catch { /* ignore */ }
              }}
              className="meta-prompt-exact-preview__copy"
              label="Copiar"
              icon={<iconify-icon icon="mdi:content-copy" width="14" height="14" />}
            />
          </Stack>
          <Box className="meta-prompt-exact-preview__body isa-md-content">
            <MdRenderer source={promptMarkdown} />
          </Box>
          <MdFullPageDialog
            open={fullPage}
            onClose={() => setFullPage(false)}
            source={promptMarkdown}
            title={exactTitle}
            subtitle={dialogTitle || (isUserMessage ? "Vista consulta full-page" : "Vista prompt full-page")}
            icon={isUserMessage ? "mdi:message-text-outline" : (isMcpOperativa ? "mdi:api" : "mdi:file-document-outline")}
            accent={isUserMessage ? "#1e90ff" : (isMcpOperativa ? "#f59e0b" : "#22c55e")}
          />
        </Box>
      ) : null}
      {userImagenes.length ? (
        <MetaDialogImages items={userImagenes} onImageClick={setLightboxSrc} topGap={promptMarkdown ? 1.25 : 0} />
      ) : null}
      {!promptMarkdown && !userImagenes.length ? (
        <Typography variant="body2" color="text.secondary">
          {emptyCopy}
        </Typography>
      ) : null}
    </div>
  );
}

/** Renderizador in-place de markdown (sin CodeMirror) con clase estable. */
export function MdRenderer({ source, className = "" }) {
  const html = mdToHtml(String(source ?? ""));
  return (
    <div
      className={`md-renderer isa-md-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Dialog full-page read-only con markdown renderizado.
 *  Pensado para: prompt exacto, chunk de file_search, prompt user, etc. */
export function MdFullPageDialog({
  open,
  onClose,
  source,
  title = "Visor full-page",
  subtitle = "",
  accent = "#1e90ff",
  icon = "mdi:file-document-outline",
}) {
  const { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box } = getMaterialUI();
  const { Icon } = UI;
  const html = mdToHtml(String(source ?? ""));
  return (
    <Dialog
      open={Boolean(open)}
      onClose={onClose}
      fullScreen
      scroll="paper"
      className="md-full-page-dialog"
      PaperProps={{
        sx: {
          backgroundImage: (theme) => `linear-gradient(160deg, ${
            theme.palette.mode === "light" ? "#f8fbff" : "#0b1220"
          } 0%, ${
            theme.palette.mode === "light" ? "#e8f1ff" : "#0f1a30"
          } 100%)`,
        },
      }}
    >
      <DialogTitle
        className="md-full-page-dialog__head"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
          py: 0.75,
          px: { xs: 1.5, sm: 2 },
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "0.4rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
            color: "#fff",
            flexShrink: 0,
            boxShadow: `0 2px 8px ${accent}44`,
          }}
        >
          <Icon icon={icon} size={16} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ lineHeight: 1.25, fontSize: "0.95rem" }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", lineHeight: 1.3, mt: 0.15, fontSize: "0.72rem" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar visor" size="small" sx={{ p: 0.5 }}>
          <iconify-icon icon="mdi:close" width="16" height="16" />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          px: { xs: 2, sm: 3, md: 4, lg: 5 },
          py: { xs: 2, sm: 2.5, md: 3 },
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          className="md-full-page-dialog__body isa-md-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DialogContent>
    </Dialog>
  );
}
