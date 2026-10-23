import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_IMAGE_BYTES, sniffImage, storeImage, StorageNotConfiguredError } from "@/lib/uploads";

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // CSRF defence on top of SameSite=Lax: a browser form from another site would carry a foreign Origin.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  }

  const limit = rateLimit(`upload:${admin.id}`, 60, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many uploads. Wait a few minutes and try again." }, { status: 429 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: `That image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return NextResponse.json({ error: "Only JPG, PNG or WebP images are allowed." }, { status: 415 });

  try {
    const stored = await storeImage(bytes, kind);
    return NextResponse.json(stored);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("Image upload failed", error);
    return NextResponse.json({ error: "The image could not be saved. Try again." }, { status: 502 });
  }
}
