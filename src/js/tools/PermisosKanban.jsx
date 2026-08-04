import { getMaterialUI, getReact, getReactDOM, UI } from "../core/platform.ts";

import { ButtonIconify } from "../ui/shared.jsx";

import { columnAtPoint, pointInRef, userCardLabels } from "./permisosKanbanShared.js";

import { RoleDragDialog, RoleRemoveDialog, RoleAddDialog } from "./permisosRoleConfig.jsx";

const { useState, useMemo, useRef, useEffect, memo } = getReact();

const { createPortal } = getReactDOM();

const { Box, Paper, Typography, Stack, Chip, IconButton, Tooltip, CircularProgress } = getMaterialUI();

const { Icon } = UI;



const DRAG_THRESHOLD_PX = 6;



const UserCard = memo(function UserCard({ card, columnId, columnTitle, canDragUser, isDragSource, userBusy, isSelected, isDimmed, onPointerDragStart, onRoleRemoveRequest, onUserSelect, onUserSummary, suppressClickRef }) {

  const canDragRole = !!canDragUser && !userBusy;

  const labels = card.labels ?? userCardLabels(card.username, card.displayName);

  const cardClass = [

    "paty-todos-card", "paty-permisos-user-card", "isa-glass-card",

    canDragRole ? "paty-todos-card--draggable" : "",

    isDragSource ? "paty-todos-card--drag-source" : "",

    userBusy ? "paty-permisos-user-card--user-busy" : "",

    isSelected ? "paty-permisos-user-card--selected" : "",

    isDimmed ? "paty-permisos-user-card--dimmed" : "",

  ].filter(Boolean).join(" ");

  return (

    <Paper className={cardClass} elevation={0} aria-busy={userBusy || undefined}

      onPointerDown={canDragRole ? (e) => {

        if (e.button !== 0 && e.pointerType !== "touch") return;

        if (e.target.closest(".paty-permisos-user-card__remove, .paty-permisos-user-card__busy")) return;

        onPointerDragStart(card.id, columnId, card.username, e);

      } : undefined}

      onClick={(e) => {

        if (suppressClickRef.current) { suppressClickRef.current = false; return; }

        if (userBusy || e.target.closest(".paty-permisos-user-card__remove, .paty-permisos-user-card__busy")) return;

        e.stopPropagation();

        onUserSelect?.(card.username);

      }}

      onDoubleClick={(e) => {

        if (userBusy || e.target.closest(".paty-permisos-user-card__remove, .paty-permisos-user-card__busy")) return;

        e.stopPropagation();

        onUserSummary?.(card.username);

      }}>

      <Stack direction="row" alignItems="center" spacing={0.25} className="paty-permisos-user-card__row" sx={{ minWidth: 0 }}>

        <Box className="paty-permisos-user-card__body" sx={{ minWidth: 0, flex: 1 }}>

          <Typography className="paty-todos-card__title" component="div" variant="body2" fontWeight={700} noWrap title={[labels.primary, labels.idsCaption].filter(Boolean).join(" ")}>
            <span className="paty-permisos-user-card__name">{labels.primary}</span>
            {labels.idsCaption ? <span className="paty-todos-card__caption paty-permisos-user-card__ids"> {labels.idsCaption}</span> : null}
          </Typography>

        </Box>

        {userBusy ? (

          <Tooltip title="Procesando…">

            <span className="paty-permisos-user-card__busy" aria-label="Procesando">

              <CircularProgress size={14} thickness={5} color="inherit" />

            </span>

          </Tooltip>

        ) : canDragRole ? (

          <Tooltip title={`Quitar de ${columnTitle || columnId}`}>

            <span className="paty-permisos-user-card__remove-wrap">

              <IconButton size="small" type="button" className="paty-permisos-user-card__remove" aria-label={`Quitar de ${columnTitle || columnId}`}

                onPointerDown={(e) => { e.stopPropagation(); }} onClick={(e) => {

                  e.stopPropagation();

                  e.preventDefault();

                  onRoleRemoveRequest?.({ cardId: card.id, username: card.username, role: columnId, roleTitle: columnTitle });

                }}>

                <Icon icon="mdi:close" size={14} />

              </IconButton>

            </span>

          </Tooltip>

        ) : null}

      </Stack>

    </Paper>

  );

});



