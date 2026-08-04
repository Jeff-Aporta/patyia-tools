import { getReact, getMaterialUI, UI } from "../../core/platform.ts";
import {
  MAX_COLUMN_TASKS,
  formatTaskDate,
  groupTasksByColumn,
  taskModDate,
} from "./todosKanbanShared.js";
import { TaskAssigneeLabel } from "./TaskAssigneeLabel.jsx";

const { useState, useMemo, useRef, useEffect, memo } = getReact();
const { Box, Paper, Typography, TextField, Button, Stack, Chip } = getMaterialUI();
const { Icon } = UI;

const DRAG_THRESHOLD_PX = 6;

/** Tema visual por columna (extensible cuando haya más columnas). */
const COLUMN_THEME = {
  pending: {
    className: "paty-todos-column--pending",
    accent: "#1e90ff",
    icon: "mdi:clock-outline",
  },
  done: {
    className: "paty-todos-column--done",
    accent: "#10b981",
    icon: "mdi:check-circle-outline",
  },
};

function themeForColumn(columnKey) {
  return COLUMN_THEME[columnKey] ?? {
    className: "paty-todos-column--default",
    accent: "#94a3b8",
    icon: "mdi:view-column",
  };
}

function columnAtPoint(columnIds, listRefs, clientX, clientY) {
  for (const colId of columnIds) {
    const el = listRefs.current[colId];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (
      clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
    ) {
      return colId;
    }
  }
  return null;
}

function TaskCardBody({ task }) {
  const modDate = formatTaskDate(taskModDate(task));
  return (
    <>
      <Typography className="paty-todos-card__title" component="div" variant="body2">
        {task.title}
      </Typography>
      <TaskAssigneeLabel assignedTo={task.assignedTo} />
      <Typography className="paty-todos-card__date paty-todos-card__date--bottom" component="div" variant="caption" color="text.secondary">
        {modDate}
      </Typography>
    </>
  );
}

function DragGhost({ task, x, y, width }) {
  if (!task) return null;
  return (
    <Paper
      className="paty-todos-card paty-todos-card--ghost isa-glass-card"
      elevation={8}
      style={{
        position: "fixed",
        left: x,
        top: y,
        width,
        zIndex: 10000,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <TaskCardBody task={task} />
    </Paper>
  );
}

const TaskCard = memo(function TaskCard({
  task, columnId, readOnly, isOptimistic, isDragSource, onOpen, onPointerDragStart, suppressClickRef,
}) {
  const canDrag = !readOnly && !isOptimistic;

  return (
    <Paper
      className={`paty-todos-card isa-glass-card${isOptimistic ? " paty-todos-card--optimistic" : ""}${canDrag ? " paty-todos-card--draggable" : ""}${isDragSource ? " paty-todos-card--drag-source" : ""}`}
      elevation={0}
      onPointerDown={(e) => {
        if (!canDrag) return;
        if (e.button !== 0 && e.pointerType !== "touch") return;
        onPointerDragStart(task.id, columnId, e);
      }}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onOpen(task.id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(task.id); }}
    >
      <TaskCardBody task={task} />
    </Paper>
  );
});

function ColumnAddForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!open) {
    return (
      <Button
        fullWidth
        size="small"
        className="paty-todos-add-card"
        startIcon={<Icon icon="mdi:plus" size={16} />}
        onClick={() => setOpen(true)}
        sx={{ justifyContent: "flex-start", color: "text.secondary" }}
      >
        Añadir tarjeta
      </Button>
    );
  }

  return (
    <Box className="paty-todos-add-card">
      <TextField
        autoFocus
        fullWidth
        size="small"
        multiline
        minRows={2}
        placeholder="Título de la tarea…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && title.trim()) {
            e.preventDefault();
            onAdd(title.trim());
            setTitle("");
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
          variant="contained"
          size="small"
          disabled={!title.trim()}
          onClick={() => {
            onAdd(title.trim());
            setTitle("");
            setOpen(false);
          }}
        >
          Añadir
        </Button>
        <Button size="small" onClick={() => { setOpen(false); setTitle(""); }}>Cancelar</Button>
      </Stack>
    </Box>
  );
}

