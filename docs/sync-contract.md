# Sync contract — schema multi-user + RLS bridge

Documento de referencia para **`src/lib/sync-engine.ts`** (Bloque E). Describe el contrato exacto entre el cliente Vite y el backend Supabase para Vida.

> Estado: Bloque D completado el 2026-05-27. Schema, RLS, triggers y RPCs desplegados a `vida-prod` (`tcpbqfzclmzhujjsifgc`, us-west-1). Edge Functions actualizadas a v3/v5.

---

## Modelo conceptual

Dos identidades coexisten en la misma fila de `vida_*`:

| Columna | Origen | Cuándo se llena |
|---|---|---|
| `user_id UUID` | `auth.users.id` (JWT) | Cliente web con sesión Supabase. Trigger lo rellena auto desde `auth.uid()` si el cliente no lo manda. |
| `user_token TEXT` | Secret estático del usuario | Apple Shortcuts, webhooks externos. Vinculado a `user_id` vía la tabla `user_tokens`. |

**Una fila puede tener uno, ambos, o ninguno (legacy)**. Las políticas RLS aceptan cualquier vía de identidad.

---

## Tablas

### `public.user_tokens` (nueva en Bloque D)

```text
id            BIGSERIAL PK
user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
user_token    TEXT NOT NULL UNIQUE
device_label  TEXT (ej: "PC", "iPhone", "iPad")
created_at    TIMESTAMPTZ DEFAULT now()
last_seen_at  TIMESTAMPTZ
```

RLS: solo el dueño (`auth.uid() = user_id`) puede SELECT/INSERT/UPDATE/DELETE.

### `public.vida_items`, `public.vida_singletons`, `public.pending_events`

Tras Bloque D **todas tienen** `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` (nullable, indexed).

Políticas RLS idénticas en las 3 (rol `authenticated`):

```sql
USING (user_id = auth.uid() OR public.token_belongs_to_me(user_token))
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND (user_token IS NULL OR public.token_belongs_to_me(user_token))
)
```

`token_belongs_to_me(token)` es `STABLE SECURITY DEFINER` y devuelve `true` si el token figura en `user_tokens` vinculado al `auth.uid()` actual.

El trigger `vida_autofill_user_id` rellena `NEW.user_id := auth.uid()` automáticamente cuando el cliente con JWT inserta sin especificar.

---

## RPCs disponibles

### `claim_user_token(token TEXT, device_label TEXT DEFAULT NULL) → JSONB`

Vincula un `user_token` al `auth.uid()` actual y backfillea filas legacy. Idempotente; refresca `last_seen_at`. Lanza `42501` si el token ya pertenece a otro usuario.

Respuesta:

```json
{
  "user_id": "uuid",
  "user_token": "vida_...",
  "backfilled": {
    "vida_items": 29,
    "vida_singletons": 2,
    "pending_events": 0
  }
}
```

---

## Contrato cliente Vite ↔ Supabase

`sync-engine.ts` debe seguir **uno de estos dos caminos**:

### Camino A — Cliente directo a PostgREST (recomendado para web)

```ts
import { supabase } from "@/lib/supabase";

// Pull
const { data: items } = await supabase
  .from("vida_items")
  .select("*")
  .gt("updated_at", lastSyncAt)
  .order("updated_at", { ascending: true });

// Push
await supabase
  .from("vida_items")
  .upsert(rows, { onConflict: "user_token,collection,item_id" });
// El trigger pone user_id = auth.uid() automaticamente.
// Las RLS bloquean si intentas escribir con user_token ajeno.
```

**No incluyas `user_id` en el body** — lo pone el trigger. **No incluyas `user_token`** salvo que estés escribiendo desde un device con shortcut vinculado y quieras dual-track. Para Vida web normal, dejar `user_token = null` y `user_id` lo hace el trigger.

### Camino B — Edge Function `data-sync` (recomendado para Shortcuts; opcional para web)

`POST /functions/v1/data-sync/push` con body:

```json
{
  "token": "vida_xxx",
  "items": [{ "collection": "transactions", "item_id": "...", "data": {...}, "updated_at": "..." }],
  "singletons": { "settings": { "data": {...}, "updated_at": "..." } }
}
```

Si además mandas `Authorization: Bearer <supabase-access-token>`, la function prioriza ese `user_id` (del JWT) sobre el lookup por token. Esto cierra el caso "PC logueado + Shortcut sin reclamar" — el dato queda atribuido a la cuenta correcta de una vez.

### Vincular Shortcuts existentes a la cuenta web

Al primer login del usuario, ofrecer en Ajustes → Integraciones un input con el `shortcutsToken` que el usuario ya tenía localmente. Llamar:

```ts
const { data, error } = await supabase.rpc("claim_user_token", {
  token: settings.shortcutsToken,
  device_label: "PC",
});
// data.backfilled muestra cuántas filas se rescataron.
```

---

## Resultados de verificación (Bloque D)

Tests con dos `auth.uid()` sintéticos sobre las 127 filas legacy reales (3 tokens distintos):

| Escenario | `vida_items` visible | `vida_singletons` | `user_tokens` |
|---|---:|---:|---:|
| `anon` (sin JWT) | 0 | 0 | 0 |
| `userA` sin claim | 0 | 0 | 0 |
| `userA` tras `claim_user_token(token1)` + `claim_user_token(token2)` | 58 | 4 | 2 |
| `userB` tras `claim_user_token(token3)` | 69 | 3 | 1 |
| `userB` intenta `claim_user_token(token1)` | ❌ `42501 token ya vinculado a otro usuario` | | |

Cleanup post-test: 127/127 unclaimed restaurados, `auth.users` y `user_tokens` vacíos.

---

## Pendiente para Bloque E

1. Implementar `src/lib/sync-engine.ts` siguiendo el **Camino A** para todas las colecciones.
2. UI en Ajustes para listar/vincular/desvincular `user_tokens` (llamar `claim_user_token`, `DELETE FROM user_tokens`).
3. Indicador visual en el sidebar de "última sincronización" basado en `data-sync` response `server_time`.
4. Migración local: al primer login con Supabase, mover los datos del namespace `default` (Bloque C) al `user_id` vía PostgREST upserts. El helper `Storage.migrateDefaultTo()` ya existe en local; lo análogo en remoto es simplemente subir todo con `upsert`.
