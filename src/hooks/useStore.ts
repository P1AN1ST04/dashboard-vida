/**
 * src/hooks/useStore.ts — Hook que se re-renderiza cuando la colección cambia.
 *
 * Uso:
 *   const habits = useCollection("habits");  // re-render cuando habits cambia
 */

import { useReducer, useEffect } from "react";
import type { CollectionName, Collections } from "@/types";
import { Store } from "@/lib/store";
import { Storage } from "@/lib/storage";

export function useStoreSubscription(collections: CollectionName[]): void {
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const unsubs = collections.map((c) => Store.subscribe(c, force));
    return () => {
      for (const u of unsubs) u();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections.join(",")]);
}

export function useCollection<C extends CollectionName>(collection: C): Collections[C] {
  useStoreSubscription([collection]);
  return Storage.get(collection);
}
