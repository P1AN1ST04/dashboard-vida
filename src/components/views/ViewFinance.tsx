/**
 * src/components/views/ViewFinance.tsx — Marea de in/out + anillos por categoría.
 *
 * Portado de view-finance.jsx. Sin Chart.js — todas las gráficas son SVG handmade.
 * El modal "Nueva transacción" / "Editar transacción" es stub local hasta Bloque G.
 *
 * Sub-listas InsightsCard y SubscriptionList del legacy NO se incluyen aquí —
 * vendrán como sub-componentes propios en bloques posteriores.
 */

import { useMemo, useState } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { KPI } from "@/components/ui/KPI";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import {
  computeMetrics,
  computeCashflow,
  computeCategories,
  fmtMoney,
  fmtDateShort,
} from "@/lib";
import type { Transaction, Currency } from "@/types";

const SPARKS = {
  income:  "M0 22 L20 18 L40 16 L60 14 L80 10 L100 8  L120 6",
  spent:   "M0 14 L20 16 L40 12 L60 20 L80 16 L100 24 L120 18",
  balance: "M0 28 L20 22 L40 20 L60 18 L80 14 L100 12 L120 6",
  save:    "M0 30 L20 28 L40 24 L60 22 L80 18 L100 12 L120 8",
};

export function ViewFinance() {
  const { t, lang } = useApp();
  const transactions = useCollection("transactions");
  const settings = useCollection("settings");

  const [modalTx, setModalTx] = useState<Transaction | "new" | null>(null);

  const mainCurrency: Currency = settings?.currency ?? "PEN";
  const metrics = useMemo(() => computeMetrics(), [transactions, settings]);
  const cashflow = useMemo(() => computeCashflow(), [transactions]);
  const categories = useMemo(() => computeCategories(), [transactions]);

  const balance = metrics.monthIncome - metrics.monthSpent;
  const saveRate = metrics.monthIncome > 0 ? (balance / metrics.monthIncome) * 100 : 0;

  // Cashflow: curva suavizada in/out
  const cw = 760, ch = 220;
  const pad = { l: 36, r: 24, t: 16, b: 30 };
  const maxValue = Math.max(1, ...cashflow.map((c) => Math.max(c.in, c.out))) * 1.1;
  const xStep = cashflow.length > 1 ? (cw - pad.l - pad.r) / (cashflow.length - 1) : 0;
  const yScale = (v: number) => ch - pad.b - (v / maxValue) * (ch - pad.b - pad.t);
  const xs = cashflow.map((_, i) => pad.l + i * xStep);

  const smooth = (pts: Array<[number, number]>): string => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const mx = (x1 + x2) / 2;
      d += ` C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    }
    return d;
  };

  const inPath = smooth(cashflow.map((c, i) => [xs[i], yScale(c.in)] as [number, number]));
  const outPath = smooth(cashflow.map((c, i) => [xs[i], yScale(c.out)] as [number, number]));
  const lastX = xs[xs.length - 1] ?? pad.l;
  const inFill = inPath + ` L ${lastX} ${ch - pad.b} L ${xs[0] ?? pad.l} ${ch - pad.b} Z`;
  const outFill = outPath + ` L ${lastX} ${ch - pad.b} L ${xs[0] ?? pad.l} ${ch - pad.b} Z`;

  // Donut concéntrico por categoría
  const total = categories.reduce((s, c) => s + c.amt, 0);
  const sortedCats = [...categories].sort((a, b) => b.amt - a.amt);
  const arcSize = 220;
  const cx = arcSize / 2;
  const cy = arcSize / 2;
  const ringGap = 8;
  const ringWidth = 14;

  const arcPath = (r: number, frac: number): string => {
    const ang = -Math.PI / 2 + frac * Math.PI * 2;
    const lg = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(-Math.PI / 2);
    const y1 = cy + r * Math.sin(-Math.PI / 2);
    const x2 = cx + r * Math.cos(ang);
    const y2 = cy + r * Math.sin(ang);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  };

  const recentTxs = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return (
    <div className="content">
      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <KPI label={t.income_month} value={fmtMoney(metrics.monthIncome, mainCurrency)} delta={3} sparkPath={SPARKS.income} accent="var(--sage)" />
        <KPI label={t.spent_month}  value={fmtMoney(metrics.monthSpent,  mainCurrency)} delta={-12} sparkPath={SPARKS.spent} accent="var(--terracotta)" />
        <KPI label={t.balance}      value={fmtMoney(balance,             mainCurrency)} delta={28} sparkPath={SPARKS.balance} accent="var(--ink)" />
        <KPI label={t.save_rate}    value={Math.round(saveRate)} suffix="%" delta={9} sparkPath={SPARKS.save} accent="var(--ochre)" />
      </div>

      {/* Cashflow */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 className="card-h" style={{ marginBottom: 4 }}>{t.cashflow}</h2>
            <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)" }}>
              {lang === "es" ? "el flujo y el reflujo de tu dinero" : "the flow and ebb of your money"}
            </div>
          </div>
          <div className="row">
            <span className="pill sage">
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--sage)", display: "inline-block" }} />{" "}
              {t.income}
            </span>
            <span className="pill warm">
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--terracotta)", display: "inline-block" }} />{" "}
              {t.expense}
            </span>
          </div>
        </div>

        {cashflow.length === 0 || cashflow.every((c) => c.in === 0 && c.out === 0) ? (
          <div className="empty-small" style={{ padding: 32 }}>
            {lang === "es" ? "Sin transacciones aún." : "No transactions yet."}
          </div>
        ) : (
          <svg width="100%" viewBox={`0 0 ${cw} ${ch}`} style={{ display: "block" }}>
            <defs>
              <linearGradient id="sageFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--sage)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--sage)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="terraFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--terracotta)" stopOpacity="0.20" />
                <stop offset="1" stopColor="var(--terracotta)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
              <g key={i}>
                <line
                  x1={pad.l} x2={cw - pad.r}
                  y1={yScale(maxValue * (1 - f))} y2={yScale(maxValue * (1 - f))}
                  stroke="var(--line-soft)" strokeDasharray="2 4"
                />
                <text
                  x={pad.l - 6} y={yScale(maxValue * (1 - f)) + 3}
                  fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  {Math.round((maxValue * (1 - f)) / 1000)}k
                </text>
              </g>
            ))}
            <path d={inFill}  fill="url(#sageFill)" />
            <path d={outFill} fill="url(#terraFill)" />
            <path d={inPath}  fill="none" stroke="var(--sage)" strokeWidth="1.8" />
            <path d={outPath} fill="none" stroke="var(--terracotta)" strokeWidth="1.8" />
            {cashflow.map((c, i) => (
              <g key={i}>
                <circle cx={xs[i]} cy={yScale(c.in)}  r="3" fill="var(--paper-2)" stroke="var(--sage)" strokeWidth="1.5" />
                <circle cx={xs[i]} cy={yScale(c.out)} r="3" fill="var(--paper-2)" stroke="var(--terracotta)" strokeWidth="1.5" />
                <text x={xs[i]} y={ch - 8} fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)" textAnchor="middle">
                  {lang === "es" ? c.m_es : c.m_en}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Categorías + Transacciones recientes */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
        <div className="card">
          <h2 className="card-h" style={{ marginBottom: 4 }}>{t.by_category}</h2>
          <div className="meta italic" style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-3)", marginBottom: 14 }}>
            {lang === "es"
              ? `${fmtMoney(total, mainCurrency)} este mes`
              : `${fmtMoney(total, mainCurrency)} this month`}
          </div>
          {sortedCats.length === 0 ? (
            <div className="empty-small">
              {lang === "es" ? "Sin gastos este mes." : "No expenses this month."}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <svg width={arcSize} height={arcSize} viewBox={`0 0 ${arcSize} ${arcSize}`}>
                {sortedCats.map((c, i) => {
                  const r = arcSize / 2 - 8 - i * (ringGap + ringWidth);
                  if (r < 10) return null;
                  const frac = c.amt / (sortedCats[0]?.amt || 1);
                  return (
                    <g key={c.key}>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={ringWidth} />
                      <path d={arcPath(r, frac)} fill="none" stroke={c.color} strokeWidth={ringWidth} strokeLinecap="round" />
                    </g>
                  );
                })}
                <text x={cx} y={cy - 2} fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-3)" textAnchor="middle" letterSpacing="0.1em">TOTAL</text>
                <text x={cx} y={cy + 18} fontSize="20" fontFamily="var(--font-display)" fill="var(--ink)" textAnchor="middle">
                  {fmtMoney(total, mainCurrency).replace(/\.\d+$/, "")}
                </text>
              </svg>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}>
                {sortedCats.map((c) => (
                  <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: c.color, flex: "0 0 8px" }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.key}
                    </span>
                    <span className="num caption">
                      {fmtMoney(c.amt, mainCurrency).replace(/\.\d+$/, "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className="card-h">{t.recent_tx}</h2>
            <button
              type="button"
              className="btn warm"
              style={{ padding: "6px 12px", fontSize: 12.5 }}
              onClick={() => setModalTx("new")}
            >
              <Icon name="plus" size={13} /> {lang === "es" ? "Nueva" : "New"}
            </button>
          </div>
          <div className="spacer-sm" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentTxs.length === 0 ? (
              <div className="empty-small">
                {lang === "es" ? "No hay transacciones aún." : "No transactions yet."}
              </div>
            ) : (
              recentTxs.map((tx, i) => {
                const isIncome = tx.amt > 0;
                const catLabel = tx.cat === "income"
                  ? (lang === "es" ? "Ingreso" : "Income")
                  : tx.cat;
                return (
                  <div
                    key={tx.id}
                    className="tx-row"
                    style={{
                      display: "grid", gridTemplateColumns: "60px 1fr auto",
                      gap: 12, alignItems: "center",
                      padding: "10px 0",
                      borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                      cursor: "pointer",
                    }}
                    onClick={() => setModalTx(tx)}
                  >
                    <div className="meta">{fmtDateShort(tx.date, lang)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13.5, fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {lang === "es" ? tx.merchant_es : tx.merchant_en}
                      </div>
                      <div className="caption">{catLabel} · {tx.method}</div>
                    </div>
                    <div
                      className="num"
                      style={{
                        fontWeight: 500,
                        color: isIncome ? "oklch(38% 0.09 145)" : "var(--ink)",
                      }}
                    >
                      {isIncome ? "+" : ""}
                      {fmtMoney(tx.amt, tx.currency || mainCurrency)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {modalTx && (
        <AddTransactionModal
          transaction={modalTx === "new" ? null : modalTx}
          onClose={() => setModalTx(null)}
        />
      )}
    </div>
  );
}

export default ViewFinance;
