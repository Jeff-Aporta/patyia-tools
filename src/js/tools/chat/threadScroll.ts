import { getReact } from "../../core/platform.ts";
import type { ChatMensajeVista, ConvLogSnapshot } from "./types.ts";

const { useEffect, useLayoutEffect, useCallback, useRef, useMemo } = getReact();

const THREAD_SCROLL_NEAR_BOTTOM = 72;

type ThreadScrollOptions = {
  sending?: boolean;
};

/** Conserva distancia al fondo al insertar mensajes (p. ej. operativas) arriba del viewport. */
export function useThreadScrollAnchor(
  scrollRef: { current: HTMLElement | null },
  mensajes: ChatMensajeVista[] | null | undefined,
  { sending = false }: ThreadScrollOptions = {},
) {
  const snapshotRef = useRef<ConvLogSnapshot | null>(null);

  const mensajesKey = useMemo(
    () => (mensajes || []).map((m) => (
      m.idMsg === "stream-live"
        ? `${m.idMsg}:${String(m.contenido || "").length}`
        : m.idMsg
    )).join("|"),
    [mensajes],
  );

  const captureSnapshot = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    snapshotRef.current = {
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
    };
  }, [scrollRef]);

  const applyScrollAnchor = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const snap = snapshotRef.current;
    const distBottom = snap
      ? snap.scrollHeight - snap.scrollTop - snap.clientHeight
      : 0;
    const pinBottom = sending || !snap || distBottom <= THREAD_SCROLL_NEAR_BOTTOM;

    if (pinBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTop = Math.max(0, el.scrollHeight - distBottom - el.clientHeight);
    }
    captureSnapshot();
  }, [scrollRef, sending, captureSnapshot]);

  const onThreadScroll = useCallback(() => {
    captureSnapshot();
  }, [captureSnapshot]);

  useLayoutEffect(() => {
    applyScrollAnchor();
  }, [mensajesKey, sending, applyScrollAnchor]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;

    const ro = new ResizeObserver(() => {
      applyScrollAnchor();
    });
    for (const child of el.children) ro.observe(child);
    return () => ro.disconnect();
  }, [mensajesKey, applyScrollAnchor, scrollRef]);

  return onThreadScroll;
}
