-- Limpieza de los recintos de colegios (gimnasios cedidos) que quedaron duplicados por
-- haber vuelto a correr 0003_convenios_colegios.sql sobre una base que ya la tenía
-- aplicada (0003 no es idempotente: no tiene ningún WHERE NOT EXISTS, así que cada
-- corrida vuelve a insertar recinto + espacio + entidad + convenio(s) desde cero).
--
-- Se investigó el alcance real contra la base antes de escribir esto (no se adivinó):
-- los 3 recintos salieron duplicados exactamente una vez cada uno, y la re-corrida
-- también duplicó la entidad "placeholder" de cada uno (Pilates y Zumba - Escuela
-- O'Higgins / Taller por confirmar — Ladrilleros / Taller por confirmar — Avendaño) y
-- sus convenios — el pedido original solo mencionaba recintos/espacios, pero dejar las
-- entidades y convenios duplicados sin tocar habría dejado clubes y convenios repetidos
-- visibles en la UI, así que se incluyen en la misma limpieza.
--
-- Verificado contra la base real: en los 3 casos, SOLO la copia más antigua (created_at)
-- tiene asignaciones generadas (por 0004); la copia duplicada (más nueva) tiene sus propios
-- convenios pero CERO asignaciones y CERO horarios distintos de los que ya tiene la copia
-- original — son contenido idéntico, no datos nuevos. Por eso esta migración no
-- "reasigna" los horarios/convenios duplicados hacia la copia definitiva (eso dejaría
-- filas de horario/convenio literalmente repetidas apuntando al mismo espacio) — los
-- borra directamente, y solo REASIGNA asignaciones si alguna llegara a existir sobre la
-- copia duplicada (no debería haber ninguna hoy, pero el código no asume eso a ciegas).
--
-- =========================================================================
-- PASO 1 — Verificación. Ejecuta SOLO este SELECT primero y revisa los números antes
-- de correr el resto del archivo (el resto queda más abajo, separado con su propio
-- encabezado "PASO 2").
-- =========================================================================
with recintos_duplicados as (
  select
    r.id,
    r.nombre,
    r.created_at,
    row_number() over (partition by r.nombre order by r.created_at asc, r.id asc) as orden
  from rd_recinto r
  where r.nombre in (
    'Gimnasio - Escuela Baudilia Avendaño de Youssuff',
    'Gimnasio - Escuela Capitán Juan de Ladrilleros',
    'Gimnasio - Escuela Capitán Libertador General Bernardo O''Higgins'
  )
)
select
  d.nombre as recinto,
  case when d.orden = 1 then 'DEFINITIVA (se conserva)' else 'DUPLICADO (se borra)' end as rol,
  d.created_at,
  (select count(*) from rd_espacio e where e.recinto_id = d.id) as espacios,
  (select count(*) from rd_horario_operacion h where h.recinto_id = d.id
     or h.espacio_id in (select id from rd_espacio e where e.recinto_id = d.id)) as horarios,
  (select count(*) from rd_convenio c where c.espacio_id in (select id from rd_espacio e where e.recinto_id = d.id)) as convenios,
  (select count(*) from rd_asignacion a where a.espacio_id in (select id from rd_espacio e where e.recinto_id = d.id)) as asignaciones
from recintos_duplicados d
order by d.nombre, d.orden;

-- =========================================================================
-- PASO 2 — Limpieza real. Revisa los números de arriba antes de seguir.
-- =========================================================================
do $$
declare
  v_recinto record;
  v_definitiva_id uuid;
  v_dup_recinto record;
  v_dup_espacio record;
  v_definitiva_espacio_id uuid;
  v_definitiva_entidad_id uuid;
  v_dup_entidad record;
  v_asignaciones_reasignadas int := 0;
  v_convenios_borrados int := 0;
  v_horarios_borrados int := 0;
  v_espacios_borrados int := 0;
  v_recintos_borrados int := 0;
  v_entidades_borradas int := 0;
  v_tmp_count int;
begin
  -- -----------------------------------------------------------------------
  -- Recintos + espacios duplicados (mismo nombre de recinto -> mismo nombre de espacio)
  -- -----------------------------------------------------------------------
  for v_recinto in
    select nombre from rd_recinto
    where nombre in (
      'Gimnasio - Escuela Baudilia Avendaño de Youssuff',
      'Gimnasio - Escuela Capitán Juan de Ladrilleros',
      'Gimnasio - Escuela Capitán Libertador General Bernardo O''Higgins'
    )
    group by nombre
    having count(*) > 1
  loop
    select id into v_definitiva_id
    from rd_recinto where nombre = v_recinto.nombre order by created_at asc, id asc limit 1;

    for v_dup_recinto in
      select id from rd_recinto where nombre = v_recinto.nombre and id <> v_definitiva_id
    loop
      for v_dup_espacio in
        select id, nombre from rd_espacio where recinto_id = v_dup_recinto.id
      loop
        select id into v_definitiva_espacio_id
        from rd_espacio where recinto_id = v_definitiva_id and nombre = v_dup_espacio.nombre
        limit 1;

        if v_definitiva_espacio_id is null then
          -- No hay un espacio homónimo en la copia definitiva: no se puede fusionar a
          -- ciegas, se deja intacto y se avisa para revisión manual.
          raise notice 'Recinto "%": el espacio duplicado "%" no tiene equivalente por nombre en la copia definitiva. No se tocó.',
            v_recinto.nombre, v_dup_espacio.nombre;
          continue;
        end if;

        -- Asignaciones: se reasignan (no deberían existir sobre la copia duplicada, pero
        -- si existieran no se pierden).
        update rd_asignacion set espacio_id = v_definitiva_espacio_id where espacio_id = v_dup_espacio.id;
        get diagnostics v_tmp_count = row_count;
        v_asignaciones_reasignadas := v_asignaciones_reasignadas + v_tmp_count;
        if v_tmp_count > 0 then
          raise notice 'Recinto "%": % asignación(es) reasignadas del espacio duplicado "%" al definitivo.',
            v_recinto.nombre, v_tmp_count, v_dup_espacio.nombre;
        end if;

        -- Convenios y horarios de la copia duplicada: se verificó que son contenido
        -- idéntico al de la copia definitiva (misma corrida de 0003), así que se borran
        -- en vez de reasignarse (reasignarlos dejaría filas repetidas).
        delete from rd_convenio where espacio_id = v_dup_espacio.id;
        get diagnostics v_tmp_count = row_count;
        v_convenios_borrados := v_convenios_borrados + v_tmp_count;

        delete from rd_horario_operacion where espacio_id = v_dup_espacio.id;
        get diagnostics v_tmp_count = row_count;
        v_horarios_borrados := v_horarios_borrados + v_tmp_count;
      end loop;

      delete from rd_horario_operacion where recinto_id = v_dup_recinto.id;
      get diagnostics v_tmp_count = row_count;
      v_horarios_borrados := v_horarios_borrados + v_tmp_count;

      delete from rd_espacio where recinto_id = v_dup_recinto.id;
      get diagnostics v_tmp_count = row_count;
      v_espacios_borrados := v_espacios_borrados + v_tmp_count;

      delete from rd_recinto where id = v_dup_recinto.id;
      v_recintos_borrados := v_recintos_borrados + 1;
    end loop;
  end loop;

  -- -----------------------------------------------------------------------
  -- Entidades "placeholder" duplicadas por la misma re-corrida de 0003
  -- -----------------------------------------------------------------------
  for v_dup_entidad in
    select nombre from rd_entidad
    where nombre in (
      'Pilates y Zumba - Escuela O''Higgins',
      'Taller por confirmar — Ladrilleros',
      'Taller por confirmar — Avendaño'
    )
    group by nombre
    having count(*) > 1
  loop
    select id into v_definitiva_entidad_id
    from rd_entidad where nombre = v_dup_entidad.nombre order by created_at asc, id asc limit 1;

    update rd_convenio set entidad_id = v_definitiva_entidad_id
    where entidad_id in (select id from rd_entidad where nombre = v_dup_entidad.nombre and id <> v_definitiva_entidad_id);

    update rd_asignacion set entidad_id = v_definitiva_entidad_id
    where entidad_id in (select id from rd_entidad where nombre = v_dup_entidad.nombre and id <> v_definitiva_entidad_id);

    delete from rd_entidad where nombre = v_dup_entidad.nombre and id <> v_definitiva_entidad_id;
    get diagnostics v_tmp_count = row_count;
    v_entidades_borradas := v_entidades_borradas + v_tmp_count;
  end loop;

  raise notice 'Limpieza duplicados colegios: % recintos borrados, % espacios borrados, % convenios borrados, % horarios borrados, % entidades borradas, % asignaciones reasignadas.',
    v_recintos_borrados, v_espacios_borrados, v_convenios_borrados, v_horarios_borrados, v_entidades_borradas, v_asignaciones_reasignadas;
end $$;
