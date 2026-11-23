import { describe, expect, it } from "vitest";
import { splitConditions, treats } from "./conditions";

describe("conditions", () => {
  it("splits a prescription's condition text into names", () => {
    expect(splitConditions("Hypertension, Type 2 diabetes")).toEqual(["Hypertension", "Type 2 diabetes"]);
    expect(splitConditions("HTN + DM and CKD; htn")).toEqual(["HTN", "DM", "CKD"]);
    expect(splitConditions("")).toEqual([]);
    expect(splitConditions(null)).toEqual([]);
  });

  it("links a medicine to a condition by name, ignoring case and punctuation", () => {
    expect(treats("Hypertension, Type 2 diabetes", "type 2 diabetes")).toBe(true);
    expect(treats("Gastritis / GERD", "Gastritis/GERD")).toBe(true);
    expect(treats("Hypertension", "Type 2 diabetes")).toBe(false);
    expect(treats(null, "Hypertension")).toBe(false);
  });
});
