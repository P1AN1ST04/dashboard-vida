/**
 * src/components/Topbar.tsx — Barra superior editorial.
 *
 * Contenido:
 *   - kicker (fecha completa en "Hoy", nombre de la vista en el resto)
 *   - h1 "here" (saludo personalizado en Hoy, título de la vista en el resto)
 *   - subtítulo italic Instrument Serif por vista (el "kicker_*" de cada módulo)
 *
 * Acciones (top-right):
 *   - botón brújula → abre Onboarding
 *   - toggle EN/ES
 *   - toggle light/dark
 *   - botón settings → abre SettingsPanel
 *
 * Acepta `extra` como slot para acciones contextuales por vista (ej. botón
 * "Nueva transacción" en Finanzas). Se renderiza antes de los toggles.
 */

import type { ReactNode } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { fmtDateShort, greeting } from "@/lib";
import type { View } from "@/types";

export interface TopbarProps {
  /** Acciones contextuales por vista, alineadas a la izquierda de los toggles. */
  extra?: ReactNode;
}

const DOW_ES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const DOW_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function viewKicker(view: View, t: ReturnType<typeof useApp>["t"]): string | "" {
  switch (view) {
    case "today":    return t.today_kicker;
    case "habits":   return t.habits_kicker;
    case "goals":    return t.goals_kicker;
    case "calendar": return t.cal_kicker;
    case "workouts": return t.workouts_kicker;
    case "progress": return t.progress_kicker;
    case "finance":  return "";
  }
}

export function Topbar({ extra }: TopbarProps) {
  const { t, lang, setLang, theme, setTheme, view, openOnboarding, openSettings } = useApp();
  const user = useCollection("user");

  const now = new Date();
  const dow = (lang === "es" ? DOW_ES : DOW_EN)[now.getDay()];
  const dateStr = `${dow.toUpperCase()} · ${fmtDateShort(now.toISOString(), lang).toUpperCase()} · ${now.getFullYear()}`;

  const firstName = (user?.name ?? "").split(" ")[0];
  const subKicker = viewKicker(view, t);

  return (
    <header className="topbar">
      <div>
        <div className="kicker" style={{ marginBottom: 4 }}>
          {view === "today" ? dateStr : t[view]}
        </div>
        <div className="crumbs">
          <div className="here">
            {view === "today" ? (
              <>
                {greeting(lang, t)}
                {firstName && (
                  <span className="italic" style={{ color: "var(--ink-3)" }}>
                    , {firstName}.
                  </span>
                )}
              </>
            ) : (
              t[view]
            )}
          </div>
        </div>
        {subKicker && view !== "today" && (
          <div
            className="meta italic"
            style={{
              marginTop: 4,
              fontFamily: "var(--font-display)",
              fontSize: 16,
              letterSpacing: 0,
              color: "var(--ink-3)",
            }}
          >
            {subKicker}
          </div>
        )}
      </div>

      <div className="top-actions">
        {extra}
        <button
          type="button"
          className="icon-btn"
          onClick={openOnboarding}
          aria-label="welcome"
          title={lang === "es" ? "Bienvenida" : "Welcome"}
        >
          <Icon name="compass" size={15} />
        </button>
        <div className="lang-toggle">
          <button
            type="button"
            className={lang === "en" ? "on" : ""}
            onClick={() => setLang("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={lang === "es" ? "on" : ""}
            onClick={() => setLang("es")}
          >
            ES
          </button>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="theme"
          title={lang === "es" ? "Tema" : "Theme"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={openSettings}
          aria-label="settings"
          title={lang === "es" ? "Ajustes" : "Settings"}
        >
          <Icon name="settings" size={15} />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
