import Link from "next/link";
import { Package } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { STOCK_LABEL, priceInfo, stockStatus, type CardProduct } from "@/lib/product-helpers";
import { productEnquiryMessage } from "@/lib/whatsapp";
import { AddToListButtons } from "./AddToListButtons";
import { WhatsAppLink } from "./WhatsAppLink";

export function ProductCard({
  product,
  whatsappNumber,
  showStock,
}: {
  product: CardProduct;
  whatsappNumber: string;
  showStock: boolean;
}) {
  const { current, original } = priceInfo(product);
  const status = stockStatus(product);
  const stockLabel = showStock ? STOCK_LABEL[status] : null;
  const image = product.images[0];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white">
      <Link href={`/products/${product.slug}`} className="relative block bg-stone" tabIndex={-1} aria-hidden="true">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.altText ?? product.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-line">
            <Package className="h-12 w-12" strokeWidth={1.25} aria-hidden="true" />
          </div>
        )}
        {product.isSample && (
          <span className="absolute left-2 top-2 rounded bg-tape px-2 py-0.5 text-xs font-bold text-ink">Sample data</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold text-forest">
          <Link href={`/categories/${product.category.slug}`} className="hover:underline">
            {product.category.name}
          </Link>
          {product.brand && <span className="text-muted"> · {product.brand.name}</span>}
        </p>
        <h3 className="mt-1 text-base font-bold leading-snug">
          <Link href={`/products/${product.slug}`} className="hover:text-forest hover:underline">
            {product.name}
          </Link>
        </h3>
        {product.shortDescription && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{product.shortDescription}</p>}

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
          {current != null ? (
            <>
              <span className="text-lg font-extrabold">{formatPaise(current)}</span>
              {original != null && <span className="text-sm text-muted line-through">{formatPaise(original)}</span>}
              <span className="text-sm text-muted">per {product.unit}</span>
            </>
          ) : (
            <>
              <span className="text-base font-bold">Price on Request</span>
              <span className="text-sm text-muted">per {product.unit}</span>
            </>
          )}
        </div>
        {product.isSample && current != null && (
          <p className="mt-1 text-xs text-muted">Placeholder price for development only.</p>
        )}
        {stockLabel && (
          <p
            className={`mt-1 text-xs font-semibold ${status === "OUT_OF_STOCK" ? "text-danger" : status === "LOW_STOCK" ? "text-[#8a5a00]" : "text-forest"}`}
          >
            {stockLabel}
          </p>
        )}

        <div className="mt-auto space-y-2 pt-4">
          <AddToListButtons
            product={{ id: product.id, slug: product.slug, name: product.name, sku: product.sku, unit: product.unit, pricePaise: current }}
            outOfStock={status === "OUT_OF_STOCK"}
          />
          <div className="flex items-center justify-between gap-2">
            <Link href={`/products/${product.slug}`} className="text-sm font-semibold text-forest underline underline-offset-4">
              View Details
            </Link>
            <WhatsAppLink
              number={whatsappNumber}
              variant="outline"
              label="Enquire on WhatsApp"
              message={productEnquiryMessage({ name: product.name, sku: product.sku, unit: product.unit, quantity: 1, pricePaise: current })}
              className="!min-h-9 !px-3 !text-xs"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
