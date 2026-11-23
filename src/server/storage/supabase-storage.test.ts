import { describe, expect, it } from "vitest";
import { createSupabaseStorage } from "./supabase-storage";

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

/** Fake fetch that records requests and answers from a list of handlers. */
function fakeFetch(respond: (c: Call) => Response) {
  const calls: Call[] = [];
  const impl = (async (input: string, init: RequestInit = {}) => {
    const c = { url: String(input), method: init.method ?? "GET", headers: init.headers as Record<string, string>, body: init.body };
    calls.push(c);
    return respond(c);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const config = { url: "https://abc.supabase.co/", serviceKey: "service-key", bucket: "health-files" };

describe("Supabase storage client", () => {
  it("uploads to the private bucket with the service key", async () => {
    const { impl, calls } = fakeFetch(() => new Response("{}", { status: 200 }));
    await createSupabaseStorage(config, impl).put("u1/p1/r1/f 1.jpg", new Uint8Array([1, 2, 3]), "image/jpeg");
    expect(calls[0].url).toBe("https://abc.supabase.co/storage/v1/object/health-files/u1/p1/r1/f%201.jpg");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers).toMatchObject({ Authorization: "Bearer service-key", apikey: "service-key", "Content-Type": "image/jpeg", "x-upsert": "false" });
  });

  it("sends a new-style secret key only as apikey", async () => {
    const { impl, calls } = fakeFetch(() => new Response("{}", { status: 200 }));
    await createSupabaseStorage({ ...config, serviceKey: "sb_secret_abc" }, impl).put("a.jpg", new Uint8Array([1]), "image/jpeg");
    expect(calls[0].headers.apikey).toBe("sb_secret_abc");
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it("creates the bucket once when it doesn't exist yet, then retries the upload", async () => {
    let uploads = 0;
    const { impl, calls } = fakeFetch((c) => {
      if (c.url.endsWith("/bucket")) return new Response("{}", { status: 200 });
      uploads++;
      return uploads === 1 ? new Response('{"error":"Bucket not found"}', { status: 404 }) : new Response("{}", { status: 200 });
    });
    await createSupabaseStorage(config, impl).put("a.jpg", new Uint8Array([1]), "image/jpeg");
    expect(calls.map((c) => c.url.replace("https://abc.supabase.co/storage/v1", ""))).toEqual(["/object/health-files/a.jpg", "/bucket", "/object/health-files/a.jpg"]);
    expect(JSON.parse(String(calls[1].body))).toMatchObject({ id: "health-files", public: false });
  });

  it("returns a full signed link, optionally as a download", async () => {
    const { impl, calls } = fakeFetch(() => Response.json({ signedURL: "/object/sign/health-files/a.jpg?token=xyz" }));
    const storage = createSupabaseStorage(config, impl);
    expect(await storage.signedUrl("a.jpg", 120)).toBe("https://abc.supabase.co/storage/v1/object/sign/health-files/a.jpg?token=xyz");
    expect(JSON.parse(String(calls[0].body))).toEqual({ expiresIn: 120 });
    expect(await storage.signedUrl("a.jpg", 120, "CBC report.jpg")).toMatch(/\?token=xyz&download=CBC%20report\.jpg$/);
  });

  it("deletes in batches and surfaces errors", async () => {
    const { impl, calls } = fakeFetch(() => new Response("[]", { status: 200 }));
    await createSupabaseStorage(config, impl).remove(Array.from({ length: 150 }, (_, i) => `k${i}`));
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1].body)).prefixes).toHaveLength(50);

    const broken = fakeFetch(() => new Response("nope", { status: 500 }));
    await expect(createSupabaseStorage(config, broken.impl).put("a", new Uint8Array(), "image/jpeg")).rejects.toThrow(/upload failed \(500\)/);
  });
});
