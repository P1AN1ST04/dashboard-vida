# Deploy checklist — `vida-vite` → Cloudflare Pages

Procedimiento end-to-end. Hazlo desde tu Windows en orden, sin saltarte pasos.

---

## 0. Pre-flight (1 min)

```powershell
cd "C:\Users\miche\Documents\Claude\Projects\APLICACION DE VIDA\vida-vite"
git status                # debes ver "nothing to commit, working tree clean" excepto los archivos nuevos
node --version            # ≥ 20
pnpm --version            # ≥ 9
```

Si hay cambios sin commitear de bloques anteriores, **revisarlos visualmente** antes de seguir.

---

## 1. Install + Build local (3-5 min primer build, <1 min subsiguientes)

```powershell
pnpm install              # asegura que el lock está al día
pnpm build                # corre tsc -b && vite build
```

**Verificación esperada:**
- `tsc -b` termina sin errores (cero `error TS####`).
- `vite build` produce `vida-vite/dist/` con `index.html`, `assets/`, `sw.js`, `manifest.webmanifest`, `_headers`, `_redirects`.
- Tamaño del bundle final: esperar ~200-400 KB de JS comprimido.

**Si falla:**
- Errores TS en archivos `vida-vite/src/**` → reportar; suelen ser tipos faltantes en props.
- Errores de `vite-plugin-pwa` → revisar `vite.config.ts`.
- `Cannot find module '@/...'` → verificar `tsconfig.app.json` paths.

---

## 2. Smoke test local con producción (2 min)

```powershell
pnpm preview              # sirve dist/ en http://localhost:4173
```

Abre `http://localhost:4173` y verifica:
1. ✅ El Onboarding aparece la primera vez.
2. ✅ Login con tu cuenta Supabase real → entras a la app.
3. ✅ Crea un hábito, márcalo. Cierra sesión → entra otra vez → tu hábito sigue ahí.
4. ✅ Topbar → ⚙ → Familia → "Crear familia" → debe funcionar (RPC `create_household`).
5. ✅ Topbar → ⚙ → Datos → "Exportar JSON" → descarga un blob con tus datos.

Si todo OK: matar el preview con `Ctrl+C` y seguir.

---

## 3. Commit + push (1 min)

```powershell
git add -A
git status                # revisa que no estás commiteando .env.local ni node_modules

git commit -m "feat: Bloques A-I completos — Vita migration ready to deploy

- Auth Supabase con AuthGate, AuthProvider, modal LoginScreen Quiet Almanac
- Schema multi-user con RLS bridge (user_id + user_token + household_id)
- 7 vistas TSX + 9 modales canónicos
- Household sharing (familias) con invite via Supabase Auth admin
- Edge Functions log-event v3, data-sync v5, send-invite-email v1
- Config Cloudflare Pages: public/_redirects + public/_headers"

git push origin main
```

---

## 4. Configurar Cloudflare Pages (5 min, solo primera vez)

### 4.1 Crear / conectar el proyecto

Dashboard Cloudflare → Pages → **Create application** → **Connect to Git** → autorizar GitHub → seleccionar `P1AN1ST04/dashboard-vida`.

### 4.2 Build settings (exactos)

| Campo | Valor |
|---|---|
| **Project name** | `vida` |
| **Production branch** | `main` |
| **Framework preset** | `Vite` (o "None" + manual) |
| **Build command** | `pnpm build` |
| **Build output directory** | `dist` |
| **Root directory** | `vida-vite` |
| **Node version** (env var) | `20` |
| **pnpm version** (env var) | (auto-detect by lockfile) |

> El root directory `vida-vite/` es crítico porque tu repo tiene la carpeta como subdirectorio.

### 4.3 Environment variables

En *Settings → Environment variables → Production*:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://tcpbqfzclmzhujjsifgc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (de Supabase Dashboard → Settings → API → `anon public`) |
| `NODE_VERSION` | `20` |

