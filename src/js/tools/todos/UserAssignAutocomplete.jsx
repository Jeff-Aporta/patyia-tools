import { getReact, getMaterialUI } from "../../core/platform.ts";
import { searchScrumAppUsers } from "../../api/todosApi.ts";
import { normalizeAssigneeUsername } from "./todosKanbanShared.js";

const { useState, useEffect, useRef, useCallback } = getReact();
const { Autocomplete, TextField, Typography, Box } = getMaterialUI();

const DEBOUNCE_MS = 300;

function optionLabel(row) {
  if (!row) return "";
  return row.displayName ? `${row.displayName} (${row.username})` : row.username;
}

export function UserAssignAutocomplete({ value, onChange, disabled = false, label = "Asignado a", compact = false }) {
  const username = value ? normalizeAssigneeUsername(value) : null;
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invalidHint, setInvalidHint] = useState("");
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const resolveAttemptRef = useRef("");

  const selected = username
    ? options.find((o) => o.username === username) ?? null
    : null;

  const runSearch = useCallback(async (query) => {
    const id = ++requestIdRef.current;
    setLoading(true);
    try {
      const users = await searchScrumAppUsers(query, 12);
      if (id !== requestIdRef.current) return;
      setOptions(users);
      return users;
    } catch {
      if (id === requestIdRef.current) setOptions([]);
      return [];
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, []);

  const scheduleSearch = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, DEBOUNCE_MS);
  }, [runSearch]);

  useEffect(() => {
    if (!username) {
      resolveAttemptRef.current = "";
      setInputValue("");
      setInvalidHint("");
      return;
    }
    if (value && username !== value) {
      onChange(username);
      return;
    }
    const match = options.find((o) => o.username === username);
    if (match) {
      setInputValue(optionLabel(match));
      setInvalidHint("");
      return;
    }
    if (resolveAttemptRef.current === username) return;
    resolveAttemptRef.current = username;
    let cancelled = false;
    runSearch(username).then((users) => {
      if (cancelled) return;
      const resolved = users?.find((u) => u.username === username);
      if (resolved) {
        setOptions((prev) => (
          prev.some((o) => o.username === resolved.username) ? prev : [...prev, resolved]
        ));
        setInputValue(optionLabel(resolved));
        setInvalidHint("");
      } else {
        setInputValue("");
        setInvalidHint(`"${username}" no está registrado en isa-patyia`);
        onChange(null);
      }
    });
    return () => { cancelled = true; };
  }, [value, username, options, runSearch, onChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (disabled) return;
    runSearch("");
  }, [disabled, runSearch]);

  if (disabled) {
    return (
      <TextField
        label={label}
        fullWidth
        size="small"
        value={username || ""}
        disabled
        placeholder="Sin asignar"
      />
    );
  }

  return (
    <Autocomplete
      fullWidth
      size="small"
      openOnFocus
      autoHighlight
      clearOnBlur={false}
      freeSolo={false}
      selectOnFocus
      handleHomeEndKeys
      loading={loading}
      options={options}
      value={selected}
      inputValue={inputValue}
      filterOptions={(x) => x}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) => String(a?.username) === String(b?.username)}
      noOptionsText={loading ? "Buscando…" : "Sin usuarios registrados"}
      loadingText="Buscando…"
      onOpen={() => {
        if (!options.length) runSearch(inputValue);
      }}
      onInputChange={(_e, text, reason) => {
        if (reason === "reset") return;
        setInputValue(text);
        setInvalidHint("");
        scheduleSearch(text);
      }}
      onChange={(_e, row) => {
        onChange(row?.username ?? null);
        setInputValue(row ? optionLabel(row) : "");
        setInvalidHint("");
      }}
      renderOption={(props, row) => (
        <Box component="li" {...props} key={row.username} sx={{ display: "flex", flexDirection: "column", py: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.displayName || row.username}
          </Typography>
          {row.displayName ? (
            <Typography variant="caption" color="text.secondary">{row.username}</Typography>
          ) : null}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Buscar integrante…"
          error={!!invalidHint}
          helperText={invalidHint || (compact ? undefined : "Solo usuarios registrados en isa-patyia")}
        />
      )}
    />
  );
}
