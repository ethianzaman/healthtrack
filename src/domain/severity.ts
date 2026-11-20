/** Shared severity scale used by every classifier, so UI/report styling stays consistent. */
export type Severity = "low" | "normal" | "elevated" | "high" | "critical";

export interface Classification<C extends string = string> {
  category: C;
  label: string;
  severity: Severity;
}

/** Hex colours per severity (PDF/DOCX/charts). Mirrors the --color-sev-* tokens in globals.css. */
export const SEVERITY_HEX: Record<Severity, string> = {
  low: "#1d4ed8",
  normal: "#047857",
  elevated: "#b45309",
  high: "#c2410c",
  critical: "#b91c1c",
};

/** Soft tints behind status pills. Mirrors the --color-sev-*-bg tokens in globals.css. */
export const SEVERITY_BG_HEX: Record<Severity, string> = {
  low: "#eff6ff",
  normal: "#ecfdf5",
  elevated: "#fffbeb",
  high: "#fff7ed",
  critical: "#fef2f2",
};
