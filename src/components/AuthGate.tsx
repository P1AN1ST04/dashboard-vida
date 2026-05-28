/**
 * src/components/AuthGate.tsx — Gate que decide qué se monta según auth.
 *
 *   status === "loading"        → spinner editorial
 *   status === "anonymous"      → <LoginScreen />
 *   status === "authenticated"  → children (la app)
 *   status === "offline"        → children (la app, namespace 'default')
 */

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/hooks/useApp";
import { LoginScreen } from "./auth/LoginScreen";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { status } = useAuth();
  const { t } = useApp();

  if (status === "loading") {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <div className="auth-loading-mark" aria-hidden="true" />
        <p className="auth-loading-text">{t.auth_loading}</p>
      </div>
    );
  }

  if (status === "anonymous") {
    return <LoginScreen />;
  }

  // authenticated | offline → render normal
  return <>{children}</>;
}
