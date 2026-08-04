import { getReact, getMaterialUI, UI, toastSuccess, toastError } from "../../core/platform.ts";
import { PromptBodyEditor } from "../../ui/PromptBodyEditor.jsx";
import { fetchTodoBoardMembers, saveTodoBoardMembers } from "../../api/todosApi.ts";
import { UserAssignAutocomplete } from "./UserAssignAutocomplete.jsx";

const { useState, useEffect } = getReact();
const {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Box,
  FormControl, InputLabel, Select, MenuItem, Typography, Chip, IconButton, Tooltip,
  CircularProgress,
} = getMaterialUI();
const { Icon } = UI;

function roleLabel(boardRole) {
  return boardRole === "readonly" ? "Solo lectura" : "Editor";
}

function BoardMembersSection({
  boardId, open, readOnly, saving, onMembersChange,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [membersSaving, setMembersSaving] = useState(false);
  const [addKey, setAddKey] = useState(0);

  useEffect(() => {
    if (!open || !boardId) return;
    let cancelled = false;
    setLoading(true);
    fetchTodoBoardMembers(boardId)
      .then((list) => { if (!cancelled) setMembers(list); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, boardId]);

  const disabled = readOnly || saving || membersSaving || loading;
  const usernames = new Set(members.map((m) => m.username));

  async function persist(next) {
    setMembers(next);
    if (readOnly || !boardId) return;
    setMembersSaving(true);
    try {
      const updated = await saveTodoBoardMembers(boardId, next);
      setMembers(updated);
      onMembersChange?.(updated);
      toastSuccess("Integrantes actualizados");
    } catch (e) {
      const list = await fetchTodoBoardMembers(boardId);
      setMembers(list);
      toastError(e instanceof Error ? e.message : "No se pudieron guardar los integrantes");
    } finally {
      setMembersSaving(false);
    }
  }

  function updateRole(username, boardRole) {
    void persist(members.map((m) => (m.username === username ? { ...m, boardRole } : m)));
  }

  function removeMember(username) {
    void persist(members.filter((m) => m.username !== username));
  }

  function addMember(username) {
    const user = String(username ?? "").trim().toUpperCase();
    if (!user || usernames.has(user)) return;
    void persist([...members, { username: user, boardRole: "editor" }]);
    setAddKey((n) => n + 1);
  }

  return (
    <Box className="paty-todos-board-members">
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
        Integrantes
      </Typography>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
          <CircularProgress size={22} />
        </Box>
      ) : members.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Sin integrantes registrados.
        </Typography>
      ) : (
        <Stack spacing={0.75} className="paty-todos-board-members__list" sx={{ mb: 1 }}>
          {members.map((m) => (
            <Stack
              key={m.username}
              direction="row"
              spacing={1}
              alignItems="center"
              className="paty-todos-board-members__row"
            >
              <Chip
                size="small"
                label={m.username}
                icon={(
                  <Icon
                    icon={m.boardRole === "readonly" ? "mdi:eye-outline" : "mdi:pencil-outline"}
                    size={14}
                  />
                )}
                sx={{ flex: 1, minWidth: 0, justifyContent: "flex-start" }}
              />
              {readOnly ? (
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {roleLabel(m.boardRole)}
                </Typography>
              ) : (
                <>
                  <FormControl size="small" disabled={disabled} className="paty-todos-board-members__role">
                    <Select
                      value={m.boardRole}
                      onChange={(e) => updateRole(m.username, e.target.value)}
                      aria-label={`Rol de ${m.username}`}
                    >
                      <MenuItem value="editor">Editor</MenuItem>
                      <MenuItem value="readonly">Solo lectura</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title="Quitar integrante">
                    <span>
                      <IconButton
                        size="small"
                        disabled={disabled}
                        aria-label={`Quitar ${m.username}`}
                        onClick={() => removeMember(m.username)}
                      >
                        <Icon icon="mdi:account-remove-outline" size={18} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
            </Stack>
          ))}
        </Stack>
      )}
      {!readOnly ? (
        <Box className="paty-todos-board-members__add">
          <UserAssignAutocomplete
            key={addKey}
            value={null}
            onChange={addMember}
            disabled={disabled}
            label="Añadir integrante"
            compact
          />
        </Box>
      ) : null}
      {membersSaving ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Guardando integrantes…
        </Typography>
      ) : null}
    </Box>
  );
}

export function BoardSettingsDialog({
  open, onClose, boardId, board, readOnly, saving, onSave, onMembersChange,
}) {
  const [title, setTitle] = useState(board?.title ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [visibility, setVisibility] = useState(board?.visibility ?? "private");

  useEffect(() => {
    if (!open) return;
    setTitle(board?.title ?? "");
    setDescription(board?.description ?? "");
    setVisibility(board?.visibility ?? "private");
  }, [open, board?.title, board?.description, board?.visibility]);

  if (!board) return null;

  async function saveField(patch) {
    if (readOnly) return;
    await onSave(patch);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth className="paty-todos-board-settings-dialog">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon icon="mdi:cog-outline" size={22} />
        Detalles del tablero
      </DialogTitle>
      <DialogContent className="paty-todos-board-settings-dialog__content">
        {readOnly ? (
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="baseline"
              flexWrap="wrap"
              className="paty-todos-board-settings-head"
            >
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                <strong>Título:</strong> {board.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Visibilidad:</strong>{" "}
                {board.visibility === "public" ? "Público" : "Privado"}
              </Typography>
            </Stack>
            <Box className="paty-todos-board-desc-field">
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                Descripción
              </Typography>
              <Box className="paty-todos-board-desc-editor">
                <PromptBodyEditor
                  body={board.description ?? ""}
                  canEdit={false}
                  editBlockReason=""
                  placeholder="Sin descripción"
                  title="Descripción del tablero"
                />
              </Box>
            </Box>
            <BoardMembersSection
              boardId={boardId}
              open={open}
              readOnly
              saving={saving}
              onMembersChange={onMembersChange}
            />
          </Stack>
        ) : (
          <Stack spacing={1.5} className="paty-todos-board-row__edit" sx={{ pt: 0.5 }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              className="paty-todos-board-settings-head"
            >
              <TextField
                label="Título"
                size="small"
                fullWidth
                value={title}
                disabled={saving}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  const trimmed = title.trim();
                  if (trimmed && trimmed !== board.title) void saveField({ title: trimmed });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <FormControl size="small" disabled={saving} className="paty-todos-board-settings-vis">
                <InputLabel id="paty-board-settings-vis" shrink>Visibilidad</InputLabel>
                <Select
                  labelId="paty-board-settings-vis"
                  label="Visibilidad"
                  value={visibility}
                  onChange={(e) => {
                    const next = e.target.value;
                    setVisibility(next);
                    if (next !== board.visibility) void saveField({ visibility: next });
                  }}
                >
                  <MenuItem value="private">Privado</MenuItem>
                  <MenuItem value="public">Público</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Box className="paty-todos-board-desc-field">
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                Descripción
              </Typography>
              <Box className="paty-todos-board-desc-editor">
                <PromptBodyEditor
                  body={description}
                  canEdit={!saving}
                  editBlockReason="No disponible"
                  onChange={setDescription}
                  onPersist={async (next) => {
                    const trimmed = String(next ?? "").trim();
                    setDescription(trimmed);
                    const prev = (board.description ?? "").trim();
                    if (trimmed !== prev) await saveField({ description: trimmed || null });
                  }}
                  placeholder="Markdown… (doble clic para editar)"
                  title="Descripción del tablero"
                  loading={saving}
                />
              </Box>
            </Box>
            <BoardMembersSection
              boardId={boardId}
              open={open}
              readOnly={readOnly}
              saving={saving}
              onMembersChange={onMembersChange}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
