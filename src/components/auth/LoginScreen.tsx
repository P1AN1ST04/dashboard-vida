/**
 * src/components/auth/LoginScreen.tsx — Pantalla de entrada/registro.
 *
 * Look: Quiet Almanac. Tarjeta editorial centrada sobre papel cálido,
 * tipografía Instrument Serif para títulos, Manrope en formulario.
 *
 * Modos:
 *   - signin: email + password → Auth.signInWithPassword
 *   - signup: email + password + nombre → Auth.signUpWithPassword
 *   - magic:  email → Auth.signInWithMagicLink (link enviado por correo)
 *
 * Opción "Continuar sin cuenta" → modo offline (namespace 'default').
 *
 * Toda la UI es accesible: labels asociadas, errores con role="alert".
 */

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/hooks/useApp";
import type { AuthError } from "@/lib/auth";
import type { Translations } from "@/locales";

type Mode = "signin" | "signup";

function errorLabel(t: Translations, err: AuthError | null): string {
  if (!err) return "";
  switch (err.key) {
    case "invalid_credentials": return t.auth_err_invalid_credentials;
    case "email_taken":         return t.auth_err_email_taken;
    case "weak_password":       return t.auth_err_weak_password;
    case "rate_limited":        return t.auth_err_rate_limited;
    case "not_configured":      return t.auth_err_not_configured;
    case "network":             return t.auth_err_network;
    default:                    return t.auth_err_unknown;
  }
}

export function LoginScreen() {
  const { t, lang, setLang } = useApp();
  const { signIn, signUp, signInMagic, continueOffline, isConfigured } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setMagicSent(false);
    setBusy(true);
    try {
      const res = mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, name.trim() || undefined);
      if (res.error) setError(res.error);
      // si OK: useAuth aplicará la sesión y AuthGate desmontará esta vista.
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    if (busy || !email.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await signInMagic(email);
      if (res.error) setError(res.error);
      else setMagicSent(true);
    } finally {
      setBusy(false);
    }
  };

  const busyLabel =
    mode === "signin" ? t.auth_signing_in : t.auth_signing_up;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <header className="auth-card-header">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true" />
            <span className="auth-brand-name serif">{t.appName}</span>
          </div>
          <button
            type="button"
            className="auth-lang"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            aria-label={lang === "es" ? "Switch to English" : "Cambiar a español"}
          >
            {lang === "es" ? "EN" : "ES"}
          </button>
        </header>

        <h1 className="auth-title serif">
          {mode === "signin" ? t.auth_welcome : t.appName}
        </h1>
        <p className="auth-subtitle">
          {mode === "signin" ? t.auth_subtitle : t.auth_signup_subtitle}
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`auth-tab ${mode === "signin" ? "is-active" : ""}`}
            onClick={() => { setMode("signin"); setError(null); setMagicSent(false); }}
          >
            {t.auth_tab_signin}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-tab ${mode === "signup" ? "is-active" : ""}`}
            onClick={() => { setMode("signup"); setError(null); setMagicSent(false); }}
          >
            {t.auth_tab_signup}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <label className="auth-field">
              <span className="auth-field-label">{t.auth_name}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.auth_name_placeholder}
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span className="auth-field-label">{t.auth_email}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
              disabled={!isConfigured}
            />
          </label>

          <label className="auth-field">
            <span className="auth-field-label">{t.auth_password}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              disabled={!isConfigured}
            />
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {errorLabel(t, error)}
            </div>
          )}
          {magicSent && !error && (
            <div className="auth-success" role="status">
              {t.auth_magic_sent}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={busy || !isConfigured}
          >
            {busy
              ? busyLabel
              : mode === "signin"
                ? t.auth_submit_signin
                : t.auth_submit_signup}
          </button>
        </form>

        {isConfigured && (
          <>
            <div className="auth-divider">
              <span>{t.auth_or}</span>
            </div>
            <button
              type="button"
              className="auth-secondary"
              onClick={handleMagicLink}
              disabled={busy || !email.trim()}
            >
              {busy && magicSent === false ? t.auth_sending_link : t.auth_magic_link}
            </button>
          </>
        )}

        <div className="auth-offline">
          <button
            type="button"
            className="auth-link"
            onClick={continueOffline}
            disabled={busy}
          >
            {t.auth_offline}
          </button>
          <p className="auth-offline-hint">{t.auth_offline_hint}</p>
        </div>
      </div>
    </div>
  );
}
