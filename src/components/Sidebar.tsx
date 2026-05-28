/**
 * src/components/Sidebar.tsx — Navegación lateral Quiet Almanac.
 *
 * Tres grupos: Principal (Hoy/Finanzas/Metas/Calendario), Salud (Hábitos/Entreno),
 * Reflexión (Progreso). El branding superior es un botón que vuelve a "Hoy",
 * el bloque de perfil inferior es un botón que abre el ProfileModal (Bloque F).
 *
 * Avatar dinámico (3 estados):
 *   - happy: si hay al menos un hábito con racha ≥ 5
 *   - low:   si hay un hábito "abandonado" (no hecho hoy y racha actual < best-5)
 *   - main:  caso por defecto
 *
 * Lee colecciones reactivamente vía useCollection — re-renderiza si cambian.
 */

import { Fragment } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon, type IconName } from "@/components/ui/Icon";
import { isDoneToday } from "@/lib";
import type { View } from "@/types";

interface NavEntry {
  id: View;
  icon: IconName;
  group: "main" | "health" | "meta";
}

const NAV: readonly NavEntry[] = [
  { id: "today",    icon: "sun",      group: "main"   },
  { id: "finance",  icon: "coin",     group: "main"   },
  { id: "habits",   icon: "leaf",     group: "health" },
  { id: "goals",    icon: "target",   group: "main"   },
  { id: "calendar", icon: "cal",      group: "main"   },
  { id: "workouts", icon: "dumbbell", group: "health" },
  { id: "progress", icon: "star",     group: "meta"   },
] as const;

type AvatarState = "main" | "happy" | "low";

function computeAvatarState(
  habits: ReturnType<typeof useCollection<"habits">>,
  preferred: AvatarState,
): AvatarState {
  // Si el usuario fijó manualmente algo distinto a "main", respetarlo.
  if (preferred !== "main") return preferred;
  const topStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  const hasBroken = habits.some(
    (h) => !isDoneToday(h) && (h.streak || 0) < (h.best || 0) - 5,
  );
  if (hasBroken) return "low";
  if (topStreak >= 5) return "happy";
  return "main";
}

export function Sidebar() {
  const { t, lang, view, setView, openProfile } = useApp();
  const habits = useCollection("habits");
  const user = useCollection("user");

  const groups: Array<{ key: NavEntry["group"]; label: string }> = [
    { key: "main",   label: t.nav_main   },
    { key: "health", label: t.nav_health },
    { key: "meta",   label: t.nav_meta   },
  ];

  const preferred = (user?.avatar as AvatarState | undefined) ?? "main";
  const avatarState = computeAvatarState(habits, preferred);
  const userName = user?.name ?? "—";

  return (
    <aside className="sidebar">
      <button
        type="button"
        onClick={() => setView("today")}
        className="brand"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
          width: "100%",
        }}
        title={lang === "es" ? "Ir a Hoy" : "Go to Today"}
      >
        <span className="brand-mark" aria-label="Vida logo" />
        <span className="brand-name">{t.appName}</span>
        <span className="brand-sub">{t.tagline}</span>
      </button>

      <nav className="nav">
        {groups.map((g) => (
          <Fragment key={g.key}>
            <div className="nav-section">{g.label}</div>
            {NAV.filter((n) => n.group === g.key).map((n) => {
              const active = view === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`nav-item ${active ? "active" : ""}`}
                  onClick={() => setView(n.id)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon name={n.icon} size={16} />
                  <span className="label-text">{t[n.id]}</span>
                  <span className="dot" />
                </button>
              );
            })}
          </Fragment>
        ))}
      </nav>

      <button
        type="button"
        onClick={openProfile}
        className="profile"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          padding: "10px 12px",
          width: "100%",
          borderRadius: 10,
        }}
        title={lang === "es" ? "Ver perfil" : "View profile"}
      >
        <div
          className="avatar-img"
          style={{ backgroundImage: `url("/assets/avatars/${avatarState}.png")` }}
          aria-label="avatar"
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{userName}</div>
          <div className="meta">{lang === "es" ? "ver perfil" : "view profile"}</div>
        </div>
      </button>
    </aside>
  );
}

export default Sidebar;
