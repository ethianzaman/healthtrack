/**
 * Browser-only: shrinks a phone photo before upload so it is quick to send and small to store,
 * while staying sharp enough to read printed lab values (long side 2000 px, JPEG ~0.82).
 * PDFs and already-small images are sent as they are.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (file.type === "application/pdf" || !file.type.startsWith("image/")) return file;
  if (file.size < 350 * 1024 && file.type !== "image/heic") return file;

  const MAX_SIDE = 2000;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // unknown format: let the server decide
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff"; // transparent PNG areas become white, not black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
}

/** Small JPEG preview (long side 480 px) for report lists, so lists don't download full pages. */
export async function makeThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  } catch {
    return null;
  }
}
