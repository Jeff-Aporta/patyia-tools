/** Init síncrono — importado desde index.html antes del CSS de la app. */
const KEY = "isa-patyia:theme";
let mode = "dark";
try {
  const v = localStorage.getItem(KEY);
  if (v === "light" || v === "dark") mode = v;
} catch { /* ignore */ }
document.documentElement.setAttribute("data-mui-color-scheme", mode);
document.documentElement.style.colorScheme = mode;
