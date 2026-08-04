/** Ambient types — ISA PatyIA (Babel runtime). */
interface IsaNs {
  UI: IsaUi;
  Theme: IsaTheme;
  Config: IsaConfig;
  Session: IsaSession;
  Auth: IsaAuth;
  APP_ID?: string;
  mount?: () => void;
}

/** @jeff-aporta/lightbox-zoom — cargado lazy vía boot/cdn.mjs */
interface IsaLightboxZoomApi {
  LightboxZoomDialog: (props: Record<string, unknown>) => unknown;
  LightboxZoomImage: (props: Record<string, unknown>) => unknown;
  useLightboxZoom: (...args: unknown[]) => unknown;
  ZOOM_MIN: number;
  ZOOM_MAX: number;
  PAN_STEP: number;
}

interface IsaComponentsApi {
  LightboxZoom?: IsaLightboxZoomApi;
}

interface Window {
  ISA: IsaNs;
  ISAFront: IsaFrontApi;
  ISAComponents?: IsaComponentsApi;
  React?: ReactHooks;
  MaterialUI?: Record<string, unknown>;
  CodeMirror?: unknown;
  marked?: { parse: (src: string, opts?: Record<string, unknown>) => string };
  AppMeta?: {
    apply: (cfg: Record<string, unknown>) => void;
    initFromDocument: () => Record<string, unknown>;
    cfg?: { theme?: { lsKey?: string } };
  };
  __ISA_DIST__?: boolean;
  ThemeInit?: {
    lsKey: string;
    readMode: (key: string) => string;
    applyMode: (mode: string) => void;
  };
}

declare const React: ReactHooks;
declare const ReactDOM: ReactDOMApi;
declare const MaterialUI: MaterialUIApi;
declare const Babel: BabelApi;

interface ReactHooks {
  useState<S>(initial: S | (() => S)): [S, (v: S | ((prev: S) => S)) => void];
  useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  useLayoutEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  useCallback<T extends (...args: any[]) => any>(fn: T, deps: unknown[]): T;
  useMemo<T>(factory: () => T, deps: unknown[]): T;
  useRef<T>(initial: T | null): { current: T | null };
  Fragment: unique symbol;
  createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown;
}

interface ReactDOMRoot {
  render(node: unknown): void;
}

interface ReactDOMApi {
  createRoot(container: Element | DocumentFragment): ReactDOMRoot;
}

interface BabelApi {
  transform(code: string, opts: { presets: string[]; filename?: string } | unknown): { code: string };
}

interface IsaAuth {
  isLoggedIn(): boolean;
  username(): string | null;
  authHeader(): Record<string, string>;
  login?(user: string, pass: string): Promise<unknown>;
  logout(): void;
  EVENT: string;
}

interface IsaSession {
  current(): { username: string; role: string | null; token: string; expiresAt: string | null; capabilities?: string[] } | null;
  isLoggedIn(): boolean;
  username(): string | null;
  realUsername?(): string | null;
  auditAuthor?(): string;
  authHeader(): Record<string, string>;
  appHeader(): Record<string, string>;
  appId(): string;
  login(user: string, pass: string): Promise<unknown>;
  logout(): void;
  refreshProfile(): Promise<unknown>;
  capabilities(): string[];
  adminCapabilities?(): string[];
  capabilityCatalog?(): unknown[];
  can(cap: string): boolean;
  blockReason(cap: string): string;
  EVENT: string;
}

interface IsaUi {
  Icon: (props: { icon: string; size?: number }) => unknown;
  TargetSwitch: () => unknown;
  ThemeSwitch: (props: { mode: string; onToggle: () => void }) => unknown;
  Loading?: (props: { label?: string }) => unknown;
  ErrorBox?: (props: { message: string }) => unknown;
  LoginGate?: unknown;
  LoginButton?: unknown;
  useRealtimeStatus?: unknown;
  RealtimeStatusDot?: unknown;
}

interface IsaTheme {
  useThemeMode(): { mode: string; theme: unknown; toggle: () => void };
}

