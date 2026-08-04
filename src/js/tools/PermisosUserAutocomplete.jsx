import { getReact, getMaterialUI } from "../core/platform.ts";
import { searchPermisosUsers } from "../api/systemConfigApi.ts";
import { normalizePermisosUsername } from "./permisosKanbanShared.js";

const { useState, useEffect, useRef, useCallback } = getReact();
const { Autocomplete, TextField, Typography, Box } = getMaterialUI();

const DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 10;

function optionLabel(row) {
  if (!row) return "";
  return row.displayName ? `${row.displayName} (${row.username})` : row.username;
}

function usernameFromInput(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const paren = raw.match(/\(([A-Z0-9_.$-]+)\)\s*$/i);
  if (paren) return normalizePermisosUsername(paren[1]);
  return normalizePermisosUsername(raw.split(/\s+/)[0]);
}

/**
 * Autocomplete de usuarios vía GET /api/system/permisos?search=&limit=
 * @param {"dialog"|"toolbar"} [variant] — toolbar: compacto, sin helper, openOnFocus
 */
export function PermisosUserAutocomplete({
  value,
  onChange,
  disabled = false,
  label = "Usuario",
  roleFilter = null,
  allowNew = true,
  limit = DEFAULT_LIMIT,
  variant = "dialog",
  placeholder,
  className,
  sx,
}) {
  const toolbar = variant === "toolbar";
  const username = value ? normalizePermisosUsername(value) : null;
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const selected = username
    ? options.find((o) => o.username === username) ?? (username ? { username, displayName: null } : null)
    : null;

  const runSearch = useCallback(async (query) => {
    const id = ++requestIdRef.current;
    setLoading(true);
    try {
      const users = await searchPermisosUsers(query, {
        ...(roleFilter ? { role: roleFilter } : {}),
        limit,
      });
      if (id !== requestIdRef.current) return users;
      setOptions(users);
      return users;
    } catch {
      if (id === requestIdRef.current) setOptions([]);
      return [];
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, [roleFilter, limit]);

  const scheduleSearch = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { runSearch(query); }, DEBOUNCE_MS);
  }, [runSearch]);

  useEffect(() => {
    if (!username) { setInputValue(""); return; }
    if (value && username !== normalizePermisosUsername(value)) { onChange(username); return; }
    const match = options.find((o) => o.username === username);
    setInputValue(match ? optionLabel(match) : username);
  }, [value, username, options, onChange]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useEffect(() => {
    if (disabled) return;
    runSearch("");
  }, [disabled, runSearch]);

  if (disabled) {
    return (
      <TextField
        label={label}
        fullWidth={!toolbar}
        size="small"
        value={username || ""}
        disabled
        placeholder="Sin usuario"
        className={className}
        sx={sx}
      />
    );
  }

  const ph = placeholder ?? (toolbar ? "Buscar usuario…" : "Buscar login ISS…");

  return (
    <Autocomplete
      fullWidth={!toolbar}
      size="small"
      openOnFocus
      autoHighlight
      clearOnBlur={false}
      selectOnFocus
      handleHomeEndKeys
      freeSolo={allowNew}
      loading={loading}
      options={options}
      value={selected}
      inputValue={inputValue}
      filterOptions={(x) => x}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) => String(a?.username) === String(b?.username)}
      noOptionsText={loading ? "Buscando…" : (toolbar ? "Sin coincidencias" : "Sin coincidencias — escriba login")}
      loadingText="Buscando…"
      className={className}
      sx={sx}
      onOpen={() => { if (!options.length) runSearch(inputValue); }}
      onInputChange={(_e, text, reason) => {
        if (reason === "reset") return;
        setInputValue(text);
        scheduleSearch(text);
        if (allowNew) {
          const u = usernameFromInput(text);
          onChange(u);
        }
      }}
      onChange={(_e, row) => {
        if (typeof row === "string") {
          const u = usernameFromInput(row);
          onChange(u);
          setInputValue(u ?? "");
          return;
        }
        onChange(row?.username ?? null);
        setInputValue(row ? optionLabel(row) : "");
      }}
      renderOption={(props, row) => (
        <Box component="li" {...props} key={row.username} sx={{ display: "flex", flexDirection: "column", py: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.displayName || row.username}</Typography>
          {row.displayName ? <Typography variant="caption" color="text.secondary">{row.username}</Typography> : null}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={toolbar ? "" : label}
          placeholder={ph}
          InputLabelProps={{ ...params.InputLabelProps, shrink: toolbar ? false : true }}
          helperText={toolbar ? undefined : (allowNew ? "Usuarios en permisos ISS o login nuevo" : "Usuarios registrados en permisos ISS")}
          sx={toolbar ? {
            "& .MuiOutlinedInput-root": { height: 28, minHeight: 28, maxHeight: 28, py: 0 },
            "& .MuiOutlinedInput-input": { py: "4px", fontSize: "0.8125rem", fontWeight: 600 },
            "& .MuiInputLabel-root": { display: "none" },
            "& .MuiOutlinedInput-notchedOutline legend": { width: 0, padding: 0 },
          } : undefined}
        />
      )}
    />
  );
}
