-- Reconcilia la Piscina Municipal contra el documento maestro
-- "SALA DE USO MULTIPLE.doc" (11 tablas, una de ellas "PROGRAMAS O PROYECTOS
-- DEPORTIVOS PISCINA MUNICIPAL 2025"), extraído con código — Word vía automatización
-- COM (python-docx no puede abrir este archivo, es un .doc binario legacy, no .docx),
-- preservando cada celda de la tabla por separado (win32com, Cell.Range.Text por
-- celda), no transcrito a mano.
--
-- PUNTO 2 — Colación: el documento dice 13:00 A 14:00 exacto, todos los días
-- lunes-sábado (una sola hora, no 90 minutos). La migración 0015 la había backfilleado
-- como 12:30-14:00 por inferencia de un hueco en el CSV, sin el dato real — se corrige
-- acá con el horario confirmado.
--
-- PUNTO 1 y 3 — Talleres IND faltantes y horas con la piscina dividida: comparé,
-- celda por celda, las filas del documento maestro contra `rd_asignacion` real
-- (`Piscina - Espacio 1` tenía TODO cargado, `Piscina - Espacio 2` no tenía nada —
-- confirmado también en la ronda anterior). El documento confirma que las siguientes
-- horas están genuinamente divididas (dos actividades en la misma celda, sin indicar
-- cuál corresponde a qué mitad — no importa, según confirmó José):
--   lunes/martes/jueves 09:30-10:30, lunes/miércoles/viernes 16:00-17:00, 17:00-18:00,
--   18:00-19:00 y 19:00-20:00 — coincide exacto con lo que se pidió.
-- Todas esas horas estaban vacías en la base (ninguna de las dos actividades cargada,
-- ni en Espacio 1 ni en Espacio 2), así que no hay nada que reasignar: se cargan
-- ambas, una por espacio.
--
-- Entidades nuevas necesarias (no existían, verificado antes de crear): "Ind Del
-- Juego Al Deporte 1", "Ind Del Juego Al Deporte" (sin número — el documento usa ese
-- nombre genérico para la actividad que corre en paralelo, con dos profesores
-- distintos según la hora, Máximo Lara o Juan Chávez, pero rd_asignacion no tiene
-- campo de profesor así que ambas quedan bajo la misma entidad), "Ind Eleccion
-- Deportiva 1", "Ind Mujer En Movimiento" (sin "Zumba" — esa es una entidad
-- distinta, del Polideportivo), "Ind Intercultural", "Ind Personas Con
-- Discapacidad", "Taller Municipal Adultos 2".
--
-- NO se cargó (queda para que José confirme, no se adivinó): en martes y viernes
-- 14:00-15:00 el documento agrega la palabra "CESFAM" junto a "IND Personas
-- Mayores" — no queda claro si es una segunda actividad en paralelo (necesitaría
-- Espacio 2) o solo indica que el CESFAM deriva a los participantes de ese mismo
-- taller. No se creó ninguna entidad ni asignación para "CESFAM" en esta migración.
--
-- El resto de la tabla (Master Municipal, escuelas por día, Nado Libre, domingo
-- MANTENCIÓN completo) ya coincide exacto con lo cargado por 0007 — verificado
-- semana completa contra la base real, sin diferencias.

do $$
declare
  v_piscina uuid;
  v_esp1 uuid;
  v_esp2 uuid;
  v_actividad record;
  v_entidad_id uuid;
  v_espacio_id uuid;
  v_fecha date;
  v_dow int;
  v_creadas int := 0;
  v_saltadas int := 0;
  v_colacion_corregida int := 0;
  v_entidades_nuevas int := 0;
