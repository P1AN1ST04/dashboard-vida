/**
 * src/components/modals/Onboarding.tsx — 3 slides editoriales.
 *
 * Marca onboardingSeen: true en settings al cerrar la última slide.
 */

import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { Icon } from "@/components/ui/Icon";
import { Storage } from "@/lib";

interface Slide {
  id: string;
  img: string;
  eyebrow_es: string; eyebrow_en: string;
  title_es: string;   title_en: string;
  body_es: string;    body_en: string;
}

const SLIDES: Slide[] = [
  {
    id: "welcome",
    img: "/assets/onboarding/welcome.png",
    eyebrow_es: "BIENVENIDO", eyebrow_en: "WELCOME",
    title_es:   "Un almanaque para tu vida.",
    title_en:   "An almanac for your life.",
    body_es: "Vida es un lugar tranquilo para registrar lo pequeño que se acumula — hábitos, dinero, entrenos y los hitos que vas dejando en el camino.",
    body_en: "Vida is a quiet place to track the small things that compound — habits, money, training, and the milestones you collect along the way.",
  },
  {
    id: "habits",
    img: "/assets/onboarding/habits.png",
    eyebrow_es: "CONSTRUYE HÁBITOS", eyebrow_en: "BUILD HABITS",
    title_es:   "Cuídalos, mírales crecer.",
    title_en:   "Tend to them, watch them grow.",
    body_es: "Cada hábito es un tallo. Regarlo diario levanta sus hojas. El año, mirado de un vistazo, te va a sorprender.",
    body_en: "Each habit is a stem. Watering it daily lifts its leaves. The year, looked at all at once, will surprise you.",
  },
  {
    id: "progress",
    img: "/assets/onboarding/progress.png",
    eyebrow_es: "MIDE TU PROGRESO", eyebrow_en: "MEASURE PROGRESS",
    title_es:   "Victorias silenciosas, mapeadas.",
    title_en:   "Quiet wins, mapped.",
    body_es: "Los meses se vuelven una constelación de pequeños logros. Vida te muestra la forma — tú sigues caminando.",
    body_en: "Months become a constellation of small achievements. Vida shows you the shape — you keep walking.",
  },
];

export interface OnboardingProps {
  onClose: () => void;
}

export function Onboarding({ onClose }: OnboardingProps) {
  const { lang } = useApp();
  const [idx, setIdx] = useState(0);
  const s = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  function handleClose() {
    // Marcar onboarding como visto.
    const settings = Storage.get("settings");
    if (settings) {
      Storage.set("settings", { ...settings, onboardingSeen: true });
    }
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card">
        <button type="button" className="ob-close" onClick={handleClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="ob-art" style={{ backgroundImage: `url("${s.img}")` }} />
        <div className="ob-body">
          <div className="ob-eyebrow">{lang === "es" ? s.eyebrow_es : s.eyebrow_en}</div>
          <div className="ob-title">{lang === "es" ? s.title_es : s.title_en}</div>
          <div className="ob-text">{lang === "es" ? s.body_es : s.body_en}</div>
        </div>
        <div className="ob-footer">
          <div className="ob-dots">
            {SLIDES.map((_, i) => (
              <span key={i} className={`dot ${i === idx ? "on" : ""}`} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {idx > 0 && (
              <button type="button" className="btn" onClick={() => setIdx(idx - 1)}>
                {lang === "es" ? "Atrás" : "Back"}
              </button>
            )}
            {!isLast ? (
              <button type="button" className="btn primary" onClick={() => setIdx(idx + 1)}>
                {lang === "es" ? "Siguiente" : "Next"}
              </button>
            ) : (
              <button type="button" className="btn warm" onClick={handleClose}>
                {lang === "es" ? "Empezar" : "Begin"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
