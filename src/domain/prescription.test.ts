import { describe, expect, it } from "vitest";
import { parsePrescriptionText } from "./prescription";

const SAMPLE = `
Dr. Md. Kamal Hossain
MBBS, FCPS (Medicine)
Date: 12/11/2026
Name: Abdul Karim   Age: 62
C/C: headache, dizziness
D/x: HTN, T2DM
Rx
1. Tab. Amdocal 5 mg
   1+0+0  after meal - continue
2. Tab. Comet 500mg
   1+0+1 after meals x 30 days
3. Cap. Seclo 20 mg 1-0-1 before meal 14 days
4. Tab Rosuva 10mg  0+0+1
Adv: walk 30 min daily
`;

describe("parsePrescriptionText", () => {
  const draft = parsePrescriptionText(SAMPLE);

  it("reads doctor, date and expands the diagnosis short forms", () => {
    expect(draft.doctorName).toBe("Dr. Md. Kamal Hossain");
    expect(draft.issuedOn).toBe("2026-11-12");
    expect(draft.condition).toBe("Hypertension, Type 2 diabetes");
  });

  it("extracts each medicine with dose, 1+0+1 schedule and instructions from the next line", () => {
    expect(draft.medications).toEqual([
      { name: "Tab Amdocal", dosage: "5 mg", schedule: "1+0+0", mealTiming: "AFTER_MEAL", durationDays: null, notes: "" },
      { name: "Tab Comet", dosage: "500mg", schedule: "1+0+1", mealTiming: "AFTER_MEAL", durationDays: 30, notes: "" },
      { name: "Cap Seclo", dosage: "20 mg", schedule: "1+0+1", mealTiming: "BEFORE_MEAL", durationDays: 14, notes: "" },
      { name: "Tab Rosuva", dosage: "10mg", schedule: "0+0+1", mealTiming: undefined, durationDays: undefined, notes: "" },
    ]);
  });

  it("understands Latin frequency abbreviations", () => {
    const d = parsePrescriptionText("Tab. Metformin 850 mg BD p.c.\nSyp. Ace 120mg/5ml TDS 5 days");
    expect(d.medications.map((m) => [m.name, m.dosage, m.schedule, m.mealTiming, m.durationDays])).toEqual([
      ["Tab Metformin", "850 mg", "1+0+1", "AFTER_MEAL", undefined],
      ["Syp Ace", "120mg/5ml", "1+1+1", undefined, 5],
    ]);
  });

  it("does not mistake dates or ages for schedules, and returns empty fields when nothing is found", () => {
    const d = parsePrescriptionText("Patient seen on 03-11-2026\nAge 45");
    expect(d.medications).toEqual([]);
    expect(d.condition).toBe("");
    expect(d.issuedOn).toBe("2026-11-03");
  });
});
