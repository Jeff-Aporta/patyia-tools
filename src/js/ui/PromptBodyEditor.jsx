import { getReact, getMaterialUI } from "../core/platform.ts";
import { mdToHtml } from "../core/platform.ts";
import { bodyPreviewHtml, bodyPreviewHtmlFromLines, bodyToEditorHtml, editorHtmlToBody, surfaceHasRawVarTokens } from "./promptMdEditorHtml.ts";
import {
  clipboardImageDataUrl,
  insertImageNodeAtSelection,
  insertTextAtTextarea,
  markdownImage,
} from "./mdImagePaste.ts";
import {
  renamePromptVariable,
  extractPromptVariables,
  isValidVarName,
  varToneSx,
} from "../core/promptVariables.ts";
import { ButtonIconify } from "./shared.jsx";

const { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } = getReact();
const {
  Box, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, Divider, Chip, Switch, FormControlLabel, CircularProgress,
} = getMaterialUI();

const MAX_UNDO = 80;

function useEditorUndo(initial) {
  const [value, setValue] = useState(initial);
  const [hist, setHist] = useState({ past: 0, future: 0 });
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const skipSync = useRef(false);

  const syncHist = useCallback(() => {
    setHist({ past: pastRef.current.length, future: futureRef.current.length });
  }, []);

  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    setValue(initial);
    pastRef.current = [];
    futureRef.current = [];
    setHist({ past: 0, future: 0 });
  }, [initial]);

  const commit = useCallback((next) => {
    const v = String(next ?? "");
    setValue((prev) => {
      if (v === prev) return prev;
      pastRef.current = [...pastRef.current.slice(-MAX_UNDO + 1), prev];
      futureRef.current = [];
      return v;
    });
    syncHist();
  }, [syncHist]);

  const undo = useCallback(() => {
    setValue((prev) => {
      const stack = pastRef.current;
      if (!stack.length) return prev;
      const prior = stack[stack.length - 1];
      pastRef.current = stack.slice(0, -1);
      futureRef.current = [prev, ...futureRef.current];
      skipSync.current = true;
      return prior;
    });
    syncHist();
  }, [syncHist]);

  const redo = useCallback(() => {
    setValue((prev) => {
      const stack = futureRef.current;
      if (!stack.length) return prev;
      const next = stack[0];
      futureRef.current = stack.slice(1);
      pastRef.current = [...pastRef.current, prev];
      skipSync.current = true;
      return next;
    });
    syncHist();
  }, [syncHist]);

  const reset = useCallback((next) => {
    skipSync.current = true;
    pastRef.current = [];
    futureRef.current = [];
    setValue(String(next ?? ""));
    setHist({ past: 0, future: 0 });
  }, []);

  return {
    value,
    commit,
    undo,
    redo,
    canUndo: hist.past > 0,
    canRedo: hist.future > 0,
    reset,
  };
}

/** Offset de texto dentro de root (para restaurar caret tras re-render del surface). */
function getCaretOffset(root, targetNode, targetOffset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node = walker.nextNode();
  while (node) {
    if (node === targetNode) return offset + targetOffset;
    offset += node.textContent?.length ?? 0;
    node = walker.nextNode();
  }
  return offset;
}

function setCaretOffset(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remain = Math.max(0, offset);
  let node = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (remain <= len) {
      const range = document.createRange();
      range.setStart(node, remain);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }
    remain -= len;
    node = walker.nextNode();
  }
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function saveSurfaceCaret(root) {
  const sel = window.getSelection();
  if (!sel?.rangeCount || !root) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  return getCaretOffset(root, range.startContainer, range.startOffset);
}

function restoreSurfaceCaret(root, offset) {
  if (offset == null || !root) return;
  requestAnimationFrame(() => setCaretOffset(root, offset));
}

function isVarChip(node) {
  return node?.nodeType === Node.ELEMENT_NODE && node.classList?.contains("prompt-var-chip");
}

function previousMeaningfulSibling(node) {
  let prev = node?.previousSibling ?? null;
  while (prev) {
    if (prev.nodeType === Node.TEXT_NODE && !prev.textContent) {
      prev = prev.previousSibling;
      continue;
    }
    return prev;
  }
  return null;
}

function nextMeaningfulSibling(node) {
  let next = node?.nextSibling ?? null;
  while (next) {
    if (next.nodeType === Node.TEXT_NODE && !next.textContent) {
      next = next.nextSibling;
      continue;
    }
    return next;
  }
  return null;
}

