/**
 * src/lib/seed.ts — Datos iniciales mínimos.
 *
 * Solo sembramos lo esencial (user, settings, achievements catalog).
 * Habits/goals/transactions/workouts/subscriptions arrancan en [].
 */

import type { Achievement, Settings, User } from "@/types";
import { Storage } from "./storage";

const DEFAULT_USER: User = {
  name: "Michel",
  initials: "M",
  since: new Date().toISOString().slice(0, 10),
  avatar: "main",
};

const DEFAULT_SETTINGS: Settings = {
  currency: "PEN",
  secondaryCurrency: "USD",
  exchangeRate: 3.75,
  lang: "es",
  theme: "light",
  budget: { monthly: 2500, daily: 80 },
  onboardingSeen: false,
};

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "a1", unlocked: false, unlockedAt: null, title_en: "First step", title_es: "Primer paso", icon: "🌱", desc_en: "Logged your first habit", desc_es: "Marcaste tu primer habito" },
  { id: "a2", unlocked: false, unlockedAt: null, title_en: "Two-week tide", title_es: "Marea de 14", icon: "🌊", desc_en: "14-day streak", desc_es: "Racha de 14 dias" },
  { id: "a3", unlocked: false, unlockedAt: null, title_en: "Quiet saver", title_es: "Ahorrador silente", icon: "🌾", desc_en: "Saved S/ 1,000", desc_es: "Ahorraste S/ 1,000" },
  { id: "a4", unlocked: false, unlockedAt: null, title_en: "Body in motion", title_es: "Cuerpo en marcha", icon: "🏃", desc_en: "20 training sessions", desc_es: "20 entrenamientos" },
  { id: "a5", unlocked: false, unlockedAt: null, title_en: "Iron paragraph", title_es: "Parrafo de hierro", icon: "📖", desc_en: "100 pages in one week", desc_es: "100 paginas en una semana" },
  { id: "a6", unlocked: false, unlockedAt: null, title_en: "Compound month", title_es: "Mes compuesto", icon: "🌗", desc_en: "30 days under budget", desc_es: "30 dias bajo presupuesto" },
  { id: "a7", unlocked: false, unlockedAt: null, title_en: "Hundred mornings", title_es: "Cien mananas", icon: "🌅", desc_en: "100-day streak", desc_es: "Racha de 100 dias" },
  { id: "a8", unlocked: false, unlockedAt: null, title_en: "Cathedral", title_es: "Catedral", icon: "⛰️", desc_en: "Complete a long-term goal", desc_es: "Completa una meta de largo plazo" },
  { id: "a9", unlocked: false, unlockedAt: null, title_en: "Wide reader", title_es: "Lector amplio", icon: "📚", desc_en: "24 books in a year", desc_es: "24 libros en un ano" },
];

export interface SeedOptions {
  force?: boolean;
  user?: Partial<User>;
}

export function runSeed(opts: SeedOptions = {}): string[] {
  const seeded: string[] = [];
  const force = !!opts.force;

  if (force || Storage.get("user") === null) {
    Storage.set("user", { ...DEFAULT_USER, ...opts.user });
    seeded.push("user");
  }
  if (force || Storage.get("settings") === null) {
    Storage.set("settings", DEFAULT_SETTINGS);
    seeded.push("settings");
  }
  if (force) {
    Storage.set("subscriptions", []);
    Storage.set("habits", []);
    Storage.set("goals", []);
    Storage.set("transactions", []);
    Storage.set("workouts", []);
    seeded.push("subscriptions", "habits", "goals", "transactions", "workouts");
  }
  if (force || Storage.get("achievements").length === 0) {
    Storage.set("achievements", DEFAULT_ACHIEVEMENTS);
    seeded.push("achievements");
  }
  if (seeded.length > 0) console.log("[seed] Seeded:", seeded.join(", "));
  return seeded;
}

export function wipeAndReseed(): void {
  Storage.reset();
  runSeed({ force: true });
}

export const Seed = {
  run: runSeed,
  wipe: wipeAndReseed,
} as const;
