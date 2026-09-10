-- Carga rd_horario_operacion para "Piscina Municipal", que no tiene ninguna fila desde
-- que se separó como recinto propio en la migración 0010 (esta quedó pendiente
-- explícitamente ahí: "queda pendiente que José confirme el horario real de operación").
-- Sin esta fila, el denominador "horas de funcionamiento" del panel Hoy subestima a la
-- Piscina pese a ser, junto con Sala de uso múltiple, uno de los recintos con más uso real.
--
-- El documento maestro ("SALA DE USO MULTIPLE.doc", tabla 9 — la de la Piscina) NO declara
-- un horario de apertura/cierre explícito en ningún lado: es solo una grilla de actividades
-- por hora, sin una fila o encabezado tipo "horario de funcionamiento". Se revisó completo
-- (extracción por celda vía automatización de Word, igual método que 0019) antes de
-- concluir esto.
--
-- Por eso el horario de acá se INFIERE del rango real de uso ya cargado en rd_asignacion
-- (hora más temprana y más tardía de actividad, agrupado por día de semana, sobre TODAS las
-- semanas de septiembre 2026 disponibles) — NO está confirmado por Iván, igual que quedó
-- pendiente de confirmar el horario de la colación en 0007/0019.
--
-- Verificado contra la base real antes de escribir esto (rd_asignacion, estado confirmada):
--   lunes a viernes: 08:30–22:00 en las 5 semanas de septiembre, consistente cada día
--     (mismo rango exacto los 5 días de la semana, sin variación).
--   sábado: 09:30–21:00 (3 sábados con datos: 05, 12, 26 — 19 es feriado).
--   domingo: CERO asignaciones reales en cualquier semana, y las 4 fechas de domingo
--     tienen un bloqueo de motivo 'mantencion' de día completo (sin hora_inicio/hora_fin)
--     — los datos ya cargados indican que no opera. Por eso NO se carga fila de domingo:
--     forzar un horario ahí contradiría el propio dato de mantención ya confirmado.
--
-- Etiqueta 'normal', igual convención que el resto de los recintos (0002) — no hay
-- evidencia en los datos de un horario de invierno reducido para la Piscina.

do $$
declare
  v_piscina uuid;
  v_dia int;
  v_insertados int := 0;
begin
  select id into v_piscina from rd_recinto where nombre = 'Piscina Municipal';
  if v_piscina is null then
    raise exception 'No se encontró el recinto "Piscina Municipal".';
  end if;

  if exists (select 1 from rd_horario_operacion where recinto_id = v_piscina) then
    raise exception 'Ya existen filas de horario_operacion para "Piscina Municipal" — revisar a mano antes de volver a correr esta migración.';
  end if;

  for v_dia in 1..5 loop
    insert into rd_horario_operacion (recinto_id, dia_semana, hora_apertura, hora_cierre, etiqueta)
    values (v_piscina, v_dia, '08:30', '22:00', 'normal');
    v_insertados := v_insertados + 1;
  end loop;

  insert into rd_horario_operacion (recinto_id, dia_semana, hora_apertura, hora_cierre, etiqueta)
  values (v_piscina, 6, '09:30', '21:00', 'normal');
  v_insertados := v_insertados + 1;

  -- Domingo: sin fila, a propósito (ver nota arriba — mantención todo el día, sin uso real).

  raise notice 'Piscina Municipal: % fila(s) de horario_operacion cargadas (lunes-viernes 08:30-22:00, sábado 09:30-21:00, domingo sin horario — inferido de uso real, no confirmado por Iván).', v_insertados;

  if v_insertados <> 6 then
    raise exception 'Se esperaban 6 filas insertadas, se insertaron % — revisar antes de continuar.', v_insertados;
  end if;
end $$;
