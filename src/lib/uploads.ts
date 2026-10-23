import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageKind = { ext: "jpg" | "png" | "webp"; mime: string };

/** Identifies an image by its first bytes. The browser-supplied type and file name are never trusted. SVG is refused on purpose (it can carry scripts). */
export function sniffImage(buf: Uint8Array): ImageKind | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => buf[i] === b)) return { ext: "png", mime: "image/png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export const uploadDir = () => process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

const cloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

async function uploadToCloudinary(buf: Uint8Array, kind: ImageKind): Promise<{ url: string; publicId: string }> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "samad-hardware";
  // Signature = sha1 of the sorted params (excluding file/api_key) followed by the API secret.
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`).digest("hex");
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(buf)], { type: kind.mime }), `upload.${kind.ext}`);
  form.set("api_key", process.env.CLOUDINARY_API_KEY!);
  form.set("timestamp", timestamp);
  form.set("folder", folder);
  form.set("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Image storage rejected the upload (${res.status}).`);
  const json = (await res.json()) as { secure_url: string; public_id: string };
  return { url: json.secure_url, publicId: json.public_id };
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Image storage is not set up. Add the Cloudinary settings to the hosting environment.");
    this.name = "StorageNotConfiguredError";
  }
}

/** Stores a validated image: Cloudinary when configured, otherwise the server's upload folder. */
export async function storeImage(buf: Uint8Array, kind: ImageKind): Promise<{ url: string; publicId?: string }> {
  if (cloudinaryConfigured()) return uploadToCloudinary(buf, kind);
  // Vercel's disk is read-only/ephemeral: a "successful" local save would lose the photo. Fail loudly instead.
  if (process.env.VERCEL && !process.env.UPLOAD_DIR) throw new StorageNotConfiguredError();
  const name = `${randomBytes(16).toString("hex")}.${kind.ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ uploadDir(), name), buf, { flag: "wx" });
  return { url: `/uploads/${name}` };
}

/** Only images this app stored itself (or on its own Cloudinary account) may be saved against products and categories. */
export function isAllowedImageUrl(url: string): boolean {
  if (/^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(url)) return true;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (cloud) {
    try {
      const u = new URL(url);
      return u.protocol === "https:" && u.hostname === "res.cloudinary.com" && u.pathname.startsWith(`/${cloud}/image/upload/`);
    } catch {
      return false;
    }
  }
  return false;
}
