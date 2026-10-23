import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Return and Refund Policy", alternates: { canonical: "/returns" } };

// NOTE FOR THE OWNER: no return window or refund terms have been invented here.
// Replace the text below with the store's real return and refund rules before launch.
export default function ReturnsPage() {
  return (
    <PolicyPage
      title="Return and Refund Policy"
      sections={[
        {
          heading: "Returns and refunds",
          body: [
            "Whether a product can be returned or refunded depends on the product and is decided by the store. Please ask about return terms on WhatsApp or in the store before you buy, especially for cut-to-size, mixed or opened items.",
            "If something is wrong with an item you received, contact the store on WhatsApp with your order or quotation reference and we will look into it.",
          ],
        },
      ]}
    />
  );
}
