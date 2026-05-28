/**
 * src/components/views/ViewProgress.tsx — Constelación + stats + timeline.
 *
 * Portado de view-progress.jsx. Achievements desde Storage.get("achievements"),
 * stars hardcoded (coordenadas decorativas), timeline hardcoded como en legacy
 * — ambos se derivarán de eventos reales en bloques posteriores.
 */

import { useMemo } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { celebrate } from "@/components/ConfettiHost";
import { computeMetrics, fmtMoney, fmtDateShort } from "@/lib";

// Coordenadas decorativas (0–100) para la constelación. Cada star apunta a
// un achievement por id. Si el id no existe en achievements, se omite.
interface Star { x: number; y: number; ach: string }
const STARS: Star[] = [
  { x: 12, y: 32, ach: "a1" },
  { x: 28, y: 18, ach: "a2" },
  { x: 44, y: 38, ach: "a3" },
  { x: 58, y: 22, ach: "a4" },
  { x: 70, y: 44, ach: "a5" },
  { x: 82, y: 28, ach: "a6" },
  { x: 90, y: 50, ach: "a7" },
  { x: 22, y: 50, ach: "a8" },
  { x: 50, y: 50, ach: "a9" },
];

// Timeline placeholder — Bloque G podrá poblar desde unlockedAt + goals completas + workouts PR
interface TimelineEntry { date: string; t_es: string; t_en: string }
const SAMPLE_TIMELINE: TimelineEntry[] = [
  { date: "2024-09-15", t_es: "Empecé el cuaderno", t_en: "Started the notebook" },
  { date: "2025-02-04", t_es: "Primera racha de 30 días", t_en: "First 30-day streak" },
  { date: "2025-08-09", t_es: "Ahorré S/ 1,000 por primera vez", t_en: "Saved S/ 1,000 for the first time" },
];

