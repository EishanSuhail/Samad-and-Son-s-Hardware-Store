"use client";

import Link from "next/link";
import { ClipboardList, ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

function Counter({ href, label, count, children }: { href: string; label: string; count: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label}, ${count} item${count === 1 ? "" : "s"}` : label}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-ink hover:border-forest hover:text-forest"
    >
      {children}
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1 text-xs font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function HeaderCounters() {
  const { cart, quote, ready } = useCart();
  return (
    <>
      <Counter href="/quotation" label="Quotation list" count={ready ? quote.length : 0}>
        <ClipboardList className="h-5 w-5" aria-hidden="true" />
      </Counter>
      <Counter href="/cart" label="Shopping cart" count={ready ? cart.length : 0}>
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      </Counter>
    </>
  );
}
