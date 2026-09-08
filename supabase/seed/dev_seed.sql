-- ============================================================================
-- SEED DE DESARROLLO — DATOS FICTICIOS, DESCARTABLES
-- ============================================================================
-- Este archivo NO forma parte de las migraciones y NUNCA debe correrse contra
-- el proyecto de producción. Sirve solo para tener datos de prueba al
-- desarrollar la UI localmente (entidades, convenios y asignaciones de ejemplo).
--
-- Cómo usarlo (con la CLI de Supabase, contra un proyecto/branch de desarrollo):
--   supabase db execute -f supabase/seed/dev_seed.sql
-- o pegando el contenido en el SQL editor de un proyecto de prueba.
--
-- Requiere que ya hayan corrido las migraciones 0001_init.sql y
-- 0002_seed_datos_reales.sql (usa los espacios reales por nombre).
-- ============================================================================

do $$
declare
  v_club uuid;
  v_colegio uuid;
  v_taller uuid;
  v_particular uuid;

  v_cancha_poli uuid;
  v_transversal1 uuid;
  v_sala1 uuid;
  v_gim_cancha uuid;

  v_convenio uuid;
begin
  select id into v_cancha_poli from rd_espacio where nombre = 'Cancha 20x40' limit 1;
  select id into v_transversal1 from rd_espacio where nombre = 'Transversal 1' limit 1;
  select id into v_sala1 from rd_espacio where nombre = 'Sala 1' limit 1;
  select id into v_gim_cancha from rd_espacio where nombre = 'Cancha' and recinto_id = (
    select id from rd_recinto where nombre = 'Gimnasio Carrera'
  ) limit 1;

  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, personalidad_juridica, vigencia_directiva, representante, telefono, correo)
  values ('Club Deportivo de Prueba', 'club_deportivo', false, true, current_date + interval '6 months', 'Representante de Prueba', '+56900000001', 'club.prueba@example.com')
  returning id into v_club;

  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, personalidad_juridica, vigencia_directiva, representante, telefono, correo)
  values ('Colegio de Prueba', 'establecimiento_educacional', false, true, current_date - interval '2 months', 'Director de Prueba', '+56900000002', 'colegio.prueba@example.com')
  returning id into v_colegio; -- vigencia vencida a propósito, para probar el badge de alerta

  insert into rd_entidad (nombre, tipo, con_fines_de_lucro)
  values ('Taller de Prueba', 'taller', true)
  returning id into v_taller;

  insert into rd_entidad (nombre, tipo, con_fines_de_lucro)
  values ('Particular de Prueba', 'particular', false)
  returning id into v_particular;

  -- Convenio de ejemplo: lunes/miércoles/viernes en Transversal 1
  insert into rd_convenio (entidad_id, espacio_id, dias_semana, hora_inicio, hora_fin, vigencia_desde, vigencia_hasta, documento_respaldo, observaciones)
  values (v_club, v_transversal1, array[1,3,5], '18:00', '19:30', current_date - interval '1 month', current_date + interval '2 months', 'oficio', 'Convenio de prueba para desarrollo')
  returning id into v_convenio;

  -- Un par de asignaciones puntuales de ejemplo esta semana
  insert into rd_asignacion (espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo, actividad, participantes_estimados, creado_por)
  values
    (v_cancha_poli, v_taller, current_date, '10:00', '11:00', 'puntual', 'Taller de zumba', 20, 'dev_seed'),
    (v_sala1, v_particular, current_date, '15:00', '16:00', 'puntual', 'Patinaje libre', 5, 'dev_seed'),
    (v_gim_cancha, v_colegio, current_date + 1, '09:00', '10:30', 'puntual', 'Educación física', 30, 'dev_seed');

  -- Asignaciones generadas manualmente a partir del convenio (simula lo que haría
  -- la generación automática al crear un convenio)
  insert into rd_asignacion (espacio_id, entidad_id, convenio_id, fecha, hora_inicio, hora_fin, tipo, actividad, creado_por)
  select v_transversal1, v_club, v_convenio, d::date, '18:00', '19:30', 'convenio', 'Entrenamiento', 'dev_seed'
  from generate_series(current_date, current_date + interval '2 weeks', interval '1 day') d
  where extract(isodow from d) in (1, 3, 5);
end $$;
