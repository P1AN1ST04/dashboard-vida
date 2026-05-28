/**
 * src/components/views/ViewHabits.tsx — Jardín de hábitos + heatmap.
 *
 * Portado de view-habits.jsx. CRUD vive en un modal local (HabitEditSheet)
 * hasta que el Bloque G traiga el modal real con i18n completa, color picker
 * extendido y reminders.
 */

import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { HabitEditModal } from "@/components/modals/HabitEditModal";
import { HabitOps, computeHeatmap, computeMetrics } from "@/lib";
import type { Habit } from "@/types";

const EMOJIS = ["🌱","📖","🏃","🧘","💧","🌙","✒️","🗣️","🏋️","🍎","☕","🧠","💪","🌞","🎯","📚","🎵","🌿"];

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatYM(ym: string, lang: "es" | "en"): string {
  const [y, m] = ym.split("-");
  const monthNames = lang === "es"
    ? ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
}

export function ViewHabits() {
  const { t, lang } = useApp();
  const habits = useCollection("habits");
  const [editing, setEditing] = useState<Habit | "new" | null>(null);

  const maxStreak = Math.max(1, ...habits.map((h) => h.best || 0));
  const stemH = (s: number) => 48 + (s / maxStreak) * 140;

  const months = lang === "es"
    ? ["jun","jul","ago","sep","oct","nov","dic","ene","feb","mar","abr","may"]
    : ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];

  function computePerfectDays(): number {
    if (habits.length === 0) return 0;
    const allDates = new Set<string>();
    habits.forEach((h) => (h.log || []).forEach((l) => l.completed && allDates.add(l.date)));
    let perfect = 0;
    allDates.forEach((date) => {
      const allDone = habits.every((h) => (h.log || []).some((l) => l.date === date && l.completed));
      if (allDone) perfect++;
    });
    return perfect;
  }

  function computeBestMonth(): { ym: string; count: number } | null {
    if (habits.length === 0) return null;
    const monthCounts: Record<string, number> = {};
    habits.forEach((h) => (h.log || []).forEach((l) => {
      if (!l.completed) return;
      const ym = l.date.slice(0, 7);
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    }));
    let best: string | null = null;
    let bestCount = 0;
    Object.entries(monthCounts).forEach(([ym, c]) => {
      if (c > bestCount) { best = ym; bestCount = c; }
    });
    return best ? { ym: best, count: bestCount } : null;
  }

  const perfectDays = computePerfectDays();
  const bestMonth = computeBestMonth();
  const wateredToday = habits.filter((h) => HabitOps.isDoneToday(h)).length;
  const metrics = computeMetrics();
  const heatmap = computeHeatmap();

  function handleToggle(h: Habit) {
    HabitOps.toggle(h);
  }

  if (habits.length === 0) {
    return (
      <div className="content">
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🌱</div>
          <div className="serif" style={{ fontSize: 28, marginBottom: 8 }}>
            {lang === "es" ? "Tu jardín está vacío" : "Your garden is empty"}
          </div>
          <div className="meta" style={{ fontSize: 15, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
            {lang === "es"
              ? "Los hábitos pequeños construidos a diario son cómo crecen las cosas grandes. Empieza con uno."
              : "Small habits, done daily, are how big things grow. Start with one."}
          </div>
          <button type="button" className="btn warm" onClick={() => setEditing("new")} style={{ fontSize: 15 }}>
            <Icon name="plus" size={14} />{" "}
            {lang === "es" ? "Crear primer hábito" : "Create first habit"}
          </button>
        </div>
        {editing && <HabitEditModal habit={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </div>
    );
  }

  return (
    <div className="content">
      {/* Jardín */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "22px 22px 0" }}>
          <div className="kicker">{t.your_garden}</div>
          <h2 className="card-h" style={{ marginTop: 4, marginBottom: 2 }}>
            {habits.length}{" "}
            {lang === "es"
              ? (habits.length === 1 ? "tallo, " : "tallos, ")
              : (habits.length === 1 ? "stem, " : "stems, ")}
            <span className="italic" style={{ color: "var(--ink-3)" }}>
              {lang === "es" ? `${wateredToday} regados hoy` : `${wateredToday} watered today`}
            </span>
          </h2>
        </div>
        <div
          className="garden"
          style={{
            background:
              "linear-gradient(to top, oklch(58% 0.07 145 / 0.07), transparent 50%), linear-gradient(to bottom, oklch(80% 0.08 60 / 0.05), transparent 30%)",
            padding: "40px 28px 24px",
            minHeight: 260,
          }}
        >
          {habits.map((h) => {
            const height = stemH(h.streak || 0);
            const bloomed = HabitOps.isDoneToday(h);
            const name = lang === "es" ? h.name_es : h.name_en;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => handleToggle(h)}
                className="stem"
                style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                title={lang === "es" ? "Click para marcar/desmarcar" : "Click to toggle"}
              >
                <div className="streak" style={{ color: h.color }}>{h.streak || 0}</div>
                <div className="leaf" style={{
                  marginBottom: -4,
                  opacity: bloomed ? 1 : 0.55,
                  transform: bloomed ? "rotate(0)" : "rotate(-6deg)",
                  transition: "transform 300ms",
                }}>{h.emoji}</div>
                <div className="stalk" style={{
                  height,
                  background: `linear-gradient(to top, oklch(45% 0.06 100), ${h.color})`,
                }} />
                <div className="ground" style={{ background: `oklch(45% 0.05 60 / ${bloomed ? 0.7 : 0.3})` }} />
                <div className="label" style={{ marginTop: 6, maxWidth: 80 }}>{name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjetas por hábito */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {habits.map((h) => {
          const done = HabitOps.isDoneToday(h);
          return (
            <div
              key={h.id}
              className="card"
              style={{ padding: 16, position: "relative", cursor: "pointer" }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-checkbox]")) return;
                setEditing(h);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{h.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{lang === "es" ? h.name_es : h.name_en}</div>
                  <div className="meta">{lang === "es" ? "diario" : "daily"}</div>
                </div>
                <button
                  type="button"
                  data-checkbox="1"
                  onClick={(e) => { e.stopPropagation(); handleToggle(h); }}
                  aria-label={`toggle ${h.name_es}`}
                  style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: done ? h.color : "transparent",
                    border: `1.5px solid ${done ? "transparent" : "var(--line)"}`,
                    display: "grid", placeItems: "center", cursor: "pointer", padding: 0,
                  }}
                >
                  {done && <Icon name="check" size={14} color="var(--paper)" />}
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div className="meta">{t.streak_label}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: h.color }}>
                    {h.streak || 0}<span style={{ fontSize: 13, color: "var(--ink-3)" }}> {t.streak_days}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="meta">{t.streak_best}</div>
                  <div className="num" style={{ fontSize: 16 }}>{h.best || 0}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  const dayDone = (h.log || []).some((l) => l.date === iso && l.completed);
                  const isToday = i === 6;
                  return (
                    <span key={i} style={{
                      flex: 1, height: 5, borderRadius: 4,
                      background: dayDone ? h.color : "var(--paper-sunk)",
                      opacity: dayDone ? (isToday ? 1 : 0.85) : 1,
                      outline: isToday ? `1px solid ${h.color}` : "none",
                      outlineOffset: 1,
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="card"
          onClick={() => setEditing("new")}
          style={{
            padding: 16, border: "1.5px dashed var(--line)", background: "transparent",
            display: "grid", placeItems: "center", color: "var(--ink-3)",
            fontFamily: "var(--font-display)", fontSize: 17, fontStyle: "italic", cursor: "pointer",
          }}
        >
          <div>
            +{" "}
            <span style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 4 }}>
              {t.new_habit}
            </span>
          </div>
        </button>
      </div>

      {/* Heatmap anual */}
      <div className="card" style={{ position: "relative", overflow: "hidden", paddingTop: 28 }}>
        <div className="hero-watermark habits" aria-hidden="true" />
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 14, position: "relative",
        }}>
          <div>
            <h2 className="card-h" style={{ marginBottom: 2 }}>{t.year_at_glance}</h2>
            <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)" }}>
              {lang === "es" ? "365 días, mirados al mismo tiempo" : "365 days, looked at at once"}
            </div>
          </div>
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <span className="meta">{t.fewer}</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2, 3, 4].map((l) => (
                <div key={l} className={`cell l${l}`} style={{ width: 12, height: 12, borderRadius: 2 }} />
              ))}
            </div>
            <span className="meta">{t.more}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", marginBottom: 6, paddingLeft: 4 }}>
          {months.map((m, i) => (
            <div key={i} className="meta" style={{ fontSize: 10 }}>{m}</div>
          ))}
        </div>
        <div className="heatmap">
          {heatmap.map((lvl, i) => (
            <div key={i} className={`cell l${lvl}`} title={`day ${i}`} />
          ))}
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="row" style={{ gap: 18 }}>
            <div>
              <div className="meta">{lang === "es" ? "Mejor mes" : "Best month"}</div>
              <div className="serif" style={{ fontSize: 18 }}>
                {bestMonth ? `${formatYM(bestMonth.ym, lang)} · ${bestMonth.count}` : "—"}
              </div>
            </div>
            <div>
              <div className="meta">{lang === "es" ? "Total completados" : "Total completed"}</div>
              <div className="serif" style={{ fontSize: 18 }}>{metrics.habitsDone.toLocaleString()}</div>
            </div>
            <div>
              <div className="meta">{lang === "es" ? "Días perfectos" : "Perfect days"}</div>
              <div className="serif" style={{ fontSize: 18 }}>{perfectDays}</div>
            </div>
          </div>
        </div>
      </div>

      {editing && <HabitEditModal habit={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default ViewHabits;
