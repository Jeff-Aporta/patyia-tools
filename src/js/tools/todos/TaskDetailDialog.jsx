import { getReact, getMaterialUI, UI } from "../../core/platform.ts";
import { PromptBodyEditor } from "../../ui/PromptBodyEditor.jsx";
import { UserAssignAutocomplete } from "./UserAssignAutocomplete.jsx";
import { TaskConvoThread } from "./TaskConvoThread.jsx";
import { normalizeAssigneeUsername } from "./todosKanbanShared.js";
import { scrumTaskContext } from "../../api/treeMsgsApi.ts";

const { useState, useEffect, useRef } = getReact();
const {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography,
  Tabs, Tab, Box, Accordion, AccordionSummary, AccordionDetails, Checkbox, FormControlLabel,
  CircularProgress, Chip, Divider, IconButton, Tooltip,
} = getMaterialUI();
const { Icon } = UI;

function formatShortId(id) {
  const s = String(id ?? "");
  if (s.length <= 5) return s;
  return `…${s.slice(-5)}`;
}

function formatDt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function toDateInputValue(value) {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function SubtaskEditor({ subtask, readOnly, busy, onSave, onDelete }) {
  const [title, setTitle] = useState(subtask.title);
  const [doc, setDoc] = useState(subtask.descriptionDoc || "");

  useEffect(() => {
    setTitle(subtask.title);
    setDoc(subtask.descriptionDoc || "");
  }, [subtask.id, subtask.title, subtask.descriptionDoc]);

  return (
    <Accordion className="paty-todos-subtask-acc" disableGutters>
      <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" size={18} />}>
        {readOnly ? (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{subtask.title}</Typography>
        ) : (
          <TextField
            size="small"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Título subtarea"
          />
        )}
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <TextField
            label="Documentación (Markdown)"
            fullWidth
            size="small"
            multiline
            minRows={3}
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            disabled={readOnly}
            placeholder="Opcional…"
          />
          {!readOnly ? (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                size="small"
                variant="contained"
                disabled={busy || !title.trim()}
                onClick={() => onSave(subtask.id, { title: title.trim(), descriptionDoc: doc })}
              >
                Guardar
              </Button>
              <Tooltip title="Eliminar subtarea">
                <IconButton
                  size="small"
                  color="error"
                  disabled={busy}
                  onClick={() => onDelete(subtask.id)}
                  aria-label="Eliminar subtarea"
                >
                  <Icon icon="mdi:delete-outline" size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function MilestoneEditor({ milestone, readOnly, busy, onSave, onDelete, onToggle }) {
  const [title, setTitle] = useState(milestone.title);
  const [dueDate, setDueDate] = useState(toDateInputValue(milestone.dueDate));

  useEffect(() => {
    setTitle(milestone.title);
    setDueDate(toDateInputValue(milestone.dueDate));
  }, [milestone.id, milestone.title, milestone.dueDate]);

  if (readOnly) {
    return (
      <Stack direction="row" alignItems="center" spacing={1} className="paty-todos-ms-row">
        <Checkbox checked={!!milestone.completedAt} disabled />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, textDecoration: milestone.completedAt ? "line-through" : "none" }}>
            {milestone.title}
          </Typography>
          {milestone.dueDate ? (
            <Typography variant="caption" color="text.secondary">Vence: {toDateInputValue(milestone.dueDate)}</Typography>
          ) : null}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} className="paty-todos-ms-row">
      <FormControlLabel
        control={(
          <Checkbox
            checked={!!milestone.completedAt}
            onChange={(e) => onToggle(milestone.id, e.target.checked)}
          />
        )}
        label=""
        sx={{ mr: 0 }}
      />
      <TextField
        size="small"
        label="Hito"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        sx={{ flex: 1 }}
      />
      <TextField
        size="small"
        type="date"
        label="Fecha"
        InputLabelProps={{ shrink: true }}
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        sx={{ minWidth: 160 }}
      />
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Button
          size="small"
          variant="outlined"
          disabled={busy || !title.trim()}
          onClick={() => onSave(milestone.id, { title: title.trim(), dueDate: dueDate || null })}
        >
          Guardar
        </Button>
        <Tooltip title="Eliminar hito">
          <IconButton
            size="small"
            color="error"
            disabled={busy}
            onClick={() => onDelete(milestone.id)}
            aria-label="Eliminar hito"
          >
            <Icon icon="mdi:delete-outline" size={18} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

export function TaskDetailDialog({ open, task, loading, readOnly = false, onClose, onSave, onSaveSubtask, onDeleteSubtask, onAddSubtask, onSaveMilestone, onDeleteMilestone, onAddMilestone, onToggleMilestone, onComment }) {
  const [tab, setTab] = useState(0);
  const [title, setTitle] = useState("");
  const [doc, setDoc] = useState("");
  const [assignedTo, setAssignedTo] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const prevId = useRef(null);
  useEffect(() => {
    if (!task || task.id === prevId.current) return;
    prevId.current = task.id;
    setTitle(task.title);
    setDoc(task.descriptionDoc || "");
    setAssignedTo(normalizeAssigneeUsername(task.assignedTo) || null);
    setTab(0);
  }, [task]);

  async function run(fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      scroll="paper"
      className="paty-todos-task-dialog"
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon icon="mdi:card-text-outline" size={22} />
        <Typography component="span" variant="h6" sx={{ flex: 1, fontWeight: 700, lineHeight: 1.3 }}>
          {loading ? "Cargando…" : (task?.title || "Tarea")}
        </Typography>
        {task?.id ? (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ fontFamily: "monospace", letterSpacing: "0.02em", flexShrink: 0 }}
            title={task.id}
          >
            {formatShortId(task.id)}
          </Typography>
        ) : null}
        {loading ? <CircularProgress size={20} /> : null}
      </DialogTitle>
      <DialogContent dividers className="paty-todos-task-dialog__content">
        {task ? (
          <Box className="paty-todos-task-dialog__inner">
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, flexShrink: 0 }}>
              <Tab label="Detalle" />
              <Tab label={`Subtareas (${task.subtasks?.length ?? 0})`} />
              <Tab label={`Hitos (${task.milestones?.length ?? 0})`} />
              <Tab label="Trazabilidad" />
            </Tabs>

            {tab === 0 ? (
              <Stack spacing={2} className="paty-todos-task-dialog__detail">
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start" sx={{ flexShrink: 0 }}>
                  <TextField
                    label="Título"
                    fullWidth
                    size="small"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={readOnly}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                    <UserAssignAutocomplete
                      label="Asignado a"
                      value={assignedTo}
                      disabled={readOnly}
                      compact
                      onChange={setAssignedTo}
                    />
                  </Box>
                </Stack>
                <Box className="paty-todos-task-objective">
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                    Objetivo
                  </Typography>
                  <Box className="paty-todos-task-objective__editor">
                    <PromptBodyEditor
                      body={doc}
                      canEdit={!readOnly && !busy}
                      editBlockReason="Solo lectura"
                      onChange={setDoc}
                      onPersist={async (next) => {
                        const trimmed = String(next ?? "");
                        setDoc(trimmed);
                        if (!readOnly) {
                          await run(async () => { await onSave({ descriptionDoc: trimmed }); });
                        }
                      }}
                      placeholder="Objetivo de la tarea en Markdown… (doble clic para editar)"
                      title="Objetivo"
                      loading={loading}
                    />
                  </Box>
                </Box>
                <Box className="paty-todos-task-dialog__convo">
                  <TaskConvoThread
                    contextKey={scrumTaskContext(task.id)}
                    readOnly={readOnly}
                  />
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
                  <Chip size="small" label={`Creada por ${task.createdBy}`} />
                  {task.completedAt ? <Chip size="small" color="success" label="Finalizada" /> : null}
                </Stack>
              </Stack>
            ) : null}

            {tab === 1 ? (
              <Box className="paty-todos-task-dialog__scroll">
              <Stack spacing={1}>
                {(task.subtasks ?? []).map((st) => (
                  <SubtaskEditor
                    key={st.id}
                    subtask={st}
                    readOnly={readOnly}
                    busy={busy}
                    onSave={(id, patch) => run(() => onSaveSubtask(id, patch))}
                    onDelete={(id) => run(() => onDeleteSubtask(id))}
                  />
                ))}
                <Divider sx={{ my: 1 }} />
                {!readOnly ? (
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Nueva subtarea…"
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && subtaskTitle.trim()) {
                          run(async () => {
                            await onAddSubtask(subtaskTitle);
                            setSubtaskTitle("");
                          });
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={busy || !subtaskTitle.trim()}
                      onClick={() => run(async () => {
                        await onAddSubtask(subtaskTitle);
                        setSubtaskTitle("");
                      })}
                    >
                      Añadir
                    </Button>
                  </Stack>
                ) : null}
              </Stack>
              </Box>
            ) : null}

            {tab === 2 ? (
              <Box className="paty-todos-task-dialog__scroll">
              <Stack spacing={1.5}>
                {(task.milestones ?? []).map((ms) => (
                  <MilestoneEditor
                    key={ms.id}
                    milestone={ms}
                    readOnly={readOnly}
                    busy={busy}
                    onSave={(id, patch) => run(() => onSaveMilestone(id, patch))}
                    onDelete={(id) => run(() => onDeleteMilestone(id))}
                    onToggle={(id, completed) => run(() => onToggleMilestone(id, completed))}
                  />
                ))}
                <Divider sx={{ my: 1 }} />
                {!readOnly ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField size="small" fullWidth label="Hito" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
                    <TextField
                      size="small"
                      type="date"
                      label="Fecha"
                      InputLabelProps={{ shrink: true }}
                      value={msDate}
                      onChange={(e) => setMsDate(e.target.value)}
                      sx={{ minWidth: 160 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={busy || !msTitle.trim()}
                      onClick={() => run(async () => {
                        await onAddMilestone(msTitle, msDate || null);
                        setMsTitle("");
                        setMsDate("");
                      })}
                    >
                      Añadir
                    </Button>
                  </Stack>
                ) : null}
              </Stack>
              </Box>
            ) : null}

            {tab === 3 ? (
              <Box className="paty-todos-task-dialog__scroll">
              <Stack spacing={0}>
                {!readOnly ? (
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      placeholder="Comentario / nota de trazabilidad…"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={busy || !comment.trim()}
                      sx={{ alignSelf: "flex-end" }}
                      onClick={() => run(async () => {
                        await onComment(comment);
                        setComment("");
                      })}
                    >
                      Registrar
                    </Button>
                  </Stack>
                ) : null}
                {(task.events ?? []).map((ev) => (
                  <Box key={ev.id} className="paty-todos-event">
                    <div className="paty-todos-event__meta">
                      <strong>{ev.author}</strong> · {ev.eventType} · {formatDt(ev.createdAt)}
                    </div>
                    <div>{ev.body || "—"}</div>
                  </Box>
                ))}
                {!(task.events ?? []).length ? (
                  <Typography variant="body2" color="text.secondary">Sin eventos aún.</Typography>
                ) : null}
              </Stack>
              </Box>
            ) : null}
          </Box>
        ) : (
          <Typography color="text.secondary">Selecciona una tarea.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        {tab === 0 && task && !readOnly ? (
          <Button
            variant="contained"
            disabled={busy || !title.trim()}
            onClick={() => run(async () => {
              await onSave({
                title: title.trim(),
                assignedTo: normalizeAssigneeUsername(assignedTo) || null,
                descriptionDoc: doc,
              });
            })}
          >
            Guardar
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
