import "server-only";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SEVERITY_BG_HEX, SEVERITY_HEX, type Severity } from "@/domain/severity";
import type { ReportGenerator } from "../types";
import { valueSeverity, type CellLine, type ReportModel, type ReportRow, type ReportSectionModel, type ReportTable } from "../view-model";

// Wrap whole words only: medical terms split with hyphens ("di-abetes") read badly.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#0f172a";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const LINE = "#e2e8f0";
const ACCENT = "#0f766e";

const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingHorizontal: 36, paddingBottom: 52, fontSize: 9.5, fontFamily: "Helvetica", color: INK },
  running: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, marginBottom: 18, borderBottomWidth: 0.6, borderBottomColor: LINE },
  brand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: ACCENT, letterSpacing: 1.2 },
  runningMeta: { fontSize: 8, color: MUTED },
  accentBar: { width: 34, height: 3, backgroundColor: ACCENT, borderRadius: 2, marginBottom: 10 },
  headline: { fontSize: 26, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: -0.4 },
  period: { marginTop: 4, fontSize: 10.5, color: MUTED },
  key: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 14, marginBottom: 4 },
  keyLabel: { fontSize: 7.5, color: MUTED, marginRight: 6, letterSpacing: 0.6 },
  table: { marginTop: 16 },
  tableHeading: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 8 },
  headRow: { flexDirection: "row", borderBottomWidth: 1.2, borderBottomColor: INK, paddingBottom: 6 },
  headCell: { paddingHorizontal: 6, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 0.6, textTransform: "uppercase" },
  row: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE, paddingVertical: 7 },
  cell: { paddingHorizontal: 6, gap: 3 },
  value: { fontSize: 9.5 },
  note: { fontSize: 7.5, color: FAINT },
  pill: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2.5 },
  pillText: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  footnote: { marginTop: 12, fontSize: 7.5, color: MUTED, lineHeight: 1.4 },
  empty: { marginTop: 18, fontSize: 11, color: MUTED },
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: FAINT },
});

function Pill({ label, severity }: { label: string; severity: Severity }) {
  return (
    <View style={[styles.pill, { backgroundColor: SEVERITY_BG_HEX[severity] }]}>
      <Text style={[styles.pillText, { color: SEVERITY_HEX[severity] }]}>{label}</Text>
    </View>
  );
}

/** Value in normal size, its time / details beside it in small grey. */
function Lines({ lines, severity, bold }: { lines: CellLine[]; severity?: Severity; bold?: boolean }) {
  return (
    <>
      {lines.map((l, i) => (
        // A wrapping row (not nested text): the note sits beside the value when it fits and
        // drops below cleanly when it doesn't, instead of react-pdf breaking the run with a "-".
        <View key={i} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", columnGap: 4 }}>
          <Text style={[styles.value, bold ? { fontFamily: "Helvetica-Bold" } : {}, severity ? { color: SEVERITY_HEX[severity] } : {}]}>{l.text}</Text>
          {l.note ? <Text style={[styles.note, { paddingBottom: 0.6 }]}>{l.note}</Text> : null}
        </View>
      ))}
    </>
  );
}

function Row({ table, row, index }: { table: ReportTable; row: ReportRow; index: number }) {
  const flex = (i: number) => ({ flex: table.widths?.[i] ?? 1 });
  return (
    <View style={[styles.row, index % 2 === 1 ? { backgroundColor: "#fafbfc" } : {}]} wrap={false}>
      {row.cells.map((lines, i) => (
        <View key={i} style={[styles.cell, flex(i)]}>
          {i === table.statusColumn && row.severity ? (
            <Pill label={lines[0]?.text ?? ""} severity={row.severity} />
          ) : (
            <Lines lines={lines} severity={valueSeverity(row, i)} bold={i === 0} />
          )}
        </View>
      ))}
    </View>
  );
}

function Table({ table }: { table: ReportTable }) {
  const flex = (i: number) => ({ flex: table.widths?.[i] ?? 1 });
  return (
    <View style={styles.table}>
      {table.heading ? <Text style={styles.tableHeading}>{table.heading}</Text> : null}
      {/* Repeats at the top of every page the table runs onto. */}
      <View style={styles.headRow} fixed>
        {table.columns.map((c, i) => (
          <Text key={c} style={[styles.headCell, flex(i)]}>
            {c}
          </Text>
        ))}
      </View>
      {table.rows.map((row, i) => (
        <Row key={i} table={table} row={row} index={i} />
      ))}
      {table.footnotes?.map((f, i) => (
        <Text key={i} style={styles.footnote}>
          {f}
        </Text>
      ))}
    </View>
  );
}

const STATUS_KEY: { label: string; severity: Severity }[] = [
  { label: "Normal", severity: "normal" },
  { label: "Elevated", severity: "elevated" },
  { label: "High", severity: "high" },
  { label: "Low", severity: "low" },
  { label: "Danger", severity: "critical" },
];

function SectionPages({ model, section }: { model: ReportModel; section: ReportSectionModel }) {
  const hasStatus = section.tables.some((t) => t.statusColumn !== undefined);
  return (
    <Page size="A4" orientation={section.orientation ?? "portrait"} style={styles.page}>
      <View style={styles.running} fixed>
        <Text style={styles.brand}>{model.appName.toUpperCase()}</Text>
        <Text style={styles.runningMeta}>
          {section.title} · {model.periodLabel}
        </Text>
      </View>

      <View style={styles.accentBar} />
      <Text style={styles.headline}>{section.title}</Text>
      <Text style={styles.period}>{model.periodLabel}</Text>
      {hasStatus ? (
        <View style={styles.key}>
          <Text style={styles.keyLabel}>STATUS</Text>
          {STATUS_KEY.map((k) => (
            <View key={k.label} style={{ marginRight: 5 }}>
              <Pill label={k.label} severity={k.severity} />
            </View>
          ))}
        </View>
      ) : null}

      {section.emptyMessage ? <Text style={styles.empty}>{section.emptyMessage}</Text> : null}
      {section.tables.map((t, i) => (
        <Table key={i} table={t} />
      ))}

      <View style={styles.footer} fixed>
        <Text style={{ width: "78%" }}>
          {model.disclaimer} Generated {model.generatedAt}.
        </Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );
}

/** One page group per section: Blood Pressure Report, Glucose Report (landscape), Medication List. */
function ReportDocument({ model }: { model: ReportModel }) {
  return (
    <Document title={model.title} author={model.appName} creator={model.appName}>
      {model.sections.map((section) => (
        <SectionPages key={section.title} model={model} section={section} />
      ))}
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
