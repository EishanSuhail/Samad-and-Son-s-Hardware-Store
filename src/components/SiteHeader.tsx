import Link from "next/link";
import { Search } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";
import { Logo } from "./Logo";
import { WhatsAppLink } from "./WhatsAppLink";
import { MobileNav } from "./MobileNav";
import { HeaderCounters } from "./HeaderCounters";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop Products" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 sm:gap-3 py-3 sm:px-6">
        <Logo name={settings.businessName} logoUrl={settings.logoUrl} />

        <form action="/products" method="get" role="search" className="ml-4 hidden flex-1 lg:block">
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Search products, brands or SKU"
              className="h-11 w-full rounded-md border border-line bg-stone pl-9 pr-3 text-sm placeholder:text-muted focus:border-forest focus:bg-white"
            />
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <HeaderCounters />
          <div className="hidden md:block">
            <WhatsAppLink number={settings.whatsappNumber} label="WhatsApp" />
          </div>
          <MobileNav links={NAV_LINKS} whatsappNumber={settings.whatsappNumber} />
        </div>
      </div>

      <nav aria-label="Main" className="hidden border-t border-line lg:block">
        <ul className="mx-auto flex max-w-6xl gap-1 px-6">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-block px-3 py-2.5 text-sm font-semibold text-ink hover:text-forest hover:underline hover:decoration-tape hover:decoration-2 hover:underline-offset-8"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="ruler" aria-hidden="true" />
    </header>
  );
}
