import ExcelJS from "exceljs";
import { getSemanaParaExport } from "@/lib/data/export";
import { horaCorta } from "@/lib/date";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recintoId = searchParams.get("recinto");
  const fecha = searchParams.get("fecha");

  if (!recintoId || !fecha) {
    return new Response("Faltan parámetros recinto y fecha.", { status: 400 });
  }

  const { recinto, desde, hasta, filas } = await getSemanaParaExport(recintoId, fecha);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Programación");

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = `${recinto?.nombre ?? "Recinto"} — semana del ${desde} al ${hasta}`;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.addRow([]);
  const headerRow = sheet.addRow(["Fecha", "Hora inicio", "Hora fin", "Espacio", "Organización", "Actividad"]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5C4B" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  for (const f of filas) {
    sheet.addRow([
      f.fecha,
      horaCorta(f.hora_inicio),
      horaCorta(f.hora_fin),
      f.espacio_nombre,
      f.entidad_nombre,
      f.actividad ?? "",
    ]);
  }

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="programacion_${recinto?.nombre?.replace(/\s+/g, "_") ?? "recinto"}_${desde}.xlsx"`,
    },
  });
}