interface IsaConfig {
  base(): string;
  apiUrl(path: string): string;
  isLocal(): boolean;
  setLocal(on: boolean): void;
  label?(): string;
  EVENT: string;
}

interface AppShellProps {
  ns: string;
  title?: string;
  children?: unknown;
  icon?: string;
  showTitle?: boolean;
  onBrandClick?: (() => void) | false;
  brandClick?: false;
  toolbarExtra?: unknown;
  toolbarEnd?: unknown;
  navRows?: unknown[];
  showTarget?: boolean;
  showTheme?: boolean;
  showAuthChip?: boolean;
  showLogout?: boolean;
  loginGate?: boolean;
  mobileNav?: boolean;
  mobileBreakpoint?: "xs" | "sm" | "md" | "lg" | "xl";
  chromeless?: boolean;
}

type MuiThemeOptions = Record<string, unknown>;
type MuiTheme = Record<string, unknown>;
type MuiComponent = (props: Record<string, unknown>) => unknown;
type MuiThemeFactory = (options: MuiThemeOptions) => MuiTheme;

/** MUI cargado en runtime vía esm.sh — `createTheme` tipado; resto de exports por índice. */
type MaterialUIApi = Record<string, MuiComponent | MuiThemeFactory | unknown> & {
  createTheme: (options: MuiThemeOptions) => MuiTheme;
};

interface IsaFrontApi {
  registerApp(opts: Record<string, unknown>): void;
  registerCodeMirror?(react: unknown, mui: unknown): void;
  registerRealtime?(ns: string, opts: Record<string, unknown>): void;
  ensureCodeMirrorLoaded?(opts?: { sql?: boolean }): Promise<void>;
  ensureMarked?(): Promise<void>;
  ensureLazyStylesheet?(href: string): Promise<void>;
  mdToHtml?(src: string): string;
  estimatePromptTokens?(text: unknown): number;
  CodeMirrorPanel?: (props: Record<string, unknown>) => unknown;
  getReact(): ReactHooks;
  getReactDOM(): ReactDOMApi;
  getMaterialUI(): MaterialUIApi;
  createCapFetch(opts: Record<string, unknown>): {
    capFetch(path: string, init?: RequestInit, cap?: string | null): Promise<unknown>;
    apiUrl(path: string, baseOverride?: string): string;
    encodeSqlQueryParam(sql: string): string;
    rowVal(row: unknown, key: string): unknown;
  };
  createServiceSession(opts: Record<string, unknown>): Record<string, unknown>;
  humanPermissionError(err: unknown, cap: string, blockReason?: (cap: string) => string): string;
  handleApiError(err: Error & { code?: string }, cap: string, deps?: Record<string, unknown>): void;
  sanitizeApiError(raw: unknown, fallback?: string): string;
  createUrlState(opts: Record<string, unknown>): {
    boot: Record<string, unknown>;
    get: () => Record<string, unknown>;
    getSnapshot: () => Record<string, unknown>;
    merge: (partial: Record<string, unknown>) => Record<string, unknown>;
    mergePartial: (partial: Record<string, unknown>) => Record<string, unknown>;
    hrefFor: (partial?: Record<string, unknown>) => string;
    reset: () => Record<string, unknown>;
    subscribe: (fn: (s: Record<string, unknown>) => void) => () => void;
    PARAM: string;
    MAX_VALUE?: number;
  };
  createPlatformBridge(ns: string, opts?: Record<string, unknown>): {
    UI: IsaUi & { LoginButton?: unknown; useRealtimeStatus?: unknown; RealtimeStatusDot?: unknown };
    Session: IsaSession;
    Config: IsaConfig;
    Toast: { show(opts: Record<string, unknown>): unknown };
    Feedback?: Record<string, unknown>;
    Realtime?: Record<string, unknown>;
  };
  migrateLegacyGatewayKeys(keys: Record<string, string>): void;
  goBrandHome?(): void;
  BRAND_HOME_EVENT?: string;
  Layout: {
    AppShell: (props: AppShellProps) => unknown;
    goBrandHome?: () => void;
  };
}