begin
  select id into v_piscina from rd_recinto where nombre = 'Piscina Municipal';
  select id into v_esp1 from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina - Espacio 1';
  select id into v_esp2 from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina - Espacio 2';
  if v_piscina is null or v_esp1 is null or v_esp2 is null then
    raise exception 'No se encontró "Piscina Municipal" o sus espacios 1/2.';
  end if;

  -- Corrige el horario de colación a 13:00-14:00 (dato real del documento maestro).
  update rd_bloqueo
  set hora_inicio = '13:00', hora_fin = '14:00'
  where espacio_id in (v_esp1, v_esp2)
    and motivo = 'mantencion'
    and descripcion ilike '%Colación del personal%';
  get diagnostics v_colacion_corregida = row_count;

  -- Entidades nuevas (solo si no existen).
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select v.nombre, 'programa_propio', false, true
  from (values
    ('Ind Del Juego Al Deporte 1'),
    ('Ind Del Juego Al Deporte'),
    ('Ind Eleccion Deportiva 1'),
    ('Ind Mujer En Movimiento'),
    ('Ind Intercultural'),
    ('Ind Personas Con Discapacidad'),
    ('Taller Municipal Adultos 2')
  ) as v(nombre)
  where not exists (select 1 from rd_entidad where nombre = v.nombre);
  get diagnostics v_entidades_nuevas = row_count;

  create temporary table tmp_piscina_faltantes (
    dow int, hora_inicio time, hora_fin time, entidad_nombre text, espacio_num int
  ) on commit drop;

  insert into tmp_piscina_faltantes (dow, hora_inicio, hora_fin, entidad_nombre, espacio_num) values
    -- Lunes
    (1, '09:30', '10:30', 'Ind Jovenes En Movimiento', 1),
    (1, '09:30', '10:30', 'Taller Municipal Adultos 2', 2),
    (1, '16:00', '17:00', 'Ind Del Juego Al Deporte 1', 1),
    (1, '16:00', '17:00', 'Ind Del Juego Al Deporte', 2),
    (1, '17:00', '18:00', 'Ind Eleccion Deportiva 1', 1),
    (1, '17:00', '18:00', 'Ind Del Juego Al Deporte', 2),
    (1, '18:00', '19:00', 'Ind Mujer En Movimiento', 1),
    (1, '18:00', '19:00', 'Ind Intercultural', 2),
    (1, '19:00', '20:00', 'Ind Mujer En Movimiento', 1),
    (1, '19:00', '20:00', 'Ind Personas Con Discapacidad', 2),
    -- Martes
    (2, '09:30', '10:30', 'Ind Jovenes En Movimiento', 1),
    (2, '09:30', '10:30', 'Taller Municipal Adultos 2', 2),
    -- Miércoles
    (3, '16:00', '17:00', 'Ind Del Juego Al Deporte 1', 1),
    (3, '16:00', '17:00', 'Ind Del Juego Al Deporte', 2),
    (3, '17:00', '18:00', 'Ind Eleccion Deportiva 1', 1),
    (3, '17:00', '18:00', 'Ind Del Juego Al Deporte', 2),
    (3, '18:00', '19:00', 'Ind Mujer En Movimiento', 1),
    (3, '18:00', '19:00', 'Ind Intercultural', 2),
    (3, '19:00', '20:00', 'Ind Mujer En Movimiento', 1),
    (3, '19:00', '20:00', 'Ind Personas Con Discapacidad', 2),
    -- Jueves
    (4, '09:30', '10:30', 'Ind Jovenes En Movimiento', 1),
    (4, '09:30', '10:30', 'Taller Municipal Adultos 2', 2),
    -- Viernes
    (5, '16:00', '17:00', 'Ind Del Juego Al Deporte 1', 1),
    (5, '16:00', '17:00', 'Ind Del Juego Al Deporte', 2),
    (5, '17:00', '18:00', 'Ind Eleccion Deportiva 1', 1),
    (5, '17:00', '18:00', 'Ind Del Juego Al Deporte', 2),
    (5, '18:00', '19:00', 'Ind Mujer En Movimiento', 1),
    (5, '18:00', '19:00', 'Ind Intercultural', 2),
    (5, '19:00', '20:00', 'Ind Mujer En Movimiento', 1),
    (5, '19:00', '20:00', 'Ind Personas Con Discapacidad', 2);

  v_fecha := date '2026-09-01';
  while v_fecha <= date '2026-09-30' loop
    if v_fecha not in (date '2026-09-18', date '2026-09-19') then
      v_dow := extract(isodow from v_fecha)::int;

      for v_actividad in select * from tmp_piscina_faltantes where dow = v_dow loop
        select id into v_entidad_id from rd_entidad where nombre = v_actividad.entidad_nombre;
        v_espacio_id := case v_actividad.espacio_num when 1 then v_esp1 else v_esp2 end;

        if exists (
          select 1 from rd_asignacion
          where espacio_id = v_espacio_id and entidad_id = v_entidad_id
            and fecha = v_fecha and hora_inicio = v_actividad.hora_inicio
        ) then
          continue;
        end if;

        begin
          insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
          values (v_espacio_id, v_entidad_id, v_fecha, v_actividad.hora_inicio, v_actividad.hora_fin, 'puntual',
            v_actividad.entidad_nombre, 'migracion 0019 (reconciliación Piscina vs documento maestro)');
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

  raise notice 'Piscina vs documento maestro: % bloqueo(s) de colación corregidos a 13:00-14:00, % entidad(es) nueva(s), % asignación(es) creada(s), % saltada(s) por conflicto.',
    v_colacion_corregida, v_entidades_nuevas, v_creadas, v_saltadas;
end $$;
