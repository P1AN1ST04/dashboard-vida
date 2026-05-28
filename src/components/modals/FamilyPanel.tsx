/**
 * src/components/modals/FamilyPanel.tsx — Gestión de households (familia).
 *
 * Renderizado como tab dentro de SettingsPanel. Tres estados:
 *   - Sin households: botón "Crear familia"
 *   - Con households: lista con miembros + invites pending + invitar nuevo email
 *   - Owner ve botones revocar invite + el resto solo ve sus datos
 *
 * Backend en src/lib/household.ts. Errores normalizados a i18n.
 */

import { useEffect, useState } from "react";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/hooks/useAuth";
import { Icon } from "@/components/ui/Icon";
import {
  Household,
  type HouseholdData,
  type HouseholdMember,
  type HouseholdInvite,
  type HouseholdError,
} from "@/lib";

function errLabel(err: HouseholdError | null, lang: "es" | "en"): string {
  if (!err) return "";
  switch (err.key) {
    case "not_configured":
      return lang === "es" ? "Conecta Supabase primero." : "Connect Supabase first.";
    case "auth_required":
      return lang === "es" ? "Necesitas iniciar sesión." : "Sign in required.";
    case "not_found":
      return lang === "es" ? "No encontrado." : "Not found.";
    case "forbidden":
      return lang === "es" ? "Sin permiso." : "Forbidden.";
    case "expired":
      return lang === "es" ? "Invitación expirada." : "Invitation expired.";
    case "wrong_email":
      return lang === "es" ? "Esta invitación es para otro correo." : "Invite is for a different email.";
    case "already_used":
      return lang === "es" ? "Invitación ya usada." : "Invitation already used.";
    case "network":
      return lang === "es" ? "Sin conexión." : "Network error.";
    default:
      return err.message;
  }
}

