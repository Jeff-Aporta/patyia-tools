const LS_KEY = "isa-patyia:todos-boards-expand";

export function readBoardExpandState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeBoardExpandState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function sortBoardsByRecent(boards) {
  return [...boards].sort((a, b) => {
    const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return tb - ta;
  });
}

export function canEditBoard(board) {
  if (board?.canEdit != null) return !!board.canEdit;
  return !!board?.isAdmin || board?.myRole === "editor";
}

export function canDeleteBoard(board) {
  if (board?.canDelete != null) return !!board.canDelete;
  return !!board?.isAdmin;
}

/** Chips de rol para la fila del tablero (rol en tablero). */
export function boardRoleChips(board) {
  const chips = [];
  if (board?.myRole === "editor") {
    chips.push({ id: "editor", label: "Editor", icon: "mdi:pencil-outline", variant: "role" });
  }
  if (board?.myRole === "readonly") {
    chips.push({ id: "readonly", label: "Solo lectura", icon: "mdi:eye-outline", variant: "role" });
  }
  return chips;
}
