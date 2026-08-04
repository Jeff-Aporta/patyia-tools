/** Utilidades compartidas del tablero Kanban (lista + preview). */

export const MAX_COLUMN_TASKS = 4;

/** Columna legacy retirada del modelo SCRUM (solo pending + done). */
export const IN_PROGRESS_COLUMN_KEY = "in_progress";

/**
 * Quita la columna "En progreso" y mueve sus tareas a Pendiente (tableros sin migrar).
 * @param {import("../../api/todosApi.ts").TodoBoardFull | null | undefined} boardData
 */
export function normalizeTodoBoardData(boardData) {
  if (!boardData?.columns?.length) return boardData ?? null;
  const inProgress = boardData.columns.find((c) => c.columnKey === IN_PROGRESS_COLUMN_KEY);
  if (!inProgress) return boardData;
  const pending = boardData.columns.find((c) => c.columnKey === "pending");
  const fallbackColumnId = pending?.id
    ?? boardData.columns.find((c) => c.columnKey !== IN_PROGRESS_COLUMN_KEY)?.id;
  const columns = boardData.columns.filter((c) => c.columnKey !== IN_PROGRESS_COLUMN_KEY);
  const tasks = fallbackColumnId
    ? boardData.tasks.map((t) => (
      t.columnId === inProgress.id ? { ...t, columnId: fallbackColumnId } : t
    ))
    : boardData.tasks;
  return { ...boardData, columns, tasks };
}

export function sortTasksByRecent(tasks) {
  return [...tasks].sort((a, b) => {
    const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return tb - ta;
  });
}

export function formatTaskDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", { dateStyle: "short" });
  } catch {
    return String(iso);
  }
}

export function groupTasksByColumn(boardData) {
  if (!boardData) return new Map();
  const map = new Map();
  for (const col of boardData.columns) map.set(col.id, []);
  for (const task of boardData.tasks) {
    const list = map.get(task.columnId);
    if (list) list.push(task);
  }
  for (const [colId, list] of map) {
    map.set(colId, sortTasksByRecent(list));
  }
  return map;
}

export function taskModDate(task) {
  return task.updatedAt ?? task.createdAt ?? null;
}

/** Paleta estable por username (mismo usuario → mismo color en todo el tablero). */
const ASSIGNEE_PALETTE = [
  { fg: "#38bdf8", bg: "rgba(56, 189, 248, 0.2)" },
  { fg: "#f472b6", bg: "rgba(244, 114, 182, 0.2)" },
  { fg: "#a78bfa", bg: "rgba(167, 139, 250, 0.2)" },
  { fg: "#fbbf24", bg: "rgba(251, 191, 36, 0.22)" },
  { fg: "#34d399", bg: "rgba(52, 211, 153, 0.2)" },
  { fg: "#fb923c", bg: "rgba(251, 146, 60, 0.2)" },
  { fg: "#22d3ee", bg: "rgba(34, 211, 238, 0.2)" },
  { fg: "#e879f9", bg: "rgba(232, 121, 249, 0.2)" },
];

const UNASSIGNED_THEME = {
  label: "Sin asignar",
  fg: "#94a3b8",
  bg: "rgba(148, 163, 184, 0.1)",
};

function hashUsername(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** KEVIN → KGOMEZ (username legacy en tareas). */
export function normalizeAssigneeUsername(assignedTo) {
  const username = String(assignedTo ?? "").trim().toUpperCase();
  if (username === "KEVIN") return "KGOMEZ";
  return username;
}

export function assigneeTheme(assignedTo) {
  const username = normalizeAssigneeUsername(assignedTo);
  if (!username) return UNASSIGNED_THEME;
  const palette = ASSIGNEE_PALETTE[hashUsername(username) % ASSIGNEE_PALETTE.length];
  return { label: username, ...palette };
}
