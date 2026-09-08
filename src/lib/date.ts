import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays, startOfWeek } from "date-fns";

export const ZONA_HORARIA_DEFECTO = "America/Punta_Arenas";

export function hoyISO(tz: string = ZONA_HORARIA_DEFECTO): string {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

export function hoyDiaSemanaISO(tz: string = ZONA_HORARIA_DEFECTO): number {
  const zoned = toZonedTime(new Date(), tz);
  const d = zoned.getDay();
  return d === 0 ? 7 : d;
}

export function inicioSemana(fechaISO: string): Date {
  return startOfWeek(new Date(`${fechaISO}T00:00:00`), { weekStartsOn: 1 });
}

export function rangoSemana(fechaISO: string): { desde: string; hasta: string; dias: string[] } {
  const inicio = inicioSemana(fechaISO);
  const dias = Array.from({ length: 7 }, (_, i) => formatFechaISO(addDays(inicio, i)));
  return { desde: dias[0], hasta: dias[6], dias };
}

export function formatFechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatFechaCorta(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(d);
}

export function formatFechaLarga(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
}

export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

export function diaSemanaISOFromDate(fechaISO: string): number {
  const d = new Date(`${fechaISO}T00:00:00`).getDay();
  return d === 0 ? 7 : d;
}

export function minutosEntre(horaInicio: string, horaFin: string): number {
  const [h1, m1] = horaInicio.split(":").map(Number);
  const [h2, m2] = horaFin.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}
