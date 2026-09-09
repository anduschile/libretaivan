-- Hallazgo antes de cargar nada: el horario semanal recurrente de la Cancha Luis
-- Gallito González YA estaba cargado por completo — la migración 0007 (carga piloto
-- de septiembre) incluía una sección "Cancha Luis Gallito Gonzalez" en su CSV que
-- nadie había cruzado contra este archivo hasta ahora. Procesé
-- Ivan/Informacion/GALLITO GONZALEZ.xlsx con código (Python + openpyxl, no a mano) —
-- el archivo dice "2021" en el título pero José confirmó que sigue vigente para 2026
-- (error de tipeo del documento original) — y las 19 franjas semanales con actividad
-- real que contiene (escuelas de fútbol, Carabineros, Armada, Municipalidad)
-- expandidas a septiembre 2026 dan exactamente 73 asignaciones, y las 73 YA existen en
-- la base, creadas por 0007, con las mismas fechas/horas/entidades. Verificado
-- calculando el total esperado por separado y comparándolo 1 a 1 contra
-- `select count(*) from rd_asignacion where espacio_id = <Cancha Luis Gallito
-- González>` antes de escribir el INSERT — coincide exacto. Por eso esta migración no
-- carga ninguna asignación nueva (el `WHERE NOT EXISTS` las salta todas,
-- correctamente) — queda igual por si en el futuro cambia el horario y hace falta
-- reconciliar diferencias puntuales.
--
-- Lo único que SÍ faltaba y esta migración sí agrega: el bloqueo recurrente de
-- "Colación" (lunes 13:00-14:00) — 0007 nunca cargó eso porque su CSV solo traía
-- filas de organización/horario, no la celda "COLACION" de esta planilla.
--
-- Se excluyeron, tal como se pidió, las 25 franjas semanales marcadas "LIBRE" (15) o
-- "ARRIENDO" (10) — septiembre 2026 no tiene arrendatario fijo definido para esos
-- horarios; falta esa información si se quiere completar después.
--
-- Nombres de entidad: se usó el nombre exacto de la planilla para encontrar la
-- entidad ya existente en la base (mismo criterio de toda la carga anterior). Para
-- "Orlando Torterolio" se usa el nombre ya corregido por la migración 0013
-- ("Torteroglio"). Cuando había ambigüedad entre una entidad "Club X" y una "Escuela
-- de Fútbol X" (ej. Colo Colo, Arturo Vidal, Gallito González), se usó la que calza
-- exacto con el texto de la planilla ("ESCUELA DE FUTBOL...", no "CLUB...") — son
-- organizaciones distintas en el catastro, y son las mismas que ya usó 0007.
--
-- Al igual que en 0004/0007/0012/0016: se excluyen 2026-09-18 y 2026-09-19 (feriados
-- irrenunciables) y se salta con RAISE NOTICE (sin abortar la migración) cualquier
-- franja que choque con algo ya confirmado, en vez de fallar toda la carga.

do $$
declare
  v_cancha uuid;
  v_actividad record;
  v_entidad_id uuid;
  v_fecha date;
  v_dow int;
  v_creadas int := 0;
  v_saltadas int := 0;
  v_sin_entidad int := 0;
  v_bloqueos_colacion int := 0;
begin
  select id into v_cancha from rd_espacio where nombre = 'Cancha' and recinto_id = (
    select id from rd_recinto where nombre = 'Cancha Luis Gallito González'
  );
  if v_cancha is null then
    raise exception 'No se encontró el espacio "Cancha" en el recinto "Cancha Luis Gallito González".';
  end if;

  create temporary table tmp_gallito_actividades (
    dow int, hora_inicio time, hora_fin time, entidad_nombre text
  ) on commit drop;

  insert into tmp_gallito_actividades (dow, hora_inicio, hora_fin, entidad_nombre) values
    (1, '14:00', '15:00', 'Carabineros de Chile'),
    (1, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez'),
    (1, '18:00', '19:00', 'Escuela De Futbol Carlos Rodriguez'),
    (2, '16:00', '17:00', 'Escuela De Futbol Gallito Gonzalez'),
    (2, '17:00', '18:00', 'Escuela De Futbol Filial Colo Colo'),
    (3, '15:00', '16:00', 'Armada de Chile'),
    (3, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez'),
    (3, '18:00', '19:00', 'Escuela De Futbol Carlos Rodriguez'),
    (4, '17:00', '18:00', 'Escuela De Futbol Filial Colo Colo'),
    (4, '18:00', '19:00', 'Escuela De Futbol Filial Colo Colo'),
    (4, '20:00', '21:00', 'Municipalidad'),
    (5, '14:00', '15:00', 'Escuela De Futbol Orlando Torteroglio'),
    (5, '15:00', '16:00', 'Escuela De Futbol Orlando Torteroglio'),
    (5, '16:00', '17:00', 'Escuela De Futbol Gallito Gonzalez'),
    (5, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez'),
    (5, '18:00', '19:00', 'Escuela Arturo Vidal'),
    (6, '10:00', '11:00', 'Escuela De Futbol Orlando Torteroglio'),
    (6, '11:00', '12:00', 'Escuela De Futbol Orlando Torteroglio'),
    (6, '12:00', '13:00', 'Escuela De Futbol Orlando Torteroglio');

  v_fecha := date '2026-09-01';
  while v_fecha <= date '2026-09-30' loop
    if v_fecha not in (date '2026-09-18', date '2026-09-19') then
      v_dow := extract(isodow from v_fecha)::int;

      -- Bloqueo recurrente de colación, lunes 13:00-14:00.
      if v_dow = 1 then
        if not exists (select 1 from rd_bloqueo where espacio_id = v_cancha and fecha_desde = v_fecha and motivo = 'mantencion' and descripcion ilike '%Colación%') then
          insert into rd_bloqueo (espacio_id, fecha_desde, fecha_hasta, hora_inicio, hora_fin, motivo, descripcion, creado_por)
          values (v_cancha, v_fecha, v_fecha, '13:00', '14:00', 'mantencion',
            'Colación, recurrente semanal (lunes 13:00-14:00, según GALLITO_GONZALEZ.xlsx).',
            'migracion 0017 (horario Cancha Luis Gallito González)');
          v_bloqueos_colacion := v_bloqueos_colacion + 1;
        end if;
      end if;

      for v_actividad in select * from tmp_gallito_actividades where dow = v_dow loop
        select id into v_entidad_id from rd_entidad where nombre = v_actividad.entidad_nombre;
        if v_entidad_id is null then
          v_sin_entidad := v_sin_entidad + 1;
          raise notice 'Entidad no encontrada: % (fecha %)', v_actividad.entidad_nombre, v_fecha;
          continue;
        end if;

        if exists (
          select 1 from rd_asignacion
          where espacio_id = v_cancha and entidad_id = v_entidad_id
            and fecha = v_fecha and hora_inicio = v_actividad.hora_inicio
        ) then
          continue;
        end if;

        begin
          insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
          values (v_cancha, v_entidad_id, v_fecha, v_actividad.hora_inicio, v_actividad.hora_fin, 'puntual',
            v_actividad.entidad_nombre, 'migracion 0017 (horario Cancha Luis Gallito González)');
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

  raise notice 'Cancha Luis Gallito González: % asignación(es) creada(s), % saltada(s) por conflicto, % sin entidad encontrada, % bloqueo(s) de colación creados.',
    v_creadas, v_saltadas, v_sin_entidad, v_bloqueos_colacion;
end $$;
