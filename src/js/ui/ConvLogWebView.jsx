/**
 * Presentación web del hilo CONVERSACION_LOG — estilo driver JSX de tickets (SectionCard, gradientes MUI).
 */
import { getReact, getMaterialUI } from "../core/platform.ts";
import { UI } from "../core/platform.ts";
import { mdToHtml, shortId, metaWorthDialog, instructionKeyFromMeta, UsageMetricsGrid, MdRenderer, MdFullPageDialog, FileSearchDialog } from "./shared.jsx";
import { GlassDialog, GlassDialogHeader, glassDialogContentSx, resolveUsageDialogHeader, GlassDialogCloseActions } from "./GlassDialog.jsx";
import { ImageLightboxDialog } from "./ImageLightboxDialog.jsx";
import { tokensFromUsage, attachUsageStats, threadHasUsageStats, sideLogPanelWorthShowing, formatUsageSummary, formatLatencySeconds, usageHasData } from "../core/convLog.ts";
import { archivosCitadosFromMeta, chunksFromMeta, chunkPreview, metaHasFileSearch, compactFileChipLabel } from "../core/fileSearchTrace.js";
import { getGlass } from "../core/platform.ts";

const { useMemo, useState, useRef, useEffect, memo } = getReact();

function useOperativaEnterIds(mensajes, threadKey, { enabled = true } = {}) {
  const seenIdsRef = useRef(new Set());
  const primedKeyRef = useRef(null);
  const [enterIds, setEnterIds] = useState(() => new Set());

  useEffect(() => {
    if (primedKeyRef.current === threadKey) return;
    primedKeyRef.current = threadKey;
    seenIdsRef.current = new Set();
    setEnterIds(new Set());
  }, [threadKey]);

  useEffect(() => {
    if (!enabled) return;
    const msgs = mensajes || [];
    if (primedKeyRef.current !== threadKey) return;

    if (!seenIdsRef.current.size && msgs.length) {
      for (const m of msgs) seenIdsRef.current.add(m.idMsg);
      return;
    }

    const nextEnter = new Set();
    const newlySeen = [];
    for (const m of msgs) {
      if (seenIdsRef.current.has(m.idMsg)) continue;
      seenIdsRef.current.add(m.idMsg);
      newlySeen.push(m);
      if (m.esOperativa) nextEnter.add(m.idMsg);
    }
    // Varias piezas nuevas a la vez (p. ej. log completo tras stream): sin animación de entrada.
    if (nextEnter.size && newlySeen.length === 1) {
      setEnterIds((prev) => new Set([...prev, ...nextEnter]));
    }
  }, [mensajes, threadKey, enabled]);

  return enterIds;
}

const ROLE_META = {
  user: { icon: "mdi:account-outline", title: "Usuario", accent: "#1e90ff" },
  assistant: { icon: "mdi:robot-outline", title: "PatyIA", accent: "#10b981" },
  operativa: { icon: "mdi:cog-outline", title: "Operativa", accent: "#f59e0b" },
};

const ROLE_META_CHAT = {
  ...ROLE_META,
  operativa: { icon: "mdi:cog-sync-outline", title: "Operativa", accent: "#f59e0b" },
};

function roleMetaFor(msg, compactMeta) {
  const rk = roleKey(msg);
  const table = compactMeta ? ROLE_META_CHAT : ROLE_META;
  return table[rk] || ROLE_META.assistant;
}

function roleKey(msg) {
  if (msg.esOperativa) return "operativa";
  if (msg.esUsuario) return "user";
  return "assistant";
}

function msgStoredUserName(msg) {
  return msg.nombreUsuario
    || msg.meta?.nombre_usuario
    || msg.meta?.prompt_variables?.nombre_usuario
    || "";
}

function looksLikeUsername(name, nick) {
  // El nick visible ya viene sin @dominio; comparar también la parte local del nombre guardado.
  const n = String(name ?? "").trim().toUpperCase();
  const k = String(nick ?? "").trim().toUpperCase();
  return Boolean(n && k && (n === k || n.split("@")[0] === k.split("@")[0]));
}

function roleTitle(msg, chatUserDisplayName, chatUserNick) {
  if (msg.esOperativa) return msg.rol || "Operativa";
  if (msg.esUsuario) {
    const fromMsg = String(msgStoredUserName(msg)).trim();
    if (fromMsg && !looksLikeUsername(fromMsg, chatUserNick) && /\s/.test(fromMsg)) return fromMsg;
    if (chatUserDisplayName) return chatUserDisplayName;
    if (fromMsg && !looksLikeUsername(fromMsg, chatUserNick)) return fromMsg;
    return "Usuario";
  }
  return "PatyIA";
}

function roleUserCaption(msg, chatUserNick) {
  if (!msg.esUsuario) return "";
  const nick = String(chatUserNick ?? "").trim();
  if (nick) return nick;
  const fromMsg = String(msgStoredUserName(msg)).trim().split("@")[0];
  return fromMsg && !/\s/.test(fromMsg) ? fromMsg : "";
}

function SectionCard({ icon, title, titleCaption, accent, children, id, onMeta, metaChips, align = "left", muted = false, operativa = false, fecha, fechaIso, streaming = false, footerExtra = null, compact = false }) {
  const { Paper, Stack, Typography, Box, IconButton, Tooltip } = getMaterialUI();
  const { Icon } = UI;
  const color = accent || "#1e90ff";
  const isRight = align === "right";
  const softMuted = muted && !operativa;
  const fullNeon = !compact;

  return (
    <Paper
      id={id}
      className={[
        "conv-msg-card",
        streaming ? "conv-msg-card--streaming" : "",
        compact ? "conv-msg-card--compact" : "conv-msg-card--full",
        operativa ? "conv-msg-card--operativa" : "conv-msg-card--neon",
      ].filter(Boolean).join(" ")}
      elevation={0}
      sx={(theme) => {
        const isLight = theme.palette.mode === "light";
        const base = {
          borderRadius: fullNeon ? "0.75rem" : "0.5rem",
          overflow: "hidden",
          border: 1,
          scrollMarginTop: 12,
          width: fullNeon ? "fit-content" : "100%",
          maxWidth: "100%",
        };
        if (softMuted) {
          return {
            ...base,
            borderColor: theme.palette.action.disabled,
            bgcolor: "transparent",
            background: isLight ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.08)",
            boxShadow: "none",
            transition: "none",
          };
        }
        if (isLight) {
          return {
            ...base,
            borderColor: `${color}40`,
            bgcolor: "transparent",
            background: operativa
              ? `linear-gradient(165deg, ${color}18 0%, rgba(255,251,235,0.72) 42%, rgba(255,255,255,0.55) 100%)`
              : `linear-gradient(165deg, ${color}14 0%, rgba(255,255,255,0.72) 48%, rgba(248,250,252,0.55) 100%)`,
            boxShadow: "0 1px 0 rgba(255,255,255,0.65) inset, 0 8px 28px rgba(15,23,42,0.06)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            transition: "none",
          };
        }
        return {
          ...base,
          borderColor: `${color}32`,
          bgcolor: "transparent",
          background: operativa
            ? `linear-gradient(165deg, ${color}1f 0%, rgba(15,23,42,0.28) 52%, rgba(11,18,32,0.14) 100%)`
            : `linear-gradient(165deg, ${color}16 0%, rgba(15,34,54,0.28) 46%, rgba(11,18,32,0.14) 100%)`,
          boxShadow: fullNeon
            ? `0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 22px rgba(0,0,0,0.16), 0 0 0 1px ${color}1a`
            : `0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px ${color}14`,
          backdropFilter: "blur(14px) saturate(1.15)",
          WebkitBackdropFilter: "blur(14px) saturate(1.15)",
          transition: fullNeon ? "transform 0.2s ease, box-shadow 0.2s ease" : "none",
          ...(fullNeon ? {
            "&:hover": {
              transform: { sm: "translateY(-1px)" },
              boxShadow: `0 1px 0 rgba(255,255,255,0.07) inset, 0 10px 28px rgba(0,0,0,0.2), 0 0 18px ${color}14`,
            },
          } : {}),
        };
      }}
    >
      <Box
        className="conv-msg-card__header"
        sx={(theme) => {
          const isLight = theme.palette.mode === "light";
          const base = {
            px: compact ? { xs: 1.25, sm: 1.5 } : { xs: 2, sm: 2.5 },
            py: compact ? 1 : 1.5,
            borderBottom: 1,
            borderColor: "divider",
          };
          if (fullNeon) {
            if (isLight) {
              return {
                ...base,
                bgcolor: "transparent",
                background: `${color}14`,
                borderColor: "rgba(148,163,184,0.18)",
                ...(isRight
                  ? { borderRight: 3, borderRightColor: color }
                  : { borderLeft: 3, borderLeftColor: color }),
              };
            }
            return {
              ...base,
              bgcolor: "transparent",
              borderColor: "rgba(148,163,184,0.12)",
              background: isRight
                ? `linear-gradient(270deg, ${color}24, transparent 78%)`
                : `linear-gradient(90deg, ${color}24, transparent 78%)`,
              ...(isRight
                ? { borderRight: 3, borderRightColor: color }
                : { borderLeft: 3, borderLeftColor: color }),
            };
          }
          if (operativa) {
            return {
              ...base,
              bgcolor: isLight ? `${color}14` : undefined,
              background: isLight
                ? undefined
                : `linear-gradient(90deg, ${color}30, transparent 72%)`,
            };
          }
          if (isLight) {
            return {
              ...base,
              bgcolor: `${color}10`,
            };
          }
          return {
            ...base,
            background: isRight
              ? `linear-gradient(270deg, ${color}24, transparent 72%)`
              : `linear-gradient(90deg, ${color}24, transparent 72%)`,
          };
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="flex-start"
          flexWrap="wrap"
          useFlexGap
          sx={{ flexDirection: isRight ? "row-reverse" : "row" }}
        >
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="flex-start"
            sx={{ flex: 1, minWidth: 0, flexDirection: isRight ? "row-reverse" : "row" }}
          >
            <Box
              className="conv-msg-card__icon"
              sx={(theme) => {
                const isLight = theme.palette.mode === "light";
                return {
                  width: compact ? 28 : 32,
                  height: compact ? 28 : 32,
                  borderRadius: fullNeon ? "0.5rem" : "0.375rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: operativa || !softMuted
                    ? `linear-gradient(135deg, ${color}, ${color}99)`
                    : `${color}88`,
                  color: "#fff",
                  boxShadow: isLight
                    ? "none"
                    : fullNeon
                      ? `0 4px 16px ${color}55`
                      : operativa || !softMuted ? `0 4px 14px ${color}44` : "none",
                  flexShrink: 0,
                  mt: 0.1,
                };
              }}
            >
              <Icon icon={icon} size={18} />
            </Box>
            <Box
              className={isRight ? "conv-msg-card__title conv-msg-card__title--right" : "conv-msg-card__title"}
              sx={{
                minWidth: 0,
                flex: 1,
                ...(isRight ? { pr: 1.25, textAlign: "right" } : { pl: 0 }),
              }}
            >
              <Typography
                variant={compact ? "body2" : "subtitle1"}
                sx={{
                  fontWeight: 700,
                  letterSpacing: -0.2,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  ...(isRight ? { pr: 0.5 } : {}),
                }}
              >
                {title}
              </Typography>
              {titleCaption ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 0.15,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}
                >
                  {titleCaption}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          {onMeta && (
            <Tooltip title="Trazabilidad del mensaje" arrow>
              <IconButton size="small" onClick={onMeta} aria-label="Ver trazabilidad" sx={{ alignSelf: "flex-start", mt: -0.25 }}>
                <Icon icon="mdi:information-outline" size={20} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {metaChips ? (
          <Box className={`conv-msg-card__meta-row${isRight ? " conv-msg-card__meta-row--right" : ""}`}>
            {metaChips}
          </Box>
        ) : null}
      </Box>
      <Box sx={{ p: compact ? { xs: 1.25, sm: 1.5 } : { xs: 2, sm: 2.5 } }}>{children}</Box>
      {(fecha || footerExtra) ? (
        <Box
          className="conv-msg-card__footer"
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 0.65,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: softMuted ? "action.hover" : "transparent",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            gap={0.75}
            sx={{ flexDirection: align === "right" ? "row-reverse" : "row" }}
          >
            {footerExtra}
            {fecha ? (
              <Typography
                component="time"
                dateTime={fechaIso || undefined}
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.02em",
                  opacity: 0.85,
                  ml: align === "right" ? 0 : "auto",
                  mr: align === "right" ? "auto" : 0,
                  textAlign: align === "right" ? "right" : "left",
                }}
              >
                <span className="conv-msg-card__fecha">{fecha}</span>
              </Typography>
            ) : null}
          </Stack>
        </Box>
      ) : null}
    </Paper>
  );
}

function modelBadgeLabel(raw, maxLen = 28) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? shortId(s, 16, 10) : s;
}

