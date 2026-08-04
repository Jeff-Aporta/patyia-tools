import { getReact, getMaterialUI, UI } from "../../core/platform.ts";
import { parseJwtClaims, jwtUserDisplayName, shortDisplayName } from "../../core/patyia-jwt.ts";
import { fetchTercerosAudit } from "../../api/apiClient.ts";
import { TERCEROS_AUDIT_PAGE_SIZE } from "./constants.ts";
import { auditScopeKey, formatAuditTs } from "./auditScope.ts";

const { useState, useEffect, useMemo } = getReact();
const {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} = getMaterialUI();
const { Icon } = UI;

const CELL_SX = { py: 0.5, px: 1, fontSize: "0.75rem", lineHeight: 1.25 };
const HEAD_SX = { ...CELL_SX, fontWeight: 650, whiteSpace: "nowrap" };

/** Activo primero; el resto por más conversaciones → menos. */
function rowsWithActiveFirst(rows, currentKey, currentScope) {
  const list = Array.isArray(rows) ? [...rows] : [];
  list.sort((a, b) => (Number(b.total_conversaciones) || 0) - (Number(a.total_conversaciones) || 0));
  if (!currentKey) return list;
  const idx = list.findIndex((r) => `${r.itercero}|${r.icontacto}` === currentKey);
  if (idx === 0) return list;
  if (idx > 0) {
    const [active] = list.splice(idx, 1);
    list.unshift(active);
    return list;
  }
  if (!currentScope?.itercero) return list;
  list.unshift({
    itercero: String(currentScope.itercero),
    icontacto: String(currentScope.icontacto ?? ""),
    nombre: currentScope.nombre ?? null,
    total_conversaciones: Number(currentScope.total_conversaciones ?? 0) || 0,
    total_mensajes: Number(currentScope.total_mensajes ?? 0) || 0,
    ultima_actividad: currentScope.ultima_actividad ?? null,
    es_jwt: !!currentScope.esJwt,
    es_sesion: !!currentScope.esSesion,
  });
  return list;
}

