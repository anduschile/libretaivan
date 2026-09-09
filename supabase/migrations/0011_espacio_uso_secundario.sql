-- Marca espacios de uso secundario/anexo (ej. la Cancha chica del Estadio Víctor
-- Bórquez Miranda, que concentra muy poco uso frente a la Cancha grande) para que la
-- UI de Programación pueda mostrarlos colapsados cuando no tienen asignaciones el día
-- visible (ver bloque-grid.tsx / bloque-list.tsx).
--
-- Verificado contra la base real antes de escribir el UPDATE: el recinto se llama
-- "Estadio Víctor Bórquez Miranda" y el espacio "Cancha chica" (ambos coinciden
-- exactamente con lo asumido en el pedido, no hubo desalineación de nombres esta vez).
--
-- No se marca ningún otro espacio: Transversal 1/2 del Polideportivo son uso simultáneo
-- real (no un anexo de baja frecuencia) y quedan fuera a propósito, según lo indicado.

alter table rd_espacio add column if not exists es_secundario boolean not null default false;

do $$
declare
  v_estadio_borquez uuid;
  v_filas int;
begin
  select id into v_estadio_borquez from rd_recinto where nombre = 'Estadio Víctor Bórquez Miranda';
  if v_estadio_borquez is null then
    raise exception 'No se encontró el recinto "Estadio Víctor Bórquez Miranda".';
  end if;

  update rd_espacio
  set es_secundario = true
  where nombre = 'Cancha chica'
    and recinto_id = v_estadio_borquez;
  get diagnostics v_filas = row_count;

  if v_filas = 0 then
    raise exception 'No se encontró el espacio "Cancha chica" en Estadio Víctor Bórquez Miranda — revisar nombre exacto antes de reintentar.';
  end if;

  raise notice 'es_secundario marcado en % espacio(s) ("Cancha chica").', v_filas;
end $$;
