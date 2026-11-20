import { describe, expect, it } from "vitest";
import { parseAdminEmails } from "@/domain/activity";
import { dailyActivitySeries } from "./activity-series";

describe("dailyActivitySeries", () => {
  it("fills every day (including empty ones) and counts per type in local time", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    const rows = dailyActivitySeries(
      [
        { type: "LOGIN", createdAt: new Date("2026-11-20T01:00:00Z") },
        { type: "LOGIN", createdAt: new Date("2026-11-19T19:30:00Z") }, // 01:30 on the 20th in Dhaka
        { type: "REGISTER", createdAt: new Date("2026-11-18T08:00:00Z") },
        { type: "OTHER", createdAt: new Date("2026-11-20T02:00:00Z") },
      ],
      ["LOGIN", "REGISTER"],
      3,
      "Asia/Dhaka",
      now,
    );
    expect(rows).toEqual([
      { label: "11/18", LOGIN: 0, REGISTER: 1 },
      { label: "11/19", LOGIN: 0, REGISTER: 0 },
      { label: "11/20", LOGIN: 2, REGISTER: 0 },
    ]);
  });
});

describe("parseAdminEmails", () => {
  it("normalises case and spaces and ignores junk", () => {
    expect([...parseAdminEmails(" Owner@Example.com, ,not-an-email,b@x.io")]).toEqual(["owner@example.com", "b@x.io"]);
    expect(parseAdminEmails(undefined).size).toBe(0);
  });
});
