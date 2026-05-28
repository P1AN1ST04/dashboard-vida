/**
 * src/components/modals/HabitEditModal.tsx — Crear/editar hábito.
 *
 * Extraído del HabitEditSheet inline de ViewHabits.tsx (Bloque F).
 * Misma API: si `habit` viene, edita; si no, crea.
 */

import { useState, type FormEvent } from "react";
import { useApp } from "@/hooks/useApp";
import { Icon } from "@/components/ui/Icon";
import { Storage, HABIT_COLORS } from "@/lib";
import type { Habit } from "@/types";

const EMOJIS = ["🌱","📖","🏃","🧘","💧","🌙","✒️","🗣️","🏋️","🍎","☕","🧠","💪","🌞","🎯","📚","🎵","🌿"];

export interface HabitEditModalProps {
  habit?: Habit | null;
  onClose: () => void;
}

export function HabitEditModal({ habit, onClose }: HabitEditModalProps) {
  const { lang } = useApp();
  const isEdit = !!habit;

  const [nameEs, setNameEs]   = useState(habit?.name_es ?? "");
  const [nameEn, setNameEn]   = useState(habit?.name_en ?? "");
  const [emoji, setEmoji]     = useState(habit?.emoji ?? "🌱");
  const [color, setColor]     = useState(habit?.color ?? "var(--terracotta)");
  const [reminder, setReminder] = useState(habit?.reminder ?? "");
  const [error, setError]     = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nameEs.trim()) {
      setError(lang === "es" ? "Pon un nombre en español" : "Add a Spanish name");
      return;
    }
    const payload = {
      name_es: nameEs.trim(),
      name_en: nameEn.trim() || nameEs.trim(),
      emoji,
      color,
      frequency: "daily" as const,
      reminder: reminder || null,
    };
    if (isEdit && habit) {
      Storage.update("habits", habit.id, payload);
    } else {
      Storage.add("habits", { ...payload, streak: 0, best: 0, log: [], doneToday: false });
    }
    onClose();
  }

  function handleDelete() {
    if (!isEdit || !habit) return;
    const msg = lang === "es"
      ? `Borrar "${habit.name_es}"? Esto borra también su historial.`
      : `Delete "${habit.name_en}"? This also deletes its history.`;
    if (window.confirm(msg)) {
      Storage.remove("habits", habit.id);
      onClose();
    }
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 460, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="kicker">
          {isEdit
            ? (lang === "es" ? "Editar hábito" : "Edit habit")
            : (lang === "es" ? "Nuevo hábito" : "New habit")}
        </div>
        <div className="h2" style={{ marginBottom: 20, marginTop: 4 }}>
          {emoji} {nameEs || (lang === "es" ? "Hábito" : "Habit")}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Nombre (es)" : "Name (es)"}</label>
            <input
              type="text" className="input"
              value={nameEs}
              onChange={(e) => setNameEs(e.target.value)}
              placeholder={lang === "es" ? "Leer 20 min" : "Read 20 min"}
              required autoFocus
            />
          </div>
          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Nombre (en)" : "Name (en)"}</label>
            <input
              type="text" className="input"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Read 20 min (optional)"
            />
          </div>
          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Ícono" : "Icon"}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EMOJIS.map((e) => (
                <button
                  type="button" key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    fontSize: 22, padding: 6, width: 38, height: 38,
                    border: emoji === e ? "1.5px solid var(--terracotta)" : "1px solid var(--line)",
                    background: emoji === e ? "var(--terracotta-soft)" : "var(--paper)",
                    borderRadius: 8, cursor: "pointer",
                  }}
                >{e}</button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Color" : "Color"}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {HABIT_COLORS.map((c) => (
                <button
                  type="button" key={c.key}
                  onClick={() => setColor(c.value)}
                  aria-label={c.key}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: c.value,
                    border: color === c.value ? "2px solid var(--ink)" : "1px solid var(--line)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">
              {lang === "es" ? "Recordatorio (opcional)" : "Reminder (optional)"}
            </label>
            <input
              type="time" className="input"
              value={reminder ?? ""}
              onChange={(e) => setReminder(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={handleDelete}>
                {lang === "es" ? "Borrar" : "Delete"}
              </button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={onClose}>
                {lang === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button type="submit" className="btn warm">
                {isEdit
                  ? (lang === "es" ? "Guardar" : "Save")
                  : (lang === "es" ? "Crear" : "Create")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HabitEditModal;
