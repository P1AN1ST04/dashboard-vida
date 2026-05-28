# Vida — Migración Vite (Bloques A–I)

Referencia post-migración. Estado real al cierre del Bloque I.

---

## Vista general

| Bloque | Entrega | Estado |
|---|---|---|
| A | Scaffold Vite + React 19 + TS + Tailwind + PWA + Supabase SDK | ✅ |
| B | Capa Storage tipada multi-namespace + Store pub/sub + tipos del dominio + ops (Habit/Goal/Workout) + helpers + locales es/en | ✅ |
| C | Auth Supabase: cliente, módulo wrap, AuthProvider/AuthGate, LoginScreen Quiet Almanac | ✅ |
| D | Schema multi-user: `user_tokens` bridge + `user_id` en `vida_*` + RLS bridge + RPC `claim_user_token` + Edge Functions actualizadas | ✅ |
| E | UI Shell: `Icon`, `KPI`, `Sidebar`, `Topbar`, `AppShell`, `ConfettiHost` | ✅ |
| F | 7 vistas TSX: Today, Finance, Habits, Goals, Calendar, Workouts (tabs Gym/Run/All), Progress | ✅ |
| G | 9 modales canónicos: Onboarding, SettingsPanel, ProfileModal, AddTransactionModal, HabitEditModal, GoalEditModal, WorkoutLogModal, WeeklyReportModal, CsvImportModal | ✅ |
| H | Household sharing: tablas + RLS extendida + RPCs + Edge Function `send-invite-email` + lib + FamilyPanel + auto-accept | ✅ |
| I | Pre-flight + smoke E2E SQL + config Cloudflare Pages + DEPLOY.md + este resumen | ✅ |

---

## Backend Supabase (proyecto `vida-prod` `tcpbqfzclmzhujjsifgc`)

### Migrations aplicadas (13 total)

1. `pending_events_table` — original pre-migración
2. `vida_sync_tables` — original pre-migración
3. `add_integrations_singleton` — original pre-migración
4. `create_user_tokens_bridge` (Bloque D)
5. `add_user_id_to_vida_tables` (Bloque D)
6. `vida_rls_policies_bridge` (Bloque D)
7. `vida_autofill_user_id_trigger` (Bloque D)
8. `claim_user_token_rpc` (Bloque D)
9. `harden_security_definer_functions` (Bloque D)
10. `create_households_schema` (Bloque H)
11. `vida_household_id_and_rls` (Bloque H)
12. `household_rpcs` (Bloque H)
13. `vida_user_token_nullable_v2` (Bloque H)

### Tablas

| Tabla | Filas | Cols clave |
|---|---:|---|
| `vida_items` | 127 (legacy) | `id, user_token?, user_id?, household_id?, collection, item_id, data jsonb, updated_at, deleted_at` |
| `vida_singletons` | 7 (legacy) | `(user_token, collection) PK, user_id?, household_id?, data jsonb` |
| `pending_events` | 0 | `id, user_token?, user_id?, household_id?, event_type, payload jsonb, source, created_at, processed_at` |
| `user_tokens` | 0 | `id, user_id, user_token UNIQUE, device_label, created_at, last_seen_at` |
| `households` | 0 | `id, owner_user_id, name, created_at` |
| `household_members` | 0 | `(household_id, user_id) PK, role, joined_at` |
| `household_invites` | 0 | `id, household_id, invited_email, invited_by, token UNIQUE, status, expires_at, accepted_*` |

### RPCs (SECURITY DEFINER, ejecutables por `authenticated`)

| RPC | Args | Retorna | Uso |
|---|---|---|---|
| `claim_user_token` | `(token, device_label)` | `jsonb` | Vincular Shortcuts a la cuenta + backfill filas legacy |
| `token_belongs_to_me` | `(token)` | `bool` | Helper para RLS |
| `is_household_member` | `(hh)` | `bool` | Helper para RLS |
| `is_household_owner` | `(hh)` | `bool` | Helper para RLS |
| `create_household` | `(name)` | `uuid` | Crear + auto-añadir owner como member |
| `accept_invite` | `(invite_token)` | `uuid` | Validar + insertar member + marcar accepted |
| `leave_household` | `(hh)` | `void` | Borrar mi membership; transfiere ownership o elimina si soy último |
| `revoke_invite` | `(invite_id)` | `void` | Solo owner |
| `vida_autofill_user_id` | trigger | — | BEFORE INSERT rellena `user_id` desde `auth.uid()` |

### Edge Functions

| Slug | verify_jwt | Versión | Resumen |
|---|---|---:|---|
| `log-event` | false | v3 | Recibe POST de Shortcuts, resuelve `user_id` desde `user_tokens`, escribe `pending_events` |
| `data-sync` | false | v5 | Push/pull batch, prioriza JWT Bearer del web sobre lookup por token |
| `strava-oauth` | false | v2 | OAuth proxy Strava (sin cambios A–I) |
| `google-oauth` | false | v4 | OAuth + Drive backup proxy Google (sin cambios A–I) |
| `send-invite-email` | true | v1 | Verifica JWT, crea invite row, llama `auth.admin.inviteUserByEmail` |

---

## Frontend (`vida-vite/src/`)

### Estructura

