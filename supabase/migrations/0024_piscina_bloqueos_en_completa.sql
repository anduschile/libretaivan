-- Refleja en "Piscina Municipal (completa)" los bloqueos de mantención que hoy solo
-- existen en "Piscina - Espacio 1" y "Piscina - Espacio 2" (colación del personal
-- 13:00-14:00 y la mantención dominical de "Cloración de agua"). Confirmado en la
-- ronda anterior: rd_check_espacio_conflicto() (0001) — el único trigger de espejo
-- que existe — solo dispara sobre rd_asignacion, nunca sobre rd_bloqueo, así que
-- "completa" quedó sin la mantención marcada aunque ya sea la vista por defecto
-- (0023). Esta migración agrega filas NUEVAS en rd_bloqueo apuntando a "completa";
-- las filas ya existentes en Espacio 1 y Espacio 2 no se tocan ni se mueven — se
-- quedan como están, para que sigan bloqueadas si en algún momento se usan por
-- separado.
--
-- Verificado contra la base real antes de escribir esto:
--   - Espacio 1 y Espacio 2 tienen, cada uno, exactamente 28 bloqueos de motivo
--     'mantencion': 24 de "Colación del personal" (13:00-14:00, lunes a sábado) y 4
--     de "Cloración de agua" (los 4 domingos de septiembre, sin horario — bloqueo de
--     día completo). 48 + 8 = 56 en total entre los dos espacios — coincide exacto
--     con lo reportado en la ronda anterior.
--   - Los 28 bloqueos de Espacio 1 y los 28 de Espacio 2 son un set IDÉNTICO fila a
--     fila (misma fecha_desde/fecha_hasta, hora_inicio/hora_fin, motivo y
--     descripción) — comparación por EXCEPT en ambas direcciones da 0 diferencias.
--     Son el mismo evento real de mantención cargado dos veces por el modelo de
--     espacio dividido (0007), no dos eventos distintos.
--   - Por eso "completa" recibe UN set de 28 filas (no 56): duplicar también el
--     duplicado existente crearía dos bloqueos superpuestos para la misma fecha+hora
--     dentro del mismo espacio_id, que no representa nada real y no tiene paralelo
--     en cómo se modela cualquier otro dato acá. Se copian desde Espacio 1
--     (arbitrario — Espacio 2 es idéntico, verificado arriba).
--   - "Piscina Municipal (completa)" tenía 0 bloqueos antes de esta migración.

do $$
declare
  v_piscina uuid;
  v_esp1 uuid;
  v_completa uuid;
  v_insertados int;
begin
  select id into v_piscina from rd_recinto where nombre = 'Piscina Municipal';
  if v_piscina is null then
    raise exception 'No se encontró el recinto "Piscina Municipal".';
  end if;

  select id into v_esp1 from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina - Espacio 1';
  select id into v_completa from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina Municipal (completa)';
  if v_esp1 is null or v_completa is null then
    raise exception 'Falta "Piscina - Espacio 1" o "Piscina Municipal (completa)" — revisar 0010/0014.';
  end if;

  if exists (select 1 from rd_bloqueo where espacio_id = v_completa) then
    raise exception '"Piscina Municipal (completa)" ya tiene bloqueos cargados — revisar a mano antes de volver a correr esta migración (no debería re-ejecutarse dos veces).';
  end if;

  insert into rd_bloqueo (espacio_id, fecha_desde, fecha_hasta, hora_inicio, hora_fin, motivo, descripcion, creado_por)
  select
    v_completa,
    b.fecha_desde,
    b.fecha_hasta,
    b.hora_inicio,
    b.hora_fin,
    b.motivo,
    b.descripcion,
    'migracion 0024 (reflejo en Piscina Municipal (completa) de los bloqueos ya cargados en Espacio 1/2 — el trigger de espejo no contempla rd_bloqueo)'
  from rd_bloqueo b
  where b.espacio_id = v_esp1;
  get diagnostics v_insertados = row_count;

  raise notice 'Piscina Municipal (completa): % bloqueo(s) de mantención copiados desde Espacio 1.', v_insertados;

  if v_insertados <> 28 then
    raise exception 'Se esperaban 28 bloqueos copiados, se copiaron % — revisar antes de continuar.', v_insertados;
  end if;
end $$;
