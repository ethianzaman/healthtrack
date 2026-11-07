import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { SEVERITY_HEX } from "@/domain/severity";
import type { ReportGenerator } from "../types";
import type { ReportSectionModel, ReportTable } from "../view-model";

const BRAND = "0F766E";
const ACCENT = "0F766E";
const hex = (color: string) => color.replace("#", "").toUpperCase();

function cell(text: string, opts: { header?: boolean; color?: string } = {}) {
  return new TableCell({
    shading: opts.header ? { type: ShadingType.CLEAR, color: "auto", fill: BRAND } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts.header || Boolean(opts.color),
            color: opts.header ? "FFFFFF" : opts.color,
            size: 18,
          }),
        ],
      }),
    ],
  });
}

function table(t: ReportTable) {
  return [
    new Paragraph({
      text: t.title,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 80 },
      pageBreakBefore: t.kind === "detail",
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({ tableHeader: true, children: t.columns.map((c) => cell(c, { header: true })) }),
        ...t.rows.map(
          (r) =>
            new TableRow({
              children: r.cells.map((c, i) =>
                cell(c, { color: i === t.statusColumn && r.severity && r.severity !== "normal" ? hex(SEVERITY_HEX[r.severity]) : undefined }),
              ),
            }),
        ),
      ],
    }),
  ];
}

function section(s: ReportSectionModel) {
  const out: (Paragraph | Table)[] = [
    new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 } }),
  ];
  if (s.emptyMessage) {
    out.push(new Paragraph({ children: [new TextRun({ text: s.emptyMessage, italics: true, color: "64748B" })] }));
    return out;
  }
  if (s.keyFacts.length) {
    out.push(
      new Paragraph({
        children: s.keyFacts.flatMap((f, i) => [
          new TextRun({ text: `${i ? "   |   " : ""}${f.label}: `, color: "64748B" }),
          new TextRun({ text: f.value, bold: true }),
        ]),
      }),
    );
  }
  for (const insight of s.insights) {
    out.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({ text: `${insight.title}. `, bold: true, color: hex(SEVERITY_HEX[insight.severity]) }),
          new TextRun(insight.detail),
        ],
      }),
    );
  }
  s.tables.filter((t) => t.kind === "summary").forEach((t) => out.push(...table(t)));
  return out;
}

export const docxGenerator: ReportGenerator = {
  format: "docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  extension: "docx",
  async generate({ model }) {
    const doc = new Document({
      creator: model.appName,
      title: model.title,
      styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
      sections: [
        {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: `${model.disclaimer}  -  Page `, size: 14, color: "64748B" }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "64748B" }),
                  ],
                }),
              ],
            }),
          },
          children: [
            new Paragraph({ children: [new TextRun({ text: model.appName, bold: true, size: 36, color: ACCENT })] }),
            new Paragraph({ text: model.title, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
              children: [new TextRun({ text: `Period: ${model.periodLabel}   |   Generated: ${model.generatedAt}`, color: "64748B" })],
              spacing: { after: 200 },
            }),
            ...model.patient.map(
              (p) =>
                new Paragraph({
                  children: [new TextRun({ text: `${p.label}: `, color: "64748B" }), new TextRun({ text: p.value, bold: true })],
                }),
            ),
            ...model.sections.flatMap(section),
            // Appendix with every reading.
            ...model.sections.flatMap((s) => s.tables.filter((t) => t.kind === "detail").flatMap(table)),
          ],
        },
      ],
    });
    return new Uint8Array(await Packer.toBuffer(doc));
  },
};
