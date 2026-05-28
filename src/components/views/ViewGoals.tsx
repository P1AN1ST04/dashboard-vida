/**
 * src/components/views/ViewGoals.tsx — Senderos serpenteantes con hitos.
 *
 * Portado de view-goals.jsx. CRUD vive en un modal local stub hasta Bloque G.
 */

import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { celebrate } from "@/components/ConfettiHost";
import { GoalEditModal } from "@/components/modals/GoalEditModal";
import { Storage, GoalOps, GOAL_CATEGORIES, fmtDateShort, todayISO } from "@/lib";
import type { Goal, GoalStatus } from "@/types";

function categoryLabel(key: string, lang: "es" | "en"): string {
  const c = GOAL_CATEGORIES.find((c) => c.key === key);
  if (!c) return lang === "es" ? "Otros" : "Other";
  return lang === "es" ? c.name_es : c.name_en;
}

function toggleSubtask(goal: Goal, idx: number) {
  const subtasks = [...(goal.subtasks || [])];
  subtasks[idx] = { ...subtasks[idx], done: !subtasks[idx].done };
  Storage.update("goals", goal.id, { subtasks });
}

export function ViewGoals() {
  const { t, lang } = useApp();
  const goals = useCollection("goals");
  const habits = useCollection("habits");
  const [filter, setFilter] = useState<GoalStatus>("in_progress");
  const [editing, setEditing] = useState<Goal | "new" | null>(null);

  if (goals.length === 0) {
    return (
      <div className="content">
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏞️</div>
          <div className="serif" style={{ fontSize: 28, marginBottom: 8 }}>
            {lang === "es" ? "Aún sin metas" : "No goals yet"}
          </div>
          <div className="meta" style={{ fontSize: 15, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
            {lang === "es"
              ? "Las metas son senderos que decides caminar. Crea la primera y empieza a marcar hitos."
              : "Goals are trails you choose to walk. Create your first and start checking off milestones."}
          </div>
          <button type="button" className="btn warm" onClick={() => setEditing("new")} style={{ fontSize: 15 }}>
            <Icon name="plus" size={14} /> {t.new_goal}
          </button>
        </div>
        {editing && <GoalEditModal goal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </div>
    );
  }

  const filtered = goals.filter((g) => g.status === filter);

  return (
    <div className="content">
      <div className="card-flat" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", flexWrap: "wrap", gap: 8,
      }}>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {(["in_progress", "completed", "paused"] as GoalStatus[]).map((s) => {
            const count = goals.filter((g) => g.status === s).length;
            return (
              <button
                key={s}
                type="button"
                className={`btn ${filter === s ? "primary" : ""}`}
                onClick={() => setFilter(s)}
                style={{ padding: "6px 14px" }}
              >
                {t[s]}{" "}
                <span className="meta" style={{ color: "inherit", opacity: 0.7, marginLeft: 4 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className="btn warm" onClick={() => setEditing("new")}>
          <Icon name="plus" size={14} /> {t.new_goal}
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div className="serif italic" style={{ fontSize: 20, color: "var(--ink-3)" }}>
            {filter === "in_progress" && (lang === "es" ? "sin metas en curso" : "no goals in progress")}
            {filter === "completed" && (lang === "es" ? "sin metas completadas aún" : "no completed goals yet")}
            {filter === "paused" && (lang === "es" ? "sin metas pausadas" : "no paused goals")}
          </div>
        </div>
      )}

      {filtered.map((g) => {
        const dueD = new Date(g.due);
        const startDate = new Date(g.startDate || todayISO());
        const milestones = Array.from({ length: g.milestones }, (_, i) => i);
        const goalColor =
          g.status === "completed" ? "var(--sage)" :
          g.status === "paused"    ? "var(--ink-3)" :
                                     "var(--terracotta)";
        const progress = g.progress || 0;

        return (
          <div key={g.id} className="card" style={{ position: "relative" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              gap: 16, marginBottom: 14,
            }}>
              <div onClick={() => setEditing(g)} style={{ cursor: "pointer" }}>
                <div className="kicker">{categoryLabel(g.category, lang)}</div>
                <div className="serif" style={{ fontSize: 26, marginTop: 4 }}>
                  {lang === "es" ? g.title_es : g.title_en}
                </div>
                <div className="meta" style={{
                  marginTop: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  <span>
                    {t.by_date} {fmtDateShort(g.due, lang)} {dueD.getFullYear()}{" · "}
                    {g.mdone || 0}/{g.milestones} {t.milestones}
                  </span>
                  {g.status === "completed" && (
                    <button
                      type="button"
                      className="pill sage"
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={(e) => { e.stopPropagation(); celebrate(); }}
                    >
                      ✦ {lang === "es" ? "Celebrar" : "Replay"}
                    </button>
                  )}
                </div>
              </div>
              <div style={{
                textAlign: "right", display: "flex", flexDirection: "column",
                gap: 8, alignItems: "flex-end",
              }}>
                <div>
                  <div className="meta">{lang === "es" ? "Progreso" : "Progress"}</div>
                  <div style={{
                    fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1,
                    letterSpacing: "-0.01em", color: goalColor,
                  }}>
                    {Math.round(progress * 100)}
                    <span style={{ fontSize: 18, color: "var(--ink-3)" }}>%</span>
                  </div>
                </div>
                {g.status === "in_progress" && (g.mdone || 0) < g.milestones && (
                  <button
                    type="button"
                    className="btn warm"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    onClick={(e) => { e.stopPropagation(); GoalOps.incrementMilestone(g); }}
                  >
                    + {lang === "es" ? "Hito" : "Milestone"}
                  </button>
                )}
              </div>
            </div>

            {/* Sendero SVG */}
            <div style={{ position: "relative", height: 80, padding: "0 12px" }}>
              <svg viewBox="0 0 1000 80" preserveAspectRatio="none" width="100%" height="80">
                <path
                  d="M 0 60 C 200 10, 350 80, 500 40 S 800 10, 1000 50"
                  fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="3 6"
                />
                <defs>
                  <clipPath id={`clip-${g.id}`}>
                    <rect x="0" y="0" width={1000 * progress} height="80" />
                  </clipPath>
                </defs>
                <path
                  d="M 0 60 C 200 10, 350 80, 500 40 S 800 10, 1000 50"
                  fill="none" stroke={goalColor} strokeWidth="2.5"
                  clipPath={`url(#clip-${g.id})`}
                />
                {milestones.map((i) => {
                  const frac = (i + 0.5) / g.milestones;
                  const done = i < (g.mdone || 0);
                  const isLast = i === (g.mdone || 0);
                  const x = frac * 1000;
                  const y = 60 + 40 * Math.sin(frac * Math.PI * 2.2) - 5;
                  return (
                    <g key={i} style={{ cursor: "pointer" }} onClick={(e) => {
                      e.stopPropagation();
                      if (i === (g.mdone || 0)) GoalOps.incrementMilestone(g);
                      else if (i < (g.mdone || 0)) GoalOps.decrementMilestone(g);
                    }}>
                      <circle
                        cx={x} cy={y}
                        r={done ? 5 : isLast ? 6 : 4}
                        fill={done ? goalColor : "var(--paper)"}
                        stroke={isLast && g.status === "in_progress"
                          ? "var(--terracotta)"
                          : (done ? "transparent" : "var(--line)")}
                        strokeWidth={isLast ? 2 : 1.5}
                      />
                      {isLast && g.status === "in_progress" && (
                        <circle cx={x} cy={y} r="10" fill="oklch(58% 0.13 35 / 0.15)" />
                      )}
                    </g>
                  );
                })}
                <text x="4" y="76" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-3)" letterSpacing="0.1em">
                  {fmtDateShort(startDate.toISOString().slice(0, 10), lang).toUpperCase()}
                </text>
                <text x="996" y="76" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-3)" textAnchor="end" letterSpacing="0.1em">
                  {fmtDateShort(g.due, lang).toUpperCase()} {dueD.getFullYear()}
                </text>
              </svg>
            </div>

            {/* Subtareas */}
            {(g.subtasks || []).length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
                <div className="meta" style={{ marginBottom: 6 }}>
                  {lang === "es" ? "Subtareas" : "Subtasks"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {g.subtasks.map((st, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <button
                        type="button"
                        onClick={() => toggleSubtask(g, idx)}
                        style={{
                          width: 16, height: 16, borderRadius: 4,
                          border: `1.5px solid ${st.done ? goalColor : "var(--line)"}`,
                          background: st.done ? goalColor : "transparent",
                          display: "grid", placeItems: "center",
                          cursor: "pointer", padding: 0, flex: "0 0 16px",
                        }}
                      >
                        {st.done && <Icon name="check" size={9} color="var(--paper)" />}
                      </button>
                      <span style={{
                        textDecoration: st.done ? "line-through" : "none",
                        opacity: st.done ? 0.6 : 1,
                      }}>{st.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hábitos vinculados */}
            {(g.linkedHabits || []).length > 0 && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)",
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              }}>
                <span className="meta">{lang === "es" ? "Hábitos vinculados" : "Linked habits"}</span>
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {g.linkedHabits.map((hid) => {
                    const h = habits.find((x) => x.id === hid);
                    if (!h) return null;
                    return (
                      <span key={hid} className="pill">
                        {h.emoji} {lang === "es" ? h.name_es : h.name_en}{" "}
                        <span style={{ opacity: 0.6 }}>· {h.streak || 0}d</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {editing && <GoalEditModal goal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default ViewGoals;
