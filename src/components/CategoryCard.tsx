import Link from "next/link";
import {
  BrickWall,
  Droplet,
  Droplets,
  Eraser,
  Flame,
  Hammer,
  Layers,
  Nut,
  Package,
  Boxes,
  PaintBucket,
  PaintRoller,
  Paintbrush,
  Shapes,
  Slice,
  Sprout,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "paints-and-painting-supplies": PaintBucket,
  "pvc-pipes-and-fittings": Droplets,
  "ppr-pipes-and-fittings": Flame,
  "plywood-and-boards": Layers,
  "garden-pipes-and-water-hoses": Sprout,
  "cutting-blades": Slice,
  "regmal-sandpaper-and-abrasives": Eraser,
  "paint-brushes-and-rollers": Paintbrush,
  "plaster-of-paris-pop": Shapes,
  "wall-putty": PaintRoller,
  "plumbing-materials": Wrench,
  "construction-materials": BrickWall,
  "hand-tools": Hammer,
  "adhesives-and-sealants": Droplet,
  "screws-nails-and-fasteners": Nut,
  "general-hardware-items": Package,
  "other-hardware-products": Boxes,
};

export function CategoryCard({
  category,
}: {
  category: { name: string; slug: string; description: string | null; imageUrl: string | null; _count?: { products: number } };
}) {
  const Icon = ICONS[category.slug] ?? Package;
  const count = category._count?.products;
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white transition-colors hover:border-forest"
    >
      {category.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={category.imageUrl} alt={category.name} loading="lazy" className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center bg-stone text-forest transition-colors group-hover:bg-forest group-hover:text-white">
          <Icon className="h-9 w-9" strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold">{category.name}</h3>
        {category.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{category.description}</p>}
        {count !== undefined && (
          <p className="mt-auto pt-3 text-xs font-semibold text-forest">
            {count === 0 ? "No products listed yet" : `${count} product${count === 1 ? "" : "s"}`}
          </p>
        )}
      </div>
    </Link>
  );
}
