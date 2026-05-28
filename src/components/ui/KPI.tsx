/**
 * src/components/ui/KPI.tsx — Card editorial Quiet Almanac.
 *
 * Renderiza una métrica: label (kicker mono), value (Instrument Serif grande),
 * delta opcional (sage si sube, danger si baja), y sparkline opcional.
 *
 * Si `value` es un número, anima 0 → value con requestAnimationFrame en ~600ms
 * con easing ease-out cúbico. Para strings (ej. "S/ 1,240"), se muestra tal cual.
 *
 * Uso:
 *   <KPI label={t.income_month} value={income} suffix="S/" delta={12} />
 *   <KPI label="Racha" value={`${streak} ${t.streak_days}`} accent="var(--sage)" />
 */

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export interface KPIProps {
  label: ReactNode;
  /** Si es number, se anima al montar; si es string, se muestra tal cual. */
  value: number | string;
  /** Suffix mostrado en pequeño después del value (ej. "S/", "kg"). */
  suffix?: ReactNode;
  /** Porcentaje vs período anterior. >=0 muestra ↑, <0 muestra ↓. */
  delta?: number;
  /** Path SVG para sparkline en la esquina (viewBox 120×36). */
  sparkPath?: string;
  /** Color del trazo del spark. Default var(--terracotta). */
  accent?: string;
  /** Decimales para el número animado. Default 0. */
  decimals?: number;
  /** Texto descriptivo del delta (por i18n). Default "vs last month". */
  deltaLabel?: string;
  /** Desactiva la animación si el caller no la quiere. */
  animateOnMount?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Ease-out cubic — buena curva editorial: arranca rápido y aterriza suave. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function formatNumber(n: number, decimals: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function KPI({
  label,
  value,
  suffix,
  delta,
  sparkPath,
  accent,
  decimals = 0,
  deltaLabel = "vs last month",
  animateOnMount = true,
  className,
  style,
}: KPIProps) {
  const isNumeric = typeof value === "number";
  const target = isNumeric ? (value as number) : 0;
  const [displayed, setDisplayed] = useState<number>(animateOnMount && isNumeric ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animateOnMount || !isNumeric) {
      setDisplayed(target);
      return;
    }
    const start = performance.now();
    const duration = 600;
    const from = 0;
    const to = target;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      setDisplayed(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // El target puede cambiar (datos refrescados), reanimar desde 0 podría
    // ser molesto — solo animamos al montar, no en cada cambio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rendered =
    isNumeric ? formatNumber(displayed, decimals) : (value as string);

  return (
    <div className={`kpi${className ? " " + className : ""}`} style={style}>
      <div className="label">{label}</div>
      <div className="value">
        {rendered}
        {suffix !== undefined && suffix !== "" && <small> {suffix}</small>}
      </div>
      {typeof delta === "number" && (
        <div className={`delta ${delta >= 0 ? "up" : "down"}`}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% {deltaLabel}
        </div>
      )}
      {sparkPath && (
        <svg width={120} height={36} viewBox="0 0 120 36" className="spark" aria-hidden="true">
          <path d={sparkPath} fill="none" stroke={accent || "var(--terracotta)"} strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
}

export default KPI;
