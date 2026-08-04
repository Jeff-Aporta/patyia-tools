import { getReact, getMaterialUI, UI } from "../../core/platform.ts";

const { useState } = getReact();
const {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, Chip, Box,
} = getMaterialUI();
const { Icon } = UI;

function parseMembers(raw) {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function NewBoardDialog({ open, onClose, onCreate, busy }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [membersRaw, setMembersRaw] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setVisibility("private");
    setMembersRaw("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon icon="mdi:view-column" size={22} />
        Nuevo tablero SCRUM
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label="Título"
            fullWidth
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Descripción"
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="paty-board-vis-label">Visibilidad</InputLabel>
            <Select
              labelId="paty-board-vis-label"
              label="Visibilidad"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <MenuItem value="private">Privado — solo integrantes</MenuItem>
              <MenuItem value="public">Público — equipo ISA puede editar</MenuItem>
            </Select>
            <FormHelperText>
              {visibility === "public"
                ? "Cualquier usuario con acceso a isa-patyia puede ver y editar. El enlace público sigue siendo solo lectura."
                : "Solo integrantes y administradores ven el tablero."}
            </FormHelperText>
          </FormControl>
          <TextField
            label="Integrantes adicionales"
            fullWidth
            size="small"
            multiline
            minRows={2}
            placeholder="VIVIANA, KEVIN (separados por coma)"
            value={membersRaw}
            onChange={(e) => setMembersRaw(e.target.value)}
            helperText="Tú quedas como editor. Indica usuarios BD_AUTH y rol por defecto editor."
          />
          {membersRaw.trim() ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {parseMembers(membersRaw).map((u) => (
                <Chip key={u} size="small" label={u} icon={<Icon icon="mdi:account" size={14} />} />
              ))}
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={busy || !title.trim()}
          onClick={async () => {
            const members = parseMembers(membersRaw).map((username) => ({
              username,
              boardRole: "editor",
            }));
            await onCreate({
              title: title.trim(),
              description: description.trim(),
              visibility,
              members,
            });
            reset();
          }}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