export function ViewProgress() {
  const { t, lang } = useApp();
  const achievements = useCollection("achievements");
  // useCollection garantiza reactividad sobre la lista; las métricas se recalculan
  // sobre Storage en cada render — lo cual es lo deseado al cambiar otras colecciones.
  useCollection("transactions");
  useCollection("workouts");
  useCollection("habits");

  const metrics = useMemo(() => computeMetrics(), []);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className="content">
      {/* Constellation */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "22px 22px 0" }}>
          <div className="kicker">{t.achievements}</div>
          <h2 className="card-h" style={{ marginTop: 4 }}>
            {lang === "es" ? "Tu constelación" : "Your constellation"}
          </h2>
          <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-3)" }}>
            {lang === "es"
              ? `${unlocked.length} estrellas iluminadas · ${locked.length} esperando`
              : `${unlocked.length} stars lit · ${locked.length} waiting`}
          </div>
        </div>
        <div className="constellation">
          <svg
            width="100%" height="100%" viewBox="0 0 100 56"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0 }}
          >
            {STARS.map((s, i) => {
              if (i === 0) return null;
              const prev = STARS[i - 1];
              const ach = achievements.find((a) => a.id === s.ach);
              const prevAch = achievements.find((a) => a.id === prev.ach);
              if (!ach?.unlocked || !prevAch?.unlocked) return null;
              return (
                <line key={i} x1={prev.x} y1={prev.y * 0.56} x2={s.x} y2={s.y * 0.56}
                  stroke="oklch(58% 0.05 80 / 0.5)" strokeWidth="0.15" />
              );
            })}
            {Array.from({ length: 60 }).map((_, i) => {
              const x = (i * 79) % 100;
              const y = (i * 43) % 56;
              const r = ((i * 17) % 10) / 30 + 0.05;
              return <circle key={`bg${i}`} cx={x} cy={y} r={r} fill="oklch(70% 0.02 60 / 0.4)" />;
            })}
          </svg>
          {STARS.map((s, i) => {
            const ach = achievements.find((a) => a.id === s.ach);
            if (!ach) return null;
            return (
              <div
                key={i}
                className={`star-node ${ach.unlocked ? "" : "locked"}`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <div className="badge md">
                  <img src={`/assets/badges/${ach.id}.png`} alt={lang === "es" ? ach.title_es : ach.title_en} />
                </div>
                <div className="label">{lang === "es" ? ach.title_es : ach.title_en}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="kpi">
          <div className="label">{t.days_using}</div>
          <div className="value">{metrics.daysUsing}</div>
          <div className="meta">{lang === "es" ? "desde el inicio" : "since start"}</div>
        </div>
        <div className="kpi">
          <div className="label">{t.habits_done}</div>
          <div className="value">{metrics.habitsDone.toLocaleString()}</div>
          <div className="meta">
            {metrics.daysUsing > 0
              ? `${(metrics.habitsDone / metrics.daysUsing).toFixed(1)} / ${lang === "es" ? "día" : "day"}`
              : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">{t.saved}</div>
          <div className="value">{fmtMoney(metrics.saved).replace(".00", "")}</div>
          <div className="meta">
            +{fmtMoney(metrics.saved / 12).replace(".00", "")} / mo {lang === "es" ? "prom." : "avg"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">{t.volume_lifted}</div>
          <div className="value">
            {(metrics.volumeLifted / 1000).toFixed(0)}<small> t</small>
          </div>
          <div className="meta">{lang === "es" ? "toneladas movidas" : "tonnes moved"}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <h2 className="card-h" style={{ marginBottom: 2 }}>{t.timeline}</h2>
        <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-3)", marginBottom: 22 }}>
          {lang === "es" ? "hitos que dejaste atrás" : "milestones you've left behind"}
        </div>
        <div style={{ position: "relative", paddingLeft: 22 }}>
          <div style={{
            position: "absolute", left: 6, top: 6, bottom: 6, width: 1,
            background: "repeating-linear-gradient(to bottom, var(--line) 0 3px, transparent 3px 7px)",
          }} />
          {SAMPLE_TIMELINE.map((m, i) => (
            <div key={i} style={{
              position: "relative", padding: "10px 0",
              display: "grid", gridTemplateColumns: "140px 1fr", gap: 18,
            }}>
              <div style={{
                position: "absolute", left: -22 + 6, top: 16,
                width: 11, height: 11, borderRadius: "50%",
                background: i === SAMPLE_TIMELINE.length - 1 ? "var(--terracotta)" : "var(--paper-2)",
                border: `2px solid ${i === SAMPLE_TIMELINE.length - 1 ? "var(--terracotta)" : "var(--ink-3)"}`,
                transform: "translateX(-50%)",
              }} />
              <div className="meta">
                {fmtDateShort(m.date, lang).toUpperCase()} {new Date(m.date).getFullYear()}
              </div>
              <div className="serif" style={{ fontSize: 19, lineHeight: 1.2 }}>
                {lang === "es" ? m.t_es : m.t_en}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Earned badges */}
      {unlocked.length > 0 && (
        <div className="card-flat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <div>
              <h2 className="card-h" style={{ marginBottom: 2 }}>
                {lang === "es" ? "Desbloqueados" : "Earned"}
              </h2>
              <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)" }}>
                {unlocked.length} {lang === "es" ? "medallas en tu colección" : "medallions in your collection"}
              </div>
            </div>
            <button type="button" className="btn" onClick={() => celebrate()}>
              <Icon name="star" size={14} />{" "}
              {lang === "es" ? "Celebrar" : "Replay celebration"}
            </button>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {unlocked.map((a) => (
              <div key={a.id} className="badge-card">
                <div className="badge lg">
                  <img src={`/assets/badges/${a.id}.png`} alt={lang === "es" ? a.title_es : a.title_en} />
                </div>
                <div className="title">{lang === "es" ? a.title_es : a.title_en}</div>
                {a.unlockedAt && (
                  <div className="date">{fmtDateShort(a.unlockedAt, lang).toUpperCase()}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="card-flat">
          <h2 className="card-h" style={{ marginBottom: 4 }}>{t.locked}</h2>
          <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)", marginBottom: 18 }}>
            {lang === "es" ? "estrellas que aún no se encienden" : "stars not yet lit"}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {locked.map((a) => (
              <div key={a.id} className="badge-card locked">
                <div className="badge lg locked">
                  <img src={`/assets/badges/${a.id}.png`} alt={lang === "es" ? a.title_es : a.title_en} />
                </div>
                <div className="title">{lang === "es" ? a.title_es : a.title_en}</div>
                <div className="caption" style={{ maxWidth: 200 }}>
                  {lang === "es" ? a.desc_es : a.desc_en}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewProgress;
