"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * true/false según si el media query matchea. Usa useSyncExternalStore (la API
 * pensada justo para esto: suscribirse a una fuente externa como matchMedia) en vez
 * de useState + useEffect, así se evita el ida-y-vuelta de un render extra al montar
 * y el snapshot de servidor queda explícito (asume "no matchea" durante el render de
 * servidor, coherente con el enfoque mobile-first del resto de la app).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false
  );
}
