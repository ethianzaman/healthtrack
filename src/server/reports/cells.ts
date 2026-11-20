/** Cell content shared by the report model, generators and tests (no server-only imports). */

/** One line inside a cell: the value, plus an optional small grey note beside it (e.g. the time). */
export interface CellLine {
  text: string;
  note?: string;
}

export const plain = (text: string): CellLine[] => [{ text }];

/** Plain-text rendering of a cell ("6.3 mmol/L or 113 mg/dL (07:05 am)"), for fallbacks and tests. */
export function cellText(lines: CellLine[]) {
  return lines.map((l) => (l.note ? `${l.text} (${l.note})` : l.text)).join("\n");
}
