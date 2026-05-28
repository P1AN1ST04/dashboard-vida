/**
 * src/lib/ops/habitOps.ts — Operaciones de dominio para hábitos.
 */

import type { Habit, HabitLogEntry } from "@/types";
import { Storage } from "../storage";
import { todayISO } from "../helpers";

const MILESTONE_DAYS = [7, 30, 100, 365] as const;

/** Calcula racha consecutiva desde hoy hacia atrás. */
export function computeStreak(log: HabitLogEntry[]): number {
  if (!Array.isArray(log) || log.length === 0) return 0;
  const completedDays = new Set(log.filter((l) => l.completed).map((l) => l.date));
  if (completedDays.size === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (completedDays.has(iso)) {
      streak++;
    } else if (i === 0) {
      // Hoy aún no marcado, no rompe.
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export interface ToggleResult {
  willBeDone: boolean;
  streak: number;
  best: number;
  milestoneHit: number | null;
}

/** Marca o desmarca un hábito hoy. Recalcula racha y récord. */
export function toggle(habit: Habit): ToggleResult {
  const today = todayISO();
  const log: HabitLogEntry[] = Array.isArray(habit.log) ? [...habit.log] : [];
  const idx = log.findIndex((l) => l.date === today);

  let willBeDone: boolean;
  if (idx === -1) {
    log.push({ date: today, completed: true });
    willBeDone = true;
  } else {
    willBeDone = !log[idx].completed;
    log[idx] = { date: today, completed: willBeDone };
  }

  const streak = computeStreak(log);
  const best = Math.max(habit.best || 0, streak);

  Storage.update("habits", habit.id, {
    log,
    streak,
    best,
    doneToday: willBeDone,
  });

  const milestoneHit = willBeDone && MILESTONE_DAYS.includes(streak as 7 | 30 | 100 | 365) ? streak : null;

  if (milestoneHit !== null) {
    tryUnlockMilestone(milestoneHit);
  }

  return { willBeDone, streak, best, milestoneHit };
}

/** Desbloquea achievement por hito de racha. */
export function tryUnlockMilestone(streak: number): void {
  const map: Record<number, string> = { 14: "a2", 100: "a7" };
  const aid = map[streak];
  if (!aid) return;
  const achievements = Storage.get("achievements");
  const ach = achievements.find((a) => a.id === aid);
  if (ach && !ach.unlocked) {
    Storage.update("achievements", aid, {
      unlocked: true,
      unlockedAt: todayISO(),
    });
  }
}

export function isDoneToday(habit: Habit): boolean {
  const today = todayISO();
  return (habit.log || []).some((l) => l.date === today && l.completed);
}

export const HabitOps = {
  computeStreak,
  toggle,
  tryUnlockMilestone,
  isDoneToday,
} as const;
