/**
 * Single source of truth for enum values (generated from prisma/schema.prisma)
 * plus their human-readable labels. Safe to import from client and server.
 */
import {
  Arm,
  Gender,
  GlucoseUnit,
  MealTiming,
  Plan,
  TimeOfDay,
} from "@/generated/prisma/enums";

export { Arm, Gender, GlucoseUnit, MealTiming, Plan, TimeOfDay };

type Labels<T extends string> = Record<T, string>;

export const TIME_OF_DAY_LABELS: Labels<TimeOfDay> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  NIGHT: "Night",
};

export const MEAL_TIMING_LABELS: Labels<MealTiming> = {
  FASTING: "Fasting",
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal (2h)",
  BEDTIME: "Bedtime",
  RANDOM: "Random",
};

export const ARM_LABELS: Labels<Arm> = { LEFT: "Left arm", RIGHT: "Right arm" };

export const GENDER_LABELS: Labels<Gender> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

export const GLUCOSE_UNIT_LABELS: Labels<GlucoseUnit> = { MG_DL: "mg/dL", MMOL_L: "mmol/L" };

/** Ordered values as tuples, usable by z.enum() and <select> options. */
export const TIME_OF_DAY_VALUES = Object.values(TimeOfDay) as [TimeOfDay, ...TimeOfDay[]];
export const MEAL_TIMING_VALUES = Object.values(MealTiming) as [MealTiming, ...MealTiming[]];
export const ARM_VALUES = Object.values(Arm) as [Arm, ...Arm[]];
export const GENDER_VALUES = Object.values(Gender) as [Gender, ...Gender[]];
export const GLUCOSE_UNIT_VALUES = Object.values(GlucoseUnit) as [GlucoseUnit, ...GlucoseUnit[]];

export function toOptions<T extends string>(labels: Labels<T>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

/** Suggest the period of day from a clock hour (0-23). */
export function suggestTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 4 && hour < 12) return TimeOfDay.MORNING;
  if (hour >= 12 && hour < 17) return TimeOfDay.AFTERNOON;
  if (hour >= 17 && hour < 21) return TimeOfDay.EVENING;
  return TimeOfDay.NIGHT;
}
