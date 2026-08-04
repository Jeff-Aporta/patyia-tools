# isa-patyia — notas para LLM

> **Consolidación 2026-07-16:** Este archivo (`frontend/llm.md`) es el **único** `llm.md` del repo. Los antiguos `isa-patyia/llm.md` y `isa-patyia/README.md` raíz se eliminaron por redundantes. Toda la doc de LLM vive aquí.

Front React + MUI de PatyIA AppTools. Sirve en Cloudflare Pages (dev) y GH Pages (main). Backend lógica real está en `C:\ContaPyme\PatyIA\ISS-AyudasCPIA\` — este front NO tiene backend productivo (el bridge en `../backend/` está DEPRECATED).

## Stack y arranque

- React 18 + MUI 9, TypeScript 5
- Sin bundler propio en runtime — bundles precompilados en `dist/` (esbuild via `paty_build.mjs`)
- ISAFront (`vendor/front-shared/`) provee AppShell, IsaSplitView, CodeMirrorPanel, Glass, LightboxZoom, Feedback (toasts), urlState — todo se carga vía `window.ISAFront.*`
- **Orden de carga** (`index.html`):
  1. `vendor/front-shared/base-href.js` — `<base href>` para rutas relativas
  2. `js/boot/theme-init.mjs` — tema oscuro/claro
  3. `js/boot/loader.mjs` — carga ISAFront + React/MUI desde CDN + `boot-eval-loader.mjs`
  4. `js/boot/isa-setup.ts` (compilado) — `bootstrapIsaPatyia()` registra app en ISAFront
  5. `js/main.jsx` — `mountApp()` → `<App />`

## Estructura

```
frontend/
├── index.html              # entry HTML; carga vendor/boot/main en orden
├── src/json/index.json     # meta (título, theme, badges, mergeHistory, libs) — convención activa
├── dist/                  # bundles esbuild generados (no commitear source)
├── vendor/
│   ├── front-shared/       # ISAFront + loader.mjs + base-href.js (vendored)
│   └── cdn/                # shims de CDN (iconify, etc.)
├── css/                    # theme + app + boot-loading + neon-glass-bridge + chat-staging + todos-staging + tree-accordion
├── js/
│   ├── main.jsx            # entry → mountApp()
│   ├── boot/               # loader + theme-init + cdn (no tocar salvo cambios loader)
│   ├── global.d.ts         # tipos window.ISA / ISAFront / ISAComponents
│   ├── app/App.jsx         # router 5 tools; URL state via urlState; auth events
│   ├── core/
│   │   ├── platform.ts     # PUENTE a window.ISAFront: UI, Session, Config, Toast, Assets, mdToHtml, getReact/getMaterialUI, CodeMirrorPanel, LightboxZoom
│   │   ├── patyia.ts       # URL bases (PATYIA_ISS_URL, PATYIA_ISS_LOCAL); isLocalMode(); readPatyiaSseStream()
│   │   ├── patyia-jwt.ts   # AppSession JWT (LS, expiry check)
│   │   ├── urlState.ts     # estado de app en ?s= (b64url JSON); migrateLegacyFlatQuery; persistX helpers
│   │   ├── theme.ts        # helpers tema
│   │   ├── promptVariables.ts, msgDateFormat.ts, fileSearchTrace.js, convLog.ts, lightboxBoot.ts
│   │   └── isa-setup.ts    # invocado por boot; llama bootstrapIsaPatyia()
│   ├── api/                # 1 archivo por dominio: apiClient (capFetch), patyiaChatApi, systemConfigApi, promptsSql, labApi, patyiaTokens, portalJwtApi, treeMsgsApi, sessionApi, todosApi, issListFilter
│   ├── tools/              # 5 tools (ver tabla) + helpers compartidos
│   ├── ui/                 # componentes MUI reusables: shared.jsx (MetaDialog, ButtonIconify), ConvLogThread, ConvLogWebView, ImageLightboxDialog, GlassDialog, PromptBodyEditor, bootShimmer, treeView/*
│   └── editors/jsonEditor.jsx
├── scripts/                # setup-cloudflare-pages.ps1, setup-github-secrets.ps1, qa-instrucciones.mjs, dev-local.ps1, paty_build.mjs, vendor_bundle_build.mjs
└── tsconfig.json           # target browser ES2020, strict
```

## 3 tools en nav primario (`js/app/App.jsx`)

| id | archivo | subdir | hook state | propósito |
|---|---|---|---|---|
| `chat` | `tools/ChatTool.jsx` | `tools/chat/` | `useChatTool` | Chat PatyIA + sub-tab Logs (`LogViewer`) |
| `todos` | `tools/TodosTool.jsx` | `tools/todos/` | `useTodosTool` | Kanban DevFlow (nav opcional `DEVFLOW_NAV_ENABLED`) |
| `config` | `tools/ConfigTool.jsx` | — | local | Sub-tabs: Prompts · Sistema · Permisos |

**Sub-nav Chat** (`CHAT_PANES`): `conv` → `ChatTool` · `logs` → `LogViewer`.  
**Sub-nav Config** (`CONFIG_PANES`, orden fijo): `prompts` → `PromptsSqlTool` · `sistema` → OpenAI/prompts operativos · `permisos` → `PermisosPanel`.

Legacy URL: `tool=prompts` → `config` + `pane=prompts`; `tool=log` → `chat` + `pane=logs` (`urlState.ts`).

Cada tool se monta en `App.jsx` con `key={homeTick}` (re-mount al volver al home brand).

> **Nav actual (jul 2026):** primario = Chat · Config (DevFlow oculto con `DEVFLOW_NAV_ENABLED`). Prompts y Logs ya **no** son tabs primarios — viven en sub-nav (`CHAT_PANES` / `CONFIG_PANES`). Ver § «UI polish 2026-07-17».

## Routing y estado

`?s=` (b64url JSON, base64url) codifica el estado completo de la app:
```json
{ "v": 1, "tool": "log", "log": {"convId": "...", "sidebarW": 400}, "prompts": {...}, "chat": {"convId": 1234, "mode": "patyia"}, "todos": {...}, "config": {...} }
```
- Límite ~12000 chars b64url → `slimForUrl` trunca `prompts.bodies` (>6000 chars) y `log.jsonInput` (>4000 chars).
- Migración automática desde URL plana `?tool=log&log.convId=…` → `?s=` en `migrateLegacyFlatQuery()` (`urlState.ts:126`).
- Helpers: `persistChatConvId`, `persistChatMode`, `persistLogMeta`, `persistLogSidebarWidth`, `persistPermisosHideEmpty`.
- Subscribe via `subscribe(callback)` en `App.jsx:42` para reaccionar a cambios.

## API cliente

`capFetch(path, opts)` en `js/api/apiClient.ts:35` — UN solo punto de entrada HTTP:
- local mode + path `isPatyiaApiPath` (`/patyia`, `/api/patyia`) → directo a `PATYIA_ISS_LOCAL` (sin orquestador)
- resto → `PATYIA_ISS_URL` (producción) o `ORCH_ONLINE` (orquestador)

Domain wrappers en `js/api/`:
- `patyiaChatApi.ts` — `getConversacionLogs`, `listConversaciones`, `convLogFromDetalle`
- `systemConfigApi.ts` — `fetchInstruccionesSystemConfig`, `putInstruccionUpsert`, `putInstruccionesPublish`
- `sessionApi.ts` — capabilities (instruccionesPublishCap, INSTRUCCIONES_WRITE_CAP)
- `apiClient.ts` — `capFetch`, `apiUrl`, `rowVal`
- `labApi.ts`, `patyiaTokens.ts`, `portalJwtApi.ts`, `treeMsgsApi.ts`, `todosApi.ts`, `promptsSql.ts`, `issListFilter.ts`

**Auth**: `Session.authHeader()` (JWT InSoft) + `appHeader()` (AppSession). Sin cabecera de gateway: las mutaciones van directo al ISS canónico.

## SSE chat

`readPatyiaSseStream(response, onEvent)` en `js/core/patyia.ts:160` parsea el stream SSE de `POST /api/conversacion`. Eventos: `begin`, `message`, `end`, `error`. El `end` payload contiene `meta.file_search` (chunks RAG), `meta.itdconsulta`, `meta.model`.

## Auth y capabilities

- Login vía `LoginButton` (ISAFront) → `window.ISA.Session.login()`
- `patchIsaPatyiaAuthEvents` (`platform.ts:181`) wrappea Session.login/logout para disparar evento custom `isa-patyia:auth`
- `Session.can(cap)`, `Session.capabilities()`, `Session.blockReason(cap)` para gates UI (ej. `instruccionesPublishCap`)
- View-as: `Session.viewAsUsername()`, `Session.setViewAs()`, `Session.clearViewAs()` — suplantación para QA

## PatyIA RAG (resumen)

5 vector stores OpenAI, 13 tipos consulta, 17 instrucciones activas. Front usa:
- `GET /api/system/openai` — config (max_num_results, modelos)
- Chat → `POST /api/conversacion` (SSE) — ver `C:\ContaPyme\PatyIA\ISS-AyudasCPIA\llm.md` para flujo RAG completo.

## Build local

```bash
# Bundles JS/JSX listados en scripts/paty_build.mjs (App, sessionApi, IssTargetSwitch, …)
cd "C:\ContaPyme\Personal\apps\isa-patyia\frontend"
node scripts/paty_build.mjs

# CSS / boot / módulos NO listados en paty_build: gen-front-dist (apps/src/scripts/front/)
# ¡Cuidado! gen-front-dist pisa App.js y rompe el bundle: correrlo SIEMPRE antes de paty_build,
# nunca después — ver § 23-jul-2026 y § 4-ago-2026

# Server estático local (front solo, sin backend)
npx serve .      # o: http-server -p 8766 .