export function TercerosAuditDialog({ open, onClose, jwt, sessionUser, onSelect, currentScope, canAudit = true }) {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [qDebounced, open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!canAudit) {
      setData(null);
      setError("");
      setLoading(false);
      return undefined;
    }
    const claims = jwt?.token
      ? (jwt.claims?.itercero ? jwt.claims : (parseJwtClaims(jwt.token) || {}))
      : {};
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchTercerosAudit({
      page,
      limit: TERCEROS_AUDIT_PAGE_SIZE,
      q: qDebounced,
      jwtToken: jwt?.token,
      jwtTercero: claims.itercero,
      jwtContacto: claims.icontacto,
      jwtNombre: jwt?.token ? jwtUserDisplayName(claims) : undefined,
      appUser: sessionUser || undefined,
    })
    .then((res) => {
      if (cancelled) return;
      const claimsOwn = jwt?.token
        ? (jwt.claims?.itercero ? jwt.claims : (parseJwtClaims(jwt.token) || {}))
        : {};
      const ownT = String(claimsOwn.itercero ?? currentScope?.itercero ?? "").trim();
      const ownC = String(claimsOwn.icontacto ?? currentScope?.icontacto ?? "").trim();
      // Defensa en profundidad: sin audit, nunca listar terceros ajenos aunque ISS falle.
      const rows = Array.isArray(res?.rows) ? res.rows : [];
      const scoped = canAudit ? rows : rows.filter((r) => String(r.itercero) === ownT && String(r.icontacto) === ownC);
      setData({ ...res, rows: scoped, total: canAudit ? res.total : scoped.length });
    })
    .catch((err) => {
      if (!cancelled) {
        setData(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    })
    .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, page, qDebounced, jwt?.token, jwt?.claims?.itercero, jwt?.claims?.icontacto, sessionUser, canAudit, currentScope?.itercero, currentScope?.icontacto]);

  const currentKey = auditScopeKey(currentScope);
  const rows = useMemo(() => {
    if (!canAudit) {
      // Solo el propio scope (o vacío).
      const own = currentScope?.itercero
        ? [{
          itercero: String(currentScope.itercero),
          icontacto: String(currentScope.icontacto ?? ""),
          nombre: currentScope.nombre ?? null,
          total_conversaciones: Number(currentScope.total_conversaciones ?? 0) || 0,
          total_mensajes: Number(currentScope.total_mensajes ?? 0) || 0,
          ultima_actividad: currentScope.ultima_actividad ?? null,
          es_jwt: !!currentScope.esJwt,
          es_sesion: true,
        }]
        : (data?.rows ?? []);
      return own;
    }
    return rowsWithActiveFirst(data?.rows, currentKey, currentScope);
  }, [canAudit, data?.rows, currentKey, currentScope]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper" className="paty-chat-terceros-dialog">
      <DialogTitle sx={{ py: 1.25, px: 2, fontSize: "1rem" }}>
        {canAudit ? "Filtrar por usuario" : "Tu usuario"}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1.25, px: 2, pb: 1 }}>
        {canAudit ? (
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar tercero o contacto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="paty-chat-terceros-search"
            sx={{ mb: 1 }}
            InputProps={{
              startAdornment: <Icon icon="mdi:magnify" size={16} style={{ marginRight: 6, opacity: 0.6 }} />,
            }}
          />
        ) : (
          <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
            Tu rol solo puede ver tus propias conversaciones.
          </Alert>
        )}
        {error ? <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>{error}</Alert> : null}
        {loading ? (
          <Box sx={{ py: 3, textAlign: "center" }}><CircularProgress size={24} /></Box>
        ) : (
          <TableContainer className="paty-chat-terceros-table">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={HEAD_SX}>Nombre (Tercero / Contacto)</TableCell>
                  <TableCell align="right" sx={HEAD_SX}>Convs</TableCell>
                  <TableCell align="right" sx={HEAD_SX}>Msgs</TableCell>
                  <TableCell sx={HEAD_SX}>Última act.</TableCell>
                  <TableCell align="center" sx={HEAD_SX}>Ver</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const key = `${row.itercero}|${row.icontacto}`;
                  const selected = currentKey === key;
                  const codes = [row.itercero, row.icontacto].filter(Boolean).join(" · ");
                  return (
                    <TableRow key={key} hover selected={selected}>
                      <TableCell sx={CELL_SX}>
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Box sx={{ minWidth: 0 }}>
                            {row.nombre ? (
                              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: "0.78rem" }}>
                                {shortDisplayName(row.nombre)}
                              </Typography>
                            ) : null}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                fontWeight: 400,
                                fontSize: "0.65rem",
                                lineHeight: 1.2,
                                fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                                letterSpacing: "0.02em",
                              }}
                            >
                              {codes}
                            </Typography>
                          </Box>
                          {selected ? <Chip size="small" label="Viendo" color="primary" sx={{ height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" } }} /> : null}
                          {row.es_sesion ? <Chip size="small" label="Sesión" color="success" sx={{ height: 18, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" } }} /> : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={CELL_SX}>{Number(row.total_conversaciones || 0).toLocaleString("es-CO")}</TableCell>
                      <TableCell align="right" sx={CELL_SX}>{Number(row.total_mensajes || 0).toLocaleString("es-CO")}</TableCell>
                      <TableCell sx={CELL_SX}>{formatAuditTs(row.ultima_actividad)}</TableCell>
                      <TableCell align="center" sx={CELL_SX}>
                        <Button
                          size="small"
                          variant={selected ? "contained" : "outlined"}
                          disabled={!canAudit && !row.es_sesion && !row.es_jwt}
                          sx={{ minWidth: 0, px: 1, py: 0.15, fontSize: "0.7rem", lineHeight: 1.2 }}
                          onClick={() => {
                            if (!canAudit && !row.es_sesion && !row.es_jwt) return;
                            onSelect({
                              itercero: row.itercero,
                              icontacto: row.icontacto,
                              esJwt: row.es_jwt,
                              esSesion: row.es_sesion,
                              nombre: row.nombre ? shortDisplayName(row.nombre) : null,
                            });
                          }}
                        >
                          {selected ? "Viendo" : (row.es_sesion ? "Mis convs" : "Ver")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && !error && !rows.length ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 2.5, color: "text.secondary", fontSize: "0.8rem" }}>
                      Sin resultados{qDebounced ? ` para “${qDebounced}”` : ""}.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {data ? `${data.total.toLocaleString("es-CO")} contactos · pág. ${data.page}/${Math.max(data.pages, 1)}` : "—"}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            disabled={!canAudit || loading || !data || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            startIcon={<Icon icon="mdi:chevron-left" size={16} />}
          >
            Anterior
          </Button>
          <Button
            size="small"
            disabled={!canAudit || loading || !data || page >= (data.pages || 1)}
            onClick={() => setPage((p) => p + 1)}
            endIcon={<Icon icon="mdi:chevron-right" size={16} />}
          >
            Siguiente
          </Button>
          <Button size="small" onClick={onClose}>Cerrar</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

