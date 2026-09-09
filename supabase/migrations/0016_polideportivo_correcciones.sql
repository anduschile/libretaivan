-- Correcciones y catastro del Polideportivo pedidas en esta ronda.
--
-- PUNTO 1 ("Villas Muñoz" -> "Elías Muñoz"): buscado en rd_entidad.nombre,
-- rd_entidad.representante, rd_asignacion.actividad y rd_convenio.observaciones —
-- CERO coincidencias con "Villas" en toda la base. El CSV original de septiembre
-- tampoco lo menciona; el único monitor de vóleibol que aparece ahí es "Elias Muñoz"
-- (Sala de Uso Múltiple, Gimnasio José Miguel Carrera y Polideportivo viernes 21-22,
-- ya cargado correctamente). Además, ni rd_asignacion ni rd_convenio tienen una
-- columna para nombre de monitor/profesor — ese dato nunca se persiste, solo viaja en
-- el CSV como texto de referencia. No hay nada que corregir con estos datos: no
-- ejecuto ningún UPDATE para este punto. Si "Villas Muñoz" aparece en otro documento o
-- sistema que yo no tengo, dime dónde para revisarlo puntualmente.
--
-- PUNTO 2 (franja del lunes): buscado en la base real y en el CSV de septiembre — NO
-- existe ninguna asignación de vóleibol en el Polideportivo los días lunes en toda la
-- carga actual (la última asignación de un lunes en ese recinto termina a las 19:00,
-- básquetbol). Tampoco aparece en el CSV original. No hay ninguna "entrada anterior"
-- que reemplazar: esto se carga como dato nuevo, no como corrección. Uso las
-- entidades ya existentes "Club de Voleibol Natales" y "Club Bories Voleibol"
-- (mismo criterio de deduplicación de la carga original) y distingo la categoría en el
-- campo `actividad`, ya que no existe un campo para nombre de monitor. Asumo lunes
-- 21:00-22:00 Club de Voleibol Natales (mujeres adultas) en Transversal 1 y Club
-- Bories Voleibol (adulto) en Transversal 2 — el pedido no especificó qué mitad física
-- le corresponde a cada equipo; ajustar si es al revés.
--
-- PUNTO 5 (miércoles 20:00-21:00 sala musculación/máquinas): NO se carga, tal como se
-- pidió explícitamente — sigue pendiente que José confirme si son el mismo espacio.

do $$
declare
  v_polideportivo uuid;
  v_transversal1 uuid;
  v_transversal2 uuid;
  v_voleibol_natales uuid;
  v_voleibol_bories uuid;
  v_fecha date;
  v_creadas int := 0;
begin
  select id into v_polideportivo from rd_recinto where nombre = 'Polideportivo';
  select id into v_transversal1 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Transversal 1';
  select id into v_transversal2 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Transversal 2';
  select id into v_voleibol_natales from rd_entidad where nombre = 'Club de Voleibol Natales';
  select id into v_voleibol_bories from rd_entidad where nombre = 'Club Bories Voleibol';

  if v_polideportivo is null or v_transversal1 is null or v_transversal2 is null then
    raise exception 'No se encontraron el Polideportivo o sus transversales.';
  end if;
  if v_voleibol_natales is null or v_voleibol_bories is null then
    raise exception 'No se encontraron las entidades "Club de Voleibol Natales" / "Club Bories Voleibol".';
  end if;

  v_fecha := date '2026-09-01';
  while v_fecha <= date '2026-09-30' loop
    if extract(isodow from v_fecha)::int = 1 and v_fecha not in (date '2026-09-18', date '2026-09-19') then
      if not exists (
        select 1 from rd_asignacion
        where espacio_id = v_transversal1 and entidad_id = v_voleibol_natales
          and fecha = v_fecha and hora_inicio = '21:00'
      ) then
        insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
        values (v_transversal1, v_voleibol_natales, v_fecha, '21:00', '22:00', 'puntual',
          'Club de Voleibol Natales - Mujeres Adultas', 'migracion 0016 (correcciones Polideportivo)');
        v_creadas := v_creadas + 1;
      end if;

      if not exists (
        select 1 from rd_asignacion
        where espacio_id = v_transversal2 and entidad_id = v_voleibol_bories
          and fecha = v_fecha and hora_inicio = '21:00'
      ) then
        insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
        values (v_transversal2, v_voleibol_bories, v_fecha, '21:00', '22:00', 'puntual',
          'Club Bories Voleibol - Adulto', 'migracion 0016 (correcciones Polideportivo)');
        v_creadas := v_creadas + 1;
      end if;
    end if;
    v_fecha := v_fecha + interval '1 day';
  end loop;

  raise notice 'Franja lunes 21:00-22:00 vóleibol: % asignación(es) nueva(s) creada(s).', v_creadas;

  -- Nuevos espacios de catastro (puntos 3 y 4).
  if not exists (select 1 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Pasillo de camarines') then
    insert into rd_espacio (recinto_id, nombre, tipo) values (v_polideportivo, 'Pasillo de camarines', 'pasillo');
  end if;

  if not exists (select 1 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Espacio graderías (Judo)') then
    insert into rd_espacio (recinto_id, nombre, tipo) values (v_polideportivo, 'Espacio graderías (Judo)', 'otro');
  end if;
end $$;