function visionAutoswitchBadge(meta) {
  if (!meta?.modelo_autoswitch_vision) return null;
  const configured = String(meta.modelo_configurado ?? "").trim();
  const used = String(meta.model ?? "").trim();
  if (!configured) {
    return {
      tag: "Visión",
      label: "autoswitch",
      title: used
        ? `Autoswitch visión activo · modelo usado: ${used}`
        : "Autoswitch visión por imágenes adjuntas",
    };
  }
  const label = modelBadgeLabel(configured);
  return {
    tag: "Config",
    label,
    title: used && configured !== used
      ? `Autoswitch visión: ${configured} → ${used}`
      : `Modelo configurado (${configured}); autoswitch visión por imágenes adjuntas`,
  };
}

function formatUsageTs(ts) {
  const raw = String(ts || "").trim();
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "medium" });
  } catch {
    return raw;
  }
}

function friendlyItdconsulta(value) {
  const s = String(value || "").trim();
  if (!s) return s;
  if (/^DATOS_CONTAPYME_MCP$/i.test(s)) return "ContaPyme MCP · datos vivos";
  if (/^REQUIERE_CONTEXTO$/i.test(s)) return "Requiere contexto";
  return s.replace(/_/g, " ");
}

function buildUsageDialogCtxItems(meta) {
  const latency = formatLatencySeconds(meta?.latency_ms);
  const items = [];
  if (meta?.ts) {
    items.push({
      key: "ts",
      label: "Momento",
      value: formatUsageTs(meta.ts),
      icon: "mdi:clock-outline",
      mono: false,
    });
  }

  if (meta?.modelo_autoswitch_vision) {
    const from = String(meta.modelo_configurado ?? "").trim();
    const to = String(meta.model ?? "").trim();
    if (from && to) {
      items.push({
        key: "vision_sw",
        label: "Autoswitch visión",
        value: from === to ? `${from} (sin cambio)` : `${from} → ${to}`,
        icon: "mdi:eye-plus-outline",
        mono: true,
        wide: true,
        vision: true,
      });
    } else {
      if (from) {
        items.push({ key: "model_from", label: "Modelo config.", value: from, icon: "mdi:cog-outline", mono: true, vision: true });
      }
      if (to) {
        items.push({ key: "model_to", label: "Modelo usado", value: to, icon: "mdi:robot-outline", mono: true, vision: true });
      }
      if (!from && !to) {
        items.push({
          key: "vision_sw",
          label: "Autoswitch visión",
          value: "Activo (imágenes adjuntas)",
          icon: "mdi:eye-plus-outline",
          mono: false,
          wide: true,
          vision: true,
        });
      }
    }
  } else if (meta?.model) {
    items.push({ key: "model", label: "Modelo", value: meta.model, icon: "mdi:robot-outline", mono: true });
  }

  if (latency) {
    items.push({ key: "latency", label: "Latencia", value: latency, icon: "mdi:timer-outline", mono: true });
  }
  if (meta?.itdconsulta) {
    items.push({
      key: "itd",
      label: "Tipo",
      value: friendlyItdconsulta(meta.itdconsulta),
      icon: "mdi:tag-outline",
      mono: false,
      wide: /CONTAPYME|MCP/i.test(String(meta.itdconsulta)),
    });
  } else {
    const opKey = String(meta?.extra?.operativa_key || "").trim();
    if (/^contapymeMcpSession$/i.test(opKey)) {
      items.push({
        key: "op",
        label: "Tipo",
        value: "ContaPyme MCP · sesión / datos vivos",
        icon: "mdi:api",
        wide: true,
      });
      const tools = Array.isArray(meta?.http_response?.tools) ? meta.http_response.tools : [];
      if (tools.length) {
        const names = tools.map((t) => String(t?.name ?? "tool")).filter(Boolean);
        items.push({
          key: "tools",
          label: "Tools MCP",
          value: names.join(", ") || `${tools.length} llamada${tools.length === 1 ? "" : "s"}`,
          icon: "mdi:hammer-wrench",
          mono: false,
          wide: true,
        });
      }
    } else if (/^contapymeMcpLogin$/i.test(opKey)) {
      items.push({
        key: "op",
        label: "Tipo",
        value: "ContaPyme MCP · login ASW",
        icon: "mdi:login-variant",
        wide: true,
      });
    }
  }
  return items;
}

function compactMetaLabel(value, maxLen = 14) {
  const v = String(value ?? "").trim();
  if (!v) return v;
  if (v.length <= maxLen) return v;
  return `${v.slice(0, maxLen - 1)}…`;
}

/** Evita chip duplicado cuando el título ya muestra la misma clave (p. ej. OP · generarTitulo). */
function chipRedundantWithTitle(label, cardTitle) {
  const chip = String(label ?? "").trim();
  const title = String(cardTitle ?? "").trim();
  if (!chip || !title) return false;
  if (chip === title) return true;
  const titleKey = title.replace(/^OP\s*·\s*/i, "").trim();
  return chip === titleKey;
}

const META_CHIP_TONE_CLASS = {
  context: "conv-msg-meta-chip--context",
  premisa: "conv-msg-meta-chip--premisa",
  operativa: "conv-msg-meta-chip--operativa",
  model: "conv-msg-meta-chip--model",
  metric: "conv-msg-meta-chip--metric",
  error: "conv-msg-meta-chip--error",
  vision: "conv-msg-meta-chip--vision",
  files: "conv-msg-meta-chip--context",
  neutral: "",
};

function MetaBadge({ tag, label, tone = "neutral", title, onClick }) {
  const toneClass = META_CHIP_TONE_CLASS[tone] || "";
  const clickable = typeof onClick === "function";
  const chipLabel = tone === "files" ? compactFileChipLabel(label) : compactMetaLabel(label);
  return (
    <UsageSummaryChip
      tag={tag}
      label={chipLabel}
      title={title || label}
      className={`conv-msg-usage-chip conv-msg-meta-chip ${toneClass}${clickable ? " conv-msg-meta-chip--clickable" : ""}`.trim()}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    />
  );
}

