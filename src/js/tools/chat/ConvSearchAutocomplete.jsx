import { getReact, getMaterialUI, UI } from "../../core/platform.ts";

const { useState, useEffect, useRef, useCallback, useMemo } = getReact();
const { Autocomplete, TextField, Typography, Box, IconButton, InputAdornment } = getMaterialUI();
const { Icon } = UI;

const DEBOUNCE_MS = 300;

/** Solo dígitos de iconversacion para el filtro ISS (no título ni "id · título"). */
function convSearchFilter(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  const head = raw.split("·")[0].trim();
  const digits = head.replace(/\D/g, "");
  return digits || "";
}

function convOptionLabel(row) {
  if (!row) return "";
  const title = String(row.titulo ?? "").trim() || "Sin título";
  return `${row.iconversacion} · ${title}`;
}

function convSelectedLabel(row) {
  if (!row?.iconversacion) return "";
  return String(row.iconversacion);
}

export function ConvSearchAutocomplete({
  rows = [],
  loading = false,
  search = "",
  onSearchChange,
  selectedId,
  onSelectConv,
  disabled = false,
  placeholder = "Buscar por # conversación…",
}) {
  const [inputValue, setInputValue] = useState(search ?? "");
  const debounceRef = useRef(null);

  useEffect(() => {
    setInputValue(search ?? "");
  }, [search]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return rows.find((r) => Number(r.iconversacion) === Number(selectedId)) ?? null;
  }, [rows, selectedId]);

  const scheduleSearch = useCallback((text) => {
    const filter = convSearchFilter(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange?.(filter), DEBOUNCE_MS);
  }, [onSearchChange]);

  const applySearchNow = useCallback((text) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const filter = convSearchFilter(text);
    onSearchChange?.(filter);
    return filter;
  }, [onSearchChange]);

  const clearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue("");
    onSearchChange?.("");
  }, [onSearchChange]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const showClear = Boolean(inputValue?.trim());
  const [menuOpen, setMenuOpen] = useState(false);
  const fusedOpen = menuOpen ? " paty-chat-conv-search--open" : "";

  return (
    <Autocomplete
      fullWidth
      size="small"
      className={`paty-chat-conv-search${fusedOpen}`}
      open={menuOpen}
      onOpen={() => setMenuOpen(true)}
      onClose={() => setMenuOpen(false)}
      openOnFocus
      autoHighlight
      clearOnBlur={false}
      disableClearable
      disabled={disabled}
      loading={loading}
      options={rows}
      value={selected}
      inputValue={inputValue}
      filterOptions={(x) => x}
      getOptionLabel={convOptionLabel}
      isOptionEqualToValue={(a, b) => Number(a?.iconversacion) === Number(b?.iconversacion)}
      noOptionsText={loading ? "Buscando…" : "Sin conversaciones"}
      loadingText="Buscando…"
      slotProps={{
        paper: { className: menuOpen ? "paty-chat-conv-search__paper paty-chat-conv-search__paper--open" : "paty-chat-conv-search__paper" },
        popper: {
          className: menuOpen ? "paty-chat-conv-search__popper paty-chat-conv-search__popper--open" : "paty-chat-conv-search__popper",
          modifiers: [{ name: "offset", options: { offset: [0, 0] } }],
        },
      }}
      onInputChange={(_e, text, reason) => {
        if (reason === "reset") {
          const id = selected ? convSelectedLabel(selected) : convSearchFilter(text);
          setInputValue(id);
          return;
        }
        setInputValue(text);
        scheduleSearch(text);
      }}
      onChange={(_e, row) => {
        if (row?.iconversacion) {
          const id = convSelectedLabel(row);
          applySearchNow(id);
          setInputValue(id);
          onSelectConv?.(row.iconversacion);
        }
      }}
      renderOption={(props, row) => (
        <Box
          component="li"
          {...props}
          key={row.iconversacion}
          className="paty-chat-conv-search__option"
          sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", py: 0.75 }}
        >
          <Typography variant="body2" className="paty-chat-conv-search__option-label" sx={{ fontWeight: 600 }} noWrap>
            <Box component="span" className="paty-chat-conv-search__option-id">
              {row.iconversacion}
            </Box>
            <Box component="span" className="paty-chat-conv-search__option-title">
              {String(row.titulo ?? "").trim() || "Sin título"}
            </Box>
          </Typography>
        </Box>
      )}
      renderInput={(params) => {
        const inputProps = params.InputProps ?? params.slotProps?.input ?? {};
        return (
          <TextField
            {...params}
            size="small"
            placeholder={placeholder}
            InputProps={{
              ...inputProps,
              endAdornment: (
                <>
                  {showClear ? (
                    <InputAdornment position="end">
                      <IconButton size="small" aria-label="Limpiar búsqueda" className="paty-chat-conv-search__clear" onMouseDown={(e) => e.preventDefault()} onClick={clearSearch}>
                        <Icon icon="mdi:close" size={16} />
                      </IconButton>
                    </InputAdornment>
                  ) : null}
                  {inputProps.endAdornment}
                </>
              ),
            }}
          />
        );
      }}
    />
  );
}
