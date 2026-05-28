/**
 * App.tsx — Composición raíz.
 *
 *   <AppProvider>          contexto lang/theme/view + estado de modales globales
 *     <AuthProvider>       sesión Supabase + namespace de storage
 *       <AuthGate>         loading / login / contenido
 *         <Authenticated>  AppShell + ViewSwitch + ModalsHost + auto-accept
 *       </AuthGate>
 *     </AuthProvider>
 *   </AppProvider>
 */

import { useCallback, useState } from "react";
import { AppProvider, useApp } from "@/hooks/useApp";
import { AuthProvider } from "@/hooks/useAuth";
import { useInviteAutoAccept } from "@/hooks/useInviteAutoAccept";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/layouts/AppShell";
import { ModalsHost } from "@/components/ModalsHost";

import { ViewToday }    from "@/components/views/ViewToday";
import { ViewFinance }  from "@/components/views/ViewFinance";
import { ViewHabits }   from "@/components/views/ViewHabits";
import { ViewGoals }    from "@/components/views/ViewGoals";
import { ViewCalendar } from "@/components/views/ViewCalendar";
import { ViewWorkouts } from "@/components/views/ViewWorkouts";
import { ViewProgress } from "@/components/views/ViewProgress";

import type { View } from "@/types";
import type { ComponentType } from "react";

const VIEWS: Record<View, ComponentType> = {
  today:    ViewToday,
  finance:  ViewFinance,
  habits:   ViewHabits,
  goals:    ViewGoals,
  calendar: ViewCalendar,
  workouts: ViewWorkouts,
  progress: ViewProgress,
};

function ViewSwitch() {
  const { view } = useApp();
  const Active = VIEWS[view];
  return <Active />;
}

function InviteToast({ kind, text, onClose }: { kind: "success" | "error"; text: string; onClose: () => void }) {
  return (
    <div
      role="alert"
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 1000, padding: "10px 16px", borderRadius: 8,
        background: kind === "success" ? "var(--sage-soft)" : "oklch(95% 0.04 25)",
        color:      kind === "success" ? "var(--sage)" : "var(--danger)",
        border: `1px solid ${kind === "success" ? "var(--sage)" : "var(--danger)"}`,
        fontSize: 13.5, fontFamily: "var(--font-body)",
        boxShadow: "var(--shadow-lift)",
        display: "flex", gap: 10, alignItems: "center",
      }}
    >
      <span>{kind === "success" ? "✓" : "!"}</span>
      <span>{text}</span>
      <button
        type="button"
        onClick={onClose}
        style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 6 }}
        aria-label="close"
      >×</button>
    </div>
  );
}

function Authenticated() {
  const { lang } = useApp();
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const onInvite = useCallback((result: { householdId: string | null; error: string | null }) => {
    if (result.error) {
      setToast({ kind: "error", text: lang === "es" ? `Invitación: ${result.error}` : `Invite: ${result.error}` });
    } else if (result.householdId) {
      setToast({
        kind: "success",
        text: lang === "es" ? "¡Te uniste a la familia!" : "You joined the family!",
      });
    }
    if (result.householdId || result.error) {
      window.setTimeout(() => setToast(null), 5000);
    }
  }, [lang]);

  useInviteAutoAccept(onInvite);

  return (
    <>
      <AppShell>
        <ViewSwitch />
      </AppShell>
      <ModalsHost />
      {toast && (
        <InviteToast kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <AuthGate>
          <Authenticated />
        </AuthGate>
      </AuthProvider>
    </AppProvider>
  );
}
