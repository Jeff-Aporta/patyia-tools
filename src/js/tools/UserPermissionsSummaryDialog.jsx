/**
 * Modal glass-neon — solo lectura — resumen de permisos efectivos de un usuario.
 *
 * Datos: se compone en cliente a partir de `roles[]` y `users[]` ya cargados por el panel.
 * Sin requests adicionales; sin exponer JPERMISOS crudos.
 */

import { getMaterialUI, getReact } from "../core/platform.ts";
import { userRoles } from "./permisosForm.js";
import { roleTitleFromEntry } from "./permisosKanbanShared.js";
import { GlassDialog, GlassDialogHeader, glassDialogContentSx, glassDialogActionsSx } from "../ui/GlassDialog.jsx";

const { Typography, Stack, Box, Chip, Divider, CircularProgress } = getMaterialUI();
const { useMemo } = getReact();

const ROLE_KEYS_OMIT = new Set(["descripcion", "namedisplay", "roles", "jerarquia", "accent", "color", "icon"]);

function getRoleEntry(roles, roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  return (roles ?? []).find((r) => String(r?.iusuario ?? "").trim().toUpperCase().replace(/^ROLE:/i, "") === key) ?? null;
}

function activeRoles(roles) {
  return (roles ?? []).filter((r) => r?.itipo !== "user" && r?.bactivo !== false);
}

function permissionValue(v) {
  if (v === true) return "allow";
  if (v && typeof v === "object") {
    if (Array.isArray(v.filter)) {
      return { kind: "filter", value: v.filter };
    }
    if (v.filter && typeof v.filter === "object") {
      return { kind: "filter", value: v.filter };
    }
    return { kind: "object", value: v };
  }
  return { kind: "other", value: v };
}

function summarizePerms(perms) {
  const allows = [];
  const filters = [];
  const others = [];
  for (const [k, v] of Object.entries(perms ?? {})) {
    if (ROLE_KEYS_OMIT.has(k)) continue;
    if (k.startsWith("__") || k === "*") {
      if (k === "*" && v === true) allows.unshift("*");
      continue;
    }
    const pv = permissionValue(v);
    if (pv === "allow") allows.push(k);
    else if (pv.kind === "filter") filters.push({ key: k, filter: pv.value });
    else others.push({ key: k, value: pv.value });
  }
  return { allows, filters, others };
}

function RoleCard({ roleName, roles }) {
  const entry = getRoleEntry(roles, roleName);
  const title = roleTitleFromEntry(entry) || roleName;
  return (
    <Box className="isa-glass-card paty-permisos-summary__role" sx={{ p: 1.25, borderRadius: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Chip
          size="small"
          color="primary"
          label={title}
          sx={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}
          title={roleName}
        />
        {title !== roleName ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
            {roleName}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

function PermList({ title, items, kind }) {
  if (!items.length) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        {title} ({items.length})
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
        {items.slice(0, kind === "filter" ? 50 : 100).map((it, i) => {
          if (kind === "filter") {
            const fSummary = Object.entries(it.filter ?? {})
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .join(", ");
            return (
              <Chip
                key={`${it.key}-${i}`}
                size="small"
                variant="outlined"
                color="warning"
                label={`${it.key} · ${fSummary}`}
                title={`${it.key} — restringido a: ${fSummary}`}
                sx={{ fontFamily: "monospace", fontSize: 11 }}
              />
            );
          }
          if (kind === "allow") {
            return (
              <Chip
                key={it}
                size="small"
                color="success"
                variant="outlined"
                label={it}
                title={it}
                sx={{ fontFamily: "monospace", fontSize: 11 }}
              />
            );
          }
          return (
            <Chip
              key={`${it.key}-${i}`}
              size="small"
              variant="outlined"
              label={`${it.key} → ${JSON.stringify(it.value)}`}
              title={it.key}
              sx={{ fontFamily: "monospace", fontSize: 11 }}
            />
          );
        })}
        {items.length > (kind === "filter" ? 50 : 100) ? (
          <Chip size="small" label={`+${items.length - (kind === "filter" ? 50 : 100)} más`} sx={{ fontFamily: "monospace", fontSize: 11 }} />
        ) : null}
      </Box>
    </Box>
  );
}

export function UserPermissionsSummaryDialog({ open, onClose, username, users, roles }) {
  const data = useMemo(() => {
    if (!open || !username) return null;
    const targetUser = (users ?? []).find((u) => String(u?.iusuario ?? "").trim().toUpperCase() === username.toUpperCase());
    if (!targetUser) return null;
    const active = activeRoles(roles);
    const directRoles = userRoles(targetUser.permisos);
    const { allows, filters, others } = summarizePerms(targetUser.permisos);
    return { targetUser, directRoles, activeRoles: active, allows, filters, others };
  }, [open, username, users, roles]);

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      paperClassName="permisos-user-summary-dialog"
      header={
        <GlassDialogHeader
          icon="mdi:shield-account-outline"
          title={`Resumen de permisos — ${username || ""}`}
          subtitle="Solo lectura · composición en cliente · roles planos asignados"
          accent="#1e90ff"
          onClose={onClose}
        />
      }
    >
      <Box sx={{ ...glassDialogContentSx(), minHeight: 360 }}>
        {!username ? (
          <Typography color="text.secondary">Sin usuario seleccionado.</Typography>
        ) : !data ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Usuario no encontrado en los datos cargados.</Typography>
          </Stack>
        ) : (
          <>
            <Box>
              <Typography variant="overline" color="text.secondary">Usuario</Typography>
              <Typography variant="h6" fontWeight={700}>{data.targetUser.iusuario}</Typography>
              {data.targetUser.permisos?.nombre || data.targetUser.permisos?.namedisplay ? (
                <Typography variant="body2" color="text.secondary">
                  {data.targetUser.permisos.nombre || data.targetUser.permisos.namedisplay}
                </Typography>
              ) : null}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="overline" color="text.secondary">
              Roles asignados {data.directRoles.length ? `(${data.directRoles.length})` : ""}
            </Typography>
            {data.directRoles.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                El usuario no tiene roles asignados. Permisos efectivos = USR por defecto.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {data.directRoles.map((rn) => (
                  <RoleCard key={rn} roleName={rn} roles={data.activeRoles} />
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="overline" color="text.secondary">
              Permisos efectivos del usuario
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              Calculados a partir de sus roles directos (sin herencia jerárquica).
            </Typography>

            {data.allows.length === 0 && data.filters.length === 0 && data.others.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sin permisos materializados más allá del USR por defecto.
              </Typography>
            ) : (
              <>
                <PermList title="Permitidos" items={data.allows} kind="allow" />
                <PermList title="Con filtro fijo" items={data.filters} kind="filter" />
                <PermList title="Otros" items={data.others} kind="other" />
              </>
            )}

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="caption" color="text.secondary">
              Los detalles completos por rol se obtienen al abrir cada columna. Este resumen es de solo lectura y se actualiza al recargar el panel.
            </Typography>
          </>
        )}
      </Box>
      <Box sx={glassDialogActionsSx()}>
        <button
          type="button"
          className="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-colorPrimary"
          onClick={onClose}
        >
          Cerrar
        </button>
      </Box>
    </GlassDialog>
  );
}
