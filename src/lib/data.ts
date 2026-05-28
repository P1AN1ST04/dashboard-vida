/**
 * src/lib/data.ts — Métricas y agregados derivados de Storage.
 *
 * Estos getters NO cachean: se recalculan cada vez. Para una app personal
 * el costo es trivial. Si crece, se pueden memoizar después.
 */

import type { Currency, Habit, Workout } from "@/types";
import { Storage } from "./storage";
import { convertCurrency } from "./helpers";
import { HabitOps } from "./ops/habitOps";

export interface Metrics {
  daysUsing: number;
  habitsDone: number;
  saved: number;
  volumeLifted: number;
  monthIncome: number;
  monthSpent: number;
  todayBudget: number;
  todaySpent: number;
}

export function computeMetrics(): Metrics {
  const txs = Storage.get("transactions");
  const settings = Storage.get("settings");
  const today = new Date();
  const todayISOStr = today.toISOString().slice(0, 10);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const txsToday = txs.filter((t) => t.date === todayISOStr && t.amt < 0);
  const txsThisMonth = txs.filter((t) => t.date >= monthStart);
  const incomeThisMonth = txsThisMonth.filter((t) => t.amt > 0).reduce((s, t) => s + t.amt, 0);
  const spentThisMonth = txsThisMonth.filter((t) => t.amt < 0).reduce((s, t) => s + Math.abs(t.amt), 0);

  const mainCurrency: Currency = settings?.currency || "PEN";
  const todaySpent = txsToday.reduce((sum, t) => {
    return sum + convertCurrency(Math.abs(t.amt), t.currency || "PEN", mainCurrency);
  }, 0);

  const todayBudget = settings?.budget?.daily || 80;
  const userSince = Storage.get("user")?.since;
  const daysUsing = userSince ? Math.max(1, Math.floor((today.getTime() - new Date(userSince).getTime()) / 86400000)) : 1;

  const workouts = Storage.get("workouts");
  const volumeLifted = workouts
    .filter((w) => w.type === "gym" && Array.isArray(w.exercises))
    .reduce((sum, w) => sum + (w.exercises || []).reduce((s, ex) => {
      return s + (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);
    }, 0), 0);

  const habits = Storage.get("habits");
  const habitsDone = habits.reduce((s, h) => s + (h.log?.filter((l) => l.completed).length || 0), 0);

  return {
    daysUsing,
    habitsDone,
    saved: Math.max(0, incomeThisMonth - spentThisMonth),
    volumeLifted: Math.round(volumeLifted),
    monthIncome: incomeThisMonth,
    monthSpent: spentThisMonth,
    todayBudget,
    todaySpent: Number(todaySpent.toFixed(2)),
  };
}

export interface CashflowMonth {
  m_es: string;
  m_en: string;
  in: number;
  out: number;
}

export function computeCashflow(): CashflowMonth[] {
  const txs = Storage.get("transactions");
  const months: CashflowMonth[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const monthTxs = txs.filter((t) => t.date.startsWith(monthStr));
    const income = monthTxs.filter((t) => t.amt > 0).reduce((s, t) => s + t.amt, 0);
    const out = monthTxs.filter((t) => t.amt < 0).reduce((s, t) => s + Math.abs(t.amt), 0);
    months.push({
      m_en: m.toLocaleString("en-US", { month: "short" }),
      m_es: m.toLocaleString("es-ES", { month: "short" }).slice(0, 3),
      in: Math.round(income),
      out: Math.round(out),
    });
  }
  return months;
}

export interface CategoryAggregate {
  key: string;
  amt: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  cat_housing: "oklch(45% 0.07 30)",
  cat_food: "var(--terracotta)",
  cat_transport: "var(--ochre)",
  cat_health: "var(--sage)",
  cat_leisure: "oklch(55% 0.10 280)",
  cat_subs: "oklch(55% 0.08 220)",
  cat_education: "oklch(50% 0.09 320)",
  cat_other: "oklch(60% 0.02 60)",
};

export function computeCategories(): CategoryAggregate[] {
  const txs = Storage.get("transactions");
  const monthStart = new Date();
  const monthISO = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
  const monthTxs = txs.filter((t) => t.date >= monthISO && t.amt < 0);
  const settings = Storage.get("settings");
  const mainCurrency: Currency = settings?.currency || "PEN";

  const totals: Record<string, number> = {};
  for (const tx of monthTxs) {
    const amt = convertCurrency(Math.abs(tx.amt), tx.currency || "PEN", mainCurrency);
    const cat = tx.cat || "cat_other";
    totals[cat] = (totals[cat] || 0) + amt;
  }

  return Object.entries(totals)
    .map(([key, amt]) => ({ key, amt: Number(amt.toFixed(2)), color: CATEGORY_COLORS[key] || CATEGORY_COLORS.cat_other }))
    .sort((a, b) => b.amt - a.amt);
}

