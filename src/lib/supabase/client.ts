import { createBrowserClient } from "@supabase/ssr";

// Nota: se usa el cliente de Supabase sin el genérico `Database`. El tipado
// generado automáticamente (Database) es muy estricto con la forma exacta del
// esquema y, sin conexión al proyecto real para `supabase gen types`, generaba
// falsos positivos de TypeScript en cada insert/update. Los tipos de dominio en
// `src/lib/db/types.ts` siguen siendo la fuente de verdad para la UI: se aplican
// explícitamente en cada función de `src/lib/data/*`.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
