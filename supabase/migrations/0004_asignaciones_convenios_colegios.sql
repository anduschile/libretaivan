-- Genera las asignaciones (rd_asignacion) para los convenios con colegios del SLEP
-- cargados en 0003_convenios_colegios.sql. Esa migración solo había creado los
-- registros de rd_convenio; las sesiones semanales normalmente las genera la app al
-- crear un convenio desde la UI (ver crearConvenio en
-- src/app/(app)/organizaciones/convenios/actions.ts), así que se reutiliza aquí el
-- mismo criterio: por cada día de dias_semana entre vigencia_desde y (vigencia_hasta
-- o, si no tiene, vigencia_desde + 90 días), se intenta crear la asignación; si choca
-- con algo ya confirmado (restricción de exclusión o el trigger de espacios
-- relacionados), se salta esa fecha puntual y se deja constancia con RAISE NOTICE en
-- vez de abortar toda la migración.
--
-- Importante: identifica los convenios a generar por características de los datos
-- (recinto cedido + la fecha placeholder que usó 0003 + sin asignaciones todavía) y
-- NO por el nombre del colegio — uno de esos nombres ("Escuela Baudilia Avendaño de
-- Youssuff") está bajo sospecha de estar mal transcrito y puede llegar una corrección
-- más adelante; esta migración no debería depender de ese texto para seguir
-- funcionando o para no volver a aplicarse.

do $$
declare
  v_convenio record;
  v_horizonte date;
  v_fecha date;
  v_iso_dow int;
  v_creadas int := 0;
  v_saltadas int := 0;
begin
  for v_convenio in
    select c.*
    from rd_convenio c
    join rd_espacio e on e.id = c.espacio_id
    join rd_recinto r on r.id = e.recinto_id
    where r.propiedad = 'cedido'
      and c.vigencia_desde = date '2026-09-08'  -- marcador de fecha usado por 0003
      and c.documento_respaldo = 'oficio'
      and not exists (select 1 from rd_asignacion a where a.convenio_id = c.id)
  loop
    v_horizonte := coalesce(v_convenio.vigencia_hasta, (v_convenio.vigencia_desde + interval '90 days')::date);
    v_fecha := v_convenio.vigencia_desde;

    while v_fecha <= v_horizonte loop
      v_iso_dow := extract(isodow from v_fecha)::int;

      if v_iso_dow = any(v_convenio.dias_semana) then
        begin
          insert into rd_asignacion (
            espacio_id, entidad_id, convenio_id, fecha, hora_inicio, hora_fin, tipo, creado_por
          )
          values (
            v_convenio.espacio_id, v_convenio.entidad_id, v_convenio.id, v_fecha,
            v_convenio.hora_inicio, v_convenio.hora_fin, 'convenio',
            'migracion 0004 (backfill convenios SLEP)'
          );
          v_creadas := v_creadas + 1;
        exception when exclusion_violation then
          v_saltadas := v_saltadas + 1;
          raise notice 'Asignación saltada por conflicto — convenio %, espacio %, fecha %, %-%',
            v_convenio.id, v_convenio.espacio_id, v_fecha, v_convenio.hora_inicio, v_convenio.hora_fin;
        end;
      end if;

      v_fecha := v_fecha + interval '1 day';
    end loop;
  end loop;

  raise notice 'Backfill convenios SLEP: % asignaciones creadas, % saltadas por conflicto.', v_creadas, v_saltadas;
end $$;
