/**
 * src/components/views/ViewWorkouts.tsx — Gimnasio + Running + Todo (tabs).
 *
 * Portado de view-workouts.jsx. Modal de log es stub (alert) hasta Bloque G.
 * Strava sync se desactiva hasta que Integrations esté portado.
 *
 * Subcomponentes: SessionTable, BodySvg (front/back), DeadliftCurve,
 * VolumeBar, WorkoutList. Todos en este archivo por cohesión.
 */

import { useMemo, useState } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { WorkoutLogModal } from "@/components/modals/WorkoutLogModal";
import {
  computeDeadliftProgression,
  computeWeeklyVolume,
  computeBodyFocus,
  fmtDateShort,
} from "@/lib";
import type { BodyFocus } from "@/lib";
import type { Workout, Exercise } from "@/types";

type Tab = "gym" | "run" | "all";

export function ViewWorkouts() {
  const { t, lang } = useApp();
  const workouts = useCollection("workouts");
  const settings = useCollection("settings");

  const [tab, setTab] = useState<Tab>("gym");
  const [logging, setLogging] = useState<Workout | "new" | null>(null);

  const gymWorkouts = workouts.filter((w) => w.type === "gym");
  const runWorkouts = workouts.filter((w) => w.type === "run");
  const stravaConnected = !!settings?.integrations?.strava?.connected;

  function notImplemented(msg: string) { window.alert(msg); }

  return (
    <div className="content">
      <div
        className="card-flat"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", flexWrap: "wrap", gap: 8,
        }}
      >
        <div className="seg">
          <button
            type="button"
            className={`seg-btn ${tab === "gym" ? "on" : ""}`}
            onClick={() => setTab("gym")}
          >
            💪 {lang === "es" ? "Gimnasio" : "Gym"}{" "}
            <span className="meta" style={{ marginLeft: 4 }}>{gymWorkouts.length}</span>
          </button>
          <button
            type="button"
            className={`seg-btn ${tab === "run" ? "on" : ""}`}
            onClick={() => setTab("run")}
          >
            🏃 Running{" "}
            <span className="meta" style={{ marginLeft: 4 }}>{runWorkouts.length}</span>
          </button>
          <button
            type="button"
            className={`seg-btn ${tab === "all" ? "on" : ""}`}
            onClick={() => setTab("all")}
          >
            {lang === "es" ? "Todo" : "All"}{" "}
            <span className="meta" style={{ marginLeft: 4 }}>{workouts.length}</span>
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "run" && stravaConnected && (
            <button
              type="button"
              className="btn"
              onClick={() => notImplemented("Strava sync (Bloque G)")}
            >
              {lang === "es" ? "Sync Strava" : "Sync Strava"}
            </button>
          )}
          <button
            type="button"
            className="btn warm"
            onClick={() => setLogging("new")}
          >
            <Icon name="plus" size={14} /> {t.log_set}
          </button>
        </div>
      </div>

      {tab === "gym" && <GymTab workouts={gymWorkouts} onEdit={setLogging} />}
      {tab === "run" && <RunTab workouts={runWorkouts} stravaConnected={stravaConnected} onEdit={setLogging} />}
      {tab === "all" && <AllTab workouts={workouts} onEdit={setLogging} />}

      {logging && (
        <WorkoutLogModal
          workout={logging === "new" ? null : logging}
          onClose={() => setLogging(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// GymTab
// ─────────────────────────────────────────────────────────────────

interface TabProps { workouts: Workout[]; onEdit: (w: Workout) => void }

function GymTab({ workouts, onEdit }: TabProps) {
  const { t, lang } = useApp();

  if (workouts.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏋️</div>
        <div className="serif" style={{ fontSize: 26, marginBottom: 8 }}>
          {lang === "es" ? "Sin entrenamientos aún" : "No workouts yet"}
        </div>
        <div className="meta" style={{ fontSize: 15, maxWidth: 380, margin: "0 auto" }}>
          {lang === "es"
            ? "Registra tu primera sesión y verás la progresión semana a semana."
            : "Log your first session and you'll see progression week over week."}
        </div>
      </div>
    );
  }

  const lastSession = workouts[workouts.length - 1];
  const bf = useMemo(() => computeBodyFocus(), [workouts]);
  const hasBf = Object.keys(bf).length > 0;
  const dl = useMemo(() => computeDeadliftProgression(), [workouts]);
  const weeklyVolume = useMemo(() => computeWeeklyVolume(), [workouts]);
  const intensityFill = (v: number) => `oklch(58% ${0.05 + v * 0.10} 35 / ${0.20 + v * 0.7})`;

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div className="kicker">{lang === "es" ? "Última sesión" : "Last session"}</div>
              <h2 className="card-h" style={{ marginTop: 4 }}>
                {lang === "es"
                  ? (lastSession.name_es || lastSession.name || "—")
                  : (lastSession.name_en || lastSession.name_es || lastSession.name || "—")}
              </h2>
            </div>
          </div>
          <SessionTable session={lastSession} />
        </div>

        <div className="card">
          <h2 className="card-h" style={{ marginBottom: 2 }}>{t.body_focus}</h2>
          <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink-3)", marginBottom: 12 }}>
            {lang === "es" ? "esta semana, donde le pusiste" : "where the work landed this week"}
          </div>
          {!hasBf ? (
            <div className="meta italic" style={{ padding: 16, textAlign: "center" }}>
              {lang === "es" ? "Registra entrenos esta semana para ver el foco" : "Log workouts this week to see focus"}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <BodySvg side="front" bf={bf} intensityFill={intensityFill} />
                <BodySvg side="back"  bf={bf} intensityFill={intensityFill} />
              </div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {([
                  ["back", "Back", "Espalda"],
                  ["chest", "Chest", "Pecho"],
                  ["shoulders", "Shoulders", "Hombros"],
                  ["biceps", "Biceps", "Bíceps"],
                  ["quads", "Quads", "Cuádriceps"],
                  ["core", "Core", "Core"],
                ] as Array<[keyof BodyFocus, string, string]>).map(([k, en, es]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: intensityFill(bf[k] || 0) }} />
                    <span style={{ color: "var(--ink-2)" }}>{lang === "es" ? es : en}</span>
                    <span className="num caption" style={{ marginLeft: "auto" }}>
                      {Math.round((bf[k] || 0) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {(dl.length > 0 || weeklyVolume.some((v) => v > 0)) && (
        <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          {dl.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <h2 className="card-h">{t.progression}</h2>
                <span className="pill warm">
                  {lang === "es" ? "Peso muerto" : "Deadlift"} ·{" "}
                  <span className="num">{dl[dl.length - 1]} kg</span>
                </span>
              </div>
              {dl.length < 2 ? (
                <div className="meta italic" style={{ padding: 16, textAlign: "center" }}>
                  {lang === "es" ? "Registra otra sesión para ver la curva" : "Log another session to see the curve"}
                </div>
              ) : (
                <DeadliftCurve dl={dl} />
              )}
            </div>
          )}
          {weeklyVolume.some((v) => v > 0) && (
            <div className="card">
              <h2 className="card-h" style={{ marginBottom: 2 }}>{t.total_volume}</h2>
              <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)", marginBottom: 14 }}>
                {lang === "es" ? "8 semanas, en kilos movidos" : "8 weeks, in kilos moved"}
              </div>
              <VolumeBar weeklyVolume={weeklyVolume} />
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="card-h" style={{ marginBottom: 12 }}>{t.history}</h2>
        <WorkoutList workouts={workouts.slice().reverse()} onEdit={onEdit} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// RunTab
// ─────────────────────────────────────────────────────────────────

function RunTab({ workouts, stravaConnected, onEdit }: TabProps & { stravaConnected: boolean }) {
  const { lang } = useApp();

  if (workouts.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏃</div>
        <div className="serif" style={{ fontSize: 26, marginBottom: 8 }}>
          {lang === "es" ? "Sin carreras aún" : "No runs yet"}
        </div>
        <div className="meta" style={{ fontSize: 15, maxWidth: 380, margin: "0 auto" }}>
          {stravaConnected
            ? (lang === "es" ? "Sincroniza con Strava o registra tu primera carrera manualmente." : "Sync with Strava or log your first run manually.")
            : (lang === "es" ? "Registra tu primera carrera o conecta Strava desde Ajustes." : "Log your first run or connect Strava from Settings.")}
        </div>
      </div>
    );
  }

  const now = new Date();
  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
  const weekISO  = weekAgo.toISOString().slice(0, 10);
  const monthISO = monthAgo.toISOString().slice(0, 10);

  const weekRuns  = workouts.filter((w) => w.date >= weekISO);
  const monthRuns = workouts.filter((w) => w.date >= monthISO);
  const weekKm  = weekRuns.reduce((s, w) => s + (w.distanceKm || 0), 0);
  const monthKm = monthRuns.reduce((s, w) => s + (w.distanceKm || 0), 0);
  const weekMin = weekRuns.reduce((s, w) => s + (w.durationMin || 0), 0);
  const stravaRuns = workouts.filter((w) => w.source === "strava");

  const acute = weekKm;
  const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksISO = fourWeeksAgo.toISOString().slice(0, 10);
  const chronicTotal = workouts
    .filter((w) => w.date >= fourWeeksISO)
    .reduce((s, w) => s + (w.distanceKm || 0), 0);
  const chronic = chronicTotal / 4;
  const ratio = chronic > 0 ? acute / chronic : 0;
  const ratioColor =
    ratio > 1.5 ? "var(--terracotta)" :
    ratio > 1.0 ? "var(--ochre)" :
                  "var(--sage)";

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="kpi">
          <div className="label">{lang === "es" ? "Esta semana" : "This week"}</div>
          <div className="value">{weekKm.toFixed(1)}<small> km</small></div>
          <div className="meta">
            {weekRuns.length} {lang === "es" ? "carreras" : "runs"} · {Math.round(weekMin)} min
          </div>
        </div>
        <div className="kpi">
          <div className="label">{lang === "es" ? "Este mes" : "This month"}</div>
          <div className="value">{monthKm.toFixed(1)}<small> km</small></div>
          <div className="meta">
            {monthRuns.length} {lang === "es" ? "carreras" : "runs"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">{lang === "es" ? "Carga aguda/crónica" : "Acute/chronic load"}</div>
          <div className="value" style={{ color: ratioColor }}>{ratio.toFixed(2)}</div>
          <div className="meta">
            {ratio < 0.8 && (lang === "es" ? "Descargado" : "Undertraining")}
            {ratio >= 0.8 && ratio <= 1.3 && (lang === "es" ? "Zona óptima" : "Sweet spot")}
            {ratio > 1.3 && ratio <= 1.5 && (lang === "es" ? "Carga alta" : "High load")}
            {ratio > 1.5 && (lang === "es" ? "Riesgo de lesión" : "Injury risk")}
          </div>
        </div>
        {stravaConnected && (
          <div className="kpi">
            <div className="label">{lang === "es" ? "De Strava" : "From Strava"}</div>
            <div className="value">{stravaRuns.length}</div>
            <div className="meta">
              {lang === "es" ? "actividades importadas" : "imported activities"}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-h" style={{ marginBottom: 12 }}>
          {lang === "es" ? "Carreras recientes" : "Recent runs"}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workouts.slice().reverse().slice(0, 20).map((w) => (
            <div
              key={w.id}
              onClick={() => onEdit(w)}
              style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto auto auto",
                gap: 12, alignItems: "center",
                padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line-soft)",
                cursor: "pointer", background: "var(--paper)",
              }}
            >
              <div style={{ fontSize: 22 }}>🏃</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {w.name || (lang === "es" ? "Carrera" : "Run")}
                </div>
                <div className="meta">
                  {fmtDateShort(w.date, lang)}{" "}
                  {w.source === "strava" && (
                    <span className="pill" style={{ fontSize: 9, padding: "1px 6px", marginLeft: 6 }}>
                      Strava
                    </span>
                  )}
                </div>
              </div>
              <div className="num" style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15 }}>{(w.distanceKm || 0).toFixed(2)} km</div>
                <div className="meta">{Math.round(w.durationMin || 0)} min</div>
              </div>
              <div className="num" style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "var(--terracotta)" }}>{w.pace || "—"}</div>
                <div className="meta">/ km</div>
              </div>
              {w.avgHr && (
                <div className="num" style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13 }}>{w.avgHr}</div>
                  <div className="meta">bpm</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// AllTab
// ─────────────────────────────────────────────────────────────────

function AllTab({ workouts, onEdit }: TabProps) {
  const { lang } = useApp();
  if (workouts.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📅</div>
        <div className="serif" style={{ fontSize: 26, marginBottom: 8 }}>
          {lang === "es" ? "Sin entrenamientos" : "No workouts"}
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <h2 className="card-h" style={{ marginBottom: 12 }}>
        {lang === "es" ? "Historial completo" : "Full history"}
      </h2>
      <WorkoutList workouts={workouts.slice().reverse()} onEdit={onEdit} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SessionTable
// ─────────────────────────────────────────────────────────────────

function SessionTable({ session }: { session: Workout }) {
  const { lang } = useApp();
  const exercises: Exercise[] = session.exercises || [];
  if (exercises.length === 0) {
    return <div className="meta italic" style={{ padding: 12 }}>—</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        className="meta"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 70px 60px 100px 50px",
          padding: "6px 0",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div>{lang === "es" ? "Ejercicio" : "Movement"}</div>
        <div style={{ textAlign: "right" }}>{lang === "es" ? "Series" : "Sets"}</div>
        <div style={{ textAlign: "right" }}>{lang === "es" ? "Repes" : "Reps"}</div>
        <div style={{ textAlign: "right" }}>{lang === "es" ? "Peso" : "Weight"}</div>
        <div style={{ textAlign: "right" }}>RPE</div>
      </div>
      {exercises.map((ex, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 70px 60px 100px 50px",
            padding: "12px 0",
            borderBottom: i === exercises.length - 1 ? "none" : "1px solid var(--line-soft)",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {lang === "es" ? (ex.name_es || ex.name) : (ex.name_en || ex.name_es || ex.name)}
            </div>
          </div>
          <div className="num" style={{ textAlign: "right" }}>{ex.sets}</div>
          <div className="num" style={{ textAlign: "right" }}>{ex.reps}</div>
          <div className="num" style={{ textAlign: "right" }}>
            {ex.weight || 0} <span className="caption">{ex.unit || "kg"}</span>
          </div>
          <div
            className="num"
            style={{
              textAlign: "right",
              color: (ex.rpe || 0) >= 9 ? "var(--terracotta)" : "var(--ink-2)",
            }}
          >
            {ex.rpe || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BodySvg — silueta corporal con intensidad por grupo muscular
// ─────────────────────────────────────────────────────────────────

interface BodySvgProps {
  side: "front" | "back";
  bf: BodyFocus;
  intensityFill: (v: number) => string;
}

function BodySvg({ side, bf, intensityFill }: BodySvgProps) {
  const get = (k: keyof BodyFocus) => bf[k] || 0;
  if (side === "front") {
    return (
      <svg viewBox="0 0 100 200" style={{ width: "100%" }}>
        <ellipse cx="50" cy="20" rx="11" ry="13" fill="var(--paper-sunk)" stroke="var(--line)" />
        <path d="M 30 38 L 70 38 L 72 70 L 65 95 L 35 95 L 28 70 Z" fill={intensityFill(get("chest"))} stroke="var(--line)" />
        <line x1="50" y1="38" x2="50" y2="95" stroke="var(--line-soft)" />
        <path d="M 35 95 L 65 95 L 62 115 L 38 115 Z" fill={intensityFill(get("core"))} stroke="var(--line)" />
        <ellipse cx="26" cy="42" rx="8" ry="6"  fill={intensityFill(get("shoulders"))} stroke="var(--line)" />
        <ellipse cx="74" cy="42" rx="8" ry="6"  fill={intensityFill(get("shoulders"))} stroke="var(--line)" />
        <ellipse cx="22" cy="56" rx="6" ry="10" fill={intensityFill(get("biceps"))} stroke="var(--line)" />
        <ellipse cx="78" cy="56" rx="6" ry="10" fill={intensityFill(get("biceps"))} stroke="var(--line)" />
        <ellipse cx="20" cy="74" rx="5" ry="10" fill="var(--paper-sunk)" stroke="var(--line)" />
        <ellipse cx="80" cy="74" rx="5" ry="10" fill="var(--paper-sunk)" stroke="var(--line)" />
        <path d="M 38 115 L 50 115 L 49 160 L 36 160 Z" fill={intensityFill(get("quads"))} stroke="var(--line)" />
        <path d="M 50 115 L 62 115 L 64 160 L 51 160 Z" fill={intensityFill(get("quads"))} stroke="var(--line)" />
        <path d="M 36 160 L 49 160 L 48 188 L 38 188 Z" fill={intensityFill(get("calves"))} stroke="var(--line)" />
        <path d="M 51 160 L 64 160 L 62 188 L 52 188 Z" fill={intensityFill(get("calves"))} stroke="var(--line)" />
        <text x="50" y="196" textAnchor="middle" fontSize="6" fontFamily="var(--font-mono)" fill="var(--ink-3)" letterSpacing="0.2em">FRONT</text>
      </svg>
    );
  }
  const hamstrings = (bf.hamstrings ?? (bf.quads ?? 0) * 0.8) || 0;
  return (
    <svg viewBox="0 0 100 200" style={{ width: "100%" }}>
      <ellipse cx="50" cy="20" rx="11" ry="13" fill="var(--paper-sunk)" stroke="var(--line)" />
      <path d="M 30 38 L 70 38 L 72 70 L 65 95 L 35 95 L 28 70 Z" fill={intensityFill(get("back"))} stroke="var(--line)" />
      <ellipse cx="42" cy="115" rx="9" ry="10" fill={intensityFill(get("glutes"))} stroke="var(--line)" />
      <ellipse cx="58" cy="115" rx="9" ry="10" fill={intensityFill(get("glutes"))} stroke="var(--line)" />
      <ellipse cx="26" cy="42" rx="8" ry="6"  fill={intensityFill(get("shoulders"))} stroke="var(--line)" />
      <ellipse cx="74" cy="42" rx="8" ry="6"  fill={intensityFill(get("shoulders"))} stroke="var(--line)" />
      <ellipse cx="22" cy="56" rx="6" ry="10" fill={intensityFill(get("triceps"))} stroke="var(--line)" />
      <ellipse cx="78" cy="56" rx="6" ry="10" fill={intensityFill(get("triceps"))} stroke="var(--line)" />
      <path d="M 38 125 L 50 125 L 49 160 L 36 160 Z" fill={intensityFill(hamstrings)} stroke="var(--line)" />
      <path d="M 50 125 L 62 125 L 64 160 L 51 160 Z" fill={intensityFill(hamstrings)} stroke="var(--line)" />
      <path d="M 36 160 L 49 160 L 48 188 L 38 188 Z" fill={intensityFill(get("calves"))} stroke="var(--line)" />
      <path d="M 51 160 L 64 160 L 62 188 L 52 188 Z" fill={intensityFill(get("calves"))} stroke="var(--line)" />
      <text x="50" y="196" textAnchor="middle" fontSize="6" fontFamily="var(--font-mono)" fill="var(--ink-3)" letterSpacing="0.2em">BACK</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// DeadliftCurve
// ─────────────────────────────────────────────────────────────────

function DeadliftCurve({ dl }: { dl: number[] }) {
  const sw = 600, sh = 200;
  const pad = { l: 36, r: 12, t: 16, b: 22 };
  const minDL = Math.min(...dl) - 5;
  const maxDL = Math.max(...dl) + 5;
  const xStep = (sw - pad.l - pad.r) / Math.max(1, dl.length - 1);
  const yDL = (v: number) =>
    sh - pad.b - ((v - minDL) / (maxDL - minDL || 1)) * (sh - pad.b - pad.t);
  const dlPath = dl.map((v, i) => `${i === 0 ? "M" : "L"} ${pad.l + i * xStep} ${yDL(v)}`).join(" ");
  const dlArea = dlPath +
    ` L ${pad.l + (dl.length - 1) * xStep} ${sh - pad.b} L ${pad.l} ${sh - pad.b} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${sw} ${sh}`}>
      <defs>
        <linearGradient id="dlFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--terracotta)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--terracotta)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const v = minDL + f * (maxDL - minDL);
        return (
          <g key={i}>
            <line x1={pad.l} x2={sw - pad.r} y1={yDL(v)} y2={yDL(v)} stroke="var(--line-soft)" strokeDasharray="2 4" />
            <text x={pad.l - 6} y={yDL(v) + 3} fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)" textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      <path d={dlArea} fill="url(#dlFill)" />
      <path d={dlPath} fill="none" stroke="var(--terracotta)" strokeWidth="1.8" />
      {dl.map((v, i) => (
        <circle key={i} cx={pad.l + i * xStep} cy={yDL(v)} r="3" fill="var(--paper-2)" stroke="var(--terracotta)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// VolumeBar
// ─────────────────────────────────────────────────────────────────

function VolumeBar({ weeklyVolume }: { weeklyVolume: number[] }) {
  const { lang } = useApp();
  const maxVol = Math.max(...weeklyVolume, 1) * 1.1;
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
        {weeklyVolume.map((v, i) => {
          const h = (v / maxVol) * 130;
          const isLast = i === weeklyVolume.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div className="num" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                {(v / 1000).toFixed(1)}k
              </div>
              <div style={{
                width: "100%", height: Math.max(2, h),
                background: isLast ? "var(--terracotta)" : "var(--sage-soft)",
                borderRadius: "4px 4px 0 0",
                border: isLast ? "none" : "1px solid var(--sage)",
              }} />
            </div>
          );
        })}
      </div>
      <div className="meta" style={{ textAlign: "center", marginTop: 8 }}>
        {lang === "es" ? "semanas (la última, esta)" : "weeks (last is this)"}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// WorkoutList
// ─────────────────────────────────────────────────────────────────

function WorkoutList({ workouts, onEdit }: TabProps) {
  const { lang } = useApp();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {workouts.slice(0, 30).map((w) => (
        <div
          key={w.id}
          onClick={() => onEdit(w)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line-soft)",
            cursor: "pointer", background: "var(--paper)",
          }}
        >
          <div style={{ fontSize: 22 }}>{w.type === "run" ? "🏃" : "💪"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {w.type === "run"
                ? (w.name || (lang === "es" ? "Carrera" : "Run"))
                : (lang === "es" ? (w.name_es || w.name) : (w.name_en || w.name_es || w.name))}
            </div>
            <div className="meta">{fmtDateShort(w.date, lang)}</div>
          </div>
          <div className="meta" style={{ textAlign: "right" }}>
            {w.type === "run"
              ? `${(w.distanceKm || 0).toFixed(1)} km`
              : `${(w.exercises || []).length} ${lang === "es" ? "ej." : "ex."}`}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ViewWorkouts;
