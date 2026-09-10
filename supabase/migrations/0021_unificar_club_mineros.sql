-- PUNTO 1 — Unifica "Club Centro de Mineros" en "Club Deportivo Mineros" (nombre
-- canónico a conservar, indicado explícitamente por José).
--
-- Verificado contra la base real antes de escribir esto: "Club Centro de Mineros"
-- tiene CERO referencias en toda la base (0 en rd_asignacion, 0 en rd_convenio) — no
-- hay nada que reasignar, es un duplicado sin uso. "Club Deportivo Mineros" ya tiene
-- 12 asignaciones reales. Por eso esta migración no necesita el paso de reasignación
-- que sí hizo falta en 0009 (ahí las duplicadas sí tenían referencias) — alcanza con
-- una verificación de que sigue en cero justo antes de borrar, por seguridad.
--
-- PUNTO 2 — Carga las 3 franjas semanales de Avendaño que la migración 0018 dejó
-- pendientes por la ambigüedad de "Club Minero" (dos candidatos, ninguno calzaba
-- exacto). Ahora resuelto: es "Club Deportivo Mineros". Mismo criterio que 0018
-- (patrón semanal recurrente expandido a septiembre 2026, excluyendo 18 y 19).

do $$
declare
  v_centro_id uuid;
  v_deportivo_id uuid;
  v_refs_centro int;
  v_espacio_avendano uuid;
  v_actividad record;
  v_fecha date;
  v_dow int;
  v_creadas int := 0;
  v_saltadas int := 0;
begin
  select id into v_centro_id from rd_entidad where nombre = 'Club Centro de Mineros';
  select id into v_deportivo_id from rd_entidad where nombre = 'Club Deportivo Mineros';
  if v_centro_id is null then
    raise notice 'No existe "Club Centro de Mineros" — nada que unificar (¿ya se aplicó esta migración?).';
  else
    if v_deportivo_id is null then
      raise exception 'No se encontró la entidad canónica "Club Deportivo Mineros".';
    end if;

    -- Reasigna por si acaso alguna referencia apareciera entre la verificación previa
    -- y este momento (defensivo, igual que 0009 — no se asume que seguirá en cero).
    update rd_asignacion set entidad_id = v_deportivo_id where entidad_id = v_centro_id;
    update rd_convenio set entidad_id = v_deportivo_id where entidad_id = v_centro_id;

    select count(*) into v_refs_centro from rd_asignacion where entidad_id = v_centro_id;
    if v_refs_centro > 0 then
      raise exception 'Quedaron % referencias a "Club Centro de Mineros" tras reasignar — no se borra.', v_refs_centro;
    end if;

    delete from rd_entidad where id = v_centro_id;
    raise notice 'Unificado: "Club Centro de Mineros" eliminado, referencias (si había) movidas a "Club Deportivo Mineros" (%).', v_deportivo_id;
  end if;

  -- Punto 2: franjas de Avendaño pendientes.
  select id into v_espacio_avendano from rd_espacio where recinto_id = (
    select id from rd_recinto where nombre = 'Gimnasio - Escuela Baudilia Avendaño de Youssuff'
  ) and nombre = 'Gimnasio';
  if v_espacio_avendano is null then
    raise exception 'No se encontró el espacio "Gimnasio" en "Gimnasio - Escuela Baudilia Avendaño de Youssuff".';
  end if;

  create temporary table tmp_avendano_mineros (
    dow int, hora_inicio time, hora_fin time
  ) on commit drop;

  insert into tmp_avendano_mineros (dow, hora_inicio, hora_fin) values
    (7, '19:00', '20:00'), -- domingo
    (5, '18:00', '19:00'), -- viernes
    (6, '12:00', '13:00'); -- sábado

  v_fecha := date '2026-09-01';
  while v_fecha <= date '2026-09-30' loop
    if v_fecha not in (date '2026-09-18', date '2026-09-19') then
      v_dow := extract(isodow from v_fecha)::int;

      for v_actividad in select * from tmp_avendano_mineros where dow = v_dow loop
        if exists (
          select 1 from rd_asignacion
          where espacio_id = v_espacio_avendano and entidad_id = v_deportivo_id
            and fecha = v_fecha and hora_inicio = v_actividad.hora_inicio
        ) then
          continue;
        end if;

        begin
          insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
          values (v_espacio_avendano, v_deportivo_id, v_fecha, v_actividad.hora_inicio, v_actividad.hora_fin, 'puntual',
            'Club Deportivo Mineros', 'migracion 0021 (unificación Club Mineros + franjas Avendaño pendientes)');
          v_creadas := v_creadas + 1;
        exception when exclusion_violation then
          v_saltadas := v_saltadas + 1;
          raise notice 'Asignación saltada por conflicto — Club Deportivo Mineros, fecha %, %-%',
            v_fecha, v_actividad.hora_inicio, v_actividad.hora_fin;
        end;
      end loop;
    end if;
    v_fecha := v_fecha + interval '1 day';
  end loop;

  raise notice 'Avendaño Club Deportivo Mineros: % asignación(es) creada(s), % saltada(s) por conflicto.', v_creadas, v_saltadas;
end $$;
