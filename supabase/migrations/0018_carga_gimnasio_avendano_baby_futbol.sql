-- Carga el horario recurrente de baby fútbol/futbolito en "Gimnasio - Escuela Baudilia
-- Avendaño de Youssuff", confirmado por José a partir de la foto de un calendario
-- impreso (semana del 17 al 23 de mayo de 2026, tratada como patrón semanal
-- recurrente por día de semana, no como fechas fijas de mayo) y expandido a
-- septiembre 2026 excluyendo 18 y 19 (feriados irrenunciables).
--
-- Importante — hallazgo antes de insertar: el espacio "Gimnasio" de este recinto ya
-- tenía, desde la migración 0003/0004, placeholders "Taller por confirmar — Avendaño"
-- ocupando TODO el bloque de sábado (10:00-18:00) y domingo (10:00-19:00) como
-- asignaciones confirmadas — la actividad real que se carga acá se solapa
-- directamente con esos placeholders, así que hay que cancelarlos primero o la
-- restricción de exclusión rechazaría cada inserción nueva. Se cancelan solo los de
-- septiembre 2026 (los de octubre en adelante quedan fuera de alcance de esta ronda,
-- pendientes de una decisión sobre el convenio de fin de semana en general).
--
-- Mapeo de entidad: varias de las que pide el prompt (Torteroglio, Gallito González,
-- Colo-Colo, Arturo Vidal) ya existen dos veces en el catastro — una versión "Club X"
-- (sin uso hasta ahora) y una "Escuela De Futbol X" (la que ya usa la categoría adulta
-- en Cancha Luis Gallito González, migración 0017). Como el pedido dice
-- explícitamente que las categorías infantiles de Avendaño son "distintas y
-- separadas" de las adultas de Gallito González, se usa la versión "Club X" para
-- Avendaño (así quedan bajo entidades distintas y no se mezcla categoría infantil con
-- adulta bajo el mismo registro) — esto además resuelve la sospecha que dejó anotada
-- la migración 0006 sobre si "Club Torteroglio" y la escuela eran duplicados: no lo
-- son, son el mismo club con dos categorías separadas.
--
-- "Club Minero" (domingo 19-20, viernes 18-19, sábado 12-13): NO se carga. Existen dos
-- clubes similares pero ninguno calza exacto ("Club Centro de Mineros", "Club
-- Deportivo Mineros") y no hay forma de saber cuál es sin adivinar — queda pendiente
-- que José confirme cuál de los dos es (o si es un tercero que falta crear).
--
-- "Rodríguez" (miércoles, sábado): sin "Club" ni "Escuela" en la foto — el único
-- candidato real en el catastro es "Escuela De Futbol Carlos Rodriguez" (ya usado en
-- 0017), se usa ese por ser la única coincidencia razonable.
--
-- Los bloques de más de una hora (ej. domingo Torteroglio 10:00-16:00) se cargan como
-- filas separadas de una hora cada una, mismo criterio que el resto de la carga — la
-- UI ya las fusiona visualmente en un solo bloque cuando son consecutivas.

do $$
declare
  v_espacio uuid;
  v_actividad record;
  v_entidad_id uuid;
  v_fecha date;
  v_dow int;
  v_creadas int := 0;
  v_saltadas int := 0;
  v_sin_entidad int := 0;
  v_placeholders_cancelados int := 0;
begin
  select id into v_espacio from rd_espacio where recinto_id = (
    select id from rd_recinto where nombre = 'Gimnasio - Escuela Baudilia Avendaño de Youssuff'
  ) and nombre = 'Gimnasio';
  if v_espacio is null then
    raise exception 'No se encontró el espacio "Gimnasio" en "Gimnasio - Escuela Baudilia Avendaño de Youssuff".';
  end if;

  -- Cancela los placeholders de fin de semana de septiembre 2026 que chocarían con la
  -- actividad real. No se tocan los de octubre en adelante (fuera de alcance).
  update rd_asignacion
  set estado = 'cancelada',
      observaciones = trim(both ' | ' from coalesce(observaciones || ' | ', '') || 'Cancelada — reemplazada por el horario real de baby fútbol confirmado por José (migración 0018).')
  where espacio_id = v_espacio
    and estado = 'confirmada'
    and fecha between '2026-09-01' and '2026-09-30'
    and exists (select 1 from rd_entidad en where en.id = rd_asignacion.entidad_id and en.nombre = 'Taller por confirmar — Avendaño');
  get diagnostics v_placeholders_cancelados = row_count;

  create temporary table tmp_avendano_actividades (
    dow int, hora_inicio time, hora_fin time, entidad_nombre text
  ) on commit drop;

  insert into tmp_avendano_actividades (dow, hora_inicio, hora_fin, entidad_nombre) values
    -- Domingo
    (7, '10:00', '11:00', 'Club Torteroglio'),
    (7, '11:00', '12:00', 'Club Torteroglio'),
    (7, '12:00', '13:00', 'Club Torteroglio'),
    (7, '13:00', '14:00', 'Club Torteroglio'),
    (7, '14:00', '15:00', 'Club Torteroglio'),
    (7, '15:00', '16:00', 'Club Torteroglio'),
    (7, '16:00', '17:00', 'Club Luis Gallito González'),
    (7, '17:00', '18:00', 'Club Colo Colo'),
    (7, '18:00', '19:00', 'Club Colo Colo'),
    -- Lunes
    (1, '19:00', '20:00', 'Escuela Pumas'),
    (1, '20:00', '21:00', 'Club Unión'),
    (1, '21:00', '22:00', 'Club Unión'),
    -- Martes
    (2, '19:00', '20:00', 'Escuela Pumas'),
    (2, '20:00', '21:00', 'Club Manuel Cuyul'),
    (2, '21:00', '22:00', 'Club Arturo Vidal'),
    -- Miércoles
    (3, '19:00', '20:00', 'Club Manuel Cuyul'),
    (3, '20:00', '21:00', 'Escuela De Futbol Carlos Rodriguez'),
    (3, '21:00', '22:00', 'Club Luis Gallito González'),
    -- Jueves
    (4, '19:00', '20:00', 'Club Manuel Cuyul'),
    (4, '20:00', '21:00', 'Club Arturo Vidal'),
    (4, '21:00', '22:00', 'Club De Tenis'),
    (4, '22:00', '23:00', 'Club De Tenis'),
    -- Viernes
    (5, '19:00', '20:00', 'Club Luis Gallito González'),
    (5, '20:00', '21:00', 'Club Colo Colo'),
    (5, '21:00', '22:00', 'Club Colo Colo'),
    -- Sábado
    (6, '11:00', '12:00', 'Escuela De Futbol Carlos Rodriguez'),
    (6, '13:00', '14:00', 'Club Colo Colo'),
    (6, '14:00', '15:00', 'Club Unión'),
    (6, '15:00', '16:00', 'Club Arturo Vidal'),
    (6, '16:00', '17:00', 'Club Arturo Vidal'),
    (6, '17:00', '18:00', 'Club Luis Gallito González'),
    (6, '18:00', '19:00', 'Escuela De Futbol Carlos Rodriguez'),
    (6, '19:00', '20:00', 'Escuela De Futbol Carlos Rodriguez'),
    (6, '20:00', '21:00', 'Club De Tenis'),
    (6, '21:00', '22:00', 'Club De Tenis');

  v_fecha := date '2026-09-01';
  while v_fecha <= date '2026-09-30' loop
    if v_fecha not in (date '2026-09-18', date '2026-09-19') then
      v_dow := extract(isodow from v_fecha)::int;

      for v_actividad in select * from tmp_avendano_actividades where dow = v_dow loop
        select id into v_entidad_id from rd_entidad where nombre = v_actividad.entidad_nombre;
        if v_entidad_id is null then
          v_sin_entidad := v_sin_entidad + 1;
          raise notice 'Entidad no encontrada: % (fecha %)', v_actividad.entidad_nombre, v_fecha;
          continue;
        end if;

        if exists (
          select 1 from rd_asignacion
          where espacio_id = v_espacio and entidad_id = v_entidad_id
            and fecha = v_fecha and hora_inicio = v_actividad.hora_inicio
        ) then
          continue;
        end if;

        begin
          insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
          values (v_espacio, v_entidad_id, v_fecha, v_actividad.hora_inicio, v_actividad.hora_fin, 'puntual',
            v_actividad.entidad_nombre, 'migracion 0018 (baby fútbol Gimnasio Avendaño)');
          v_creadas := v_creadas + 1;
        exception when exclusion_violation then
          v_saltadas := v_saltadas + 1;
          raise notice 'Asignación saltada por conflicto — %, fecha %, %-%',
            v_actividad.entidad_nombre, v_fecha, v_actividad.hora_inicio, v_actividad.hora_fin;
        end;
      end loop;
    end if;
    v_fecha := v_fecha + interval '1 day';
  end loop;

  raise notice 'Gimnasio Avendaño baby fútbol: % placeholder(s) cancelado(s), % asignación(es) creada(s), % saltada(s) por conflicto, % sin entidad encontrada.',
    v_placeholders_cancelados, v_creadas, v_saltadas, v_sin_entidad;
end $$;
