/**
 * src/lib/ops/workoutOps.ts — Operaciones de dominio para entrenamientos.
 */

import type { Exercise, Workout } from "@/types";
import { Storage } from "../storage";
import { todayISO } from "../helpers";

export interface WorkoutTemplate {
  key: string;
  name_es: string;
  name_en: string;
  exercises: Exercise[];
}

export const GYM_TEMPLATES: WorkoutTemplate[] = [
  {
    key: "push",
    name_es: "Push — Pecho, Hombros, Tríceps",
    name_en: "Push — Chest, Shoulders, Triceps",
    exercises: [
      { name_es: "Press de banca", name_en: "Bench press", sets: 4, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Press militar", name_en: "Overhead press", sets: 3, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Press inclinado", name_en: "Incline press", sets: 3, reps: "10", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Elevación lateral", name_en: "Lateral raise", sets: 3, reps: "12", weight: 0, unit: "kg", rpe: 6 },
      { name_es: "Triceps en polea", name_en: "Triceps pushdown", sets: 3, reps: "12", weight: 0, unit: "kg", rpe: 7 },
    ],
  },
  {
    key: "pull",
    name_es: "Pull — Espalda, Bíceps",
    name_en: "Pull — Back, Biceps",
    exercises: [
      { name_es: "Peso muerto", name_en: "Deadlift", sets: 4, reps: "5", weight: 0, unit: "kg", rpe: 8 },
      { name_es: "Dominadas", name_en: "Pull-ups", sets: 4, reps: "8", weight: 0, unit: "kg", rpe: 8 },
      { name_es: "Remo con barra", name_en: "Barbell row", sets: 3, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Face pulls", name_en: "Face pulls", sets: 3, reps: "12", weight: 0, unit: "kg", rpe: 6 },
      { name_es: "Curl con barra", name_en: "Barbell curl", sets: 3, reps: "10", weight: 0, unit: "kg", rpe: 7 },
    ],
  },
  {
    key: "legs",
    name_es: "Legs — Cuádriceps, Glúteos",
    name_en: "Legs — Quads, Glutes",
    exercises: [
      { name_es: "Sentadilla", name_en: "Squat", sets: 4, reps: "6", weight: 0, unit: "kg", rpe: 8 },
      { name_es: "Peso muerto rumano", name_en: "Romanian deadlift", sets: 3, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Hip thrust", name_en: "Hip thrust", sets: 3, reps: "10", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Prensa de pierna", name_en: "Leg press", sets: 3, reps: "12", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Pantorrilla", name_en: "Calf raise", sets: 4, reps: "12", weight: 0, unit: "kg", rpe: 7 },
    ],
  },
  {
    key: "upper",
    name_es: "Upper — Tren superior",
    name_en: "Upper body",
    exercises: [
      { name_es: "Press de banca", name_en: "Bench press", sets: 4, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Remo con barra", name_en: "Barbell row", sets: 4, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Press militar", name_en: "Overhead press", sets: 3, reps: "10", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Dominadas", name_en: "Pull-ups", sets: 3, reps: "8", weight: 0, unit: "kg", rpe: 7 },
    ],
  },
  {
    key: "fullbody",
    name_es: "Full Body — Cuerpo completo",
    name_en: "Full Body",
    exercises: [
      { name_es: "Sentadilla", name_en: "Squat", sets: 3, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Press de banca", name_en: "Bench press", sets: 3, reps: "8", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Remo", name_en: "Row", sets: 3, reps: "10", weight: 0, unit: "kg", rpe: 7 },
      { name_es: "Plancha", name_en: "Plank", sets: 3, reps: "60s", weight: 0, unit: "s", rpe: 6 },
    ],
  },
];

export function createWorkout(workout: Partial<Workout>): Workout {
  return Storage.add("workouts", {
    date: todayISO(),
    type: "gym",
    exercises: [],
    source: "manual",
    ...workout,
  });
}

/** Último peso usado para un ejercicio (auto-incremento). */
export function lastWeightFor(exerciseName: string): number {
  const workouts = Storage.get("workouts")
    .filter((w) => w.type === "gym")
    .sort((a, b) => b.date.localeCompare(a.date));
  const target = (exerciseName || "").toLowerCase();
  for (const w of workouts) {
    for (const ex of w.exercises || []) {
      const n = ((ex.name_es || ex.name || "") + " " + (ex.name_en || "")).toLowerCase();
      if (n.includes(target) && ex.weight) {
        return Number(ex.weight);
      }
    }
  }
  return 0;
}

export const WorkoutOps = {
  GYM_TEMPLATES,
  createWorkout,
  lastWeightFor,
} as const;
