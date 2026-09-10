import type { ComponentType } from "react";
import { Dumbbell, Volleyball, Landmark, DoorOpen, Waves, LayoutGrid, type LucideProps } from "lucide-react";
import type { EntidadTipo, RecintoTipo, AsignacionTipo, BloqueoMotivo, RdConvenio } from "./types";

export const DIAS_SEMANA = [
  { value: 1, label: "Lunes", corto: "Lun" },
  { value: 2, label: "Martes", corto: "Mar" },
  { value: 3, label: "Miércoles", corto: "Mié" },
  { value: 4, label: "Jueves", corto: "Jue" },
  { value: 5, label: "Viernes", corto: "Vie" },
  { value: 6, label: "Sábado", corto: "Sáb" },
  { value: 7, label: "Domingo", corto: "Dom" },
] as const;

export const RECINTO_TIPO_LABEL: Record<RecintoTipo, string> = {
  polideportivo: "Polideportivo",
  gimnasio: "Gimnasio",
  cancha: "Cancha",
  estadio: "Estadio",
  sala_multiple: "Sala de uso múltiple",
  piscina: "Piscina",
};

// Agrupación de recintos para el selector de Programación (con 9+ recintos y nombres
// parecidos, agrupar por tipo ayuda a encontrar uno rápido).
export const RECINTO_GRUPO: Record<RecintoTipo, string> = {
  cancha: "Canchas y estadios",
  estadio: "Canchas y estadios",
  polideportivo: "Canchas y estadios",
  gimnasio: "Gimnasios",
  sala_multiple: "Salas",
  piscina: "Piscinas",
};

export const ORDEN_GRUPOS_RECINTO = ["Canchas y estadios", "Gimnasios", "Salas", "Piscinas"] as const;

export const ENTIDAD_TIPO_LABEL: Record<EntidadTipo, string> = {
  club_deportivo: "Club deportivo",
  establecimiento_educacional: "Establecimiento educacional",
  organizacion_comunitaria: "Organización comunitaria",
  taller: "Taller",
  empresa: "Empresa",
  particular: "Particular",
  programa_propio: "Programa propio",
  institucion_publica: "Institución pública",
};

export const ASIGNACION_TIPO_LABEL: Record<AsignacionTipo, string> = {
  puntual: "Puntual",
  convenio: "Convenio",
  evento_municipal: "Evento municipal",
};

export const BLOQUEO_MOTIVO_LABEL: Record<BloqueoMotivo, string> = {
  mantencion: "Mantención",
  evento: "Evento",
  clima: "Clima",
  municipal_prioritario: "Actividad municipal prioritaria",
};

// Borde de color a la izquierda de las tarjetas, según el tipo de entidad
// (paleta validada con el cliente). "bloqueo" se usa para bloqueos, no entidades.
export const TIPO_COLOR_BORDE: Record<EntidadTipo | "bloqueo" | "programa_propio", string> = {
  club_deportivo: "border-l-blue-500",
  establecimiento_educacional: "border-l-purple-500",
  programa_propio: "border-l-[#1F5C4B]",
  particular: "border-l-amber-700",
  organizacion_comunitaria: "border-l-blue-500",
  taller: "border-l-amber-700",
  empresa: "border-l-amber-700",
  institucion_publica: "border-l-red-700",
  // Ámbar/warning — distinto del ámbar de particular/taller/empresa (Tailwind
  // amber-700) y del fondo verde de cualquier bloque de actividad real (siempre
  // bg-accent-soft), para que un bloqueo de mantención/colación no se confunda con
  // ninguno de los dos (ver TIPO_COLOR_TEXTO.bloqueo y el fondo bg-warning-soft que
  // se agrega en los 3 componentes que renderizan bloqueos).
  bloqueo: "border-l-[var(--color-warning)]",
};

export function colorBordeEntidad(tipo: EntidadTipo): string {
  return TIPO_COLOR_BORDE[tipo] ?? "border-l-gray-400";
}

// Mismo criterio que TIPO_COLOR_BORDE pero como color de texto/ícono (no de borde),
// para pintar íconos asociados a un tipo de entidad o a un bloqueo con la misma
// paleta ya validada, en vez de dejarlos todos en un solo tono neutro.
export const TIPO_COLOR_TEXTO: Record<EntidadTipo | "bloqueo" | "programa_propio", string> = {
  club_deportivo: "text-blue-500",
  establecimiento_educacional: "text-purple-500",
  programa_propio: "text-[#1F5C4B]",
  particular: "text-amber-700",
  organizacion_comunitaria: "text-blue-500",
  taller: "text-amber-700",
  empresa: "text-amber-700",
  institucion_publica: "text-red-700",
  bloqueo: "text-[var(--color-warning)]",
};

export function colorTextoEntidad(tipo: EntidadTipo): string {
  return TIPO_COLOR_TEXTO[tipo] ?? "text-gray-400";
}