export function FamilyPanel() {
  const { lang } = useApp();
  const { user, isConfigured } = useAuth();

  const [households, setHouseholds] = useState<HouseholdData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HouseholdError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const currentUserId = user?.id;
  const selectedHh = households.find((h) => h.id === selectedId) ?? null;
  const isOwner = !!selectedHh && selectedHh.owner_user_id === currentUserId;

  async function refreshHouseholds() {
    setLoading(true);
    const { data, error: e } = await Household.listMyHouseholds();
    setLoading(false);
    if (e) { setError(e); return; }
    setHouseholds(data ?? []);
    if (!selectedId && (data ?? []).length > 0) {
      setSelectedId(data![0].id);
    } else if (selectedId && !(data ?? []).some((h) => h.id === selectedId)) {
      setSelectedId((data ?? [])[0]?.id ?? null);
    }
  }

  async function refreshHouseholdDetail(hhId: string) {
    setError(null);
    const [m, i] = await Promise.all([
      Household.listMembers(hhId),
      Household.listInvites(hhId),
    ]);
    if (m.error) { setError(m.error); return; }
    if (i.error) { setError(i.error); return; }
    setMembers(m.data ?? []);
    setInvites(i.data ?? []);
  }

  useEffect(() => {
    if (isConfigured) refreshHouseholds();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured]);

  useEffect(() => {
    if (selectedId) refreshHouseholdDetail(selectedId);
    else { setMembers([]); setInvites([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleCreate() {
    if (!createName.trim() || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const { data, error: e } = await Household.createHousehold(createName.trim());
    setBusy(false);
    if (e) { setError(e); return; }
    setCreateName("");
    setNotice(lang === "es" ? "Familia creada." : "Family created.");
    await refreshHouseholds();
    if (data) setSelectedId(data);
  }

  async function handleInvite() {
    if (!selectedId || !inviteEmail.trim() || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const { data, error: e } = await Household.inviteByEmail(selectedId, inviteEmail.trim());
    setBusy(false);
    if (e) { setError(e); return; }
    setInviteEmail("");
    setNotice(
      data?.email_sent
        ? (lang === "es" ? "Invitación enviada por correo." : "Invite emailed.")
        : (lang === "es"
            ? `Invitación creada. Copia el link y compártelo: ${data?.invite_url ?? ""}`
            : `Invite created. Share the link: ${data?.invite_url ?? ""}`),
    );
    await refreshHouseholdDetail(selectedId);
  }

  async function handleRevoke(inviteId: string) {
    if (busy) return;
    if (!window.confirm(lang === "es" ? "¿Revocar esta invitación?" : "Revoke this invite?")) return;
    setBusy(true);
    const { error: e } = await Household.revokeInvite(inviteId);
    setBusy(false);
    if (e) { setError(e); return; }
    if (selectedId) await refreshHouseholdDetail(selectedId);
  }

  async function handleLeave() {
    if (!selectedId || busy) return;
    const msg = isOwner
      ? (lang === "es"
          ? "Eres owner. Salir traspasa la propiedad al miembro más antiguo (o borra la familia si eres el único). ¿Continuar?"
          : "You are owner. Leaving will transfer ownership (or delete the family if you are alone). Continue?")
      : (lang === "es" ? "¿Salir de esta familia?" : "Leave this family?");
    if (!window.confirm(msg)) return;
    setBusy(true);
    const { error: e } = await Household.leaveHousehold(selectedId);
    setBusy(false);
    if (e) { setError(e); return; }
    setSelectedId(null);
    await refreshHouseholds();
  }

  if (!isConfigured) {
    return (
      <div className="empty-small" style={{ padding: 24 }}>
        {lang === "es"
          ? "La función Familia requiere Supabase conectado."
          : "Family requires Supabase configured."}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="empty-small" style={{ padding: 24 }}>
        {lang === "es" ? "Cargando…" : "Loading…"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Selector + crear */}
      {households.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <div className="kicker">{lang === "es" ? "Sin familia aún" : "No family yet"}</div>
          <div className="meta" style={{ marginTop: 4, marginBottom: 12 }}>
            {lang === "es"
              ? "Crea una familia para compartir transacciones, hábitos o calendario con tus hermanos."
              : "Create a family to share transactions, habits, or calendar with siblings."}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text" className="input" placeholder={lang === "es" ? "Nombre (ej. Casa Portocarrero)" : "Name (e.g. Smith Family)"}
              value={createName} onChange={(e) => setCreateName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn warm" onClick={handleCreate} disabled={busy || !createName.trim()}>
              {lang === "es" ? "Crear" : "Create"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {households.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`pill${selectedId === h.id ? " warm" : ""}`}
                onClick={() => setSelectedId(h.id)}
                style={{ cursor: "pointer", border: selectedId === h.id ? "1px solid var(--terracotta)" : "1px solid var(--line)" }}
              >
                {h.name}
                {h.owner_user_id === currentUserId && (
                  <span className="meta" style={{ marginLeft: 6, fontSize: 9 }}>
                    {lang === "es" ? "owner" : "owner"}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Detalle del household seleccionado */}
          {selectedHh && (
            <>
              <div className="card" style={{ padding: 14 }}>
                <div className="kicker">{lang === "es" ? "MIEMBROS" : "MEMBERS"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {members.map((m) => (
                    <div
                      key={m.user_id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "6px 0",
                      }}
                    >
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "var(--paper-sunk)",
                        display: "grid", placeItems: "center",
                        fontSize: 12, color: "var(--ink-3)",
                      }}>
                        {m.user_id.slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <code style={{ fontSize: 11, color: "var(--ink-3)" }}>
                          {m.user_id === currentUserId
                            ? (lang === "es" ? "tú" : "you")
                            : m.user_id}
                        </code>
                      </div>
                      <span className="meta">
                        {m.role === "owner" ? (lang === "es" ? "owner" : "owner") : (lang === "es" ? "miembro" : "member")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invites */}
              {isOwner && (
                <div className="card" style={{ padding: 14 }}>
                  <div className="kicker">{lang === "es" ? "INVITAR POR EMAIL" : "INVITE BY EMAIL"}</div>
                  <div className="meta" style={{ marginTop: 4, marginBottom: 10 }}>
                    {lang === "es"
                      ? "Se enviará un enlace mágico. Si el email ya tiene cuenta, lo añade directo."
                      : "A magic link will be emailed. If the address has an account, they join directly."}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      type="email" className="input" placeholder="hermano@email.com"
                      value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn warm" onClick={handleInvite} disabled={busy || !inviteEmail.trim()}>
                      {lang === "es" ? "Invitar" : "Invite"}
                    </button>
                  </div>

                  {invites.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {invites.map((inv) => (
                        <div key={inv.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 8px", borderRadius: 6,
                          background: inv.status === "pending" ? "var(--paper-sunk)" : "transparent",
                          opacity: inv.status === "pending" ? 1 : 0.5,
                        }}>
                          <span style={{ flex: 1, fontSize: 12.5 }}>{inv.invited_email}</span>
                          <span className="meta" style={{ fontSize: 10.5 }}>{inv.status}</span>
                          {inv.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(inv.id)}
                              className="btn"
                              style={{ fontSize: 11, padding: "2px 8px" }}
                            >
                              {lang === "es" ? "Revocar" : "Revoke"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button type="button" className="btn danger" onClick={handleLeave} disabled={busy}>
                <Icon name="x" size={13} />{" "}
                {isOwner
                  ? (lang === "es" ? "Eliminar / Salir" : "Delete / Leave")
                  : (lang === "es" ? "Salir de la familia" : "Leave family")}
              </button>
            </>
          )}

          {/* Card para crear OTRO household */}
          <details className="card-flat" style={{ padding: 12 }}>
            <summary style={{ cursor: "pointer", fontSize: 13 }} className="meta">
              {lang === "es" ? "+ Crear otra familia" : "+ Create another family"}
            </summary>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                type="text" className="input"
                placeholder={lang === "es" ? "Nombre" : "Name"}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn warm" onClick={handleCreate} disabled={busy || !createName.trim()}>
                {lang === "es" ? "Crear" : "Create"}
              </button>
            </div>
          </details>
        </>
      )}

      {error && <div className="form-error">{errLabel(error, lang)}</div>}
      {notice && (
        <div className="caption" style={{ color: "var(--sage)", padding: 8, background: "var(--sage-soft)", borderRadius: 6 }}>
          ✓ {notice}
        </div>
      )}
    </div>
  );
}

export default FamilyPanel;
