// Image compression — runs entirely in the browser before upload.
// Cuts a 3-5MB phone photo down to ~300-500KB JPEG so the API call stays fast + cheap.
// Falls back gracefully if createImageBitmap fails (HEIC iPhone photos, animated GIFs, etc.)

export async function compressImage(
  file: File,
  maxDimension = 1024,
  quality = 0.82,
): Promise<string> {
  // 1) Try createImageBitmap (modern, fastest)
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    console.warn("createImageBitmap failed, falling back to <img> element:", e);
  }

  // 2) Fallback: load via <img> element (handles formats createImageBitmap rejects, e.g. HEIC on some browsers)
  if (!bitmap) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error(`Could not decode image (type=${file.type}, size=${file.size}B)`));
        i.src = url;
      });
      // Wrap in a canvas to draw — needed for toDataURL
      const w = Math.min(img.naturalWidth, maxDimension);
      const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(url);
      return dataUrl;
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }

  // 3) Normal path: compress from ImageBitmap
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", quality);
}