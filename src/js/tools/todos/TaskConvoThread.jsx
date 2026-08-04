import { getReact, getMaterialUI, UI, Session } from "../../core/platform.ts";
import { mdToHtml } from "../../ui/shared.jsx";
import { PromptBodyEditor } from "../../ui/PromptBodyEditor.jsx";
import {
  deleteTreeMessage,
  listTreeMessages,
  postTreeMessage,
} from "../../api/treeMsgsApi.ts";
import { SCRUM_APP_ID } from "../../api/todosApi.ts";
import { pathDepth } from "./treePathUtils.js";

const { useState, useEffect, useCallback } = getReact();
const {
  Box, Stack, Typography, Button, IconButton, Tooltip, CircularProgress, Alert,
} = getMaterialUI();
const { Icon } = UI;

function formatMsgDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function quotedSnippet(messages, quotePath) {
  if (!quotePath) return "";
  const found = messages.find((m) => m.treePath === quotePath);
  if (!found?.body) return "";
  const t = found.body.trim();
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

function MessageBubble({ msg, messages, readOnly, busy, onReply, onQuote, onDelete }) {
  const depth = Math.max(0, pathDepth(msg.treePath) - 1);
  const author = msg.jlog?.author || "—";
  const quote = msg.jlog?.quotePath ? quotedSnippet(messages, msg.jlog.quotePath) : "";

  return (
    <Box
      className={`paty-task-msg paty-task-msg--${msg.jlog?.kind || "message"}`}
      sx={{ ml: depth * 2.5, pl: 1.5, borderLeft: depth ? 2 : 0, borderColor: "divider" }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{author}</Typography>
        <Typography variant="caption" color="text.secondary">{formatMsgDate(msg.updatedAt || msg.createdAt)}</Typography>
        {msg.jlog?.kind === "reply" && msg.jlog?.replyToPath ? (
          <Typography variant="caption" color="text.secondary">↩ {msg.jlog.replyToPath}</Typography>
        ) : null}
      </Stack>
      {quote ? (
        <Box className="paty-task-msg__quote">
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Cita {msg.jlog.quotePath}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>{quote}</Typography>
        </Box>
      ) : null}
      {msg.body.trim() ? (
        <Box
          className="paty-task-msg__body prompt-md-preview msg-body"
          dangerouslySetInnerHTML={{ __html: mdToHtml(msg.body) }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">(sin texto)</Typography>
      )}
      {!readOnly ? (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
          <Tooltip title="Responder">
            <IconButton size="small" disabled={busy} onClick={() => onReply(msg)} aria-label="Responder">
              <Icon icon="mdi:reply-outline" size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Citar">
            <IconButton size="small" disabled={busy} onClick={() => onQuote(msg)} aria-label="Citar">
              <Icon icon="mdi:format-quote-close-outline" size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar (soft)">
            <IconButton size="small" color="error" disabled={busy} onClick={() => onDelete(msg)} aria-label="Eliminar">
              <Icon icon="mdi:delete-outline" size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
    </Box>
  );
}

export function TaskConvoThread({ contextKey, readOnly = false, appId = SCRUM_APP_ID }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [quotePath, setQuotePath] = useState(null);

  const reload = useCallback(async () => {
    if (!contextKey) return;
    setLoading(true);
    setError("");
    try {
      const list = await listTreeMessages(appId, contextKey);
      setMessages(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [appId, contextKey]);

  useEffect(() => { reload(); }, [reload]);

  async function run(fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handlePost() {
    const text = draft.trim();
    if (!text || !contextKey) return;
    await run(async () => {
      await postTreeMessage(appId, {
        context: contextKey,
        body: text,
        parentPath: replyTo?.treePath ?? null,
        replyToPath: replyTo?.treePath ?? null,
        quotePath,
      });
      setDraft("");
      setReplyTo(null);
      setQuotePath(null);
      await reload();
    });
  }

  if (!contextKey) return null;

  return (
    <Box className="paty-task-convo">
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block", flexShrink: 0 }}>
        Conversación
      </Typography>

      {error ? (
        <Alert severity="warning" sx={{ mb: 1, flexShrink: 0 }}>
          No se pudo cargar el hilo: {error}
        </Alert>
      ) : null}

      <Box className="paty-task-convo__thread custom-scrollbar">
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : null}
        {!loading && !messages.length && !error ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Sin mensajes publicados.
          </Typography>
        ) : null}
        {!loading && messages.length ? (
          <Stack spacing={1.5} sx={{ py: 0.5 }}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.treePath}
                msg={msg}
                messages={messages}
                readOnly={readOnly}
                busy={busy}
                onReply={(m) => { setReplyTo(m); setQuotePath(null); }}
                onQuote={(m) => { setQuotePath(m.treePath); setReplyTo(m); }}
                onDelete={(m) => run(async () => {
                  await deleteTreeMessage(appId, contextKey, m.treePath);
                  await reload();
                })}
              />
            ))}
          </Stack>
        ) : null}
      </Box>

      {!readOnly ? (
        <Box className="paty-task-convo__composer">
          {replyTo ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Respondiendo a {replyTo.jlog?.author || replyTo.treePath}
                {quotePath ? ` · citando ${quotePath}` : ""}
              </Typography>
              <Button size="small" onClick={() => { setReplyTo(null); setQuotePath(null); }}>Cancelar</Button>
            </Stack>
          ) : null}
          <Box className="paty-task-convo__editor paty-task-convo__editor--reply">
            <PromptBodyEditor
              body={draft}
              canEdit={!busy}
              editBlockReason={readOnly ? "Solo lectura" : "No disponible"}
              onChange={setDraft}
              placeholder="Nuevo mensaje en Markdown… (doble clic para editar)"
              title="Nuevo mensaje"
              loading={false}
            />
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: "auto" }}>
              Autor: {Session.username() || "—"}
            </Typography>
            <Button variant="contained" disabled={busy || !draft.trim()} onClick={handlePost}>
              Publicar
            </Button>
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}
