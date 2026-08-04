/** Tableros SCRUM — gateway main-orchestrator → scrum worker. */
import { Session, Config } from "../core/platform.ts";
import { ORCH_ONLINE, ORCH_LOCAL, SCRUM_LOCAL, isDevHost, isLocalMode } from "../core/patyia.ts";
import * as SessionApi from "./sessionApi.ts";

const scrumHttp = window.ISAFront.createCapFetch({
  Session,
  Config,
  getApiBase: () => ORCH_ONLINE.replace(/\/$/, ""),
  localDirect: [
    {
      test: (p: string) => {
        const n = p.startsWith("/") ? p : `/${p}`;
        return n.startsWith("/scrum") || n.startsWith("/api/scrum");
      },
      base: SCRUM_LOCAL,
    },
  ],
  orchOnlineInLocal: false,
  isLocal: isLocalMode,
  handleApiError: SessionApi.handleApiError,
  clearSession: SessionApi.clearSession,
});

export const SCRUM_APP_ID = "isa-patyia";

export type BoardRole = "editor" | "readonly";
export type BoardVisibility = "private" | "public";

export type BoardMember = {
  username: string;
  boardRole: BoardRole;
  createdAt?: string;
};

export type TodoBoard = {
  id: string;
  appId: string;
  boardType: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  visibility: BoardVisibility;
  publicSlug: string | null;
  myRole: BoardRole | null;
  isAdmin?: boolean;
  canRead?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  readOnly?: boolean;
};

export type TodoColumn = {
  id: string;
  boardId: string;
  columnKey: string;
  title: string;
  sortOrder: number;
};

export type TodoMilestone = {
  id: string;
  taskId: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
};

export type TodoEvent = {
  id: string;
  taskId: string;
  eventType: string;
  body: string;
  author: string;
  createdAt: string;
};

export type TodoTask = {
  id: string;
  boardId: string;
  columnId: string;
  parentTaskId: string | null;
  title: string;
  descriptionDoc: string;
  sortOrder: number;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  subtasks?: TodoTask[];
  milestones?: TodoMilestone[];
  events?: TodoEvent[];
};

export type TodoBoardFull = {
  board: TodoBoard;
  columns: TodoColumn[];
  tasks: TodoTask[];
  members?: BoardMember[];
  readOnly?: boolean;
};

function qs(extra?: Record<string, string>) {
  const params = new URLSearchParams({ app: SCRUM_APP_ID, ...extra });
  return `?${params.toString()}`;
}

export type AppUserOption = {
  username: string;
  displayName: string | null;
};

/** Búsqueda opcional de usuarios — no invalida sesión en 401. Dev+ISS local → scrum/orquestador local, no prod. */
export async function searchScrumAppUsers(query = "", limit = 12) {
  if (!Session.isLoggedIn()) return [];
  const params = new URLSearchParams({ app: SCRUM_APP_ID, limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  const rel = `/api/scrum/users/search?${params}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  Object.assign(headers, Session.authHeader(), Session.appHeader());

  const tryBase = async (base: string): Promise<AppUserOption[] | null> => {
    try {
      const res = await fetch(`${String(base).replace(/\/$/, "")}${rel}`, { method: "GET", headers });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      if (data.ok === false) return null;
      return (data.users ?? []) as AppUserOption[];
    } catch {
      return null;
    }
  };

  const bases = (isDevHost() && isLocalMode())
    ? [SCRUM_LOCAL, ORCH_LOCAL]
    : [ORCH_ONLINE.replace(/\/$/, "")];

  for (const base of bases) {
    const users = await tryBase(base);
    if (users !== null) return users;
  }
  return [];
}

export async function fetchTodoBoards(boardType = "scrum") {
  const data = (await scrumHttp.capFetch(`/scrum/boards${qs({ boardType })}`, { method: "GET" })) as { boards?: TodoBoard[] };
  return data.boards ?? [];
}

export async function createTodoBoard(payload: {
  title: string;
  description?: string;
  boardType?: string;
  visibility?: BoardVisibility;
  members?: BoardMember[];
}) {
  const data = await scrumHttp.capFetch(`/scrum/boards${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardType: "scrum", ...payload }),
  });
  return data as TodoBoardFull & { ok: boolean };
}

