import { getMaterialUI, getReact, Session, toastError, toastInfo, toastSuccess, Assets, getGlass } from "../core/platform.ts";
import { ButtonIconify } from "../ui/shared.jsx";
import {
  fetchPermisos, putPermisoRolePath, putUsuarioRoles, removeUsuarioRole, addUsuarioRole, requireAppSession,
  fetchPatyiaAdminRoles, assignPatyiaRolContacto, removePatyiaRolContacto,
} from "../api/systemConfigApi.ts";
import { buildPermisosBoard, roleNameFromEntry, roleTitleFromEntry, USR_ROLE, buildUserDirectoryFromPermisos } from "./permisosKanbanShared.js";
import { PermisosKanban } from "./PermisosKanban.jsx";
import { PermisosRoleFilterAutocomplete } from "./PermisosRoleFilterAutocomplete.jsx";
import { PermisosUserAutocomplete } from "./PermisosUserAutocomplete.jsx";
import { GlassDialog, GlassDialogHeader, glassDialogContentSx, glassDialogActionsSx } from "../ui/GlassDialog.jsx";
import { UserPermissionsSummaryDialog } from "./UserPermissionsSummaryDialog.jsx";
import { readPermisosHideEmptyFromUrl, persistPermisosHideEmpty, subscribe } from "../core/urlState.ts";

const { useState, useEffect, useCallback, useMemo, useRef } = getReact();
const { Typography, Stack, Alert, CircularProgress, Box, Chip, DialogContent, DialogActions, Button, FormControlLabel, Switch } = getMaterialUI();

