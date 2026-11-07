import type { Plan } from "@/domain/enums";
import type { ReportFormat } from "@/features/reports/schemas";

export interface PlanLimits {
  label: string;
  priceMonthlyUsd: number;
  maxProfiles: number;
  maxActiveShareLinks: number;
  reportFormats: ReportFormat[];
}

/** Feature gating lives in one place; billing (e.g. Stripe) only needs to flip `user.plan`. */
export const PLANS: Record<Plan, PlanLimits> = {
  FREE: {
    label: "Free",
    priceMonthlyUsd: 0,
    maxProfiles: 2,
    maxActiveShareLinks: 1,
    reportFormats: ["pdf", "csv"],
  },
  PRO: {
    label: "Pro",
    priceMonthlyUsd: 4,
    maxProfiles: 10,
    maxActiveShareLinks: 20,
    reportFormats: ["pdf", "docx", "csv"],
  },
};

export function planLimits(plan: Plan) {
  return PLANS[plan];
}
