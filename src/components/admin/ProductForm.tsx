"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { saveProductAction, type ProductFormState } from "@/app/(admin)/admin/(panel)/products/actions";
import { useFormAction } from "@/lib/use-form-action";
import { ImageUploader, type UploadedImage } from "./ImageUploader";

export interface ProductFormData {
  id?: string;
  name: string;
  sku: string;
  slug: string;
  categoryId: string;
  subcategory: string;
  brand: string;
  shortDescription: string;
  description: string;
  unit: string;
  pricingMode: "FIXED" | "PRICE_ON_REQUEST";
  price: string;
  salePrice: string;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  isActive: boolean;
  isSample: boolean;
  attributes: { name: string; value: string }[];
  images: UploadedImage[];
}

const initial: ProductFormState = {};
const input = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm focus:border-forest";
const area = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-forest";

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function ProductForm({
  product,
  categories,
  units,
  brands,
  specHints,
}: {
  product: ProductFormData;
  categories: { id: string; name: string; slug: string }[];
  units: string[];
  brands: string[];
  /** Suggested specification names per category id. */
  specHints: Record<string, string[]>;
}) {
  const { state, pending, onSubmit } = useFormAction(saveProductAction, initial);
  const [pricingMode, setPricingMode] = useState(product.pricingMode);
  const [track, setTrack] = useState(product.trackInventory);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [attrs, setAttrs] = useState(product.attributes);
  const err = state.fieldErrors ?? {};
  const hints = (specHints[categoryId] ?? []).filter((h) => !attrs.some((a) => a.name.toLowerCase() === h.toLowerCase()));

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {product.id && <input type="hidden" name="id" value={product.id} />}
      {product.isSample && (
        <p className="rounded-md border border-tape bg-tape/20 px-3 py-2 text-sm font-semibold">
          This is development sample data. Edit it into a real product or archive it before launch.
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Basics</h2>
        <Field id="name" label="Product name" error={err.name}>
          <input id="name" name="name" defaultValue={product.name} className={input} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sku" label="SKU" hint="Your own unique code for this product." error={err.sku}>
            <input id="sku" name="sku" defaultValue={product.sku} className={input} />
          </Field>
          <Field id="slug" label="Web address (optional)" hint="Leave empty to create it from the name." error={err.slug}>
            <input id="slug" name="slug" defaultValue={product.slug} className={input} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="categoryId" label="Category" error={err.categoryId}>
            <select id="categoryId" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="subcategory" label="Product type (optional)" hint="Used for the Product type filter, for example Emulsion or Elbow." error={err.subcategory}>
            <input id="subcategory" name="subcategory" defaultValue={product.subcategory} className={input} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="brand" label="Brand (optional)" error={err.brand}>
            <input id="brand" name="brand" list="brand-list" defaultValue={product.brand} className={input} />
            <datalist id="brand-list">
              {brands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>
          <Field id="unit" label="Sold per (unit)" error={err.unit}>
            <select id="unit" name="unit" defaultValue={product.unit} className={input}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="shortDescription" label="Short description" hint="One or two lines shown on product cards." error={err.shortDescription}>
          <textarea id="shortDescription" name="shortDescription" rows={2} defaultValue={product.shortDescription} className={area} />
        </Field>
        <Field id="description" label="Full description" hint="Only facts you are sure of. Separate paragraphs with a blank line." error={err.description}>
          <textarea id="description" name="description" rows={6} defaultValue={product.description} className={area} />
        </Field>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Price</h2>
        <Field id="pricingMode" label="Pricing" error={err.pricingMode}>
          <select id="pricingMode" name="pricingMode" value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "FIXED" | "PRICE_ON_REQUEST")} className={input}>
            <option value="PRICE_ON_REQUEST">Price on Request (no price shown)</option>
            <option value="FIXED">Fixed price</option>
          </select>
        </Field>
        {pricingMode === "FIXED" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="price" label="Price per unit (₹)" error={err.price}>
              <input id="price" name="price" inputMode="decimal" defaultValue={product.price} className={input} />
            </Field>
            <Field id="salePrice" label="Sale price (₹, optional)" hint="Must be lower than the price." error={err.salePrice}>
              <input id="salePrice" name="salePrice" inputMode="decimal" defaultValue={product.salePrice} className={input} />
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Stock</h2>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="trackInventory" checked={track} onChange={(e) => setTrack(e.target.checked)} className="mt-0.5 h-5 w-5 accent-forest" />
          <span>
            <span className="block text-sm font-bold">Track stock for this product</span>
            <span className="block text-xs text-muted">When off, no stock status is shown and orders never block on stock.</span>
          </span>
        </label>
        {track && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="stockQuantity" label="Quantity in stock" hint="Changing this records a stock adjustment." error={err.stockQuantity}>
              <input id="stockQuantity" name="stockQuantity" inputMode="numeric" defaultValue={product.stockQuantity} className={input} />
            </Field>
            <Field id="lowStockThreshold" label="Low-stock warning at" error={err.lowStockThreshold}>
              <input id="lowStockThreshold" name="lowStockThreshold" inputMode="numeric" defaultValue={product.lowStockThreshold} className={input} />
            </Field>
          </div>
        )}
        {!track && (
          <>
            <input type="hidden" name="stockQuantity" value={product.stockQuantity} />
            <input type="hidden" name="lowStockThreshold" value={product.lowStockThreshold} />
          </>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Specifications</h2>
        <input type="hidden" name="attributes" value={JSON.stringify(attrs.filter((a) => a.name.trim() && a.value.trim()))} />
        {attrs.map((a, i) => (
          <div key={i} className="flex gap-2">
            <label className="sr-only" htmlFor={`spec-name-${i}`}>
              Specification name {i + 1}
            </label>
            <input id={`spec-name-${i}`} value={a.name} placeholder="Name, e.g. Thickness" onChange={(e) => setAttrs((p) => p.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} className={input} />
            <label className="sr-only" htmlFor={`spec-value-${i}`}>
              Specification value {i + 1}
            </label>
            <input id={`spec-value-${i}`} value={a.value} placeholder="Value, e.g. 18 mm" onChange={(e) => setAttrs((p) => p.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} className={input} />
            <button type="button" aria-label={`Remove specification ${i + 1}`} onClick={() => setAttrs((p) => p.filter((_, k) => k !== i))} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line hover:border-danger hover:text-danger">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {err.attributes && <p className="text-xs font-semibold text-danger">{err.attributes}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setAttrs((p) => [...p, { name: "", value: "" }])} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-forest px-3 text-sm font-semibold text-forest hover:bg-forest hover:text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add specification
          </button>
          {hints.map((h) => (
            <button key={h} type="button" onClick={() => setAttrs((p) => [...p.filter((x) => x.name || x.value), { name: h, value: "" }])} className="min-h-10 rounded-full border border-line px-3 text-xs font-semibold hover:border-forest">
              + {h}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <ImageUploader name="images" initial={product.images} max={8} />
        {err.images && <p className="mt-2 text-xs font-semibold text-danger">{err.images}</p>}
      </section>

      <section className="grid gap-3 rounded-lg border border-line bg-white p-5 sm:grid-cols-2">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="mt-0.5 h-5 w-5 accent-forest" />
          <span>
            <span className="block text-sm font-bold">Published</span>
            <span className="block text-xs text-muted">Untick to hide from the website (archive).</span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} className="mt-0.5 h-5 w-5 accent-forest" />
          <span>
            <span className="block text-sm font-bold">Featured on the homepage</span>
          </span>
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-forest px-6 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-60">
          {pending ? "Saving…" : product.id ? "Save product" : "Create product"}
        </button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`text-sm font-semibold ${state.ok ? "text-forest" : "text-danger"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
