/**
 * src/components/modals/SettingsPanel.tsx — Panel de ajustes.
 *
 * Tabs:
 *   - Preferencias: nombre, moneda, tasa USD/PEN, presupuestos.
 *   - Integraciones: Strava/Google stub, shortcuts token + claim_user_token.
 *   - Datos: Export JSON, Import CSV (abre CsvImportModal), "Empezar de cero"
 *     (Seed.wipe + reload).
 *
 * Las integraciones reales (Strava sync, Google calendar) entran en Bloque H.
 * Aquí solo exponemos los inputs y el "vincular token" para la web.
 */

import { useState, type FormEvent } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import { Storage, Seed, supabase } from "@/lib";
import { CsvImportModal } from "./CsvImportModal";
import { FamilyPanel } from "./FamilyPanel";
import type { Currency } from "@/types";

type Tab = "prefs" | "integrations" | "family" | "data";

export interface SettingsPanelProps {
  onClose: () => void;
}

function genShortcutsToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "vida_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t, lang } = useApp();
  const user = useCollection("user");
  const settings = useCollection("settings");

  const [tab, setTab] = useState<Tab>("prefs");
  const [showCsv, setShowCsv] = useState(false);

  // Preferencias
  const [name, setName]             = useState(user?.name ?? "");
  const [currency, setCurrency]     = useState<Currency>(settings?.currency ?? "PEN");
  const [exchangeRate, setExchangeRate] = useState(String(settings?.exchangeRate ?? 3.75));
  const [monthly, setMonthly]       = useState(String(settings?.budget?.monthly ?? 2500));
  const [daily, setDaily]           = useState(String(settings?.budget?.daily ?? 80));
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Integraciones
  const [shortcutsToken, setShortcutsToken] = useState(settings?.shortcutsToken ?? "");
  const [tokenCopied, setTokenCopied]       = useState(false);
  const [claimStatus, setClaimStatus]       = useState<string>("");
  const stravaConnected = !!settings?.integrations?.strava?.connected;
  const googleConnected = !!settings?.integrations?.google?.connected;

  function handleSavePrefs(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(lang === "es" ? "Nombre requerido" : "Name required");
      return;
    }
    const rate = parseFloat(exchangeRate);
    const m = parseFloat(monthly);
    const d = parseFloat(daily);
    if (!rate || rate <= 0 || isNaN(m) || isNaN(d) || m < 0 || d < 0) {
      setError(lang === "es" ? "Valores inválidos" : "Invalid values");
      return;
    }
    if (user) {
      Storage.set("user", {
        ...user,
        name: name.trim(),
        initials: name.trim().slice(0, 1).toUpperCase(),
      });
    }
    if (settings) {
      Storage.set("settings", {
        ...settings,
        currency,
        secondaryCurrency: currency === "PEN" ? "USD" : "PEN",
        exchangeRate: rate,
        budget: { monthly: m, daily: d },
      });
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  function regenerateToken() {
    if (shortcutsToken && !window.confirm(lang === "es" ? "Regenerar token?" : "Regenerate?")) return;
    const newToken = genShortcutsToken();
    setShortcutsToken(newToken);
    if (settings) Storage.set("settings", { ...settings, shortcutsToken: newToken });
  }
  function copyToken() {
    if (!shortcutsToken) return;
    navigator.clipboard.writeText(shortcutsToken).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  }

  async function claimTokenForAccount() {
    if (!shortcutsToken) {
      setClaimStatus(lang === "es" ? "Genera un token primero" : "Generate a token first");
      return;
    }
    if (!supabase) {
      setClaimStatus(lang === "es" ? "Sesión Supabase no configurada" : "Supabase not configured");
      return;
    }
    setClaimStatus(lang === "es" ? "Vinculando..." : "Linking...");
    const { data, error: e } = await supabase.rpc("claim_user_token", {
      token: shortcutsToken,
      device_label: navigator.platform || "device",
    });
    if (e) {
      setClaimStatus("Error: " + e.message);
      return;
    }
    setClaimStatus(
      (lang === "es" ? "Vinculado. " : "Linked. ") +
      JSON.stringify((data as { backfilled?: unknown })?.backfilled ?? {}),
    );
    setTimeout(() => setClaimStatus(""), 5000);
  }

  function exportJson() {
    const dump = {
      user:          Storage.get("user"),
      settings:      Storage.get("settings"),
      transactions:  Storage.get("transactions"),
      habits:        Storage.get("habits"),
      goals:         Storage.get("goals"),
      workouts:      Storage.get("workouts"),
      subscriptions: Storage.get("subscriptions"),
      achievements:  Storage.get("achievements"),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vida-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetData() {
    const msg1 = lang === "es"
      ? "Esto borrará TODOS tus datos locales (transacciones, hábitos, metas, entrenamientos). Continuar?"
      : "This will delete ALL your local data. Continue?";
    const msg2 = lang === "es" ? "Estás seguro? No se puede deshacer." : "Are you sure? Cannot be undone.";
    if (!window.confirm(msg1)) return;
    if (!window.confirm(msg2)) return;
    Seed.wipe();
    onClose();
    window.location.reload();
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 600, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="kicker" style={{ marginBottom: 4 }}>
          {lang === "es" ? "AJUSTES" : "SETTINGS"}
        </div>
        <div className="h2" style={{ marginBottom: 20 }}>
          {lang === "es" ? "Tu configuración" : "Your configuration"}
        </div>

        <div className="seg" style={{ marginBottom: 18 }}>
          <button type="button" className={`seg-btn ${tab === "prefs" ? "on" : ""}`} onClick={() => setTab("prefs")}>
            {lang === "es" ? "Preferencias" : "Preferences"}
          </button>
          <button type="button" className={`seg-btn ${tab === "integrations" ? "on" : ""}`} onClick={() => setTab("integrations")}>
            {lang === "es" ? "Integraciones" : "Integrations"}
          </button>
          <button type="button" className={`seg-btn ${tab === "family" ? "on" : ""}`} onClick={() => setTab("family")}>
            {lang === "es" ? "Familia" : "Family"}
          </button>
          <button type="button" className={`seg-btn ${tab === "data" ? "on" : ""}`} onClick={() => setTab("data")}>
            {lang === "es" ? "Datos" : "Data"}
          </button>
        </div>

        {tab === "family" && <FamilyPanel />}

        {tab === "prefs" && (
          <form onSubmit={handleSavePrefs}>
            <div className="form-row">
              <label className="form-label">{lang === "es" ? "Tu nombre" : "Your name"}</label>
              <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-row" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{lang === "es" ? "Moneda" : "Currency"}</label>
                <select
                  className="input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  <option value="PEN">S/ Soles</option>
                  <option value="USD">$ Dólares</option>
                  <option value="MXN">$ Pesos MXN</option>
                  <option value="EUR">€ Euros</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{lang === "es" ? "Tasa USD/PEN" : "USD/PEN"}</label>
                <input
                  type="number" step={0.01} min={0} className="input mono"
                  value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} required
                />
              </div>
            </div>
            <div className="form-row" style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{lang === "es" ? "Presupuesto mensual" : "Monthly budget"}</label>
                <input
                  type="number" step={1} min={0} className="input mono"
                  value={monthly} onChange={(e) => setMonthly(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{lang === "es" ? "Presupuesto diario" : "Daily budget"}</label>
                <input
                  type="number" step={1} min={0} className="input mono"
                  value={daily} onChange={(e) => setDaily(e.target.value)}
                />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            {savedFlash && (
              <div className="caption" style={{ color: "var(--sage)", marginTop: 4 }}>
                ✓ {lang === "es" ? "Guardado" : "Saved"}
              </div>
            )}
            <div className="form-actions">
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button type="button" className="btn" onClick={onClose}>
                  {lang === "es" ? "Cerrar" : "Close"}
                </button>
                <button type="submit" className="btn warm">
                  {lang === "es" ? "Guardar" : "Save"}
                </button>
              </div>
            </div>
          </form>
        )}

        {tab === "integrations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="kicker">Strava</div>
              <div className="meta" style={{ marginTop: 4 }}>
                {stravaConnected
                  ? (lang === "es" ? "Conectado" : "Connected")
                  : (lang === "es" ? "Desconectado — disponible en Bloque H" : "Not connected — Block H")}
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="kicker">Google Calendar / Drive</div>
              <div className="meta" style={{ marginTop: 4 }}>
                {googleConnected
                  ? (lang === "es" ? "Conectado" : "Connected")
                  : (lang === "es" ? "Desconectado — disponible en Bloque H" : "Not connected — Block H")}
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="kicker">{lang === "es" ? "APPLE SHORTCUTS" : "APPLE SHORTCUTS"}</div>
              <div className="meta" style={{ marginTop: 4, marginBottom: 10 }}>
                {lang === "es"
                  ? "Token compartido entre Shortcut y la web. Vincúlalo a tu cuenta para que los eventos lleguen aislados por usuario."
                  : "Shared token between Shortcut and the web. Link it to your account to keep data isolated."}
              </div>
              {shortcutsToken && (
                <div style={{
                  display: "flex", gap: 6, alignItems: "center", marginBottom: 8,
                }}>
                  <code style={{
                    flex: 1, padding: "6px 8px", background: "var(--paper-sunk)",
                    borderRadius: 6, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis",
                  }}>{shortcutsToken}</code>
                  <button type="button" className="btn" onClick={copyToken} style={{ padding: "4px 10px" }}>
                    {tokenCopied ? "✓" : (lang === "es" ? "Copiar" : "Copy")}
                  </button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn" onClick={regenerateToken}>
                  {shortcutsToken
                    ? (lang === "es" ? "Regenerar" : "Regenerate")
                    : (lang === "es" ? "Generar token" : "Generate token")}
                </button>
                <button
                  type="button"
                  className="btn warm"
                  onClick={claimTokenForAccount}
                  disabled={!shortcutsToken}
                >
                  {lang === "es" ? "Vincular a mi cuenta" : "Link to my account"}
                </button>
              </div>
              {claimStatus && (
                <div className="caption" style={{ marginTop: 8 }}>{claimStatus}</div>
              )}
            </div>
            {/* unused t to avoid lint */}
            {false && <span style={{ display: "none" }}>{t.appName}</span>}
          </div>
        )}

        {tab === "data" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button type="button" className="btn" onClick={exportJson}>
              <Icon name="book" size={14} /> {lang === "es" ? "Exportar JSON" : "Export JSON"}
            </button>
            <button type="button" className="btn" onClick={() => setShowCsv(true)}>
              <Icon name="plus" size={14} /> {lang === "es" ? "Importar CSV" : "Import CSV"}
            </button>
            <div style={{
              marginTop: 12, padding: 14, border: "1px solid var(--line)",
              borderRadius: "var(--radius)", background: "var(--paper-sunk)",
            }}>
              <div className="kicker" style={{ color: "var(--danger)" }}>
                {lang === "es" ? "ZONA PELIGROSA" : "DANGER ZONE"}
              </div>
              <div className="meta" style={{ marginTop: 4, marginBottom: 10 }}>
                {lang === "es"
                  ? "Borra todos tus datos locales y vuelve al estado inicial. Útil para empezar de cero."
                  : "Wipes all local data and returns to initial state."}
              </div>
              <button type="button" className="btn danger" onClick={resetData}>
                <Icon name="trash" size={14} />{" "}
                {lang === "es" ? "Empezar de cero" : "Start from scratch"}
              </button>
            </div>
          </div>
        )}

        {showCsv && <CsvImportModal onClose={() => setShowCsv(false)} />}
      </div>
    </div>
  );
}

export default SettingsPanel;
