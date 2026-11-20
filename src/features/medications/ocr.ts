"use client";

/**
 * Reads text from a prescription photo entirely in the browser (Tesseract.js, free,
 * no API key). The image never leaves the device. Swap this module for a hosted
 * vision model later without touching the parser or the review form.
 */

const MAX_SIDE = 2000;

/** Downscale + greyscale + contrast: faster OCR and better accuracy on phone photos. */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.filter = "grayscale(1) contrast(1.35)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function readPrescriptionImage(file: File, onProgress: (fraction: number, label: string) => void): Promise<string> {
  onProgress(0, "Preparing photo");
  const canvas = await prepare(file);
  // Loaded on demand: the OCR engine (~2-3 MB, cached by the browser) only downloads when someone scans.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(m.progress, "Reading text");
      else onProgress(0, m.status.includes("load") ? "Loading reader (first time only)" : "Starting reader");
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
