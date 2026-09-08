import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getSemanaParaExport } from "@/lib/data/export";
import { horaCorta } from "@/lib/date";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2, color: "#1F5C4B" },
  subtitle: { fontSize: 10, marginBottom: 12, color: "#555555" },
  dayHeader: {
    backgroundColor: "#E7F0ED",
    color: "#1F5C4B",
    fontWeight: 700,
    padding: 4,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E0",
    paddingVertical: 3,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#1F5C4B",
    color: "#FFFFFF",
    fontWeight: 700,
    paddingVertical: 4,
  },
  cellHora: { width: "18%", paddingHorizontal: 3 },
  cellEspacio: { width: "27%", paddingHorizontal: 3 },
  cellEntidad: { width: "30%", paddingHorizontal: 3 },
  cellActividad: { width: "25%", paddingHorizontal: 3 },
  empty: { color: "#888888", fontStyle: "italic", marginVertical: 4 },
});

function ProgramacionPdf({
  recintoNombre,
  desde,
  hasta,
  filasPorDia,
}: {
  recintoNombre: string;
  desde: string;
  hasta: string;
  filasPorDia: Map<string, Awaited<ReturnType<typeof getSemanaParaExport>>["filas"]>;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{recintoNombre}</Text>
        <Text style={styles.subtitle}>Programación semanal — {desde} al {hasta}</Text>

        {[...filasPorDia.entries()].map(([fecha, filas]) => (
          <View key={fecha} wrap={false}>
            <Text style={styles.dayHeader}>{fecha}</Text>
            {filas.length === 0 ? (
              <Text style={styles.empty}>Sin asignaciones</Text>
            ) : (
              <>
                <View style={styles.headerRow}>
                  <Text style={styles.cellHora}>Horario</Text>
                  <Text style={styles.cellEspacio}>Espacio</Text>
                  <Text style={styles.cellEntidad}>Organización</Text>
                  <Text style={styles.cellActividad}>Actividad</Text>
                </View>
                {filas.map((f, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.cellHora}>
                      {horaCorta(f.hora_inicio)}–{horaCorta(f.hora_fin)}
                    </Text>
                    <Text style={styles.cellEspacio}>{f.espacio_nombre}</Text>
                    <Text style={styles.cellEntidad}>{f.entidad_nombre}</Text>
                    <Text style={styles.cellActividad}>{f.actividad ?? ""}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recintoId = searchParams.get("recinto");
  const fecha = searchParams.get("fecha");

  if (!recintoId || !fecha) {
    return new Response("Faltan parámetros recinto y fecha.", { status: 400 });
  }

  const { recinto, desde, hasta, filas } = await getSemanaParaExport(recintoId, fecha);

  const dias: string[] = [];
  const d = new Date(`${desde}T00:00:00`);
  for (let i = 0; i < 7; i++) {
    dias.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  const filasPorDia = new Map<string, typeof filas>();
  for (const dia of dias) {
    filasPorDia.set(dia, filas.filter((f) => f.fecha === dia));
  }

  const buffer = await renderToBuffer(
    <ProgramacionPdf
      recintoNombre={recinto?.nombre ?? "Recinto"}
      desde={desde}
      hasta={hasta}
      filasPorDia={filasPorDia}
    />
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="programacion_${recinto?.nombre?.replace(/\s+/g, "_") ?? "recinto"}_${desde}.pdf"`,
    },
  });
}
