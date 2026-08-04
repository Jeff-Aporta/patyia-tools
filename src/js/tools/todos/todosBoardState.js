/** Helpers de estado local del tablero (optimistic UI). */

export function patchTaskInBoard(board, taskId, patch) {
  if (!board) return board;
  return {
    ...board,
    tasks: board.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  };
}

export function replaceTaskInBoard(board, taskId, next) {
  if (!board) return board;
  return {
    ...board,
    tasks: board.tasks.map((t) => (t.id === taskId ? next : t)),
  };
}

export function appendTaskToBoard(board, task) {
  if (!board) return board;
  return { ...board, tasks: [...board.tasks, task] };
}

export function buildOptimisticTask(opts) {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    boardId: opts.boardId,
    columnId: opts.columnId,
    parentTaskId: null,
    title: opts.title,
    descriptionDoc: "",
    sortOrder: 9999,
    assignedTo: null,
    createdBy: opts.createdBy,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    subtasks: [],
    milestones: [],
    events: [],
  };
}
