/**
 * src/components/modals/WeeklyReportModal.tsx — Resumen semanal.
 *
 * Se muestra automáticamente domingo/lunes (controlado por WeeklyReport.shouldShow()
 * desde App.tsx). Marca como mostrado al cerrar.
 */

import { useMemo } from "react";
import { useApp } from "@/hooks/useApp";
import { Icon } from "@/components/ui/Icon";
import { WeeklyReport, fmtMoney, fmtDateShort } from "@/lib";

export interface WeeklyReportModalProps {
  onClose: () => void;
}

export function WeeklyReportModal({ onClose }: WeeklyReportModalProps) {
  const { t, lang } = useApp();
  const report = useMemo(() => WeeklyReport.generate(), []);

  function handleClose() {
    WeeklyReport.markShown();
    onClose();
  }

  const fmt = (n: number) => fmtMoney(n, report.mainCurrency);
  const deltaEmoji =
    report.spentDelta < -5 ? "📉" : report.spentDelta > 5 ? "📈" : "→";
  const deltaColor =
    report.spentDelta < -5 ? "var(--sage)" :
    report.spentDelta > 5  ? "var(--terracotta)" :
                             "var(--ink-3)";
  const deltaText = lang === "es" ? "vs semana pasada" : "vs last week";

  const completionRate = Math.round(report.habitsCompletionRate);
  const bestDayLabel = report.bestDay
    ? new Date(report.bestDay).toLocaleDateString(lang === "es" ? "es-PE" : "en-US", {
        weekday: "long", day: "numeric",
      })
    : "—";

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card" style={{ maxWidth: 540, padding: 0, overflow: "hidden" }}>
        <button type="button" className="ob-close" onClick={handleClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>

        <div style={{ padding: "32px 32px 16px", background: "var(--paper-sunk)" }}>
          <div className="kicker">
            {lang === "es" ? "RESUMEN SEMANAL" : "WEEKLY SUMMARY"}
          </div>
          <div className="h1" style={{ marginTop: 6, fontFamily: "var(--font-display)" }}>
            {lang === "es" ? "Tu semana, en una mirada" : "Your week, at a glance"}
          </div>
          <div className="caption" style={{ marginTop: 4 }}>
            {fmtDateShort(report.weekStart, lang)} → {fmtDateShort(report.weekEnd, lang)}
          </div>
        </div>

        <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Gastos */}
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            paddingBottom: 14, borderBottom: "1px solid var(--line-soft)",
          }}>
            <div>
              <div className="kicker">{lang === "es" ? "GASTASTE" : "YOU SPENT"}</div>
              <div className="display mono" style={{ fontSize: 36, marginTop: 4 }}>
                {fmt(report.thisSpent)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: deltaColor, fontSize: 18, fontWeight: 500 }}>
                {deltaEmoji} {Math.abs(Math.round(report.spentDelta))}%
              </div>
              <div className="caption" style={{ marginTop: 2 }}>{deltaText}</div>
            </div>
          </div>

          {/* Categoría top */}
          {report.topCategory && (
            <div>
              <div className="kicker">
                {lang === "es" ? "MÁS GASTASTE EN" : "TOP CATEGORY"}
              </div>
              <div style={{
                display: "flex", alignItems: "baseline", justifyContent: "space-between",
                marginTop: 4,
              }}>
                <div className="serif" style={{ fontSize: 22 }}>
                  {report.topCategory.key}
                </div>
                <div className="num" style={{ fontSize: 18 }}>
                  {fmt(report.topCategory.amount)}
                </div>
              </div>
            </div>
          )}

          {/* Hábitos */}
          <div>
            <div className="kicker">
              {lang === "es" ? "HÁBITOS COMPLETADOS" : "HABITS COMPLETED"}
            </div>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginTop: 4,
            }}>
              <div className="serif" style={{ fontSize: 22 }}>
                {report.habitsCompleted} / {report.habitsPossible}
              </div>
              <div className="num" style={{
                fontSize: 18,
                color:
                  completionRate >= 70 ? "var(--sage)" :
                  completionRate >= 50 ? "var(--ochre)" :
                                         "var(--terracotta)",
              }}>
                {completionRate}%
              </div>
            </div>
            <div style={{
              marginTop: 8, height: 4, background: "var(--paper-sunk)",
              borderRadius: 4, overflow: "hidden",
            }}>
              <div style={{
                width: `${Math.min(100, completionRate)}%`,
                height: "100%",
                background:
                  completionRate >= 70 ? "var(--sage)" :
                  completionRate >= 50 ? "var(--ochre)" :
                                         "var(--terracotta)",
              }} />
            </div>
          </div>

          {/* Racha top */}
          {report.topStreakHabit && report.topStreak > 0 && (
            <div style={{
              padding: 16, background: "var(--terracotta-soft)",
              borderRadius: "var(--radius)",
            }}>
              <div className="kicker" style={{ color: "var(--rust)" }}>
                {lang === "es" ? "RACHA MÁS LARGA" : "LONGEST STREAK"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                <div style={{ fontSize: 32 }}>{report.topStreakHabit.emoji}</div>
                <div>
                  <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, color: "var(--rust)" }}>
                    {report.topStreak} {t.streak_days}
                  </div>
                  <div className="caption" style={{ color: "var(--rust)", opacity: 0.7 }}>
                    {lang === "es" ? report.topStreakHabit.name_es : report.topStreakHabit.name_en}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mejor día */}
          {report.bestDay && (
            <div className="caption italic" style={{
              textAlign: "center", fontFamily: "var(--font-display)",
              fontSize: 16, color: "var(--ink-3)",
            }}>
              {lang === "es"
                ? `Tu mejor día fue el ${bestDayLabel}: ${report.bestDayCount} hábitos`
                : `Your best day was ${bestDayLabel}: ${report.bestDayCount} habits`}
            </div>
          )}

          <button type="button" className="btn warm" onClick={handleClose} style={{ marginTop: 8 }}>
            {lang === "es" ? "Continuar la semana" : "Continue the week"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WeeklyReportModal;
