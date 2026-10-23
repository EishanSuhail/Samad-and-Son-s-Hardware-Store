"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ClipboardList, ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

interface Props {
  product: { id: string; slug: string; name: string; sku: string; unit: string; pricePaise: number | null };
  quantity?: number;
  outOfStock?: boolean;
  /** "compact" = small buttons for product cards; "full" = larger buttons for product pages. */
  size?: "compact" | "full";
}

export function AddToListButtons({ product, quantity = 1, outOfStock = false, size = "compact" }: Props) {
  const { add, ready, cart, quote } = useCart();
  const [flash, setFlash] = useState<"cart" | "quote" | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  const line = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    pricePaise: product.pricePaise,
  };
  const inCart = ready && cart.some((l) => l.productId === product.id);
  const inQuote = ready && quote.some((l) => l.productId === product.id);
  const big = size === "full";
  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-semibold min-h-11 transition-colors " +
    (big ? "px-5" : "px-3");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={outOfStock}
        onClick={() => {
          add("cart", line, quantity);
          setFlash("cart");
        }}
        className={`${btn} bg-forest text-white hover:bg-forest-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-muted`}
      >
        {flash === "cart" ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
        {outOfStock ? "Out of stock" : flash === "cart" ? "Added" : "Add to Cart"}
      </button>
      <button
        type="button"
        onClick={() => {
          add("quote", line, quantity);
          setFlash("quote");
        }}
        className={`${btn} border border-forest text-forest hover:bg-forest hover:text-white`}
      >
        {flash === "quote" ? <Check className="h-4 w-4" aria-hidden="true" /> : <ClipboardList className="h-4 w-4" aria-hidden="true" />}
        {flash === "quote" ? "Added" : big ? "Request a Quotation" : "Quote"}
      </button>
      <p role="status" className="sr-only">
        {flash === "cart" ? `${product.name} added to cart` : flash === "quote" ? `${product.name} added to quotation list` : ""}
      </p>
      {(inCart || inQuote) && (
        <span className="flex w-full gap-3 text-xs text-muted">
          {inCart && (
            <Link href="/cart" className="font-semibold text-forest underline underline-offset-2">
              In your cart
            </Link>
          )}
          {inQuote && (
            <Link href="/quotation" className="font-semibold text-forest underline underline-offset-2">
              On your quotation list
            </Link>
          )}
        </span>
      )}
    </div>
  );
}
