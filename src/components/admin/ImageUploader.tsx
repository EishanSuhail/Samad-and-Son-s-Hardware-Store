"use client";

import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";

export interface UploadedImage {
  url: string;
  altText: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Uploads images to /api/admin/upload and exposes the result as a hidden JSON field named `name`.
 * The server re-validates every URL and every file, so the checks here are only for quick feedback.
 */
export function ImageUploader({
  name,
  initial,
  max = 8,
  withAlt = true,
  label = "Photos",
}: {
  name: string;
  initial: UploadedImage[];
  max?: number;
  withAlt?: boolean;
  label?: string;
}) {
  const [images, setImages] = useState<UploadedImage[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    const room = max - images.length;
    if (room <= 0) return setError(`You can add up to ${max} photo${max === 1 ? "" : "s"}.`);
    setBusy(true);
    const added: UploadedImage[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is larger than 5 MB.`);
        continue;
      }
      const body = new FormData();
      body.set("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) setError(json.error ?? "Upload failed.");
        else added.push({ url: json.url, altText: "" });
      } catch {
        setError("Upload failed. Check your connection and try again.");
      }
    }
    setImages((prev) => [...prev, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(images)} />
      <p className="mb-1 text-sm font-bold">{label}</p>
      {images.length > 0 && (
        <ul className="mb-3 grid gap-3 sm:grid-cols-2">
          {images.map((img, i) => (
            <li key={img.url} className="flex gap-3 rounded-md border border-line bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                {withAlt && (
                  <>
                    <label htmlFor={`${inputId}-alt-${i}`} className="sr-only">
                      Describe photo {i + 1}
                    </label>
                    <input
                      id={`${inputId}-alt-${i}`}
                      value={img.altText}
                      maxLength={200}
                      placeholder="Describe the photo"
                      onChange={(e) => setImages((prev) => prev.map((p, k) => (k === i ? { ...p, altText: e.target.value } : p)))}
                      className="h-9 w-full rounded border border-line px-2 text-xs"
                    />
                  </>
                )}
                <div className="mt-2 flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="rounded border border-line p-1.5 disabled:opacity-40">
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Move photo ${i + 1} later`} className="rounded border border-line p-1.5 disabled:opacity-40">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setImages((prev) => prev.filter((_, k) => k !== i))} aria-label={`Remove photo ${i + 1}`} className="ml-auto rounded border border-danger/40 p-1.5 text-danger">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                {i === 0 && max > 1 && <p className="mt-1 text-xs text-muted">Main photo</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <label
        htmlFor={`${inputId}-file`}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest hover:text-white ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
        {busy ? "Uploading…" : images.length ? "Add more photos" : "Choose photos"}
      </label>
      <input
        id={`${inputId}-file`}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        className="sr-only"
        onChange={(e) => onFiles(e.target.files)}
      />
      <p className="mt-1 text-xs text-muted">JPG, PNG or WebP, up to 5 MB each. Nothing is saved until you press Save.</p>
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
