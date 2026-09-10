-- José aclaró (Ronda 6): "CESFAM" en el documento maestro no es una segunda
-- actividad en paralelo para martes/viernes 14:00-15:00 en la Piscina — es el
-- programa/institución al que pertenece esa sesión de "Ind Personas Mayores".
-- Sigue siendo UNA sola asignación, y la entidad correcta a usar es "Cesfam".
--
-- Verificado contra la base real antes de escribir esto:
--  - La entidad "Cesfam" ya existe (usada en otras 57 asignaciones, todas en
--    Sala de Uso Múltiple) — no hace falta crearla.
--  - Las 8 filas afectadas (Piscina - Espacio 1, 14:00-15:00, martes y viernes
--    de septiembre 2026 — 5 martes + 3 viernes, ya sin 18/19 por ser feriados)
--    están hoy cargadas bajo "Ind Personas Mayores" por la migración 0007.
--  - El lunes 15:00-16:00, que también usa "Ind Personas Mayores" pero SIN
--    CESFAM en el documento, no se toca — sigue siendo esa entidad.
--  - Piscina - Espacio 2 no tiene ninguna asignación a las 14:00-15:00 los
--    martes/viernes de septiembre 2026 — confirma que no hay una segunda fila
--    en paralelo, es una sola actividad.
--  - "Ind Personas Mayores" no tiene convenios asociados, así que reasignar
--    estas 8 filas puntuales no rompe ninguna referencia.

do $$
declare
  v_espacio_id uuid;
  v_entidad_cesfam_id uuid;
  v_entidad_ipm_id uuid;
  v_filas_actualizadas int;
begin
  select id into v_espacio_id from rd_espacio where nombre = 'Piscina - Espacio 1';
  select id into v_entidad_cesfam_id from rd_entidad where nombre = 'Cesfam';
  select id into v_entidad_ipm_id from rd_entidad where nombre = 'Ind Personas Mayores';

  if v_espacio_id is null then
    raise exception 'No se encontró el espacio "Piscina - Espacio 1".';
  end if;
  if v_entidad_cesfam_id is null then
    raise exception 'No se encontró la entidad "Cesfam".';
  end if;
  if v_entidad_ipm_id is null then
    raise exception 'No se encontró la entidad "Ind Personas Mayores".';
  end if;

  update rd_asignacion
  set entidad_id = v_entidad_cesfam_id
  where espacio_id = v_espacio_id
    and entidad_id = v_entidad_ipm_id
    and hora_inicio = '14:00'
    and hora_fin = '15:00'
    and fecha between date '2026-09-01' and date '2026-09-30'
    and extract(isodow from fecha) in (2, 5);

  get diagnostics v_filas_actualizadas = row_count;
  raise notice 'Filas reasignadas de "Ind Personas Mayores" a "Cesfam" (martes/viernes 14:00-15:00): %', v_filas_actualizadas;

  if v_filas_actualizadas <> 8 then
    raise exception 'Se esperaban 8 filas actualizadas, se actualizaron % — revisar antes de continuar.', v_filas_actualizadas;
  end if;
end $$;
