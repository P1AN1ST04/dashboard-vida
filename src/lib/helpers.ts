/**
 * src/lib/helpers.ts — Helpers puros (formato, fechas, monedas).
 */

import type { Currency, Transaction } from "@/types";
import { Storage } from "./storage";

const CURRENCY_PREFIX: Record<Currency, string> = {
  PEN: "S/ ",
  USD: "$",
  MXN: "$",
  EUR: "€",
};

/** Formatea un monto con prefijo de moneda. */
export function fmtMoney(n: number | null | undefined, currency: Currency = "PEN"): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const decimals = abs % 1 ? 2 : 0;
  const formatted = abs.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  });
  return sign + (CURRENCY_PREFIX[currency] || "") + formatted;
}

/** Convierte entre PEN y USD usando la tasa guardada en settings. */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const settings = Storage.get("settings");
  const rate = settings?.exchangeRate || 3.75;
  if (from === "USD" && to === "PEN") return amount * rate;
  if (from === "PEN" && to === "USD") return amount / rate;
  return amount;
}

export function sumInCurrency(txs: Transaction[], targetCurrency: Currency): number {
  return txs.reduce((sum, t) => sum + convertCurrency(t.amt, t.currency || "PEN", targetCurrency), 0);
}

/** Devuelve YYYY-MM-DD para hoy en local time. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Formatea fecha corta ej "15 mar". */
export function fmtDateShort(iso: string, lang: "es" | "en"): string {
  const d = new Date(iso);
  const months = lang === "es"
    ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/** Saludo según hora del día. */
export function greeting(lang: "es" | "en", t: { greeting_morning: string; greeting_afternoon: string; greeting_evening: string }): string {
  const h = new Date().getHours();
  if (h < 12) return t.greeting_morning;
  if (h < 19) return t.greeting_afternoon;
  return t.greeting_evening;
}

// ──────────────────────────────────────────────────────────────
// Constantes de dominio (categorías, métodos de pago, etc.)
// ──────────────────────────────────────────────────────────────

export interface Category {
  key: string;
  name_es: string;
  name_en: string;
  emoji: string;
  type: "income" | "expense";
}

export const CATEGORIES: Category[] = [
  { key: "income", name_es: "Ingreso", name_en: "Income", emoji: "💰", type: "income" },
  { key: "cat_housing", name_es: "Vivienda", name_en: "Housing", emoji: "🏠", type: "expense" },
  { key: "cat_food", name_es: "Alimentación", name_en: "Food", emoji: "🍴", type: "expense" },
  { key: "cat_transport", name_es: "Transporte", name_en: "Transport", emoji: "🚌", type: "expense" },
  { key: "cat_health", name_es: "Salud", name_en: "Health", emoji: "💊", type: "expense" },
  { key: "cat_leisure", name_es: "Ocio", name_en: "Leisure", emoji: "🎬", type: "expense" },
  { key: "cat_subs", name_es: "Suscripciones", name_en: "Subscriptions", emoji: "📱", type: "expense" },
  { key: "cat_education", name_es: "Educación", name_en: "Education", emoji: "📚", type: "expense" },
  { key: "cat_other", name_es: "Otros", name_en: "Other", emoji: "📦", type: "expense" },
];

export const PAYMENT_METHODS = [
  { key: "card", name_es: "Tarjeta", name_en: "Card" },
  { key: "cash", name_es: "Efectivo", name_en: "Cash" },
  { key: "transfer", name_es: "Transferencia", name_en: "Transfer" },
  { key: "yape", name_es: "Yape/Plin", name_en: "Yape/Plin" },
  { key: "auto", name_es: "Auto (sub)", name_en: "Auto (sub)" },
] as const;

export const GOAL_CATEGORIES = [
  { key: "finance", name_es: "Finanzas", name_en: "Finance", color: "var(--terracotta)" },
  { key: "mind", name_es: "Mente", name_en: "Mind", color: "var(--sage)" },
  { key: "body", name_es: "Cuerpo", name_en: "Body", color: "var(--rust)" },
  { key: "career", name_es: "Carrera", name_en: "Career", color: "var(--ochre)" },
  { key: "other", name_es: "Otros", name_en: "Other", color: "var(--ink-3)" },
] as const;

export const HABIT_COLORS = [
  { key: "terracotta", value: "var(--terracotta)" },
  { key: "sage", value: "var(--sage)" },
  { key: "ochre", value: "var(--ochre)" },
  { key: "rust", value: "var(--rust)" },
  { key: "blue", value: "oklch(60% 0.10 220)" },
  { key: "purple", value: "oklch(55% 0.10 280)" },
  { key: "rose", value: "oklch(60% 0.12 10)" },
  { key: "moss", value: "oklch(50% 0.08 150)" },
] as const;
