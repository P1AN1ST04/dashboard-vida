/**
 * src/components/views/ViewToday.tsx — La forma del día.
 *
 * Portado de view-today.jsx. Lee colecciones reactivamente. Los 3 botones
 * rápidos abren modales stub (alert por ahora) hasta Bloque G.
 *
 * Estructura:
 *   - Fila 1: racha máxima | gasto del día con barra | sesión de entreno
 *   - Fila 2: cinta del día con arco solar | hábitos de hoy + quick log + cita
 *   - Fila 3 (si hay upcoming): próximos eventos
 */

import { useMemo, useState } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { HabitOps, computeMetrics, fmtMoney } from "@/lib";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { WorkoutLogModal } from "@/components/modals/WorkoutLogModal";
import type { Habit } from "@/types";

const START_H = 6;
const END_H = 22;
const PX_PER_HOUR = 56;

interface DayEvent {
  t: number; d: number; kind: "ink" | "sage" | "ochre" | "terracotta";
  title_es: string; title_en: string; meta: string;
}

// Eventos sintéticos del día (placeholder hasta que Bloque G compute reales).
function buildSampleEvents(): DayEvent[] { return []; }

export function ViewToday() {
  const { t, lang, setView } = useApp();
  const habits = useCollection("habits");
  const settings = useCollection("settings");
  const workouts = useCollection("workouts");
  useCollection("transactions"); // reactividad: gastos de hoy

  const mainCurrency = settings?.currency ?? "PEN";
  const metrics = useMemo(() => computeMetrics(), [habits, workouts]); // recomputa cuando cambian
  const todayEvents = useMemo(buildSampleEvents, []);

  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const totalH = END_H - START_H;
  const trackHeight = totalH * PX_PER_HOUR;
  const nowOk = nowH >= START_H && nowH <= END_H;
  const nowY = (nowH - START_H) * PX_PER_HOUR;

  const hours = useMemo(() => {
    const list: { h: number; label: string }[] = [];
    for (let h = START_H; h <= END_H; h++) {
      const ampm = h < 12 ? "AM" : "PM";
      const h12 = h === 12 ? 12 : h > 12 ? h - 12 : h;
      list.push({ h, label: `${String(h12).padStart(2, " ")} ${ampm}` });
    }
    return list;
  }, []);

  const sortedHabits: Habit[] = [...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0));
  const topHabit = sortedHabits[0];
  const upcoming = todayEvents.filter((e) => e.t > nowH).slice(0, 3);

  const todaySession = workouts.find((w) => {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return w.date === todayStr;
  });

  function handleToggle(h: Habit) { HabitOps.toggle(h); }

  const [showAddTx, setShowAddTx]           = useState(false);
  const [showHabitPicker, setShowHabitPicker] = useState(false);
  const [showWorkoutLog, setShowWorkoutLog] = useState(false);

  return (
    <div className="content">
      {/* Fila 1: KPI editorial superior */}
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}>
        {/* Racha máxima */}
        <div className="card" style={{ overflow: "hidden", position: "relative" }}>
          <div className="kicker">{t.streak_label}</div>
          {topHabit ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: 72,
                  lineHeight: 0.9, letterSpacing: "-0.02em",
                }}>
                  {topHabit.streak || 0}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 14 }}>{t.streak_days}</div>
                  <div className="meta">{t.streak_best}: {topHabit.best || 0}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 22 }}>{topHabit.emoji}</div>
                  <div className="caption" style={{ marginTop: 4 }}>
                    {lang === "es" ? topHabit.name_es : topHabit.name_en}
                  </div>
                </div>
              </div>
              <div className="chain-deco" aria-hidden="true" />
              <div className="italic" style={{
                position: "absolute", right: 22, bottom: 14,
                fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink-3)",
              }}>
                {lang === "es" ? "no rompas la cadena" : "don't break the chain"}
              </div>
            </>
          ) : (
            <div style={{ padding: "12px 0" }}>
              <div className="serif italic" style={{ fontSize: 22, color: "var(--ink-3)", marginBottom: 8 }}>
                {lang === "es" ? "Aún sin hábitos" : "No habits yet"}
              </div>
              <button type="button" className="btn warm" onClick={() => setView("habits")}>
                <Icon name="plus" size={14} />{" "}
                {lang === "es" ? "Crear primer hábito" : "Create first habit"}
              </button>
            </div>
          )}
        </div>

        {/* Gasto del día */}
        <div className="kpi">
          <div className="label">{t.spent_today}</div>
          <div className="value">{fmtMoney(metrics.todaySpent, mainCurrency)}</div>
          <div className="meta">
            {fmtMoney(metrics.todayBudget - metrics.todaySpent, mainCurrency)} {t.budget_left}
          </div>
          <div style={{
            marginTop: 10, height: 4, background: "var(--paper-sunk)",
            borderRadius: 4, overflow: "hidden",
          }}>
            <div style={{
              width: `${Math.min(100, (metrics.todaySpent / Math.max(1, metrics.todayBudget)) * 100)}%`,
              height: "100%", background: "var(--terracotta)",
            }} />
          </div>
        </div>

        {/* Entreno de hoy */}
        <div className="card" style={{ padding: 18 }}>
          <div className="kicker">{t.workout_today}</div>
          {todaySession ? (
            <>
              <div className="serif" style={{ fontSize: 22, marginTop: 6, lineHeight: 1.15 }}>
                {lang === "es" ? (todaySession.name_es || todaySession.name) : (todaySession.name_en || todaySession.name)}
              </div>
              <div className="meta" style={{ marginTop: 6 }}>
                {(todaySession.exercises || []).length}{" "}
                {lang === "es" ? "ejercicios" : "movements"}
              </div>
              <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                {(todaySession.exercises || []).slice(0, 3).map((b, i) => (
                  <span className="pill" key={i}>
                    {lang === "es" ? (b.name_es || b.name) : (b.name_en || b.name_es || b.name)}
                  </span>
                ))}
                {(todaySession.exercises || []).length > 3 && (
                  <span className="pill">+{(todaySession.exercises || []).length - 3}</span>
                )}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div className="serif italic" style={{ fontSize: 18, color: "var(--ink-3)", marginBottom: 8 }}>
                {lang === "es" ? "Sin entreno hoy" : "No training today"}
              </div>
              <button type="button" className="btn" onClick={() => setShowWorkoutLog(true)}>
                <Icon name="plus" size={14} /> {t.log_workout}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fila 2: arco solar | hábitos + quick log + cita */}
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card" style={{ paddingTop: 18, position: "relative", overflow: "hidden" }}>
          <div className="hero-watermark today" aria-hidden="true" />
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12,
          }}>
            <h2 className="card-h">
              {lang === "es" ? "La forma del día" : "The shape of the day"}
            </h2>
            <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>
              {lang === "es" ? "amanecer 6:08 · ocaso 20:11" : "sunrise 6:08 · sunset 20:11"}
            </div>
          </div>
          <div className="horizon">
            <div className="hours" style={{ position: "relative" }}>
              {hours.map(({ h, label }) => (
                <div className="hour mono" key={h}>{label}</div>
              ))}
            </div>
            <div className="track" style={{ height: trackHeight, position: "relative" }}>
              <svg
                className="sun-arc"
                viewBox={`0 0 100 ${trackHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="sunArc" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0"   stopColor="oklch(80% 0.12 70 / 0.6)" />
                    <stop offset="0.5" stopColor="oklch(70% 0.13 50 / 0.4)" />
                    <stop offset="1"   stopColor="oklch(60% 0.08 280 / 0.2)" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 50 0 Q 90 ${trackHeight / 2} 50 ${trackHeight}`}
                  fill="none" stroke="url(#sunArc)" strokeWidth="40" strokeLinecap="round"
                />
                {nowOk && (
                  <circle cx="50" cy={nowY} r="4" fill="oklch(75% 0.13 60)" opacity="0.6" />
                )}
              </svg>
              {todayEvents.length === 0 && (
                <div style={{
                  position: "absolute", top: trackHeight / 2 - 30, left: 0, right: 0, textAlign: "center",
                }}>
                  <div className="serif italic" style={{ fontSize: 18, color: "var(--ink-3)" }}>
                    {lang === "es" ? "el día está libre — moldéalo" : "the day is open — shape it"}
                  </div>
                </div>
              )}
              {nowOk && (
                <div className="horizon-now" style={{ top: nowY }}>
                  <span className="meta" style={{
                    position: "absolute", left: 14, top: -6, color: "var(--terracotta)",
                  }}>{t.now}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateRows: "auto auto 1fr", gap: 16 }}>
          {/* Hábitos de hoy */}
          <div className="card">
            <h2 className="card-h">{t.habits_today}</h2>
            {habits.length === 0 ? (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <div className="serif italic" style={{ fontSize: 16, color: "var(--ink-3)", marginBottom: 10 }}>
                  {lang === "es" ? "sin hábitos creados" : "no habits yet"}
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setView("habits")}
                  style={{ fontSize: 13 }}
                >
                  <Icon name="plus" size={12} /> {t.new_habit}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {habits.slice(0, 6).map((h) => {
                  const done = HabitOps.isDoneToday(h);
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(h)}
                        aria-label={`toggle ${h.name_es}`}
                        style={{
                          width: 22, height: 22, borderRadius: 5,
                          border: `1.5px solid ${h.color}`,
                          background: done ? h.color : "transparent",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flex: "0 0 22px", cursor: "pointer", padding: 0,
                        }}
                      >
                        {done && <Icon name="check" size={12} color="var(--paper)" />}
                      </button>
                      <span style={{ flex: 1 }}>
                        <span style={{ marginRight: 6 }}>{h.emoji}</span>
                        {lang === "es" ? h.name_es : h.name_en}
                      </span>
                      <span className="meta" style={{ marginLeft: "auto" }}>{h.streak || 0}d</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick log */}
          <div className="card-flat" style={{ padding: 18 }}>
            <div className="kicker" style={{ marginBottom: 10 }}>{t.quick_log}</div>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button type="button" className="btn warm" onClick={() => setShowAddTx(true)}>
                <Icon name="plus" size={14} /> {t.add_expense}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setShowHabitPicker(true)}
                disabled={habits.length === 0}
              >
                <Icon name="leaf" size={14} /> {t.log_habit}
              </button>
              <button type="button" className="btn" onClick={() => setShowWorkoutLog(true)}>
                <Icon name="dumbbell" size={14} /> {t.log_workout}
              </button>
            </div>
          </div>

          {/* Cita del día */}
          <div className="card" style={{
            background: "var(--terracotta-soft)", borderColor: "transparent",
            position: "relative", overflow: "hidden",
          }}>
            <div className="kicker" style={{ color: "var(--rust)" }}>
              {lang === "es" ? "Frase del día" : "Daily note"}
            </div>
            <div className="serif italic" style={{
              fontSize: 24, lineHeight: 1.2, marginTop: 8, color: "var(--rust)",
            }}>
              {t.today_quote}
            </div>
            <div className="meta" style={{ marginTop: 12, color: "var(--rust)", opacity: 0.7 }}>
              — {lang === "es" ? "anónimo" : "anonymous"}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card-flat">
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14,
          }}>
            <h2 className="card-h">{t.upcoming}</h2>
            <span className="meta">
              {upcoming.length} {lang === "es" ? "más hoy" : "more today"}
            </span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {upcoming.map((e, i) => {
              const hr = Math.floor(e.t);
              const mn = Math.round((e.t - hr) * 60);
              const tStr = `${String(hr).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
              return (
                <div key={i} style={{
                  borderLeft: `2px solid var(--${e.kind})`,
                  paddingLeft: 14,
                }}>
                  <div className="meta">{tStr}</div>
                  <div className="serif" style={{ fontSize: 19, marginTop: 4 }}>
                    {lang === "es" ? e.title_es : e.title_en}
                  </div>
                  <div className="caption" style={{ marginTop: 4 }}>{e.meta}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modales (montados condicionalmente al final del árbol) */}
      {showAddTx       && <AddTransactionModal onClose={() => setShowAddTx(false)} />}
      {showHabitPicker && <HabitPickerSheet     onClose={() => setShowHabitPicker(false)} />}
      {showWorkoutLog  && <WorkoutLogModal      onClose={() => setShowWorkoutLog(false)} />}
    </div>
  );
}

/**
 * HabitPickerSheet — picker rápido de hábitos para "Log habit" en Today.
 * Lista los hábitos y permite togglearlos con un click. Cierra al pulsar fuera.
 */
function HabitPickerSheet({ onClose }: { onClose: () => void }) {
  const { lang } = useApp();
  const habits = useCollection("habits");
  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 420, padding: 24, maxHeight: "85vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="kicker">{lang === "es" ? "Registro rápido" : "Quick log"}</div>
        <div className="h2" style={{ marginBottom: 20, marginTop: 4 }}>
          {lang === "es" ? "Marcar hábitos de hoy" : "Mark today's habits"}
        </div>
        {habits.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <div className="serif italic" style={{ color: "var(--ink-3)" }}>
              {lang === "es" ? "Crea hábitos primero" : "Create habits first"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {habits.map((h) => {
              const done = HabitOps.isDoneToday(h);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => HabitOps.toggle(h)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    border: `1px solid ${done ? h.color : "var(--line)"}`,
                    background: done ? "var(--paper-2)" : "var(--paper)",
                    borderRadius: 10, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: 5,
                    border: `1.5px solid ${h.color}`,
                    background: done ? h.color : "transparent",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flex: "0 0 22px",
                  }}>
                    {done && <Icon name="check" size={12} color="var(--paper)" />}
                  </span>
                  <span style={{ fontSize: 20 }}>{h.emoji}</span>
                  <span style={{ flex: 1, fontSize: 15 }}>
                    {lang === "es" ? h.name_es : h.name_en}
                  </span>
                  <span className="meta">{h.streak || 0}d</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper que monta los modales fuera del JSX principal (no romper el árbol).
function ViewTodayWithModals() {
  // Marker: este wrapper no se usa directamente — los modales se montan
  // dentro de ViewToday vía el patrón state local. Lo dejamos como referencia.
  return null;
}
void ViewTodayWithModals;

export default ViewToday;
