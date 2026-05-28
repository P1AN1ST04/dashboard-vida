/**
 * src/lib/store.ts — Pub/sub minimalista para reactividad.
 *
 * El Storage llama Store.notify(collection) cuando cambia algo.
 * Los componentes se suscriben con Store.subscribe(collection, callback)
 * y el callback recibe la señal para re-renderizar.
 */

import type { CollectionName } from "@/types";

type Listener = () => void;

const listeners: Map<CollectionName, Set<Listener>> = new Map();

function subscribe(collection: CollectionName, listener: Listener): () => void {
  let set = listeners.get(collection);
  if (!set) {
    set = new Set();
    listeners.set(collection, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
  };
}

function notify(collection: CollectionName): void {
  const set = listeners.get(collection);
  if (!set) return;
  for (const listener of set) {
    try {
      listener();
    } catch (err) {
      console.error("[Store] listener error", err);
    }
  }
}

/** Útil para forzar re-render de TODAS las vistas (ej: cambio de userId). */
function notifyAll(): void {
  for (const collection of listeners.keys()) {
    notify(collection);
  }
}

export const Store = {
  subscribe,
  notify,
  notifyAll,
} as const;
