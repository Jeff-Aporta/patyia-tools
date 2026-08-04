/** Árbol de mensajes — gateway main-orchestrator → tree-msgs worker. */
import { Session, Config } from "../core/platform.ts";
import { ORCH_ONLINE, TREE_MSGS_LOCAL, isLocalMode } from "../core/patyia.ts";
import * as SessionApi from "./sessionApi.ts";

const treeHttp = window.ISAFront.createCapFetch({
  Session,
  Config,
  getApiBase: () => ORCH_ONLINE.replace(/\/$/, ""),
  localDirect: [
    {
      test: (p: string) => {
        const n = p.startsWith("/") ? p : `/${p}`;
        return n.startsWith("/tree-msgs") || n.startsWith("/api/tree-msgs");
      },
      base: TREE_MSGS_LOCAL,
    },
  ],
  orchOnlineInLocal: false,
  isLocal: isLocalMode,
  handleApiError: SessionApi.handleApiError,
  clearSession: SessionApi.clearSession,
});

export type TreeMessageJlog = {
  author?: string;
  kind?: "message" | "reply" | "quote";
  replyToPath?: string | null;
  quotePath?: string | null;
  editedAt?: string;
  editedBy?: string;
  [key: string]: unknown;
};

export type TreeMessage = {
  appId: string;
  contextKey: string;
  treePath: string;
  body: string;
  jlog: TreeMessageJlog;
  active: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

function qs(app: string, extra: Record<string, string> = {}) {
  return `?${new URLSearchParams({ app, ...extra }).toString()}`;
}

export async function listTreeMessages(app: string, contextKey: string): Promise<TreeMessage[]> {
  const data = await treeHttp.capFetch(
    `/tree-msgs${qs(app, { context: contextKey })}`,
    { method: "GET" },
  );
  return (data.messages ?? []) as TreeMessage[];
}

export async function postTreeMessage(
  app: string,
  payload: {
    context: string;
    body: string;
    parentPath?: string | null;
    replyToPath?: string | null;
    quotePath?: string | null;
  },
): Promise<TreeMessage> {
  const data = await treeHttp.capFetch(`/tree-msgs${qs(app)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.message as TreeMessage;
}

// PUT /api/tree-msgs/{treePath} (era PATCH; migrado 18-jul-2026).
// En InSoft no usamos PATCH: solo PUT.
export async function putTreeMessage(
  app: string,
  contextKey: string,
  treePath: string,
  patch: { body?: string; active?: boolean },
): Promise<TreeMessage> {
  const data = await treeHttp.capFetch(
    `/tree-msgs/${encodeURIComponent(treePath)}${qs(app, { context: contextKey })}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return data.message as TreeMessage;
}

export async function deleteTreeMessage(app: string, contextKey: string, treePath: string): Promise<TreeMessage> {
  const data = await treeHttp.capFetch(
    `/tree-msgs/${encodeURIComponent(treePath)}${qs(app, { context: contextKey })}`,
    { method: "DELETE" },
  );
  return data.message as TreeMessage;
}

/** Contexto SCRUM para documentación conversacional de una tarea. */
export function scrumTaskContext(taskId: string) {
  return `scrum-task:${taskId}`;
}
