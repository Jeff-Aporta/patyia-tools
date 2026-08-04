# Despliegue ISA PatyIA (frontend)

Dos ramas, dos entornos estáticos independientes.

| Rama | Entorno | URL | CI |
|------|---------|-----|-----|
| **`dev`** | Cloudflare Pages (pruebas) | [isa-patyia-dev.pages.dev](https://isa-patyia-dev.pages.dev/) | job `cloudflare-dev` en [deploy-front.yml](.github/workflows/deploy-front.yml) — **la rama `dev` no existe hoy en el remoto: solo `main`. Crearla antes de usar este flujo.** |
| **`main`** | GitHub Pages (producción) | [jeff-aporta.github.io/isa-patyia](https://jeff-aporta.github.io/isa-patyia/) | job `github-pages` en [deploy-front.yml](.github/workflows/deploy-front.yml) |

## Flujo de trabajo

1. Desarrollar y hacer push en **`dev`** → se publica automáticamente en Cloudflare Pages.
2. Probar en la URL dev.
3. Cuando esté aprobado: **merge `dev` → `main`** → GitHub Pages actualiza producción.
4. **Siempre** registrar el merge en **Historial de merges a producción** en [README.md](README.md) (fecha + URL preview Cloudflare). No cerrar el merge sin esa fila.

```bash
git checkout dev
# ... cambios + gen-front-dist ...
git push origin dev

# Tras QA:
git checkout main
git merge dev
git push origin main
```

## Setup inicial (una vez)

### 1. Proyecto Cloudflare Pages

```powershell
cd frontend
.\scripts\setup-cloudflare-pages.ps1
```

Crea el proyecto `isa-patyia-dev` con rama de producción `dev`.

### 2. Secretos en GitHub (`Jeff-Aporta/isa-patyia`)

```powershell
.\scripts\setup-github-secrets.ps1
```

Configura `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (mismos que Workers/R2 del workspace).

### 3. GitHub Pages (rama `main`)

En el repo [isa-patyia](https://github.com/Jeff-Aporta/isa-patyia): **Settings → Pages → Build and deployment → GitHub Actions**.

El workflow sube el directorio raíz del front (`index.html` + `dist/`).

## Build local antes de push

El CI **no compila**: el workflow solo verifica que existan `index.html` y `dist/js/boot`, y publica el directorio tal cual. Lo que se despliega es exactamente el `dist/` commiteado, así que hay que regenerarlo antes de cada push.

Son **dos pasos y el orden importa**:

```bash
cd Personal/apps/src/scripts/front
node gen-front-dist.mjs --slug isa-patyia   # 1. minifica los ~124 archivos

cd ../../../isa-patyia/frontend
node scripts/paty_build.mjs                 # 2. re-bundlea los 24 de jobs[]
```

⚠️ **Nunca dejar solo el paso 1.** `gen-front-dist` minifica archivo por archivo y destruye los bundles: `App.js` queda en ~8 KB (debe pesar ~850 KB) y la app no arranca. El paso 2 los restaura. El invariante `tests/invariants-2026-07-23-force-perms-and-dist.test.mjs` lo detecta («App.js demasiado pequeño — probable gen-front-dist»).

Si agregás un `.jsx`/`.ts`/`.tsx` que deba ser bundle, sumalo a `jobs[]` en `scripts/paty_build.mjs` o no se compilará para deploy.

Verificación rápida de que `dist/` quedó al día: ningún archivo de `src/` debe ser más nuevo que su salida en `dist/`.

`gen-front-index.mjs` (regenera `index.html` desde `src/json/index.json`) **requiere** `Personal/apps/components/front-shared/cdn/versions.json`; si esa ruta no existe en el checkout, falla y hay que dejar `index.html` como está.

## Disparo manual

**Actions → Deploy ISA PatyIA front → Run workflow**  
Opción `target`: `auto` (según rama), `github-pages` o `cloudflare-dev`.

El historial de previews validados antes de cada merge a `main` está en [README.md](README.md) (sección al final). Cada fila nueva: **fecha** + **URL con hash** de Cloudflare (`xxxx.isa-patyia-dev.pages.dev`), sin descripción del release. **Una sola fila por fecha** (la más reciente); al añadir otra del mismo día, reemplazar la anterior en `src/json/index.json` o dejar la nueva al inicio del array y regenerar README.
