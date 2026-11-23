import { describe, expect, it } from "vitest";
import { chunkBytes, cleanFileName, sniffFileType } from "./lab-reports";

describe("test report files", () => {
  it("detects the real file type from its first bytes", () => {
    expect(sniffFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffFileType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffFileType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffFileType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffFileType(new TextEncoder().encode("<html><script>"))).toBeNull();
  });

  it("splits into chunks and joins back to the same bytes", () => {
    const bytes = new Uint8Array(1300).map((_, i) => i % 251);
    const parts = chunkBytes(bytes, 512);
    expect(parts.map((p) => p.length)).toEqual([512, 512, 276]);
    const joined = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) {
      joined.set(p, o);
      o += p.length;
    }
    expect(joined).toEqual(bytes);
  });

  it("cleans file names and fixes the extension", () => {
    expect(cleanFileName("photos/fakepath/CBC report.jpeg", "image/jpeg")).toBe("CBC report.jpg");
    expect(cleanFileName('x"<script>.html', "application/pdf")).toBe("xscript.pdf");
    expect(cleanFileName("", "image/png")).toBe("report.png");
    expect(cleanFileName(String.raw`C:\fakepath\scan.png`, "image/png")).toBe("scan.png");
  });
});
