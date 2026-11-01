/**
 * Browser helpers for the import: shrink photos before sending them to
 * /api/read (max 2000 px on the long side, JPEG 0.85) and hash files so a file
 * imported before can be recognised.
 */

export const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.85;
/** Files at or under this size and within MAX_SIDE are sent as they are. */
const SMALL_BYTES = 2 * 1024 * 1024;
/** Types /api/read accepts as images. */
const SENDABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const HEIC_MESSAGE = 'HEIC photos cannot be read in the browser. Send a screenshot or a JPEG instead.';

/** Size that fits in max x max, keeping the shape. Never scales up. */
export function fitWithin(w: number, h: number, max = MAX_SIDE): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= max) return { w, h };
  const scale = max / long;
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

export function isHeic(file: { type: string; name: string }): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** JPEG has no transparency: paint white first so clear pixels do not turn black. */
function paint(ctx: Ctx2D, img: ImageBitmap, w: number, h: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
}

async function encodeJpeg(img: ImageBitmap, w: number, h: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not shrink the image');
    paint(ctx, img, w, h);
    return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not shrink the image');
  paint(ctx, img, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not shrink the image'))), 'image/jpeg', JPEG_QUALITY),
  );
}

/**
 * The image to send: the original when it is already small, else a JPEG at most
 * 2000 px on the long side. Throws HEIC_MESSAGE for HEIC photos.
 */
export async function downscaleImage(file: File): Promise<Blob> {
  if (isHeic(file)) throw new Error(HEIC_MESSAGE);
  const img = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { w, h } = fitWithin(img.width, img.height);
    const fits = w === img.width && h === img.height;
    if (fits && file.size <= SMALL_BYTES && SENDABLE.has(file.type)) return file;
    return await encodeJpeg(img, w, h);
  } finally {
    img.close();
  }
}

/** Lowercase hex SHA-256 of the file bytes. */
export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
