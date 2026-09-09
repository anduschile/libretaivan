-- Corrige el nombre mal escrito "Torterolio" -> "Torteroglio" en la entidad cargada
-- por la migración 0007.
--
-- Búsqueda hecha antes de escribir esto (rd_entidad.nombre, rd_asignacion.actividad,
-- rd_convenio.observaciones, y todo el código fuente en src/):
--   - rd_entidad: una sola fila con el nombre mal escrito, "Escuela De Futbol Orlando
--     Torterolio" (creada por la migración 0007), con 24 asignaciones reales cargadas
--     bajo ese nombre.
--   - rd_asignacion.actividad: 24 filas contienen el texto libre "Escuela De Futbol
--     Orlando Torterolio" (columna de texto copiada del CSV en el momento de la carga,
--     no una referencia — hay que corregirla aparte, no basta con corregir rd_entidad).
--   - Código fuente (src/**/*.ts, *.tsx): sin resultados — el nombre no está
--     hardcodeado en ningún componente.
--   - Migraciones anteriores (solo como referencia histórica, no se tocan): 0005 ya
--     había cargado una entidad DISTINTA con la ortografía correcta, "Club
--     Torteroglio", que sigue sin ninguna asignación (0 filas en rd_asignacion). 0006
--     ya había dejado anotado que existía sospecha de que fuera la misma organización
--     con dos nombres. No se fusionan ambas entidades acá porque el pedido de esta
--     ronda solo pidió corregir la ortografía, no decidir si son la misma escuela —
--     eso queda pendiente de confirmar con José/Iván.

do $$
declare
  v_entidad int;
  v_actividad int;
begin
  update rd_entidad
  set nombre = replace(nombre, 'Torterolio', 'Torteroglio')
  where nombre ilike '%Torterolio%';
  get diagnostics v_entidad = row_count;

  update rd_asignacion
  set actividad = replace(actividad, 'Torterolio', 'Torteroglio')
  where actividad ilike '%Torterolio%';
  get diagnostics v_actividad = row_count;

  raise notice 'Torteroglio: % entidad(es) y % actividad(es) corregidas.', v_entidad, v_actividad;
end $$;
