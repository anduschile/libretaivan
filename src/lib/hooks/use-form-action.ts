"use client";

import { useState, useTransition } from "react";

/**
 * Reemplaza a `useActionState` en los formularios de esta app: al no depender de un
 * useEffect para reaccionar al éxito de la acción (ej. cerrar la hoja modal), evita
 * el warning de react-hooks sobre actualizar estado sincrónicamente dentro de un
 * efecto — el cierre ocurre directamente en la transición que dispara la acción.
 */
export function useFormAction<S extends { error: string | null; ok?: boolean }>(
  action: (prevState: S, formData: FormData) => Promise<S>,
  initialState: S,
  onSuccess?: (state: S) => void
) {
  const [state, setState] = useState<S>(initialState);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);
      if (result.ok) onSuccess?.(result);
    });
  }

  return { state, pending, submit };
}
