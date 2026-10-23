import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { QuotationView } from "@/components/QuotationView";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Request a quotation", robots: { index: false, follow: true }, alternates: { canonical: "/quotation" } };
export const dynamic = "force-dynamic";

export default async function QuotationPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Quotation" }]} />
      <h1 className="mb-2 mt-3 text-3xl font-extrabold">Request a quotation</h1>
      <p className="mb-6 max-w-[62ch] text-muted">List what you need and the quantities. The shop replies with a price. Nothing is ordered until you confirm with us.</p>
      <QuotationView whatsappNumber={s.whatsappNumber} />
    </div>
  );
}
