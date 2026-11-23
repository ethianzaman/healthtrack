import { describe, expect, it } from "vitest";
import { cellText } from "./cells";
import { healthSummaryTables } from "./health-summary";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const med = (o: Partial<Parameters<typeof healthSummaryTables>[0]["all"][number]> & { name: string }) => ({
  dosage: "",
  schedule: "1+0+1",
  condition: null,
  active: true,
  startDate: d("2026-01-01"),
  endDate: null,
  stoppedAt: null,
  stopReason: null,
  prescription: null,
  ...o,
});

describe("healthSummaryTables", () => {
  const amdocal = med({ name: "Amdocal", dosage: "5 mg", schedule: "1+0+0", condition: "Hypertension", startDate: d("2026-11-10"), prescription: { doctorName: "Dr. Kamal" } });
  const comet = med({ name: "Comet", dosage: "500 mg", condition: "Hypertension, Type 2 diabetes" });
  const camlodin = med({ name: "Camlodin", dosage: "10 mg", condition: "Hypertension", active: false, stoppedAt: d("2026-11-15"), stopReason: "Dr. Rina changed it" });
  const antibiotic = med({ name: "Azith", dosage: "500 mg", startDate: d("2026-11-01"), endDate: d("2026-11-04") });

  const tables = healthSummaryTables({
    conditions: [
      { name: "Gastritis", status: "RESOLVED", diagnosedOn: d("2024-03-01"), resolvedOn: d("2024-06-01"), doctorName: null },
      { name: "Type 2 diabetes", status: "ONGOING", diagnosedOn: d("2021-05-01"), resolvedOn: null, doctorName: "Dr. Rina" },
      { name: "Hypertension", status: "ONGOING", diagnosedOn: d("2019-01-01"), resolvedOn: null, doctorName: "Dr. Kamal" },
    ],
    current: [amdocal, comet],
    all: [amdocal, comet, camlodin, antibiotic],
    range: { from: d("2026-10-25"), to: d("2026-11-24") },
    timeZone: "Asia/Dhaka",
  });

  it("lists ongoing conditions first with the medicines that treat each one", () => {
    const rows = tables[0].rows.map((r) => r.cells.map(cellText));
    expect(tables[0].heading).toBe("Conditions");
    expect(rows).toEqual([
      ["Hypertension", "01 Jan 2019", "Ongoing", "Dr. Kamal", "Amdocal 5 mg (1+0+0)\nComet 500 mg (1+0+1)"],
      ["Type 2 diabetes", "01 May 2021", "Ongoing", "Dr. Rina", "Comet 500 mg (1+0+1)"],
      ["Gastritis", "01 Mar 2024", "Resolved 01 Jun 2024", "", ""],
    ]);
  });

  it("lists what changed in the period, in date order", () => {
    expect(tables[1].heading).toBe("Changes in this period");
    expect(tables[1].rows.map((r) => r.cells.map(cellText))).toEqual([
      ["01 Nov 2026", "Started Azith 500 mg", "1+0+1"],
      ["04 Nov 2026", "Finished Azith 500 mg", "Course completed"],
      ["10 Nov 2026", "Started Amdocal 5 mg", "1+0+0 for Hypertension · Dr. Kamal"],
      ["15 Nov 2026", "Stopped Camlodin 10 mg", "Dr. Rina changed it"],
    ]);
  });

  it("returns nothing when there is nothing to show", () => {
    expect(healthSummaryTables({ conditions: [], current: [], all: [], range: { from: d("2026-11-01"), to: d("2026-11-02") }, timeZone: "UTC" })).toEqual([]);
  });
});
