-- Revierte la migración 0024 (ya aplicada en producción por error, antes de decidir ir
-- por el espejo dinámico de lectura en su lugar — ver 0027 y disponibilidad.ts/page.tsx).
--
-- Nota de numeración: el prompt que pidió esto la llamaba "0025_revertir_bloqueos_completa.sql",
-- pero 0025 ya lo usa la migración de horario de operación de la Piscina (ronda anterior,
-- también sin aplicar todavía) — esta queda como 0026 para no pisarla.
--
-- Verificado contra la base real antes de escribir esto: "Piscina Municipal (completa)"
-- tiene exactamente 28 bloqueos, todos con creado_por = 'migracion 0024 (...)' — el mismo
-- set que insertó 0024 (confirmado en su informe: tenía 0 antes de esa migración). Se
-- borran por espacio_id, con el conteo esperado como assert de seguridad antes y después.

do $$
declare
  v_piscina uuid;
  v_completa uuid;
  v_antes int;
  v_borrados int;
begin
  select id into v_piscina from rd_recinto where nombre = 'Piscina Municipal';
  if v_piscina is null then
    raise exception 'No se encontró el recinto "Piscina Municipal".';
  end if;

  select id into v_completa from rd_espacio where recinto_id = v_piscina and nombre = 'Piscina Municipal (completa)';
  if v_completa is null then
    raise exception 'No se encontró el espacio "Piscina Municipal (completa)".';
  end if;

  select count(*) into v_antes from rd_bloqueo where espacio_id = v_completa;
  if v_antes <> 28 then
    raise exception 'Se esperaban 28 bloqueos en "Piscina Municipal (completa)" antes de borrar, hay % — revisar a mano antes de continuar (puede que ya no sea seguro asumir que son solo los de 0024).', v_antes;
  end if;

  delete from rd_bloqueo where espacio_id = v_completa;
  get diagnostics v_borrados = row_count;

  raise notice '"Piscina Municipal (completa)": % bloqueo(s) borrados (reversión de la migración 0024).', v_borrados;

  if v_borrados <> 28 then
    raise exception 'Se esperaban 28 filas borradas, se borraron % — revisar antes de continuar.', v_borrados;
  end if;
end $$;
