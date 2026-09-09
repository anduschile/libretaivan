-- Separa la Piscina como su propio recinto ("Piscina Municipal"), confirmado por el
-- cliente como algo pendiente desde antes de la migración 0007, que por falta de esa
-- instrucción explícita la había modelado como un par de espacios dentro de
-- "Polideportivo" (ver la nota al inicio de 0007_carga_piloto_septiembre_2026.sql).
--
-- rd_recinto.tipo (de 0001) solo admitía 'polideportivo', 'gimnasio', 'cancha', 'estadio',
-- 'sala_multiple' — ninguno describe una piscina, y forzar uno de esos habría sido
-- incorrecto (ej. "polideportivo" ya lo usa el recinto Polideportivo real, que es un caso
-- distinto). Se agrega 'piscina' como tipo válido, mismo criterio que se usó para agregar
-- 'institucion_publica' a rd_entidad.tipo en 0007.
--
-- Estado verificado contra la base real antes de escribir esto:
--   - "Piscina - Espacio 1" (dentro de Polideportivo) tiene 221 asignaciones y 28
--     bloqueos ya cargados por 0007.
--   - "Piscina - Espacio 2" tiene 0 asignaciones y 28 bloqueos (los mismos bloqueos
--     recurrentes se cargan en los dos espacios por igual, según 0007).
--   - El espacio "Piscina" original (la piscina sin dividir, de 0002) no tiene ningún
--     horario de operación, convenio, asignación ni fila en rd_espacio_conflicto — está
--     completamente sin uso. Por eso se borra en esta misma migración en vez de dejarlo
--     huérfano dentro de Polideportivo (a criterio propio, según lo dejé anotado como
--     pendiente en el informe de 0007); si en algún momento se necesita volver a operar
--     la piscina completa sin dividir, se puede recrear el espacio.
--   - No había ningún rd_horario_operacion para ese espacio "Piscina" que traspasar.
alter table rd_recinto drop constraint if exists rd_recinto_tipo_check;
alter table rd_recinto add constraint rd_recinto_tipo_check check (tipo in (
  'polideportivo', 'gimnasio', 'cancha', 'estadio', 'sala_multiple', 'piscina'
));

do $$
declare
  v_polideportivo uuid;
  v_piscina_municipal uuid;
  v_esp_piscina_original uuid;
  v_esp1_viejo uuid;
  v_esp2_viejo uuid;
  v_esp1_nuevo uuid;
  v_esp2_nuevo uuid;
  v_asignaciones_movidas int;
  v_bloqueos_movidos int;
begin
  select id into v_polideportivo from rd_recinto where nombre = 'Polideportivo';
  if v_polideportivo is null then
    raise exception 'No se encontró el recinto "Polideportivo".';
  end if;

  select id into v_esp1_viejo from rd_espacio where recinto_id = v_polideportivo and nombre = 'Piscina - Espacio 1';
  select id into v_esp2_viejo from rd_espacio where recinto_id = v_polideportivo and nombre = 'Piscina - Espacio 2';
  select id into v_esp_piscina_original from rd_espacio where recinto_id = v_polideportivo and nombre = 'Piscina';

  if v_esp1_viejo is null or v_esp2_viejo is null then
    raise exception 'No se encontraron "Piscina - Espacio 1/2" dentro de Polideportivo (revisar 0007).';
  end if;

  -- 1) Recinto nuevo, independiente.
  if not exists (select 1 from rd_recinto where nombre = 'Piscina Municipal') then
    insert into rd_recinto (nombre, tipo, propiedad, estado)
    values ('Piscina Municipal', 'piscina', 'propio', 'operativo')
    returning id into v_piscina_municipal;
  else
    select id into v_piscina_municipal from rd_recinto where nombre = 'Piscina Municipal';
  end if;

  -- 2) Espacios nuevos dentro de "Piscina Municipal".
  if not exists (select 1 from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina - Espacio 1') then
    insert into rd_espacio (recinto_id, nombre, tipo)
    values (v_piscina_municipal, 'Piscina - Espacio 1', 'piscina')
    returning id into v_esp1_nuevo;
  else
    select id into v_esp1_nuevo from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina - Espacio 1';
  end if;

  if not exists (select 1 from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina - Espacio 2') then
    insert into rd_espacio (recinto_id, nombre, tipo)
    values (v_piscina_municipal, 'Piscina - Espacio 2', 'piscina')
    returning id into v_esp2_nuevo;
  else
    select id into v_esp2_nuevo from rd_espacio where recinto_id = v_piscina_municipal and nombre = 'Piscina - Espacio 2';
  end if;

  -- 3) Migrar asignaciones y bloqueos existentes de los espacios viejos a los nuevos.
  update rd_asignacion set espacio_id = v_esp1_nuevo where espacio_id = v_esp1_viejo;
  get diagnostics v_asignaciones_movidas = row_count;
  update rd_asignacion set espacio_id = v_esp2_nuevo where espacio_id = v_esp2_viejo;

  update rd_bloqueo set espacio_id = v_esp1_nuevo where espacio_id = v_esp1_viejo;
  get diagnostics v_bloqueos_movidos = row_count;
  update rd_bloqueo set espacio_id = v_esp2_nuevo where espacio_id = v_esp2_viejo;

  -- 4) Horario de operación: no había ninguno específico para "Piscina - Espacio 1/2" ni
  -- para el espacio "Piscina" original que traspasar (verificado). Si tenían algún
  -- horario propio de "normal"/"ventana_convenio" heredado del genérico de Polideportivo
  -- (0002 lo carga a nivel de recinto, no de espacio), ese horario de Polideportivo NO le
  -- corresponde al nuevo recinto — queda pendiente que José confirme el horario real de
  -- operación de la Piscina Municipal (probablemente distinto al del Polideportivo) y se
  -- cargue en una migración futura.

  -- 5) Espacios viejos, ya vacíos: se borran (cascada no aplica entre espacios, hay que
  -- borrar explícito). rd_espacio_conflicto no tenía filas para estos espacios (verificado).
  delete from rd_espacio where id = v_esp1_viejo;
  delete from rd_espacio where id = v_esp2_viejo;

  -- 6) Espacio "Piscina" original (la piscina sin dividir): sin ningún uso, se elimina.
  if v_esp_piscina_original is not null then
    delete from rd_espacio where id = v_esp_piscina_original;
  end if;

  raise notice 'Piscina Municipal: recinto independiente creado/confirmado (%). % asignaciones y % bloqueos migrados a los nuevos espacios. Espacios viejos y "Piscina" original eliminados.',
    v_piscina_municipal, v_asignaciones_movidas, v_bloqueos_movidos;
end $$;
