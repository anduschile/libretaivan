-- Cancela (soft-delete, estado = 'cancelada' — mismo mecanismo que ya usa la app, no
-- DELETE físico) las asignaciones que quedaron cargadas en 2026-09-18 y 2026-09-19
-- (feriados irrenunciables, el recinto no opera esos días).
--
-- Verificado contra la base real antes de escribir esto: la exclusión de esas dos
-- fechas que aplicó la migración 0007 sí funcionó para la carga masiva del CSV de
-- septiembre — el problema es un origen distinto y separado: la migración 0004
-- (generación de asignaciones de convenios SLEP, escrita ANTES de que existiera la
-- regla del pilar de septiembre) expande cada convenio día por día sin ningún filtro
-- de feriados, y lo mismo hace crearConvenio() en
-- src/app/(app)/organizaciones/convenios/actions.ts para convenios creados desde la
-- UI. Ninguna de esas dos rutas conocía la fecha del feriado. Se corrige ambas rutas
-- en código (ver src/lib/date.ts: FERIADOS_IRRENUNCIBLES / esFeriadoIrrenunciable) en
-- el mismo cambio que esta migración.
--
-- Encontradas 3 filas, las 3 son placeholders de convenio (tipo = 'convenio'), ninguna
-- es una asignación real cargada por el CSV de septiembre:
--   - 2026-09-18: "Pilates y Zumba - Escuela O'Higgins" en Gimnasio - Escuela O'Higgins, 20:00-22:00
--   - 2026-09-19: "Taller por confirmar — Avendaño" en Gimnasio - Escuela Avendaño, 10:00-18:00
--   - 2026-09-19: "Taller por confirmar — Ladrilleros" en Gimnasio - Escuela Ladrilleros, 10:00-18:00
--
-- rd_asignacion no tiene una columna dedicada a motivo de cancelación — se usa
-- "observaciones" (agregada en la migración 0007) para dejar constancia.

do $$
declare
  v_filas int;
begin
  update rd_asignacion
  set
    estado = 'cancelada',
    observaciones = trim(both ' | ' from coalesce(observaciones || ' | ', '') || 'Cancelada — feriado irrenunciable (migración 0012).')
  where fecha in ('2026-09-18', '2026-09-19')
    and estado = 'confirmada';
  get diagnostics v_filas = row_count;

  raise notice 'Feriados 18-19 sept: % asignación(es) cancelada(s).', v_filas;
end $$;
