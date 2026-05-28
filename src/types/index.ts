// Tipos del dominio compartidos en toda la app.

export type Lang = "es" | "en";
export type Theme = "light" | "dark";
export type Currency = "PEN" | "USD" | "MXN" | "EUR";
export type View = "today" | "finance" | "habits" | "goals" | "calendar" | "workouts" | "progress";

export interface User {
  id?: string;
  name: string;
  initials: string;
  since: string;
  avatar: "main" | "happy" | "low";
  email?: string;
}

export interface Settings {
  currency: Currency;
  secondaryCurrency?: Currency;
  exchangeRate: number;
  lang: Lang;
  theme: Theme;
  budget: { monthly: number; daily: number };
  onboardingSeen?: boolean;
  weekTemplates?: WeekTemplate[];
  integrations?: {
    strava?: { connected: boolean };
    google?: { connected: boolean };
  };
  shortcutsToken?: string;
}

export interface WeekTemplate {
  dow: number;
  label_es: string;
  label_en: string;
  focus_es: string;
  focus_en: string;
  min: number;
}

export type PaymentMethod = "card" | "cash" | "transfer" | "yape" | "auto";

export interface Transaction {
  id: string;
  date: string;
  merchant_es: string;
  merchant_en: string;
  cat: string;
  amt: number;
  currency: Currency;
  method: PaymentMethod;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  name: string;
  icon: string;
  amount: number;
  currency: Currency;
  frequency: "monthly" | "yearly";
  dayOfMonth: number;
  category: string;
  subcategory?: string;
  active: boolean;
  startDate: string;
  lastChargeDate: string | null;
  notes?: string;
}

export interface HabitLogEntry {
  date: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  name_es: string;
  name_en: string;
  emoji: string;
  color: string;
  frequency: "daily" | "weekly";
  streak: number;
  best: number;
  log: HabitLogEntry[];
  doneToday: boolean;
  reminder?: string | null;
}

export interface Subtask {
  title: string;
  done: boolean;
}

export type GoalStatus = "in_progress" | "completed" | "paused";

export interface Goal {
  id: string;
  title_es: string;
  title_en: string;
  category: string;
  due: string;
  startDate: string;
  milestones: number;
  mdone: number;
  progress: number;
  status: GoalStatus;
  description?: string;
  subtasks: Subtask[];
  linkedHabits: string[];
}

export type WorkoutType = "gym" | "run";

export interface Exercise {
  name_es: string;
  name_en?: string;
  name?: string;
  sets: number;
  reps: string;
  weight: number;
  unit: string;
  rpe: number;
  notes?: string;
}

export interface Workout {
  id: string;
  type: WorkoutType;
  date: string;
  name?: string;
  name_es?: string;
  name_en?: string;
  exercises?: Exercise[];
  distanceKm?: number;
  durationMin?: number;
  pace?: string;
  avgHr?: number;
  elevation?: number;
  notes?: string;
  source?: "manual" | "strava";
}

export interface Achievement {
  id: string;
  unlocked: boolean;
  unlockedAt: string | null;
  title_es: string;
  title_en: string;
  desc_es: string;
  desc_en: string;
  icon: string;
}

export interface Collections {
  user: User | null;
  settings: Settings | null;
  transactions: Transaction[];
  subscriptions: Subscription[];
  habits: Habit[];
  goals: Goal[];
  workouts: Workout[];
  achievements: Achievement[];
}

export type CollectionName = keyof Collections;
