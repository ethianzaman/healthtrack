import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SEVERITY_HEX } from "@/domain/severity";
import type { ReportGenerator } from "../types";
import type { ReportModel, ReportSectionModel, ReportTable } from "../view-model";

const BRAND = "#0f766e";
const ACCENT = "#0f766e";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 48, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1.5, borderBottomColor: BRAND, paddingBottom: 8, marginBottom: 12 },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: ACCENT },
  title: { fontSize: 11, marginTop: 2 },
  meta: { fontSize: 8, color: MUTED, textAlign: "right" },
  patientGrid: { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#f8fafc", borderRadius: 2, padding: 8, marginBottom: 12 },
  patientItem: { width: "33%", marginBottom: 4 },
  label: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  value: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND, marginTop: 8, marginBottom: 6 },
  facts: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  fact: { borderLeftWidth: 1.5, borderLeftColor: ACCENT, padding: 6, marginRight: 6, marginBottom: 6, minWidth: 80 },
  insight: { flexDirection: "row", marginBottom: 3 },
  insightBar: { width: 3, marginRight: 6 },
  tableTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  headRow: { flexDirection: "row", backgroundColor: BRAND },
  cell: { flex: 1, padding: 4 },
  headCell: { flex: 1, padding: 4, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  empty: { color: MUTED, fontStyle: "italic", marginBottom: 8 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED },
});

function Table({ table, breakBefore = false }: { table: ReportTable; breakBefore?: boolean }) {
  const flex = (i: number) => ({ flex: table.widths?.[i] ?? 1 });
  return (
    <View break={breakBefore}>
      <Text style={styles.tableTitle}>{table.title}</Text>
      <View style={styles.headRow} fixed>
        {table.columns.map((c, i) => (
          <Text key={c} style={[styles.headCell, flex(i)]}>{c}</Text>
        ))}
      </View>
      {table.rows.map((row, i) => (
        <View key={i} style={[styles.row, i % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}]} wrap={false}>
          {row.cells.map((cell, j) => {
            const highlight = j === table.statusColumn && row.severity && row.severity !== "normal";
            return (
              <Text key={j} style={[styles.cell, flex(j), highlight ? { color: SEVERITY_HEX[row.severity!], fontFamily: "Helvetica-Bold" } : {}]}>
                {cell}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Section({ section }: { section: ReportSectionModel }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.emptyMessage ? <Text style={styles.empty}>{section.emptyMessage}</Text> : null}
      {section.keyFacts.length > 0 && !section.emptyMessage ? (
        <View style={styles.facts}>
          {section.keyFacts.map((f) => (
            <View key={f.label} style={styles.fact}>
              <Text style={styles.label}>{f.label}</Text>
              <Text style={styles.value}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {section.insights.map((insight) => (
        <View key={insight.id} style={styles.insight}>
          <View style={[styles.insightBar, { backgroundColor: SEVERITY_HEX[insight.severity] }]} />
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{insight.title}. </Text>
            {insight.detail}
          </Text>
        </View>
      ))}
      {section.tables
        .filter((t) => t.kind === "summary")
        .map((t) => (
          <Table key={t.title} table={t} />
        ))}
    </View>
  );
}

function ReportDocument({ model }: { model: ReportModel }) {
  return (
    <Document title={model.title} author={model.appName} creator={model.appName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>{model.appName}</Text>
            <Text style={styles.title}>{model.title}</Text>
          </View>
          <View>
            <Text style={styles.meta}>Period: {model.periodLabel}</Text>
            <Text style={styles.meta}>Generated: {model.generatedAt}</Text>
          </View>
        </View>

        <View style={styles.patientGrid}>
          {model.patient.map((p) => (
            <View key={p.label} style={styles.patientItem}>
              <Text style={styles.label}>{p.label}</Text>
              <Text style={styles.value}>{p.value}</Text>
            </View>
          ))}
        </View>

        {model.sections.map((s) => (
          <Section key={s.title} section={s} />
        ))}

        {/* Appendix: every reading, each table starting on a new page. */}
        {model.sections
          .flatMap((s) => s.tables.filter((t) => t.kind === "detail"))
          .map((t) => (
            <Table key={t.title} table={t} breakBefore />
          ))}

        <View style={styles.footer} fixed>
          <Text style={{ width: "80%" }}>{model.disclaimer}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export const pdfGenerator: ReportGenerator = {
  format: "pdf",
  contentType: "application/pdf",
  extension: "pdf",
  async generate({ model }) {
    return new Uint8Array(await renderToBuffer(<ReportDocument model={model} />));
  },
};
