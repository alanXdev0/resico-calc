import { useCallback, useEffect, useState } from 'react';

function load<T extends object>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
    // Solo se aceptan llaves conocidas con el mismo tipo que el valor por defecto.
    for (const [k, v] of Object.entries(defaults)) {
      if (k in stored && typeof stored[k] === typeof v) merged[k] = stored[k];
    }
    return merged as T;
  } catch {
    return defaults;
  }
}

/** Estado de un objeto plano que se recuerda en `localStorage` (si está disponible). */
export function usePersistentState<T extends object>(key: string, defaults: T) {
  const [state, setState] = useState<T>(() => load(key, defaults));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Modo privado o almacenamiento bloqueado: la app funciona igual, solo no recuerda.
    }
  }, [key, state]);

  const update = useCallback((patch: Partial<T> | ((prev: T) => Partial<T>)) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  return [state, update] as const;
}