// Mensajes del "espejo" de conflicto (Cancha Principal/Transversales, Piscina
// completa/Espacio 1-2): el sustantivo depende del tipo de recinto, y el mensaje
// depende de si solo uno de los espacios relacionados está ocupado (el conjunto no se
// puede usar completo, pero no está realmente "dividido") o si ambos lo están a la vez
// (uso genuinamente dividido).
function sustantivoRecinto(tipo: RecintoTipo): string {
  return tipo === "piscina" ? "piscina" : "cancha";
}

export function mensajeEspejoCorto(tipo: RecintoTipo, nombresEntidades: string[]): string {
  const sustantivo = sustantivoRecinto(tipo);
  if (nombresEntidades.length >= 2) {
    return `${sustantivo.charAt(0).toUpperCase()}${sustantivo.slice(1)} dividida`;
  }
  return `No disponible — ${sustantivo} completa`;
}

export function mensajeEspejoLargo(tipo: RecintoTipo, nombresEntidades: string[]): string {
  const sustantivo = sustantivoRecinto(tipo);
  if (nombresEntidades.length >= 2) {
    return `${sustantivo.charAt(0).toUpperCase()}${sustantivo.slice(1)} dividida en uso: ${nombresEntidades.join(" y ")}`;
  }
  return `No disponible como ${sustantivo} completa — en uso: ${nombresEntidades[0] ?? "otra organización"}`;
}

export function diaSemanaISO(fecha: Date): number {
  // getDay(): 0=domingo..6=sábado → convertir a 1=lunes..7=domingo
  const d = fecha.getDay();
  return d === 0 ? 7 : d;
}

export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

// Íconos por tipo de recinto. No existe un ícono literal de "estadio con gradas" en
// lucide-react: se usa Landmark (edificio institucional) como la aproximación más
// cercana disponible en la librería.
export const RECINTO_TIPO_ICON: Record<RecintoTipo, ComponentType<LucideProps>> = {
  polideportivo: LayoutGrid,
  gimnasio: Dumbbell,
  cancha: Volleyball,
  estadio: Landmark,
  sala_multiple: DoorOpen,
  piscina: Waves,
};

// Íconos por tipo de espacio (texto libre, no un enum). "media_cancha" comparte ícono
// con "cancha"; cualquier tipo no reconocido (pasillo, otro, cafetería…) cae al ícono
// genérico LayoutGrid en vez de inventar un ícono específico para cada uno.
export const ESPACIO_TIPO_ICON: Record<string, ComponentType<LucideProps>> = {
  cancha: Volleyball,
  media_cancha: Volleyball,
  piscina: Waves,
  sala: DoorOpen,
  gimnasio: Dumbbell,
};

export type ChipColor = { bg: string; fg: string };

// Fondo circular suave (chip) para los íconos de tipo de recinto/espacio. Un tono
// distinto por tipo — no todo verde institucional — para que se distingan a simple
// vista; todos en tonos claros (escala 100/600 de Tailwind) para no competir con el
// acento verde de la marca ni verse saturados.
export const RECINTO_TIPO_CHIP: Record<RecintoTipo, ChipColor> = {
  polideportivo: { bg: "bg-indigo-100", fg: "text-indigo-600" },
  gimnasio: { bg: "bg-rose-100", fg: "text-rose-600" },
  cancha: { bg: "bg-orange-100", fg: "text-orange-600" },
  estadio: { bg: "bg-teal-100", fg: "text-teal-600" },
  sala_multiple: { bg: "bg-violet-100", fg: "text-violet-600" },
  piscina: { bg: "bg-cyan-100", fg: "text-cyan-600" },
};

export const ESPACIO_TIPO_CHIP: Record<string, ChipColor> = {
  cancha: { bg: "bg-orange-100", fg: "text-orange-600" },
  media_cancha: { bg: "bg-orange-100", fg: "text-orange-600" },
  piscina: { bg: "bg-cyan-100", fg: "text-cyan-600" },
  sala: { bg: "bg-violet-100", fg: "text-violet-600" },
  gimnasio: { bg: "bg-rose-100", fg: "text-rose-600" },
};

export const CHIP_COLOR_DEFAULT: ChipColor = { bg: "bg-gray-100", fg: "text-gray-500" };


// Un convenio queda marcado "incompleto" cuando, al cargarlo, faltaba un dato que el
// cliente todavía no confirmaba (actividad exacta, horario exacto de algún tramo).
// En vez de agregar una columna nueva a la tabla, se usa una convención de texto en
// `observaciones`: si empieza con "[INCOMPLETO]", la UI lo muestra distinto.
const MARCA_CONVENIO_INCOMPLETO = "[INCOMPLETO]";

export function esConvenioIncompleto(convenio: Pick<RdConvenio, "observaciones">): boolean {
  return convenio.observaciones?.startsWith(MARCA_CONVENIO_INCOMPLETO) ?? false;
}

export function motivoIncompleto(convenio: Pick<RdConvenio, "observaciones">): string | null {
  if (!esConvenioIncompleto(convenio)) return null;
  return convenio.observaciones!.slice(MARCA_CONVENIO_INCOMPLETO.length).trim();
}
