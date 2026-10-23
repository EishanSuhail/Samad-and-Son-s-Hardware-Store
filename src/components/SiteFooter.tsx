import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";
import { telLink } from "@/lib/settings";
import { Logo } from "./Logo";
import { WhatsAppLink } from "./WhatsAppLink";

export function SiteFooter({
  settings,
  categories,
}: {
  settings: SiteSettings;
  categories: { name: string; slug: string }[];
}) {
  const tel = telLink(settings.phoneNumber);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-forest-deep text-white">
      <div className="ruler-forest h-3.5" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1.4fr_0.8fr]">
        <div>
          <Logo name={settings.businessName} logoUrl={settings.logoUrl} light />
          <p className="mt-4 text-sm text-white/80">Founded by {settings.founderName}</p>
          <p className="mt-4 flex gap-2 text-sm text-white/80">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {settings.address}
              <br />
              {settings.landmark}
            </span>
          </p>
          {tel && (
            <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={tel} className="underline underline-offset-4 hover:text-white">
                +{settings.phoneNumber.replace(/\D/g, "").replace(/^(\d{2})(\d{5})(\d{5})$/, "$1 $2$3")}
              </a>
            </p>
          )}
          <WhatsAppLink number={settings.whatsappNumber} label="Chat on WhatsApp" variant="onDark" className="mt-5" />
        </div>

        <div>
          <h2 className="font-display text-base font-bold">Product categories</h2>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-white/80 sm:grid-cols-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="hover:text-white hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base font-bold">The store</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-white/80">
            {[
              ["/about", "About Us"],
              ["/contact", "Contact Us"],
              ["/privacy", "Privacy Policy"],
              ["/terms", "Terms and Conditions"],
              ["/returns", "Return and Refund Policy"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-white hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* extra bottom padding keeps the floating WhatsApp button clear of the copyright line */}
      <div className="border-t border-white/15 px-4 py-5 pb-24 text-center text-xs text-white/70 sm:pb-20">
        © {year} {settings.businessName}. All rights reserved.
      </div>
    </footer>
  );
}
