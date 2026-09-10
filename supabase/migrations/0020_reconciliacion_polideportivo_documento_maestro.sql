-- Reconcilia el Polideportivo contra el documento maestro (misma fuente y método que
-- 0019 — Word vía COM, celda por celda, no a mano).
--
-- PUNTO 1 (confirmar 0016): la fila de lunes 21:00-22:00 que cargó la migración 0016
-- ("Club de Voleibol Natales mujeres adultas" en Transversal 1 + "Club Bories
-- Voleibol" en Transversal 2) coincide exacto con el documento maestro ("CLUB DE
-- VOLEIBOL NATALES MUJERES ADULTAS PROFESOR ELIAS MUÑOZ" + "VOLEIBOL ADULTOS CLUB
-- BORIES MONITOR MAURICIO PEREZ", misma hora) — no se toca, ya está correcta.
--
-- PUNTO 2 — filas resueltas por nombre de espacio: se separaron por los delimitadores
-- de espacio pedidos (COSTADO DE CANCHA/JUDO, SALA DE MUSCULACION, SALA DE MAQUINAS,
-- ARQUERIA/PASILLO CAMARINES) en TODA la tabla del Polideportivo, no solo ejemplos
-- puntuales. Verificado contra la base real antes de insertar: "Pasillo de
-- camarines", "Espacio graderías (Judo)" y "Sala de musculación" estaban casi
-- vacíos — el catastro existía desde 0016 pero casi nada se había cargado ahí.
--
-- Hallazgo adicional (no pedido explícitamente, encontrado al verificar): 4 filas de
-- "Club Bories Voleibol" jueves 21:00-22:00 quedaron mal cargadas en "Sala de
-- musculación" desde 0007 — el documento muestra que a esa hora el vóleibol de
-- Bories va en la cancha (igual que todos los demás días a esa hora) y que "SALA DE
-- MAQUINAS SELECCIÓN ANFA" es una entrada aparte, sin relación con el vóleibol. Se
-- corrige moviendo esas 4 filas a Cancha Principal y cargando "Selección ANFA" como
-- entrada nueva en el espacio "Sala de Máquinas".
--
-- PUNTO 4 — espacios nuevos: "Espacio graderías (Judo)" (nombre provisional de 0016)
-- se renombra a "Costado de Cancha" (nombre real del documento) — verificado que
-- tenía 0 asignaciones, es un simple renombre, no hace falta reasignar nada. Se crea
-- "Sala de Máquinas", confirmado distinto de "Sala de musculación" (el documento
-- los nombra por separado y los usa en horas distintas) — esto también resuelve la
-- duda que había quedado pendiente en la ronda anterior sobre si eran el mismo
-- espacio: no lo son.
--
-- PUNTO 3 — filas que quedan genuinamente ambiguas (NO resueltas, ver informe para
-- el texto completo y la lista extendida de casos con el mismo patrón que se
-- encontraron además de los 3 mencionados explícitamente en el pedido).
--
-- PUNTO 5 — Cancha Uno/Cancha Dos vs Transversal 1/Transversal 2: coinciden en
-- función (misma cancha dividida en dos mitades), pero el nombre visible no se
-- cambia en esta migración — es una decisión de UX pendiente de confirmar con José,
-- no bloqueante, según se pidió.

do $$
declare
  v_polideportivo uuid;
  v_costado_cancha uuid;
  v_sala_musculacion uuid;
  v_sala_maquinas uuid;
  v_pasillo_camarines uuid;
  v_cancha_principal uuid;
  v_judo_id uuid;
  v_anfa_id uuid;
  v_ind_jovenes_id uuid;
  v_arqueria_id uuid;
  v_bories_voleibol_id uuid;
  v_actividad record;
  v_entidad_id uuid;
  v_fecha date;
  v_dow int;
  v_creadas int := 0;
  v_saltadas int := 0;
  v_movidas int := 0;
begin
  select id into v_polideportivo from rd_recinto where nombre = 'Polideportivo';
  select id into v_costado_cancha from rd_espacio where recinto_id = v_polideportivo and nombre = 'Espacio graderías (Judo)';
  select id into v_sala_musculacion from rd_espacio where recinto_id = v_polideportivo and nombre = 'Sala de musculación';
  select id into v_pasillo_camarines from rd_espacio where recinto_id = v_polideportivo and nombre = 'Pasillo de camarines';
  select id into v_cancha_principal from rd_espacio where recinto_id = v_polideportivo and nombre = 'Cancha Principal';
  if v_polideportivo is null or v_costado_cancha is null or v_sala_musculacion is null or v_pasillo_camarines is null or v_cancha_principal is null then
    raise exception 'No se encontraron todos los espacios esperados del Polideportivo — revisar catastro (¿0016 ya se aplicó?).';
  end if;

  -- Renombra el espacio provisional al nombre real del documento.
  update rd_espacio set nombre = 'Costado de Cancha' where id = v_costado_cancha;

  -- Crea "Sala de Máquinas", distinto de "Sala de musculación".
  if not exists (select 1 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Sala de Máquinas') then
    insert into rd_espacio (recinto_id, nombre, tipo) values (v_polideportivo, 'Sala de Máquinas', 'sala')
    returning id into v_sala_maquinas;
  else
    select id into v_sala_maquinas from rd_espacio where recinto_id = v_polideportivo and nombre = 'Sala de Máquinas';
  end if;

  -- Entidades nuevas.
  if not exists (select 1 from rd_entidad where nombre = 'Judo (Monitor Ruger Díaz)') then
    insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa) values ('Judo (Monitor Ruger Díaz)', 'taller', false, true);
  end if;
  if not exists (select 1 from rd_entidad where nombre = 'Selección ANFA') then
    insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa) values ('Selección ANFA', 'club_deportivo', false, true);
  end if;

  select id into v_judo_id from rd_entidad where nombre = 'Judo (Monitor Ruger Díaz)';
  select id into v_anfa_id from rd_entidad where nombre = 'Selección ANFA';
  select id into v_ind_jovenes_id from rd_entidad where nombre = 'Ind Jovenes En Movimiento';
  select id into v_arqueria_id from rd_entidad where nombre = 'Arqueria';
  select id into v_bories_voleibol_id from rd_entidad where nombre = 'Club Bories Voleibol';
  if v_judo_id is null or v_anfa_id is null or v_ind_jovenes_id is null or v_arqueria_id is null or v_bories_voleibol_id is null then
    raise exception 'Falta alguna entidad requerida (Judo/Selección ANFA/Ind Jovenes En Movimiento/Arqueria/Club Bories Voleibol).';
  end if;

  -- Corrige las 4 filas de "Club Bories Voleibol" jueves 21:00-22:00 mal cargadas en
  -- Sala de musculación desde 0007 — el documento las ubica en la cancha, igual que
  -- el resto de la semana a esa hora.
  update rd_asignacion
  set espacio_id = v_cancha_principal
  where espacio_id = v_sala_musculacion
    and entidad_id = v_bories_voleibol_id
    and hora_inicio = '21:00' and hora_fin = '22:00'
    and extract(isodow from fecha) = 4;
  get diagnostics v_movidas = row_count;

  create temporary table tmp_poli_faltantes (
    dow int, hora_inicio time, hora_fin time, entidad_id uuid, espacio_id uuid
  ) on commit drop;

  insert into tmp_poli_faltantes (dow, hora_inicio, hora_fin, entidad_id, espacio_id) values
    -- Costado de Cancha: Judo, martes y jueves 18-19, 19-20, 20-21.
    (2, '18:00', '19:00', v_judo_id, v_costado_cancha),
    (2, '19:00', '20:00', v_judo_id, v_costado_cancha),
    (2, '20:00', '21:00', v_judo_id, v_costado_cancha),
    (4, '18:00', '19:00', v_judo_id, v_costado_cancha),
    (4, '19:00', '20:00', v_judo_id, v_costado_cancha),
    (4, '20:00', '21:00', v_judo_id, v_costado_cancha),
    -- Pasillo de camarines: Arquería, lunes 18-19, 19-20, 20-21.
    (1, '18:00', '19:00', v_arqueria_id, v_pasillo_camarines),
    (1, '19:00', '20:00', v_arqueria_id, v_pasillo_camarines),
    (1, '20:00', '21:00', v_arqueria_id, v_pasillo_camarines),
    -- Sala de musculación: IND Jóvenes en Movimiento, lunes/miércoles/viernes 20-21.
    (1, '20:00', '21:00', v_ind_jovenes_id, v_sala_musculacion),
    (3, '20:00', '21:00', v_ind_jovenes_id, v_sala_musculacion),
    (5, '20:00', '21:00', v_ind_jovenes_id, v_sala_musculacion),
    -- Sala de Máquinas: Selección ANFA, miércoles 21-22, jueves 20-21 y 21-22.
    (3, '21:00', '22:00', v_anfa_id, v_sala_maquinas),
    (4, '20:00', '21:00', v_anfa_id, v_sala_maquinas),
    (4, '21:00', '22:00', v_anfa_id, v_sala_maquinas);

  v_fecha := date '2026-09-01';
  while v_fecha <= date '2026-09-30' loop
    if v_fecha not in (date '2026-09-18', date '2026-09-19') then
      v_dow := extract(isodow from v_fecha)::int;

      for v_actividad in select * from tmp_poli_faltantes where dow = v_dow loop
        if exists (
          select 1 from rd_asignacion
          where espacio_id = v_actividad.espacio_id and entidad_id = v_actividad.entidad_id
            and fecha = v_fecha and hora_inicio = v_actividad.hora_inicio
        ) then
          continue;
        end if;

        begin
          insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
          select v_actividad.espacio_id, v_actividad.entidad_id, v_fecha, v_actividad.hora_inicio, v_actividad.hora_fin,
            'puntual', en.nombre, 'migracion 0020 (reconciliación Polideportivo vs documento maestro)'
          from rd_entidad en where en.id = v_actividad.entidad_id;
          v_creadas := v_creadas + 1;
        exception when exclusion_violation then
          v_saltadas := v_saltadas + 1;
        end;
      end loop;
    end if;
    v_fecha := v_fecha + interval '1 day';
  end loop;

  raise notice 'Polideportivo vs documento maestro: % fila(s) corregida(s) (Sala musculación -> Cancha Principal), % asignación(es) creada(s), % saltada(s) por conflicto.',
    v_movidas, v_creadas, v_saltadas;
end $$;
