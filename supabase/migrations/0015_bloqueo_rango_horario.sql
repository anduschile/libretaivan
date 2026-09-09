-- Agrega hora_inicio/hora_fin (nullable) a rd_bloqueo para que un bloqueo pueda pintar
-- solo el tramo real en vez del día completo. Retrocompatible: un bloqueo sin horario
-- (ambas columnas null) sigue pintando el día completo, tal como hoy — pensado para
-- feriados o cierres totales donde eso sí es correcto.
--
-- Corrección honesta sobre mi propio trabajo previo (0007): al revisar el CSV original
-- para hacer este backfill encontré que el texto "Cloración de agua... Horario real
-- 08:30 a 14:30" que escribí en 0007 estaba presentado con más seguridad de la que
-- tenía respaldo real. El CSV no menciona la palabra "cloración" en ningún lado, ni
-- tiene ninguna fila de la Piscina Municipal para los domingos — ese bloqueo semanal y
-- su horario fueron una suposición mía, no un dato confirmado. Por eso NO le asigno un
-- rango de hora acá: queda como bloqueo de día completo, con la descripción corregida
-- para dejar explícito que el horario (y la existencia misma del bloqueo dominical) no
-- están confirmados por José.
--
-- El bloqueo de "Colación del personal" es distinto: su horario 12:30-14:00 sí viene de
-- un dato observable — es exactamente el hueco de 90 minutos que aparece todos los días
-- entre el bloque de 11:30-12:30 y el de 14:00-15:00 en el CSV de la Piscina Municipal
-- (ninguna actividad agendada ahí, en ningún día de la semana). Ese sí se backfillea con
-- rango de hora.

alter table rd_bloqueo add column if not exists hora_inicio time;
alter table rd_bloqueo add column if not exists hora_fin time;

alter table rd_bloqueo drop constraint if exists rd_bloqueo_rango_hora_check;
alter table rd_bloqueo add constraint rd_bloqueo_rango_hora_check check (
  (hora_inicio is null and hora_fin is null)
  or (hora_inicio is not null and hora_fin is not null and hora_inicio < hora_fin)
);

do $$
declare
  v_colacion int;
  v_cloracion int;
begin
  update rd_bloqueo
  set hora_inicio = '12:30', hora_fin = '14:00'
  where motivo = 'mantencion' and descripcion ilike '%Colación del personal%';
  get diagnostics v_colacion = row_count;

  update rd_bloqueo
  set descripcion = 'Cloración de agua, bloqueo dominical cargado en la migración 0007 por suposición propia — ni el día ni el horario están confirmados por José. rd_bloqueo ahora admite hora_inicio/hora_fin (migración 0015) pero se deja sin horario (día completo) hasta tener el dato real.'
  where motivo = 'mantencion' and descripcion ilike '%Cloración de agua%';
  get diagnostics v_cloracion = row_count;

  raise notice 'Bloqueo rango horario: % bloqueo(s) de colación con horario 12:30-14:00, % bloqueo(s) de cloración dejados sin horario (sin dato confirmado) con descripción corregida.',
    v_colacion, v_cloracion;
end $$;
