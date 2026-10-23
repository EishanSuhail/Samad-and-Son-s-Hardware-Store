"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { WhatsAppLink } from "./WhatsAppLink";

export function MobileNav({
  links,
  whatsappNumber,
}: {
  links: { href: string; label: string }[];
  whatsappNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line hover:border-forest"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full border-b border-line bg-white px-4 pb-5 pt-3 shadow-lg sm:px-6"
        >
          <form action="/products" method="get" role="search" className="mb-3">
            <label htmlFor="mobile-search" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="mobile-search"
                name="q"
                type="search"
                placeholder="Search products, brands or SKU"
                className="h-11 w-full rounded-md border border-line bg-stone pl-9 pr-3 text-sm"
              />
            </div>
          </form>
          <nav aria-label="Mobile">
            <ul>
              {links.map((l) => (
                <li key={l.href} className="border-b border-line last:border-0">
                  <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-base font-semibold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <WhatsAppLink number={whatsappNumber} label="Enquire on WhatsApp" className="mt-4 w-full" />
        </div>
      )}
    </div>
  );
}
