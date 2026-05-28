/**
 * src/lib/supabase.ts — Cliente Supabase singleton.
 *
 * Variables de entorno requeridas (en .env.local, no en git):
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ... (anon/public)
 *
 * El cliente persiste la sesión en localStorage automáticamente
 * y refresca tokens en background. Es seguro importarlo desde cualquier módulo.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * En desarrollo queremos que el dashboard pueda arrancar sin Supabase
 * configurado (modo offline / namespace 'default'). Si faltan las vars
 * exponemos un cliente nulo y dejamos que el resto del sistema decida.
 *
 * En producción (build) lanzamos error para evitar deploys silenciosamente
 * rotos.
 */
const isConfigured = Boolean(url && anonKey);

if (!isConfigured && import.meta.env.PROD) {
  // En prod sí queremos hacer ruido
  throw new Error(
    "Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY antes del build.",
  );
}

if (!isConfigured && import.meta.env.DEV) {
  console.warn(
    "[supabase] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no definidas.\n" +
      "          La app correrá en modo offline (namespace 'default').\n" +
      "          Copia .env.example a .env.local para activar auth.",
  );
}

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Storage por defecto = localStorage. Lo dejamos así para que
        // funcione tanto en navegador como en PWA instalada.
        storageKey: "vida.auth.v1",
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

/**
 * Resuelve el cliente o lanza un error útil. Usar dentro de funciones
 * de auth que asumen Supabase disponible. Para chequeos preventivos
 * usar isSupabaseConfigured().
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Esta acción requiere VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}