/** Heatmap real basado en hábitos completados por día. 371 días retrocediendo. */
export function computeHeatmap(): number[] {
  const habits = Storage.get("habits");
  const cells: number[] = [];
  const now = new Date();
  for (let i = 371; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    let count = 0;
    for (const h of habits) {
      if ((h.log || []).some((l) => l.date === iso && l.completed)) count++;
    }
    let lvl = 0;
    if (count >= 6) lvl = 4;
    else if (count >= 4) lvl = 3;
    else if (count >= 2) lvl = 2;
    else if (count >= 1) lvl = 1;
    cells.push(lvl);
  }
  return cells;
}

/** Volumen semanal de las últimas 8 semanas, en kilos movidos. */
export function computeWeeklyVolume(): number[] {
  const workouts: Workout[] = Storage.get("workouts").filter((w) => w.type === "gym");
  if (workouts.length === 0) return [];
  const now = new Date();
  const weeks: number[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7 - now.getDay());
    const weekStartISO = weekStart.toISOString().slice(0, 10);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndISO = weekEnd.toISOString().slice(0, 10);
    const weekWorkouts = workouts.filter((w) => w.date >= weekStartISO && w.date < weekEndISO);
    const vol = weekWorkouts.reduce((sum, w) => {
      return sum + (w.exercises || []).reduce((s, ex) => {
        return s + (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);
      }, 0);
    }, 0);
    weeks.push(Math.round(vol));
  }
  return weeks;
}

/** Progresión de peso muerto desde el historial. */
export function computeDeadliftProgression(): number[] {
  const workouts: Workout[] = Storage.get("workouts").filter((w) => w.type === "gym");
  const progression: number[] = [];
  for (const w of workouts.sort((a, b) => a.date.localeCompare(b.date))) {
    const dl = (w.exercises || []).find((ex) => {
      const name = (ex.name_es || ex.name || "").toLowerCase();
      return name.includes("peso muerto") || name.includes("deadlift");
    });
    if (dl?.weight) progression.push(Number(dl.weight));
  }
  return progression.slice(-12);
}

export interface BodyFocus {
  back?: number; chest?: number; shoulders?: number;
  biceps?: number; triceps?: number; quads?: number;
  glutes?: number; hamstrings?: number; core?: number; calves?: number;
}

const MUSCLE_KEYWORDS: Record<keyof BodyFocus, string[]> = {
  back: ["deadlift", "peso muerto", "row", "remo", "pull-up", "dominada", "pulldown", "jalon"],
  chest: ["bench", "press de banca", "push-up", "flexion", "pec", "fly"],
  shoulders: ["overhead press", "press militar", "lateral raise", "elevacion lateral", "shoulder"],
  biceps: ["curl", "biceps"],
  triceps: ["triceps", "dip", "fondo", "skullcrusher"],
  quads: ["squat", "sentadilla", "leg press", "prensa", "lunge", "zancada"],
  glutes: ["hip thrust", "gluteo", "rdl", "romanian"],
  hamstrings: ["leg curl", "femoral", "hamstring"],
  core: ["plank", "plancha", "ab", "core", "crunch"],
  calves: ["calf", "pantorrilla"],
};

export function computeBodyFocus(): BodyFocus {
  const workouts = Storage.get("workouts").filter((w) => w.type === "gym");
  if (workouts.length === 0) return {};
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString().slice(0, 10);
  const recent = workouts.filter((w) => w.date >= weekAgoISO);

  const totals: Record<string, number> = {};
  for (const k of Object.keys(MUSCLE_KEYWORDS)) totals[k] = 0;
  let grandTotal = 0;

  for (const w of recent) {
    for (const ex of w.exercises || []) {
      const name = ((ex.name_es || ex.name || "") + " " + (ex.name_en || "")).toLowerCase();
      const vol = (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);
      for (const [muscle, kws] of Object.entries(MUSCLE_KEYWORDS)) {
        if (kws.some((k) => name.includes(k))) {
          totals[muscle] += vol;
          grandTotal += vol;
        }
      }
    }
  }

  if (grandTotal === 0) return {};
  const result: BodyFocus = {};
  for (const [k, v] of Object.entries(totals)) {
    result[k as keyof BodyFocus] = v / grandTotal;
  }
  return result;
}

export function todayHasHabits(): boolean {
  return Storage.get("habits").length > 0;
}

/** Re-exporta HabitOps.isDoneToday para uso conveniente. */
export const isDoneToday = HabitOps.isDoneToday;

export type { Habit };
