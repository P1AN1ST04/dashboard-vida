/**
 * src/components/views/ViewCalendar.tsx — Mes actual editorial.
 *
 * Portado de dashboard-vida-source/src/view-calendar.jsx (1:1 visual).
 * Grid CSS handmade — sin FullCalendar.js (overkill para mes-único).
 *
 * Eventos: por ahora sintéticos hardcoded mapeados por día-del-mes, igual
 * que en el legacy. En Bloque G/H se reemplazan por agregados de
 * goals.due, workouts.date, transactions.date y subscriptions.dayOfMonth.
 */

import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { Icon } from "@/components/ui/Icon";

type EventKind = "deadline" | "training" | "habit" | "money";

interface CalEvent {
  k: EventKind;
  text_es: string;
  text_en: string;
}

// Eventos sintéticos por día-del-mes (placeholder hasta Bloque G).
const SAMPLE_EVENTS: Record<number, CalEvent[]> = {
  1:  [{ k: "money",    text_es: "Renta",          text_en: "Rent due" }],
  3:  [{ k: "training", text_es: "Empuje",         text_en: "Push" }],
  5:  [{ k: "training", text_es: "Pierna",         text_en: "Legs" }],
  7:  [{ k: "deadline", text_es: "Revisión Q2",    text_en: "Q2 review" }],
  10: [{ k: "training", text_es: "Carrera larga",  text_en: "Long run" }],
  12: [{ k: "training", text_es: "Empuje",         text_en: "Push" }],
  14: [{ k: "deadline", text_es: "Declaración",    text_en: "Tax filing" }],
  15: [{ k: "money",    text_es: "Suscripciones",  text_en: "Subs" }],
  17: [{ k: "habit",    text_es: "Club de lectura",text_en: "Book club" }],
  20: [{ k: "training", text_es: "Z2 carrera",     text_en: "Z2 run" }],
  21: [{ k: "money",    text_es: "Pago",           text_en: "Payday" }],
  24: [{ k: "training", text_es: "Empuje",         text_en: "Push" },
       { k: "habit",    text_es: "Cita",           text_en: "Date night" }],
  25: [{ k: "training", text_es: "Tirón",          text_en: "Pull" },
       { k: "habit",    text_es: "Leer",           text_en: "Read" }],
  27: [{ k: "deadline", text_es: "Insc. medio",    text_en: "Half-mara reg." }],
  28: [{ k: "training", text_es: "Empuje",         text_en: "Push" }],
  30: [{ k: "habit",    text_es: "Planear junio",  text_en: "Plan June" }],
};

const MARK_COLOR: Record<EventKind, string> = {
  deadline: "var(--terracotta)",
  training: "oklch(60% 0.10 220)",
  habit:    "var(--sage)",
  money:    "var(--ochre)",
};

const EV_CLASS: Record<EventKind, string> = {
  deadline: "warm",
  habit:    "sage",
  money:    "ochre",
  training: "",
};

const DOW_ES = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];
const DOW_EN = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Cell {
  d: number;
  faded: boolean;
  isToday?: boolean;
  events?: CalEvent[];
}

export function ViewCalendar() {
  const { t, lang } = useApp();
  // Mes navegable: offset relativo a "hoy"
  const today = new Date();
  const [offset, setOffset] = useState(0);

  const cursor = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const showingCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const monthStart = new Date(year, month, 1);
  const firstDow = monthStart.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const dow = lang === "es" ? DOW_ES : DOW_EN;
  const monthName = (lang === "es" ? MONTHS_ES : MONTHS_EN)[month];

  const cells: Cell[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ d: daysInPrev - firstDow + i + 1, faded: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      d,
      faded: false,
      isToday: showingCurrentMonth && d === today.getDate(),
      events: SAMPLE_EVENTS[d] || [],
    });
  }
  while (cells.length < 42) {
    cells.push({ d: cells.length - daysInMonth - firstDow + 1, faded: true });
  }

  return (
    <div className="content">
      <div
        className="card-flat"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", flexWrap: "wrap", gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="prev month"
          >
            <Icon name="chev" size={14} style={{ transform: "rotate(180deg)" }} />
          </button>
          <div
            className="serif"
            style={{ fontSize: 26, letterSpacing: "-0.01em", textTransform: "capitalize" }}
          >
            {monthName}{" "}
            <span className="italic" style={{ color: "var(--ink-3)" }}>{year}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setOffset((o) => o + 1)}
            aria-label="next month"
          >
            <Icon name="chev" size={14} />
          </button>
        </div>

        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            {(["deadline", "training", "habit", "money"] as EventKind[]).map((k) => (
              <span key={k} className="pill">
                <span style={{
                  width: 6, height: 6, borderRadius: 99,
                  background: MARK_COLOR[k], display: "inline-block",
                }} />{" "}
                {t[`cal_legend_${k}` as const]}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="btn primary"
            style={{ padding: "6px 14px" }}
            onClick={() => setOffset(0)}
          >
            {t.today_btn}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="month" style={{ marginBottom: 8 }}>
          {dow.map((d) => <div key={d} className="dow">{d}</div>)}
        </div>
        <div className="month">
          {cells.map((c, i) => (
            <div
              key={i}
              className={`cell-day ${c.faded ? "faded " : ""}${c.isToday ? "today" : ""}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="d">{c.d}</span>
                {c.isToday && (
                  <span
                    className="meta"
                    style={{ color: "var(--terracotta)", fontSize: 9.5 }}
                  >
                    {lang === "es" ? "HOY" : "TODAY"}
                  </span>
                )}
              </div>
              {(c.events || []).slice(0, 2).map((e, j) => (
                <div key={j} className={`ev ${EV_CLASS[e.k]}`}>
                  {lang === "es" ? e.text_es : e.text_en}
                </div>
              ))}
              {(c.events || []).length > 2 && (
                <div className="meta" style={{ fontSize: 10 }}>
                  +{c.events!.length - 2}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ViewCalendar;