export function TodosKanban({ boardData, readOnly = false, preview = false, onOpenTask, onQuickAdd, onDragStart, onDropColumn }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragGhost, setDragGhost] = useState(null);
  const [expandedCols, setExpandedCols] = useState(() => new Set());
  const listRefs = useRef({});
  const dragRef = useRef(null);
  const cardElRef = useRef(null);
  const suppressClickRef = useRef(false);

  const tasksByColumn = useMemo(() => groupTasksByColumn(boardData), [boardData]);
  const ghostTask = useMemo(() => {
    if (!dragGhost?.taskId) return null;
    return boardData?.tasks?.find((t) => t.id === dragGhost.taskId) ?? null;
  }, [dragGhost, boardData?.tasks]);

  const columnIds = useMemo(
    () => (boardData?.columns ?? []).map((c) => c.id),
    [boardData?.columns],
  );

  function finishDrag(clientX, clientY) {
    const state = dragRef.current;
    dragRef.current = null;
    setDraggingTaskId(null);
    setDragOverCol(null);
    setDragGhost(null);
    cardElRef.current = null;

    if (!state?.moved) return;
    suppressClickRef.current = true;
    const targetCol = columnAtPoint(columnIds, listRefs, clientX, clientY);
    if (targetCol && targetCol !== state.sourceColumnId) {
      onDropColumn(targetCol);
    }
  }

  function handlePointerDragStart(taskId, sourceColumnId, e) {
    if (readOnly) return;
    onDragStart(taskId);
    dragRef.current = {
      taskId,
      sourceColumnId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
    cardElRef.current = e.currentTarget;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (readOnly) return undefined;

    function onPointerMove(e) {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      const dx = Math.abs(e.clientX - state.startX);
      const dy = Math.abs(e.clientY - state.startY);
      if (!state.moved && dx + dy < DRAG_THRESHOLD_PX) return;
      if (!state.moved) {
        state.moved = true;
        setDraggingTaskId(state.taskId);
        const rect = cardElRef.current?.getBoundingClientRect();
        if (rect) {
          state.offsetX = e.clientX - rect.left;
          state.offsetY = e.clientY - rect.top;
          state.ghostWidth = rect.width;
          setDragGhost({
            taskId: state.taskId,
            x: rect.left,
            y: rect.top,
            width: rect.width,
          });
        }
      }
      e.preventDefault();
      if (state.ghostWidth != null) {
        setDragGhost({
          taskId: state.taskId,
          x: e.clientX - state.offsetX,
          y: e.clientY - state.offsetY,
          width: state.ghostWidth,
        });
      }
      const colId = columnAtPoint(columnIds, listRefs, e.clientX, e.clientY);
      setDragOverCol(colId);
    }

    function onPointerUp(e) {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
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
  }, [readOnly, columnIds, onDropColumn]);

  if (!boardData) return null;

  const { columns } = boardData;

  const fullBoard = !preview;

  return (
    <Box className={`paty-todos-kanban-wrap${readOnly && !preview ? " paty-todos-kanban-wrap--readonly" : ""}`}
      sx={fullBoard ? { flex: 1, minHeight: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", p: 0 } : undefined}>
      {readOnly && !preview ? (
        <Chip
          size="small"
          className="paty-todos-kanban__readonly-chip"
          label="Solo lectura"
          icon={<Icon icon="mdi:eye-outline" size={14} />}
          sx={{ alignSelf: "flex-start", width: "auto", flex: "0 0 auto", ml: "18px", mt: 1.5 }}
        />
      ) : null}
      <Box className={`paty-todos-kanban${preview ? " paty-todos-kanban--preview" : ""}${draggingTaskId ? " paty-todos-kanban--dragging" : ""}`}
        sx={fullBoard ? { flex: 1, minHeight: 0, height: "100%", display: "flex", alignItems: "stretch", alignSelf: "stretch" } : undefined}>
      {dragGhost ? (
        <DragGhost task={ghostTask} x={dragGhost.x} y={dragGhost.y} width={dragGhost.width} />
      ) : null}
      {columns.map((col) => {
        const colTasks = tasksByColumn.get(col.id) ?? [];
        const isExpanded = expandedCols.has(col.id);
        const hasMore = colTasks.length > MAX_COLUMN_TASKS;
        const visibleTasks = isExpanded || !hasMore
          ? colTasks
          : colTasks.slice(0, MAX_COLUMN_TASKS);
        const hiddenCount = hasMore && !isExpanded ? colTasks.length - MAX_COLUMN_TASKS : 0;
        const isOver = dragOverCol === col.id;
        const theme = themeForColumn(col.columnKey);
        return (
          <Box
            key={col.id}
            className={`paty-todos-column ${theme.className}`}
            style={{ "--col-accent": theme.accent }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} className="paty-todos-column__head"
              sx={{ flexShrink: 0, px: 1.75, py: 1.25, pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} className="paty-todos-column__title" sx={{ minWidth: 0, flex: 1 }}>
                <Icon icon={theme.icon} size={16} />
                <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }} title={col.title}>
                  {col.title}
                </Box>
              </Stack>
              <Box component="span" className="paty-todos-column__count"
                sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, height: 22, minWidth: 22, px: 1, boxSizing: "border-box", flexShrink: 0 }}>
                {colTasks.length}
              </Box>
            </Stack>
            <Stack
              ref={(el) => { listRefs.current[col.id] = el; }}
              data-column-id={col.id}
              spacing={fullBoard ? 0.75 : 1.25}
              className={`paty-todos-column__list${isOver ? " paty-todos-column__list--drag-over" : ""}`}
              sx={{
                flex: 1,
                minHeight: fullBoard ? 0 : 56,
                overflowY: "auto",
                overflowX: "hidden",
                p: 1.25,
                px: 1.5,
                boxSizing: "border-box",
              }}
            >
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  columnId={col.id}
                  readOnly={readOnly}
                  isOptimistic={String(task.id).startsWith("optimistic-")}
                  isDragSource={draggingTaskId === task.id}
                  onOpen={onOpenTask}
                  onPointerDragStart={handlePointerDragStart}
                  suppressClickRef={suppressClickRef}
                />
              ))}
              {hiddenCount > 0 ? (
                <Button
                  fullWidth
                  size="small"
                  className="paty-todos-column__show-all"
                  onClick={() => setExpandedCols((prev) => new Set(prev).add(col.id))}
                >
                  Ver todo ({colTasks.length})
                </Button>
              ) : null}
              {isExpanded && hasMore ? (
                <Button
                  fullWidth
                  size="small"
                  className="paty-todos-column__show-all"
                  onClick={() => setExpandedCols((prev) => {
                    const next = new Set(prev);
                    next.delete(col.id);
                    return next;
                  })}
                >
                  Ver menos
                </Button>
              ) : null}
            </Stack>
            {!readOnly && !preview && col.columnKey === "pending" ? (
              <ColumnAddForm onAdd={(title) => onQuickAdd(col.id, title)} />
            ) : null}
          </Box>
        );
      })}
      </Box>
    </Box>
  );
}