function buildMetaClassificationChips(meta, cardTitle = "", { isUser = false } = {}) {
  if (!meta) return [];
  const chips = [];
  if (meta.premisas?.length) {
    for (const p of meta.premisas) {
      if (chipRedundantWithTitle(p, cardTitle)) continue;
      chips.push({ key: `p-${p}`, label: p, tone: "premisa", title: `Premisa: ${p}` });
    }
  }
  if (meta.extra?.operativa_key && !chipRedundantWithTitle(meta.extra.operativa_key, cardTitle)) {
    chips.push({
      key: "op",
      label: meta.extra.operativa_key,
      tone: "operativa",
      title: `Consulta operativa: ${meta.extra.operativa_key}`,
    });
  }
  if (meta.itdconsulta && !chipRedundantWithTitle(meta.itdconsulta, cardTitle)) {
    chips.push({
      key: "itd",
      label: meta.itdconsulta,
      tone: "context",
      title: `itdconsulta: ${meta.itdconsulta}`,
    });
  }
  const instrKey = !isUser ? instructionKeyFromMeta(meta) : null;
  if (instrKey && instrKey !== meta.extra?.operativa_key && instrKey !== meta.itdconsulta && !chipRedundantWithTitle(instrKey, cardTitle)) {
    chips.push({ key: "pmpt", label: instrKey, tone: "context", title: `Instrucción: ${instrKey}` });
  }
  return chips;
}

function MetaChipRow({ meta, isUser = false, hideUsageMetrics = false, hideClassificationChips = false, align = "left", cardTitle = "", onFileSearch }) {
  if (!meta) return null;
  const hideUsage = hideUsageMetrics || isUser;
  const tk = meta.tokens?.total ? meta.tokens : tokensFromUsage(meta.usage);
  const chips = hideClassificationChips ? [] : buildMetaClassificationChips(meta, cardTitle, { isUser });
  if (!hideUsage && meta.model) {
    chips.push({
      key: "model",
      label: meta.model,
      tone: "model",
      title: meta.modelo_autoswitch_vision ? "Modelo usado (autoswitch visión)" : "Modelo LLM",
    });
  }
  if (!hideUsage && meta.modelo_autoswitch_vision) {
    const sw = visionAutoswitchBadge(meta);
    if (sw) {
      chips.push({ key: "vision-sw", label: sw.label, tone: "vision", title: sw.title });
    }
  }
  if (!hideUsage && meta.latency_ms != null && meta.latency_ms > 0) {
    chips.push({ key: "lat", label: `${meta.latency_ms}ms`, tone: "metric", title: "Latencia" });
  }
  if (!hideUsage && tk?.total > 0) {
    chips.push({ key: "tok", label: tk.total.toLocaleString("es-CO"), tone: "metric", title: `Tokens: ${tk.total}` });
  }
  if (meta.stream_ok === false) {
    chips.push({ key: "stream", label: "err", tone: "error", title: meta.stream_error || "Stream falló" });
  }
  if (!isUser) {
    const archivos = archivosCitadosFromMeta(meta);
    const openFileSearch = typeof onFileSearch === "function" ? () => onFileSearch(meta) : undefined;
    for (const name of archivos) {
      chips.push({
        key: `file-${name}`,
        label: name,
        tone: "files",
        title: openFileSearch ? `Ver fragmento consultado: ${name}` : name,
        onClick: openFileSearch,
      });
    }
  }

  if (!chips.length) return null;

  const { Stack } = getMaterialUI();
  return (
    <Stack
      direction="row"
      spacing={0.25}
      flexWrap="wrap"
      useFlexGap
      className="conv-msg-meta-chips"
      sx={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}
    >
      {chips.map((c) => (
        <MetaBadge key={c.key} tag={c.tag} label={c.label} tone={c.tone} title={c.title} onClick={c.onClick} />
      ))}
    </Stack>
  );
}