function findVarChipBefore(range) {
  const { startContainer, startOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    if (startOffset > 0) return null;
    const prev = previousMeaningfulSibling(startContainer);
    return isVarChip(prev) ? prev : null;
  }
  if (startContainer.nodeType === Node.ELEMENT_NODE && startOffset > 0) {
    const prev = startContainer.childNodes[startOffset - 1];
    return isVarChip(prev) ? prev : null;
  }
  return null;
}

function findVarChipAfter(range) {
  const { startContainer, startOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    if (startOffset < (startContainer.textContent?.length ?? 0)) return null;
    const next = nextMeaningfulSibling(startContainer);
    return isVarChip(next) ? next : null;
  }
  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const next = startContainer.childNodes[startOffset];
    return isVarChip(next) ? next : null;
  }
  return null;
}

function findVarChipInSelection(range) {
  if (range.collapsed) return null;
  const root = range.commonAncestorContainer;
  const host = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
  if (isVarChip(host)) return host;
  const chip = host?.querySelector?.(".prompt-var-chip");
  if (chip && range.intersectsNode?.(chip)) return chip;
  return null;
}

function findVarChipAtCaret(sel) {
  const node = sel.anchorNode;
  if (!node) return null;
  if (isVarChip(node)) return node;
  return node.parentElement?.closest?.(".prompt-var-chip") ?? null;
}

function getScrollContainer(el) {
  let node = el;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return el;
}

function viewportLead(scrollEl) {
  return Math.min(120, Math.max(48, scrollEl.clientHeight * 0.12));
}

function caretRangeFromClientPoint(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  const pos = document.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const range = document.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}

function plainOffsetFromScroll(textarea, scrollTop, lead) {
  const style = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(style.lineHeight) || 22;
  const padTop = parseFloat(style.paddingTop) || 0;
  const targetLine = Math.max(0, Math.floor((scrollTop + lead - padTop) / lineHeight));
  const text = textarea.value;
  let line = 0;
  let pos = 0;
  while (pos < text.length && line < targetLine) {
    const nl = text.indexOf("\n", pos);
    if (nl < 0) return text.length;
    pos = nl + 1;
    line += 1;
  }
  return pos;
}

function captureScrollAnchor(scrollEl, { plainText, surfaceEl, plainTextEl }) {
  if (!scrollEl) return null;
  const lead = viewportLead(scrollEl);
  const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
  const ratio = maxScroll > 0 ? scrollEl.scrollTop / maxScroll : 0;
  const rect = scrollEl.getBoundingClientRect();
  const x = rect.left + 96;
  const y = rect.top + lead;

  let charOffset = 0;
  if (plainText) {
    if (plainTextEl) charOffset = plainOffsetFromScroll(plainTextEl, scrollEl.scrollTop, lead);
  } else if (surfaceEl) {
    const range = caretRangeFromClientPoint(x, y);
    if (range && surfaceEl.contains(range.startContainer)) {
      charOffset = getCaretOffset(surfaceEl, range.startContainer, range.startOffset);
    } else {
      charOffset = saveSurfaceCaret(surfaceEl) ?? 0;
    }
  }

  return { charOffset, lead, ratio };
}

function restoreScrollAnchor(scrollEl, anchor, { plainText, surfaceEl, plainTextEl }) {
  if (!scrollEl || !anchor) return;
  const { charOffset, lead, ratio } = anchor;

  if (plainText && plainTextEl) {
    plainTextEl.setSelectionRange(charOffset, charOffset);
    const style = window.getComputedStyle(plainTextEl);
    const lineHeight = parseFloat(style.lineHeight) || 22;
    const padTop = parseFloat(style.paddingTop) || 0;
    const line = plainTextEl.value.slice(0, charOffset).split("\n").length - 1;
    scrollEl.scrollTop = Math.max(0, line * lineHeight + padTop - lead);
    return;
  }

  if (surfaceEl) {
    setCaretOffset(surfaceEl, charOffset);
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const caretRect = sel.getRangeAt(0).getBoundingClientRect();
      const scrollRect = scrollEl.getBoundingClientRect();
      scrollEl.scrollTop += caretRect.top - scrollRect.top - lead;
      return;
    }
  }

  const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
  scrollEl.scrollTop = ratio * maxScroll;
}

