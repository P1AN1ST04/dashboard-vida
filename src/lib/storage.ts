/**
 * src/lib/storage.ts — Capa de persistencia tipada sobre localStorage.
 *
 * Diseñada para multi-usuario: cada usuario tiene su propio namespace.
 * Por defecto usa "default" cuando aún no hay sesión iniciada (auth pendiente
 * en el Bloque C). Cuando el usuario inicia sesión, Storage.setUserId(id)
 * cambia el namespace en caliente y los datos quedan aislados.
 *
 * Convención de keys: vida.v2.<userId>.<collection>
 */

import type {
  CollectionName,
  Collections,
  User,
  Settings,
} from "@/types";
import { Store } from "./store";

const VERSION = "v2";
const DEFAULT_USER_ID = "default";

const VALID_COLLECTIONS: readonly CollectionName[] = [
  "user",
  "settings",
  "transactions",
  "subscriptions",
  "habits",
  "goals",
  "workouts",
  "achievements",
] as const;

const SINGLETON_COLLECTIONS = new Set<CollectionName>(["user", "settings"]);

let currentUserId: string = DEFAULT_USER_ID;

function key(collection: CollectionName): string {
  return `vida.${VERSION}.${currentUserId}.${collection}`;
}

function assertCollection(name: string): asserts name is CollectionName {
  if (!VALID_COLLECTIONS.includes(name as CollectionName)) {
    throw new Error(
      `Storage: colección desconocida "${name}". Válidas: ${VALID_COLLECTIONS.join(", ")}`,
    );
  }
}

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function readRaw<T>(collection: CollectionName): T | null {
  const raw = localStorage.getItem(key(collection));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Storage: JSON corrupto en "${collection}"`, err);
    return null;
  }
}

function writeRaw<T>(collection: CollectionName, value: T): void {
  try {
    localStorage.setItem(key(collection), JSON.stringify(value));
  } catch (err) {
    console.error(`Storage: falla al escribir "${collection}"`, err);
    throw err;
  }
  Store.notify(collection);
}

// ──────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────

function get<C extends CollectionName>(collection: C): Collections[C] {
  assertCollection(collection);
  const data = readRaw<Collections[C]>(collection);
  if (data !== null) return data;
  if (SINGLETON_COLLECTIONS.has(collection)) {
    return null as Collections[C];
  }
  return [] as unknown as Collections[C];
}

function getById<C extends CollectionName>(
  collection: C,
  id: string,
): Extract<Collections[C], readonly unknown[]>[number] | null {
  assertCollection(collection);
  if (SINGLETON_COLLECTIONS.has(collection)) {
    throw new Error(`Storage: ${collection} es singleton, usa get().`);
  }
  const list = get(collection) as unknown as Array<{ id: string }>;
  return (list.find((item) => item.id === id) as never) || null;
}

interface WithId {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

function add<C extends Exclude<CollectionName, "user" | "settings">>(
  collection: C,
  item: Partial<Collections[C] extends Array<infer Item> ? Item : never>,
): Collections[C] extends Array<infer Item> ? Item : never {
  assertCollection(collection);
  if (SINGLETON_COLLECTIONS.has(collection)) {
    throw new Error(`Storage: ${collection} es singleton, usa set().`);
  }
  const now = new Date().toISOString();
  const baseItem = item as WithId;
  const enriched = {
    ...baseItem,
    id: baseItem.id || genId(),
    createdAt: baseItem.createdAt || now,
    updatedAt: now,
  } as unknown as Collections[C] extends Array<infer Item> ? Item : never;

  const list = get(collection) as unknown as Array<typeof enriched>;
  list.push(enriched);
  writeRaw(collection, list);
  return enriched;
}

function update<C extends Exclude<CollectionName, "user" | "settings">>(
  collection: C,
  id: string,
  patch: Partial<Collections[C] extends Array<infer Item> ? Item : never>,
): (Collections[C] extends Array<infer Item> ? Item : never) | null {
  assertCollection(collection);
  if (SINGLETON_COLLECTIONS.has(collection)) {
    throw new Error(`Storage: ${collection} es singleton, usa set().`);
  }
  const list = get(collection) as unknown as Array<WithId>;
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const original = list[idx];
  const updated = {
    ...original,
    ...patch,
    id: original.id,
    createdAt: original.createdAt,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  writeRaw(collection, list);
  return updated as never;
}

function remove(
  collection: Exclude<CollectionName, "user" | "settings">,
  id: string,
): boolean {
  assertCollection(collection);
  if (SINGLETON_COLLECTIONS.has(collection)) {
    throw new Error(`Storage: ${collection} es singleton, usa set(null).`);
  }
  const list = get(collection) as unknown as Array<{ id: string }>;
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  writeRaw(collection, list);
  return true;
}

function set<C extends CollectionName>(
  collection: C,
  value: Collections[C],
): void {
  assertCollection(collection);
  writeRaw(collection, value);
}

function clear(collection: CollectionName): void {
  assertCollection(collection);
  localStorage.removeItem(key(collection));
  Store.notify(collection);
}

/** Borra TODAS las colecciones del usuario activo. No toca otros usuarios. */
function reset(): void {
  for (const name of VALID_COLLECTIONS) {
    localStorage.removeItem(key(name));
    Store.notify(name);
  }
}

/** Cambia el namespace al userId dado. Llamar después de login/logout. */
function setUserId(userId: string | null): void {
  currentUserId = userId || DEFAULT_USER_ID;
  for (const name of VALID_COLLECTIONS) {
    Store.notify(name);
  }
}

function getUserId(): string {
  return currentUserId;
}

/**
 * Copia colecciones del namespace 'default' al `targetUserId` si el destino
 * NO tiene datos. Útil al iniciar sesión por primera vez: el usuario no
 * pierde los hábitos / transacciones que sembró en modo offline.
 *
 * No machaca datos existentes: solo copia las colecciones donde el destino
 * está vacío o no existe.
 *
 * Devuelve la lista de colecciones efectivamente migradas.
 */
function migrateDefaultTo(targetUserId: string): CollectionName[] {
  if (!targetUserId || targetUserId === DEFAULT_USER_ID) return [];
  const migrated: CollectionName[] = [];

  for (const name of VALID_COLLECTIONS) {
    const defaultKey = `vida.${VERSION}.${DEFAULT_USER_ID}.${name}`;
    const targetKey = `vida.${VERSION}.${targetUserId}.${name}`;
    const defaultRaw = localStorage.getItem(defaultKey);
    if (defaultRaw === null) continue;

    const targetRaw = localStorage.getItem(targetKey);
    if (targetRaw !== null) {
      try {
        const parsed = JSON.parse(targetRaw);
        const isEmpty =
          parsed === null ||
          (Array.isArray(parsed) && parsed.length === 0);
        if (!isEmpty) continue;
      } catch {
        // JSON corrupto en destino: lo tratamos como vacío y sobrescribimos.
      }
    }

    localStorage.setItem(targetKey, defaultRaw);
    migrated.push(name);
  }

  if (currentUserId === targetUserId) {
    for (const name of migrated) Store.notify(name);
  }

  if (migrated.length > 0) {
    console.log(
      `[storage] Migrated from 'default' to '${targetUserId}':`,
      migrated.join(", "),
    );
  }
  return migrated;
}

/** Borra TODOS los datos del namespace 'default'. Llamar tras migrar si se desea limpieza. */
function clearDefaultNamespace(): void {
  for (const name of VALID_COLLECTIONS) {
    localStorage.removeItem(`vida.${VERSION}.${DEFAULT_USER_ID}.${name}`);
  }
}

function debug(): Record<string, unknown> {
  const dump: Record<string, unknown> = {};
  for (const name of VALID_COLLECTIONS) {
    dump[name] = readRaw(name);
  }
  return dump;
}

export const Storage = {
  get,
  getById,
  add,
  update,
  remove,
  set,
  clear,
  reset,
  setUserId,
  getUserId,
  migrateDefaultTo,
  clearDefaultNamespace,
  debug,
  DEFAULT_USER_ID,
  VALID_COLLECTIONS,
  SINGLETON_COLLECTIONS: [...SINGLETON_COLLECTIONS],
} as const;

// Helpers tipados específicos para singletons (más cómodos de usar)
export function getUser(): User | null {
  return Storage.get("user");
}
export function setUser(user: User): void {
  Storage.set("user", user);
}
export function getSettings(): Settings | null {
  return Storage.get("settings");
}
export function setSettings(settings: Settings): void {
  Storage.set("settings", settings);
}
