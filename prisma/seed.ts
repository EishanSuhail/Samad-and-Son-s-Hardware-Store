// Development seed. Safe to run repeatedly (uses upserts).
// ALL products created here are SAMPLE data (isSample = true, SKU prefix "SAMPLE-").
// Replace with real inventory (admin panel or CSV import) before launch.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_CATEGORIES, DEFAULT_UNITS, BUSINESS } from "../src/lib/business";
import { slugify } from "../src/lib/slug";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type SampleProduct = {
  n: number;
  name: string;
  category: string; // category slug
  unit: string;
  short: string;
  specs: Record<string, string>;
  pricePaise?: number; // placeholder price, only for a few items so cart maths can be tested
  stock?: number;
  featured?: boolean;
};

const SAMPLES: SampleProduct[] = [
  { n: 1, name: "Interior Emulsion Paint", category: "paints-and-painting-supplies", unit: "Litre", short: "Sample listing for an interior wall paint.", specs: { "Paint type": "Emulsion", Finish: "Matt" }, featured: true },
  { n: 2, name: "PVC Pipe", category: "pvc-pipes-and-fittings", unit: "Piece", short: "Sample listing for a PVC pipe.", specs: { Material: "PVC", Length: "10 ft" }, pricePaise: 25000, stock: 40, featured: true },
  { n: 3, name: "PVC Elbow Fitting", category: "pvc-pipes-and-fittings", unit: "Piece", short: "Sample listing for a PVC elbow.", specs: { Material: "PVC" } },
  { n: 4, name: "PPR Pipe", category: "ppr-pipes-and-fittings", unit: "Piece", short: "Sample listing for a PPR pipe.", specs: { Material: "PPR", Length: "4 m" }, featured: true },
  { n: 5, name: "Plywood Sheet", category: "plywood-and-boards", unit: "Sheet", short: "Sample listing for a plywood sheet.", specs: { Thickness: "18 mm", "Sheet dimensions": "8 ft x 4 ft" }, featured: true },
  { n: 6, name: "Garden Water Hose", category: "garden-pipes-and-water-hoses", unit: "Roll", short: "Sample listing for a garden hose roll.", specs: { Material: "PVC", "Roll configuration": "Single roll" } },
  { n: 7, name: "Cutting Blade", category: "cutting-blades", unit: "Piece", short: "Sample listing for a cutting blade.", specs: { "Blade type": "General purpose" } },
  { n: 8, name: "Sandpaper Sheet", category: "regmal-sandpaper-and-abrasives", unit: "Sheet", short: "Sample listing for sandpaper.", specs: { Grit: "120" }, pricePaise: 1500, stock: 3 },
  { n: 9, name: "Paint Brush", category: "paint-brushes-and-rollers", unit: "Piece", short: "Sample listing for a paint brush.", specs: { Width: "4 inch", "Brush type": "Flat" }, featured: true },
  { n: 10, name: "Plaster of Paris", category: "plaster-of-paris-pop", unit: "Bag", short: "Sample listing for POP.", specs: { "Pack weight": "25 kg" } },
  { n: 11, name: "Wall Putty", category: "wall-putty", unit: "Bag", short: "Sample listing for wall putty.", specs: { "Pack weight": "20 kg" }, pricePaise: 90000, stock: 0 },
  { n: 12, name: "Claw Hammer", category: "hand-tools", unit: "Piece", short: "Sample listing for a hand tool.", specs: {} },
];

async function main() {
  // Units
  for (const [i, u] of DEFAULT_UNITS.entries()) {
    await db.unit.upsert({
      where: { name: u.name },
      update: { shortName: u.shortName, sortOrder: i },
      create: { ...u, sortOrder: i },
    });
  }

  // Categories (all 17, in order)
  for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: { sortOrder: i },
      create: { ...c, sortOrder: i },
    });
  }

  // Settings (only created if missing, so re-seeding never overwrites the owner's edits)
  const defaults: Record<string, unknown> = {
    businessName: BUSINESS.name,
    founderName: BUSINESS.founder,
    address: BUSINESS.addressLine,
    landmark: BUSINESS.landmark,
    whatsappNumber: BUSINESS.whatsappNumber,
    phoneNumber: BUSINESS.whatsappNumber,
    email: "",
    businessHours: "",
    googleMapsUrl: "",
    socialLinks: {},
    aboutText: BUSINESS.aboutText.join("\n\n"),
    whyChooseUs: [...BUSINESS.whyChooseUs],
    orderSubmissionEnabled: true,
    pickupEnabled: true,
    deliveryEnabled: false,
    showStock: true,
    logoUrl: "",
    founderPhotoUrl: "",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as never },
    });
  }

  // Sample products
  const categories = await db.category.findMany();
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));
  for (const p of SAMPLES) {
    const name = `[SAMPLE] ${p.name}`;
    const sku = `SAMPLE-${String(p.n).padStart(3, "0")}`;
    const data = {
      name,
      slug: slugify(`sample-${p.name}`),
      categoryId: bySlug.get(p.category)!,
      shortDescription: p.short,
      description:
        "This is development sample data, not a real product listing. Replace with real inventory before launch.",
      unit: p.unit,
      pricingMode: p.pricePaise ? ("FIXED" as const) : ("PRICE_ON_REQUEST" as const),
      pricePaise: p.pricePaise ?? null,
      trackInventory: p.stock !== undefined,
      stockQuantity: p.stock ?? 0,
      isFeatured: !!p.featured,
      isSample: true,
    };
    const product = await db.product.upsert({
      where: { sku },
      update: data,
      create: { sku, ...data },
    });
    await db.productAttribute.deleteMany({ where: { productId: product.id } });
    const entries = Object.entries(p.specs);
    if (entries.length) {
      await db.productAttribute.createMany({
        data: entries.map(([name, value], i) => ({ productId: product.id, name, value, sortOrder: i })),
      });
    }
  }

  console.log(
    `Seeded ${DEFAULT_UNITS.length} units, ${DEFAULT_CATEGORIES.length} categories, ${SAMPLES.length} SAMPLE products.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