function extractContapymeLoginUrl(text, metaUrl) {
  const fromMeta = String(metaUrl || "").trim();
  if (/^https:\/\/ia\.contapyme\.com\/api\/login\/asw\?/i.test(fromMeta)) return fromMeta;
  const m = String(text || "").match(/https:\/\/ia\.contapyme\.com\/api\/login\/asw\?[^\s<>"'`]+/i);
  return m?.[0] ? m[0].replace(/[),.;]+$/, "") : null;
}

/** OP card: sin URL ASW (ni link markdown ni CTA). */
function scrubContapymeLoginFromText(text) {
  return String(text || "")
    .replace(/https:\/\/ia\.contapyme\.com\/api\/login\/asw\?[^\s<>"'`]+/gi, "")
    .replace(/^login_url:\s*.*$/gim, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Login ASW ContaPyme: botón en el hilo → modal 95vw×95vh (no invade el chat). */
/** Blank hasta F12 = compositing: simula el resize del viewport sobre el iframe host. */
function forceIframeRepaint(iframe) {
  if (!iframe) return;
  const rect = iframe.getBoundingClientRect();
  const w = Math.round(rect.width) || iframe.clientWidth || 0;
  const h = Math.round(rect.height) || iframe.clientHeight || 0;
  if (w < 8 || h < 8) return;
  const prev = { w: iframe.style.width, h: iframe.style.height, v: iframe.style.visibility };
  iframe.style.visibility = "hidden";
  iframe.style.width = `${Math.max(8, w - 1)}px`;
  iframe.style.height = `${Math.max(8, h - 1)}px`;
  void iframe.offsetHeight;
  requestAnimationFrame(() => {
    iframe.style.width = prev.w || "100%";
    iframe.style.height = prev.h || "100%";
    iframe.style.visibility = prev.v || "visible";
    void iframe.offsetHeight;
    window.dispatchEvent(new Event("resize"));
  });
}

function scheduleIframeRepaint(iframe, delaysMs = [0, 80, 200, 500, 1000, 2000, 4000]) {
  if (!iframe) return () => {};
  const timers = delaysMs.map((ms) => window.setTimeout(() => forceIframeRepaint(iframe), ms));
  return () => timers.forEach((id) => window.clearTimeout(id));
}

function ContapymeLoginEmbed({ url, onLoginDone }) {
  const { Stack, Button, Dialog, DialogContent } = getMaterialUI();
  const { Icon } = UI;
  const [open, setOpen] = useState(false);
  const [hostReady, setHostReady] = useState(false);
  const [geomNudge, setGeomNudge] = useState(0);
  const iframeRef = useRef(null);
  const contentRef = useRef(null);
  const tabOpenedRef = useRef(false);
  const doneOnceRef = useRef(false);
  const cancelRepaintRef = useRef(null);
  const signalDone = () => {
    if (doneOnceRef.current) return;
    doneOnceRef.current = true;
    onLoginDone?.();
  };
  const close = () => {
    cancelRepaintRef.current?.();
    cancelRepaintRef.current = null;
    setOpen(false);
    setHostReady(false);
    setGeomNudge(0);
    signalDone();
  };
  useEffect(() => {
    if (!open) {
      setHostReady(false);
      return undefined;
    }
    let cancelled = false;
    let ready = false;
    const mark = () => {
      if (cancelled || ready) return false;
      const el = contentRef.current;
      if ((el?.clientWidth || 0) < 80 || (el?.clientHeight || 0) < 80) return false;
      ready = true;
      setHostReady(true);
      return true;
    };
    if (mark()) return undefined;
    const host = contentRef.current;
    let ro;
    if (host && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => { if (mark()) ro?.disconnect(); });
      ro.observe(host);
    }
    const poll = window.setInterval(() => { if (mark()) window.clearInterval(poll); }, 50);
    const fallback = window.setTimeout(() => { if (!cancelled && !ready) setHostReady(true); }, 2500);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(fallback);
    };
  }, [open, url]);
  useEffect(() => {
    if (!open || !hostReady) return undefined;
    const host = contentRef.current;
    const iframe = iframeRef.current;
    cancelRepaintRef.current?.();
    const onLoad = () => {
      cancelRepaintRef.current?.();
      cancelRepaintRef.current = scheduleIframeRepaint(iframeRef.current);
      // +1px en paper = mismo efecto que abrir DevTools (reflow del host).
      setGeomNudge((n) => (n === 0 ? 1 : 0));
      window.setTimeout(() => setGeomNudge(0), 60);
    };
    iframe?.addEventListener("load", onLoad);
    cancelRepaintRef.current = scheduleIframeRepaint(iframe);
    let ro;
    if (host && typeof ResizeObserver !== "undefined") {
      let last = "";
      ro = new ResizeObserver(() => {
        const key = `${host.clientWidth}x${host.clientHeight}`;
        if (key === last) return;
        last = key;
        forceIframeRepaint(iframeRef.current);
      });
      ro.observe(host);
    }
    return () => {
      iframe?.removeEventListener("load", onLoad);
      cancelRepaintRef.current?.();
      cancelRepaintRef.current = null;
      ro?.disconnect();
    };
  }, [open, hostReady, url]);
  useEffect(() => {
    if (!tabOpenedRef.current) return undefined;
    const onVis = () => {
      if (document.visibilityState === "visible") signalDone();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [url]);
  if (!url) return null;
  // Dialog MUI plano (no GlassDialog): loginDialogProps / backdrop-filter rompen el paint del iframe.
  return (
    <>
      <Stack
        className="contapyme-login-embed"
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        useFlexGap
        sx={{ mt: 1.5, alignItems: { xs: "stretch", sm: "center" } }}
      >
        <Button
          variant="contained"
          size="medium"
          onClick={(e) => {
            doneOnceRef.current = false;
            // Evita aria-hidden en #root con el CTA aún enfocado (warning a11y del Modal).
            e.currentTarget.blur();
            setOpen(true);
          }}
          startIcon={<Icon icon="mdi:login-variant" size={18} />}
          sx={{ textTransform: "none", fontWeight: 700, alignSelf: { sm: "flex-start" } }}
        >
          Iniciar sesión ContaPyme®
        </Button>
        <Button
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          variant="text"
          onClick={() => { tabOpenedRef.current = true; }}
          sx={{ textTransform: "none", fontWeight: 600, alignSelf: { sm: "flex-start" } }}
        >
          Abrir en pestaña
        </Button>
      </Stack>
      <Dialog
        open={open}
        onClose={close}
        maxWidth={false}
        fullWidth={false}
        transitionDuration={0}
        disableRestoreFocus
        className="contapyme-asw-login-dialog"
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              backgroundColor: "rgba(11,18,32,0.72)",
            },
          },
        }}
        PaperProps={{
          elevation: 8,
          className: "contapyme-asw-login-paper",
          sx: {
            width: `calc(95vw + ${geomNudge}px)`,
            height: `calc(95vh + ${geomNudge}px)`,
            maxWidth: "95vw",
            maxHeight: "95vh",
            m: "2.5vh auto",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 2,
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            filter: "none",
            transform: "none",
            bgcolor: "#0b1220",
            backgroundImage: "none",
          },
        }}
      >
        <GlassDialogHeader
          title="Conectar ContaPyme®"
          subtitle="Sesión ASW · inicia sesión y cierra cuando veas «En línea»"
          icon="mdi:domain"
          accent="#1e90ff"
          onClose={close}
          closeAutoFocus
        />
        <DialogContent
          ref={contentRef}
          dividers
          className="contapyme-asw-login-content"
          sx={{
            p: 0,
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0",
            minHeight: 0,
            position: "relative",
            overflow: "hidden",
            bgcolor: "#fff",
            backgroundImage: "none",
            borderTop: 0,
          }}
        >
          {hostReady ? (
            <iframe
              ref={iframeRef}
              title="Iniciar sesión en ContaPyme"
              src={url}
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              allow="clipboard-read; clipboard-write"
              className="contapyme-asw-login-iframe"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MsgBody({ text, imagenes, audios, audiosTranscripcion, align = "left", onImageClick, streaming = false, loginUrl: loginUrlProp, disableLoginEmbed = false, onContapymeLoginDone }) {
  const { Typography, Box } = getMaterialUI();
  const raw = String(text || "");
  const placeholderOnly = /^\((?:imagen adjunta|nota de voz)\)$/i.test(raw.trim());
  const hasText = Boolean(raw.trim()) && !placeholderOnly;
  // CTA visible también durante stream (ISS espera sesión con SSE abierto).
  const loginUrl = disableLoginEmbed ? null : extractContapymeLoginUrl(raw, loginUrlProp);
  const displayRaw = disableLoginEmbed
    ? scrubContapymeLoginFromText(raw)
    : loginUrl
      ? raw.replace(loginUrl, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
      : raw;
  const html = mdToHtml(displayRaw || (loginUrl ? "Inicia sesión en ContaPyme® con el botón de abajo." : ""));
  return (
    <>
      {streaming && !hasText && !audios?.length ? (
        <Box className="conv-stream-typing" aria-label="PatyIA está escribiendo" role="status">
          <span /><span /><span />
        </Box>
      ) : (
        <Box className={`conv-msg-body-wrap${streaming ? " conv-msg-body-wrap--streaming" : ""}`}>
          {(displayRaw || !loginUrl) ? (
          <Typography
            component="div"
            variant="body1"
            className={`conv-msg-body${streaming ? " conv-msg-body--streaming" : ""}`}
            sx={{
              lineHeight: 1.65,
              color: "text.primary",
              "& p": { m: 0, mb: 1.25 },
              "& p:last-child": { mb: 0 },
              "& a": { color: "primary.main", wordBreak: "break-word" },
              "& img": {
                width: 100,
                height: 100,
                maxWidth: 100,
                maxHeight: 100,
                objectFit: "cover",
                objectPosition: "center",
                borderRadius: "0.5rem",
                my: 1,
                cursor: "zoom-in",
                display: "inline-block",
                verticalAlign: "middle",
              },
              "& pre, & code": { fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.85em" },
            }}
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={(e) => {
              const img = e.target?.closest?.("img");
              if (img?.src && onImageClick) {
                e.preventDefault();
                onImageClick(img.src);
              }
            }}
          />
          ) : null}
          {streaming && hasText ? <Box component="span" className="conv-stream-cursor" aria-hidden /> : null}
          {loginUrl ? <ContapymeLoginEmbed url={loginUrl} onLoginDone={streaming ? undefined : onContapymeLoginDone} /> : null}
        </Box>
      )}
      {imagenes?.length > 0 && (
        <ConvMsgImages items={imagenes} align={align} onImageClick={onImageClick} />
      )}
      {audios?.length > 0 && (
        <ConvMsgAudios items={audios} transcriptions={audiosTranscripcion} align={align} />
      )}
    </>
  );
}

function ConvMsgAudios({ items, transcriptions, align = "right" }) {
  const { Box, Typography } = getMaterialUI();
  const renderable = (items || []).filter((src) => String(src || "").trim().startsWith("data:audio/") || /^https?:\/\//i.test(String(src || "").trim()));
  if (!renderable.length) return null;
  return (
    <Box
      className={`conv-msg-audios conv-msg-audios--${align}`}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mt: 1.25,
        alignItems: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      {renderable.map((src, idx) => (
        <Box key={`${idx}-${String(src).slice(0, 32)}`} className="conv-msg-audio-item">
          <audio controls preload="metadata" src={src} aria-label={`Nota de voz ${idx + 1}`} />
          {transcriptions?.[idx] ? (
            <Typography variant="caption" component="p" className="conv-msg-audio-transcript" sx={{ mt: 0.5, opacity: 0.85 }}>
              {transcriptions[idx]}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

function ConvMsgImages({ items, align = "right", onImageClick }) {
  const { Box } = getMaterialUI();
  const renderable = (items || []).filter((src) => {
    const s = String(src || "").trim();
    if (/^\[file_id:/i.test(s)) return false;
    return s.startsWith("data:image/") || s.startsWith("http://") || s.startsWith("https://");
  });
  if (!renderable.length) return null;
  return (
    <Box
      className={`conv-msg-images conv-msg-images--${align}`}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        mt: 1.25,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
      }}
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

function UsageSummaryChip({ label, className = "", title, tag, onClick, role, tabIndex }) {
  const showVal = label != null && String(label).trim() !== "";
  const clickable = typeof onClick === "function";
  const handleKeyDown = clickable
    ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      }
    : undefined;
  return (
    <span
      className={className || "conv-msg-usage-chip"}
      title={title || (showVal ? label : tag)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role}
      tabIndex={tabIndex}
    >
      <span className="conv-msg-usage-chip__inner">
        {tag ? <span className="conv-msg-usage-chip__key">{tag}</span> : null}
        {showVal ? <span className="conv-msg-usage-chip__val">{label}</span> : null}
      </span>
    </span>
  );
}

function isContapymeMcpMeta(meta) {
  const hay = [
    meta?.itdconsulta,
    meta?.engine,
    meta?.extra?.operativa_key,
    meta?.extra?.operativa,
  ].filter(Boolean).join(" ");
  return /CONTAPYME|MCP|contapymeMcp/i.test(hay);
}

function UsageDialogMetaPanel({ meta }) {
  const { Box } = getMaterialUI();
  const { Icon } = UI;
  const ctxItems = buildUsageDialogCtxItems(meta);
  if (!ctxItems.length) return null;
  const isMcp = isContapymeMcpMeta(meta);

  return (
    <Box className="conv-usage-dialog__meta conv-usage-dialog__meta--ctx">
      <div className="conv-usage-dialog__meta-head">
        <span className="conv-usage-dialog__meta-eyebrow">Contexto del turno</span>
        {isMcp ? (
          <span className="conv-usage-dialog__meta-badge conv-usage-dialog__meta-badge--mcp">
            <Icon icon="mdi:api" size={14} />
            Sin costo LLM
          </span>
        ) : null}
      </div>
      <div className="conv-usage-dialog__ctx-grid">
        {ctxItems.map((item) => (
          <div
            key={item.key}
            className={[
              "conv-usage-dialog__ctx-item",
              item.wide ? "conv-usage-dialog__ctx-item--wide" : "",
              item.vision ? "conv-usage-dialog__ctx-item--vision" : "",
            ].filter(Boolean).join(" ") || undefined}
          >
            <span className="conv-usage-dialog__ctx-icon" aria-hidden>
              <Icon icon={item.icon || "mdi:information-outline"} size={16} />
            </span>
            <span className="conv-usage-dialog__ctx-copy">
              <span className="conv-usage-dialog__ctx-k">{item.label}</span>
              <span className={`conv-usage-dialog__ctx-v${item.mono ? " conv-usage-dialog__mono" : ""}`}>
                {item.value}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Box>
  );
}

function safeJsonPreview(value, maxLen = 600) {
  if (value == null) return "";
  let raw;
  try {
    raw = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    raw = String(value);
  }
  raw = raw.replace(/\r\n/g, "\n").trim();
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}… [truncado ${raw.length} chars]`;
}

function McpToolsSection({ tools, GlassSection, GlassInner }) {
  const { Typography, Box, Chip, Stack } = getMaterialUI();
  if (!Array.isArray(tools) || !tools.length) return null;

  const body = (
    <Box className="conv-usage-dialog__section-body">
      <Stack spacing={1.5}>
        {tools.map((tool, idx) => {
          const name = String(tool?.name ?? `Tool ${idx + 1}`);
          const status = String(tool?.status ?? "");
          const error = tool?.error;
          const args = safeJsonPreview(tool?.arguments);
          const output = safeJsonPreview(tool?.output);
          return (
            <Box key={`${name}-${idx}`} className="conv-usage-dialog__mcp-tool">
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                <iconify-icon icon="mdi:hammer-wrench" width="16" height="16" />
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                  {name}
                </Typography>
                {status ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={status}
                    className={`conv-usage-dialog__mcp-tool-status${error ? " conv-usage-dialog__mcp-tool-status--error" : ""}`}
                  />
                ) : null}
              </Stack>
              {args ? (
                <Box className="conv-usage-dialog__mcp-tool-block" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.25 }}>
                    Argumentos
                  </Typography>
                  <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }}>
                    {args}
                  </Typography>
                </Box>
              ) : null}
              {output ? (
                <Box className="conv-usage-dialog__mcp-tool-block">
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.25 }}>
                    Resultado
                  </Typography>
                  <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }}>
                    {output}
                  </Typography>
                </Box>
              ) : null}
              {error ? (
                <Box className="conv-usage-dialog__mcp-tool-block conv-usage-dialog__mcp-tool-block--error">
                  <Typography variant="caption" color="error" component="div" sx={{ mb: 0.25 }}>
                    Error
                  </Typography>
                  <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0 }}>
                    {safeJsonPreview(error)}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );

  if (GlassSection && GlassInner) {
    return (
      <GlassSection
        sectionKey="conv-usage-mcp-tools"
        className="conv-usage-dialog__mcp-tools-section"
        title="Tools MCP"
        subtitle={`${tools.length} llamada${tools.length === 1 ? "" : "s"} al servidor ContaPyme`}
        accent="#f59e0b"
        tone="warn"
        headerSx={{ borderRadius: "0.75rem 0.75rem 0 0" }}
        bodySx={{ pt: { xs: 1.25, sm: 1.5 } }}
      >
        <GlassInner>{body}</GlassInner>
      </GlassSection>
    );
  }

  return (
    <Box className="conv-usage-dialog__section-card conv-usage-dialog__section-card--mcp-tools">
      <div className="conv-usage-dialog__section-head">
        <Typography component="h3" variant="subtitle2" className="conv-usage-dialog__section-title">
          Tools MCP
        </Typography>
        <Typography variant="caption" color="text.secondary" className="conv-usage-dialog__section-sub">
          {tools.length} llamada{tools.length === 1 ? "" : "s"} al servidor ContaPyme
        </Typography>
      </div>
      {body}
    </Box>
  );
}

function UsageStatsDialog({ open, onClose, stats, msgLabel, fecha, meta }) {
  const { DialogContent, Typography, Box, Chip, Stack, Tooltip, IconButton } = getMaterialUI();
  const { useMemo, useState } = getReact();
  let glass = null;
  try { glass = getGlass(); } catch (_) { glass = null; }
  const { GlassSection, GlassInner } = glass || {};
  if (!stats) return null;

  const sections = [
    {
      key: "msg",
      title: "Mensaje",
      subtitle: "Costo y tokens de este turno",
      tokens: stats.tokens,
      cost: stats.cost,
      accent: "#34d399",
      tone: "success",
      icon: <UI.Icon icon="mdi:message-text-outline" size={18} />,
      show: true,
    },
    {
      key: "prev",
      title: "Acumulado anterior",
      subtitle: "Suma del hilo antes de este mensaje",
      tokens: stats.previousTokens,
      cost: stats.previousCost,
      accent: "#60a5fa",
      tone: "blue",
      icon: <UI.Icon icon="mdi:history" size={18} />,
      show: usageHasData(stats.previousTokens, stats.previousCost),
    },
    {
      key: "cum",
      title: "Total acumulado",
      subtitle: "Suma del hilo incluyendo este mensaje",
      tokens: stats.cumulativeTokens,
      cost: stats.cumulativeCost,
      accent: "#f59e0b",
      tone: "warn",
      icon: <UI.Icon icon="mdi:sigma" size={18} />,
      show: usageHasData(stats.cumulativeTokens, stats.cumulativeCost),
    },
  ].filter((s) => s.show);

  const chunks = useMemo(() => chunksFromMeta(meta), [meta]);
  const archivos = useMemo(() => archivosCitadosFromMeta(meta), [meta]);
  const mcpTools = useMemo(() => {
    const opKey = String(meta?.extra?.operativa_key ?? "");
    if (!/^contapymeMcpSession$/i.test(opKey)) return [];
    const tools = meta?.http_response?.tools;
    return Array.isArray(tools) ? tools : [];
  }, [meta]);
  const [openChunk, setOpenChunk] = useState(null);

  const opKey = meta?.extra?.operativa_key;
  const header = resolveUsageDialogHeader(msgLabel, fecha, opKey);
  const showMetaPanel = Boolean(
    meta?.ts
    || meta?.model
    || meta?.modelo_autoswitch_vision
    || formatLatencySeconds(meta?.latency_ms)
    || meta?.itdconsulta,
  );

  return (
    <>
      <GlassDialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        paperMaxWidth="42rem"
        paperClassName="conv-usage-dialog-paper"
        header={(
          <GlassDialogHeader
            icon={header.icon}
            title={header.title}
            subtitle={header.subtitle}
            accent={header.accent}
            onClose={onClose}
          />
        )}
      >
        <DialogContent
          dividers
          className="conv-usage-dialog"
          sx={glassDialogContentSx({
            p: { xs: 1.75, sm: 2.25 },
            maxHeight: "min(72dvh, 40rem)",
            overflow: "auto",
          })}
        >
          <Box className="conv-usage-dialog__stack">
            {showMetaPanel ? <UsageDialogMetaPanel meta={meta} /> : null}
            {mcpTools.length ? (
              <McpToolsSection tools={mcpTools} GlassSection={GlassSection} GlassInner={GlassInner} />
            ) : null}
            {sections.map((section) => (
              <UsageDialogSection
                key={section.key}
                section={section}
                GlassSection={GlassSection}
                GlassInner={GlassInner}
              />
            ))}
            {(chunks.length || archivos.length) ? (
              GlassSection ? (
                <GlassSection
                  sectionKey="conv-usage-chunks"
                  className="conv-usage-dialog__chunks-section"
                  title="Fragmentos citados"
                  accent="#7c3aed"
                  tone="purple"
                  headerSx={{ borderRadius: "0.75rem 0.75rem 0 0" }}
                  bodySx={{ pt: { xs: 1.25, sm: 1.5 } }}
                >
                  <Typography variant="caption" color="text.secondary" component="div" className="conv-usage-dialog__section-sub" sx={{ mb: 1 }}>
                    {archivos.length
                      ? `Chunks extraídos por file_search (${chunks.length} de ${archivos.length} archivo${archivos.length === 1 ? "" : "s"}).`
                      : `${chunks.length} fragmento${chunks.length === 1 ? "" : "s"} del message.`}
                  </Typography>
                  {archivos.length ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap className="conv-usage-dialog__files" sx={{ mb: 1 }}>
                      {archivos.map((name) => {
                        const clickable = chunks.some((c) => c.filename === name);
                        return (
                          <Chip
                            key={name}
                            size="small"
                            variant="outlined"
                            clickable={clickable}
                            onClick={clickable ? () => {
                              const first = chunks.find((c) => c.filename === name);
                              if (first) setOpenChunk(first);
                            } : undefined}
                            icon={<iconify-icon icon="mdi:file-document-outline" width="14" height="14" />}
                            label={name}
                            title={clickable ? `Ver fragmentos de ${name}` : name}
                            className="conv-usage-dialog__file-chip"
                          />
                        );
                      })}
                    </Stack>
                  ) : null}
                  <Stack spacing={0.75} className="conv-usage-dialog__chunks">
                    {chunks.map((c) => (
                      <Box
                        key={c.key}
                        className="conv-usage-dialog__chunk"
                        onClick={() => setOpenChunk(c)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenChunk(c);
                          }
                        }}
                        aria-label={`Ver fragmento de ${c.filename || c.fileId || "texto"}`}
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.35 }}>
                          <iconify-icon icon="mdi:text-box-search-outline" width="16" height="16" />
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                            {c.filename || c.fileId || "fragmento"}
                          </Typography>
                          {c.score != null ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`score ${Number(c.score).toFixed(3)}`}
                              className="conv-usage-dialog__chunk-score"
                            />
                          ) : null}
                          <Tooltip title="Ver fragmento en full-page">
                            <IconButton size="small" aria-label="Abrir fragmento" className="conv-usage-dialog__chunk-open">
                              <iconify-icon icon="mdi:fullscreen" width="16" height="16" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        <Typography
                          variant="caption"
                          component="pre"
                          className="conv-usage-dialog__chunk-preview"
                          sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0, fontFamily: "inherit" }}
                        >
                          {chunkPreview(c.text, 280)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </GlassSection>
              ) : (
                <Box className="conv-usage-dialog__section-card conv-usage-dialog__section-card--chunks">
                  <div className="conv-usage-dialog__section-head">
                    <Typography component="h3" variant="subtitle2" className="conv-usage-dialog__section-title">
                      Fragmentos citados
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="conv-usage-dialog__section-sub">
                      {archivos.length
                        ? `Chunks extraídos por file_search (${chunks.length} de ${archivos.length} archivo${archivos.length === 1 ? "" : "s"}).`
                        : `${chunks.length} fragmento${chunks.length === 1 ? "" : "s"} del message.`}
                    </Typography>
                  </div>
                  {archivos.length ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap className="conv-usage-dialog__files">
                      {archivos.map((name) => {
                        const clickable = chunks.some((c) => c.filename === name);
                        return (
                          <Chip
                            key={name}
                            size="small"
                            variant="outlined"
                            clickable={clickable}
                            onClick={clickable ? () => {
                              const first = chunks.find((c) => c.filename === name);
                              if (first) setOpenChunk(first);
                            } : undefined}
                            icon={<iconify-icon icon="mdi:file-document-outline" width="14" height="14" />}
                            label={name}
                            title={clickable ? `Ver fragmentos de ${name}` : name}
                            className="conv-usage-dialog__file-chip"
                          />
                        );
                      })}
                    </Stack>
                  ) : null}
                  <Stack spacing={0.75} className="conv-usage-dialog__chunks">
                    {chunks.map((c) => (
                      <Box
                        key={c.key}
                        className="conv-usage-dialog__chunk"
                        onClick={() => setOpenChunk(c)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenChunk(c);
                          }
                        }}
                        aria-label={`Ver fragmento de ${c.filename || c.fileId || "texto"}`}
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.35 }}>
                          <iconify-icon icon="mdi:text-box-search-outline" width="16" height="16" />
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                            {c.filename || c.fileId || "fragmento"}
                          </Typography>
                          {c.score != null ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`score ${Number(c.score).toFixed(3)}`}
                              className="conv-usage-dialog__chunk-score"
                            />
                          ) : null}
                          <Tooltip title="Ver fragmento en full-page">
                            <IconButton size="small" aria-label="Abrir fragmento" className="conv-usage-dialog__chunk-open">
                              <iconify-icon icon="mdi:fullscreen" width="16" height="16" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        <Typography
                          variant="caption"
                          component="pre"
                          className="conv-usage-dialog__chunk-preview"
                          sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", m: 0, fontFamily: "inherit" }}
                        >
                          {chunkPreview(c.text, 280)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )
            ) : null}
          </Box>
        </DialogContent>
        <GlassDialogCloseActions onClose={onClose} />
      </GlassDialog>
      <MdFullPageDialog
        open={Boolean(openChunk)}
        onClose={() => setOpenChunk(null)}
        source={openChunk?.text || ""}
        title={openChunk ? `Fragmento · ${openChunk.filename || openChunk.fileId || "texto exacto"}` : "Fragmento"}
        subtitle={
          openChunk
            ? [
                openChunk.score != null ? `score ${Number(openChunk.score).toFixed(3)}` : "",
                openChunk.queries?.length ? `Queries: ${openChunk.queries.join(" · ")}` : "",
              ].filter(Boolean).join("  ·  ")
            : ""
        }
        accent="#7c3aed"
        icon="mdi:text-box-search-outline"
      />
    </>
  );
}

function UsageDialogSection({ section, GlassSection, GlassInner }) {
  const { Box, Typography, Stack } = getMaterialUI();
  const { Icon } = UI;
  const cost = section?.cost;
  const tokens = section?.tokens;
  const totalCost = Number(cost?.total ?? 0) || 0;
  const totalTokens = Number(tokens?.total ?? 0) || 0;
  const reasoning = Number(tokens?.reason ?? tokens?.reasoning ?? 0) || 0;
  const totalTokLabel = totalTokens ? totalTokens.toLocaleString("es-CO") : "—";
  const costLabel = totalCost > 0 ? `$${totalCost.toFixed(6)}` : "—";
  const reasonLabel = reasoning > 0
    ? `${reasoning.toLocaleString("es-CO")} razon.`
    : null;
  const empty = totalCost <= 0 && totalTokens <= 0;

  const body = (
    <Box className="conv-usage-dialog__section-body">
      {empty ? (
        <Box className="conv-usage-dialog__empty" role="status">
          <span className="conv-usage-dialog__empty-icon" aria-hidden>
            <Icon icon="mdi:currency-usd-off" size={18} />
          </span>
          <Box className="conv-usage-dialog__empty-copy">
            <Typography component="p" className="conv-usage-dialog__empty-title">
              Sin costo ni tokens LLM
            </Typography>
            <Typography component="p" className="conv-usage-dialog__empty-sub">
              Este turno no pasó por OpenAI (p. ej. ContaPyme MCP u operativa local).
            </Typography>
          </Box>
        </Box>
      ) : (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1.25, sm: 2 }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          className="conv-usage-dialog__headline"
        >
          <Box className="conv-usage-dialog__headline-main">
            <Typography variant="overline" className="conv-usage-dialog__headline-k" sx={{ lineHeight: 1, display: "block", opacity: 0.7 }}>
              Costo
            </Typography>
            <Typography
              variant="h4"
              component="span"
              className={`conv-usage-dialog__headline-v conv-usage-dialog__headline-v--${section.key}`}
              sx={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.05, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
            >
              {costLabel}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" className="conv-usage-dialog__headline-meta">
            <Box className="conv-usage-dialog__headline-meta-item">
              <Typography variant="overline" sx={{ lineHeight: 1, display: "block", opacity: 0.7 }}>
                Tokens
              </Typography>
              <Typography
                variant="h6"
                component="span"
                className="conv-usage-dialog__headline-meta-v"
                sx={{ fontWeight: 700, lineHeight: 1.1, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
              >
                {totalTokLabel}
              </Typography>
            </Box>
            {reasonLabel ? (
              <Box className="conv-usage-dialog__headline-meta-item conv-usage-dialog__headline-meta-item--reason">
                <Typography variant="overline" sx={{ lineHeight: 1, display: "block", opacity: 0.7 }}>
                  Razonamiento
                </Typography>
                <Typography
                  variant="body1"
                  component="span"
                  sx={{ fontWeight: 600, lineHeight: 1.1, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
                >
                  {reasonLabel}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Stack>
      )}
      {!empty ? (
        <Box className="conv-usage-dialog__metrics-wrap">
          <Typography component="p" variant="caption" className="conv-usage-dialog__metrics-caption">
            Desglose por etapa
          </Typography>
          <UsageMetricsGrid
            className="conv-usage-dialog__metrics"
            hideRowLabels
            sections={[{ key: section.key, label: section.title, tokens: section.tokens, cost: section.cost }]}
          />
        </Box>
      ) : null}
    </Box>
  );

  if (!GlassSection) {
    return (
      <Box className={`conv-usage-dialog__section-card conv-usage-dialog__section-card--${section.key}`}>
        <div className="conv-usage-dialog__section-head">
          <Typography component="h3" variant="subtitle2" className="conv-usage-dialog__section-title">
            {section.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" className="conv-usage-dialog__section-sub">
            {section.subtitle}
          </Typography>
        </div>
        {body}
      </Box>
    );
  }

  return (
    <GlassSection
      sectionKey={`conv-usage-${section.key}`}
      className={`conv-usage-dialog__glass-section conv-usage-dialog__glass-section--${section.key}`}
      title={
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: -0.2 }}>
            {section.title}
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            {section.subtitle}
          </Typography>
        </Stack>
      }
      icon={section.icon}
      accent={section.accent}
      tone={section.tone}
      headerSx={{ borderRadius: "0.75rem 0.75rem 0 0" }}
      bodySx={{ pt: 1.25, pb: { xs: 1.25, sm: 1.5 } }}
    >
      {body}
    </GlassSection>
  );
}

function UsageStatsColumn({ stats, align = "right", msgLabel, fecha, meta, isUser = false }) {
  const { Box } = getMaterialUI();
  const [open, setOpen] = useState(false);

  const modelRaw = String(meta?.model ?? "").trim();
  const modelLabel = modelRaw ? modelBadgeLabel(modelRaw) : "";
  const latencyLabel = formatLatencySeconds(meta?.latency_ms);
  const autoswitchBadge = visionAutoswitchBadge(meta);
  const metaTk = meta?.tokens?.total ? meta.tokens : tokensFromUsage(meta?.usage);
  const metaTokTotal = Number(metaTk?.total ?? 0) || 0;
  const metaTokLabel = metaTokTotal > 0 ? metaTokTotal.toLocaleString("es-CO") : "";
  const contextChips = buildMetaClassificationChips(meta, msgLabel, { isUser });
  const showMetaBadges = Boolean(modelLabel || latencyLabel || autoswitchBadge || metaTokLabel || contextChips.length);

  const hasUsage = Boolean(
    stats
    && (usageHasData(stats.tokens, stats.cost) || usageHasData(stats.previousTokens, stats.previousCost)),
  );
  if (!showMetaBadges && !hasUsage) return null;

  const msgSummary = hasUsage ? formatUsageSummary(stats.tokens, stats.cost) : null;
  const cumSummary = hasUsage ? formatUsageSummary(stats.cumulativeTokens, stats.cumulativeCost) : null;
  const showCum = hasUsage && !isUser && usageHasData(stats.cumulativeTokens, stats.cumulativeCost);

  const groups = hasUsage
    ? [
      { key: "msg", label: "Mensaje", summary: msgSummary },
      ...(showCum ? [{ key: "cum", label: "Acumulado", summary: cumSummary }] : []),
    ]
    : [];

  const openDialog = (e) => {
    if (!hasUsage) return;
    e?.stopPropagation?.();
    setOpen(true);
  };

  return (
    <>
      <Box
        className={[
          "conv-msg-usage-stats",
          `conv-msg-usage-stats--${align}`,
          hasUsage ? "conv-msg-usage-stats--clickable" : "",
        ].filter(Boolean).join(" ")}
        role={hasUsage ? "button" : undefined}
        tabIndex={hasUsage ? 0 : undefined}
        title={hasUsage ? "Clic para ver desglose completo" : undefined}
        aria-label={hasUsage ? "Ver detalle de uso: costo USD y tokens" : undefined}
        onClick={hasUsage ? openDialog : undefined}
        onKeyDown={hasUsage ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openDialog();
          }
        } : undefined}
        sx={{
          flexShrink: 0,
          width: "fit-content",
          maxWidth: { xs: "min(100%, 18rem)", sm: groups.length > 1 ? "22rem" : "18rem" },
          pt: 0.25,
          alignSelf: "flex-start",
          cursor: hasUsage ? "pointer" : undefined,
          ...(hasUsage ? {
            transition: "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.16s ease",
            "&:hover": {
              borderColor: "rgba(0, 229, 255, 0.72)",
              background: "linear-gradient(165deg, rgba(14, 26, 48, 0.98), rgba(20, 32, 58, 0.92))",
              boxShadow: "0 0 0 1px rgba(0, 229, 255, 0.35), 0 12px 36px rgba(30, 144, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
              transform: "translateY(-2px)",
            },
            "&:active": {
              transform: "translateY(0)",
              boxShadow: "0 0 0 1px rgba(0, 229, 255, 0.22), 0 4px 16px rgba(30, 144, 255, 0.18)",
            },
            'html[data-mui-color-scheme="light"] &:hover': {
              borderColor: "rgba(30, 144, 255, 0.48)",
              background: "linear-gradient(165deg, #f0f9ff, #eef2ff)",
              boxShadow: "0 0 0 1px rgba(30, 144, 255, 0.16), 0 8px 24px rgba(30, 144, 255, 0.14)",
            },
            'html[data-mui-color-scheme="light"] &:active': {
              background: "#e0f2fe",
            },
          } : {}),
        }}
      >
        {showMetaBadges ? (
          <Box className={`conv-msg-usage-stats__meta conv-msg-usage-stats__meta--${align}`}>
            {contextChips.map((c) => (
              <MetaBadge key={c.key} label={c.label} tone={c.tone} title={c.title} />
            ))}
            {modelLabel ? (
              <UsageSummaryChip
                tag="MODELO"
                label={modelLabel}
                className="conv-msg-usage-chip conv-msg-usage-chip--model"
                title={meta?.modelo_autoswitch_vision
                  ? (modelRaw && modelRaw !== modelLabel
                    ? `Modelo usado (autoswitch visión): ${modelRaw}`
                    : "Modelo usado tras autoswitch visión")
                  : (modelRaw && modelRaw !== modelLabel ? `Modelo: ${modelRaw}` : "Modelo LLM")}
              />
            ) : null}
            {autoswitchBadge ? (
              <UsageSummaryChip
                tag={autoswitchBadge.tag}
                label={autoswitchBadge.label}
                className="conv-msg-usage-chip conv-msg-usage-chip--vision"
                title={autoswitchBadge.title}
              />
            ) : null}
            {latencyLabel ? (
              <UsageSummaryChip
                tag="LAT"
                label={latencyLabel}
                className="conv-msg-usage-chip conv-msg-usage-chip--latency"
                title="Tiempo de respuesta"
              />
            ) : null}
            {metaTokLabel && !hasUsage ? (
              <UsageSummaryChip
                tag="TOK"
                label={metaTokLabel}
                className="conv-msg-usage-chip conv-msg-usage-chip--tokens"
                title={`Tokens: ${metaTokLabel}`}
              />
            ) : null}
          </Box>
        ) : null}
        {groups.length > 0 ? (
          <Box className={`conv-msg-usage-stats__groups conv-msg-usage-stats__groups--${align}`}>
            {groups.map((group) => (
              <Box key={group.key} className={`conv-msg-usage-stats__group conv-msg-usage-stats__group--${group.key}`}>
                <UsageSummaryChip
                  tag={group.key === "msg" ? "MSG" : "ACUM"}
                  className={[
                    "conv-msg-usage-chip",
                    "conv-msg-usage-chip--scope",
                    group.key === "msg" ? "conv-msg-usage-chip--scope-msg" : "conv-msg-usage-chip--scope-prev",
                  ].join(" ")}
                  title={group.label}
                />
                <UsageSummaryChip
                  tag="USD"
                  label={group.summary.usdText}
                  className="conv-msg-usage-chip conv-msg-usage-chip--usd"
                  title="Costo USD"
                />
                <UsageSummaryChip
                  tag="TOK"
                  label={group.summary.tokensText}
                  className="conv-msg-usage-chip conv-msg-usage-chip--tokens"
                  title={group.key === "msg" ? "Tokens de este mensaje" : "Tokens acumulados del hilo (incluye este mensaje)"}
                />
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
      <UsageStatsDialog
        open={open && hasUsage}
        onClose={() => setOpen(false)}
        stats={stats}
        msgLabel={msgLabel}
        fecha={fecha}
        meta={meta}
      />
    </>
  );
}

function MsgRatingRow({ calificacion, onRate, disabled = false, busy = false, align = "right" }) {
  const { Stack, IconButton, Tooltip, CircularProgress } = getMaterialUI();
  const { Icon } = UI;
  const rated = calificacion !== undefined && calificacion !== null;
  const useful = calificacion === 1;
  const notUseful = calificacion === 0;
  const readOnly = disabled && !rated && !busy;

  const upTooltip = (() => {
    if (busy && !rated) return "Guardando calificación…";
    if (useful) return "Calificado como útil";
    if (rated && notUseful) return "Calificado como no útil · no se puede cambiar";
    if (readOnly) return "Calificación no disponible (modo lectura)";
    return "Marcar como útil";
  })();

  const downTooltip = (() => {
    if (busy && !rated) return "Guardando calificación…";
    if (notUseful) return "Calificado como no útil";
    if (rated && useful) return "Calificado como útil · no se puede cambiar";
    if (readOnly) return "Calificación no disponible (modo lectura)";
    return "Marcar como no útil";
  })();

  /* Colores intensos solo tras calificar (activo); el otro voto queda atenuado por CSS disabled. */
  const upRatedSx = useful ? { color: "#16a34a !important" } : undefined;
  const downRatedSx = notUseful ? { color: "#ef4444 !important" } : undefined;

  return (
    <Stack
      direction="row"
      spacing={0.25}
      alignItems="center"
      justifyContent={align === "right" ? "flex-end" : "flex-start"}
      className={`conv-msg-rating conv-msg-rating--${align}${rated ? " conv-msg-rating--rated" : ""}`}
      role="group"
      aria-label="Calificación del mensaje"
    >
      <Tooltip title={upTooltip} arrow>
        <span>
          <IconButton
            size="small"
            className={`conv-msg-rating__btn conv-msg-rating__btn--up${useful ? " conv-msg-rating__btn--active" : ""}`}
            aria-label={useful ? "Calificado como útil" : "Marcar como útil"}
            aria-pressed={useful}
            disabled={disabled || busy || rated}
            onClick={() => onRate(true)}
            sx={upRatedSx}
          >
            {busy && !rated ? (
              <CircularProgress size={16} />
            ) : (
              <Icon
                icon={useful ? "mdi:thumb-up" : "mdi:thumb-up-outline"}
                size={18}
                style={useful ? { color: "#16a34a" } : undefined}
              />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={downTooltip} arrow>
        <span>
          <IconButton
            size="small"
            className={`conv-msg-rating__btn conv-msg-rating__btn--down${notUseful ? " conv-msg-rating__btn--active" : ""}`}
            aria-label={notUseful ? "Calificado como no útil" : "Marcar como no útil"}
            aria-pressed={notUseful}
            disabled={disabled || busy || rated}
            onClick={() => onRate(false)}
            sx={downRatedSx}
          >
            <Icon
              icon={notUseful ? "mdi:thumb-down" : "mdi:thumb-down-outline"}
              size={18}
              style={notUseful ? { color: "#ef4444" } : undefined}
            />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

function resolveMsgImensaje(msg) {
  const imensaje = Number(msg?.imensaje);
  return imensaje > 0 ? imensaje : undefined;
}

const MensajeSection = memo(function MensajeSection({ msg, onMeta, compactMeta = false, chatUserDisplayName, chatUserNick, showUsageStats = false, onImageClick, streamingMsgId = null, onRateMessage = null, canRate = false, ratingMsgId = null, operativaEnter = false, onContapymeLoginDone = null }) {
  const { Alert, Box } = getMaterialUI();
  const [fileSearchOpen, setFileSearchOpen] = useState(false);
  const meta = roleMetaFor(msg, compactMeta);
  const title = roleTitle(msg, chatUserDisplayName, chatUserNick);
  const titleCaption = roleUserCaption(msg, chatUserNick);
  const fecha = msg.fecha ? String(msg.fecha) : "";
  const fechaIso = msg.fechaIso ? String(msg.fechaIso) : "";
  const isUser = msg.esUsuario;
  const isOperativa = msg.esOperativa;
  const isStreaming = Boolean(msg.isStreaming || (streamingMsgId && msg.idMsg === streamingMsgId));
  const showMetaBtn = Boolean(onMeta && msg.meta && metaWorthDialog(msg.meta, isUser));
  const showFileSearchChips = Boolean(!compactMeta && !isUser && msg.meta && metaHasFileSearch(msg.meta));
  const showMetaChips = Boolean(!compactMeta && (onMeta || showFileSearchChips));
  const statsSide = isUser ? "left" : "right";
  const msgImensaje = resolveMsgImensaje(msg);
  const showRating = Boolean(
    onRateMessage
    && !isUser
    && !isOperativa
    && !isStreaming
    && msgImensaje
    && (canRate || msg.calificacion !== undefined),
  );
  const ratingRow = showRating ? (
    <MsgRatingRow
      calificacion={msg.calificacion}
      disabled={!canRate}
      busy={ratingMsgId === msg.idMsg}
      align="left"
      onRate={(butil) => onRateMessage({ ...msg, imensaje: msgImensaje }, butil)}
    />
  ) : null;
  const showMetricsColumn = Boolean(showUsageStats && sideLogPanelWorthShowing(msg));
  const showSideColumn = Boolean(showMetricsColumn || ratingRow);
  const hideUsageInChips = showMetricsColumn;
  const fullLayout = !compactMeta;
  const rowMaxWidth = showMetricsColumn
    ? "100%"
    : fullLayout
      ? (isOperativa ? "min(96%, 52rem)" : isUser ? "min(96%, 44rem)" : "min(96%, 48rem)")
      : isOperativa
        ? "92%"
        : "min(96%, 42rem)";
  const cardMaxWidth = showMetricsColumn
    ? (isOperativa ? "72%" : { xs: "100%", sm: "min(48rem, calc(100% - 11.5rem))" })
    : "100%";
  const roleClass = isOperativa
    ? `conv-msg--operativa${operativaEnter ? " conv-msg--operativa-enter" : ""}`
    : "";

  return (
      <Box
        className={[compactMeta ? "conv-msg--compact" : "", roleClass].filter(Boolean).join(" ") || undefined}
        sx={{
          display: "flex",
          justifyContent: isUser ? "flex-end" : "flex-start",
          width: "100%",
          mb: isOperativa ? (compactMeta ? 1 : 1.75) : compactMeta ? 2.5 : 2,
        }}
      >
      <Box
        className={[
          "conv-msg-row",
          compactMeta ? "conv-msg-row--compact" : "",
          showMetricsColumn ? "conv-msg-row--logs" : "",
          isUser ? "conv-msg-row--user" : "conv-msg-row--assistant",
        ].filter(Boolean).join(" ")}
        sx={{
          display: "flex",
          flexDirection: isUser ? "row-reverse" : "row",
          alignItems: showSideColumn ? "flex-start" : "flex-start",
          gap: { xs: 0.75, sm: 1.25 },
          width: showMetricsColumn ? "100%" : "fit-content",
          maxWidth: showMetricsColumn ? "100%" : rowMaxWidth,
          minWidth: 0,
          opacity: 1,
        }}
      >
        <Box
          className="conv-msg-card-wrap"
          sx={{
            flex: "0 1 auto",
            width: "fit-content",
            maxWidth: cardMaxWidth,
            minWidth: 0,
          }}
        >
          <SectionCard
            id={`conv-msg-${msg.idMsg}`}
            icon={meta.icon}
            title={title}
            titleCaption={titleCaption || undefined}
            fecha={fecha || undefined}
            fechaIso={fechaIso || undefined}
            accent={meta.accent}
            align={isUser ? "right" : "left"}
            operativa={isOperativa}
            compact={compactMeta}
            streaming={isStreaming}
            onMeta={showMetaBtn ? () => onMeta(msg) : undefined}
            metaChips={showMetaChips ? (
              <MetaChipRow
                meta={msg.meta}
                isUser={isUser}
                hideUsageMetrics={hideUsageInChips || isUser}
                hideClassificationChips={showUsageStats}
                align={isUser ? "right" : "left"}
                cardTitle={title}
                onFileSearch={showFileSearchChips ? () => setFileSearchOpen(true) : undefined}
              />
            ) : null}
          >
            {msg.streamFailed && msg.streamError && (
              <Alert severity="warning" sx={{ mb: 1.5, py: 0.25, fontSize: "0.78rem" }}>
                {msg.streamError}
              </Alert>
            )}
            {(msg.contenido?.trim() || msg.imagenes?.length || msg.audios?.length || isStreaming) ? (
            <MsgBody
              text={msg.contenido}
              imagenes={msg.imagenes}
              audios={msg.audios}
              audiosTranscripcion={msg.audiosTranscripcion}
              align={isUser ? "right" : "left"}
              onImageClick={onImageClick}
              streaming={isStreaming}
              disableLoginEmbed={isOperativa}
              // Solo asistente: la OP MCP trae login_url en el resumen y no debe duplicar el CTA/modal.
              loginUrl={isOperativa ? undefined : (msg.meta?.login_url || msg.meta?.extra?.login_url)}
              onContapymeLoginDone={isOperativa || isUser ? undefined : onContapymeLoginDone}
            />
            ) : null}
          </SectionCard>
        </Box>
        {showSideColumn && (
          <Box
            className={`conv-msg-side-column conv-msg-side-column--${statsSide}`}
            sx={{
              flexShrink: 0,
              maxWidth: { xs: "min(100%, 16rem)", sm: "18rem" },
              pt: 0.25,
              pb: 0.25,
              alignSelf: "stretch",
            }}
          >
            {showMetricsColumn ? (
              <UsageStatsColumn
                stats={msg.usageStats}
                align={statsSide}
                msgLabel={title}
                fecha={fecha}
                meta={msg.meta}
                isUser={isUser}
              />
            ) : null}
            {ratingRow ? (
              <Box className="conv-msg-rating-slot">
                {ratingRow}
              </Box>
            ) : null}
          </Box>
        )}
      </Box>
      <FileSearchDialog
        open={fileSearchOpen}
        onClose={() => setFileSearchOpen(false)}
        meta={msg.meta}
        title={`File Search · ${title}`}
      />
    </Box>
  );
}, (prev, next) => (
  prev.msg === next.msg
  && prev.streamingMsgId === next.streamingMsgId
  && prev.compactMeta === next.compactMeta
  && prev.chatUserDisplayName === next.chatUserDisplayName
  && prev.chatUserNick === next.chatUserNick
  && prev.showUsageStats === next.showUsageStats
  && prev.ratingMsgId === next.ratingMsgId
  && prev.canRate === next.canRate
  && prev.operativaEnter === next.operativaEnter
));

export function ConvLogWebView({ mensajes, onMeta, compactMeta = false, emptyHint, chatUserDisplayName, chatUserNick, showUsageStats = true, streamingMsgId = null, onRateMessage = null, canRate = false, ratingMsgId = null, threadKey = null, threadClassName = "", onContapymeLoginDone = null }) {
  const { Box, Typography } = getMaterialUI();
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const operativaEnterIds = useOperativaEnterIds(mensajes, threadKey, { enabled: !compactMeta });

  const mensajesConStats = useMemo(
    () => attachUsageStats(mensajes || []),
    [mensajes],
  );
  const hasUsageStats = showUsageStats && threadHasUsageStats(mensajesConStats);
  const onImageClick = useMemo(() => (src) => setLightboxSrc(src), []);

  if (!mensajes?.length) {
    if (emptyHint === null) return null;
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
        {emptyHint || "Recupera por ID o pega un log para ver el hilo."}
      </Typography>
    );
  }

  return (
    <Box className={threadClassName || undefined} sx={{ width: "100%", maxWidth: "100%" }}>
      {mensajesConStats.map((m) => (
        <MensajeSection
          key={m.idMsg}
          msg={m}
          onMeta={onMeta}
          compactMeta={compactMeta}
          chatUserDisplayName={chatUserDisplayName}
          chatUserNick={chatUserNick}
          showUsageStats={hasUsageStats}
          onImageClick={onImageClick}
          streamingMsgId={streamingMsgId}
          onRateMessage={onRateMessage}
          canRate={canRate}
          ratingMsgId={ratingMsgId}
          operativaEnter={operativaEnterIds.has(m.idMsg)}
          onContapymeLoginDone={onContapymeLoginDone}
        />
      ))}
      <ImageLightboxDialog open={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </Box>
  );
}

/** Ítems para navegador lateral (estilo lista de tickets). */
export function convLogNavItems(mensajes) {
  return (mensajes || []).map((m, i) => {
    const rk = roleKey(m);
    const meta = ROLE_META[rk] || ROLE_META.assistant;
    const preview = String(m.contenido || "").replace(/\s+/g, " ").trim().slice(0, 48);
    return {
      id: m.idMsg,
      label: `#${i + 1} · ${roleTitle(m)}`,
      secondary: preview || "(sin texto)",
      accent: meta.accent,
      icon: meta.icon,
    };
  });
}
