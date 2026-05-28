/**
 * src/components/modals/WorkoutLogModal.tsx — Registrar entrenamiento.
 *
 * Modos: gym (ejercicios + sets/reps/weight/RPE, plantillas PPL/UL/FB) y run
 * (distancia, duración, pace auto, HR, elevación).
 */

import { useState, type FormEvent } from "react";
import { useApp } from "@/hooks/useApp";
import { Icon } from "@/components/ui/Icon";
import { Storage, WorkoutOps, GYM_TEMPLATES, todayISO } from "@/lib";
import type { Workout, WorkoutType, Exercise } from "@/types";

export interface WorkoutLogModalProps {
  workout?: Workout | null;
  onClose: () => void;
}

function computePace(distanceKm: number, durationMin: number): string {
  if (!distanceKm || !durationMin || distanceKm <= 0) return "";
  const paceMinPerKm = durationMin / distanceKm;
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function WorkoutLogModal({ workout, onClose }: WorkoutLogModalProps) {
  const { lang } = useApp();
  const isEdit = !!workout;

  const [mode, setMode]         = useState<WorkoutType>(workout?.type ?? "gym");
  const [date, setDate]         = useState(workout?.date ?? todayISO());
  const [name, setName]         = useState(workout?.name_es ?? workout?.name ?? "");
  const [exercises, setExercises] = useState<Exercise[]>(workout?.exercises ?? []);
  const [distanceKm, setDistanceKm] = useState<string>(workout?.distanceKm != null ? String(workout.distanceKm) : "");
  const [durationMin, setDurationMin] = useState<string>(workout?.durationMin != null ? String(workout.durationMin) : "");
  const [avgHr, setAvgHr]       = useState<string>(workout?.avgHr != null ? String(workout.avgHr) : "");
  const [elevation, setElevation] = useState<string>(workout?.elevation != null ? String(workout.elevation) : "");
  const [notes, setNotes]       = useState(workout?.notes ?? "");
  const [error, setError]       = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  function applyTemplate(tplKey: string) {
    const tpl = GYM_TEMPLATES.find((t) => t.key === tplKey);
    if (!tpl) return;
    setName(lang === "es" ? tpl.name_es : tpl.name_en);
    const enriched = tpl.exercises.map((ex) => {
      const lastW = WorkoutOps.lastWeightFor(ex.name_es || ex.name || "");
      return { ...ex, weight: lastW || ex.weight };
    });
    setExercises(enriched);
    setActiveTemplate(tpl.key);
  }

  function addExercise() {
    setExercises([
      ...exercises,
      { name_es: "", name_en: "", sets: 3, reps: "10", weight: 0, unit: "kg", rpe: 7 },
    ]);
  }
  function updateExercise(i: number, patch: Partial<Exercise>) {
    setExercises(exercises.map((ex, idx) => idx === i ? { ...ex, ...patch } : ex));
  }
  function removeExercise(i: number) {
    setExercises(exercises.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "gym") {
      if (!name.trim()) {
        setError(lang === "es" ? "Pon un nombre" : "Add a name");
        return;
      }
      if (exercises.length === 0) {
        setError(lang === "es" ? "Agrega al menos un ejercicio" : "Add at least one exercise");
        return;
      }
    } else {
      if (!distanceKm || parseFloat(distanceKm) <= 0) {
        setError(lang === "es" ? "Distancia requerida" : "Distance required");
        return;
      }
      if (!durationMin || parseFloat(durationMin) <= 0) {
        setError(lang === "es" ? "Duración requerida" : "Duration required");
        return;
      }
    }

    const payload: Partial<Workout> = mode === "gym"
      ? {
          type: "gym",
          date,
          name_es: name,
          name_en: name,
          name,
          exercises,
          notes: notes || undefined,
          source: workout?.source ?? "manual",
        }
      : {
          type: "run",
          date,
          name: name || (lang === "es" ? "Carrera" : "Run"),
          distanceKm: parseFloat(distanceKm),
          durationMin: parseFloat(durationMin),
          pace: computePace(parseFloat(distanceKm), parseFloat(durationMin)),
          avgHr: avgHr ? parseFloat(avgHr) : undefined,
          elevation: elevation ? parseFloat(elevation) : undefined,
          notes: notes || undefined,
          source: workout?.source ?? "manual",
        };

    if (isEdit && workout) {
      Storage.update("workouts", workout.id, payload);
    } else {
      Storage.add("workouts", payload);
    }
    onClose();
  }

  function handleDelete() {
    if (!isEdit || !workout) return;
    const msg = lang === "es" ? "Borrar este entrenamiento?" : "Delete this workout?";
    if (window.confirm(msg)) {
      Storage.remove("workouts", workout.id);
      onClose();
    }
  }

  const paceLive = mode === "run" && distanceKm && durationMin
    ? computePace(parseFloat(distanceKm), parseFloat(durationMin))
    : "";

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 580, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="kicker">
          {isEdit
            ? (lang === "es" ? "Editar entreno" : "Edit workout")
            : (lang === "es" ? "Nuevo entreno" : "New workout")}
        </div>
        <div className="h2" style={{ marginBottom: 16, marginTop: 4 }}>
          {mode === "gym" ? "💪" : "🏃"} {name || (lang === "es" ? "Entrenamiento" : "Training")}
        </div>

        {!isEdit && (
          <div className="seg" style={{ marginBottom: 16 }}>
            <button type="button" className={`seg-btn ${mode === "gym" ? "on" : ""}`} onClick={() => setMode("gym")}>
              {lang === "es" ? "Gimnasio" : "Gym"}
            </button>
            <button type="button" className={`seg-btn ${mode === "run" ? "on" : ""}`} onClick={() => setMode("run")}>
              Running
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">{lang === "es" ? "Fecha" : "Date"}</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div style={{ flex: 2 }}>
              <label className="form-label">{lang === "es" ? "Nombre" : "Name"}</label>
              <input
                type="text" className="input"
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder={
                  mode === "gym"
                    ? (lang === "es" ? "Pull - Espalda" : "Pull - Back")
                    : (lang === "es" ? "Carrera larga" : "Long run")
                }
              />
            </div>
          </div>

          {mode === "gym" ? (
            <>
              {!isEdit && exercises.length === 0 && (
                <div className="form-row">
                  <label className="form-label">{lang === "es" ? "Plantilla" : "Template"}</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {GYM_TEMPLATES.map((tpl) => (
                      <button
                        type="button" key={tpl.key}
                        onClick={() => applyTemplate(tpl.key)}
                        className={`pill${activeTemplate === tpl.key ? " warm" : ""}`}
                        style={{
                          cursor: "pointer",
                          border: activeTemplate === tpl.key ? "1px solid var(--terracotta)" : "1px solid var(--line)",
                        }}
                      >
                        {(lang === "es" ? tpl.name_es : tpl.name_en).split(" — ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">{lang === "es" ? "Ejercicios" : "Exercises"}</label>
                {exercises.length === 0 && (
                  <div className="meta italic" style={{
                    padding: 16, textAlign: "center",
                    border: "1px dashed var(--line)", borderRadius: 8,
                  }}>
                    {lang === "es" ? "Elige una plantilla o agrega manualmente" : "Pick a template or add manually"}
                  </div>
                )}
                {exercises.map((ex, i) => (
                  <div key={i} style={{
                    border: "1px solid var(--line-soft)", borderRadius: 8,
                    padding: 10, marginBottom: 8,
                  }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <input
                        type="text" className="input"
                        value={ex.name_es || ex.name || ""}
                        onChange={(e) => updateExercise(i, { name_es: e.target.value, name: e.target.value })}
                        placeholder={lang === "es" ? "Ejercicio" : "Exercise"}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(i)}
                        className="btn"
                        style={{ padding: "0 10px" }}
                      >−</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                      <input type="number" className="input mono" value={ex.sets} onChange={(e) => updateExercise(i, { sets: Number(e.target.value) })} placeholder="Sets" />
                      <input type="text"   className="input mono" value={ex.reps} onChange={(e) => updateExercise(i, { reps: e.target.value })} placeholder="Reps" />
                      <input type="number" step={0.5} className="input mono" value={ex.weight} onChange={(e) => updateExercise(i, { weight: Number(e.target.value) })} placeholder="kg" />
                      <input type="number" min={1} max={10} className="input mono" value={ex.rpe} onChange={(e) => updateExercise(i, { rpe: Number(e.target.value) })} placeholder="RPE" />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn" onClick={addExercise} style={{ width: "100%", marginTop: 4 }}>
                  + {lang === "es" ? "Ejercicio" : "Exercise"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="form-row" style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">{lang === "es" ? "Distancia (km)" : "Distance (km)"}</label>
                  <input
                    type="number" step={0.01} min={0} className="input mono"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">{lang === "es" ? "Duración (min)" : "Duration (min)"}</label>
                  <input
                    type="number" step={0.1} min={0} className="input mono"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    required
                  />
                </div>
              </div>
              {paceLive && (
                <div className="meta" style={{ marginBottom: 8 }}>
                  {lang === "es" ? "Ritmo" : "Pace"}: <strong>{paceLive} / km</strong>
                </div>
              )}
              <div className="form-row" style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">{lang === "es" ? "FC promedio" : "Avg HR"}</label>
                  <input
                    type="number" min={0} max={250} className="input mono"
                    value={avgHr} onChange={(e) => setAvgHr(e.target.value)}
                    placeholder="bpm"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">{lang === "es" ? "Elevación (m)" : "Elevation (m)"}</label>
                  <input
                    type="number" min={0} className="input mono"
                    value={elevation} onChange={(e) => setElevation(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Notas" : "Notes"}</label>
            <textarea
              className="input" rows={2}
              value={notes} onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={handleDelete}>
                {lang === "es" ? "Borrar" : "Delete"}
              </button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={onClose}>
                {lang === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button type="submit" className="btn warm">
                {isEdit
                  ? (lang === "es" ? "Guardar" : "Save")
                  : (lang === "es" ? "Registrar" : "Log")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkoutLogModal;
