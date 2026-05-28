/**
 * src/components/modals/ProfileModal.tsx — Perfil del usuario.
 *
 * Portado de profile-modal.jsx. Stats globales, achievements, edit nombre/avatar.
 * Botón "Ajustes" abre SettingsPanel (via useApp().openSettings).
 */

import { useState, type ReactNode } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { Storage, computeMetrics, fmtMoney, fmtDateShort } from "@/lib";

type AvatarKind = "main" | "happy" | "low";

export interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { lang, openSettings } = useApp();
  const user = useCollection("user");
  const habits = useCollection("habits");
  const workouts = useCollection("workouts");
  const goals = useCollection("goals");
  const achievements = useCollection("achievements");
  const settings = useCollection("settings");

  const [name, setName] = useState(user?.name ?? "");
  const [editingName, setEditingName] = useState(false);

  const avatar: AvatarKind = (user?.avatar ?? "main") as AvatarKind;
  const mainCurrency = settings?.currency ?? "PEN";
  const metrics = computeMetrics();

  const totalHabits = habits.reduce(
    (s, h) => s + (h.log || []).filter((l) => l.completed).length,
    0,
  );
  const bestStreak = Math.max(0, ...habits.map((h) => h.best || 0));
  const gymWorkouts = workouts.filter((w) => w.type === "gym").length;
  const runWorkouts = workouts.filter((w) => w.type === "run").length;
  const goalsCompleted = goals.filter((g) => g.status === "completed").length;
  const unlockedAch = achievements.filter((a) => a.unlocked);

  function saveName() {
    if (!user) return;
    Storage.set("user", { ...user, name: name.trim() || user.name });
    setEditingName(false);
  }

  function changeAvatar(a: AvatarKind) {
    if (!user) return;
    Storage.set("user", { ...user, avatar: a });
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 620, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>

        {/* Header */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 16,
            backgroundImage: `url("/assets/avatars/${avatar}.png")`,
            backgroundSize: "cover", backgroundPosition: "center",
            border: "1px solid var(--line)", flex: "0 0 80px",
          }} />
          <div style={{ flex: 1 }}>
            {editingName ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text" className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                  autoFocus
                  style={{ fontSize: 18 }}
                />
                <button type="button" className="btn warm" onClick={saveName} style={{ padding: "4px 10px" }}>
                  OK
                </button>
              </div>
            ) : (
              <div
                onClick={() => setEditingName(true)}
                className="serif"
                style={{ fontSize: 28, cursor: "pointer" }}
              >
                {user?.name ?? "—"}
                <span className="meta" style={{ marginLeft: 8, fontSize: 12, fontFamily: "var(--font-body)" }}>
                  {lang === "es" ? "editar" : "edit"}
                </span>
              </div>
            )}
            <div className="meta" style={{ marginTop: 2 }}>
              {user?.since && (
                <>
                  {lang === "es" ? "desde" : "since"} {fmtDateShort(user.since, lang)} ·{" "}
                </>
              )}
              {metrics.daysUsing} {lang === "es" ? "días" : "days"}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="kicker" style={{ marginBottom: 8 }}>
          {lang === "es" ? "Tus números" : "Your numbers"}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
          <StatTile label={lang === "es" ? "Días" : "Days"} value={metrics.daysUsing} suffix={lang === "es" ? "usando" : "using"} />
          <StatTile label={lang === "es" ? "Hábitos" : "Habits"} value={totalHabits} suffix={lang === "es" ? "completados" : "done"} />
          <StatTile label={lang === "es" ? "Mejor racha" : "Best streak"} value={bestStreak} suffix={lang === "es" ? "días" : "days"} />
          <StatTile label={lang === "es" ? "Ahorrado" : "Saved"} value={fmtMoney(metrics.saved, mainCurrency)} />
          <StatTile label={lang === "es" ? "Gym" : "Gym"} value={gymWorkouts} suffix={lang === "es" ? "sesiones" : "sessions"} />
          <StatTile label={lang === "es" ? "Running" : "Running"} value={runWorkouts} suffix={lang === "es" ? "carreras" : "runs"} />
          <StatTile label={lang === "es" ? "Metas" : "Goals"} value={goalsCompleted} suffix={lang === "es" ? "logradas" : "done"} />
          <StatTile label={lang === "es" ? "Volumen" : "Volume"} value={metrics.volumeLifted.toLocaleString()} suffix="kg" />
        </div>

        {/* Avatar */}
        <div className="kicker" style={{ marginBottom: 8 }}>{lang === "es" ? "Avatar" : "Avatar"}</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {(["main", "happy", "low"] as AvatarKind[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => changeAvatar(a)}
              style={{
                padding: 4, borderRadius: 10,
                border: avatar === a ? "2px solid var(--terracotta)" : "1px solid var(--line)",
                background: avatar === a ? "var(--terracotta-soft)" : "var(--paper)",
                cursor: "pointer",
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 8,
                backgroundImage: `url("/assets/avatars/${a}.png")`,
                backgroundSize: "cover", backgroundPosition: "center",
              }} />
              <div className="caption" style={{ marginTop: 4 }}>
                {a === "main"  && (lang === "es" ? "Neutro" : "Neutral")}
                {a === "happy" && (lang === "es" ? "Feliz"  : "Happy")}
                {a === "low"   && (lang === "es" ? "Bajo"   : "Low")}
              </div>
            </button>
          ))}
        </div>

        {/* Achievements */}
        <div className="kicker" style={{ marginBottom: 8 }}>
          {lang === "es" ? "Logros desbloqueados" : "Unlocked achievements"}{" "}
          <span className="meta">{unlockedAch.length}/{achievements.length}</span>
        </div>
        <div className="grid" style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10, marginBottom: 24,
        }}>
          {achievements.map((a) => (
            <div key={a.id} style={{
              padding: 12, borderRadius: 10,
              border: a.unlocked ? "1px solid var(--sage)" : "1px solid var(--line-soft)",
              background: a.unlocked ? "var(--sage-soft)" : "var(--paper-sunk)",
              opacity: a.unlocked ? 1 : 0.5,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{a.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>
                {lang === "es" ? a.title_es : a.title_en}
              </div>
              {a.unlocked && a.unlockedAt && (
                <div className="meta" style={{ fontSize: 10, marginTop: 4 }}>
                  {fmtDateShort(a.unlockedAt, lang)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div style={{
          display: "flex", gap: 8, justifyContent: "flex-end",
          borderTop: "1px solid var(--line-soft)", paddingTop: 16,
        }}>
          <button
            type="button"
            className="btn"
            onClick={() => { onClose(); openSettings(); }}
          >
            <Icon name="settings" size={13} /> {lang === "es" ? "Ajustes" : "Settings"}
          </button>
          <button type="button" className="btn warm" onClick={onClose}>
            {lang === "es" ? "Cerrar" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, suffix }: {
  label: ReactNode; value: ReactNode; suffix?: ReactNode;
}) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: "var(--paper-2)", border: "1px solid var(--line-soft)",
    }}>
      <div className="meta" style={{ fontSize: 10 }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 22,
        lineHeight: 1.1, marginTop: 4,
      }}>{value}</div>
      {suffix && <div className="meta" style={{ fontSize: 10, marginTop: 2 }}>{suffix}</div>}
    </div>
  );
}

export default ProfileModal;
