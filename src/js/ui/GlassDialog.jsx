import { getMaterialUI, UI } from "../core/platform.ts";

function isaLoginSurface() {
  const fs = globalThis.ISAFront || {};
  return {
    loginDialogProps: fs.loginDialogProps,
    loginDialogBackdropSx: fs.loginDialogBackdropSx,
    loginCardSx: fs.loginCardSx,
    glassCardSx: fs.glassCardSx,
    loginHeaderBandSx: fs.loginHeaderBandSx,
    loginIconBoxSx: fs.loginIconBoxSx,
    loginHeaderTitleSx: fs.loginHeaderTitleSx,
    GLASS_CARD_CLASS: fs.GLASS_CARD_CLASS || "isa-glass-card",
  };
}

const PAPER_MAX = { xs: 440, sm: 560, md: 920, lg: 1080 };

function glassBackdropSx() {
  const fn = isaLoginSurface().loginDialogBackdropSx;
  return fn?.() ?? {
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    backgroundColor: "rgba(11,18,32,0.55)",
  };
}

function glassPaperProps(maxWidth, paperClassName = "") {
  const { loginCardSx, glassCardSx, GLASS_CARD_CLASS } = isaLoginSurface();
  const maxPx = PAPER_MAX[maxWidth] ?? PAPER_MAX.md;
  return {
    elevation: 0,
    className: `isa-login-card ${GLASS_CARD_CLASS} isa-glass-dialog__paper ${paperClassName}`.trim(),
    sx: loginCardSx?.({ maxWidth: maxPx, m: { xs: 1, sm: 1.5 } })
      ?? glassCardSx?.({ maxWidth: maxPx, m: { xs: 1, sm: 1.5 } })
      ?? { maxWidth: maxPx, m: { xs: 1, sm: 1.5 } },
  };
}

/** Props MUI Dialog — mismo glass neon que el modal de inicio de sesión. */
export function resolveGlassDialogProps({
  open,
  onClose,
  maxWidth = "md",
  fullWidth = true,
  fullScreen = false,
  paperMaxWidth,
  paperSx,
  paperClassName = "",
  slotProps,
  ...rest
} = {}) {
  const { loginDialogProps } = isaLoginSurface();
  const paper = glassPaperProps(maxWidth, paperClassName);
  if (paperMaxWidth) paper.sx = { ...paper.sx, maxWidth: paperMaxWidth };
  if (paperSx) paper.sx = { ...paper.sx, ...paperSx };
  if (fullScreen) {
    paper.sx = {
      ...paper.sx,
      m: 0,
      margin: 0,
      maxWidth: "100%",
      width: "100%",
      height: "100%",
      maxHeight: "100dvh",
      borderRadius: 0,
      border: "none",
      boxShadow: "none",
    };
  }
  const shared = {
    open,
    onClose,
    maxWidth: fullScreen ? false : maxWidth,
    fullWidth,
    fullScreen,
    scroll: "paper",
    className: `isa-login-dialog isa-glass-dialog${fullScreen ? " isa-glass-dialog--fullscreen" : ""}`,
    slotProps: {
      ...(slotProps || {}),
      backdrop: {
        ...(slotProps?.backdrop || {}),
        sx: { ...glassBackdropSx(), ...(slotProps?.backdrop?.sx || {}) },
      },
    },
    PaperProps: paper,
    ...rest,
  };
  if (!loginDialogProps) return shared;
  return loginDialogProps(shared);
}

export function glassDialogTabsSx(extra = {}) {
  return {
    px: { xs: 1.5, sm: 2 },
    minHeight: 44,
    borderBottom: 1,
    borderColor: (t) => (t.palette.mode === "dark" ? "rgba(99,102,241,0.28)" : "divider"),
    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(15,23,42,0.38)" : "rgba(248,250,252,0.92)"),
    "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 600, fontSize: "0.88rem", opacity: 0.82 },
    "& .MuiTab-root.Mui-selected": { opacity: 1, color: "#1e90ff !important" },
    "& .MuiTabs-indicator": {
      height: 3,
      borderRadius: "3px 3px 0 0",
      background: "linear-gradient(90deg, #1e90ff, #00e5ff)",
      boxShadow: "0 0 14px rgba(0,229,255,0.42)",
    },
    ...extra,
  };
}

export function glassDialogContentSx(extra = {}) {
  return {
    p: 0,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    position: "relative",
    borderTop: 0,
    ...extra,
  };
}

