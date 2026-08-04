import { getReact, getMaterialUI, getReactDOM, UI, Session, Assets } from "../core/platform.ts";
import { mergePartial, bootState, getSnapshot, hrefFor, subscribe } from "../core/urlState.ts";
import { LogViewer } from "../tools/LogViewer.jsx";
import { PromptsSqlTool } from "../tools/PromptsSqlTool.jsx";
import { ChatTool } from "../tools/ChatTool.jsx";
import { TodosTool } from "../tools/TodosTool.jsx";
import { ConfigTool } from "../tools/ConfigTool.jsx";
import { WelcomeHome } from "../tools/WelcomeHome.jsx";
import { IssTargetChip } from "../components/IssTargetSwitch.jsx";
import { ViewAsRoleMenu } from "../components/ViewAsRoleControl.jsx";
import { BrandOpenAiStatus } from "../status/OpenAiStatusRing.jsx";
import { startOpenAiStatusPolling, stopOpenAiStatusPolling } from "../api/openaiStatusApi.ts";
import * as SessionApi from "../api/sessionApi.ts";

/** Mismo grafo que bootMeCaps — evita ViewAsRoleMenu en platform.js con cache ME vacío. */
(function registerViewAsRoleMenu() {
  const ui = window.ISA?.UI;
  if (!ui) return;
  ui.ViewAsRoleMenu = ViewAsRoleMenu;
  try { window.dispatchEvent(new Event("patyia-apptools:caps-changed")); } catch { /* ignore */ }
})();

const { Stack } = getMaterialUI();

const BRAND_HOME_EVENT = "isa:brand-home";

/** ponytail: DevFlow fuera del nav hasta estabilizar kanban/SCRUM. */
const DEVFLOW_NAV_ENABLED = false;

/** Tools del nav primario — Prompts y Logs viven como sub-tabs.
 * Nav siempre navegable; permisos restringen acciones/inputs dentro de cada panel. */
const ALL_TOOLS = [
  { id: "chat", label: "Chat", icon: "solar:chat-round-line-bold-duotone" },
  { id: "todos", label: "DevFlow", icon: "solar:widget-4-bold-duotone", devflow: true },
  { id: "config", label: "Config", icon: "solar:settings-bold-duotone" },
];

/** Sub-nav de Chat: conversaciones a la izquierda, logs a la derecha. */
const CHAT_PANES = [
  { id: "conv", label: "Conversaciones", icon: "solar:users-group-rounded-bold-duotone" },
  { id: "logs", label: "Logs", icon: "solar:clipboard-list-bold-duotone" },
];

/** Sub-nav de Config: prompts, sistema, permisos. */
const CONFIG_PANES = [
  { id: "prompts", label: "Prompts", icon: "solar:database-bold-duotone" },
  { id: "sistema", label: "Sistema", icon: "solar:tuning-2-bold-duotone" },
  { id: "permisos", label: "Permisos", icon: "solar:shield-keyhole-bold-duotone" },
];

const PUBLIC_SCRUM_TOOLS = [
  { id: "todos", label: "DevFlow", icon: "solar:widget-4-bold-duotone" },
];

function navTabs(tabs) {
  return tabs.map(({ id, label, icon }) => ({ id, label, icon }));
}

function isPublicScrumBoot(todos) {
  return !!String(todos?.publicSlug ?? "").trim();
}

function readChatPane(boot) {
  const pane = boot?.chat?.pane;
  if (pane === "logs" || pane === "conv") return pane;
  return "conv";
}

function readConfigPane(boot) {
  const pane = boot?.config?.pane;
  if (pane === "permisos" || pane === "prompts" || pane === "sistema") return pane;
  return "prompts";
}

function LocalIssBadge() {
  return <IssTargetChip />;
}

