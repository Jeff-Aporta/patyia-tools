import { getReact } from "../core/platform.ts";

const { useRef, useState } = getReact();

/** Marca campos busy por guardado; limpia solo cuando termina el último request (gen). */
export function useConfigFieldPersist() {
  const saveGenRef = useRef(0);
  const [fieldBusy, setFieldBusy] = useState<Record<string, boolean>>({});

  function beginSave(fields: string[]) {
    const gen = ++saveGenRef.current;
    if (fields.length) {
      setFieldBusy((prev) => ({ ...prev, ...Object.fromEntries(fields.map((f) => [f, true])) }));
    }
    return gen;
  }

  function endSave(gen: number) {
    if (gen === saveGenRef.current) setFieldBusy({});
  }

  function fieldDisabled(canEdit: boolean, field: string) {
    return !canEdit || !!fieldBusy[field];
  }

  return { saveGenRef, beginSave, endSave, fieldDisabled };
}
