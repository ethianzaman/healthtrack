/**
 * Demo data: one Pro user with two profiles and ~60 days of realistic readings.
 * Run with `npm run db:seed`. Login: demo@healthtrack.app / Demo1234
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { suggestTimeOfDay } from "../src/domain/enums";
import type { MealTiming } from "../src/generated/prisma/enums";
import { createPrismaClient } from "../src/server/db/client-factory";

const db = createPrismaClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN });

const DAYS = 60;
const TZ_OFFSET_HOURS = 6; // Asia/Dhaka

const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const chance = (p: number) => Math.random() < p;

/** UTC Date for a local (Dhaka) day offset and hour/minute. */
function localTime(daysAgo: number, hour: number, minute: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour - TZ_OFFSET_HOURS, minute, 0, 0);
  return d;
}

async function seedProfile(profileId: string, opts: { bpBase: number; glucoseBase: number }) {
  const bp = [];
  const glucose = [];
  for (let day = DAYS - 1; day >= 0; day--) {
    // Gradual improvement over time (e.g. after medication change).
    const trend = Math.round((day / DAYS) * 8);
    for (const [hour, morningBoost] of [[7, 8], [20, 0]] as const) {
      if (!chance(0.9)) continue;
      const at = localTime(day, hour, rand(0, 40));
      if (at > new Date()) continue;
      bp.push({
        profileId,
        systolic: opts.bpBase + morningBoost + trend + rand(-8, 8),
        diastolic: Math.round((opts.bpBase + morningBoost + trend) * 0.62) + rand(-5, 5),
        pulse: rand(62, 88),
        timeOfDay: suggestTimeOfDay(hour),
        arm: "LEFT" as const,
        measuredAt: at,
        note: chance(0.05) ? "Felt a bit dizzy" : null,
      });
    }
    const meals: [number, MealTiming, number][] = [
      [7, "FASTING", 0],
      [10, "AFTER_MEAL", 55],
      [19, "BEFORE_MEAL", 10],
      [22, "AFTER_MEAL", 65],
    ];
    for (const [hour, mealTiming, rise] of meals) {
      if (!chance(0.8)) continue;
      const at = localTime(day, hour, rand(0, 50));
      if (at > new Date()) continue;
      const low = chance(0.03);
      glucose.push({
        profileId,
        valueMgDl: low ? rand(55, 68) : opts.glucoseBase + rise + trend * 2 + rand(-15, 20),
        timeOfDay: suggestTimeOfDay(hour),
        mealTiming,
        measuredAt: at,
        note: low ? "Skipped lunch" : null,
      });
    }
  }
  await db.bloodPressureReading.createMany({ data: bp });
  await db.glucoseReading.createMany({ data: glucose });
  return { bp: bp.length, glucose: glucose.length };
}

async function main() {
  const email = "demo@healthtrack.app";
  await db.user.deleteMany({ where: { email } });

  const user = await db.user.create({
    data: {
      email,
      name: "Demo User",
      passwordHash: await bcrypt.hash("Demo1234", 12),
      plan: "PRO",
      timezone: "Asia/Dhaka",
      profiles: {
        create: [
          { name: "Demo User", relation: "Self", isDefault: true, dateOfBirth: new Date("1975-04-12"), gender: "MALE" },
          { name: "Amena Begum", relation: "Mother", dateOfBirth: new Date("1952-09-03"), gender: "FEMALE", bpSystolicTarget: 140, bpDiastolicTarget: 90 },
        ],
      },
    },
    include: { profiles: true },
  });

  const [self, mother] = user.profiles.sort((a) => (a.isDefault ? -1 : 1));
  const a = await seedProfile(self.id, { bpBase: 120, glucoseBase: 104 });
  const b = await seedProfile(mother.id, { bpBase: 140, glucoseBase: 125 });

  await db.medication.createMany({
    data: [
      { profileId: self.id, name: "Amlodipine", dosage: "5 mg", schedule: "1+0+0 after breakfast" },
      { profileId: self.id, name: "Metformin", dosage: "500 mg", schedule: "1+0+1 after meals" },
      { profileId: mother.id, name: "Losartan", dosage: "50 mg", schedule: "1+0+0", notes: "Dr. Rahman" },
      { profileId: mother.id, name: "Insulin glargine", dosage: "14 units", schedule: "At bedtime" },
    ],
  });

  console.log(`Seeded ${email} / Demo1234 - self: ${a.bp} BP, ${a.glucose} glucose; mother: ${b.bp} BP, ${b.glucose} glucose`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
