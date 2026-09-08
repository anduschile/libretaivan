# Recintos Deportivos — Panel de administración (Fase 1)

Panel interno, mobile-first, para que el encargado de recintos de la Corporación de
Deportes agende y controle el uso de los recintos deportivos, evitando superposiciones
de horario. Next.js (App Router) + TypeScript + Tailwind CSS + Supabase.

## Requisitos

- Node.js 20+
- Un proyecto Supabase (compartido con otras apps de AndusChile). Este proyecto solo
  usa tablas con el prefijo `rd_`.

## Configuración

1. Copia `.env.local.example` a `.env.local` y completa con los datos de tu proyecto
   Supabase (Project Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

2. Corre las migraciones en `supabase/migrations/` contra tu proyecto, en orden:
   - `0001_init.sql` — esquema completo (tablas `rd_*`, restricción de exclusión de
     horarios, trigger de conflicto entre espacios relacionados, RLS).
   - `0002_seed_datos_reales.sql` — carga los recintos, espacios, conflictos y
     horarios reales del cliente (sin entidades ni convenios).

   Con la CLI de Supabase:
   ```
   supabase link --project-ref <tu-project-ref>
   supabase db push
   ```
   O pega el contenido de cada archivo, en orden, en el SQL Editor del panel de Supabase.

3. Crea la única cuenta de administrador en Supabase Auth (Authentication → Users →
   Add user), con el correo y contraseña que usará el encargado. No hay registro
   público: el login solo acepta credenciales ya creadas ahí.

4. (Opcional, solo desarrollo) Para tener datos de prueba — entidades, un convenio y
   algunas asignaciones ficticias — corre `supabase/seed/dev_seed.sql` contra un
   proyecto de prueba. **Nunca lo corras contra producción.**

## Correr en local

```
npm install
npm run dev
```

Abre http://localhost:3000 — redirige a `/login`. Tras iniciar sesión, redirige a
`/hoy`.

## Estructura

- `src/app/(app)/` — pantallas autenticadas: Hoy, Programación, Recintos,
  Organizaciones (con Convenios anidado).
- `src/app/login/` — login (Supabase Auth, un solo usuario administrador).
- `src/app/api/export/` — generación de PDF (`@react-pdf/renderer`) y Excel
  (`exceljs`) de la programación semanal visible.
- `src/app/api/conflictos/verificar/` — chequeo en vivo de conflictos de horario,
  usado por la hoja de "Asignar horario" antes de guardar.
- `src/lib/supabase/` — clientes de Supabase para browser, server components y
  middleware (`@supabase/ssr`).
- `src/lib/data/` — funciones de lectura desde Supabase (server-only).
- `src/lib/db/types.ts` — tipos de dominio escritos a mano (ver nota en ese archivo
  sobre por qué no se usa el tipo `Database` generado).
- `supabase/migrations/` — esquema y datos reales, en orden.
- `supabase/seed/dev_seed.sql` — datos ficticios, solo para desarrollo.

## Deploy

Pensado para desplegarse en Vercel conectado al repositorio de GitHub
(`anduschile/libretaivan`), igual que el resto de proyectos de AndusChile. Configura
las mismas variables de entorno de `.env.local` en el proyecto de Vercel.
