/**
 * src/components/ui/Icon.tsx — Iconos line-art Lucide-style.
 *
 * Portados 1:1 del bundle legacy (dashboard-vida-source/src/icons.jsx) pero
 * con `IconName` tipado como union para autocompletado. Stroke siempre
 * con currentColor → hereda del padre (color en CSS), no se hardcodea.
 *
 * Uso:
 *   <Icon name="sun" />
 *   <Icon name="coin" size={24} className="kpi-icon" />
 */

import type { CSSProperties, SVGProps } from "react";

export type IconName =
  | "sun" | "moon"
  | "coin" | "leaf" | "target"
  | "cal" | "dumbbell" | "star"
  | "plus" | "check" | "x"
  | "search" | "bell" | "chev"
  | "arrowup" | "arrowdown"
  | "flame" | "compass" | "settings"
  | "spark" | "book" | "tide" | "map"
  | "edit" | "pause" | "play" | "trash"
  | "filter" | "refresh";

export interface IconProps {
  name: IconName;
  /** Tamaño en px (cuadrado). Default 16. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Para casos donde uno quiere un color literal (no recomendado, prefiere CSS). */
  color?: string;
  /** Pasa props extra al <svg> raíz si es necesario (aria, role, etc). */
  svgProps?: Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "fill" | "stroke">;
}

export function Icon({
  name,
  size = 16,
  className,
  style,
  color = "currentColor",
  svgProps,
}: IconProps) {
  const base: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style,
    ...svgProps,
  };

  switch (name) {
    case "sun":       return <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7" /></svg>;
    case "moon":      return <svg {...base}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
    case "coin":      return <svg {...base}><circle cx="12" cy="12" r="8" /><path d="M9 9c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1 1.5-3 2-3 1-3 2 1.3 1.8 3 1.8 3-.8 3-1.8" /><path d="M12 6.5v11" /></svg>;
    case "leaf":      return <svg {...base}><path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14z" /><path d="M5 19c4-4 7-7 14-14" /></svg>;
    case "target":    return <svg {...base}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>;
    case "cal":       return <svg {...base}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3.5v3M16 3.5v3" /></svg>;
    case "dumbbell":  return <svg {...base}><path d="M3 9v6M6 6v12M18 6v12M21 9v6M9 12h6" /><rect x="6" y="9" width="3" height="6" rx="0.5" /><rect x="15" y="9" width="3" height="6" rx="0.5" /></svg>;
    case "star":      return <svg {...base}><path d="M12 3.5l2.6 5.5 6 .9-4.3 4.3 1 6-5.3-2.8L6.7 20.2l1-6L3.4 9.9l6-.9z" /></svg>;
    case "plus":      return <svg {...base}><path d="M12 5v14M5 12h14" /></svg>;
    case "check":     return <svg {...base}><path d="M5 12l4.5 4.5L19 7" /></svg>;
    case "x":         return <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "search":    return <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.7-3.7" /></svg>;
    case "bell":      return <svg {...base}><path d="M6 9a6 6 0 0 1 12 0v3l1.5 3h-15L6 12z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
    case "chev":      return <svg {...base}><path d="M9 6l6 6-6 6" /></svg>;
    case "arrowup":   return <svg {...base}><path d="M7 14l5-5 5 5" /></svg>;
    case "arrowdown": return <svg {...base}><path d="M7 10l5 5 5-5" /></svg>;
    case "flame":     return <svg {...base}><path d="M12 3c1 3 3 4 3 7 0 2-1 3-1 4a2 2 0 1 0 4 0c0-3-2-5-2-7 0 0 3 2 3 6a7 7 0 0 1-14 0c0-4 3-5 3-9 1 1 2 2 4 -1z" /></svg>;
    case "compass":   return <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5L13.5 13.5 8.5 15.5 10.5 10.5z" fill="currentColor" stroke="none" /></svg>;
    case "settings":  return <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.1l1.7-1.3-1.6-2.8-2 .7a7 7 0 0 0-2-1.1l-.3-2.1h-3.3l-.3 2.1a7 7 0 0 0-2 1.1l-2-.7-1.6 2.8 1.7 1.3a7 7 0 0 0 0 2.2L3.4 14.4l1.6 2.8 2-.7a7 7 0 0 0 2 1.1l.3 2.1h3.3l.3-2.1a7 7 0 0 0 2-1.1l2 .7 1.6-2.8-1.7-1.3c.05-.4.1-.7.1-1.1z" /></svg>;
    case "spark":     return <svg {...base}><path d="M2 18l4-7 4 4 5-9 4 6 3-3" /></svg>;
    case "book":      return <svg {...base}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>;
    case "tide":      return <svg {...base}><path d="M3 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" /><path d="M3 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" /></svg>;
    case "map":       return <svg {...base}><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "edit":      return <svg {...base}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" /></svg>;
    case "pause":     return <svg {...base}><rect x="6" y="5" width="4" height="14" rx="0.5" /><rect x="14" y="5" width="4" height="14" rx="0.5" /></svg>;
    case "play":      return <svg {...base}><path d="M6 4v16l14-8z" fill="currentColor" /></svg>;
    case "trash":     return <svg {...base}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M10 11v6M14 11v6" /></svg>;
    case "filter":    return <svg {...base}><path d="M3 5h18l-7 9v6l-4-2v-4z" /></svg>;
    case "refresh":   return <svg {...base}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></svg>;
    default: {
      // Exhaustiveness check: TypeScript marcará error si agregamos un IconName y olvidamos un caso.
      const _exhaustive: never = name;
      void _exhaustive;
      return null;
    }
  }
}

export default Icon;
