/**
 * src/components/modals/GoalEditModal.tsx — Crear/editar meta.
 *
 * Extraído del GoalEditSheet inline de ViewGoals.tsx.
 */

import { useState, type FormEvent } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { Storage, GOAL_CATEGORIES, todayISO } from "@/lib";
import type { Goal, GoalStatus, Subtask } from "@/types";

function nextYearISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export interface GoalEditModalProps {
  goal?: Goal | null;
  onClose: () => void;
}

export function GoalEditModal({ goal, onClose }: GoalEditModalProps) {
  const { lang } = useApp();
  const habits = useCollection("habits");
  const isEdit = !!goal;

  const [titleEs, setTitleEs] = useState(goal?.title_es ?? "");
  const [titleEn, setTitleEn] = useState(goal?.title_en ?? "");
  const [category, setCategory] = useState(goal?.category ?? "finance");
  const [due, setDue] = useState(goal?.due ?? nextYearISO());
  const [milestones, setMilestones] = useState(goal?.milestones ?? 6);
  const [description, setDescription] = useState(goal?.description ?? "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(goal?.subtasks ?? []);
  const [linkedHabits, setLinkedHabits] = useState<string[]>(goal?.linkedHabits ?? []);
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "in_progress");
  const [newSub, setNewSub] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addSubtask() {
    if (!newSub.trim()) return;
    setSubtasks([...subtasks, { title: newSub.trim(), done: false }]);
    setNewSub("");
  }
  function removeSubtask(i: number) {
    setSubtasks(subtasks.filter((_, idx) => idx !== i));
  }
  function toggleHabit(hid: string) {
    setLinkedHabits(linkedHabits.includes(hid)
      ? linkedHabits.filter((x) => x !== hid)
      : [...linkedHabits, hid]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titleEs.trim()) { setError(lang === "es" ? "Pon un título" : "Add a title"); return; }
    if (!due) { setError(lang === "es" ? "Fecha objetivo requerida" : "Target date required"); return; }
    const m = Math.max(1, Math.min(50, Number(milestones) || 1));
    const mdone = goal?.mdone ?? 0;
    const payload = {
      title_es: titleEs.trim(),
      title_en: titleEn.trim() || titleEs.trim(),
      category, due,
      milestones: m,
      mdone: Math.min(mdone, m),
      progress: Math.min(mdone, m) / m,
      status, description,
      subtasks, linkedHabits,
      startDate: goal?.startDate ?? todayISO(),
    };
    if (isEdit && goal) Storage.update("goals", goal.id, payload);
    else Storage.add("goals", payload);
    onClose();
  }

  function handleDelete() {
    if (!isEdit || !goal) return;
    const msg = lang === "es" ? `Borrar "${goal.title_es}"?` : `Delete "${goal.title_en}"?`;
    if (window.confirm(msg)) {
      Storage.remove("goals", goal.id);
      onClose();
    }
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 540, padding: 24, maxHeight: "85vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="kicker">
          {isEdit ? (lang === "es" ? "Editar meta" : "Edit goal") : (lang === "es" ? "Nueva meta" : "New goal")}
        </div>
        <div className="h2" style={{ marginBottom: 20, marginTop: 4 }}>
          {titleEs || (lang === "es" ? "Meta" : "Goal")}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Título (es)" : "Title (es)"}</label>
            <input type="text" className="input" value={titleEs} onChange={(e) => setTitleEs(e.target.value)} required autoFocus />
          </div>
          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Título (en)" : "Title (en)"}</label>
            <input type="text" className="input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>

          <div className="form-row" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">{lang === "es" ? "Categoría" : "Category"}</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {GOAL_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{lang === "es" ? c.name_es : c.name_en}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">{lang === "es" ? "Estado" : "Status"}</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
                <option value="in_progress">{lang === "es" ? "En curso" : "In progress"}</option>
                <option value="paused">{lang === "es" ? "Pausada" : "Paused"}</option>
                <option value="completed">{lang === "es" ? "Completada" : "Completed"}</option>
              </select>
            </div>
          </div>

          <div className="form-row" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">{lang === "es" ? "Fecha objetivo" : "Target date"}</label>
              <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">{lang === "es" ? "Nº de hitos" : "Milestones"}</label>
              <input type="number" className="input mono" min={1} max={50} value={milestones} onChange={(e) => setMilestones(Number(e.target.value))} />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Descripción" : "Description"}</label>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Subtareas" : "Subtasks"}</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="text" className="input"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder={lang === "es" ? "Agregar subtarea..." : "Add subtask..."}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn" onClick={addSubtask}>+</button>
            </div>
            {subtasks.map((st, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <span style={{ flex: 1, fontSize: 13 }}>{st.title}</span>
                <button type="button" onClick={() => removeSubtask(i)} className="btn" style={{ fontSize: 11, padding: "2px 8px" }}>−</button>
              </div>
            ))}
          </div>

          {habits.length > 0 && (
            <div className="form-row">
              <label className="form-label">{lang === "es" ? "Hábitos vinculados" : "Linked habits"}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {habits.map((h) => (
                  <button
                    type="button" key={h.id}
                    onClick={() => toggleHabit(h.id)}
                    className={`pill${linkedHabits.includes(h.id) ? " warm" : ""}`}
                    style={{
                      cursor: "pointer",
                      border: linkedHabits.includes(h.id) ? "1px solid var(--terracotta)" : "1px solid var(--line)",
                    }}
                  >
                    {h.emoji} {lang === "es" ? h.name_es : h.name_en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={handleDelete}>
                {lang === "es" ? "Borrar" : "Delete"}
              </button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={onClose}>{lang === "es" ? "Cancelar" : "Cancel"}</button>
              <button type="submit" className="btn warm">
                {isEdit ? (lang === "es" ? "Guardar" : "Save") : (lang === "es" ? "Crear" : "Create")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GoalEditModal;
