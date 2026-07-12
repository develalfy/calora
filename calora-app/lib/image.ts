// Image compression — runs in the browser before upload.
// Goal: turn a 3-5MB phone photo into a small (~200-500KB) JPEG data URL so the
// API call stays fast and cheap, while remaining robust to:
//   - HEIC iPhone photos (createImageBitmap rejects them)
//   - Animated GIFs
//   - WebP / AVIF
//   - Corrupt files
//
// Tries, in order:
//   1. createImageBitmap(file)           — fastest, supports most modern formats
//   2. <img> element + canvas redraw     — covers HEIC on iOS Safari, and any
//                                          format the browser can natively decode
//   3. Heic detection + helpful guidance — if we know it's HEIC and both decoders
//                                          failed, tell the user what to do
//   4. Raw file read fallback            — last resort, sends the original bytes
//                                          to the server, which can downscale via
//                                          sharp / the AI provider directly

export type CompressionResult =
  | { ok: true; dataUrl: string; mime: string; width: number; height: number; bytes: number }
  | { ok: false; error: string; userMessage: string; heicHint?: boolean };

export async function compressImage(
  file: File,
  maxDimension = 1024,
  quality = 0.82,
): Promise<string> {
  const r = await compressImageSafe(file, maxDimension, quality);
  if (!r.ok) throw new Error(r.userMessage);
  return r.dataUrl;
}

// New: returns structured result so callers can surface HEIC-specific guidance.
export async function compressImageSafe(
  file: File,
  maxDimension = 1024,
  quality = 0.82,
): Promise<CompressionResult> {
  // Detect HEIC up front so we can give a tailored message if everything fails.
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name);

  // 1) Try createImageBitmap (modern, fastest)
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const out = drawToJpegDataUrl(bitmap, maxDimension, quality);
      bitmap.close?.();
      return { ok: true, ...out, bytes: file.size };
    } catch (e) {
      bitmap.close?.();
      throw e;
    }
  } catch (e1) {
    if (typeof console !== "undefined") {
      console.warn(
        "createImageBitmap failed, falling back to <img> element:",
        e1,
      );
    }
  }

  // 2) Fallback: <img> element handles HEIC on iOS Safari, AVIF, WebP, etc.
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () =>
          reject(
            new Error(
              `decode failed (type=${file.type || "unknown"}, name=${file.name})`,
            ),
          );
        i.src = url;
      });
      const out = drawToJpegDataUrl(img, maxDimension, quality);
      URL.revokeObjectURL(url);
      return { ok: true, ...out, bytes: file.size };
    } catch (e2) {
      URL.revokeObjectURL(url);
      throw e2;
    }
  } catch (e3) {
    if (typeof console !== "undefined") {
      console.warn("<img> fallback also failed:", e3);
    }
  }

  // 3) Both decoders failed — give the user actionable guidance.
  if (isHeic) {
    return {
      ok: false,
      error: "HEIC could not be decoded by this browser",
      userMessage:
        "This iPhone photo (HEIC) couldn't be read in your browser. Try one of: take the photo in 'Most Compatible' mode (Settings → Camera → Formats), AirDrop it to a Mac first, or just type what you ate below.",
      heicHint: true,
    };
  }

  // 4) Generic failure
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  return {
    ok: false,
    error: `decoder failed for type=${file.type || "unknown"}`,
    userMessage: `Couldn't read this image (${file.type || "unknown format"}, ${sizeMb}MB). Try a different photo, or describe it in the box below.`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function drawToJpegDataUrl(
  source: ImageBitmap | HTMLImageElement,
  maxDimension: number,
  quality: number,
): { dataUrl: string; mime: string; width: number; height: number } {
  const sw =
    "naturalWidth" in source
      ? source.naturalWidth
      : (source as ImageBitmap).width;
  const sh =
    "naturalHeight" in source
      ? source.naturalHeight
      : (source as ImageBitmap).height;
  if (!sw || !sh) {
    throw new Error("image has zero dimensions");
  }
  const scale = Math.min(1, maxDimension / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, mime: "image/jpeg", width: w, height: h };
}

// Read a File as a base64 data URL without any decoding (last-resort fallback
// for the API path — server-side still works with the original file).
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}