"use client";

import { useState } from "react";
import { Package } from "lucide-react";

export function ProductGallery({ images, name }: { images: { url: string; altText: string | null }[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-line bg-stone text-line">
        <Package className="h-20 w-20" strokeWidth={1.25} aria-hidden="true" />
        <span className="sr-only">No photo available for {name}</span>
      </div>
    );
  }

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={current.altText ?? `${name} — photo ${index + 1}`}
        className="aspect-square w-full rounded-lg border border-line bg-stone object-contain"
      />
      {images.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                className={`h-16 w-16 overflow-hidden rounded-md border-2 ${i === index ? "border-forest" : "border-line"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