**No commitees el anon key al repo** — vive solo en Cloudflare env vars y en tu `.env.local` local.

### 4.4 Trigger primer build

Cloudflare arranca el build automáticamente al guardar la config. Mira el log en *Deployments*. Espera 2-4 min.

---

## 5. Configurar Supabase Auth para vida.pages.dev (2 min)

Supabase Dashboard → Authentication → **URL Configuration**:

- **Site URL**: `https://vida.pages.dev`
- **Additional Redirect URLs** (añadir todas):
  - `https://vida.pages.dev`
  - `https://vida.pages.dev/*`
  - `http://localhost:5173` (dev)
  - `http://localhost:4173` (preview)

Sin esto, el magic link de auth e invitaciones manda al usuario al "default site URL" y se rompe el flujo.

### 5.1 Variable APP_URL en la Edge Function send-invite-email

Supabase Dashboard → Edge Functions → `send-invite-email` → Settings → **Environment variables**:

| Nombre | Valor |
|---|---|
| `APP_URL` | `https://vida.pages.dev` |

Sin esto, la edge function usa el fallback hardcoded y los magic links de invitación quedan rotos.

---

## 6. Smoke test E2E en producción (5 min)

Abre `https://vida.pages.dev` en navegador (modo incógnito para garantizar sesión limpia):

| # | Acción | Esperado |
|---|---|---|
| 1 | Cargar la página | Onboarding 3 slides → "Empezar" → AuthGate login |
| 2 | "Crear cuenta" con email1@test → password | Magic link al email (revisa SMTP), o entra directo |
| 3 | Cerrar onboarding → ver dashboard | Sidebar + Topbar + vista Hoy |
| 4 | Crear hábito "Test smoke" en vista Hábitos | Aparece + persist tras reload |
| 5 | Marcarlo hoy | streak: 1, heatmap pinta el día |
| 6 | Topbar ⚙ → Familia → Crear "Hermanos prueba" | Aparece como pill seleccionable |
| 7 | Invitar email2@test | Notice "Invitación enviada" o invite_url visible |
| 8 | Logout (Topbar perfil o forzar `localStorage.clear()`) |  |
| 9 | Crear segunda cuenta con email2@test | El magic link del paso 7 te ingresa + auto-acepta invite |
| 10 | Verificar Familia | Ves 2 miembros, "Hermanos prueba" en pills |
| 11 | Crear transacción "Renta" en Finanzas con toggle "compartir" (Bloque I — todavía no disponible, anota para próximo bloque) | — |

> ⚠️ El toggle "compartir con familia" en los modales CRUD es **Bloque I** (próximo) — todavía no existe en la UI. Por ahora solo el SQL puede marcar `household_id`. El smoke E2E del flujo de compartición se completa cuando tengamos el toggle de Bloque I.

---

## 7. Verificación final

```powershell
# Si todo OK, taggear la release
git tag -a v0.1.0-vite -m "Vita migration deployed to Cloudflare Pages"
git push origin v0.1.0-vite
```

Y abrir `https://vida.pages.dev` desde el celular para confirmar PWA install prompt aparece.

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Build falla `Cannot find module '@/...'` | tsconfig paths perdidos | Verifica `tsconfig.app.json` línea 21 |
| Build pasa pero la página queda en blanco | falta el `_redirects` SPA fallback | Confirma que `vida-vite/public/_redirects` está en el repo |
| Magic link redirecciona a `localhost` | Auth Site URL no configurado | Paso 5.1 |
| `claim_user_token` falla con 401 | JWT del browser caducó | Logout + login otra vez |
| `send-invite-email` 500 | SMTP no configurado en Supabase Auth | Configura SMTP en Auth Settings (o usa el `invite_url` manual) |
| PWA no instala | Falta favicon o icon.png en `public/assets/brand/` | Verifica `vida-vite/public/assets/brand/` existe |
| Workouts vacíos pero tienes datos en otro device | Sync engine real es Bloque I — todavía local | Esperado, no es bug |
