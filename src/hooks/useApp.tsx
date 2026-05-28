/**
 * src/hooks/useApp.tsx — Context global: lang/theme/view + estado de modales.
 *
 * El AppProvider gestiona TODO el estado de UI compartido entre componentes:
 *   - lang, theme, view + sus setters
 *   - estado de modales globales (onboarding/settings/profile/weekly)
 *     + sus open/close
 *
 * Los modales canónicos viven en App.tsx → <ModalsHost /> que monta los
 * componentes en función de estos flags.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Lang, Theme, View } from "@/types";
import { Storage, setSettings, getSettings } from "@/lib/storage";
import { getTranslations, type Translations } from "@/locales";
import { WeeklyReport } from "@/lib";

export interface AppContextValue {
  // Estado i18n / theme / routing
  lang: Lang;
  theme: Theme;
  view: View;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setView: (v: View) => void;
  t: Translations;

  // Modales globales (flags + open/close)
  onboardingOpen: boolean;
  settingsOpen: boolean;
  profileOpen: boolean;
  weeklyOpen: boolean;

  openOnboarding: () => void;
  closeOnboarding: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  openWeekly: () => void;
  closeWeekly: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const initialSettings = getSettings();
  const initialView = (location.hash.replace("#", "") || "today") as View;

  const [lang, setLangState]   = useState<Lang>(initialSettings?.lang ?? "es");
  const [theme, setThemeState] = useState<Theme>(initialSettings?.theme ?? "light");
  const [view, setViewState]   = useState<View>(initialView);

  // Modales — inicializamos onboardingOpen si nunca se completó.
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    const s = getSettings();
    return !s?.onboardingSeen;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [weeklyOpen, setWeeklyOpen]     = useState(() => WeeklyReport.shouldShow());

  // Persistir lang/theme en settings.
  useEffect(() => {
    const current = getSettings();
    if (current) setSettings({ ...current, lang, theme });
  }, [lang, theme]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.lang = lang;            }, [lang]);
  useEffect(() => { location.hash = view;                            }, [view]);

  const t = useMemo(() => getTranslations(lang), [lang]);

  const value: AppContextValue = {
    lang, theme, view,
    setLang: setLangState,
    setTheme: setThemeState,
    setView: setViewState,
    t,
    onboardingOpen, settingsOpen, profileOpen, weeklyOpen,
    openOnboarding:  () => setOnboardingOpen(true),
    closeOnboarding: () => {
      // Marcar onboardingSeen al cerrar.
      const s = Storage.get("settings");
      if (s) Storage.set("settings", { ...s, onboardingSeen: true });
      setOnboardingOpen(false);
    },
    openSettings:  () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    openProfile:   () => setProfileOpen(true),
    closeProfile:  () => setProfileOpen(false),
    openWeekly:    () => setWeeklyOpen(true),
    closeWeekly:   () => { WeeklyReport.markShown(); setWeeklyOpen(false); },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