export function PermisosPanel({ onNeedLogin }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canAssignUserRoles, setCanAssignUserRoles] = useState(false);
  const [canEditRoleDescriptions, setCanEditRoleDescriptions] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const loggedIn = useMemo(() => !!Session?.isLoggedIn?.(), [authTick]);
  const sessionUsername = useMemo(() => String(Session.username?.() ?? "").trim().toUpperCase(), [authTick]);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ roles: [], users: [], contactos: {} });
  const [userSearch, setUserSearch] = useState("");
  const [roleFilters, setRoleFilters] = useState([]);
  const [hideEmptyStacks, setHideEmptyStacks] = useState(readPermisosHideEmptyFromUrl);
  const [filterBusy, setFilterBusy] = useState(false);
  const [dragOverFilter, setDragOverFilter] = useState(false);

  const [actorRoles, setActorRoles] = useState([]);
  const [patyiaRoles, setPatyiaRoles] = useState([]);
  const [patyiaContactos, setPatyiaContactos] = useState([]);
  const [patyiaBusy, setPatyiaBusy] = useState(false);
  const [summaryUsername, setSummaryUsername] = useState(null);
  const filterToolbarRef = useRef(null);
  const filterFetchSkipRef = useRef(true);
  const filterDropFetchRef = useRef(false);
  const rolesRef = useRef(data.roles);
  const usersRef = useRef(data.users);
  rolesRef.current = data.roles;
  usersRef.current = data.users;
  const usersPaginated = !!data.usersTruncated;

  const applyFlags = useCallback((result) => {
    setCanManage(!!result.canManage);
    setCanAssignUserRoles(!!result.canAssignUserRoles);
    setCanEditRoleDescriptions(!!result.canEditRoleDescriptions);
    const roles = Array.isArray(result.actorRoles)
      ? result.actorRoles
      : (Array.isArray(Session?.roles) ? Session.roles : []);
    setActorRoles(roles.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const result = await fetchPermisos();
      if (!Array.isArray(result.roles) || result.roles.length === 0) {
        throw new Error("ISS no devolvió roles activos. Verifique modo Local (ISS :8802) o recargue tras iniciar func start.");
      }
      setData(result);
      applyFlags(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      toastError(msg);
    } finally { setLoading(false); }
  }, [applyFlags]);

  const refreshPermisos = useCallback(async () => {
    const result = await fetchPermisos();
    if (!Array.isArray(result.roles) || result.roles.length === 0) {
      throw new Error("ISS no devolvió roles activos. Verifique modo Local (ISS :8802) o recargue tras iniciar func start.");
    }
    setData(result);
    applyFlags(result);
    return result;
  }, [applyFlags]);

  const loadPatyia = useCallback(async () => {
    setPatyiaBusy(true);
    try {
      const r = await fetchPatyiaAdminRoles();
      setPatyiaRoles(Array.isArray(r?.roles) ? r.roles : []);
      setPatyiaContactos(Array.isArray(r?.contactos) ? r.contactos : []);
    } catch (e) {
      toastError?.((e instanceof Error ? e.message : String(e)) ?? "Error cargando roles PatyIA");
    } finally {
      setPatyiaBusy(false);
    }
  }, []);

  const handlePatyiaAssign = useCallback(async ({ irol, icontacto, op, bprincipal }) => {
    if (!requireAppSession(onNeedLogin)) return;
    setPatyiaBusy(true);
    try {
      if (op === "remove") {
        await removePatyiaRolContacto({ irol, icontacto });
      } else {
        await assignPatyiaRolContacto({ irol, icontacto, bprincipal });
      }
      await loadPatyia();
      toastSuccess?.(`${icontacto} → ${irol}`);
    } catch (e) {
      toastError?.((e instanceof Error ? e.message : String(e)) ?? "Error PatyIA");
    } finally {
      setPatyiaBusy(false);
    }
  }, [loadPatyia, onNeedLogin]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { loadRef.current(); }, []);
  useEffect(() => { void loadPatyia(); }, [loadPatyia]);

  useEffect(() => subscribe((snap) => {
    const hide = readPermisosHideEmptyFromUrl(snap);
    setHideEmptyStacks((prev) => (prev === hide ? prev : hide));
  }), []);

  const setHideEmptyStacksPersist = useCallback((hide) => {
    setHideEmptyStacks(hide);
    persistPermisosHideEmpty(hide);
  }, []);

  const userDirectory = useMemo(() => buildUserDirectoryFromPermisos(data.users), [data.users]);

  useEffect(() => {
    Assets.ensureTodosCss();
    const onAuth = () => {
      setAuthTick((t) => t + 1);
      loadRef.current();
    };
    window.addEventListener(Session.EVENT, onAuth);
    window.addEventListener("isa-patyia:auth", onAuth);
    return () => {
      window.removeEventListener(Session.EVENT, onAuth);
      window.removeEventListener("isa-patyia:auth", onAuth);
    };
  }, []);

  async function run(fn, okMsg) {
    if (!requireAppSession(onNeedLogin)) return;
    setBusy(true); setErr("");
    try {
      const result = await fn();
      setData(result);
      applyFlags(result);
      if (okMsg) toastSuccess(okMsg);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg); toastError(msg);
      throw e;
    } finally { setBusy(false); }
  }

  // Kanban SYS_USR_PERMISSIONS: username string → PUT /permisos/usuarios/{u}/roles (no icontacto SEG).
  const handleRoleRemove = useCallback(async ({ username, role }) => {
    if (!requireAppSession(onNeedLogin)) throw new Error("Sesión requerida");
    if (!canAssignUserRoles) throw new Error("Sin permiso para mover usuarios entre roles");
    await removeUsuarioRole(String(username).trim().toUpperCase(), role);
    await refreshPermisos();
  }, [onNeedLogin, canAssignUserRoles, refreshPermisos]);

  const handleRoleAdd = useCallback(async ({ username, role }) => {
    if (!requireAppSession(onNeedLogin)) throw new Error("Sesión requerida");
    if (!canAssignUserRoles) throw new Error("Sin permiso para mover usuarios entre roles");
    await addUsuarioRole(String(username).trim().toUpperCase(), role);
    await refreshPermisos();
  }, [onNeedLogin, canAssignUserRoles, refreshPermisos]);

  const handleRoleDrag = useCallback(async ({ username, fromRole, toRole }) => {
    if (!requireAppSession(onNeedLogin)) throw new Error("Sesión requerida");
    if (!canAssignUserRoles) throw new Error("Sin permiso para mover usuarios entre roles");
    await putUsuarioRoles(String(username).trim().toUpperCase(), { fromRole, toRole, mode: "move" });
    await refreshPermisos();
  }, [onNeedLogin, canAssignUserRoles, refreshPermisos]);

  const fetchPermisosWithSearch = useCallback(async (search) => {
    const q = String(search ?? "").trim();
    return fetchPermisos(q ? { search: q } : undefined);
  }, []);

  const handleUserFilterDrop = useCallback(async (username) => {
    const q = String(username ?? "").trim();
    if (!q) return;
    setUserSearch(q);
    if (!usersPaginated) return;
    filterDropFetchRef.current = true;
    setFilterBusy(true); setErr("");
    try {
      const result = await fetchPermisosWithSearch(q);
      setData(result);
      applyFlags(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg); toastError(msg);
    } finally { setFilterBusy(false); }
  }, [usersPaginated, fetchPermisosWithSearch, applyFlags]);

  const handleRoleFilterDrop = useCallback((roleId) => {
    const id = String(roleId ?? "").trim().toUpperCase();
    if (!id) return;
    setRoleFilters((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const clearFilters = useCallback(async () => {
    setUserSearch("");
    setRoleFilters([]);
    if (!usersPaginated) return;
    setFilterBusy(true); setErr("");
    try {
      const result = await fetchPermisos();
      setData(result);
      applyFlags(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg); toastError(msg);
    } finally { setFilterBusy(false); }
  }, [usersPaginated, applyFlags]);

  useEffect(() => {
    if (!usersPaginated) return undefined;
    if (filterFetchSkipRef.current) { filterFetchSkipRef.current = false; return undefined; }
    if (filterDropFetchRef.current) { filterDropFetchRef.current = false; return undefined; }
    const t = window.setTimeout(async () => {
      setFilterBusy(true); setErr("");
      try {
        const result = await fetchPermisosWithSearch(userSearch);
        setData(result);
        applyFlags(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg); toastError(msg);
      } finally { setFilterBusy(false); }
    }, 320);
    return () => window.clearTimeout(t);
  }, [userSearch, usersPaginated, fetchPermisosWithSearch]);

  const roleOptions = useMemo(
    () => (data.roles || [])
      .map((r) => ({ id: roleNameFromEntry(r), label: roleTitleFromEntry(r) }))
      .filter((r) => r.id && r.id !== USR_ROLE),
    [data.roles],
  );
  const boardData = useMemo(
    () => buildPermisosBoard(data, { userSearch, roleFilters, userDirectory, hideEmptyColumns: hideEmptyStacks, contactos: data.contactos }),
    [data, userSearch, roleFilters, userDirectory, hideEmptyStacks],
  );
  const readOnly = !canAssignUserRoles;
  const managePermisos = canManage;
  const editRoleMeta = canEditRoleDescriptions || canManage;
  const filtersActive = !!(userSearch.trim() || roleFilters.length);
  const { GlassToolbar } = getGlass();

  const handleSaveRolePermisos = useCallback(async (name, permisos, bactivo) => {
    if (!editRoleMeta || !requireAppSession(onNeedLogin)) return;
    setBusy(true); setErr("");
    try {
      const result = await putPermisoRolePath(name, permisos, managePermisos ? bactivo : undefined);
      setData(result);
      applyFlags(result);
      toastSuccess(`Rol ${name} guardado`);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg); toastError(msg);
      throw e;
    } finally { setBusy(false); }
  }, [editRoleMeta, onNeedLogin, managePermisos, applyFlags]);

  if (loading) {
    return (
      <Box className="config-permisos-loading">
        <CircularProgress size={26} />
      </Box>
    );
  }

  return (
    <Box className="paty-permisos-shell" sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box ref={filterToolbarRef} className="config-permisos-toolbar-wrap" sx={{ flexShrink: 0 }}>
      <GlassToolbar className={`config-permisos-toolbar${dragOverFilter ? " config-permisos-toolbar--filter-drop" : ""}`} sx={{ borderRadius: 0, mb: 0, flexShrink: 0, gap: 0.75, px: { xs: 1.25, sm: 1.75 }, py: 0.5, alignItems: "center", minHeight: 40 }}>
        <PermisosUserAutocomplete
          variant="toolbar"
          label=""
          placeholder="Buscar usuario…"
          value={userSearch || null}
          onChange={(u) => setUserSearch(u ?? "")}
          disabled={filterBusy}
          allowNew
          limit={10}
          roleFilter={roleFilters.length === 1 ? roleFilters[0] : null}
          className="config-permisos-toolbar__field config-permisos-toolbar__field--search"
        />
        <PermisosRoleFilterAutocomplete options={roleOptions} value={roleFilters} onChange={setRoleFilters} disabled={filterBusy} />
        {filtersActive ? (
          <Chip size="small" variant="outlined" className="isa-neon-glass-chip" label="Filtros"
            onDelete={clearFilters} disabled={filterBusy} />
        ) : null}
        <FormControlLabel
          className="config-permisos-toolbar__hide-empty"
          control={<Switch size="small" checked={hideEmptyStacks} onChange={(e) => setHideEmptyStacksPersist(e.target.checked)} disabled={filterBusy} />}
          label="Ocultar vacíos"
          sx={{ mr: 0, ml: 0.25, flexShrink: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem", whiteSpace: "nowrap" } }}
        />
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Stack direction="row" spacing={0.5} alignItems="center" className="config-form-section__actions config-permisos-toolbar__actions">
          <ButtonIconify icon="mdi:shield-account" title="Roles planos PatyIA" onClick={() => void loadPatyia()} disabled={busy || filterBusy || patyiaBusy} />
          <ButtonIconify icon="mdi:refresh" title="Recargar" onClick={load} disabled={busy || filterBusy} />
        </Stack>
      </GlassToolbar>
      </Box>

      {err ? <Alert severity="warning" className="config-form-alert config-permisos-alert">{err}</Alert> : null}

      <PermisosKanban boardData={boardData} loggedIn={loggedIn} sessionUsername={sessionUsername} canAssignRoles={canAssignUserRoles} readOnly={readOnly} canManage={managePermisos} canEditRoleDescriptions={editRoleMeta} busy={busy || filterBusy}
        patyiaRoles={patyiaRoles}
        patyiaContactos={patyiaContactos}
        onPatyiaAssign={handlePatyiaAssign}
        onUserSummary={(username) => setSummaryUsername(username)}
        filterToolbarRef={filterToolbarRef} onUserFilterDrop={handleUserFilterDrop} onRoleFilterDrop={handleRoleFilterDrop} onDragOverFilterChange={setDragOverFilter}
        onRoleDrag={handleRoleDrag} onRoleRemove={handleRoleRemove} onRoleAdd={handleRoleAdd} />

      <UserPermissionsSummaryDialog
        open={!!summaryUsername}
        onClose={() => setSummaryUsername(null)}
        username={summaryUsername}
        users={data?.users ?? []}
        roles={data?.roles ?? []}
      />
    </Box>
  );
}
