import { z } from "zod";
import { rupeesToPaise } from "./money";
import { isAllowedImageUrl } from "./uploads";

const intField = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,7}$/, `${label} must be a whole number.`)
    .transform(Number);

const jsonField = <T extends z.ZodType>(schema: T, label: string) =>
  z.string().transform((raw, ctx) => {
    try {
      return schema.parse(JSON.parse(raw || "[]")) as z.output<T>;
    } catch {
      ctx.addIssue({ code: "custom", message: `${label} are not valid.` });
      return z.NEVER;
    }
  });

const attributeList = z
  .array(z.object({ name: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) }))
  .max(30)
  .refine((list) => new Set(list.map((a) => a.name.toLowerCase())).size === list.length, { message: "Each specification name can only be used once." });

const imageList = z
  .array(z.object({ url: z.string().refine(isAllowedImageUrl, { message: "Image is not from this store's uploads." }), altText: z.string().trim().max(200).default("") }))
  .max(10);

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the product name.").max(160),
    sku: z
      .string()
      .trim()
      .min(1, "Enter a SKU.")
      .max(60)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/, "Use letters, numbers and . _ - / only."),
    slug: z.string().trim().max(100).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and hyphens only."),
    categoryId: z.string().min(1, "Choose a category."),
    subcategory: z.string().trim().max(80),
    brand: z.string().trim().max(80),
    shortDescription: z.string().trim().max(300, "Keep the short description under 300 characters."),
    description: z.string().trim().max(5000),
    unit: z.string().trim().min(1, "Choose a unit.").max(30),
    pricingMode: z.enum(["FIXED", "PRICE_ON_REQUEST"]),
    price: z.string().trim(),
    salePrice: z.string().trim(),
    trackInventory: z.boolean(),
    stockQuantity: intField("Stock"),
    lowStockThreshold: intField("Low-stock threshold"),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    attributes: jsonField(attributeList, "Specifications"),
    images: jsonField(imageList, "Images"),
  })
  .superRefine((v, ctx) => {
    if (v.pricingMode === "FIXED") {
      const price = rupeesToPaise(v.price);
      if (price === null || price <= 0) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price like 250 or 250.50." });
      if (v.salePrice !== "") {
        const sale = rupeesToPaise(v.salePrice);
        if (sale === null || sale <= 0) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Enter a sale price like 199 or 199.50." });
        else if (price !== null && sale >= price) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "The sale price must be lower than the price." });
      }
    }
  });

export type ProductFormValues = z.output<typeof productFormSchema>;