function RenameVarDialog({ open, name, existing, onClose, onConfirm }) {
  const [draft, setDraft] = useState(name || "");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setDraft(name || "");
      setErr("");
    }
  }, [open, name]);
  function submit() {
    const next = draft.trim();
    if (!isValidVarName(next)) {
      setErr("Nombre inválido (use letras, números y _)");
      return;
    }
    if (next !== name && existing.includes(next)) {
      setErr("Ya existe otra variable con ese nombre");
      return;
    }
    onConfirm(next);
  }
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Renombrar variable</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Se actualizarán todas las ocurrencias de <code>{`{{${name}}}`}</code> en el documento.
        </Typography>
        {err ? <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert> : null}
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Nombre"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\w]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={submit}>Renombrar</Button>
      </DialogActions>
    </Dialog>
  );
}

function PromptEditorDialog({ open, onClose, title, body, canEdit, onSave, onDraft, tipo }) {
  const surfaceRef = useRef(null);
  const plainTextRef = useRef(null);
  const dialogContentRef = useRef(null);
  const pendingScrollAnchorRef = useRef(null);
  const syncLock = useRef(false);
  const pendingSurfaceValue = useRef(null);
  const surfaceOrigin = useRef(false);
  const prevOpen = useRef(false);
  const { value, commit, undo, redo, canUndo, canRedo, reset } = useEditorUndo(body);
  const [renameDlg, setRenameDlg] = useState({ open: false, name: "" });
  const [saving, setSaving] = useState(false);
  const [plainText, setPlainText] = useState(false);
  const savedRangeRef = useRef(null);
  const savedCaretRef = useRef(null);
  const pushSuppressRef = useRef(false);

  const variables = useMemo(() => extractPromptVariables(value), [value]);

  const captureEditorSelection = useCallback(() => {
    const el = surfaceRef.current;
    const sel = window.getSelection();
    if (!el || !sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
    savedCaretRef.current = saveSurfaceCaret(el);
  }, []);

  const restoreEditorRange = useCallback(() => {
    const el = surfaceRef.current;
    const sel = window.getSelection();
    if (!el || !sel) return null;
    if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
      const range = savedRangeRef.current;
      sel.removeAllRanges();
      sel.addRange(range);
      return range;
    }
    if (savedCaretRef.current != null) {
      setCaretOffset(el, savedCaretRef.current);
      if (sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        return sel.getRangeAt(0);
      }
    }
    if (sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      return sel.getRangeAt(0);
    }
    return null;
  }, []);

  const syncSurfaceFromValue = useCallback((text, opts = {}) => {
    const el = surfaceRef.current;
    if (!el) return false;
    const caret = opts.preserveCaret ? saveSurfaceCaret(el) : null;
    syncLock.current = true;
    el.innerHTML = bodyToEditorHtml(text);
    syncLock.current = false;
    if (caret != null) restoreSurfaceCaret(el, caret);
    return true;
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      pendingSurfaceValue.current = null;
      pendingScrollAnchorRef.current = null;
      prevOpen.current = false;
      setPlainText(false);
      return;
    }

    const justOpened = !prevOpen.current;
    prevOpen.current = true;

    if (justOpened) {
      setPlainText(false);
      reset(body);
      pendingSurfaceValue.current = body;
      syncSurfaceFromValue(body);
      surfaceOrigin.current = true;
      return;
    }

    if (plainText) {
      pendingSurfaceValue.current = value;
      return;
    }

    if (surfaceOrigin.current) {
      surfaceOrigin.current = false;
      pendingSurfaceValue.current = value;
      return;
    }

    pendingSurfaceValue.current = value;
    syncSurfaceFromValue(value);
  }, [open, value, body, reset, syncSurfaceFromValue, plainText]);

  const readSurface = useCallback(() => {
    const el = surfaceRef.current;
    if (!el) return value;
    return editorHtmlToBody(el);
  }, [value]);

  const restoreScrollAfterModeSwitch = useCallback(() => {
    const anchor = pendingScrollAnchorRef.current;
    if (!anchor) return;
    const scrollEl = getScrollContainer(dialogContentRef.current);
    if (!scrollEl) return;
    const editorReady = plainText ? plainTextRef.current : surfaceRef.current;
    if (!editorReady) return;
    pendingScrollAnchorRef.current = null;
    restoreScrollAnchor(scrollEl, anchor, {
      plainText,
      surfaceEl: surfaceRef.current,
      plainTextEl: plainTextRef.current,
    });
  }, [plainText]);

  const attachSurfaceRef = useCallback((node) => {
    surfaceRef.current = node;
    if (node && open && pendingSurfaceValue.current != null) {
      syncSurfaceFromValue(pendingSurfaceValue.current);
      if (pendingScrollAnchorRef.current) {
        requestAnimationFrame(() => {
          restoreScrollAfterModeSwitch();
          requestAnimationFrame(() => restoreScrollAfterModeSwitch());
        });
      }
    }
  }, [open, syncSurfaceFromValue, restoreScrollAfterModeSwitch]);

  useLayoutEffect(() => {
    if (!open || !pendingScrollAnchorRef.current) return;
    restoreScrollAfterModeSwitch();
    requestAnimationFrame(() => restoreScrollAfterModeSwitch());
  }, [plainText, open, restoreScrollAfterModeSwitch]);

  const getEditorText = useCallback(() => (
    plainText ? value : readSurface()
  ), [plainText, value, readSurface]);

  const togglePlainText = useCallback((on) => {
    const scrollEl = getScrollContainer(dialogContentRef.current);
    pendingScrollAnchorRef.current = captureScrollAnchor(scrollEl, {
      plainText,
      surfaceEl: surfaceRef.current,
      plainTextEl: plainTextRef.current,
    });

    if (on && !plainText) {
      const text = readSurface();
      surfaceOrigin.current = true;
      commit(text);
    } else if (!on && plainText) {
      pendingSurfaceValue.current = value;
    }
    setPlainText(on);
  }, [plainText, readSurface, commit, value]);

  const pushChange = useCallback(() => {
    if (syncLock.current || pushSuppressRef.current) return;
    const next = readSurface();
    surfaceOrigin.current = true;
    commit(next);
    if (surfaceHasRawVarTokens(surfaceRef.current)) {
      requestAnimationFrame(() => syncSurfaceFromValue(next, { preserveCaret: true }));
    }
  }, [readSurface, commit, syncSurfaceFromValue]);

  const handleUndo = useCallback(() => {
    surfaceOrigin.current = false;
    pushSuppressRef.current = true;
    undo();
    requestAnimationFrame(() => { pushSuppressRef.current = false; });
  }, [undo]);

  const handleRedo = useCallback(() => {
    surfaceOrigin.current = false;
    pushSuppressRef.current = true;
    redo();
    requestAnimationFrame(() => { pushSuppressRef.current = false; });
  }, [redo]);

  const keepToolbarFocus = useCallback((e) => {
    e.preventDefault();
  }, []);

  function onEditorBlur(e) {
    const target = e.relatedTarget;
    if (target?.closest?.(
      ".MuiDialogTitle, .MuiDialogActions, .btn-iconify, .MuiMenu-root, .MuiPopover-root, .MuiModal-root"
    )) return;
    pushChange();
  }

  function handleDismiss() {
    if (canEdit && onDraft) onDraft(getEditorText());
    onClose();
  }

  function handleDiscard() {
    onClose();
  }

  async function handleSave() {
    const next = getEditorText();
    setSaving(true);
    try {
      await onSave(next);
      onClose();
    } catch {
      /* el padre muestra el error; mantener el diálogo abierto */
    } finally {
      setSaving(false);
    }
  }

  function onChipRename(oldName, newName) {
    const next = renamePromptVariable(value, oldName, newName);
    surfaceOrigin.current = true;
    commit(next);
    if (!plainText) {
      pendingSurfaceValue.current = next;
      requestAnimationFrame(() => syncSurfaceFromValue(next, { preserveCaret: true }));
    }
    setRenameDlg({ open: false, name: "" });
  }

  function onEditorClick(e) {
    const chip = e.target.closest?.(".prompt-var-chip");
    if (chip && e.detail >= 2 && canEdit) {
      e.preventDefault();
      setRenameDlg({ open: true, name: chip.dataset.var || "" });
    }
  }

  function onEditorCopy(e) {
    const md = readSurface();
    if (!md) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", md);
  }

  async function onEditorPaste(e) {
    if (!canEdit) return;
    const dataUrl = await clipboardImageDataUrl(e);
    if (!dataUrl) return;
    e.preventDefault();
    captureEditorSelection();
    surfaceRef.current?.focus();
    restoreEditorRange();
    insertImageNodeAtSelection(dataUrl);
    pushChange();
  }

  async function onPlainTextPaste(e) {
    if (!canEdit) return;
    const dataUrl = await clipboardImageDataUrl(e);
    if (!dataUrl) return;
    e.preventDefault();
    const ta = plainTextRef.current;
    if (!ta) return;
    const snippet = `${markdownImage("imagen", dataUrl)}\n\n`;
    const { next, pos } = insertTextAtTextarea(ta, snippet);
    surfaceOrigin.current = true;
    commit(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  function onPlainTextKeyDown(e) {
    if (!canEdit) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    }
  }

  function tryRemoveVarChipOnKey(e) {
    if (e.key !== "Backspace" && e.key !== "Delete") return false;
    const surface = surfaceRef.current;
    const sel = window.getSelection();
    if (!surface || !sel?.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!surface.contains(range.commonAncestorContainer)) return false;

    let chip = findVarChipAtCaret(sel);
    if (!chip && !range.collapsed) chip = findVarChipInSelection(range);
    if (!chip) {
      chip = e.key === "Backspace" ? findVarChipBefore(range) : findVarChipAfter(range);
    }
    if (!chip) return false;

    e.preventDefault();
    chip.remove();
    const next = readSurface();
    surfaceOrigin.current = true;
    commit(next);
    if (surfaceHasRawVarTokens(surfaceRef.current)) {
      requestAnimationFrame(() => syncSurfaceFromValue(next, { preserveCaret: true }));
    }
    return true;
  }

  function onKeyDown(e) {
    if (!canEdit) return;
    if (tryRemoveVarChipOnKey(e)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "a" && surfaceRef.current) {
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(surfaceRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      captureEditorSelection();
      return;
    }
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    }
  }

  function execFmt(cmd, arg) {
    captureEditorSelection();
    surfaceRef.current?.focus();
    restoreEditorRange();
    document.execCommand(cmd, false, arg ?? null);
    captureEditorSelection();
    pushChange();
  }

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      fullScreen
      scroll="paper"
      TransitionProps={{
        onEntered: () => {
          if (!plainText && pendingSurfaceValue.current != null) {
            syncSurfaceFromValue(pendingSurfaceValue.current);
          }
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5, flexWrap: "wrap" }}>
        <iconify-icon icon="mdi:pencil-outline" width="1.25em" height="1.25em" />
        <Box component="span" sx={{ fontWeight: 600 }}>{title}</Box>
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={plainText}
              onChange={(e) => togglePlainText(e.target.checked)}
              disabled={!canEdit}
            />
          )}
          label={(
            <Typography variant="body2" color="text.secondary" component="span">
              Texto plano
            </Typography>
          )}
          sx={{ ml: 0.5, mr: 0 }}
        />
        <Box sx={{ flex: 1 }} />
        {!plainText && (
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <ButtonIconify icon="mdi:undo" title="Deshacer (Ctrl+Z)" onMouseDown={keepToolbarFocus} onClick={handleUndo} disabled={!canUndo} />
          <ButtonIconify icon="mdi:redo" title="Rehacer (Ctrl+Y)" onMouseDown={keepToolbarFocus} onClick={handleRedo} disabled={!canRedo} />
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <ButtonIconify icon="mdi:format-bold" title="Negrita" onMouseDown={keepToolbarFocus} onClick={() => execFmt("bold")} disabled={!canEdit} />
          <ButtonIconify icon="mdi:format-italic" title="Cursiva" onMouseDown={keepToolbarFocus} onClick={() => execFmt("italic")} disabled={!canEdit} />
          <ButtonIconify icon="mdi:format-header-1" title="Título 1" onMouseDown={keepToolbarFocus} onClick={() => execFmt("formatBlock", "h1")} disabled={!canEdit} />
          <ButtonIconify icon="mdi:format-header-2" title="Título 2" onMouseDown={keepToolbarFocus} onClick={() => execFmt("formatBlock", "h2")} disabled={!canEdit} />
          <ButtonIconify icon="mdi:format-list-bulleted" title="Lista" onMouseDown={keepToolbarFocus} onClick={() => execFmt("insertUnorderedList")} disabled={!canEdit} />
        </Stack>
        )}
        {plainText && (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <ButtonIconify icon="mdi:undo" title="Deshacer (Ctrl+Z)" onClick={handleUndo} disabled={!canUndo} />
          <ButtonIconify icon="mdi:redo" title="Rehacer (Ctrl+Y)" onClick={handleRedo} disabled={!canRedo} />
        </Stack>
        )}
      </DialogTitle>
      <DialogContent ref={dialogContentRef} dividers className="prompt-md-dialog custom-scrollbar">
        {variables.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5, width: "100%", justifyContent: "flex-start", px: "1.5rem", pt: 1.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", mr: 0.5 }}>
              Variables (escribe {"{{nombre}}"} en el texto):
            </Typography>
            {variables.map((v) => (
              <Chip
                key={v}
                size="small"
                variant="outlined"
                className="prompt-var-chip prompt-var-chip--static"
                label={`{{${v}}}`}
                sx={varToneSx(v)}
                onDoubleClick={canEdit ? () => setRenameDlg({ open: true, name: v }) : undefined}
              />
            ))}
          </Stack>
        )}
        {plainText ? (
          <TextField
            multiline
            fullWidth
            className="prompt-md-plain-editor"
            value={value}
            onChange={(e) => {
              surfaceOrigin.current = true;
              commit(e.target.value);
            }}
            onKeyDown={onPlainTextKeyDown}
            onPaste={onPlainTextPaste}
            disabled={!canEdit}
            spellCheck={false}
            placeholder="Markdown y {{variables}} en texto plano…"
            minRows={24}
            inputRef={plainTextRef}
            slotProps={{ input: { "aria-label": "Editor de instrucción (texto plano)" } }}
          />
        ) : (
        <div
          ref={attachSurfaceRef}
          className={`prompt-md-editor-surface prompt-md-preview${canEdit ? "" : " prompt-md-editor-surface--readonly"}`}
          contentEditable={canEdit}
          spellCheck={false}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Editor de instrucción"
          onInput={pushChange}
          onBlur={onEditorBlur}
          onMouseUp={captureEditorSelection}
          onKeyUp={captureEditorSelection}
          onCopy={onEditorCopy}
          onPaste={onEditorPaste}
          onClick={onEditorClick}
          onKeyDown={onKeyDown}
        />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Button onClick={handleDismiss} disabled={saving} sx={{ color: "text.secondary" }}>Cerrar</Button>
        <Button onClick={handleDiscard} disabled={saving}>Descartar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!canEdit || saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </DialogActions>

      <RenameVarDialog
        open={renameDlg.open}
        name={renameDlg.name}
        existing={variables}
        onClose={() => setRenameDlg({ open: false, name: "" })}
        onConfirm={(newName) => onChipRename(renameDlg.name, newName)}
      />
    </Dialog>
  );
}

