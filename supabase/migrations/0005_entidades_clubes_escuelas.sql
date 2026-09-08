-- Catálogo inicial de clubes/escuelas que usan horas cedidas del gimnasio de la
-- Escuela Baudilia Avendaño de Youssuff (a diferencia de O'Higgins, ese gimnasio no
-- tiene una actividad propia fija: la Corporación redistribuye las horas entre
-- distintos clubes y escuelas externas para descomprimir la demanda de sus propios
-- recintos). La demanda es variable e indeterminada, así que a propósito NO se crea
-- ningún rd_convenio ni rd_asignacion para estas entidades: quedan disponibles en el
-- selector de Programación para que el encargado agende manualmente semana a semana,
-- igual que cualquier otro club que usa un recinto propio.
--
-- Esta es una versión inicial y editable: el cliente indicó que la lista puede no
-- estar completa y va a crecer con el tiempo. No requiere trabajo adicional — ya se
-- pueden agregar más entidades desde la pestaña Organizaciones de la app.
--
-- "Club Manuel Cuyul" y "Escuela Manuel Cuyul" son dos entidades distintas
-- confirmadas por el cliente, no un duplicado.

insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa) values
  ('Club Torteroglio', 'club_deportivo', false, true),
  ('Club Luis Gallito González', 'club_deportivo', false, true),
  ('Club Colo Colo', 'club_deportivo', false, true),
  ('Club Centro de Mineros', 'club_deportivo', false, true),
  ('Escuela Pumas', 'establecimiento_educacional', false, true),
  ('Club Unión', 'club_deportivo', false, true),
  ('Club Manuel Cuyul', 'club_deportivo', false, true),
  ('Club Arturo Vidal', 'club_deportivo', false, true),
  ('Escuela Manuel Cuyul', 'establecimiento_educacional', false, true),
  ('Club Fidel Rodríguez', 'club_deportivo', false, true),
  ('Club De Tenis', 'club_deportivo', false, true);
