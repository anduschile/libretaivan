-- Corrige un artefacto de carga heredado de 0007: el CSV piloto asignaba casi todo a
-- "Piscina - Espacio 1" por cómo venía estructurado el campo `espacio_sugerido` (apuntaba
-- a "Espacio 1" por defecto), no porque la actividad realmente usara solo esa mitad. En
-- la práctica la Piscina Municipal opera dividida SOLO en las franjas ya verificadas
-- contra el documento maestro en 0019 y 0022:
--   - lunes, martes y jueves 09:30-10:30
--   - lunes, miércoles y viernes 16:00-17:00, 17:00-18:00, 18:00-19:00, 19:00-20:00
-- Fuera de esas franjas exactas la piscina opera como un solo espacio, así que toda
-- asignación fuera de ellas se reclasifica a "Piscina Municipal (completa)" (creada en
-- 0014 junto con el conflicto de espejo contra Espacio 1 y Espacio 2).
--
-- Verificado contra la base real antes de escribir esto:
--   - 221 asignaciones en "Piscina - Espacio 1" caen FUERA de las franjas divididas
--     (17 entidades distintas — Nado Libre 69, Master Municipal 17, escuelas, talleres,
--     Cesfam, etc.). Ninguna se mueve por conflicto de horario: cada una ya era la única
--     ocupante de su fecha+hora dentro de Espacio 1 (la exclusion constraint de
--     rd_asignacion ya lo garantizaba), y "Piscina Municipal (completa)" tenía 0
--     asignaciones antes de esta migración, así que reasignar el espacio_id no puede
--     chocar contra nada existente ahí.
--   - "Piscina - Espacio 2" tiene 0 asignaciones fuera de las franjas divididas — todas
--     sus 61 filas están dentro de ellas (carga de 0019). No hay nada que mover desde ahí,
--     pero se deja la misma condición aplicada por si en el futuro se cargara algo mal.
--   - Las 61 + 61 asignaciones DENTRO de las franjas divididas (Espacio 1 y Espacio 2) no
--     se tocan — ya están correctamente repartidas (verificado en la ronda anterior, 0019).
--   - Total de horas de la Piscina (221 + 61 + 61 = 343) es el mismo antes y después: esto
--     es una reclasificación de espacio_id, no una creación ni eliminación de filas. El
--     panel de Estadísticas agrupa por recinto_id (rd_espacio.recinto_id), no por
--     espacio_id (ver src/lib/estadisticas.ts + queries.ts), así que el total de horas de
--     "Piscina Municipal" en ese panel no cambia con esta migración.
--
-- Bloqueos de mantención (colación 13:00-14:00 y mantención dominical, cargados por
-- separado en Espacio 1 y Espacio 2) — NO se tocan en esta migración. Se evaluó moverlos
-- a "Piscina Municipal (completa)" como fuente única (con el espejo reflejándolos hacia
-- Espacio 1/2), pero rd_check_espacio_conflicto() (0001) — el único trigger de espejo que
-- existe — solo dispara sobre rd_asignacion (`before insert or update on rd_asignacion`);
-- no contempla rd_bloqueo en absoluto. Mover los bloqueos a "completa" sin que exista ese
-- reflejo dejaría Espacio 1 y Espacio 2 sin la mantención marcada — peor que el estado
-- actual. Queda pendiente que se extienda el trigger (o se duplique el bloqueo a mano) si
-- se quiere esa fuente única más adelante.

do $$
declare
  v_piscina uuid;
  v_esp1 uuid;
  v_esp2 uuid;
  v_completa uuid;
  v_movidas_esp1 int;
  v_movidas_esp2 int;
begin
  select id into v_piscina from rd_recinto where nombre = 'Piscina Municipal';
  if v_piscina is null then
    raise exception 'No se encontró el recinto "Piscina Municipal".';
  end if;

  select id into v_esp1 from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina - Espacio 1';
  select id into v_esp2 from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina - Espacio 2';
  select id into v_completa from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina Municipal (completa)';
  if v_esp1 is null or v_esp2 is null or v_completa is null then
    raise exception 'Falta algún espacio de "Piscina Municipal" (Espacio 1/2/completa) — revisar 0010/0014.';
  end if;

  update rd_asignacion
  set espacio_id = v_completa
  where espacio_id = v_esp1
    and not (
      (extract(isodow from fecha)::int in (1, 2, 4) and hora_inicio = time '09:30' and hora_fin = time '10:30')
      or (
        extract(isodow from fecha)::int in (1, 3, 5)
        and hora_inicio in (time '16:00', time '17:00', time '18:00', time '19:00')
        and hora_fin = hora_inicio + interval '1 hour'
      )
    );
  get diagnostics v_movidas_esp1 = row_count;

  update rd_asignacion
  set espacio_id = v_completa
  where espacio_id = v_esp2
    and not (
      (extract(isodow from fecha)::int in (1, 2, 4) and hora_inicio = time '09:30' and hora_fin = time '10:30')
      or (
        extract(isodow from fecha)::int in (1, 3, 5)
        and hora_inicio in (time '16:00', time '17:00', time '18:00', time '19:00')
        and hora_fin = hora_inicio + interval '1 hour'
      )
    );
  get diagnostics v_movidas_esp2 = row_count;

  raise notice 'Piscina: % asignación(es) reclasificadas de Espacio 1 y % de Espacio 2 a "Piscina Municipal (completa)".',
    v_movidas_esp1, v_movidas_esp2;

  if v_movidas_esp1 <> 221 or v_movidas_esp2 <> 0 then
    raise exception 'Se esperaban 221 filas movidas desde Espacio 1 y 0 desde Espacio 2, se movieron % y % — revisar antes de continuar.',
      v_movidas_esp1, v_movidas_esp2;
  end if;
end $$;
