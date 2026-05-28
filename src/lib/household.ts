/**
 * src/lib/household.ts — Wrapper tipado sobre el schema household.
 *
 * Backend: Supabase (tablas households / household_members / household_invites,
 * RPCs create_household / accept_invite / leave_household / revoke_invite,
 * Edge Function send-invite-email).
 *
 * Todas las funciones devuelven { data, error } con shape consistente.
 */

import { supabase, requireSupabase, isSupabaseConfigured } from "./supabase";

// ──────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────

export interface Household {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
}

export type HouseholdRole = "owner" | "member";

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
}

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface HouseholdInvite {
  id: string;
  household_id: string;
  invited_email: string;
  invited_by: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  /** Solo visible para el invitado o miembros (no se debe loguear). */
  token?: string;
}

export interface HouseholdError {
  key:
    | "not_configured"
    | "auth_required"
    | "not_found"
    | "forbidden"
    | "already_used"
    | "expired"
    | "wrong_email"
    | "rate_limited"
    | "network"
    | "unknown";
  message: string;
}

export interface Result<T> {
  data: T | null;
  error: HouseholdError | null;
}

interface MaybePgError {
  message?: string;
  code?: string;
}

function mapError(err: MaybePgError | null): HouseholdError | null {
  if (!err) return null;
  const message = err.message ?? "Error desconocido";
  const lower = message.toLowerCase();

  let key: HouseholdError["key"] = "unknown";
  if (err.code === "P0002" || lower.includes("not found") || lower.includes("no encontrada")) {
    key = "not_found";
  } else if (err.code === "42501" || lower.includes("forbidden") || lower.includes("solo el owner")) {
    if (lower.includes("expirada")) key = "expired";
    else if (lower.includes("otro correo")) key = "wrong_email";
    else if (lower.includes("ya accepted") || lower.includes("ya revoked") || lower.includes("ya expired")) key = "already_used";
    else if (lower.includes("autenticación")) key = "auth_required";
    else key = "forbidden";
  } else if (lower.includes("network") || lower.includes("fetch")) {
    key = "network";
  } else if (lower.includes("rate")) {
    key = "rate_limited";
  }
  return { key, message };
}

function notConfiguredError(): HouseholdError {
  return { key: "not_configured", message: "Supabase no está configurado." };
}

// ──────────────────────────────────────────────────────────────────────
// API
// ──────────────────────────────────────────────────────────────────────

export async function createHousehold(name: string): Promise<Result<string>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const { data, error } = await requireSupabase().rpc("create_household", { name });
    if (error) return { data: null, error: mapError(error) };
    return { data: (data as string) ?? null, error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function listMyHouseholds(): Promise<Result<Household[]>> {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  try {
    const { data, error } = await requireSupabase()
      .from("households")
      .select("id, owner_user_id, name, created_at")
      .order("created_at", { ascending: true });
    if (error) return { data: null, error: mapError(error) };
    return { data: (data as Household[]) ?? [], error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function listMembers(householdId: string): Promise<Result<HouseholdMember[]>> {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  try {
    const { data, error } = await requireSupabase()
      .from("household_members")
      .select("household_id, user_id, role, joined_at")
      .eq("household_id", householdId)
      .order("joined_at", { ascending: true });
    if (error) return { data: null, error: mapError(error) };
    return { data: (data as HouseholdMember[]) ?? [], error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function listInvites(householdId: string): Promise<Result<HouseholdInvite[]>> {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  try {
    const { data, error } = await requireSupabase()
      .from("household_invites")
      .select("id, household_id, invited_email, invited_by, status, expires_at, created_at, accepted_at, accepted_by")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: mapError(error) };
    return { data: (data as HouseholdInvite[]) ?? [], error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export interface InviteResponse {
  invite_id: string;
  invite_url: string;
  invited_email: string;
  email_sent: boolean;
  reason?: string;
}

/**
 * Invita a un email a un household. Llama la Edge Function send-invite-email
 * que genera el token + dispara magic link via Supabase Auth.
 */
export async function inviteByEmail(
  householdId: string,
  email: string,
): Promise<Result<InviteResponse>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const client = requireSupabase();
    const { data, error } = await client.functions.invoke<InviteResponse>(
      "send-invite-email",
      { body: { household_id: householdId, email } },
    );
    if (error) return { data: null, error: mapError(error) };
    return { data: data ?? null, error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

/** Acepta una invitación con su token. Devuelve el household_id resultante. */
export async function acceptInvite(token: string): Promise<Result<string>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const { data, error } = await requireSupabase().rpc("accept_invite", { invite_token: token });
    if (error) return { data: null, error: mapError(error) };
    return { data: (data as string) ?? null, error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function leaveHousehold(householdId: string): Promise<Result<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const { error } = await requireSupabase().rpc("leave_household", { hh: householdId });
    if (error) return { data: null, error: mapError(error) };
    return { data: true, error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

export async function revokeInvite(inviteId: string): Promise<Result<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: notConfiguredError() };
  try {
    const { error } = await requireSupabase().rpc("revoke_invite", { invite_id: inviteId });
    if (error) return { data: null, error: mapError(error) };
    return { data: true, error: null };
  } catch (e) {
    return { data: null, error: mapError(e as Error) };
  }
}

/** Resuelve emails de los miembros (usando auth.admin.getUserById no es posible
 *  desde el cliente; el RLS de auth.users no es accesible). Para mostrar emails
 *  en la UI necesitaríamos otra Edge Function que los resuelva. Por ahora la UI
 *  muestra el user_id truncado. */

export const Household = {
  createHousehold,
  listMyHouseholds,
  listMembers,
  listInvites,
  inviteByEmail,
  acceptInvite,
  leaveHousehold,
  revokeInvite,
} as const;

// Necesario para que el bundle no warnee.
void supabase;
