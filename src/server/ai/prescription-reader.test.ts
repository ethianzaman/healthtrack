import { describe, expect, it } from "vitest";
import { draftFromAi, normaliseSchedule, readPrescriptionWithGemini } from "./prescription-reader";

const today = new Date("2026-11-26T00:00:00Z");

describe("AI prescription answer -> draft", () => {
  it("maps and cleans every field", () => {
    const draft = draftFromAi(
      {
        readable: true,
        doctorName: "  Dr. Md. Kamal Hossain ",
        doctorSpecialty: "Cardiologist",
        issuedOn: "২০২৬-১১-১২",
        conditions: ["Hypertension", "Type 2 diabetes", "Hypertension"],
        medications: [
          { form: "Tablet", name: "Tab. Amdocal", strength: "5 mg", schedule: "১-০-১", mealTiming: "AFTER_MEAL", continues: true },
          { form: "Capsule", name: "Seclo", strength: "20 mg", schedule: "1 + 0 + 1", mealTiming: "BEFORE_MEAL", durationDays: 14, continues: false },
          { form: "Spaceship", name: "Napa", schedule: "when needed", mealTiming: "UNKNOWN", durationDays: 0 },
          { name: "   ", schedule: "1+0+0" },
        ],
      },
      today,
    );
    expect(draft).toEqual({
      doctorName: "Dr. Md. Kamal Hossain",
      doctorSpecialty: "Cardiologist",
      issuedOn: "2026-11-12",
      condition: "Hypertension, Type 2 diabetes",
      medications: [
        { name: "Amdocal", dosage: "5 mg", schedule: "1+0+1", mealTiming: "AFTER_MEAL", durationDays: null, notes: "", form: "Tablet" },
        { name: "Seclo", dosage: "20 mg", schedule: "1+0+1", mealTiming: "BEFORE_MEAL", durationDays: 14, notes: "", form: "Capsule" },
        { name: "Napa", dosage: "", schedule: "when needed", mealTiming: undefined, durationDays: undefined, notes: "", form: undefined },
      ],
    });
  });

  it("rejects impossible or future dates and junk input", () => {
    expect(draftFromAi({ issuedOn: "2026-02-30", medications: [] }, today).issuedOn).toBe("");
    expect(draftFromAi({ issuedOn: "2027-05-01", medications: [] }, today).issuedOn).toBe("");
    expect(draftFromAi("nonsense", today)).toEqual({ doctorName: "", doctorSpecialty: undefined, issuedOn: "", condition: "", medications: [] });
  });

  it("normalises schedules", () => {
    expect(normaliseSchedule("1/2-0-1/2")).toBe("½+0+½");
    expect(normaliseSchedule("1+1+1+1")).toBe("1+1+1+1");
    expect(normaliseSchedule("after lunch")).toBe("after lunch");
  });
});

describe("Gemini call", () => {
  const image = { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mimeType: "image/jpeg" };
  const config = { apiKey: "k", model: "gemini-2.5-flash" };

  it("sends the photo with a JSON schema and reads the answer", async () => {
    let sent: { url: string; headers: Record<string, string>; body: { contents: { parts: Record<string, unknown>[] }[]; generationConfig: Record<string, unknown> } } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      sent = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ readable: true, medications: [{ name: "Napa", schedule: "1+1+1" }] }) }] } }] });
    }) as unknown as typeof fetch;
    const draft = await readPrescriptionWithGemini(image, config, fetchImpl);
    expect(sent?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
    expect(sent?.headers["x-goog-api-key"]).toBe("k");
    expect(sent?.body.contents[0].parts[0]).toEqual({ inline_data: { mime_type: "image/jpeg", data: "/9j/" } });
    expect(sent?.body.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json" });
    expect(draft.medications[0]).toMatchObject({ name: "Napa", schedule: "1+1+1" });
  });

  it("reports the free limit and unreadable photos clearly", async () => {
    const quota = (async () => new Response("{}", { status: 429 })) as unknown as typeof fetch;
    await expect(readPrescriptionWithGemini(image, config, quota)).rejects.toMatchObject({ kind: "quota" });
    const notRx = (async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"readable":false,"medications":[]}' }] } }] })) as unknown as typeof fetch;
    await expect(readPrescriptionWithGemini(image, config, notRx)).rejects.toMatchObject({ kind: "unreadable" });
  });
});
