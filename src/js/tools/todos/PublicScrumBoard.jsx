import { getReact, getMaterialUI, UI } from "../../core/platform.ts";
import { TodosKanban } from "./TodosKanban.jsx";
import { fetchPublicTodoBoard } from "../../api/todosApi.ts";
import { normalizeTodoBoardData } from "./todosKanbanShared.js";

const { useState, useEffect } = getReact();
const { Box, Alert, CircularProgress } = getMaterialUI();
const { Icon } = UI;

export function PublicScrumBoard({ publicSlug }) {
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchPublicTodoBoard(publicSlug);
        if (!cancelled) {
          setBoardData(normalizeTodoBoardData({
            board: data.board,
            columns: data.columns,
            tasks: data.tasks,
          }));
        }
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
  }, [publicSlug]);

  return (
    <Box className="paty-todos-shell">
      <Box className="paty-todos-toolbar">
        <Icon icon="mdi:view-column" size={22} />
        <span className="paty-todos-board-title">
          {boardData?.board?.title || "Tablero SCRUM"}
        </span>
      </Box>
      {error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TodosKanban
          boardData={boardData}
          readOnly
          onOpenTask={() => {}}
          onQuickAdd={() => {}}
          onDragStart={() => {}}
          onDropColumn={() => {}}
        />
      )}
    </Box>
  );
}
