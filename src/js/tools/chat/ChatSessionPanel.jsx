import { getReact, getMaterialUI, UI } from "../../core/platform.ts";
import { buildUserAvatarUrl } from "../../core/patyia.ts";
import { jwtUserDisplayName, jwtUserShortName } from "../../core/patyia-jwt.ts";

const { useState, useEffect, useMemo } = getReact();
const { Box, Typography, CircularProgress, Chip } = getMaterialUI();
const { Icon } = UI;

const CHIP_SX = {
  live: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.6rem", fontWeight: 600 } },
  readonly: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.6rem", fontWeight: 600 } },
  loading: { height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.6rem", fontWeight: 600 } },
};

function SessionModeChip({ canSend, jwtLoading }) {
  if (canSend) {
    return (
      <Chip
        size="small"
        variant="outlined"
        label="Interactivo"
        icon={<Icon icon="mdi:chat-processing-outline" size={12} aria-hidden />}
        className="paty-chat-session__badge paty-chat-session__badge--live"
        sx={CHIP_SX.live}
      />
    );
  }
  if (jwtLoading) {
    return (
      <Chip
        size="small"
        variant="outlined"
        label="Token…"
        icon={<CircularProgress size={9} color="inherit" />}
        className="paty-chat-session__badge paty-chat-session__badge--loading"
        sx={CHIP_SX.loading}
      />
    );
  }
  return (
    <Chip
      size="small"
      variant="outlined"
      label="Solo lectura"
      icon={<Icon icon="mdi:eye-outline" size={12} aria-hidden />}
      className="paty-chat-session__badge paty-chat-session__badge--readonly"
      sx={CHIP_SX.readonly}
    />
  );
}

export function ChatSessionPanel({ claims, displayScope, sessionUser: _sessionUser, ownerDisplayName, canSend, jwtLoading, canAudit = false, onOpenAudit }) {
  // Preferir displayScope (filtro auditoría / otro usuario) sobre claims JWT — si no, el chip muestra Viviana con IDs de Jeffrey.
  const tercero = displayScope?.itercero ?? claims?.itercero;
  const contacto = displayScope?.icontacto ?? claims?.icontacto;
  const codes = [tercero, contacto].filter(Boolean).join(" · ");
  const scopeName = String(displayScope?.nombre ?? "").trim();
  const claimsName = jwtUserDisplayName(claims) || jwtUserShortName(claims);
  const primaryLabel = String(ownerDisplayName ?? "").trim() || scopeName || claimsName || codes || "ISA PatyIA";
  const avatarUrl = useMemo(() => buildUserAvatarUrl(primaryLabel, 72), [primaryLabel]);
  const [avatarOk, setAvatarOk] = useState(true);
  useEffect(() => { setAvatarOk(true); }, [avatarUrl]);

  const interactive = !!canAudit && typeof onOpenAudit === "function";

  return (
    <Box
      className={`paty-chat-session${interactive ? " paty-chat-session--clickable" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={interactive ? "Filtrar conversaciones por usuario" : undefined}
      aria-label={interactive ? `Filtrar por ${primaryLabel}` : undefined}
      onClick={interactive ? () => onOpenAudit?.() : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenAudit?.();
        }
      } : undefined}
    >
      <Box className="paty-chat-session__avatar" aria-hidden>
        {avatarOk ? (
          <img className="paty-chat-session__avatar-img" src={avatarUrl} alt="" width={36} height={36} loading="lazy" decoding="async" onError={() => setAvatarOk(false)} />
        ) : (
          <Icon icon="mdi:account-circle" size={28} />
        )}
      </Box>
      <Box className="paty-chat-session__body">
        <Typography className="paty-chat-session__name" noWrap title={primaryLabel}>
          {primaryLabel}
        </Typography>
        <Box className="paty-chat-session__meta">
          <SessionModeChip canSend={canSend} jwtLoading={jwtLoading} />
          {codes ? (
            <Typography
              className="paty-chat-session__ids"
              variant="caption"
              component="span"
              title={codes}
              sx={{ fontSize: "0.58rem", lineHeight: 1.15, color: "rgba(148, 163, 184, 0.72)", fontWeight: 400 }}
            >
              {codes}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Box className="paty-chat-session__action" aria-hidden>
        <Icon icon="mdi:filter-variant" size={14} />
      </Box>
    </Box>
  );
}
