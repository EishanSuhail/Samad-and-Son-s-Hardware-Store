import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CartView } from "@/components/CartView";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: true }, alternates: { canonical: "/cart" } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="mb-6 mt-3 text-3xl font-extrabold">Your cart</h1>
      <CartView whatsappNumber={s.whatsappNumber} pickupEnabled={s.pickupEnabled} deliveryEnabled={s.deliveryEnabled} orderSubmissionEnabled={s.orderSubmissionEnabled} />
    </div>
  );
}
