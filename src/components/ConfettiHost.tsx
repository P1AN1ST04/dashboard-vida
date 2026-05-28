/**
 * src/components/ConfettiHost.tsx — Overlay efímero para celebraciones.
 *
 * El efecto visual lo entrega el CSS (.confetti-host.on define la animación
 * con pseudo-elementos en paleta Quiet Almanac: terracotta/sage/ochre/rust).
 * Este componente sólo escucha un CustomEvent global y togglea la clase.
 *
 * Disparar desde cualquier parte del código:
 *   import { celebrate } from "@/components/ConfettiHost";
 *   celebrate();           // ráfaga estándar
 *   celebrate({ duration: 4000 }); // más larga (achievement épico)
 *
 * Compatibilidad con el bundle legacy: también escucha "vida:celebrate"
 * lanzado con window.dispatchEvent, así que código viejo sigue funcionando.
 */

import { useEffect, useState } from "react";

const EVENT_NAME = "vida:celebrate";
const DEFAULT_DURATION = 2600;

interface CelebrateOptions {
  /** Duración del overlay en ms. Default 2600. */
  duration?: number;
}

interface CelebrateDetail {
  duration: number;
}

export function celebrate(opts: CelebrateOptions = {}): void {
  const detail: CelebrateDetail = { duration: opts.duration ?? DEFAULT_DURATION };
  window.dispatchEvent(new CustomEvent<CelebrateDetail>(EVENT_NAME, { detail }));
}

export function ConfettiHost() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let timeout: number | null = null;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;

    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<CelebrateDetail | undefined>).detail;
      const duration = detail?.duration ?? DEFAULT_DURATION;

      // Apagar primero, luego prender en el siguiente frame para que la
      // animación CSS reinicie aunque ya estuviera activa.
      setOn(false);
      if (timeout !== null) window.clearTimeout(timeout);
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);

      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setOn(true));
      });
      timeout = window.setTimeout(() => setOn(false), duration);
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      if (timeout !== null) window.clearTimeout(timeout);
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, []);

  return <div className={`confetti-host ${on ? "on" : ""}`} aria-hidden="true" />;
}

export default ConfettiHost;