// PUT /api/scrum/boards/{boardId} (era PATCH; migrado 18-jul-2026).
// En InSoft no usamos PATCH: solo PUT.
export async function updateTodoBoard(
  boardId: string,
  patch: { title?: string; description?: string | null; visibility?: BoardVisibility },
) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return data as TodoBoardFull & { ok: boolean };
}

export async function deleteTodoBoard(boardId: string) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}${qs()}`, { method: "DELETE" });
  return data as { ok: boolean; id: string };
}

export async function fetchTodoBoardMembers(boardId: string) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}/members${qs()}`, { method: "GET" });
  return (data.members ?? []) as BoardMember[];
}

export async function saveTodoBoardMembers(boardId: string, members: BoardMember[]) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}/members${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ members }),
  });
  return (data.members ?? []) as BoardMember[];
}

/** Catálogo de tableros públicos — no requiere sesión. */
export async function fetchPublicTodoBoards(boardType = "scrum") {
  const base = ORCH_ONLINE.replace(/\/$/, "");
  const params = new URLSearchParams({ app: SCRUM_APP_ID, boardType });
  const res = await fetch(`${base}/api/scrum/public?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return (data.boards ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    publicSlug: string;
    updatedAt: string;
    visibility: "public";
    readOnly: true;
  }>;
}

/** Vista pública read-only — no requiere sesión. */
export async function fetchPublicTodoBoard(slug: string) {
  const base = ORCH_ONLINE.replace(/\/$/, "");
  const params = new URLSearchParams({ app: SCRUM_APP_ID });
  const res = await fetch(`${base}/api/scrum/public/${encodeURIComponent(slug)}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as TodoBoardFull & { ok: boolean; readOnly: true };
}

export function buildPublicScrumUrl(publicSlug: string) {
  const origin = typeof location !== "undefined" ? location.origin + location.pathname : "";
  const snap = { v: 1, tool: "todos", local: false, log: {}, prompts: {}, chat: {}, todos: { publicSlug } };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(snap))));
  return `${origin}?s=${encodeURIComponent(b64)}`;
}

export async function fetchTodoBoard(boardId: string) {
  const data = await scrumHttp.capFetch(`/scrum/boards/${boardId}${qs()}`, { method: "GET" });
  return data as TodoBoardFull & { ok: boolean };
}

export async function createTodoTask(
  boardId: string,
  payload: {
    columnId: string;
    title: string;
    descriptionDoc?: string;
    parentTaskId?: string | null;
    assignedTo?: string | null;
  },
) {
  const data = (await scrumHttp.capFetch(`/scrum/boards/${boardId}/tasks${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })) as { task: TodoTask };
  return data.task;
}

export async function fetchTodoTask(taskId: string) {
  const data = (await scrumHttp.capFetch(`/scrum/tasks/${taskId}${qs()}`, { method: "GET" })) as { task: TodoTask };
  return data.task;
}

export async function updateTodoTask(
  taskId: string,
  patch: {
    title?: string;
    descriptionDoc?: string;
    columnId?: string;
    assignedTo?: string | null;
    sortOrder?: number;
  },
) {
  const data = (await scrumHttp.capFetch(`/scrum/tasks/${taskId}${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })) as { task: TodoTask };
  return data.task;
}

export async function createTodoMilestone(
  taskId: string,
  payload: { title: string; dueDate?: string | null },
) {
  const data = (await scrumHttp.capFetch(`/scrum/tasks/${taskId}/milestones${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })) as { milestone: TodoMilestone };
  return data.milestone;
}

export async function updateTodoMilestone(
  milestoneId: string,
  patch: { title?: string; dueDate?: string | null; completed?: boolean },
) {
  const data = (await scrumHttp.capFetch(`/scrum/milestones/${milestoneId}${qs()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })) as { milestone: TodoMilestone };
  return data.milestone;
}

export async function deleteTodoTask(taskId: string) {
  await scrumHttp.capFetch(`/scrum/tasks/${taskId}${qs()}`, { method: "DELETE" });
}

export async function deleteTodoMilestone(milestoneId: string) {
  await scrumHttp.capFetch(`/scrum/milestones/${milestoneId}${qs()}`, { method: "DELETE" });
}

export async function addTodoComment(taskId: string, body: string) {
  const data = (await scrumHttp.capFetch(`/scrum/tasks/${taskId}/comments${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  })) as { event: TodoEvent };
  return data.event;
}