/** Vista previa del cuerpo + editor WYSIWYG al entrar o doble clic. */
export function PromptBodyEditor({
  body, bodyLines, canEdit, editBlockReason, onChange, onPersist, placeholder, tipo, title, loading = false,
  editorOpenSignal = 0,
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const previewRef = useRef(null);
  const previewHtml = useMemo(() => {
    if (Array.isArray(bodyLines) && bodyLines.length) return bodyPreviewHtmlFromLines(bodyLines);
    const text = String(body || "").trim();
    if (!text) return "";
    return bodyPreviewHtml(body);
  }, [body, bodyLines]);

  useEffect(() => {
    if (!editorOpenSignal || !canEdit || loading) return;
    setEditorOpen(true);
  }, [editorOpenSignal, canEdit, loading]);

  function openEditor() {
    if (!canEdit) return;
    setEditorOpen(true);
  }

  function handlePreviewCopy(e) {
    const md = String(body ?? "");
    if (!md) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", md);
  }

  function handlePreviewKeyDown(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "a" && previewRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const range = document.createRange();
      range.selectNodeContents(previewRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }
    if (canEdit && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openEditor();
    }
  }

  return (
    <>
      <Box
        className={`prompt-body-preview custom-scrollbar${canEdit ? " prompt-body-preview--editable" : ""}`}
        sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        onDoubleClick={loading ? undefined : openEditor}
        onCopy={handlePreviewCopy}
        onKeyDown={loading ? undefined : handlePreviewKeyDown}
        title={loading ? undefined : (canEdit ? "Doble clic para editar" : editBlockReason)}
        role={loading ? undefined : (canEdit ? "button" : undefined)}
        tabIndex={loading ? undefined : (canEdit ? 0 : undefined)}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <Box className="prompt-body-preview__loading" aria-hidden>
            <CircularProgress size={28} />
          </Box>
        ) : previewHtml ? (
          <div
            ref={previewRef}
            className="prompt-md-preview msg-body"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" className="prompt-body-preview__empty">
            {placeholder || "Sin contenido. Doble clic para editar…"}
          </Typography>
        )}
      </Box>

      <PromptEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={title || tipo || "Instrucción"}
        body={body || ""}
        canEdit={canEdit}
        tipo={tipo}
        onDraft={onChange}
        onSave={onPersist ?? onChange}
      />
    </>
  );
}

export { bodyPreviewHtml };