# Backend canónico (otro repo)
cd "C:\ContaPyme\PatyIA\ISS-AyudasCPIA"
npm run start    # :8802
```

`scripts/paty_build.mjs` lista hardcoded `jobs[]`. Si añadís `.jsx`/`.ts`/`.tsx` en `src/js/` (los fuentes se movieron ahí), agregalo a `jobs[]` o no se compila para deploy.

**Invariantes (versionados en `tests/` desde el 4-ago-2026):**

```bash
node --test tests/invariants-2026-07-23-force-perms-and-dist.test.mjs
```

## Deploy

- `src/json/index.json` `mergeHistory` — agregar fila `{date, url:"https://HASH.isa-patyia-dev.pages.dev"}` antes de merge a `main`. Una fila por fecha (la más reciente).
- `dev` → Cloudflare Pages (`isa-patyia-dev.pages.dev`)
- `main` → GH Pages (`jeff-aporta.github.io/isa-patyia/`)
- Workflow: `Jeff-Aporta/isa-patyia/.github/workflows/deploy-front.yml`

## Caveats

- **NO tocar `vendor/`** salvo actualización vendorada de ISAFront. Cambios van upstream.
- **SÍ commitear** fuentes en `src/js/` **y** bundles en `dist/` tras el build de dos pasos. El CI **nunca** recompila: publica el `dist/` commiteado tal cual (ver § 4-ago-2026).
- **NO commitear** `components/` bajo `frontend/` (copias locales de swagger/lightbox para dev). **NO** subir credenciales ni `.env`.
- `scripts/paty_build.mjs` requiere rutas absolutas Windows (`C:\\ContaPyme\\Personal\\apps\\isa-patyia\\frontend`). No portable a WSL sin editar.
- `src/json/index.json` es la fuente de verdad del README + badges + theme. NO editar `README.md` directo — regenera via `gen-front-readme.mjs`.
- `?s=` tiene `maxB64Len: 12000` — si excedes, `slimForUrl` trunca silenciosamente. Para Prompts con bodies grandes, perderás contenido al recargar.
- `isLocalMode()` lee LS `patyia-apptools:iss-local` por compatibilidad pero está **deprecada**: el switch real es 3-way (`production`|`staging`|`local`) persistido en `patyia-apptools:iss-target`. Ver `IssTargetChip` en `js/components/IssTargetSwitch.jsx` y la sección "Switch target ISS-AyudasCPIA (2026-07)" más abajo.
- `chat-staging.css` y `todos-staging.css` se cargan lazy solo cuando la tool está activa (`App.jsx:48-51`). Si añades CSS scoped a una tool, sigue este patrón.
- `paty-public-scrum` es clase en `<html>` que activa modo público kanban (`TodosTool` con `boot.todos.publicSlug`). Una vez activada, fuerza `tool="todos"` y oculta nav.
- PatyIA chat: `mode: "patyia"` (default, RAG activo) vs `mode: "libre"` (sin RAG, jailbreak mode). Migración automática `jailbreak: true` → `mode: "libre"` en `urlState.ts:27`.
- ConvLog logs son fuente primaria de verdad para el chat — `patyiaChatApi.convLogFromDetalle` los parsea desde `GET /api/conversacion/{id}` con `meta.file_search` populated.
- Tests: carpeta local `tests/` (**gitignore**). Correr: `node --test tests/*.test.mjs` desde `frontend/`. No se suben a Git; mitigan regresiones de invariantes (ver § UI polish 2026-07-17).

## Próximas considerations

- Si reaparece backend productivo: NO va aquí — va en `PatyIA/ISS-AyudasCPIA/`. Mantener `backend/` deprecado o eliminar.
- Si refactorizas una tool a hooks más limpios: sigue el patrón `useXxxTool.ts` (ver `tools/promptsSql/usePromptsSqlTool.ts`, `tools/chat/useChatTool.ts`).
- Si añades nueva tool: (1) entry en `ALL_TOOLS` `App.jsx:14`, (2) `tools/<Name>Tool.jsx`, (3) branch en `App.jsx:122-136`, (4) si requiere CSS scoped, sigue patrón `chat-staging.css` + `Assets.ensureXxxCss`.
- Si cambias permisos UI: revisa `js/tools/permisosForm.js`, `permisosKanbanShared.js`, `roleHierarchyTree/`. El modelo backend está en `PatyIA/ISS-AyudasCPIA/src/auth/`.
- Si necesitas JWT de staging para QA: `dev-token.json` en `PatyIA/ISS-AyudasCPIA/dev-token.json`.

---

## Sesión jul 2026 — Capabilities de ISS integradas en gates UI legacy

### Problema
La UI verificaba capacidades abstractas con `Session.can("patyia.instrucciones.publish")` (y similares), pero el catálogo legacy de ISAFront no incluye todas las capabilities del nuevo sistema `GET /api/permissions/me` de ISS. Resultado: acciones que el backend autorizaba aparecían deshabilitadas en la UI para roles como `dev_lead`.

### Solución aplicada (`js/api/sessionApi.ts`)
Cache `ME_CAPS` desde `GET /api/permissions/me` → `capsFromPermisosEfectivos` (mapa SEG). **No** usar `Session.can()` para gates de config (salvo chat/jwt).

- **`canEdit*()`**: `ME_CAPS` **OR** hint GET system **OR** puente Dev ISS si ME no hidrató.
- Paneles config: `canEdit = cfg.canEdit || SessionApi.canEditXxx()`.
- «Ver como rol»: solo ME clampado.

### Prod vs staging (22-jul-2026) — ME v2 vs v5 + bypass UI

| Slot | `/api/permissions/me` | Front |
|------|----------------------|-------|
| **Staging** | v5 + SEG real (`permsOpen` false en BD) | mapa `permisosEfectivos` (wildcards) |
| **Prod** | **v2** / ISS aún no alineado | `forcePermsOpen()` → true (UI abierta, solo front) |

**NO** usar `Session.blockReason("patyia.instrucciones.publish")` para gates/title de prompts (legacy `denyForbidden` aunque ME diga `canEditInstrucciones: true`).

### forcePermsOpen / prod — NO DESACTIVAR hasta orden explícita

> **Estado vigente (23-jul-2026):** con chip **Producción**, el front actúa como `permsOpen: true` **solo en UI** (`js/api/sessionApi.ts` → `forcePermsOpen()` = `getIssTarget() === "production"`). Staging/local = SEG real. El ISS de prod **no** debe “arreglarse” quitando este bypass desde el front.

**Regla fija:** no cambiar, acotar ni apagar `forcePermsOpen` hasta que alguien indique **explícitamente**:
1. que **producción ISS ya está actualizada** (mismo modelo de permisos que staging), **y**
2. que se **desactive** el bypass de UI en prod.

Hasta entonces: dejarlo. «Ver como rol» sigue clampando. `dev_lead` no abre view-as (solo puente edición si ME no hidrató).

- **`canSwitchTarget()`**: sin cambio (la capability `infra.target.switch` sí está en legacy y corresponde).

**Nuevas funciones exportadas**:
- `bootMeCaps()` — hidrata el cache con `fetchPermissionsMe({force: true})` desde ISS. Idempotente (no-op si ya está hidratado o si no hay sesión).
- `login()` ahora invoca `bootMeCaps(true)` tras autenticar.
- `logout()` invoca `clearMeCaps()` para limpiar el cache.

### Wiring en `js/app/App.jsx`
- Se importa `* as SessionApi` desde `../api/sessionApi.ts`.
- El `useEffect` que escucha `Session.EVENT` e `isa-patyia:auth` ahora también invoca `void SessionApi.bootMeCaps()` en cada cambio y una vez al montar si ya hay sesión.

### Beneficio arquitectónico
La UI ya no depende de la actualización manual del catálogo legacy cuando el backend agrega nuevas capabilities. Cualquier capacidad nueva se descubre via `/permissions/me` y se cachea por TTL del servidor. El cambio se replicará al resto de fronts (jagudeloe, flsjeff, main-orchestrator) si también usan estas funciones de `sessionApi.ts`.

### NO confundir con catálogo legacy
- El catálogo ISAFront legacy sigue siendo la **primera** opción (más rápido, sin red).
- Solo si retorna `false`, se hace fallback a `/permissions/me`.
- Este patrón preserva la retrocompatibilidad: roles con capabilities legacy siguen funcionando idéntico.

### Pendiente
- Misma lógica podría aplicarse a `langlab.guardar` y `patyia.scrum` si aparecen gaps similares. Por ahora no se hizo porque no se reportaron síntomas.
- El sub-agente QA de la sesión pasada ejecutó un PUT accidental con body parcial que destruyó el JPERMISOS de `dev_lead`. Esa root cause está mitigada en backend (`applyPermisosFieldPatch` ahora mergea profundo en modo "all"). En front, este cambio de `sessionApi.ts` es independiente a ese incidente.

### Archivos modificados
- `js/api/sessionApi.ts` — añadidos `ME_CAPS`, `primeMeCaps`, `clearMeCaps`, `bootMeCaps`, `canEditOpenAiConfig`, `canEditPromptsOperativos`, `canEditConversacionConfig`, `canEditSwagger`, `canOverrideSampling`. Modificados `login`, `logout`, `canEditInstrucciones`.
- `js/app/App.jsx` — añadido import + invocación de `bootMeCaps` en el listener de auth.

### Relación con `c:\ContaPyme\PatyIA\ISS-AyudasCPIA\llm.md`
La sección "Sesión jul 2026 — Modelo simple de permisos para `dev_lead`" del `llm.md` del backend explica el contexto completo (por qué se quitó `*`, `manage_*`, `impersonate` y se optó por permisos HTTP-first). El presente cambio en front es el complemento necesario para que la UI no muestre controles deshabilitados cuando el JSON del rol ya autoriza.

---

## Sesión jul 2026 — Permisos, jerarquía de roles, envelope ISS y merge a main

> **Commits ref. (rama `dev`, merge `main` `e1cd9a0`):** `b92ffc6` permisos kanban/terceros · `1cc3a13` fix modal jerarquía · `e1cd9a0` mergeHistory Cloudflare `8ce645b1`.

### Índice rápido

| Síntoma | Causa | Fix principal |
|---------|-------|---------------|
| Diálogo terceros «Sin resultados» con datos en ISS | Cliente leía `body`, ISS devuelve `respuesta` | `unwrapIssEnvelope()` en `apiClient.ts` |
| Kanban «No hay roles configurados» | BD usa `ientity`, front solo `iusuario` | `normalizePermEntry()` en `systemConfigApi.ts` |
| Modal jerarquía: árbol vacío «Sin roles» | `GET /system/permisos/hierarchy` → `roles: []` en local | Seed inmediato desde `data.roles` + fallback |
| Modal jerarquía: página congelada / loop | `useEffect` + objeto `currentRoleEntry` nuevo cada render; `<details>` nativo en readonly | Firmas JSON, `key` en editor, control toggle TreeView |
| ISS tests antes de commit | Gate obligatorio en `src/health/` | `npm run build` + `runAllHealthTests` (ver ISS `llm.md`) |

### 1. Envelope HTTP del ISS (obligatorio en todos los clientes)

El ISS responde con forma canónica:

```json
{ "encabezado": { "resultado": true, ... }, "respuesta": { ... } }
```

Algunos endpoints legacy anidan también `body` dentro de `respuesta`.

**Sí hacer:**
- En `systemConfigApi.ts`: `unwrapBody()` / `jsonFetch` que priorice `respuesta`, luego `body`.
- En `apiClient.ts`: helper `unwrapIssEnvelope()` para `capFetch` cuando el consumidor espera el payload interior (ej. auditoría terceros: `respuesta.rows`).

**No hacer:**
- Asumir `raw.body` como única fuente — en staging/local el dato útil está en `respuesta`.
- Parsear una sola vez en un sitio y olvidar replicar el patrón en wrappers nuevos (`fetchHierarchy`, `fetchPermisos`, chat, etc.).

**Archivos:** `js/api/apiClient.ts`, `js/api/systemConfigApi.ts`.

### 2. Permisos kanban — campo `ientity` vs `iusuario`

En `SYS_USR_PERMISSIONS` el identificador canónico del rol/usuario en filas de tipo `role` es **`ientity`** (no siempre viene `iusuario`).

**Sí hacer:**
- `permEntityKey(entry)` → `entry.ientity ?? entry.iusuario`.
- `normalizePermEntry()` al recibir `GET /api/system/permisos`.
- `roleNameFromEntry()` / `permEntryKey()` en `permisosKanbanShared.js` ya delegan en esa clave.
- `permEntryKey()` en kanban para columnas: `iusuario ?? ientity` donde aplique.

**No hacer:**
- Leer solo `r.iusuario` al armar columnas del kanban — columnas quedan vacías aunque ISS devuelva 7 roles.
- Mostrar solo «Ocultar vacíos» como culpable sin verificar que `buildPermisosBoard` recibió roles normalizados.

**Archivos:** `js/api/systemConfigApi.ts`, `js/tools/permisosKanbanShared.js`, `js/tools/PermisosKanban.jsx`.

### 3. Diálogo «Filtrar por usuario» (terceros audit)

**Síntoma:** `QUERY /api/auditoria/terceros` OK (ej. 75 filas) pero UI «Sin resultados».

**Causa:** `fetchTercerosAudit` en `apiClient.ts` hacía `raw.body` en lugar de desenvolver `respuesta`.

**Sí hacer:** Tras fix envelope, validar con ISS local `:8802` y switch Local en UI.

**Archivo:** `js/tools/chat/TercerosAuditDialog.jsx` consume API ya corregida.

### 4. Modal «Jerarquía y rol visitante» — árbol vacío

**Síntoma:** Al abrir el modal, texto «Sin roles» aunque el tablero kanban muestra columnas.

**Causa:** `fetchHierarchy()` → `GET /api/system/permisos/hierarchy` devuelve `{ roles: [], count: 0 }` en local (endpoint existe pero sin filas materializadas). El front solo pintaba el resultado async y **no** hacía fallback a tiempo.

**Sí hacer (flujo en `PermisosPanel.jsx`):**
1. Al abrir (`openHierarchyDialog` / `openHierarchyForRole`): **inmediatamente** `setHierarchyNodes(hierarchyNodesFromRoleEntries(rolesRef.current))`.
2. Luego `loadHierarchy(roles)` en `useEffect` cuando `hierarchyOpen && data.roles.length`.
3. En `loadHierarchy`: si el GET viene vacío, fallback `hierarchyNodesFromRoleEntries(fallbackRoles)`; **solo** `setHierarchyNodes` si hay nodos (no pisar seed con `[]`).
4. Reset `hierarchyLoadRef` al abrir para no quedar colgado en promesa anterior.

**No hacer:**
- Confiar solo en `GET .../hierarchy` sin fallback desde `GET .../permisos` (roles con `permisos.jerarquia` o defaults en `roleHierarchy.js`).
- Llamar `setHierarchyNodes([])` cuando el GET remoto falla pero ya hay nodos del seed.
- Abrir el modal antes de que `fetchPermisos` haya cargado sin re-ejecutar load al llegar `data.roles` (dependencia `data.roles` en el `useEffect`).

**Archivos:** `js/tools/PermisosPanel.jsx`, `js/tools/roleHierarchyTree/hierarchyFromRoles.ts`, `js/tools/roleHierarchy.js`.

### 5. Modal jerarquía — congelamiento / loop de React

**Síntomas:** Al abrir el modal o al seleccionar un rol (visitante u otro), la pestaña deja de responder.

**Causas (combinadas):**

1. **`RoleHierarchyView.tsx` — dependencia inestable:** `currentRoleEntry` en `useMemo` devolvía `{ iusuario, permisos: EMPTY_PERMISOS, bactivo: true }` **nuevo objeto** cada render si no había match → `useEffect` de `roleDraft` disparaba `setRoleDraft` en bucle.

2. **`RoleConfigEditor`:** `entry` cambiaba identidad cada render aunque los permisos fueran iguales → resets internos de rutas/flags.

3. **`TreeRowItem.tsx` — `<details>` nativo:** En `readonly` (`canMutate=false`), el toggle nativo del `<details>` competía con estado React (`collapsed` / `onToggleCollapse`) → reflow infinito o UI bloqueada al expandir carpetas.

**Sí hacer:**
- Derivar firmas estables: `visitantePermisosSig` / `rolePermisosSig` = `JSON.stringify(permisos)`; deps del `useEffect` de drafts **solo** firmas + `selectedJer`, no el objeto `currentRoleEntry`.
- Al setear draft: `setRoleDraft(prev => JSON igual ? prev : next)`.
- `key={\`visitante-${visitantePermisosSig}\`}` y `key={\`${role}-${rolePermisosSig}\`}` en `RoleConfigEditor` para remount limpio al cambiar rol.
- En `TreeRowItem.handleSummaryClick`: si `!canMutate || collapse disabled` → `preventDefault` y fijar `detailsRef.current.open = isOpen` (no dejar al navegador togglear).
- Un solo `useEffect` unificado para visitante vs rol normal según `selectedJer`.

**No hacer:**
- Poner `currentRoleEntry` (objeto) en array de dependencias de `useEffect` que hace `setState`.
- Pasar `visitanteEntry` crudo al editor sin draft cuando hay `onChange` que re-alimenta el padre.
- Asumir que «solo visitante» congela — cualquier rol dispara el mismo ciclo si el entry es inestable.
- Ignorar el árbol en readonly: usuarios sin branch `0` igual abren el modal para **ver** jerarquía.

**Archivos:** `js/tools/roleHierarchyTree/RoleHierarchyView.tsx`, `js/ui/treeView/TreeRowItem.tsx`, `js/tools/permisosRoleConfig.jsx`.

### 6. Build y verificación local

```bash
cd "C:\ContaPyme\Personal\apps\isa-patyia\frontend"
node paty_build.mjs

# ISS local (otro repo)
cd "C:\ContaPyme\PatyIA\ISS-AyudasCPIA"
npm run build
# Gate tests (obligatorio antes de commit ISS):
node --input-type=module -e "import('./dist/src/health/_register.js'); ..."
```

**URL de prueba permisos:** `?s=` con `tool:"config"` y tab Permisos — ejemplo base en `urlState.ts`.

**Checks manuales:**
1. Config → Permisos → kanban con columnas visibles.
2. Botón árbol → modal con N roles (no «Sin roles»).
3. Clic en «Visitante» → editor carga sin congelar.
4. Chat → filtro terceros → lista contactos.

### 7. Merge `dev` → `main` (skill `isa-patyia-merge-readme`)

**Sí hacer (orden):**
1. Deploy `dev` validado en Cloudflare.
2. Obtener URL hash: `gh api repos/Jeff-Aporta/isa-patyia/deployments?sha=$(git rev-parse dev)` → `environment_url` de `isa-patyia-dev (Production)`.
3. Añadir `{ date, url }` **al inicio** de `readme.mergeHistory` en `src/json/index.json`.
4. `node Personal/apps/src/scripts/front/gen-front-readme.mjs --slug isa-patyia`.
5. Commit en `dev` (fix + fila mergeHistory).
6. `git push origin dev` → `git checkout main` → `git merge dev` → `git push origin main`.
7. **`git checkout dev`** — dejar la rama de trabajo en `dev` (no quedarse en `main`).

**No hacer:**
- Merge a `main` sin fila en `mergeHistory`.
- Usar solo alias `isa-patyia-dev.pages.dev` sin hash en la tabla.
- Editar `README.md` a mano sin regenerar desde `index.json`.
- Olvidar actualizar puntero del submódulo en `Personal/apps` si el monorepo debe reflejar el SHA nuevo.

**Último merge (jul 2026):** preview `https://8ce645b1.isa-patyia-dev.pages.dev` → producción GH Pages tras push `main`.

### 8. Relación con ISS-AyudasCPIA

| Tema ISS | Doc backend | Consumo front |
|----------|-------------|---------------|
| Permisos / `ientity` | `llm.md` § Permisos y jerarquía | `systemConfigApi`, kanban |
| `GET /system/permisos/hierarchy` vacío | Endpoint existe; datos pueden derivarse de permisos | fallback `hierarchyFromRoles.ts` |
| Test concat `{{instruccion_tipo}}` | `instruccion-tipo-concat-bd.test.ts` | N/A (backend) |
| Gate `runAllHealthTests` | Obligatorio antes de commit ISS | No aplica al front |

### 9. Anti-patrones resumidos (NO repetir)

| # | No hacer | Por qué |
|---|----------|---------|
| 1 | Confiar solo en `GET .../hierarchy` | Suele venir `[]` en local; kanban sí tiene roles |
| 2 | `useEffect(..., [currentRoleEntry])` con objeto recreado | Loop infinito → congelamiento |
| 3 | `<details>` sin control en readonly | Toggle nativo vs React |
| 4 | Parsear solo `body` del ISS | Datos en `respuesta` |
| 5 | Ignorar `ientity` en permisos | Columnas kanban vacías |
| 6 | Commit ISS con `failed > 0` en health tests | Gate bloquea (ver ISS `llm.md`) |
| 7 | Merge `main` sin `mergeHistory` | Rompe trazabilidad deploy |
| 8 | `git add -A` en frontend sin revisar | Arrastra `components/`, backups locales |
| 9 | SQL embebido en `node -e` desde PowerShell | Escaping rompe queries (`LEN`, comillas) — usar `.mjs` |
| 10 | Probar modal sin `paty_build` tras editar `.tsx` | Live server sirve `dist/` viejo |
| 11 | Usar `PATYIA_ISS_LOCAL_API` sin importarlo en `apiClient.ts` | Modo local: auditoría terceros crash `PATYIA_ISS_LOCAL_API is not defined` |
| 12 | Confiar solo en `Session.can("patyia.chat.audit")` para auditoría | ISS expone `canAccessOthers` en `/permissions/me` — usar `sessionApi.canAccessOthers()` |
| 13 | Mostrar rol desde `Session.current().role` (system-login) | Fuente canónica: `resolveDisplayRole()` ← `ME_ISS_ROLES` de `/api/permissions/me` |
| 14 | `canPublish` solo con `canEditInstrucciones` si el rol tiene `prompts-operativos` | Or: `canEditInstrucciones \|\| canEditPromptsOperativos` |
| 15 | Parchear permisos solo al usuario Viviana | Siempre rol ITIPO=R `admn_isapatyia` (ver ISS `llm.md` migración 016) |

### 10. Checklist «lo que sí hay que hacer»

- [ ] Tras cambiar `js/`: `node scripts/paty_build.mjs` y commitear `dist/` correspondiente.
- [ ] Clientes ISS: desenvolver `respuesta` (y `body` legacy).
- [ ] Normalizar permisos con `ientity`/`iusuario`.
- [ ] Jerarquía: seed local + fetch remoto con fallback.
- [ ] Drafts del editor de rol: firmas JSON + `key` en `RoleConfigEditor`.
- [ ] TreeView readonly: bloquear toggle nativo de `<details>`.
- [ ] Antes de merge main: `mergeHistory` + `gen-front-readme.mjs`.
- [ ] Terminar en rama `dev` si el flujo de trabajo es AppTools staging.
- [ ] ISS: build + health tests verdes antes de commit (repo separado).
- [ ] Rol Admn ISA-Paty: verificar `admn-isapatyia-role-contract` en ISS tests; migración 016 aplicada en BD.

---

## Sesión jul 2026 — Rol Admn ISA-Paty (`admn_isapatyia`) · Viviana / VRESTREPO

> **Backend:** `ISS-AyudasCPIA/llm.md` (sección homónima al final) · migración `016-admn-isapatyia-instrucciones.sql`  
> **Test regresión ISS:** `admn-isapatyia-role-contract` (incluye check de import `PATYIA_ISS_LOCAL_API` en este repo)

### Síntomas reportados

| UI | Lo que se veía | Causa |
|----|----------------|-------|
| Menú usuario | «Rol: **Visitante**» con Viviana Restrepo | `/api/permissions/me` no hidrató `ME_ISS_ROLES` → fallback `Session.current().role` |
| Tool Prompts | Solo lectura, no guarda | Rol sin `PUT:/api/system/instrucciones` → `canEditInstrucciones: false` |
| Chat → Filtrar por usuario | Alerta `PATYIA_ISS_LOCAL_API is not defined` + Sin resultados | Bug import en `apiClient.ts`; fallback local nunca ejecutó |

### Modelo correcto (no reinventar)

- Usuario `VRESTREPO` → `roles: ["admn_isapatyia"]` en BD (ITIPO=U).
- Rol `admn_isapatyia` jerarquía **`0.1.0.0`** — **hereda auditador** (`0.1.0`) → auditoría global de terceros.
- Edición prompts: permisos en el **rol**, no en el usuario.

### Qué SÍ hacer en front

| Área | Regla |
|------|-------|
| Rol en header | `resolveDisplayRole()` — esperar `bootMeCaps()` / evento `patyia-apptools:caps-changed` |
| Editar prompts | `canEditInstrucciones()` **o** `canEditPromptsOperativos()` (`usePromptsSqlTool`) |
| Auditoría chat | `canAccessOthers()` desde `sessionApi` (OR legacy `patyia.chat.audit`) |
| Cache permissions/me | `Session.current()?.token` como session key (`systemConfigApi.ts`) |
| Modo local auditoría | Importar `PATYIA_ISS_LOCAL_API` desde `core/patyia.ts` en `apiClient.ts` |
| Tras editar `js/` | `node scripts/paty_build.mjs` |

### Qué NO hacer

- **NO** asumir que «Visitante» en header implica rol mal en BD — puede ser caps sin cargar.
- **NO** usar solo `Session.can(INSTRUCCIONES_WRITE_CAP)` — el catálogo legacy no tiene todas las caps ISS.
- **NO** parchear Viviana en código — el fix es migración 016 + contrato de rol.
- **NO** usar `Session.currentSession()` — no existe en `platform.ts`; rompe cache de permissions/me.

### Archivos tocados (referencia jul 2026)

- `js/api/apiClient.ts` — import `PATYIA_ISS_LOCAL_API`
- `js/api/sessionApi.ts` — `patyChatAuditCap()` usa `canAccessOthers()`
- `js/api/systemConfigApi.ts` — cache key `Session.current()?.token`
- `js/tools/chat/useChatTool.ts` — `canAuditChat` desde `canAccessOthers`
- `js/tools/promptsSql/usePromptsSqlTool.ts` — `canPublish` OR instrucciones + prompts-operativos

### Verificación manual

1. Login como usuario con `admn_isapatyia` (ej. VRESTREPO).
2. Header → **Admn ISA-Paty**.
3. Prompts → guardar habilitado.
4. Chat → «Filtrar por usuario» → lista de terceros sin error de bridge.
5. ISS: `GET /api/permissions/me` → `roles: ["admn_isapatyia"]`, `canAccessOthers: true`, `canEditInstrucciones: true`.

### Fix jul 2026 — prompts solo lectura pese a rol correcto en BD

**Síntoma:** tooltip «No tienes permiso para publicar instrucciones PatyIA» (cap legacy `denyForbidden`).

**Causa:** `canPublish` solo leía `ME_CAPS` de `/api/permissions/me`. Si ese fetch no hidrataba (token vacío al primer intento, cache key desalineado, o ISS sin respuesta), `canEdit` quedaba `false` aunque `GET /system/instrucciones` devolvía `canEdit: true`.

**Fix (patrón ConfigTool):**
- `fetchInstruccionesPaty()` propaga `canEdit` del ISS → `setServerInstruccionesCanEdit()`.
- `canEditInstrucciones()` = `ME_CAPS` **OR** hint del GET instrucciones.
- `usePromptsSqlTool`: estado `instruccionesCanEdit` al cargar filas + `bootMeCaps(true)` en auth.
- Cache key de sesión: `token || username` (no solo token).

**NO hacer:** confiar solo en `Session.can("patyia.instrucciones.publish")` ni en `blockReason` de esa cap para habilitar edición.

---

## Sesión jul 2026 (15-jul) — Vendor local, adjuntos firmados y limpieza de submódulos fantasma

> **Rama:** `dev` (5 commits previos al merge) → **PR #1** abierto `dev → main`.  
> **Commits:** `ea1124f` feat vendor+adjuntos fuente · `433b1a5` bundle regen · `5871848` vendor/cdn · `339ef36` adjuntosApi · `dc2d9a8` limpieza components/ · `983cfdc` mergeHistory.

### 1. `cdnVendor: true` y `vendor/cdn/` (vendor pack local)

El front pasa a resolver React/MUI/Emotion/Babel/Iconify desde rutas internas en lugar de CDNs públicos. Beneficios: operación en redes restringidas y eliminación de latencia intercontinental.

**Sí hacer:**
- Mantener `"cdnVendor": true` y `"frontSharedVendor": true` en `src/json/index.json`.
- Tras cualquier cambio en vendor pack: **regenerar** con `node front/gen-front-vendor.mjs --slug isa-patyia` desde `apps/src/scripts`.
- Regenerar `dist/` después con `node front/gen-front-dist.mjs --slug isa-patyia`.
- `"preconnect": []` (sin CDNs externos que pre-cargar).
- Verificar `vendor/cdn/meta.json` para conocer el hash y la versión exacta de cada dependencia.

**No hacer:**
- Volver a usar `<script src="https://esm.sh/...">` o `<link rel="preconnect" href="https://cdn.jsdelivr.net">`. Los CDNs externos rompen el modo offline.
- Regenerar `dist/` sin antes regenerar vendor si se actualizó alguna dependencia compartida.
- Ignorar la advertencia `Siguiente: node gen-front-index.mjs (requiere useDist:true en index.json)` del script.

### 2. Cliente `js/api/adjuntosApi.ts` — URLs firmadas en R2

Se retira el helper legacy de base64 inline y se introduce un cliente dedicado que firma URLs de subida contra el backend (`POST /api/adjuntos/imagenes`, `POST /api/adjuntos/audios`).

**Sí hacer:**
- Consumir `adjuntosApi.subirImagen(file)` y `subirAudio(file)` desde los composers de chat (audio/images).
- Validar que el `Content-Type` del archivo coincida con el declarado al firmar.
- Manejar errores con `toastError` (ISAFront feedback) y un fallback a mensaje legible al usuario.

**No hacer:**
- Volver a `ensureBase64DataUrl(src)` para audio/imagen — deprecated.
- Construir manualmente el fetch contra `/api/adjuntos/...` desde los componentes: siempre pasar por `adjuntosApi.ts`.
- Subir data URLs base64 a `/conversacion` — el backend rechaza y/o no los almacena.

### 3. Bundle `dist/` — regenerar y commitear

El CI usa `dist/` precompilado. Si editaste un `.ts/.tsx/.jsx`, **siempre** regenerar y commitear el bundle junto con la fuente.

**Sí hacer:**
```bash
cd "C:\ContaPyme\Personal\apps\src\scripts"
node front/gen-front-dist.mjs --slug isa-patyia
```
- Commitear **siempre** los cambios de `dist/` que correspondan al `js/` editado.
- Confirmar `dist/build-meta.json` (hash cambia) — un SHA nuevo sin cambios en `dist/` es síntoma de drift.

**No hacer:**
- Confiar en que el CI recompile desde fuente: para `isa-patyia`, **no lo hace** en todos los flujos.
- Hacer commit de `js/` sin su `dist/`: deploy queda con bundle viejo.
- Mezclar vendor pack y bundle en el mismo commit: preferible **un commit de vendor**, **otro de bundle** para revertir selectivamente.

### 4. `components/` — submódulos fantasma (NO versionar localmente)

`Personal/apps/isa-patyia/frontend/components/` apareció con 5400 archivos (copia local de los submódulos Jeff-Aporta `front-shared`, `jagudeloe-react-ui`, `lightbox`, `swagger`). Eran **submódulos del monorepo `apps/`**, NO de este repo. Si se commitean como archivos normales, git no los trata como submódulos y se duplica el código.

**Sí hacer:**
- Si reaparecen: `rm -rf components/` y commitear un chore: "Se retira la copia local de componentes".
- Mantener `.gitignore` con `components/`.
- Documentar en `COMPONENTS.md` el origen canónico (`Personal/apps/components/`).
- Sincronizar versiones con `sync:all-versions` desde la raíz del monorepo.

**No hacer:**
- Commitear `components/` con `git add -A` "porque ya estaban ahí". 5400 archivos contaminan el diff y rompen el flujo de revisión.
- Crear submódulos dentro de un repo que ya forma parte de otro monorepo con submódulos — la clonación se vuelve ambigua.
- Asumir que `cd components/... && git status` indica el repo del submodule: aquí indicaba el repo del monorepo, **no** este repo.

### 5. PR `dev → main` con `isa-patyia-merge-readme`

Workflow obligatorio: **antes** de abrir el PR, actualizar `mergeHistory`.

**Sí hacer (orden exacto):**
1. `git push origin dev` (los deploys de Cloudflare se disparan en push).
2. Esperar a que el run de GH Actions finalice (`gh run list --branch dev --limit 5`).
3. Obtener el deployment ID: `gh api repos/Jeff-Aporta/isa-patyia/deployments` y filtrar `environment == "isa-patyia-dev (Production)"`.
4. Obtener URL preview: `gh api repos/Jeff-Aporta/isa-patyia/deployments/{id}/statuses` → `environment_url` (formato `https://HASH.isa-patyia-dev.pages.dev`, no el alias).
5. Añadir `{ date, url }` **al inicio** del array `readme.mergeHistory` en `src/json/index.json`.
6. Regenerar README: `node front/gen-front-readme.mjs --slug isa-patyia` desde `apps/src/scripts`.
7. Commit en `dev` (un commit separado, no junto al feature).
8. `git push origin dev` (re-push para que el CI tome la fila).
9. `gh pr create --base main --head dev --title "..." --body "..."` con el preview en el body.
10. **Al mergear:** dejar la rama activa en `dev` (no quedarse en `main`).

**No hacer:**
- Omitir la fila "porque el merge ya está hecho". El README queda desincronizado del último release.
- Usar el alias `https://isa-patyia-dev.pages.dev` sin hash en la tabla.
- Editar `README.md` a mano — siempre `gen-front-readme.mjs`.
- Crear el PR sin antes regenerar el bundle (el preview mostrará código viejo).
- Mergear con CI rojo en `dev` (la URL preview puede ser stale).

### 6. `tests/` local — regresiones automatizadas sin contaminar el repo

Carpeta `tests/` ignorada por git. Alberga `.test.mjs` ejecutables con `node --test` para validar patrones críticos (envelope ISS, gitignore, mergeHistory, vendor pack, etc.).

**Sí hacer:**
- Crear tests que fallen loud si alguien revierte un fix conocido (e.g. `mergeHistory` sin entry, vendor sin `cdnVendor:true`).
- Usar `node --test tests/*.test.mjs` desde `frontend/` o desde la raíz.
- Documentar cada test con su motivación (qué error previene).
- Mover a `src/health/` en `ISS-AyudasCPIA/` solo si debe ejecutarse en CI; el resto queda local.

**No hacer:**
- Commitear `tests/` aunque los archivos parezcan útiles — `.gitignore` está por diseño.
- Confiar solo en tests automatizados para regresiones de UI: el ojo humano sigue siendo necesario en Cloudflare preview.
- Tests con dependencias externas (red, BD): frágiles en este checkout; usar fixtures inline.

### 7. Resumen de archivos clave para esta sesión

| Archivo | Cambio | Notas |
|---------|--------|-------|
| `src/json/index.json` | `cdnVendor:true`, `preconnect:[]` | Sin CDN externos |
| `index.html` | Ajustado a vendor local | Regenerado por `gen-front-index.mjs` |
| `js/api/adjuntosApi.ts` | Nuevo cliente | Sustituye base64 inline |
| `js/api/patyiaChatApi.ts` | Refactor a URLs firmadas | Quita `ensureBase64DataUrl` |
| `js/app/App.jsx`, `js/core/patyia.ts`, `js/core/platform.ts` | Wiring del nuevo cliente | |
| `js/tools/chat/{ChatComposer,ChatLoggedOutShell,audio,images,types,useChatTool}.{tsx,ts}` | Composers ajustados | |
| `js/tools/ChatTool.jsx`, `js/tools/todos/TodosShellParts.jsx`, `js/ui/ConvLogWebView.jsx` | Ajustes de routing/UI | |
| `css/chat-staging.css` | Estilos del nuevo flujo | |
| `dist/**` | Regenerado contra nueva config | 40.000+ líneas diff |
| `vendor/cdn/*.{js,min.js,meta.json}` | Pack vendor local | 10 archivos, ~4MB |
| `COMPONENTS.md` | Nuevo, doc de origen monorepo | |
| `.gitignore` | `components/` y `tests/` ignorados | |

### 8. Anti-patrones ampliados (NO repetir)

| # | Anti-patrón | Por qué | Cómo detectarlo |
|---|-------------|---------|-----------------|
| 16 | `git add -A` sin revisar | Arrastra `components/` (5400 archivos) | `git status --short \| wc -l` antes de stage |
| 17 | Regenerar `dist/` sin `cdnVendor:true` | Vendor global vuelve a CDNs | Buscar `https://esm.sh` en `dist/index.html` |
| 18 | Mezclar `vendor/cdn/` y `dist/` en un commit | Difícil de revertir selectivamente | `git diff --stat HEAD~1 HEAD` por grupo |
| 19 | Push a `dev` y abrir PR sin esperar CI | URL preview stale | `gh run list --branch dev --limit 1` |
| 20 | Asumir que `components/` es "parte del repo" | Son submódulos del monorepo `apps/` | `ls components/*/.git` debe existir en `apps/` no aquí |
| 21 | Hardcodear URLs externas en código | Rompe modo offline | `rg "https://(esm\.sh\|cdn\.jsdelivr)" js/` debe dar 0 |
| 22 | Editar `README.md` a mano | Driftea de `src/json/index.json` | Diff `README.md` vs `node gen-front-readme.mjs` |
| 23 | `git add vendor/cdn/*.js` sin commitear `meta.json` | Rompe versionado del pack | Stage siempre `vendor/cdn/` completo |

### 9. Checklist actualizado «lo que sí hay que hacer»

- [ ] Tras editar `js/`: `gen:front-dist --slug isa-patyia` y commitear `dist/`.
- [ ] Si cambias vendor pack: `gen:front-vendor` **y luego** `gen:front-dist`.
- [ ] `cdnVendor:true` y `preconnect:[]` siempre en `src/json/index.json`.
- [ ] `components/` ignorado. Si reaparece, `rm -rf` + chore commit.
- [ ] Antes de PR: añadir fila a `mergeHistory` + regenerar README + re-push `dev`.
- [ ] PR con URL preview (`https://HASH.isa-patyia-dev.pages.dev`) en el body.
- [ ] Mergear y dejar rama activa en `dev`.
- [ ] Adjuntos: pasar por `adjuntosApi.ts`, nunca base64 inline.
- [ ] `tests/` vive solo en checkout local; ignorar en `.gitignore`.

---

## Switch target ISS-AyudasCPIA (2026-07)

3 estados: `production` | `staging` | `local`. Persistido en LS `patyia-apptools:iss-target` (antes `patyia-apptools:iss-local`).

| Estado | URL | Cuándo |
|---|---|---|
| `production` | `https://ayudascp-ia.azurewebsites.net` | slot de producción (nuevo) |
| `staging` | `https://ayudascp-ia-staging.azurewebsites.net` | canónico de testing |
| `local` | `http://127.0.0.1:8802` | ISS-AyudasCPIA local con `npm run start:host` |

**UX:**
- En `localhost`/`127.0.0.1`: chip "ISS target" muestra 3 opciones (Local / Staging / Producción).
- En web (`*.pages.dev`, `jeff-aporta.github.io`): chip muestra 2 opciones (Staging / Producción). Local NO se ofrece (no tendría sentido apuntar a ISS local desde web).
- Cambio de target → `location.reload()` para que `capFetch` + `Config.base` relean la base.
- Default: web → `staging`, dev → `local`.

**Componentes (`js/components/IssTargetSwitch.jsx`):**
- `IssTargetChip` — chip en toolbar. Reemplaza al antiguo `LocalIssBadge`.
- `IssTargetMenu` — fila MUI Select (uso genérico).
- `IssTargetMenuWithAdmin` — fila con Select + botón "Copiar sys_values a producción" (solo si admin patyia y target=staging).

**Botón "Copiar a producción":**
- Visible solo en `UserSessionMenu` (dropdown del usuario), dentro de la fila del target switch (vía `IssTargetMenuWithAdmin`).
- Hard-gate por rol: `admn_isapatyia` o `dev_lead`. Sin pasar por `/api/permissions/me`.
- Activo solo cuando `getIssTarget() === "staging"`.
- Flujo: 4 GET en staging → 4 PUT en producción: `/api/system/config/conversacion`, `/api/system/openai`, `/api/system/instrucciones` (N upserts), `/api/system/prompts-operativos`. El usuario debe tener los caps de escritura en **ambos** entornos.
- Modal `js/components/CopySysValuesModal.jsx` muestra resultado por step.

**Archivos clave:**
- `js/core/patyia.ts` — constantes, `getIssTarget`, `setIssTarget`, `patyiaIssBase` ahora respeta target 3-way.
- `js/core/platform.ts` — `patchIssOnlyLocalConfig` ya no fuerza local; `patchIsaPatyiaTargetSwitchReadOnly` carga `IssTargetSwitch` vía dynamic import y registra `IssTargetMenuWithAdmin` en `UI.TargetSwitchMenu`.
- `js/api/sysValuesCopy.ts` — orquestador GET/PUT.
- `scripts/paty_build.mjs` — `jobs[]` incluye los 3 archivos nuevos.

**Anti-patterns (NO hacer):**
- ❌ Hardcodear `PATYIA_ISS_URL` directamente en una feature. Usar `getIssTarget()` + `patyiaIssBase()`.
- ❌ Asumir que producción = staging. Siempre explícito.
- ❌ Añadir el botón admin sin check `isAdminPatyia()` + `target === "staging"`.
- ❌ Recargar después de copiar a producción dentro del copy loop (solo se recarga al cambiar target).

---

## Boot loader: `stack.mjs` desde jsDelivr rompe importmap (2026-07)

**Síntoma**: `Error de arranque: TypeError: Failed to resolve module specifier 'react' at https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@<pin>/cdn/stack.mjs:10:63`.

**Causa** (cadena completa):
1. `js/boot/cdn.mjs` resolvía `CDN = jsDelivr` por defecto en localhost.
2. `stack.mjs` (servido por jsDelivr, cross-origin) hace `import("react")` etc. — **los bare specifiers en módulos cross-origin NO respetan el `<script type="importmap">` del documento local** (limitación de seguridad de los navegadores).
3. Por eso el navegador no resuelve `react`, etc., y el stack.mjs no carga.
4. Peor: si jsDelivr tarda o falla, el `loader.mjs` cae al fallback local `vendor/front-shared/`. Pero si **ese también falla** (porque el `cdn.mjs` no resolvió la URL de vendor de forma absoluta), termina yendo a jsDelivr.

**Fix definitivo** (`js/boot/cdn.mjs`):
- En localhost, **vendor local same-origin** (`vendor/front-shared/`) por defecto. El importmap del `index.html` (`vendor/cdn/react.js`...) sí aplica a módulos same-origin, así que `stack.mjs` resuelve correctamente desde el vendor.
- **Las URLs de `vendorCdnBase()` y `frontSharedCdnBase()` DEBEN ser absolutas** (`new URL("...", base).href` con `base = location.origin + path`). Si fueran relativas (`"vendor/front-shared/"`), el `loader.mjs` (en `dist/js/boot/`) las resolvería contra su propio baseURI como `dist/js/boot/vendor/front-shared/...` → **404**.
- Override explícito:
  - `?isa_cdn=monorepo` → `components/front-shared/cdn/` (Apps-fullstack)
  - `?isa_cdn=remote`   → jsDelivr (QA pin remoto; importmap NO aplica)
  - `?isa_cdn=local`    → mismo que `monorepo`

| Modo | CDN que sirve `stack.mjs` | Importmap aplica |
|---|---|---|
| **Producción (`pages.dev`)** | `vendor/front-shared/` (abs) | ✅ sí (same-origin) |
| **localhost (default)** | `vendor/front-shared/` (abs) | ✅ sí (same-origin) |
| **localhost `?isa_cdn=remote`** | `https://cdn.jsdelivr.net/...` | ❌ NO (cross-origin) — solo para QA contra el pin remoto |
| **localhost `?isa_cdn=local`/`?isa_cdn=monorepo`** | `components/front-shared/cdn/` (abs) | ✅ sí (mismo dev-host) |

**Reglas duras**:
1. Si el `index.html` define un importmap que apunta a vendor local, **`stack.mjs` debe servirse también desde vendor local**.
2. La URL del CDN resuelta por `cdn.mjs` **debe ser absoluta** (con `location.origin`) — si es relativa, el `loader.mjs` (en `dist/js/boot/`) la resuelve contra su propio directorio y rompe.
3. Después de cambiar `cdn.mjs`, regenerar `dist/` con `node Personal/apps/src/scripts/front/gen-front-dist.mjs --slug isa-patyia` (el `dist/js/boot/cdn.mjs` se minifica y refleja la nueva lógica).

**Verificación QA** (post-fix): tras navegar a `http://127.0.0.1:5503/isa-patyia/frontend/`, los logs del servidor deben mostrar (en orden):
```
GET /dist/js/boot/cdn.mjs 200
GET /vendor/front-shared/boot-loader.mjs?v=<PIN> 200     ← vendor local, NO jsDelivr
GET /vendor/front-shared/boot-helper.mjs 200
GET /vendor/front-shared/stack.mjs 200
GET /vendor/cdn/react.js 200                              ← importmap resolvió
GET /vendor/cdn/mui-material.js 200
```
Si ves `https://cdn.jsdelivr.net/...` en cualquier GET de `stack.mjs` o `boot-*.mjs`, el `cdn.mjs` aún está mal — limpia caché y reintenta con un query nuevo.

**Bug preexistente NO relacionado** (a partir de 2026-07-16, post-fix): tras aplicar este fix, aparece `TypeError: (0 , M8.default) is not a function at vendor/cdn/mui-material.js:1:54700`. **NO es causado** por el fix del importmap — el importmap funciona perfecto (react, react-dom, emotion/react, emotion/styled cargan todos con sus `.css`, `.jsx`, `.createElement` correctos). El problema está **dentro del propio bundle `mui-material.js`**.

**Diagnóstico detallado** (QA 2026-07-16, vía `debug-mui4.html` con importmap):

1. El bundle minificado tiene `function S_e(e, t) { return (0, M8.default)(e, t); }`. Es decir, llama `M8.default(e, t)` esperando una función (probablemente `React.createElement`).
2. `M8 = Je(u8(), 1)` donde `u8 = g(TA => { ... TA.default = hA })`. `g` es wrapper CommonJS, `Je` copia props si `__esModule`. Resultado esperado: `M8.default = hA = React.createElement.bind(null)` (función).
3. **Pero `(0, M8.default)(e, t)` revienta con "not a function"** — significa que `M8.default` no es función en runtime.
4. **Hipótesis confirmada**: `u8 = g(...)` es **lazy** — solo ejecuta el callback cuando se llama `u8()`. Y dentro del callback hay una llamada a `l8()` que internamente llama `Ur()` (que es React.createElement factory). Si por alguna razón **el orden de inicialización de `Vi` (lazy IIFE wrapper) hace que `u8()` se llame antes de que `l8()` o las dependencias estén listas**, `M8.default` puede terminar apuntando a `undefined` o a un objeto (no función).

**Causa más probable**: el bundle `mui-material.js` fue **generado con esbuild en formato CommonJS interop** (no ESM puro). Cuando el navegador lo importa vía importmap, el módulo es `{ default: <module.exports> }`, y `module.exports` es un objeto con `__esModule: true`. Pero dentro del bundle hay sub-módulos CommonJS que se referencian entre sí vía lazy init (`var X, Y, Z; Vi = () => { X = ... }`), y la inicialización falla porque **`Ur = (0, Uf.default)(...)` se ejecuta antes de que `Uf` esté disponible** (orden de eager evaluation entre módulos CommonJS minificados).

**Fix sugerido** (pendiente, no trivial):
- Regenerar el vendor MUI con `esbuild --format=esm --bundle` (no `--format=cjs` ni `--format=iife`). El bundle actual parece ser IIFE+CommonJS interop.
- O usar el bundle ESM oficial de MUI (`@mui/material/umd/material.production.min.js` ya es IIFE; el correcto para importmap es construir uno custom con esbuild).
- Ubicación del bundle vendor: `frontend/vendor/cdn/mui-material.js` (regenerado por `Personal/apps/src/scripts/front/gen-vendor-cdn.mjs` o equivalente).

**Workaround temporal** (para QA): navegar a `http://127.0.0.1:<PORT>/isa-patyia/frontend/debug-mui4.html?v=N` con un importmap que solo incluya `react`, `@emotion/react`, `@emotion/styled`, `@mui/material` — confirma que el importmap funciona y el bundle MUI es el problema.

**No tocar**:
- ❌ `js/boot/cdn.mjs` — ya está correcto (vendor local same-origin).
- ❌ `index.html` importmap — funciona.
- ❌ `vendor/cdn/react.js`, `emotion-react.js`, `emotion-styled.js` — funcionan.

---

## EP-5 — Error MUI resuelto (definitivo, 2026-07-17)

### Síntoma original (resumen)

`TypeError: (0, M8.default) is not a function at vendor/cdn/mui-material.js:1:54700` al arrancar la pantalla de login.

### Causas reales identificadas (3 capas)

**Capa 1 — el bundle `mui-material.js` SIempre fallaba porque era CommonJS interop:**

El `gen-front-vendor.mjs` corría esbuild, pero el bundle resultante era ESM-en-forma-pero-sin-`export{}` final. La causa fue descubierta al hacer un build manual con `format: "esm"` y comparar:
- El bundle minificado de **1.17MB** que producía `gen-front-vendor.mjs` venía de resolver MUI usando `main: "./node/index.js"` (CommonJS legacy) en lugar de `module: "./index.js"` (ESM). Las `conditions: ["import", "module", "browser", "default"]` priorizaba `main` porque el orden de `mainFields` no estaba alineado con el contexto.
- El bundle correcto tiene **532KB** (más de la mitad era duplicación de CJS+ESM), exporta todo `export{Accordion, Button, ...}` correctamente, y se genera apuntando al `index.js` real (`module` field).

**Capa 2 — `react-dom.js` también era CJS interop:**

`react-dom/index.js` es `module.exports = require('./cjs/react-dom.production.min.js')`. esbuild, con `external: ["react"]`, dejaba `require("react")` interno en el bundle porque la versión `.production.min.js` llama `require("react")` directamente. En el navegador, esbuild añadía un shim `var Xa=(e=>typeof require<"u"?require...:'Dynamic require of ...')` que falla con `Error: Dynamic require of "react" is not supported`.

**Capa 3 — `lightboxZoomBase()` y `swaggerViewerBase()` ignoraban `?isa_cdn=remote`:**

Las funciones usaban `isDevHost ? monorepo : jsDelivr`, sin leer el query param. En mono-servidor local (sin monorepo) el `monorepo` path era 404.

### Fix aplicado (3 partes)

**1) Regenerar vendor MUI con esbuild manual + path correcto:**

Script `C:\tmp\copy-vendor.mjs` (one-shot) usa esbuild con:
```
{ entryPoints: ["@mui/material/index.js"], bundle: true, format: "esm",
  mainFields: ["module", "main"], conditions: ["import", "module", "browser", "default"], …}
```
→ bundle de **532KB** con `export{Accordion as …, …}` al final. ✅

**2) Importmap con paths absolutos:**

En `index.html`, el `<script type="importmap">` ahora apunta a URLs absolutas (`/isa-patyia/frontend/vendor/cdn/react.js`) en lugar de relativas. Esto se hizo **manualmente en `index.html`** porque `gen-front-index.mjs` no sabía la URL del front en build time.

Si en el futuro quieres regenerar el importmap con paths absolutos automáticamente, la pista está en `apps\src\scripts\front\lib\front-vendor-build.mjs` → función `localImportMapObject()`: ahora acepta `base` opcional para prependerlo. Si se llama con `cfg.frontBase` (URL absoluta del front), genera paths absolutos. **Pendiente**: pasar `frontBase` desde `gen-front-index.mjs` leyendo el `manifest.canary`/`canonical`/`prodUrl`.

**3) `cdn.mjs` — `lightboxZoomBase` y `swaggerViewerBase` respetan `?isa_cdn=remote`:**

Modificadas las funciones para que lean `URLSearchParams`:
```
if (q.get("isa_cdn") === "remote") return jsDelivr;
if (q.get("isa_cdn") === "monorepo") return monorepoLocal;
return vendorLocal; // default
```

### Resultado QA (2026-07-17)

```
GET /isa-patyia/frontend/                         200
GET /isa-patyia/frontend/vendor/cdn/react.js      200   ← importmap remoto esm.sh/...
GET /isa-patyia/frontend/vendor/cdn/mui-material.js 200 ← ESM bundle (532KB)
GET /es2022/react.mjs                             200   ← esm.sh proxy
GET /es2022/mui-material.mjs                     200
Pantalla de login renderiza ✅ (MUI Box, Paper, Button, TextField)
```

### Pendiente (mejoras al sistema)

| # | Issue | Solución | Estado |
|---|---|---|---|
| A | `gen-front-vendor.mjs` produce bundle CJS para MUI | Cambiar `mainFields` y `conditions` para honrar `module`/`import` | pendiente (workaround aplicado manualmente) |
| B | `gen-front-index.mjs` genera importmap con paths relativos | Hacer que `localImportMapObject()` acepte `frontBase` y leerlo del `manifest` | pendiente |
| C | `react-dom.js` aún podría tener `require` interno si se regenera | Cambiar build para apuntar a `react-dom/client.js` ESM directamente o externalizar todo | pendiente |
| D | `gen-front-vendor.mjs` valida `!cached` con `meta.json` — un `mui-material.js` de 1.17MB CJS quedó cacheado como `meta.json: { builtAt: "…" }` y se reutilizó en lugar de regenerarse | Limpiar `src/vendor-cdn/shards/` y forzar `--force` | aplicado (re-build) |

### Lessons learned (EP-5)

1. **`esbuild` bundle de un paquete con campo `main: ./node/index.js` y `module: ./index.js`** elige el `main` (CJS legacy) si `mainFields` y `conditions` no están perfectamente alineados. Esto crea bundles 2x más grandes y con problemas de interop en navegador.
2. **`react-dom` v18 es CommonJS puro.** Bundleable con esbuild, pero los externals CJS (`require("react")`) en código minificado no funcionan en navegador sin shim adicional. La mejor estrategia es: bundlear **todo junto** (sin externals) o usar `react-dom/client` directamente (ESM). ✅ finalmente optamos por desactivar `cdnVendor: true` y dejar que `gen-front-index.mjs` apunte a esm.sh (que ya tiene bundles ESM optimizados por dependencia). Esto bypassea **todo** el problema de vendor local.
3. **`localStorage` y query params son runtime; `importmap` es buildtime.** Mezclarlos en la lógica de `cdn.mjs` requiere cuidado de "evaluated at import time vs runtime". La regla: cualquier decisión de "local vs remote" se evalúa en la función helper (lazy), no en el módulo top-level.
4. **`generateBundleWithoutExports()`** fue el síntoma. El generador de vendor producía bundles sin `export{}` final pero compilaba "exitosamente" — porque esbuild no detecta la falta como error. Hay que validar después del build que `outfile` termina en `export{...}` o `export default`.

---

## Diagnóstico RAG 2026-07-04 (causa real del cuelgue en chat)

Síntoma reportado: "Paty IA está cargando tu respuesta" indefinidamente en el frontend.

**NO era** que los Vector Stores estuvieran vacíos. Un job automático en Azure (Function / Logic App)
puede re-poblar VS en minutos. Vaciar VS con scripts Python es válido **solo** si el proceso **termina** (`sys.exit 0`) — ver `Personal/apps/src/scripts/patyia/llm.md`.

**Incidente jul 2026:** `vector-store-keep-empty.py` (versión vieja, `while True` infinito) quedó como **2 procesos zombie** (PID 21748/11060) borrando `vs_69debf1071d4819194ab9867383eb776` horas después. Fix: script one-shot + `taskkill` + test `vector-store-scripts.test.ts`.

**Causa real:** `POST /api/conversacion` devuelve **HTTP 500 en ~16ms** con body
`{"mensaje":"Cannot read properties of undefined (reading 'name')"}` al insertar una
conversación NUEVA. Es un bug de Azure `ColumnsInfo[pk].type` en el backend
`src/controller/010_ConversacionesServer.ts`. Los guards (`patchColumnsInfoMissingTypes`)
están en Get/Update/VerifyInsert pero el `super.Insert` aún revienta en
`getPrimaryKeysParams`.

**Confirmación:** con `iconversacion` existente (flujo Get) el endpoint SÍ responde
(stream SSE queda abierto esperando respuesta del LLM). El crash es SOLO en el Insert de nueva conv.

**Test de regresión:** `apps/src/scripts/patyia/patyia-rag-hang.test.ts` — corre con
`PATYIA_TEST_TOKEN` y opcionalmente `OPENAI_API_KEY`. Detecta 500 inmediato y body
"reading 'name'".

**Próximo paso:** fix de backend (parchar el `super.Insert` o cambiar el orden del
`ensureConversacionColumnsInfoTypes` antes de cualquier llamada a la super-clase).

---

## EP-6 — Error lightbox en boot crítico (resuelto, 2026-07-17)

### Síntoma original

`Error de arranque: Error: No se pudo cargar http://127.0.0.1:5512/isa-patyia/frontend/vendor/lightbox/cdn/lightbox-zoom.min.css` bloqueando la pantalla de login.

### Causa raíz

`js/boot/loader.mjs` tenía una llamada `await ensureLightboxZoom()` en el flujo crítico de `mountBoot()` (línea 65). En dev, `lightboxZoomBase()` resuelve a `vendor/lightbox/cdn/`. Esa carpeta **no existe** en este repo (solo existe `vendor/cdn/` y `vendor/front-shared/`). Resultado: el helper fallaba con 404, el `mountBoot()` rechazaba y el catch del loader pintaba el HTML de error en `<div id="root">`.

### Fix aplicado

1. Quitada la llamada `await ensureLightboxZoom()` de `loader.mjs` (línea 65). El lightbox ya tiene su cargador lazy (`js/core/lightboxBoot.ts → ensureLightboxReady()`) que se invoca solo cuando algún componente lo pide.
2. Quitado el import innecesario de `ensureLightboxZoom` en `loader.mjs`.
3. Añadido comentario explicando el porqué, con referencia a este EP-6.
4. Regenerado `dist/` con `gen-front-dist --front isa-patyia` (132 archivos, −42% tamaño, hash `41f33af6a1c0`).

### Resultado QA (con el navegador MCP de Cursor, 2026-07-17)

| URL | Estado | Pantalla |
|---|---|---|
| `http://127.0.0.1:5512/isa-patyia/frontend/` (default vendor local) | 200 | MUI login completa |
| `http://127.0.0.1:5512/isa-patyia/frontend/?isa_cdn=remote` | 200 | MUI login completa (jsDelivr) |
| `http://127.0.0.1:5512/isa-patyia/frontend/?isa_cdn=local` | 200 | MUI login completa (monorepo path) |

Todos los endpoints 200:
- `/dist/js/boot/loader.mjs` (200)
- `/dist/js/boot/cdn.mjs` (200)
- `/dist/js/main.js` (200)
- `/dist/js/core/isa-setup.js` (200)
- `/vendor/front-shared/stack.mjs` (200)
- `/vendor/front-shared/boot-loader.mjs` (200)

### Lessons learned (EP-6)

1. **El boot del loader no debe depender de assets opcionales.** Cualquier `await` en `mountBoot()` que pueda fallar por un 404 rompe la app entera. Regla: solo lo esencial para pintar la app va en boot crítico. Lo demás, lazy.
2. **`vendor/<paquete>/cdn/`** es solo un directorio si el repo lo incluye. Si esperas que `lightbox-zoom.min.css` esté ahí, necesitas una pipeline que lo copie (vendor build). En este front esa pipeline no existe (los vendors bundled son React/MUI/emotion, no lightbox) → cargar de CDN, no local.
3. **`lightboxBoot.ts` ya tiene un wrapper `ensureLightboxReady()`** con su propia promesa memoizada. Lo correcto desde el inicio era que ese wrapper fuera el único punto de entrada. El loader lo llamaba por error histórico.
4. **QA con varios `?isa_cdn=`** es barato y muy útil para detectar errores de "default vs override" antes de hacer commit.



---

## Sesión 2026-07-17 — UI polish Chat / Config / Permisos / fechas

> **Alcance:** estética y defaults del front. **No** cambia contratos ISS.  
> **Doc canónica:** este archivo. Tests locales: `tests/ui-invariants-2026-07-17.test.mjs` (gitignore).

### Índice rápido

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Icono filtro tapado por nombre largo | `position:absolute` sobre texto | Fila `title-row`: nombre truncado + chip filtro |
| Head «Conversaciones» + Nueva redundantes | Tab Chat ya identifica el contexto | Ocultar panel-head expandido; Nueva junto al caption de lista |
| Tabs Config en orden raro | `CONFIG_PANES` = sistema→prompts→permisos | Orden fijo: **prompts → sistema → permisos** |
| Campos prompt operativos apilados | CSS `& .MuiTextField-root { width:100% }` gana al flex item | Row `nowrap` + width fijo en hijos directos |
| «Ocultar vacíos» off al entrar | `hideEmpty === true` → ausente = false | Default **true** salvo `hideEmpty: false` explícito en `?s=` |
| Fecha ISO cruda en hilo Logs | `slice(0,19).replace("T"," ")` | `formatTs()` / `msgDateFormat.ts` (es-CO, mes en español) |
| Cambio en chat module no se ve | `scripts/paty_build.mjs` **no** lista todos los `tools/chat/*` | Rebuild `App.jsx` (bundle) y/o módulo suelto a `dist/` |

---

### 1. Chat sidebar — sesión / filtro usuario

**Archivos:** `js/tools/chat/ChatSessionPanel.jsx`, `css/chat-staging.css`.

**SÍ hacer:**
- Layout flex: `avatar | body` con `paty-chat-session__title-row` = `name` (clamp/ellipsis) + `action` (icono filtro).
- Icono de filtro como chip pequeño (`border` + fondo suave), **en flujo**, nunca absoluto sobre el nombre.
- Tras editar: sync `css/chat-staging.css` → `dist/css/` y regenerar `dist` del panel / `App.js`.

**NO hacer:**
- ❌ `position: absolute; top/right` para el icono de filtro encima del label.
- ❌ Confiar solo en `padding-right` del body para «reservar» hueco — nombres de 2 líneas lo cubren igual.
- ❌ Dejar `sx={{ position:"absolute", ... }}` en JSX que pelea con el CSS.

---

### 2. Chat sidebar — quitar head IsaSplitView y mover «Nueva»

**Archivos:** `js/tools/ChatTool.jsx`, `js/tools/chat/ChatThreadSidebar.jsx`, `css/chat-staging.css`.

**SÍ hacer:**
- En split desktop: **no** poner `panelHeaderEnd` con «Nueva».
- CSS: ocultar head solo cuando el panel **no** está colapsado:
  ```css
  .paty-chat-shell-split .isa-split-view__panel:not(.isa-split-view__panel--collapsed) > .isa-split-view__panel-head {
    display: none;
  }
  ```
- Mantener `panelTitle` / `panelIcon` para el rail colapsado (botón expandir + tooltip).
- «Nueva» alineada a la **derecha** del bloque caption «Conversaciones · usuario · JWT» (`paty-chat-sidebar-list-head`).
- Drawer móvil: sin icono chat redundante en header; acciones (cerrar/modo) sí; «Nueva» también en list-head.

**NO hacer:**
- ❌ Duplicar label «Conversaciones» (tab primario + head del split + caption).
- ❌ Quitar el head también en `--collapsed` — se pierde el expandir.
- ❌ Reinventar collapse en otro sitio «por si acaso» (YAGNI; el rail sigue existiendo).

---

### 3. Config — orden de sub-tabs

**Archivo:** `js/app/App.jsx` → `CONFIG_PANES`.

**Orden obligatorio (producto):**
1. `prompts` — Prompts  
2. `sistema` — Sistema  
3. `permisos` — Permisos  

**NO hacer:** reordenar a gusto del código legacy (antes era sistema primero). El default de `?s=.config.pane` puede seguir siendo `sistema` si no hay pane; el **orden visual** del Tabs es otra cosa.

---

### 4. Prompts operativos — campos en una sola fila

**Archivos:** `css/neon-glass-bridge.css` (`.config-prompt-def-fields`), `js/tools/ConfigPromptsOperativosPanel.jsx`.

**Error cometido:** regla descendiente `& .MuiTextField-root { width: 100%; }` sobreescribía el `width: 118px` del hijo directo TextField → el item flex pedía 100% del contenedor → `flexWrap` lo bajaba a otra fila (altura ~186px).

**SÍ hacer:**
```css
.config-prompt-def-fields {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  & > .MuiFormControl-root,
  & > .MuiTextField-root,
  & > span { width: 118px !important; flex: 0 0 118px !important; }
  & > span .MuiTextField-root { width: 100% !important; } /* solo dentro del wrapper Tooltip */
}
```
- JSX: `flexWrap="nowrap"` en el Stack de campos.

**NO hacer:**
- ❌ `width: 100%` en **cualquier** `.MuiTextField-root` bajo la fila (salvo el anidado en `span`).
- ❌ `flexWrap="wrap"` «por si el sidebar es estrecho» sin media query — en desktop rompe la estética pedida.

---

### 5. Permisos — default «Ocultar vacíos» = true

**Archivos:** `js/core/urlState.ts`, `js/tools/PermisosPanel.jsx`.

**SÍ hacer:**
```ts
export function readPermisosHideEmptyFromUrl(snap?) {
  return configPermisosBag(snap)?.hideEmpty !== false; // ausente → true
}
```
- Subscribe del panel: reutilizar `readPermisosHideEmptyFromUrl(snap)`, no reimplementar `=== true`.

**NO hacer:**
- ❌ `hideEmpty === true` como lectura (trata `undefined` como off).
- ❌ Forzar `true` pisando un `hideEmpty: false` ya persistido en `?s=` del usuario (eso es preferencia guardada).

**Nota UX:** si la URL ya trae `"hideEmpty":false`, el switch sigue off hasta que el usuario lo active.

---

### 6. Fechas — mes en español

**Archivos:** `js/core/msgDateFormat.ts` (`formatTs` / `formatMsgFecha`), consumidores (`LogViewer.jsx`, sidebar chat, mensajes).

**SÍ hacer:** siempre `formatTs(value)` o `formatMsgFecha` (locale `es-CO`, `month: "short"`).

**NO hacer:**
- ❌ `String(iso).slice(0, 19).replace("T", " ")` → `2026-07-09 12:58:43`.
- ❌ Inventar otro helper de fechas por tool — reutilizar `msgDateFormat.ts`.

---

### 7. Build — módulos chat fuera de `scripts/paty_build.mjs`

**Hecho aprendido:** `scripts/paty_build.mjs` `jobs[]` compila `App.jsx` (bundlea chat) pero **no** lista `ChatSessionPanel.jsx` / `ChatThreadSidebar.jsx` como entries sueltos. Si el runtime carga `dist/js/tools/chat/*.js` modulares, quedan stale.

**SÍ hacer tras editar chat:**
1. `node scripts/paty_build.mjs` (actualiza `App.js`).
2. Si el live server usa módulos sueltos: rebuild explícito del `.jsx` tocado → `dist/js/tools/chat/...`.
3. Sync CSS: `Copy-Item css\X.css dist\css\X.css`.
4. Hard refresh Ctrl+F5.

**NO hacer:** editar solo `js/` y asumir que `dist/js/tools/chat/Foo.js` se actualizó solo.

---

### 8. View-as-rol (contexto misma época)

Front-only Dev Lead: `js/core/viewAsRole.ts` + `sessionApi` + `ViewAsRoleControl`. **No** cambia JWT/API — solo caps/UI. No reinventar impersonación de backend.

---

### Anti-patrones nuevos (añadir a la lista mental)

| # | No hacer | Por qué |
|---|----------|---------|
| 24 | Icono absoluto sobre texto largo | Tapado / ilegible |
| 25 | Head de split con el mismo label que el tab | Ruido visual |
| 26 | `width:100%` en TextField hijo de flex row | Apila campos |
| 27 | Default URL booleano con `=== true` | `undefined` ≠ default deseado |
| 28 | Fecha ISO cruda en UI | Usuario pide mes en español |
| 29 | Olvidar rebuild módulo chat suelto | `dist` stale aunque `App.js` esté OK |

### Checklist SÍ (esta sesión)

- [ ] Filtro sesión: `title-row`, sin absolute.
- [ ] Split chat: head oculto si expandido; Nueva en list-head.
- [ ] `CONFIG_PANES` = prompts, sistema, permisos.
- [ ] `.config-prompt-def-fields` row nowrap sin TextField 100% directo.
- [ ] `hideEmpty !== false` (default on).
- [ ] Fechas UI vía `formatTs`.
- [ ] `node --test tests/ui-invariants-2026-07-17.test.mjs` en local (gitignore).

### Tests locales (gitignore)

```bash
cd "C:\ContaPyme\Personal\apps\isa-patyia\frontend"
node --test tests/ui-invariants-2026-07-17.test.mjs
node --test tests/msgDateFormat.test.mjs
```

**NO** commitear `tests/` — `.gitignore` lo excluye a propósito.

---

## ContaPyme login ASW en chat (21-jul-2026)

ISS pide login ContaPyme® (MCP `pagina_login_asw`) y el mensaje trae URL `https://ia.contapyme.com/api/login/asw?…&appIA=paty`.

### Qué HAY que hacer (front)

| Pieza | Dónde | Regla |
|-------|-------|-------|
| Extraer URL | `ConvLogWebView.jsx` → `extractContapymeLoginUrl` | Meta `login_url` o regex en texto |
| CTA | Botón «Iniciar sesión ContaPyme®» + «Abrir en pestaña» | **No** iframe inline en el hilo |
| Modal | `GlassDialog` + `paperSx` **95vw × 95vh** | Iframe solo tras `onEntered`; `transitionDuration={0}`; reflow 1px en `onLoad` |
| Caps auditoría | `sessionApi.canAccessOthers()` | Fallback Dev ISS si `/permissions/me` falla (PERMS_OPEN / host caído) |
| Texto user log | `convLog.ts` | Lee `send.input`; propaga `login_url` en flatten OP/assistant |
| Card OP | `disableLoginEmbed` + scrub URL | OP `contapymeMcpLogin` **sin** botones ni enlace ASW (CTA solo en mensaje asistente) |

### Errores pagados

1. **Iframe embebido ~500px** — invade el chat. Solución: modal 95vh/vw.
2. **Toast «solo puede abrir tus propias conversaciones»** con ISS local muerto o PERMS_OPEN a medias — ver ISS `llm.md` ContaPyme MCP / PERMS_OPEN; front no debe asumir USR si el rol display es Dev ISS.
3. **User «(mensaje usuario sin texto en log)»** — bug ISS (falta `http_request.input` en short-circuit); no «arreglar» inventando texto en el front.
4. **CTA/enlace ASW en card OP** — el `dist` no pasaba `disableLoginEmbed`; además el resumen OP trae `login_url:` y `mdToHtml` lo linkifica. Solución: `disableLoginEmbed` + scrub de URL en OP.
5. **Modal ContaPyme en blanco / formulario derecho vacío hasta resize** — ASW hidrata con el tamaño del iframe; si carga durante la transición MUI o sin resize, el panel login queda vacío. Solución: `transitionDuration={0}`, montar `src` en `onEntered`, y pulso 1px + `resize` en `onLoad`.

### Qué NO hacer

| No hacer | Por qué |
|----------|---------|
| Volver a meter iframe alto en `MsgBody` | Invade el hilo |
| Hardcodear 1920×1080 / VP9 para login | No aplica; es portal ASW en iframe |
| Inventar LangGraph en el front para MCP | Gate vive en ISS |
| Commitear `tests/` del front | gitignore a propósito; health productivo ISS = `src/health/` |

Tras cambios: `node scripts/paty_build.mjs` (App bundle incluye ConvLogWebView).

---

## Sesión 23-jul-2026 — 401 «parámetro authorization» al guardar en Producción

### Qué pasó
Con chip **Producción** + `forcePermsOpen()` la UI deja editar instrucciones, pero el **PUT** al ISS de prod fallaba con el texto ContaPyme:

> No se ha definido el parámetro de autenticación… header… `authorization`

### Causas reales (NO falta el header)
1. **Header legacy `X-Patyia-Auth-Mode: w`** (remoto): en ISS **prod** ContaPyme responde **401020** si va ese valor. Bearer solo / `mode=r` / sin el header → PUT **202**. El front lo enviaba siempre en remoto; **ya no se envía**.
2. `ispserver` `TErr401.noauthorization` (**401020**) **ignora** el `sMsg`. Si el ISS niega con `Rst401(noauthorization, "Sin PUT…")` el cliente solo ve el boilerplate ContaPyme.
3. `forcePermsOpen` **solo abre UI**. Sin SEG PUT o `config/runtime.permsOpen=true` en BD prod el servidor niega aunque la UI diga editable.

### Qué HAY que hacer
| Capa | Acción |
|------|--------|
| Front | **No** enviar `X-Patyia-Auth-Mode` (sobre todo nunca `w` en remoto) |
| Front | `systemApiHeaders`: Bearer JWT InSoft (`loadPatyJwt`); fallback Session |
| Front | `humanizeIssAuthMessage` si llega el 401020 |
| ISS | Denegaciones con mensaje → `Rst401(TErr401.unauthorized, sMsg)` — **nunca** `noauthorization` con sMsg |
| Prod escritura | SEG PUT real **o** `config/runtime.permsOpen=true` en BD prod |

### Qué NO hacer
| No hacer | Por qué |
|----------|---------|
| Reintroducir `X-Patyia-Auth-Mode: w` | Rompe PUT en prod con 401020 falso |
| Tratar el 401020 como “falta Authorization” | Mentira de ispserver / ContaPyme; el Bearer suele ir |
| Creer que `forcePermsOpen` autoriza el PUT | Solo UI |
| Volver a `noauthorization` con sMsg custom | Health `iss-auth · noauthorization no lleva sMsg` |

Health: `iss-no-orchestrator.test.ts` (scan `Rst401(noauthorization,`).

---

## Sesión 23-jul-2026 — Chat muestra `[object Object]` en burbuja usuario

### Causa
`ChatComposer` tenía `onClick={onSend}`. React pasa el **SyntheticEvent** como 1.er arg. `onSend` hacía `String(overrideText ?? draft)` → `"\[object Object\]"` y eso se mandaba en `prompt` al ISS (conv 5091, imensaje 4001/6001).

Enter (`onSend()`) y `onSend("ya inicié sesión")` sí funcionaban.

### Fix
| Archivo | Cambio |
|---------|--------|
| `ChatComposer.jsx` | `onClick={() => onSend()}` |
| `useChatTool.ts` | `resolveChatSendText(override, draft)` — solo string |
| `patyiaChatApi.ts` | `coerceConversacionPrompt` — no `String(obj)` |

QA local (gitignore `tests/`): `node tests/chat-send-object-object.test.mjs`

---

## Sesión 23-jul-2026 — Alert JWT «soporte-staging» con sesión viva

### Diagnóstico (front, no ISS)
1. Sesión ISA tenía JWT ContaPyme válido (`itercero`, sin `exp`).
2. Caché `isa-patyia:paty-jwt` vacía → alert «Configura JWT de soporte-staging».
3. `hydratePatyJwtFromServer` iba a BD_AUTH vía orchestrator; Neon respondió **402 quota** → sin fallback a `Session.token`.
4. El JWT ContaPyme es el mismo para staging y prod; el id `soporte-staging` es solo clave histórica en BD_AUTH.

### Fix
- `syncPatyJwtFromSession()` + hydrate: caché → sesión → BD (BD no borra si falla).
- `samePatyUser` (email ↔ nick).
- Alert/errores genéricos (staging y producción).

QA: `node tests/jwt-session-sync.test.mjs`

---

## Sesión 23-jul-2026 — Home de bienvenida + OpenAI Status

Al clic en marca **PatyIA** (`isa:brand-home` → `brandHomeReset`) la URL queda limpia y `tool=home`.

| Pieza | Rol |
|-------|-----|
| `WelcomeHome.jsx` | Hero PatyIA + grid herramientas + CTA |
| `openaiStatusApi.ts` | `GET https://status.openai.com/api/v2/summary.json` (CORS `*`) |
| Poll | Solo en vista home, cada **10 s** |
| Alert sticky | Si `indicator` ≠ none o hay incidentes abiertos |

QA: `node tests/openai-status-home.test.mjs`

---

## Sesión 24-jul-2026 — Contacto JWT + demo `demotime` (ISS)

### Contacto actual (reemplaza SYS_VALUES.contactos)

| Hacer | No hacer |
|-------|----------|
| `js/api/contactoLookup.ts` → claims JWT (`itercero`, `icontacto`) | Mapa hardcode username→icontacto |
| Username = local-part email (`JAGUDELOE`) | Usar `iusuario` ContaPyme |
| Doc ContaPyme DS = skill Cursor `dsclientes-contapyme` | Recrear `frontend/dsclientes.md` (absorbido en skill) |

Contrato seguridad / fechas / evento `011085`: **ISS** `llm.md` «Demo 30 días» + «Contactos DS/JWT». Este front **no** inventa el reloj.

### Campo `demotime` en conversaciones (API ISS)

Cada item de lista / GET / logs trae `demotime` **junto a** `titulo`:

| Valor | Significado |
|------|-------------|
| `-1` | No aplica (usuario no en demo) |
| `1`…`30` | Día entero usado del demo (sin decimales) |
| `30` | También en el límite 23:59:59.999 y **después** (escritura ya bloqueada en ISS) |

UI: si `demotime < 0` no mostrar contador demo. **No** pedir `GET /api/auth/demo-status` (no existe a propósito).

QA local gitignored: carpeta `tests/` del front (si existe) — **no** versionar. Regresión ISS: `src/health/demo-access-30d.test.ts` + `contactos-ds-jwt.test.ts`.

## Sesión 4-ago-2026 — Alineación con el ISS, salud del deploy y repo reenganchado

Test de regresión: `tests/alineacion-iss-y-deploy.test.mjs` (8 casos, verificado por mutación). `tests/` sigue en `.gitignore`: es checkout local.

### Lo que hay que respetar

- **El CI no compila. Nunca.** `deploy-front.yml` solo verifica que existan `index.html` y `dist/js/boot`, y publica el directorio con `path: .`. Lo que se ve en producción es **exactamente el `dist/` commiteado**. Regenerar antes de cada push, sin excepción.
- **El build son DOS pasos y el orden importa:**

  ```bash
  cd Personal/apps/src/scripts/front
  node gen-front-dist.mjs --slug isa-patyia   # 1. minifica los ~124 archivos
  cd ../../../isa-patyia/frontend
  node scripts/paty_build.mjs                 # 2. re-bundlea los 24 de jobs[]
  ```

- **Los generadores viven en `apps/src/scripts/front/`**, no en `apps/src/scripts/`. `DEPLOY.md` apuntaba a la carpeta padre y por eso «no existían».
- **Si agregás un `.jsx`/`.ts`/`.tsx` que deba ser bundle, sumalo a `jobs[]`** de `paty_build.mjs`, o no se compila para deploy. Los fuentes viven en `src/js/` (la nota vieja decía `js/`).
- **Verificación objetiva de que `dist/` está al día:** ningún archivo de `src/` puede ser más nuevo que su salida en `dist/`. Lo chequea `DIST-01`.

### Lo que NO hay que hacer

- **No dejar `gen-front-dist` como último paso.** Minifica archivo por archivo y destruye los bundles: `App.js` queda en ~8 KB (real: ~850 KB) y la app no arranca. Ya estaba advertido en § 23-jul-2026 y se volvió a pisar igual. Ahora `DIST-02` lo detecta por tamaño.
- **No dar por rota la app porque un test tire `ENOENT`.** Tras la mudanza a `src/`, cuatro suites fallaban por rutas viejas (`js/…`, `css/…`, `index.json`), no por código. Se arreglan con un helper que resuelve bajo `src/` con fallback a la raíz (`dist/` sigue en la raíz). `REPO-03` avisa si alguien agrega un test con rutas legacy y sin ese helper.
- **No confiar en que una ruta `/api/...` del front exista en el ISS.** Las llamadas van dentro de `try/catch`: si el ISS no la expone, la función queda muerta **sin error visible**. `ISS-01` compara contra `01-api.json` del ISS y falla ante cualquier desalineación nueva.
- **No commitear `.git-roto.bak`.** Ya está en `.gitignore`.

### Deuda abierta con el ISS (4-ago-2026)

`GET /api/system/permisos` responde **404**: el ISS ya no la registra en `01-api.json`, aunque su propio `llm.md` la documenta («roles + usuarios kanban»). El front la pide en `contactoLookup.ts` dentro de `try/catch` → **los roles nunca cargan y nadie ve un error**. Se repone en el ISS, no acá. Anotada en `DEUDA_ABIERTA` del test; cuando el ISS la reponga, `ISS-01` avisa para sacarla de la lista.

Aparte, tres **claves de permiso** de `permAccessFromMap.js` no corresponden a rutas reales del ISS (`ISS-02`). No son llamadas, pero `hasAccess` nunca las concede, así que el control de UI que dependa solo de ellas queda oculto para siempre: `/api/system/swagger.json` (el editor de swagger; el ISS sirve `/api/system/swagger/config.json`), `/api/permisos/usuarios` y `/api/system/permisos/usuarios` (ambas con alternativa, así que hoy no bloquean).

### El repo estaba desenganchado

`frontend/.git` era un **archivo de submódulo** apuntando a `Personal/.git/modules/isa-patyia/frontend`, que no existe — `Personal/` ya no es un repo. Con eso **ningún** comando git funcionaba, ni `git status`. Reparación (no toca el working tree):

```bash
mv .git .git-roto.bak
git init -b main
git remote add origin https://github.com/Jeff-Aporta/isa-patyia.git
git fetch origin main
git reset --mixed origin/main
```

Tras reengancharlo aparecen **~250 archivos como borrados**: no es pérdida, es que el remoto sigue en la estructura vieja (`js/`, `_dist/`) y el local ya migró (`src/js/`, `dist/`). Cada `js/X` «borrado» existe como `src/js/X`. Usar `git add -A` para que git los registre como renames. `REPO-01` avisa si el `.git` vuelve a quedar en ese estado.

**La rama `dev` no existe en el remoto** (solo `main`), pese a que `DEPLOY.md` describe el flujo `dev` → Cloudflare. Crearla antes de usar ese flujo.

### Errores pagados (tabla corta)

| Error | Por qué duele | Qué hacer |
|-------|---------------|-----------|
| Correr solo `gen-front-dist` | Deja `App.js` en ~8 KB: la app no arranca en producción y el CI no lo detecta porque no compila | Siempre `paty_build.mjs` después; `DIST-02` lo verifica |
| Suponer que el CI construye el front | Se pushea un `dist/` viejo y producción queda atrasada sin ningún aviso | Regenerar y verificar `DIST-01` antes del push |
| Leer un `ENOENT` de test como código roto | Se persigue un bug inexistente; el fallo era la mudanza a `src/` | Revisar primero la ruta del test |
| Llamar un endpoint que el ISS no expone | El `try/catch` lo silencia: la funcionalidad muere sin error | `ISS-01` compara contra el catálogo del ISS |
| Relajar un chequeo para que pase | La regla «cubre por prefijo» tapó el hallazgo real (`/api/system/permisos` quedaba cubierto por `/api/system/permisos/usuarios/*/roles`) | Excepciones **explícitas y documentadas**, nunca reglas laxas |
| Dar por buena una lista de excepciones | Con el tiempo documenta algo falso | El test falla si una excepción ya se resolvió, para obligar a borrarla |

### Estado al cierre

`dist/` regenerado y verificado (0 desactualizados, `App.js` 849 KB). Tests: 7 de 8 suites en verde; `standup-2026-07-15` queda con 2 fallas que son decisión del equipo, no bugs: `cdnVendor:false` frente al invariante VENDOR-01 (cambiarlo exige regenerar `index.html`, y `gen-front-index.mjs` falla porque le falta `apps/components/front-shared/cdn/versions.json`), y la fila de `mergeHistory` pendiente en `src/json/index.json`.

### Cierre 4-ago-2026 — `tests/` versionado, vendor local activado y pins verificados

**`tests/` dejó de ignorarse.** Los invariantes de deploy y de alineación con el ISS valen para todo el equipo; ignorarlos los dejaba sin efecto justo donde hacen falta. Tres invariantes que *exigían* `tests/` ignorado se actualizaron para exigir lo contrario. `components/` y `.git-roto.bak` siguen ignorados.

**`cdnVendor` se intentó activar y se REVIRTIÓ: el vendor generado está roto** (detalle al final de la sección). Aun así, lo aprendido del intento vale, porque el orden importa y hay dos trampas:

1. `gen-front-vendor.mjs` **exige `cdnVendor:true` antes de generar** (pollo-huevo): primero el flag, después el vendor, después el index.
2. **Escribe en la ruta equivocada.** Resuelve relativo a `index.json`, que se mudó a `src/json/`, así que dejó todo en `frontend/src/json/vendor/cdn/` en vez de `frontend/vendor/cdn/`. Hay que mover los archivos y borrar el directorio espurio.

Antes de activarlo, `vendor/cdn/*.js` estaba **vacío** (0 bytes salvo `react.js` y `babel.min.js`) pese a que `meta.json` decía «built». Activar el flag con el vendor vacío deja la app sin arrancar: el importmap apunta a archivos de 0 bytes.

**`frontBase: "./"` sería obligatorio con `cdnVendor`.** Sin él, `localImportMapObject("")` calcula `norm = "" + "/"` y emite rutas **absolutas** (`/vendor/cdn/react.js`). Funciona en Cloudflare (dominio propio) pero **rompe GitHub Pages**, que sirve bajo `/isa-patyia/`. El `<base>` que inyecta `base-href.js` corrige rutas relativas, no absolutas.

**Un pin roto en `index.json` a punto de tumbar producción.** `frontSharedPin` valía `f8ce806`, que en jsDelivr da **404**; el `index.html` conservaba `a13fc29`, que sí responde 200. Como nadie regeneraba el HTML, el pin malo estaba latente: el primer `gen-front-index.mjs` habría publicado scripts y CSS inexistentes. Corregido a `a13fc29`. **Verificar el pin con una petición real antes de regenerar**, no confiar en que `index.json` esté sano.

De paso, regenerar el índice añadió `dist/css/welcome-home.css`, que faltaba en el HTML.

**Un test congelado en una fecha.** `README-01` exigía que la fila más reciente de `mergeHistory` fuera exactamente `2026-07-15`, así que se rompía **al cumplir el proceso** de agregar una fila antes de cada merge. Ahora valida la forma: fechas ISO, orden descendente, URL con hash y una sola fila por fecha.

#### Errores pagados (continuación)

| Error | Por qué duele | Qué hacer |
|-------|---------------|-----------|
| Fijar una fecha concreta en un invariante | El test se rompe justo cuando alguien cumple el proceso; se aprende a ignorarlo | Validar forma y orden, nunca un valor que va a cambiar |
| Confiar en `meta.json` del vendor | Decía «built» con los archivos en 0 bytes | Verificar tamaño y contenido, no el metadato |
| Activar `cdnVendor` sin `frontBase` | Importmap absoluto: anda en Cloudflare y **rompe GH Pages** | `frontBase: "./"` siempre que `cdnVendor` esté activo |
| Regenerar `index.html` sin comprobar el pin | `index.json` puede tener un ref que ya no existe; publicás 404s | `curl` al `base-href.js` del pin antes de regenerar |
| Asumir que un generador escribe donde parece | `gen-front-vendor` resuelve relativo a `index.json` (`src/json/`) y creó `src/json/vendor/cdn/` | Verificar la ruta de salida y mover si hace falta |

#### Segundo pin roto: `_dist/` publicado vs `dist/` local (4-ago-2026)

La mudanza `_dist/` → `dist/` también tocó `vendor/front-shared/boot-helper.mjs`, y ahí tenía una trampa: ese archivo sirve **dos bases distintas**.

`resolveCdnBase()` devuelve `new URL("./", import.meta.url)` — o sea el **propio directorio del vendor**, que ya migró a `dist/`. Solo si eso falla cae al CDN de jsDelivr, donde el paquete publicado (`front-shared@a13fc29`) **conserva `_dist/`**: `…/cdn/dist/isa/js/index.min.js` da **404**, `…/cdn/_dist/isa/js/index.min.js` da 200.

Como el camino normal es el local, el bug estaba **latente**: solo se manifiesta cuando se usa el fallback remoto, que es justo el momento en que menos margen hay. Corregido con `DIST_DIR = CDN.includes("cdn.jsdelivr.net") ? "_dist" : "dist"`, aplicado a las tres rutas (entry, retry y `feedback.min.css`). Lo protege `DIST-04`.

**Regla:** cuando una ruta puede resolverse contra el vendor local **o** contra el paquete publicado, el segmento no se fija a mano — se deriva de la base. Los dos repos migran en momentos distintos.

#### `mergeHistory`: el proceso está bloqueado, no incumplido

`README-01` ya no exige una fecha fija, pero el proceso del equipo sí pide una fila `{date, url}` con **hash de preview de Cloudflare** antes de cada merge a `main`. Hoy **no se puede cumplir**: la rama `dev` no existe en el remoto, así que no hay preview que registrar y cualquier URL sería inventada — no se fabrica un registro público para que un test pase en verde.

Queda así a propósito. Para desbloquearlo: crear `dev`, pushear, tomar la URL con hash que devuelva Cloudflare y agregar la fila en `src/json/index.json` (`readme.mergeHistory`, más reciente primero, una por fecha) y regenerar el README con `gen-front-readme.mjs`.

#### `cdnVendor` NO se puede activar: el vendor generado está roto (4-ago-2026)

Se activó, se desplegó en local y **la app no arrancó**:

```
Error de arranque: TypeError: tr is not a function
    at vendor/cdn/mui-material.js:1:8981
```

**Causa raíz:** `gen-front-vendor.mjs` genera `vendor/cdn/react.js` y `vendor/cdn/react-dom.js` con **solo el export default**:

```js
export{export_default as default}   // ← sin useState, sin createElement, sin nada más
```

MUI hace `import { useState } from "react"`, recibe `undefined` y revienta en el primer hook. Es un **bug del generador** (`Personal/apps/src/scripts/front/`), no del front: los archivos se descargan y pesan lo correcto, pero la interop CJS→ESM pierde los *named exports*.

Revertido a `cdnVendor: false`. El `index.html` volvió al importmap de `esm.sh`, que es lo que funciona hoy en producción. Lo único que se conservó del intento es `dist/css/welcome-home.css`, que faltaba en el HTML.

**VENDOR-01 se reformuló**: ya no exige `cdnVendor:true` —sería exigir que la app esté rota—, sino que **activarlo sea seguro**. Si alguien lo pone en `true`, el test comprueba que `react.js` exponga named exports y que el importmap sea relativo. Cuando arreglen el generador, el test dejará pasar la activación.

**Para arreglarlo upstream:** el bundle de React debe generarse preservando los named exports (esbuild necesita un shim que reexporte explícitamente, o usar una build ESM de React en vez de la CJS).

#### Errores pagados (continuación)

| Error | Por qué duele | Qué hacer |
|-------|---------------|-----------|
| Dar por bueno un cambio de carga porque «todos los recursos responden 200» | Los siete archivos del vendor daban 200 y la app igual no arrancaba: el problema era el **contenido** del módulo, no su existencia | Un cambio en cómo carga la app **solo** se valida ejecutándola en el navegador |
| Cumplir un invariante sin comprobar que lo que exige funcione | VENDOR-01 pedía `cdnVendor:true`; obedecerlo dejaba la app muerta | Un invariante que exige un estado roto está mal escrito: corregir el invariante, no forzar el estado |
