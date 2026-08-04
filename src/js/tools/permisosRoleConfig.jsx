import { getMaterialUI, getReact, UI } from "../core/platform.ts";

import { ButtonIconify } from "../ui/shared.jsx";

import { JsonCodeEditor } from "../editors/jsonEditor.jsx";

import { GlassDialog, GlassDialogHeader, glassDialogContentSx, glassDialogActionsSx } from "../ui/GlassDialog.jsx";

import {

  ACCESS_MODES, FLAG_DEFS, buildRolePermisos, countActiveRoutes,

  prettyJson, roleDescripcion, roleNamedisplay, splitRolePermisos, summarizePermisos,

} from "./permisosForm.js";

import {

  groupsFromRouteRows, isWildcardRole, routesArrayFromPermisos, routesForRoleEditor,

} from "./permisosRouteCatalog.js";

import { roleTitleFromEntry } from "./permisosKanbanShared.js";
import { isSamePermisosUser, isTopDevLeadRole, moveRoleImpactBullets, removeRoleImpactBullets, canAddUserToRole } from "./permisosRoleTransfer.js";
import { PermisosUserAutocomplete } from "./PermisosUserAutocomplete.jsx";
import { enforceVisitantePermisos, isVisitanteRole, visitanteRouteLocked } from "./permisosVisitante.js";
import { FILTER_VAR_HINT, formatFilter } from "./permFilter.js";



const { useState, useEffect, useMemo } = getReact();

const {

  Typography, TextField, Stack, Alert, Chip, Box, Checkbox, FormControlLabel, Divider,

  Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow,

  DialogContent, DialogActions, Button, Tooltip, CircularProgress,

} = getMaterialUI();

const { Icon } = UI;

function renderImpactLine(text) {
  const parts = String(text ?? "").split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}



const MODE_LABEL = Object.fromEntries(ACCESS_MODES.map((m) => [m.value, m.label]));



export function PermJsonModal({ open, title, subtitle, initial, readOnly, onClose, onApply }) {

  const [json, setJson] = useState(initial);

  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setJson(initial); setErr(""); } }, [open, initial]);



  function apply() {

    try { onApply?.(JSON.parse(json)); onClose(); }

    catch (e) { setErr("JSON inválido: " + (e?.message || e)); }

  }



  return (

    <GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth paperMaxWidth={920}

      header={<GlassDialogHeader icon="mdi:code-json" title={title} subtitle={subtitle} accent="#6366f1" onClose={onClose} />}>

      <DialogContent dividers sx={glassDialogContentSx({ p: 0, minHeight: 360 })}>

        {err ? <Alert severity="warning" sx={{ m: 1.5, mb: 0 }}>{err}</Alert> : null}

        <Box className="permisos-json-modal-editor" sx={{ minHeight: 320, p: 1 }}>

          <JsonCodeEditor value={json} onChange={readOnly ? undefined : setJson} readOnly={readOnly} placeholder="{}" fullPageTitle={title} />

        </Box>

      </DialogContent>

      <DialogActions sx={glassDialogActionsSx()}>

        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600 }}>{readOnly ? "Cerrar" : "Cancelar"}</Button>

        {!readOnly && onApply ? <Button variant="contained" onClick={apply} sx={{ textTransform: "none", fontWeight: 600 }}>Aplicar JSON</Button> : null}

      </DialogActions>

    </GlassDialog>

  );

}



function AccessModeSelect({ value, onChange, disabled, scoped }) {

  const modes = scoped ? ACCESS_MODES : ACCESS_MODES.filter((m) => m.value === "off" || m.value === "allow");

  return (

    <FormControl size="small" fullWidth disabled={disabled}>
      <InputLabel id="perm-route-access-label" shrink>Acceso</InputLabel>
      <Select labelId="perm-route-access-label" label="Acceso" value={value || "off"} onChange={(e) => onChange(e.target.value)}>

        {modes.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}

      </Select>

    </FormControl>

  );

}