function DragGhost({ card, column, x, y, width }) {

  if (column) {
    const node = (
      <Paper className="paty-todos-card paty-permisos-column-ghost paty-todos-card--ghost isa-glass-card" elevation={8}
        style={{ position: "fixed", left: x, top: y, width, zIndex: 10000, pointerEvents: "none", margin: 0 }} aria-hidden>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          <Icon icon={column.icon} size={16} />
          <Typography className="paty-todos-card__title" variant="body2" fontWeight={700} noWrap>{column.title}</Typography>
        </Stack>
      </Paper>
    );
    return typeof document !== "undefined" ? createPortal(node, document.body) : node;
  }

  if (!card) return null;

  const labels = card.labels ?? userCardLabels(card.username, card.displayName);

  const node = (

    <Paper className="paty-todos-card paty-permisos-user-card paty-permisos-drag-ghost paty-todos-card--ghost isa-glass-card" elevation={8}

      style={{ position: "fixed", left: x, top: y, width, zIndex: 10000, pointerEvents: "none", margin: 0 }} aria-hidden>

      <Typography className="paty-todos-card__title" variant="body2" fontWeight={700} noWrap>
        <span className="paty-permisos-user-card__name">{labels.primary}</span>
        {labels.idsCaption ? <span className="paty-todos-card__caption paty-permisos-user-card__ids"> {labels.idsCaption}</span> : null}
      </Typography>

    </Paper>

  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : node;

}



export function PermisosKanban({ boardData, loggedIn, canAssignRoles, readOnly, canManage, canEditRoleDescriptions, busy, sessionUsername, filterToolbarRef, onUserFilterDrop, onRoleFilterDrop, onDragOverFilterChange, onRoleDrag, onRoleRemove, onRoleAdd, onUserSummary }) {

  const [dragOverCol, setDragOverCol] = useState(null);

  const [draggingId, setDraggingId] = useState(null);

  const [dragGhost, setDragGhost] = useState(null);

  const [configCol] = useState(null);

  const [dragPending, setDragPending] = useState(null);

  const [removePending, setRemovePending] = useState(null);

  const [addPending, setAddPending] = useState(null);

  const [addingRoleId, setAddingRoleId] = useState(null);

  const [processingUsername, setProcessingUsername] = useState(null);

  const [selectedUsername, setSelectedUsername] = useState(null);

  const [dragSourceCol, setDragSourceCol] = useState(null);

  const columns = boardData?.columns ?? [];

  const listRefs = useRef({});

  const columnRefs = useRef({});

  const dragRef = useRef(null);

  const cardElRef = useRef(null);

  const suppressClickRef = useRef(false);

  const processingUserRef = useRef(null);

  const kanbanWrapRef = useRef(null);

  const dragPendingRef = useRef(null);

  const filterActive = !!boardData?.filterActive;

  const assignEnabled = !!loggedIn && !!canAssignRoles;

  const filterDragEnabled = !!loggedIn && !canAssignRoles;

  const noUsersVisible = !!boardData?.noUsersVisible;

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const ghostColumn = useMemo(() => {

    if (!dragGhost?.columnId) return null;

    return columns.find((c) => c.id === dragGhost.columnId) ?? null;

  }, [dragGhost, columns]);

  const ghostCard = useMemo(() => {

    if (!dragGhost?.cardId) return null;

    for (const col of columns) {

      const hit = col.users.find((u) => u.id === dragGhost.cardId);

      if (hit) return hit;

    }

    return null;

  }, [dragGhost, columns]);



  const selectedUserKey = selectedUsername ? String(selectedUsername).trim().toUpperCase() : null;

  const processingUserKey = processingUsername ? String(processingUsername).trim().toUpperCase() : null;



  useEffect(() => { dragPendingRef.current = dragPending; }, [dragPending]);



  function userKey(username) {

    return String(username ?? "").trim().toUpperCase();

  }



  function beginUserProcessing(username) {

    const key = userKey(username);

    if (!key || processingUserRef.current) return null;

    processingUserRef.current = key;

    setProcessingUsername(key);

    return key;

  }



  function endUserProcessing() {

    processingUserRef.current = null;

    setProcessingUsername(null);

  }



  useEffect(() => {

    function onDocPointerDown(e) {

      if (e.target.closest(".paty-permisos-user-card")) return;

      if (e.target.closest(".MuiDialog-root, .isa-glass-dialog")) return;

      setSelectedUsername(null);

    }

    document.addEventListener("pointerdown", onDocPointerDown, true);

    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);

  }, []);



  function handleUserSelect(username) {

    const key = String(username ?? "").trim().toUpperCase();

    if (!key || processingUserKey === key) return;

    setSelectedUsername((prev) => (prev && String(prev).trim().toUpperCase() === key ? null : key));

  }



  async function handleRemoveConfirm() {

    if (!removePending || !onRoleRemove || processingUserRef.current) return;

    if (!beginUserProcessing(removePending.username)) return;

    try {

      await onRoleRemove(removePending);

      setRemovePending(null);

    } catch { /* toast en PermisosPanel */ } finally {

      endUserProcessing();

    }

  }



  async function handleDragConfirm() {
    const pending = dragPendingRef.current;
    if (!pending || !onRoleDrag || processingUserRef.current) return;
    if (!beginUserProcessing(pending.username)) return;
    setDragPending(null);
    try {
      await onRoleDrag({ ...pending, mode: "move" });
    } catch { /* toast en PermisosPanel */ } finally {
      endUserProcessing();
    }

  }



  async function handleAddConfirm(username) {

    if (!addPending || !onRoleAdd || addingRoleId || !username) return;

    setAddingRoleId(addPending.role);

    try {

      await onRoleAdd({ username, role: addPending.role, roleTitle: addPending.roleTitle });

      setAddPending(null);

    } catch { /* toast en PermisosPanel */ } finally {

      setAddingRoleId(null);

    }

  }



  function finishDrag(clientX, clientY) {

    const state = dragRef.current;

    dragRef.current = null;

    setDraggingId(null);

    setDragOverCol(null);

    setDragSourceCol(null);

    setDragGhost(null);

    cardElRef.current = null;

    if (!state?.moved) return;

    suppressClickRef.current = true;

    if (filterToolbarRef && pointInRef(filterToolbarRef, clientX, clientY)) {

      if (state.kind === "column") onRoleFilterDrop?.(state.columnId);

      else if (state.username && filterDragEnabled) onUserFilterDrop?.(state.username);

      return;

    }

    if (state.kind === "column") return;

    if (!assignEnabled) return;

    if (processingUserRef.current) return;

    const targetCol = columnAtPoint(columnIds, columnRefs, clientX, clientY);

    if (!targetCol || targetCol === state.sourceColumnId) return;

    const username = state.username;

    if (processingUserRef.current && userKey(username) === processingUserRef.current) return;

    const fromRole = state.sourceColumnId;

    const toRole = targetCol;

    const sourceColData = columns.find((c) => c.id === fromRole);

    const targetColData = columns.find((c) => c.id === toRole);

    if (targetColData?.users?.some((u) => u.username === username)) return;

    // Sin tree: cualquier transferencia plana entre roles PatyIA se permite si el actor tiene canAssignUserRoles.
    if (!assignEnabled) return;

    setDragPending({
      username: userKey(username),
      fromRole,
      toRole,
      fromRoleTitle: sourceColData?.title ?? fromRole,
      toRoleTitle: targetColData?.title ?? toRole,
    });

  }



  function handleColumnHeadDragStart(col, e) {

    if (!filterDragEnabled) return;

    if (e.target.closest("button, .MuiIconButton-root")) return;

    if (processingUserRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();

    dragRef.current = {

      kind: "column",

      columnId: col.id,

      startX: e.clientX,

      startY: e.clientY,

      offsetX: e.clientX - rect.left,

      offsetY: e.clientY - rect.top,

      ghostWidth: rect.width,

      moved: false,

      pointerId: e.pointerId,

    };

    cardElRef.current = e.currentTarget;

    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }

  }



  function handlePointerDragStart(cardId, sourceColumnId, username, e) {

    const key = userKey(username);

    if (processingUserRef.current && key === processingUserRef.current) return;

    if (!assignEnabled) return;

    const sourceColData = columns.find((c) => c.id === sourceColumnId);

    if (!assignEnabled) return;

    const rect = e.currentTarget.getBoundingClientRect();

    dragRef.current = {

      kind: "user",

      cardId, sourceColumnId, username,

      startX: e.clientX, startY: e.clientY,

      offsetX: e.clientX - rect.left,

      offsetY: e.clientY - rect.top,

      ghostWidth: rect.width,

      moved: false,

      pointerId: e.pointerId,

    };

    cardElRef.current = e.currentTarget;

    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }

  }



  useEffect(() => {

    function onPointerMove(e) {

      const state = dragRef.current;

      if (!state || e.pointerId !== state.pointerId) return;

      const dx = Math.abs(e.clientX - state.startX);

      const dy = Math.abs(e.clientY - state.startY);

      if (!state.moved && dx + dy < DRAG_THRESHOLD_PX) return;

      if (!state.moved) {

        state.moved = true;

        if (state.kind === "column") setDraggingId(`col:${state.columnId}`);

        else setDraggingId(state.cardId);

        setDragSourceCol(state.sourceColumnId ?? null);

        if (state.ghostWidth != null) {

          setDragGhost({

            cardId: state.cardId,

            columnId: state.columnId,

            x: e.clientX - state.offsetX,

            y: e.clientY - state.offsetY,

            width: state.ghostWidth,

          });

        }

      }

      e.preventDefault();

      if (state.ghostWidth != null) {

        setDragGhost({ cardId: state.cardId, columnId: state.columnId, x: e.clientX - state.offsetX, y: e.clientY - state.offsetY, width: state.ghostWidth });

      }

      const overFilter = filterToolbarRef && pointInRef(filterToolbarRef, e.clientX, e.clientY);

      onDragOverFilterChange?.(!!overFilter);

      if (overFilter || state.kind === "column") setDragOverCol(null);

      else setDragOverCol(assignEnabled ? columnAtPoint(columnIds, columnRefs, e.clientX, e.clientY) : null);

    }

    function onPointerUp(e) {

      const state = dragRef.current;

      if (!state || e.pointerId !== state.pointerId) return;

      onDragOverFilterChange?.(false);

      finishDrag(e.clientX, e.clientY);

    }

    window.addEventListener("pointermove", onPointerMove, { passive: false });

    window.addEventListener("pointerup", onPointerUp);

    window.addEventListener("pointercancel", onPointerUp);

    return () => {

      window.removeEventListener("pointermove", onPointerMove);

      window.removeEventListener("pointerup", onPointerUp);

      window.removeEventListener("pointercancel", onPointerUp);

    };

  }, [assignEnabled, columnIds, columns, processingUserKey, filterToolbarRef, onDragOverFilterChange, loggedIn, canAssignRoles]);



  if (!boardData) return null;



  const transferBusy = !!processingUserKey;

  const removeBusy = transferBusy && !!removePending;

  const addBusy = !!addingRoleId;



  return (

    <Box ref={kanbanWrapRef} className="paty-todos-kanban-wrap paty-permisos-kanban-wrap" sx={{ flex: 1, minHeight: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", p: 0 }}>

      <Box className={`paty-todos-kanban paty-permisos-kanban${!assignEnabled ? " paty-permisos-kanban--no-assign" : ""}${draggingId ? " paty-todos-kanban--dragging" : ""}${selectedUserKey ? " paty-permisos-kanban--user-selected" : ""}${processingUserKey ? " paty-permisos-kanban--user-busy" : ""}`} sx={{ flex: 1, minHeight: 0, maxHeight: "100%", display: "flex", alignItems: "stretch", alignSelf: "stretch", position: "relative" }}>

        {dragGhost ? <DragGhost card={ghostCard} column={ghostColumn} x={dragGhost.x} y={dragGhost.y} width={dragGhost.width} /> : null}

        {noUsersVisible ? (

          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", p: 3, pointerEvents: "none", zIndex: 2 }}>

            <Typography variant="body2" color="text.secondary">Ningún usuario coincide con los filtros.</Typography>

          </Box>

        ) : null}

        {columns.length === 0 ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {boardData?.hideEmptyColumns
                ? "No hay columnas visibles (activa roles o desactiva «Ocultar vacíos»)."
                : "No hay roles configurados."}
            </Typography>
          </Box>
        ) : null}

        {columns.map((col) => {

          const canManageCol = assignEnabled;
          const canDropOnCol = canManageCol;

          const isOver = draggingId && !String(draggingId).startsWith("col:") && dragOverCol === col.id;

          const isOverAllowed = isOver && canDropOnCol;

          const isOverBlocked = isOver && !canDropOnCol;

          const isSource = draggingId && !String(draggingId).startsWith("col:") && dragSourceCol === col.id;

          const colClass = [

            "paty-todos-column",

            "paty-permisos-column",

            col.roleFilteredOut ? "paty-permisos-column--role-filtered" : "",

            isOverAllowed ? "paty-permisos-column--drag-over" : "",

            isOverBlocked ? "paty-permisos-column--drop-blocked" : "",

            isSource && !isOver ? "paty-permisos-column--drag-source" : "",

            draggingId && !String(draggingId).startsWith("col:") && !isOver && assignEnabled && !canDropOnCol ? "paty-permisos-column--drop-forbidden" : "",

            draggingId && !String(draggingId).startsWith("col:") && !isOver ? "paty-permisos-column--drag-idle" : "",

          ].filter(Boolean).join(" ");

          return (

            <Box key={col.id} ref={(el) => { columnRefs.current[col.id] = el; }} className={colClass} style={{ "--col-accent": col.accent }}
              sx={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", alignSelf: "stretch" }}>

              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}
                className={`paty-todos-column__head${filterDragEnabled ? " paty-permisos-column__head--filter-draggable" : ""}`}
                sx={{ flexShrink: 0, px: 1.75, py: 1.25, pb: 1, cursor: filterDragEnabled ? "grab" : "default" }}
                onPointerDown={(e) => handleColumnHeadDragStart(col, e)}>

                <Stack direction="row" alignItems="center" spacing={0.75} className="paty-todos-column__title" sx={{ minWidth: 0, flex: 1 }}>

                  <Icon icon={col.icon} size={16} />

                  <Box sx={{ minWidth: 0 }}>

                    <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ minWidth: 0 }}>
                      <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }} title={
                        col.roleName && col.title !== col.roleName
                          ? `${col.title} (${col.roleName})`
                          : col.title
                      }>{col.title}</Box>
                    </Stack>

                    {col.descripcion ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3, mt: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={col.descripcion}>{col.descripcion}</Typography> : null}

                  </Box>

                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>

                  {canManageCol ? (

                    <Tooltip title={addBusy && addingRoleId === col.id ? "Agregando…" : "Agregar usuario"}>

                      <span className="paty-permisos-column__add-wrap">

                        <IconButton size="small" className="paty-permisos-column__add" disabled={addBusy}

                          aria-label={`Agregar usuario a ${col.title || col.id}`}

                          onClick={() => {

                            if (addBusy) return;

                            setAddPending({

                              role: col.id,

                              roleTitle: col.title,

                              columns,

                              existingUsernames: new Set(col.users.map((u) => u.username)),

                            });

                          }}>

                          {addBusy && addingRoleId === col.id ? <CircularProgress size={14} thickness={5} /> : <Icon icon="mdi:plus" size={16} />}

                        </IconButton>

                      </span>

                    </Tooltip>

                  ) : null}

                </Stack>

              </Stack>

              <Box ref={(el) => { listRefs.current[col.id] = el; }} data-column-id={col.id}
                className={`paty-todos-column__list paty-permisos-column__list${isOverAllowed ? " paty-todos-column__list--drag-over" : ""}${isOverBlocked ? " paty-todos-column__list--drop-blocked" : ""}`}
                sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.25, px: 1.5, boxSizing: "border-box" }}>

                {col.users.map((card) => {

                  const cardUserKey = userKey(card.username);

                  const userBusy = !!processingUserKey && processingUserKey === cardUserKey;

                  const isSelected = selectedUserKey === cardUserKey;

                  const isDimmed = !!selectedUserKey && !isSelected;

                  const canDragUser = canAssignRoles && !readOnly;

                  return (

                    <UserCard key={card.id} card={card} columnId={col.id} columnTitle={col.title}

                      canDragUser={canDragUser}

                      isDragSource={draggingId === card.id} userBusy={userBusy} isSelected={isSelected} isDimmed={isDimmed}

                      onPointerDragStart={handlePointerDragStart} onRoleRemoveRequest={setRemovePending}

                      onUserSelect={handleUserSelect} onUserSummary={onUserSummary} suppressClickRef={suppressClickRef} />

                  );

                })}

                {!col.users.length ? <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, py: 1 }}>Sin usuarios</Typography> : null}

              </Box>

            </Box>

          );

        })}

      </Box>



      {typeof document !== "undefined" ? createPortal((
        <>
          <RoleDragDialog open={!!dragPending} pending={dragPending} busy={transferBusy} sessionUsername={sessionUsername}
            onClose={() => { if (!transferBusy) setDragPending(null); }} onConfirm={handleDragConfirm} />
          <RoleRemoveDialog open={!!removePending} pending={removePending} busy={removeBusy} sessionUsername={sessionUsername}
            onClose={() => { if (!removeBusy) setRemovePending(null); }} onConfirm={handleRemoveConfirm} />
          <RoleAddDialog open={!!addPending} pending={addPending} busy={addBusy}
            onClose={() => { if (!addBusy) setAddPending(null); }} onConfirm={handleAddConfirm} />
        </>
      ), document.body) : null}

    </Box>

  );

}


