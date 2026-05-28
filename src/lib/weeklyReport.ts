/**
 * src/lib/weeklyReport.ts — Reporte semanal sin dependencias UI.
 *
 * Compara la semana actual (lun→dom) vs la anterior y agrega stats
 * de gastos, ingresos, hábitos y racha.
 *
 * Persiste en localStorage la fecha del último report mostrado para
 * decidir si volver a mostrarlo (`shouldShow`).
 */

import type { Currency, Transaction, Habit } from "@/types";
import { Storage } from "./storage";
import { convertCurrency } from "./helpers";

const SHOWN_KEY = "vida.weeklyReportShown";

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  thisSpent: number;
  lastSpent: number;
  spentDelta: number;
  thisIncome: number;
  mainCurrency: Currency;
  topCategory: { key: string; amount: number } | null;
  habitsCompleted: number;
  habitsPossible: number;
  habitsCompletionRate: number;
  bestDay: string | null;
  bestDayCount: number;
  topStreak: number;
  topStreakHabit: Pick<Habit, "emoji" | "name_es" | "name_en"> | null;
}

function startOfWeek(offsetWeeks = 0): Date {
  const now = new Date();
  const day = now.getDay(); // 0=domingo, 1=lunes
  const daysToMonday = (day === 0 ? 6 : day - 1) + offsetWeeks * 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
}

function endOfWeek(offsetWeeks = 0): Date {
  const start = startOfWeek(offsetWeeks);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function generate(): WeeklyReport {
  const txs: Transaction[] = Storage.get("transactions");
  const habits: Habit[] = Storage.get("habits");
  const settings = Storage.get("settings");
  const mainCurrency: Currency = settings?.currency ?? "PEN";

  const thisWeekStart = toISO(startOfWeek(0));
  const thisWeekEnd   = toISO(endOfWeek(0));
  const lastWeekStart = toISO(startOfWeek(-1));
  const lastWeekEnd   = toISO(endOfWeek(-1));

  const thisWeekTxs = txs.filter((t) => t.date >= thisWeekStart && t.date <= thisWeekEnd);
  const lastWeekTxs = txs.filter((t) => t.date >= lastWeekStart && t.date <= lastWeekEnd);

  const thisSpent = thisWeekTxs
    .filter((t) => t.amt < 0)
    .reduce((s, t) => s + convertCurrency(Math.abs(t.amt), t.currency || "PEN", mainCurrency), 0);
  const lastSpent = lastWeekTxs
    .filter((t) => t.amt < 0)
    .reduce((s, t) => s + convertCurrency(Math.abs(t.amt), t.currency || "PEN", mainCurrency), 0);
  const thisIncome = thisWeekTxs
    .filter((t) => t.amt > 0)
    .reduce((s, t) => s + convertCurrency(t.amt, t.currency || "PEN", mainCurrency), 0);

  const spentDelta = lastSpent > 0 ? ((thisSpent - lastSpent) / lastSpent) * 100 : 0;

  const catTotals: Record<string, number> = {};
  thisWeekTxs.filter((t) => t.amt < 0).forEach((t) => {
    const cat = t.cat || "cat_other";
    catTotals[cat] = (catTotals[cat] || 0) + convertCurrency(Math.abs(t.amt), t.currency || "PEN", mainCurrency);
  });
  const topCategoryEntry = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  const allLogsThis = habits.reduce((sum, h) => {
    const logs = (h.log || []).filter((l) => l.date >= thisWeekStart && l.date <= thisWeekEnd && l.completed);
    return sum + logs.length;
  }, 0);
  const possibleHabits = habits.length * 7;

  const dayCounts: Record<string, number> = {};
  habits.forEach((h) => {
    (h.log || []).forEach((l) => {
      if (l.completed && l.date >= thisWeekStart && l.date <= thisWeekEnd) {
        dayCounts[l.date] = (dayCounts[l.date] || 0) + 1;
      }
    });
  });
  const bestDayEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const bestDay = bestDayEntry ? bestDayEntry[0] : null;
  const bestDayCount = bestDayEntry ? bestDayEntry[1] : 0;

  const topStreak = Math.max(0, ...habits.map((h) => h.streak || 0));
  const topStreakHabit = habits.find((h) => (h.streak || 0) === topStreak && topStreak > 0);

  return {
    weekStart: thisWeekStart,
    weekEnd:   thisWeekEnd,
    thisSpent, lastSpent, spentDelta, thisIncome,
    mainCurrency,
    topCategory: topCategoryEntry ? { key: topCategoryEntry[0], amount: topCategoryEntry[1] } : null,
    habitsCompleted: allLogsThis,
    habitsPossible:  possibleHabits,
    habitsCompletionRate: possibleHabits > 0 ? (allLogsThis / possibleHabits) * 100 : 0,
    bestDay, bestDayCount,
    topStreak,
    topStreakHabit: topStreakHabit
      ? { emoji: topStreakHabit.emoji, name_es: topStreakHabit.name_es, name_en: topStreakHabit.name_en }
      : null,
  };
}

export function shouldShow(): boolean {
  const day = new Date().getDay();
  if (day !== 0 && day !== 1) return false; // solo domingo/lunes
  const lastShown = localStorage.getItem(SHOWN_KEY);
  if (!lastShown) return true;
  return lastShown !== toISO(new Date());
}

export function markShown(): void {
  localStorage.setItem(SHOWN_KEY, toISO(new Date()));
}

export function resetShown(): void {
  localStorage.removeItem(SHOWN_KEY);
}

export const WeeklyReport = { generate, shouldShow, markShown, resetShown } as const;
