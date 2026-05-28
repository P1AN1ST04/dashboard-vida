/**
 * src/lib/ops/goalOps.ts — Operaciones de dominio para metas.
 */

import type { Goal, GoalStatus } from "@/types";
import { Storage } from "../storage";
import { todayISO } from "../helpers";

export interface GoalUpdateResult {
  mdone: number;
  progress: number;
  status: GoalStatus;
  justCompleted: boolean;
}

export function incrementMilestone(goal: Goal): GoalUpdateResult {
  const mdone = Math.min((goal.mdone || 0) + 1, goal.milestones || 1);
  const progress = mdone / (goal.milestones || 1);
  const justCompleted = progress >= 1 && goal.status !== "completed";
  const status: GoalStatus = progress >= 1 ? "completed" : goal.status || "in_progress";

  Storage.update("goals", goal.id, { mdone, progress, status });

  if (justCompleted) {
    const achievements = Storage.get("achievements");
    const ach = achievements.find((a) => a.id === "a8");
    if (ach && !ach.unlocked) {
      Storage.update("achievements", "a8", {
        unlocked: true,
        unlockedAt: todayISO(),
      });
    }
  }

  return { mdone, progress, status, justCompleted };
}

export function decrementMilestone(goal: Goal): GoalUpdateResult {
  const mdone = Math.max(0, (goal.mdone || 0) - 1);
  const progress = mdone / (goal.milestones || 1);
  const status: GoalStatus = progress < 1 ? "in_progress" : goal.status;
  Storage.update("goals", goal.id, { mdone, progress, status });
  return { mdone, progress, status, justCompleted: false };
}

export const GoalOps = {
  incrementMilestone,
  decrementMilestone,
} as const;
