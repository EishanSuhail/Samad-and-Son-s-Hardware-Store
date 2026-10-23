import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/uploads";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Serves images stored on the server's own disk (used when Cloudinary is not configured).
// The file name must match exactly what the upload route generates, which rules out path traversal.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const match = /^[a-f0-9]{32}\.(jpg|png|webp)$/.exec(name);
  if (!match) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(/*turbopackIgnore: true*/ uploadDir(), name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
