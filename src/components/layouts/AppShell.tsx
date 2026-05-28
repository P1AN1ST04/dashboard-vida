/**
 * src/components/layouts/AppShell.tsx — Composición del shell de la app.
 *
 * Layout grid (definido en global.css):
 *   .app  → grid-template-columns: 232px 1fr;
 *     <Sidebar />  ← columna izquierda, sticky
 *     <main>
 *       <Topbar />
 *       {children}  ← la vista activa
 *     </main>
 *   <ConfettiHost />  ← sibling overlay
 *
 * AppShell se monta DENTRO de AuthGate (solo se ve cuando hay sesión o offline).
 * Recibe únicamente `children` — los providers (AppProvider/AuthProvider)
 * deben envolverlo desde fuera.
 */

import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar, type TopbarProps } from "@/components/Topbar";
import { ConfettiHost } from "@/components/ConfettiHost";
import { useApp } from "@/hooks/useApp";

export interface AppShellProps {
  children: ReactNode;
  /** Acciones contextuales pasadas al Topbar (ej. botón "Nueva transacción"). */
  topbarExtra?: TopbarProps["extra"];
}

export function AppShell({ children, topbarExtra }: AppShellProps) {
  const { view } = useApp();
  return (
    <>
      <div className="app" data-screen-label={`01 ${view}`}>
        <Sidebar />
        <main style={{ minWidth: 0 }}>
          <Topbar extra={topbarExtra} />
          {children}
        </main>
      </div>
      <ConfettiHost />
    </>
  );
}

export default AppShell;
