/**
 * src/components/ui/EmptyState.tsx — Estado vacío reutilizable.
 *
 * Patrón consistente para vistas y listas sin datos:
 *   - emoji/ícono grande
 *   - título editorial (Instrument Serif)
 *   - descripción (max 380px)
 *   - CTA opcional
 *
 * Reemplaza las copias inline en ViewHabits, ViewGoals, ViewWorkouts.
 */

import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Emoji o nodo cualquiera (ej. <Icon name="..." size={48} />) */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** CTA opcional: típicamente <button className="btn warm">…</button> */
  cta?: ReactNode;
  /** Si la vista debe envolverse en .card padded, default true */
  asCard?: boolean;
  /** Padding en px (cuando asCard=true). Default 60. */
  padding?: number;
}

export function EmptyState({
  icon,
  title,
  description,
  cta,
  asCard = true,
  padding = 60,
}: EmptyStateProps) {
  const inner = (
    <>
      {icon && (
        <div style={{ fontSize: 64, marginBottom: 16 }}>{icon}</div>
      )}
      <div className="serif" style={{ fontSize: 28, marginBottom: 8 }}>
        {title}
      </div>
      {description && (
        <div
          className="meta"
          style={{
            fontSize: 15, marginBottom: cta ? 24 : 0,
            maxWidth: 380, margin: cta ? "0 auto 24px" : "0 auto",
          }}
        >
          {description}
        </div>
      )}
      {cta}
    </>
  );

  if (!asCard) {
    return <div style={{ textAlign: "center", padding }}>{inner}</div>;
  }
  return (
    <div className="card" style={{ padding, textAlign: "center" }}>
      {inner}
    </div>
  );
}

export default EmptyState;