export function glassDialogActionsSx(extra = {}) {
  return {
    px: { xs: 2, sm: 2.5 },
    py: 1.5,
    borderTop: 1,
    borderColor: (t) => (t.palette.mode === "dark" ? "rgba(99,102,241,0.22)" : "divider"),
    bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(15,23,42,0.32)" : "rgba(248,250,252,0.85)"),
    justifyContent: "flex-end",
    ...extra,
  };
}

/** Pie estándar glass — botón texto sin icono. */
export function GlassDialogCloseActions({ onClose, label = "Cerrar" }) {
  const { DialogActions, Button } = getMaterialUI();
  return (
    <DialogActions sx={glassDialogActionsSx()}>
      <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, minWidth: 72 }}>
        {label}
      </Button>
    </DialogActions>
  );
}

export function GlassDialogHeader({ icon = "mdi:information-outline", title, subtitle, accent = "#1e90ff", onClose, closeAutoFocus = false }) {
  const { Box, Typography, IconButton, Stack } = getMaterialUI();
  const { Icon } = UI;
  const { loginHeaderBandSx, loginIconBoxSx, loginHeaderTitleSx } = isaLoginSurface();
  const bandSx = loginHeaderBandSx?.(accent) ?? {
    px: { xs: 2, sm: 2.5 },
    py: 2,
    borderBottom: 1,
    borderColor: "rgba(99,102,241,0.25)",
    background: `linear-gradient(90deg, ${accent}44, rgba(99,102,241,0.12) 45%, transparent 75%)`,
    borderLeft: 4,
    borderLeftColor: accent,
  };
  const iconSx = loginIconBoxSx?.(accent) ?? {
    width: 42,
    height: 42,
    borderRadius: 1.75,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
    color: "#fff",
  };
  const titleSx = loginHeaderTitleSx?.() ?? { fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.15 };

  return (
    <Box className="isa-glass-dialog__header" sx={{ position: "relative", flexShrink: 0 }}>
      <Box sx={bandSx}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pr: onClose ? 4 : 0 }}>
          <Box sx={iconSx}>
            <Icon icon={icon} size={24} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h2" sx={titleSx}>{title}</Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35, lineHeight: 1.4 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </Box>
      {onClose ? (
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Cerrar"
          autoFocus={closeAutoFocus}
          className="isa-glass-dialog__close"
          sx={{ position: "absolute", top: 10, right: 10 }}
        >
          <Icon icon="mdi:close" size={18} />
        </IconButton>
      ) : null}
    </Box>
  );
}

export function GlassDialog({ children, header = null, maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps }) {
  const { Dialog } = getMaterialUI();
  const props = resolveGlassDialogProps({ maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps });
  return (
    <Dialog {...props}>
      {header}
      {children}
    </Dialog>
  );
}

export function resolveUsageDialogHeader(msgLabel, fecha, opKey) {
  const label = String(msgLabel || "Mensaje").trim();
  const isOp = /^OP\s*·/i.test(label) || Boolean(opKey);
  return {
    title: `Uso · ${label}`,
    subtitle: [fecha, opKey].filter(Boolean).join(" · ") || undefined,
    icon: isOp ? "mdi:cog-transfer-outline" : "mdi:chart-box-outline",
    accent: isOp ? "#f59e0b" : "#34d399",
  };
}

function isGenericMetaRole(rol) {
  const r = String(rol || "").trim().toLowerCase();
  return !r || r === "user" || r === "usuario" || r === "assistant" || r === "asistente";
}

export function resolveMetaDialogHeader(title, isUserMessage = false) {
  const rol = String(title || "").replace(/^Trazabilidad\s*·\s*/i, "").trim();
  if (isUserMessage || /^user$/i.test(rol) || /^usuario$/i.test(rol)) {
    return { title: "Trazabilidad", subtitle: undefined, icon: "mdi:account-outline", accent: "#60a5fa" };
  }
  if (/^OP\s*·/i.test(rol) || /operativa/i.test(rol)) {
    return { title: "Trazabilidad", subtitle: rol, icon: "mdi:cog-transfer-outline", accent: "#f59e0b" };
  }
  if (isGenericMetaRole(rol)) {
    return { title: "Trazabilidad", subtitle: undefined, icon: "mdi:robot-outline", accent: "#1e90ff" };
  }
  return { title: "Trazabilidad", subtitle: rol, icon: "mdi:robot-outline", accent: "#1e90ff" };
}
