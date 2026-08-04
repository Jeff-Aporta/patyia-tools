import { getMaterialUI } from "../../core/platform.ts";
import * as PromptsSql from "../../api/promptsSql.ts";

const {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Stack, Alert, Chip, FormControl, Select, MenuItem,
} = getMaterialUI();

export function FileImportMapDialog({ open, onClose, rows, instructionKeys, onChangeRow, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5 }}>
        <iconify-icon icon="mdi:file-link-outline" width="1.25em" height="1.25em" />
        Confirmar importación
      </DialogTitle>
      <DialogContent dividers className="custom-scrollbar">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Relaciona cada archivo con la instrucción destino. La coincidencia automática usa el nombre
          {" "}(<code>PROMPT_*.md</code> / <code>.txt</code>) o una línea exacta{" "}
          <code>iinstruccion: CLAVE</code> en el contenido.
        </Typography>
        {rows.map((row, idx) => {
          const ambiguous = row.nameMatches.length > 1
            || row.contentMatches.length > 1
            || (row.nameMatches.length === 1 && row.contentMatches.length === 1 && row.nameMatches[0] !== row.contentMatches[0]);
          return (
            <Stack
              key={row.fileName}
              spacing={1}
              sx={{ mb: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="subtitle2" component="div">
                <code>{row.fileName}</code>
              </Typography>
              {row.suggested && !ambiguous && (
                <Chip
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={`Sugerido: ${row.suggested}${row.matchSource ? ` (${row.matchSource})` : ""}`}
                />
              )}
              {ambiguous && (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Coincidencias múltiples o contradictorias — elige la instrucción manualmente.
                </Alert>
              )}
              {!row.suggested && !ambiguous && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Sin coincidencia exacta — selecciona la instrucción destino.
                </Alert>
              )}
              <FormControl size="small" fullWidth>
                <Select
                  value={row.selected || ""}
                  displayEmpty
                  onChange={(e) => onChangeRow(idx, e.target.value)}
                  MenuProps={{ disableScrollLock: true }}
                >
                  <MenuItem value="">
                    <em>No importar este archivo</em>
                  </MenuItem>
                  {instructionKeys.map((k) => {
                    const meta = PromptsSql.getInstructionMeta(k);
                    return (
                      <MenuItem key={k} value={k}>
                        {k} · {meta.ninstruccion}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Stack>
          );
        })}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onConfirm}>Importar selección</Button>
      </DialogActions>
    </Dialog>
  );
}
