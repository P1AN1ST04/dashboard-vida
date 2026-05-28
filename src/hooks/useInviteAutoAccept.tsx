/**
 * src/hooks/useInviteAutoAccept.tsx — Acepta automáticamente invitaciones de household.
 *
 * Fuentes en orden de prioridad:
 *   1. user.user_metadata.invite_token (Supabase Auth lo pasa cuando el invitado
 *      hace click en el magic link → signup → metadata viaja en el JWT).
 *   2. ?invite=<token> en la URL (fallback si magic link redirigió pero el
 *      metadata se perdió).
 *
 * Se ejecuta una sola vez por sesión autenticada. El token se limpia de la URL
 * y se borra del user_metadata después de aceptar.
 */

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { Household, supabase } from "@/lib";

const ACCEPTED_KEY = "vida.invite.lastAccepted";

export function useInviteAutoAccept(
  onResult?: (result: { householdId: string | null; error: string | null }) => void,
) {
  const { status, user } = useAuth();
  const ranFor = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    // 1. token de URL (?invite=...)
    let token: string | undefined;
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("invite");
      if (t && t.length >= 16) token = t;
    } catch { /* ignore */ }

    // 2. token de user_metadata
    if (!token) {
      const t = user.user_metadata?.invite_token as string | undefined;
      if (t && t.length >= 16) token = t;
    }

    if (!token) return;
    if (ranFor.current.has(token)) return;
    // Evitar doble proceso entre reloads del mismo browser tab
    if (localStorage.getItem(ACCEPTED_KEY) === token) return;
    ranFor.current.add(token);

    (async () => {
      const { data, error } = await Household.acceptInvite(token!);
      if (error) {
        onResult?.({ householdId: null, error: error.message });
        return;
      }
      onResult?.({ householdId: data, error: null });
      localStorage.setItem(ACCEPTED_KEY, token!);

      // Limpiar ?invite= de la URL para no re-procesarlo en F5.
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("invite")) {
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
        }
      } catch { /* ignore */ }

      // Limpiar el metadata en Supabase para no dejar residuos.
      try {
        if (supabase) {
          await supabase.auth.updateUser({
            data: { invite_token: null, invite_household_id: null },
          });
        }
      } catch { /* ignore */ }
    })();
  }, [status, user, onResult]);
}
