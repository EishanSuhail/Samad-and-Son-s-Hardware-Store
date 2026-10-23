import { CartProvider } from "@/components/CartProvider";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

// Customer-facing chrome. The admin area has its own layout and never shows this header.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);
  return (
    <CartProvider>
      <SiteHeader settings={settings} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} categories={categories.map(({ name, slug }) => ({ name, slug }))} />
      <FloatingWhatsApp number={settings.whatsappNumber} />
    </CartProvider>
  );
}
