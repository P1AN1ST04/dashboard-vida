/**
 * src/components/ModalsHost.tsx — Monta los modales globales según useApp().
 *
 * Onboarding / SettingsPanel / ProfileModal / WeeklyReportModal son singletons:
 * solo puede haber uno abierto por tipo en cualquier momento. Su estado vive
 * en useApp() — este componente solo es el render condicional.
 */

import { useApp } from "@/hooks/useApp";
import { Onboarding } from "@/components/modals/Onboarding";
import { SettingsPanel } from "@/components/modals/SettingsPanel";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { WeeklyReportModal } from "@/components/modals/WeeklyReportModal";

export function ModalsHost() {
  const app = useApp();
  return (
    <>
      {app.onboardingOpen && <Onboarding onClose={app.closeOnboarding} />}
      {app.settingsOpen   && <SettingsPanel onClose={app.closeSettings} />}
      {app.profileOpen    && <ProfileModal onClose={app.closeProfile} />}
      {/* Weekly se oculta cuando Onboarding está visible — no apilamos modales. */}
      {app.weeklyOpen && !app.onboardingOpen && (
        <WeeklyReportModal onClose={app.closeWeekly} />
      )}
    </>
  );
}

export default ModalsHost;
