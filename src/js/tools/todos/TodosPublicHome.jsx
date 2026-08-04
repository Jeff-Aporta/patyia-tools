import { getReact, getMaterialUI, UI, getGlass } from "../../core/platform.ts";
import { fetchPublicTodoBoards } from "../../api/todosApi.ts";
import { PublicScrumBoard } from "./PublicScrumBoard.jsx";

const { useState, useEffect } = getReact();
const { Box, Typography, Button, Stack, Alert, CircularProgress, Chip } = getMaterialUI();
const { Icon } = UI;

const PUBLIC_CARD_ACCENTS = () => {
  const { NEON_COLORS } = getGlass();
  return [NEON_COLORS.blue, NEON_COLORS.cyan, NEON_COLORS.magenta, NEON_COLORS.green, NEON_COLORS.amber];
};

export function TodosPublicHome() {
  const { GlassCard } = getGlass();
  const accentColors = PUBLIC_CARD_ACCENTS();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchPublicTodoBoards("scrum");
        if (!cancelled) setBoards(list);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!/authorization bearer requerido/i.test(msg)) setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (selectedSlug) {
    return (
      <Box className="paty-todos-shell">
        <Box className="paty-todos-toolbar">
          <Button
            size="small"
            variant="text"
            startIcon={<Icon icon="mdi:arrow-left" size={16} />}
            onClick={() => setSelectedSlug("")}
          >
            Volver
          </Button>
        </Box>
        <PublicScrumBoard publicSlug={selectedSlug} />
      </Box>
    );
  }

  return (
    <Box className="paty-todos-shell">
      <Box className="paty-todos-toolbar">
        <Icon icon="mdi:view-column" size={22} />
        <span className="paty-todos-board-title">DevFlow</span>
      </Box>

      {error ? <Alert severity="error" sx={{ mx: 2, mb: 2, mt: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : boards.length ? (
        <Box className="paty-todos-public-list" component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {boards.map((board, index) => {
            const accent = accentColors[index % accentColors.length];
            return (
              <GlassCard
                key={board.id}
                component="li"
                accent={accent}
                className="paty-todos-public-card isa-neon-accent-stripe"
                onClick={() => setSelectedSlug(board.publicSlug)}
                sx={{
                  "--stripe-accent": accent,
                  "--card-accent": accent,
                  width: "100%",
                  cursor: "pointer",
                  listStyle: "none",
                }}
              >
                <Box className="paty-todos-public-card__icon-wrap" aria-hidden>
                  <Icon icon="mdi:view-column" size={22} />
                </Box>
                <Box className="paty-todos-public-card__body">
                  <Typography className="paty-todos-public-card__title" component="div" variant="subtitle1">
                    {board.title}
                  </Typography>
                  <Typography className="paty-todos-public-card__desc" component="div" variant="body2" color="text.secondary">
                    {board.description || "Tablero SCRUM"}
                  </Typography>
                  <Chip
                    size="small"
                    className="paty-todos-public-card__chip"
                    label="Público"
                    icon={<Icon icon="mdi:earth" size={12} />}
                  />
                </Box>
                <Box className="paty-todos-public-card__arrow" aria-hidden>
                  <Icon icon="mdi:chevron-right" size={22} />
                </Box>
              </GlassCard>
            );
          })}
        </Box>
      ) : (
        <Stack spacing={1} alignItems="center" sx={{ p: 4, opacity: 0.85 }}>
          <Icon icon="mdi:view-column-outline" width="2.5em" height="2.5em" />
          <Typography variant="body2" color="text.secondary" align="center">
            No hay tableros publicados todavía.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
