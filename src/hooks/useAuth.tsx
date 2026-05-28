/**
 * src/hooks/useAuth.tsx — AuthProvider + useAuth hook.
 *
 * Estado expuesto:
 *   status:
 *     - "loading"        → comprobando sesión al boot
 *     - "anonymous"      → sin sesión, mostrar login
 *     - "authenticated"  → sesión válida, namespace = supabaseUser.id
 *     - "offline"        → el usuario eligió "continuar sin cuenta",
 *                          namespace = 'default'. Útil para modo local-only.
 *
 *   user, session: del SDK de Supabase. null en anonymous/offline.
 *
 * El provider se encarga de:
 *   1. Leer la sesión inicial al montar.
 *   2. Suscribirse a onAuthStateChange (Supabase refresca tokens solo).
 *   3. Mover Storage.setUserId() cuando cambia el usuario.
 *   4. Disparar Storage.migrateDefaultTo() la primera vez que entra un user.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  Auth,
  type AuthError,
  type AuthResult,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth";
import { Storage } from "@/lib/storage";
import { runSeed } from "@/lib/seed";

export type AuthStatus = "loading" | "anonymous" | "authenticated" | "offline";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
  /** True si VITE_SUPABASE_* están definidas. UI debe esconder login si false. */
  isConfigured: boolean;

  signIn: (email: string, password: string) => Promise<AuthResult<AuthSession>>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<AuthResult<AuthSession>>;
  signInMagic: (email: string) => Promise<AuthResult<true>>;
  signOut: () => Promise<void>;
  /** Usa la app sin cuenta. Namespace = 'default'. */
  continueOffline: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

const OFFLINE_FLAG_KEY = "vida.auth.offline";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const isConfigured = Auth.isConfigured();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Evitar migrar dos veces para el mismo userId en la misma sesión de tab.
  const migratedFor = useRef<Set<string>>(new Set());

  // Aplica una sesión recién recibida (login, refresh, init) al storage local.
  const applySession = useCallback((s: AuthSession | null) => {
    if (s?.user) {
      const uid = s.user.id;
      Storage.setUserId(uid);
      // Migración suave: solo si nunca migramos para este uid en este tab.
      if (!migratedFor.current.has(uid)) {
        try {
          Storage.migrateDefaultTo(uid);
        } catch (err) {
          console.warn("[auth] migrateDefaultTo falló", err);
        }
        migratedFor.current.add(uid);
      }
      // Asegurar que el namespace tenga seeds mínimos (user, settings, achievements).
      try {
        runSeed({
          user: {
            name: (s.user.user_metadata?.full_name as string) || s.user.email?.split("@")[0] || "Usuario",
            email: s.user.email,
          },
        });
      } catch (err) {
        console.warn("[auth] runSeed falló", err);
      }
      setSession(s);
      setUser(s.user);
      setStatus("authenticated");
      localStorage.removeItem(OFFLINE_FLAG_KEY);
    } else {
      // Sin sesión: respetar elección previa de "offline" si existe.
      const wasOffline = localStorage.getItem(OFFLINE_FLAG_KEY) === "1";
      Storage.setUserId(Storage.DEFAULT_USER_ID);
      setSession(null);
      setUser(null);
      setStatus(wasOffline ? "offline" : "anonymous");
      if (wasOffline) {
        // Asegurar seeds en el namespace default
        try { runSeed(); } catch { /* noop */ }
      }
    }
  }, []);

  // Boot: leer sesión inicial.
  useEffect(() => {
    let cancelled = false;

    if (!isConfigured) {
      // Sin Supabase, forzamos offline silenciosamente.
      Storage.setUserId(Storage.DEFAULT_USER_ID);
      try { runSeed(); } catch { /* noop */ }
      setStatus("offline");
      return;
    }

    Auth.getCurrentSession().then(({ data }) => {
      if (cancelled) return;
      applySession(data);
    });

    const unsubscribe = Auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") {
        migratedFor.current.clear();
      }
      applySession(s);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isConfigured, applySession]);

  // ──────────────────────────────────────────────────────────────
  // Acciones expuestas
  // ──────────────────────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await Auth.signInWithPassword(email, password);
    // onAuthStateChange aplicará la sesión; nada más que hacer aquí.
    return res;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const res = await Auth.signUpWithPassword(email, password, fullName);
      return res;
    },
    [],
  );

  const signInMagic = useCallback(async (email: string) => {
    const res = await Auth.signInWithMagicLink(email);
    return res;
  }, []);

  const signOut = useCallback(async () => {
    // Si estamos en offline, basta con limpiar el flag y volver a anonymous.
    if (status === "offline") {
      localStorage.removeItem(OFFLINE_FLAG_KEY);
      if (isConfigured) {
        setStatus("anonymous");
      } else {
        // Sin Supabase no hay "anonymous" útil; quedamos en offline.
        // Borramos el flag por higiene pero el status sigue siendo offline
        // hasta que el usuario refresque.
        setStatus("offline");
      }
      return;
    }
    await Auth.signOut();
    // applySession se disparará por onAuthStateChange (SIGNED_OUT).
    // Si Supabase no estaba configurado, forzamos manualmente.
    if (!isConfigured) applySession(null);
  }, [status, isConfigured, applySession]);

  const continueOffline = useCallback(() => {
    localStorage.setItem(OFFLINE_FLAG_KEY, "1");
    Storage.setUserId(Storage.DEFAULT_USER_ID);
    try { runSeed(); } catch { /* noop */ }
    setSession(null);
    setUser(null);
    setStatus("offline");
  }, []);

  const value: AuthContextValue = {
    status,
    user,
    session,
    isConfigured,
    signIn,
    signUp,
    signInMagic,
    signOut,
    continueOffline,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Re-exports para consumidores que solo quieren tipos.
export type { AuthError, AuthSession, AuthUser };