```
src/
├── App.tsx                       composición raíz
├── main.tsx                      entry point
├── types/index.ts                tipos del dominio
├── styles/global.css             Quiet Almanac CSS (~1.5k líneas)
├── locales/
│   ├── es.json (105 keys)
│   ├── en.json (105 keys)
│   └── index.ts
├── lib/
│   ├── index.ts                  barrel exports
│   ├── supabase.ts               cliente Supabase singleton
│   ├── auth.ts                   wrapper auth tipado
│   ├── storage.ts                Storage namespaced + migrate
│   ├── store.ts                  pub/sub
│   ├── seed.ts                   datos iniciales
│   ├── data.ts                   compute metrics/cashflow/etc
│   ├── helpers.ts                fmt money/date/etc + constants
│   ├── weeklyReport.ts           helper reporte semanal
│   ├── household.ts              wrapper households tipado
│   └── ops/
│       ├── habitOps.ts
│       ├── goalOps.ts
│       └── workoutOps.ts
├── hooks/
│   ├── useApp.tsx                lang/theme/view + modales globales
│   ├── useAuth.tsx               sesión + namespace
│   ├── useStore.ts               useCollection
│   └── useInviteAutoAccept.tsx   auto-aceptar invite al boot
└── components/
    ├── AuthGate.tsx
    ├── ConfettiHost.tsx          + helper celebrate()
    ├── ModalsHost.tsx
    ├── Sidebar.tsx
    ├── Topbar.tsx
    ├── auth/LoginScreen.tsx
    ├── layouts/AppShell.tsx
    ├── ui/
    │   ├── Icon.tsx              27 iconos tipados
    │   ├── KPI.tsx               card animada
    │   └── EmptyState.tsx
    ├── views/
    │   ├── ViewToday.tsx
    │   ├── ViewFinance.tsx
    │   ├── ViewHabits.tsx
    │   ├── ViewGoals.tsx
    │   ├── ViewCalendar.tsx
    │   ├── ViewWorkouts.tsx
    │   └── ViewProgress.tsx
    └── modals/
        ├── AddTransactionModal.tsx
        ├── HabitEditModal.tsx
        ├── GoalEditModal.tsx
        ├── WorkoutLogModal.tsx
        ├── ProfileModal.tsx
        ├── SettingsPanel.tsx     (4 tabs: Prefs / Integraciones / Familia / Datos)
        ├── FamilyPanel.tsx
        ├── Onboarding.tsx
        ├── WeeklyReportModal.tsx
        └── CsvImportModal.tsx
```

### Líneas TSX/TS totales

- `src/lib`: ~2,100 líneas
- `src/hooks`: ~400 líneas
- `src/components`: ~7,500 líneas (UI + views + modals)
- `src/styles`: ~1,500 líneas CSS

---

## Smoke test E2E completado vía SQL (2026-05-28)

Dos `auth.users` sintéticos, simulación del flujo completo:

| Paso | Métrica | Esperado | Real |
|---|---|---:|---:|
| 1 | userA crea hábito + tx privada | 2 filas | 2 ✓ |
| 2 | userB sin acceso ve | 0 hábitos, 0 tx | 0/0 ✓ |
| 3 | userA crea household + invita + marca tx como shared | 1 hh + 2 shared + 1 priv | OK |
| 4 | userB tras `accept_invite()` ve | 2 shared, 0 priv leaked | 2/0 ✓ |
| 5 | Cleanup CASCADE | 0/0/0/0 | OK |

---

## Docs adicionales

- `docs/sync-contract.md` — contrato para el sync engine real del Bloque J/K
- `DEPLOY.md` — checklist para Cloudflare Pages (Bloque I)
- `.env.example` — plantilla de env vars

---

## Pendientes conocidos (Bloque I+ y posteriores)

- **Toggle "Compartir con familia"** en los modales CRUD (AddTransactionModal, HabitEditModal, GoalEditModal, WorkoutLogModal).
- **`<SharedPill>`** indicador visual en cards de items compartidos.
- **Filtros Míos/Familia/Todos** en Finance/Habits/Goals/Workouts.
- **`src/lib/syncEngine.ts`** real con pull al login + Realtime + push debounced.
- **`AutoCat`** sugerencia de categoría en AddTransactionModal.
- **Notificaciones Web** API + scheduling de habit reminders.
- **Strava/Google OAuth** flows en SettingsPanel → Integraciones.
- **PWA**: verificar manifest icons + offline cache + install prompt.

Todo esto está mapeado en el prompt del Bloque J. El estado actual ya es deployable y funcional para uso individual + household compartido vía SQL.

---

## Comandos rápidos

```powershell
# Local dev
pnpm dev                  # http://localhost:5173

# Build prod
pnpm build                # tsc + vite build → dist/

# Preview prod local
pnpm preview              # http://localhost:4173

# Limpiar todo y reseed
# En la consola del browser: localStorage.clear(); location.reload();
```

```sql
-- Supabase: cuántas filas tengo en cada tabla
SELECT 'vida_items' tbl, count(*) FROM vida_items
UNION ALL SELECT 'vida_singletons',   count(*) FROM vida_singletons
UNION ALL SELECT 'pending_events',    count(*) FROM pending_events
UNION ALL SELECT 'user_tokens',       count(*) FROM user_tokens
UNION ALL SELECT 'households',        count(*) FROM households
UNION ALL SELECT 'household_members', count(*) FROM household_members
UNION ALL SELECT 'household_invites', count(*) FROM household_invites;
```
