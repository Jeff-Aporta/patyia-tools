const LS_KEY = "isa-patyia:config-tab";
const DEFAULT_TAB = "sistema";
const VALID_TABS = new Set(["sistema", "permisos"]);

export function readConfigToolTab(): string {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v && VALID_TABS.has(v) ? v : DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

export function writeConfigToolTab(tab: string): void {
  try {
    if (VALID_TABS.has(tab)) localStorage.setItem(LS_KEY, tab);
  } catch { /* ignore */ }
}
