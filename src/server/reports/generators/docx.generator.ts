import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { SEVERITY_BG_HEX, SEVERITY_HEX, type Severity } from "@/domain/severity";
import type { ReportGenerator } from "../types";
import { valueSeverity, type CellLine, type ReportModel, type ReportSectionModel, type ReportTable } from "../view-model";

const INK = "0F172A";
const MUTED = "64748B";
const FAINT = "94A3B8";
const LINE = "E2E8F0";
const ACCENT = "0F766E";
const hex = (color: string) => color.replace("#", "").toUpperCase();

const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

/** One paragraph per line: the value, then its time / details in small grey. */
function lineParagraphs(lines: CellLine[], opts: { severity?: Severity; bold?: boolean }) {
  return lines.map(
    (l) =>
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({ text: l.text, size: 19, bold: opts.bold || Boolean(opts.severity), color: opts.severity ? hex(SEVERITY_HEX[opts.severity]) : INK }),
          ...(l.note ? [new TextRun({ text: `  ${l.note}`, size: 15, color: FAINT })] : []),
        ],
      }),
  );
}

function headerCell(text: string) {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F1F5F9" },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    borders: { top: none, left: none, right: none, bottom: { style: BorderStyle.SINGLE, size: 10, color: INK } },
    children: [new Paragraph({ children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 15, color: MUTED })] })],
  });
}

function table(t: ReportTable) {
  const out: (Paragraph | Table)[] = [
    ...(t.heading ? [new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text: t.heading, bold: true, size: 24, color: INK })] })] : []),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: thin, insideVertical: none },
      rows: [
        new TableRow({ tableHeader: true, children: t.columns.map(headerCell) }),
        ...t.rows.map(
          (row) =>
            new TableRow({
              cantSplit: true,
              children: row.cells.map((lines, i) => {
                const isStatus = i === t.statusColumn && row.severity;
                return new TableCell({
                  margins: { top: 90, bottom: 90, left: 100, right: 100 },
                  shading: isStatus ? { type: ShadingType.CLEAR, color: "auto", fill: hex(SEVERITY_BG_HEX[row.severity!]) } : undefined,
                  children: isStatus
                    ? [new Paragraph({ children: [new TextRun({ text: lines[0]?.text ?? "", bold: true, size: 17, color: hex(SEVERITY_HEX[row.severity!]) })] })]
                    : lineParagraphs(lines, { severity: valueSeverity(row, i), bold: i === 0 }),
                });
              }),
            }),
        ),
      ],
    }),
  ];
  for (const f of t.footnotes ?? []) out.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: f, size: 15, color: MUTED })] }));
  return out;
}

function sectionContent(model: ReportModel, s: ReportSectionModel) {
  const hasStatus = s.tables.some((t) => t.statusColumn !== undefined);
  return [
    new Paragraph({ children: [new TextRun({ text: model.appName.toUpperCase(), bold: true, size: 16, color: ACCENT, characterSpacing: 20 })] }),
    new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: s.title, bold: true, size: 52, color: INK })] }),
    new Paragraph({ spacing: { after: hasStatus ? 80 : 240 }, children: [new TextRun({ text: model.periodLabel, size: 21, color: MUTED })] }),
    ...(hasStatus
      ? [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "STATUS  ", size: 15, color: MUTED }),
              ...(
                [
                  ["Normal", "normal"],
                  ["Elevated", "elevated"],
                  ["High", "high"],
                  ["Low", "low"],
                  ["Danger", "critical"],
                ] as const
              ).flatMap(([label, sev]) => [
                new TextRun({ text: ` ${label} `, bold: true, size: 15, color: hex(SEVERITY_HEX[sev]), shading: { type: ShadingType.CLEAR, color: "auto", fill: hex(SEVERITY_BG_HEX[sev]) } }),
                new TextRun({ text: "  ", size: 15 }),
              ]),
            ],
          }),
        ]
      : []),
    ...(s.emptyMessage ? [new Paragraph({ children: [new TextRun({ text: s.emptyMessage, color: MUTED })] })] : []),
    ...s.tables.flatMap(table),
  ];
}

export const docxGenerator: ReportGenerator = {
  format: "docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  extension: "docx",
  async generate({ model }) {
    const footer = new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${model.disclaimer}  ·  Generated ${model.generatedAt}  ·  Page `, size: 14, color: FAINT }),
            new TextRun({ children: [PageNumber.CURRENT], size: 14, color: FAINT }),
          ],
        }),
      ],
    });

    // One Word section per report section: each starts on a new page; glucose is landscape.
    const doc = new Document({
      creator: model.appName,
      title: model.title,
      styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
      sections: model.sections.map((s) => ({
        properties: { page: { size: { orientation: s.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT } } },
        footers: { default: footer },
        children: sectionContent(model, s),
      })),
    });
    return new Uint8Array(await Packer.toBuffer(doc));
  },
};
