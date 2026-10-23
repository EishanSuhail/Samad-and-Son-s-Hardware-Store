import Link from "next/link";
import { SearchX } from "lucide-react";
import { getFilterOptions, toQueryString, type ListingParams, type ListingResult } from "@/lib/catalogue";
import { ProductCard } from "./ProductCard";

const SORT_LABELS: Record<ListingParams["sort"], string> = {
  relevance: "Relevance",
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
  price_asc: "Price low to high",
  price_desc: "Price high to low",
};

const field = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm focus:border-forest";

/**
 * Filters are a plain GET form, so they work without JavaScript and every result page has a shareable URL.
 * `categories` is omitted on category pages, where the category is fixed.
 */
export async function ProductListing({
  basePath,
  params,
  result,
  whatsappNumber,
  showStock,
  categories,
  fixedCategorySlug,
}: {
  basePath: string;
  params: ListingParams;
  result: ListingResult;
  whatsappNumber: string;
  showStock: boolean;
  categories?: { name: string; slug: string }[];
  fixedCategorySlug?: string;
}) {
  const { brands, types } = await getFilterOptions(fixedCategorySlug ?? params.category);
  const hasFilters = Boolean(
    params.q || params.category || params.brand || params.type || params.min != null || params.max != null || params.stock,
  );
  const priceNote = params.min != null || params.max != null || params.sort.startsWith("price");

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <form action={basePath} method="get" className="h-fit space-y-4 rounded-lg border border-line bg-stone p-4" aria-label="Filter products">
        <div>
          <label htmlFor="f-q" className="mb-1 block text-sm font-bold">
            Search
          </label>
          <input id="f-q" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Name, brand, SKU or spec" className={field} />
        </div>

        {categories && (
          <div>
            <label htmlFor="f-category" className="mb-1 block text-sm font-bold">
              Category
            </label>
            <select id="f-category" name="category" defaultValue={params.category ?? ""} className={field}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {brands.length > 0 && (
          <div>
            <label htmlFor="f-brand" className="mb-1 block text-sm font-bold">
              Brand
            </label>
            <select id="f-brand" name="brand" defaultValue={params.brand ?? ""} className={field}>
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {types.length > 0 && (
          <div>
            <label htmlFor="f-type" className="mb-1 block text-sm font-bold">
              Product type
            </label>
            <select id="f-type" name="type" defaultValue={params.type ?? ""} className={field}>
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset>
          <legend className="mb-1 text-sm font-bold">Price (₹)</legend>
          <div className="flex items-center gap-2">
            <label htmlFor="f-min" className="sr-only">
              Minimum price
            </label>
            <input id="f-min" name="min" type="number" min={0} step="any" inputMode="decimal" defaultValue={params.min ?? ""} placeholder="Min" className={field} />
            <span aria-hidden="true">–</span>
            <label htmlFor="f-max" className="sr-only">
              Maximum price
            </label>
            <input id="f-max" name="max" type="number" min={0} step="any" inputMode="decimal" defaultValue={params.max ?? ""} placeholder="Max" className={field} />
          </div>
          <p className="mt-1 text-xs text-muted">Products without a listed price are left out when you filter or sort by price.</p>
        </fieldset>

        <div className="flex items-center gap-2">
          <input id="f-stock" name="stock" type="checkbox" value="in" defaultChecked={params.stock === "in"} className="h-5 w-5 accent-forest" />
          <label htmlFor="f-stock" className="text-sm font-semibold">
            Hide out-of-stock items
          </label>
        </div>

        <div>
          <label htmlFor="f-sort" className="mb-1 block text-sm font-bold">
            Sort by
          </label>
          <select id="f-sort" name="sort" defaultValue={params.sort} className={field}>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
            Apply filters
          </button>
          {hasFilters && (
            <Link href={basePath} className="inline-flex min-h-11 items-center rounded-md border border-line bg-white px-4 text-sm font-semibold hover:border-forest">
              Clear
            </Link>
          )}
        </div>
      </form>

      <div>
        <p className="text-sm text-muted" aria-live="polite">
          {result.total === 0 ? "No products found" : `${result.total} product${result.total === 1 ? "" : "s"}`}
          {params.q ? ` for “${params.q}”` : ""}
          {result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : ""}
        </p>

        {result.products.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line p-10 text-center">
            <SearchX className="mx-auto h-10 w-10 text-muted" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-3 font-bold">Nothing matches these filters</p>
            <p className="mt-1 text-sm text-muted">
              {priceNote ? "Price filters only match products with a listed price. " : ""}
              Try fewer filters, or ask us on WhatsApp if we stock it.
            </p>
            {hasFilters && (
              <Link href={basePath} className="mt-4 inline-block text-sm font-semibold text-forest underline underline-offset-4">
                Clear all filters
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} whatsappNumber={whatsappNumber} showStock={showStock} />
              </li>
            ))}
          </ul>
        )}

        {result.pageCount > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-3">
            {result.page > 1 ? (
              <Link
                href={`${basePath}${toQueryString(params, { page: result.page - 1 })}`}
                rel="prev"
                className="inline-flex min-h-11 items-center rounded-md border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest hover:text-white"
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link
                href={`${basePath}${toQueryString(params, { page: result.page + 1 })}`}
                rel="next"
                className="inline-flex min-h-11 items-center rounded-md border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest hover:text-white"
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
