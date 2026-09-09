-- Modelo de conflicto para la Piscina Municipal, adaptando el mismo patrón ya
-- construido para Cancha Principal / Transversal 1 / Transversal 2 (rd_espacio_conflicto
-- + el trigger genérico rd_check_espacio_conflicto(), sin lógica nueva).
--
-- Decisión técnica (pedido explícito de evaluar esto): NO se relaciona "Piscina -
-- Espacio 1" directamente con "Piscina - Espacio 2" en rd_espacio_conflicto. Esa tabla
-- es un par simétrico incondicional — cualquier asignación confirmada en un lado
-- bloquearía el otro siempre, y la operación real de la piscina es al revés: la mayor
-- parte del tiempo Espacio 1 y Espacio 2 operan de forma independiente (piscina
-- dividida), y solo ocasionalmente se usa completa. Enlazar 1<->2 directamente habría
-- roto el caso normal (independiente) para modelar el caso excepcional (completa).
--
-- En su lugar se crea un tercer espacio "virtual", 'Piscina Municipal (completa)',
-- dentro del mismo recinto — igual que "Cancha Principal" ya convive en el mismo
-- recinto que sus dos transversales. Cuando el encargado agenda un uso de la piscina
-- completa (sin dividir), agenda ese espacio; el trigger existente automáticamente lo
-- reflejará como "ocupada" en Espacio 1 y Espacio 2 (y viceversa: si Espacio 1 o
-- Espacio 2 ya tienen algo agendado, agendar la piscina completa chocará). Espacio 1 y
-- Espacio 2 entre sí siguen sin conflicto, tal como opera hoy.
--
-- No se marca 'Piscina Municipal (completa)' como es_secundario (0011): no es un
-- anexo de uso marginal como la Cancha chica, es la representación de un modo de
-- operación distinto de la misma piscina.

do $$
declare
  v_piscina_municipal uuid;
  v_esp1 uuid;
  v_esp2 uuid;
  v_esp_completa uuid;
begin
  select id into v_piscina_municipal from rd_recinto where nombre = 'Piscina Municipal';
  if v_piscina_municipal is null then
    raise exception 'No se encontró el recinto "Piscina Municipal" (revisar que 0010 ya se haya aplicado).';
  end if;

  select id into v_esp1 from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina - Espacio 1';
  select id into v_esp2 from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina - Espacio 2';
  if v_esp1 is null or v_esp2 is null then
    raise exception 'No se encontraron "Piscina - Espacio 1/2" dentro de "Piscina Municipal".';
  end if;

  if not exists (select 1 from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina Municipal (completa)') then
    insert into rd_espacio (recinto_id, nombre, tipo)
    values (v_piscina_municipal, 'Piscina Municipal (completa)', 'piscina')
    returning id into v_esp_completa;
  else
    select id into v_esp_completa from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina Municipal (completa)';
  end if;

  insert into rd_espacio_conflicto (espacio_a, espacio_b)
  values (v_esp_completa, v_esp1)
  on conflict do nothing;

  insert into rd_espacio_conflicto (espacio_a, espacio_b)
  values (v_esp_completa, v_esp2)
  on conflict do nothing;

  raise notice 'Piscina Municipal (completa) creada/confirmada (%), con conflicto contra Espacio 1 (%) y Espacio 2 (%).',
    v_esp_completa, v_esp1, v_esp2;
end $$;