export function App() {
  const { useState, useEffect, useMemo } = getReact();
  const { LoginButton } = UI;
  const boot = bootState;

  // OpenAI Status: poll app-wide (60s), no solo en home.
  useEffect(() => {
    startOpenAiStatusPolling();
    return () => { stopOpenAiStatusPolling(); };
  }, []);
  const [appBoot, setAppBoot] = useState(boot);
  const [tool, setTool] = useState(() => boot.tool || "home");
  const [chatPane, setChatPane] = useState(() => readChatPane(boot));
  const [configPane, setConfigPane] = useState(() => readConfigPane(boot));
  const [authOpen, setAuthOpen] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const [homeTick, setHomeTick] = useState(0);
  const [authDownReason, setAuthDownReason] = useState(null);
  const [authDownTarget, setAuthDownTarget] = useState(null);
  const publicScrumView = isPublicScrumBoot(appBoot.todos);

  useEffect(() => {
    const onDown = (ev) => {
      // Con sesión portal viva, un Failed to fetch de chat/API no debe tapar toda la SPA.
      try {
        const s = window.ISA?.AuthApi?.readSession?.() ?? window.ISA?.Session?.current;
        if (s?.token && ev?.detail?.source === "fetch") return;
      } catch { /* ignore */ }
      setAuthDownReason(String(ev?.detail?.reason || "Servidor de autenticación caído"));
      setAuthDownTarget(String(ev?.detail?.target || "main-orchestrator (system-login)"));
      setAuthOpen(false);
    };
    const onUp = () => { setAuthDownReason(null); setAuthDownTarget(null); };
    window.addEventListener("isa-patyia:auth-server-down", onDown);
    window.addEventListener("isa-patyia:auth-server-up", onUp);
    return () => {
      window.removeEventListener("isa-patyia:auth-server-down", onDown);
      window.removeEventListener("isa-patyia:auth-server-up", onUp);
    };
  }, []);

  useEffect(() => {
    Assets.ensureMarked().catch(() => { /* fallback plaintext en mdToHtml */ });
  }, []);

  useEffect(() => {
    return subscribe(() => {
      const snap = getSnapshot();
      setAppBoot(snap);
      setTool(snap.tool || "home");
      setChatPane(readChatPane(snap));
      setConfigPane(readConfigPane(snap));
    });
  }, []);

  useEffect(() => {
    if (tool === "home") Assets.ensureWelcomeCss();
    if (tool === "chat") Assets.ensureChatStagingCss();
    if (tool === "todos" || publicScrumView) Assets.ensureTodosCss();
  }, [tool, publicScrumView]);

  useEffect(() => {
    if (publicScrumView) {
      document.documentElement.classList.add("paty-public-scrum");
    } else {
      document.documentElement.classList.remove("paty-public-scrum");
    }
    return () => document.documentElement.classList.remove("paty-public-scrum");
  }, [publicScrumView]);

  useEffect(() => {
    if (publicScrumView && tool !== "todos") {
      setTool("todos");
    }
  }, [publicScrumView, tool]);

  const toolTabs = useMemo(() => navTabs(ALL_TOOLS.filter((t) => {
    if (t.devflow) return DEVFLOW_NAV_ENABLED;
    if (publicScrumView) return false;
    return true;
  })), [publicScrumView]);
  const chatPanes = useMemo(() => navTabs(CHAT_PANES), []);
  const configPanes = useMemo(() => navTabs(CONFIG_PANES), []);

  useEffect(() => {
    if (publicScrumView) return;
    if (!DEVFLOW_NAV_ENABLED && tool === "todos") {
      setTool("chat");
      mergePartial({ tool: "chat" });
    }
  }, [publicScrumView, tool, authTick]);

  useEffect(() => {
    let alive = true;
    function onAuth() {
      if (!alive) return;
      setAuthTick((n) => n + 1);
      void SessionApi.bootMeCaps();
    }
    window.addEventListener(Session.EVENT, onAuth);
    window.addEventListener("isa-patyia:auth", onAuth);
    window.addEventListener("patyia-apptools:caps-changed", onAuth);
    if (Session.isLoggedIn()) void SessionApi.bootMeCaps();
    return () => {
      alive = false;
      window.removeEventListener(Session.EVENT, onAuth);
      window.removeEventListener("isa-patyia:auth", onAuth);
      window.removeEventListener("patyia-apptools:caps-changed", onAuth);
    };
  }, []);

  useEffect(() => {
    function onBrandHome() {
      setAppBoot(getSnapshot());
      setTool("home");
      setChatPane("conv");
      setHomeTick((n) => n + 1);
    }
    window.addEventListener(BRAND_HOME_EVENT, onBrandHome);
    return () => window.removeEventListener(BRAND_HOME_EVENT, onBrandHome);
  }, []);

  function selectTool(id) {
    setTool(id);
    if (id === "chat") {
      mergePartial({ tool: id, chat: { pane: chatPane || "conv" } });
    } else if (id === "config") {
      mergePartial({ tool: id, config: { pane: configPane || "prompts" } });
    } else if (id === "home") {
      mergePartial({ tool: "home" });
    } else {
      mergePartial({ tool: id });
    }
  }

  function openFromWelcome(id, pane) {
    if (id === "config") {
      const p = pane === "permisos" || pane === "prompts" || pane === "sistema" ? pane : "prompts";
      setConfigPane(p);
      setTool("config");
      mergePartial({ tool: "config", config: { pane: p } });
      try { localStorage.setItem("isa-patyia:config-tab", p); } catch { /* ignore */ }
      return;
    }
    if (id === "chat") {
      const p = pane === "logs" ? "logs" : "conv";
      setChatPane(p);
      setTool("chat");
      mergePartial({ tool: "chat", chat: { pane: p } });
      return;
    }
    selectTool(id);
  }

  function selectChatPane(id) {
    const pane = id === "logs" ? "logs" : "conv";
    setChatPane(pane);
    setTool("chat");
    mergePartial({ tool: "chat", chat: { pane } });
  }

  function selectConfigPane(id) {
    const pane = id === "permisos" ? "permisos" : id === "sistema" ? "sistema" : "prompts";
    setConfigPane(pane);
    setTool("config");
    mergePartial({ tool: "config", config: { pane } });
    try { localStorage.setItem("isa-patyia:config-tab", pane); } catch { /* ignore */ }
  }

  const Shell = window.ISAFront?.Layout?.AppShell;
  if (!Shell) throw new Error("AppShell no cargado — revisar loader.mjs");

  const toolbarTools = publicScrumView ? null : (
    <Stack direction="row" spacing={0.75} alignItems="center" className="header-session-wrap">
      <LocalIssBadge />
      <LoginButton
        loginOpen={authOpen}
        onLoginOpenChange={setAuthOpen}
        onLoggedIn={() => {
          setAuthTick((n) => n + 1);
          window.dispatchEvent(new Event("isa-patyia:auth"));
        }}
      />
    </Stack>
  );

  const navRows = publicScrumView
    ? [
        { id: "tool", tier: "primary", value: tool, onChange: selectTool, tabs: PUBLIC_SCRUM_TOOLS, tabHref: (id) => hrefFor({ tool: id }) },
      ]
    : [
        { id: "tool", tier: "primary", value: tool === "home" ? "" : tool, onChange: selectTool, tabs: toolTabs, tabHref: (id) => hrefFor({ tool: id }) },
        ...(tool === "chat"
          ? [{
              id: "chat-pane",
              tier: "secondary",
              compact: true,
              value: chatPane,
              onChange: selectChatPane,
              tabs: chatPanes,
              tabHref: (id) => hrefFor({ tool: "chat", chat: { pane: id } }),
            }]
          : []),
        ...(tool === "config"
          ? [{
              id: "config-pane",
              tier: "secondary",
              compact: true,
              value: configPane,
              onChange: selectConfigPane,
              tabs: configPanes,
              tabHref: (id) => hrefFor({ tool: "config", config: { pane: id } }),
            }]
          : []),
      ];

  return (
    <>
      <BrandOpenAiStatus />
      <Shell
      ns="ISA"
      title="PatyIA"
      showTarget={false}
      mobileBreakpoint="xs"
      chromeless={publicScrumView}
      toolbarExtra={toolbarTools}
      navRows={navRows}
    >
      {authDownReason && !publicScrumView ? (
        <div className="isa-auth-down-overlay" role="alert" aria-live="assertive">
          <div className="isa-auth-down-card">
            <div className="isa-auth-down-icon" aria-hidden="true">⚠</div>
            <h2 className="isa-auth-down-title">Servidor de autenticación no disponible</h2>
            <p className="isa-auth-down-reason">{authDownReason}</p>
            <p className="isa-auth-down-target">
              <span className="isa-auth-down-target-label">Servidor intentado:</span>
              <code className="isa-auth-down-target-url">{authDownTarget}</code>
            </p>
            <p className="isa-auth-down-hint">
              PatyIA requiere conexión con el servidor de autenticación para operar. Reintente automáticamente
              o haga una recarga manual cuando el servicio se haya recuperado.
            </p>
            <div className="isa-auth-down-actions">
              <button
                type="button"
                className="isa-auth-down-retry"
                onClick={() => window.location.reload()}
              >Reintentar ahora</button>
            </div>
          </div>
        </div>
      ) : publicScrumView ? (
        <TodosTool key={homeTick} bootTodos={appBoot.todos || {}} onNeedLogin={() => setAuthOpen(true)} />
      ) : (
        <>
          {tool === "home" && (
            <WelcomeHome key={`home-${homeTick}`} onOpenTool={openFromWelcome} />
          )}
          {tool === "chat" && chatPane === "logs" && (
            <LogViewer key={`logs-${homeTick}`} bootLog={appBoot.log || getSnapshot().log || {}} />
          )}
          {tool === "chat" && chatPane !== "logs" && (
            <ChatTool key={homeTick} bootChat={getSnapshot().chat || {}} onNeedLogin={() => setAuthOpen(true)} />
          )}
          {tool === "todos" && DEVFLOW_NAV_ENABLED && (
            <TodosTool key={`${homeTick}-${authTick}`} bootTodos={appBoot.todos || {}} onNeedLogin={() => setAuthOpen(true)} />
          )}
          {tool === "config" && configPane === "prompts" && (
            <PromptsSqlTool key={homeTick} bootPrompts={appBoot.prompts || {}} onNeedLogin={() => setAuthOpen(true)} />
          )}
          {tool === "config" && (configPane === "permisos" || configPane === "sistema") && (
            <ConfigTool key={homeTick} pane={configPane} onNeedLogin={() => setAuthOpen(true)} />
          )}
        </>
      )}
    </Shell>
    </>
  );
}

export function mountApp() {
  const { createRoot } = getReactDOM();
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("No se encontró #root");
  createRoot(rootEl).render(getReact().createElement(App));
}