function ModeChip({ mode }) {

  const color = mode === "off" ? "default" : mode === "filtered" ? "info" : "success";

  return <Chip size="small" variant={mode === "off" ? "outlined" : "filled"} color={color} label={MODE_LABEL[mode] || mode} />;

}



function RouteGroupSection({ title, routes, canEdit, wildcard, onRouteMode, isVisitante }) {

  if (!routes.length) return null;

  return (

    <Box className="permisos-route-group">

      <Typography variant="subtitle2" fontWeight={700} className="permisos-route-group__title">{title}</Typography>

      <Table size="small" className="permisos-route-table__grid permisos-route-group__table">

        <TableHead>

          <TableRow>

            <TableCell>Ruta</TableCell>

            <TableCell sx={{ width: "38%" }}>Clave</TableCell>

            <TableCell sx={{ minWidth: 140 }}>
              <Tooltip title={`filter — filtra por el usuario de la sesión (${FILTER_VAR_HINT})`}>
                <span>Filtro de sesión</span>
              </Tooltip>
            </TableCell>

            <TableCell sx={{ width: 168 }}>Acceso</TableCell>

          </TableRow>

        </TableHead>

        <TableBody>

          {routes.map((row) => {

            const active = row.mode !== "off";

            return (

              <TableRow key={row.key} className={active ? "permisos-route-row--active" : "permisos-route-row--inactive"}>

                <TableCell>

                  <Typography variant="body2" fontWeight={active ? 600 : 400}>{row.label}</Typography>

                </TableCell>

                <TableCell>

                  <Typography component="code" variant="caption" sx={{ wordBreak: "break-all" }}>{row.key}</Typography>

                </TableCell>

                <TableCell>
                  {row.filter ? (
                    <Tooltip title={`Plantillas {{var}} — ${FILTER_VAR_HINT}`}>
                      <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                        {formatFilter(row.filter)}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>

                <TableCell>
                  {canEdit && !isVisitante && !visitanteRouteLocked(row.key) ? (
                    <AccessModeSelect value={row.mode} scoped={!!row.scoped} disabled={wildcard}
                      onChange={(mode) => onRouteMode(row.key, mode)} />
                  ) : isVisitante && visitanteRouteLocked(row.key) ? (
                    <Chip size="small" color="info" variant="outlined" icon={<Icon icon="mdi:lock" size={14} />}
                      label="Alcance: propio (fijo)" />
                  ) : (
                    <ModeChip mode={row.mode} />
                  )}
                </TableCell>

              </TableRow>

            );

          })}

        </TableBody>

      </Table>

    </Box>

  );

}



function RoutePermCatalog({ routes, flags, permisos, canEdit, onRoutesChange, isVisitante }) {

  const [newKey, setNewKey] = useState("");

  const wildcard = flags?.["*"] || isWildcardRole(permisos);

  const view = useMemo(() => {

    if (canEdit) return groupsFromRouteRows(routes, flags, { includeInactive: true });

    return routesForRoleEditor(permisos, { includeInactive: false });

  }, [canEdit, routes, flags, permisos]);



  const activeCount = canEdit ? countActiveRoutes(routes) : view.groups.reduce((n, g) => n + g.routes.length, 0) + view.extras.length;



  function onRouteMode(key, mode) {
    if (!canEdit || visitanteRouteLocked(key)) return;

    const hit = routes.find((r) => r.key === key);

    const next = hit
      ? routes.map((r) => {
        if (r.key !== key) return r;
        const row = { ...r, mode };
        if (mode === "allow" || mode === "off") delete row.filter;
        return row;
      })
      : [...routes, { key, mode }].sort((a, b) => a.key.localeCompare(b.key));

    onRoutesChange?.(next);

  }



  function addRow() {

    const key = String(newKey ?? "").trim();

    if (!key || routes.some((r) => r.key === key)) return;

    onRoutesChange?.([...routes, { key, mode: "allow" }].sort((a, b) => a.key.localeCompare(b.key)));

    setNewKey("");

  }



  return (

    <Box className="permisos-route-catalog">

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>

        <Typography variant="subtitle2" fontWeight={700}>Rutas API</Typography>

        <Chip size="small" variant="outlined" label={`${activeCount} activas`} />

      </Stack>

      {isVisitante ? (
        <Alert severity="info" sx={{ mb: 1.5 }} icon={<Icon icon="mdi:account-lock-outline" size={18} />}>
          Alcance fijo por <code>filter</code> de sesión (<code>itercero</code>, <code>icontacto</code>).
          El ISS fusiona ese filtro con la petición y siempre gana sobre query o <code>f.eq</code>.
        </Alert>
      ) : null}
      {wildcard ? (

        <Alert severity="info" sx={{ mb: 1.5 }} icon={<Icon icon="mdi:asterisk" size={18} />}>

          Acceso total (<code>*</code>) — todas las rutas quedan cubiertas por el wildcard.

        </Alert>

      ) : null}

      {!view.groups.length && !view.extras.length ? (

        <Typography variant="body2" color="text.secondary">Sin rutas activas para este rol.</Typography>

      ) : (

        <Stack spacing={2} className="permisos-route-catalog__groups">

          {view.groups.map((g) => (

            <RouteGroupSection key={g.id} title={g.title} routes={g.routes} canEdit={canEdit} wildcard={wildcard} onRouteMode={onRouteMode} isVisitante={isVisitante} />

          ))}

          {view.extras.length ? (

            <RouteGroupSection title="Otras claves" routes={view.extras} canEdit={canEdit} wildcard={wildcard} onRouteMode={onRouteMode} isVisitante={isVisitante} />

          ) : null}

        </Stack>

      )}

      {canEdit && !wildcard && !isVisitante ? (

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>

          <TextField size="small" fullWidth label="Clave adicional" placeholder="QUERY:/api/conversaciones" value={newKey}

            onChange={(e) => setNewKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRow()} />

          <ButtonIconify icon="mdi:plus" title="Agregar" label="Agregar" onClick={addRow} disabled={!newKey.trim()} />

        </Stack>

      ) : null}

    </Box>

  );

}



/** Formulario de permisos de rol. Solo DEVISS (canManage) edita checks y rutas. */

export function RoleConfigEditor({ entry, roleName, canManage, canEditRoleDescriptions, onChange }) {

  const canEditPermisos = !!canManage;

  const canEditMeta = canManage || canEditRoleDescriptions;

  const resolvedRole = roleName ?? String(entry?.iusuario ?? "").trim().toUpperCase().replace(/^ROLE:/i, "");

  const isVisitante = isVisitanteRole(resolvedRole);

  const [namedisplay, setNamedisplay] = useState(roleNamedisplay(entry?.permisos));

  const [desc, setDesc] = useState(roleDescripcion(entry?.permisos));

  const [flags, setFlags] = useState(() => splitRolePermisos(entry?.permisos).flags);

  const [routes, setRoutes] = useState(() => routesArrayFromPermisos(entry?.permisos, canEditPermisos));

  const entryDesc = roleDescripcion(entry?.permisos);

  const entryNamedisplay = roleNamedisplay(entry?.permisos);



  useEffect(() => {

    setNamedisplay(roleNamedisplay(entry?.permisos));

    setDesc(roleDescripcion(entry?.permisos));

    const split = splitRolePermisos(entry?.permisos);

    setFlags(split.flags);

    setRoutes(routesArrayFromPermisos(entry?.permisos, canEditPermisos));

  }, [entry?.permisos, entry?.iusuario, canEditPermisos]);



  function emit(nextNamedisplay = namedisplay, nextDesc = desc, nextFlags = flags, nextRoutes = routes) {

    if (!onChange) return;

    if (canManage) {

      let permisos = buildRolePermisos(

        canEditMeta ? nextDesc : entryDesc,

        canEditMeta ? nextNamedisplay : entryNamedisplay,

        nextFlags,

        nextRoutes,

      );

      if (isVisitante) permisos = enforceVisitantePermisos(permisos);

      onChange(permisos);

    } else if (canEditRoleDescriptions) {

      onChange({

        ...(entry?.permisos ?? {}),

        descripcion: String(nextDesc).trim() || undefined,

        namedisplay: String(nextNamedisplay).trim() || undefined,

      });

    }

  }



  return (

    <Stack spacing={3} className="permisos-role-config-editor">

      {canEditMeta ? (

        <Box component="section" className="permisos-role-config-editor__meta">

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>Metadatos del rol</Typography>

          <Stack spacing={1.5}>

            <TextField label="Nombre a mostrar" size="small" fullWidth value={namedisplay} disabled={!canEditMeta}

              onChange={(e) => { const v = e.target.value; setNamedisplay(v); emit(v, desc, flags, routes); }} />

            <TextField label="Descripción" size="small" fullWidth value={desc} disabled={!canEditMeta}

              onChange={(e) => { const v = e.target.value; setDesc(v); emit(namedisplay, v, flags, routes); }} />

          </Stack>

        </Box>

      ) : (

        <Box component="section" className="permisos-role-config-editor__meta permisos-role-config-editor__meta--readonly">

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>{roleNamedisplay(entry?.permisos) || roleTitleFromEntry(entry)}</Typography>

          {roleDescripcion(entry?.permisos) ? <Typography variant="body2" color="text.secondary">{roleDescripcion(entry?.permisos)}</Typography> : null}

        </Box>

      )}



      <Divider className="permisos-role-config-divider" />



      <Box component="section" className="permisos-role-config-editor__flags">

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>Privilegios globales</Typography>

        {isVisitante ? (
          <Typography variant="body2" color="text.secondary">El rol USR no usa privilegios globales ni acceso total.</Typography>
        ) : (
        <Stack spacing={0.25}>

          {FLAG_DEFS.map((f) => (

            <Tooltip key={f.key} title={f.hint} placement="right">

              <FormControlLabel

                control={<Checkbox size="small" checked={!!flags[f.key]} disabled={!canEditPermisos}

                  onChange={(e) => {

                    if (!canEditPermisos) return;

                    const nf = { ...flags, [f.key]: e.target.checked };

                    setFlags(nf);

                    emit(namedisplay, desc, nf, routes);

                  }} />}

                label={<Typography variant="body2" fontWeight={flags[f.key] ? 600 : 400}>{f.label}</Typography>}

              />

            </Tooltip>

          ))}

        </Stack>
        )}

      </Box>



      <Divider className="permisos-role-config-divider" />



      <Box component="section" className="permisos-role-config-editor__routes">

        <RoutePermCatalog routes={routes} flags={flags} permisos={entry?.permisos} canEdit={canEditPermisos} isVisitante={isVisitante}

          onRoutesChange={(nr) => { setRoutes(nr); emit(namedisplay, desc, flags, nr); }} />

      </Box>

    </Stack>

  );

}



export function RoleConfigFullscreenDialog({ open, column, canManage, canEditRoleDescriptions, busy, onClose, onSave }) {

  const roleName = column?.roleName ?? "";

  const roleTitle = column?.title ?? roleTitleFromEntry(column?.entry) ?? roleName;

  const canSave = canManage || canEditRoleDescriptions;

  const [draft, setDraft] = useState(column?.entry?.permisos ?? {});

  const [bactivo, setBactivo] = useState(column?.entry?.bactivo !== false);

  const [jsonOpen, setJsonOpen] = useState(false);

  const [err, setErr] = useState("");



  useEffect(() => {

    if (open && column?.entry) {
      const raw = column.entry.permisos ?? {};
      setDraft(isVisitanteRole(roleName) ? enforceVisitantePermisos(raw) : raw);
      setBactivo(column.entry.bactivo !== false);
    }

  }, [open, column?.entry?.iusuario, column?.entry?.permisos, column?.entry?.bactivo, roleName]);



  const jsonPreview = useMemo(() => draft, [draft]);

  const summary = summarizePermisos(column?.entry?.permisos ?? {});



  function save() {

    setErr("");

    const permisos = isVisitanteRole(roleName) ? enforceVisitantePermisos(draft) : draft;

    onSave?.({ name: roleName, permisos, bactivo: canManage ? bactivo : undefined });

  }



  function applyJson(parsed) {

    if (!canManage) return;

    setDraft(isVisitanteRole(roleName) ? enforceVisitantePermisos(parsed) : parsed);

  }



  if (!column) return null;

  const roleIcon = isVisitanteRole(roleName) ? "mdi:account-lock-outline" : "mdi:shield-key-outline";
  const roleAccent = isVisitanteRole(roleName) ? "#64748b" : "#1e90ff";

  return (

    <>

      <GlassDialog open={open} onClose={onClose} fullScreen fullWidth maxWidth={false}
        paperClassName="isa-glass-dialog--fullscreen permisos-role-config-dialog"
        header={(
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <GlassDialogHeader icon={roleIcon} title={roleTitle}
              subtitle={`${roleName} · ${summary.flagCount} privilegios · ${summary.routeCount} rutas`}
              accent={roleAccent} onClose={onClose} />
            <Stack direction="row" spacing={0.75} alignItems="center" className="permisos-role-config-dialog__toolbar">
              <ButtonIconify icon="mdi:code-json" title="Ver JSON" onClick={() => setJsonOpen(true)} />
              {canSave ? (
                <ButtonIconify variant="primary" icon="mdi:content-save-outline" title="Guardar" label="Guardar"
                  onClick={save} disabled={busy} busy={busy} />
              ) : null}
            </Stack>
          </Box>
        )}>

        <DialogContent className="permisos-role-config-dialog__body custom-scrollbar"
          sx={glassDialogContentSx({ flex: 1, minHeight: 0, px: 0, py: 0 })}>

          {err ? <Alert severity="warning" sx={{ mb: 2 }}>{err}</Alert> : null}

          {!canManage && !canEditRoleDescriptions ? (

            <Alert severity="info" sx={{ mb: 2 }} icon={<Icon icon="mdi:eye-outline" size={18} />}>

              Vista de solo lectura. Solo <strong>DEVISS</strong> puede modificar privilegios y rutas.

            </Alert>

          ) : null}

          {canManage && !isVisitanteRole(roleName) ? (
            <FormControlLabel sx={{ mb: 1.5, ml: 0 }}
              control={<Checkbox checked={bactivo} onChange={(e) => setBactivo(e.target.checked)} disabled={busy} />}
              label="Rol activo (visible en kanban y asignable a usuarios)" />
          ) : null}

          <RoleConfigEditor entry={{ ...column.entry, permisos: draft }} roleName={roleName} canManage={canManage} canEditRoleDescriptions={canEditRoleDescriptions} onChange={setDraft} />

        </DialogContent>

      </GlassDialog>

      <PermJsonModal open={jsonOpen} title={`Rol ${roleTitle}`}

        initial={prettyJson(jsonPreview)} readOnly={!canManage} onClose={() => setJsonOpen(false)} onApply={canManage ? applyJson : undefined} />

    </>

  );

}



export function RoleDragDialog({ open, pending, busy, sessionUsername, onClose, onConfirm }) {
  if (!pending) return null;
  const { username, fromRole, toRole, fromRoleTitle, toRoleTitle } = pending;
  const fromLabel = fromRoleTitle || fromRole;
  const toLabel = toRoleTitle || toRole;
  const isSelf = isSamePermisosUser(username, sessionUsername);
  const leavesDevLead = isTopDevLeadRole(fromRole);
  const moveBullets = moveRoleImpactBullets({ username, fromRoleTitle: fromLabel, toRoleTitle: toLabel, isSelf, leavesDevLead });
  return (
    <GlassDialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={busy}
      header={
        <GlassDialogHeader icon="mdi:alert-outline" title="Confirmar movimiento" subtitle={`${username}: ${fromLabel} → ${toLabel}`}
          accent="#f59e0b" onClose={busy ? undefined : onClose} />
      }>
      <DialogContent sx={glassDialogContentSx({ p: 2.5 })}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Mover implica <strong>quitar</strong> a {isSelf ? "ti" : username} de <strong>{fromLabel}</strong>. Revisa el impacto antes de confirmar.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {username} pasará de <strong>{fromLabel}</strong> a <strong>{toLabel}</strong>.
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.25, color: "text.secondary", fontSize: "0.875rem", "& li": { mb: 0.75 } }}>
          {moveBullets.map((line) => (
            <li key={line}>{renderImpactLine(line)}</li>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={glassDialogActionsSx()}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" color="warning" disabled={busy} onClick={() => { if (!busy) onConfirm("move"); }}
          sx={{ textTransform: "none", minWidth: 140 }}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Icon icon="mdi:arrow-right-bold" size={18} />}>
          {busy ? "Moviendo…" : "Confirmar movimiento"}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
}

export function RoleAddDialog({ open, pending, busy, onClose, onConfirm }) {
  const [username, setUsername] = useState(null);
  useEffect(() => { if (open) setUsername(null); }, [open]);
  if (!pending) return null;
  const { roleTitle, role, existingUsernames } = pending;
  const roleLabel = roleTitle || role;
  const alreadyInRole = username && existingUsernames?.has(String(username).trim().toUpperCase());
  const addCheck = username && !alreadyInRole
    ? canAddUserToRole({ username })
    : { ok: true };
  return (
    <GlassDialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth
      header={<GlassDialogHeader icon="mdi:account-plus-outline" title="Agregar al rol" subtitle={roleLabel} accent="#10b981" onClose={busy ? undefined : onClose} />}>
      <DialogContent sx={glassDialogContentSx({ p: 2.5 })}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Busque un usuario en permisos ISS o escriba un login nuevo para asignarlo al rol <strong>{roleLabel}</strong>.
        </Typography>
        <PermisosUserAutocomplete value={username} onChange={setUsername} disabled={busy} label="Usuario" />
        {alreadyInRole ? <Alert severity="warning" sx={{ mt: 1.5 }}>Este usuario ya está en el rol.</Alert> : null}
        {username && !alreadyInRole && !addCheck.ok ? <Alert severity="warning" sx={{ mt: 1.5 }}>{addCheck.reason}</Alert> : null}
      </DialogContent>
      <DialogActions sx={glassDialogActionsSx()}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" disabled={busy || !username || alreadyInRole || !addCheck.ok} onClick={() => onConfirm(username)} sx={{ textTransform: "none", minWidth: 120 }}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Icon icon="mdi:account-plus-outline" size={18} />}>
          {busy ? "Agregando…" : "Agregar"}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
}

export function RoleRemoveDialog({ open, pending, busy, sessionUsername, onClose, onConfirm }) {
  if (!pending) return null;
  const { username, roleTitle, role } = pending;
  const roleLabel = roleTitle || role;
  const isSelf = isSamePermisosUser(username, sessionUsername);
  const isDevLead = isTopDevLeadRole(role);
  const bullets = removeRoleImpactBullets({ username, roleTitle: roleLabel, isSelf, isDevLead });
  return (
    <GlassDialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={busy}
      header={<GlassDialogHeader icon="mdi:account-remove-outline" title="Quitar del rol" subtitle={`${username} · ${roleLabel}`} accent="#f59e0b" onClose={busy ? undefined : onClose} />}>
      <DialogContent sx={glassDialogContentSx({ p: 2.5 })}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {isSelf && isDevLead
            ? "Te quitarás DEVISS (máximo privilegio). Otro DEVISS o un ajuste en BD será necesario para recuperarlo."
            : "Esta acción revoca permisos de forma inmediata. Revise las consecuencias antes de confirmar."}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          ¿Quitar a <strong>{username}</strong> del rol <strong>{roleLabel}</strong>?
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.25, color: "text.secondary", fontSize: "0.875rem", "& li": { mb: 0.75 } }}>
          {bullets.map((line) => (
            <li key={line}>{renderImpactLine(line)}</li>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={glassDialogActionsSx()}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" color="warning" disabled={busy} onClick={onConfirm} sx={{ textTransform: "none", minWidth: 120 }}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Icon icon="mdi:account-remove-outline" size={18} />}>
          {busy ? "Quitando…" : "Confirmar"}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
}

