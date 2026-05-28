/**
 * src/lib/auth.ts — Wrapper tipado sobre supabase.auth.
 *
 * Objetivo: aislar al resto de la app de la API cruda de Supabase y
 * exponer un contrato pequeño y predecible:
 *   - Funciones que devuelven { data, error } con error: AuthError | null
 *   - Mensajes de error traducibles (key + params), no strings hardcodeados
 *   - Tipos de retorno explícitos para no leaks de tipos del SDK
 */

import type {
  AuthChangeEvent,
  AuthError as SupabaseAuthError,
  Session,
  Subscription,
  User as SupabaseUser,
} from "@supabase/supabase-js";

import { requireSupabase, isSupabaseConfigured } from "./supabase";

// ──────────────────────────────────────────────────────────────
// Tipos públicos
// ──────────────────────────────────────────────────────────────

/** Error normalizado. La UI usa `key` para i18n; `message` es fallback. */
export interface AuthError {
  /** Clave estable para mapear a i18n. */
  key:
    | "invalid_credentials"
    | "email_taken"
    | "weak_password"
    | "rate_limited"
    | "not_configured"
    | "network"
    | "unknown";
  /** Mensaje crudo del SDK, útil para debugging. */
  message: string;
  /** Status HTTP si existe. */
  status?: number;
}

export interface AuthResult<T> {
  data: T | null;
  error: AuthError | null;
}

export type AuthSession = Session;
export type AuthUser = SupabaseUser;

// ──────────────────────────────────────────────────────────────
// Mapper de errores Supabase → AuthError
// ──────────────────────────────────────────────────────────────

function mapError(err: SupabaseAuthError | Error | null): AuthError | null {
  if (!err) return null;
  const message = err.message || "Error desconocido";
  const status = "status" in err ? (err as SupabaseAuthError).status : undefined;
  const lower = message.toLowerCase();

  let key: AuthError["key"] = "unknown";
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    key = "invalid_credentials";
  } else if (lower.includes("already registered") || lower.includes("user already")) {
    key = "email_taken";
  } else if (lower.includes("password") && lower.includes("weak")) {
    key = "weak_password";
  } else if (lower.includes("password") && lower.includes("characters")) {
    key = "weak_password";
  } else if (lower.includes("rate limit") || status === 429) {
    key = "rate_limited";
  } else if (lower.includes("fetch") || lower.includes("network")) {
    key = "network";
  }

  return { key, message, status };
}

function notConfiguredError(): AuthError {
  return {
    key: "not_configured",
    message: "Supabase no está configurado (falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
  };
}

// ──────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────

/** Devuelve la sesión actual leyendo del storage del cliente Supabase. */
export async function getCurrentSession(): Promise<AuthResult<AuthSession>> {
  if (!isSupabaseConfigured()) return { data: null, error: null };
  try {
    const { data, error } = await requireSupabase().auth.getSession();
    return { data: data.session, error: mapError(error) };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult<AuthSession>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { data: data.session, error: mapError(error) };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResult<AuthSession>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const { data, error } = await requireSupabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    return { data: data.session, error: mapError(error) };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

/** Envía magic link al email. Devuelve data:true si fue aceptado. */
export async function signInWithMagicLink(
  email: string,
): Promise<AuthResult<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const { error } = await requireSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    return { data: error ? null : true, error: mapError(error) };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function signOut(): Promise<AuthResult<true>> {
  if (!isSupabaseConfigured()) return { data: true, error: null };
  try {
    const { error } = await requireSupabase().auth.signOut();
    return { data: error ? null : true, error: mapError(error) };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

/**
 * Suscribe a cambios de auth. Devuelve función para desuscribir.
 *
 * Eventos relevantes: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: AuthSession | null) => void,
): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const sub: { subscription: Subscription } = requireSupabase().auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    },
  ).data;
  return () => sub.subscription.unsubscribe();
}

export const Auth = {
  getCurrentSession,
  signInWithPassword,
  signUpWithPassword,
  signInWithMagicLink,
  signOut,
  onAuthStateChange,
  isConfigured: isSupabaseConfigured,
} as const;
