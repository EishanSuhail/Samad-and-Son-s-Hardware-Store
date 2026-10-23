import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms and Conditions", alternates: { canonical: "/terms" } };

// NOTE FOR THE OWNER: review and adjust before launch.
export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms and Conditions"
      sections={[
        {
          heading: "Prices and availability",
          body: [
            "Prices and stock shown on this website are set by the store and may change. Products shown as “Price on Request” have no listed price; ask us for the current price.",
            "Totals shown in the cart are estimates. The final payable amount, including any delivery charge, is confirmed by the store.",
          ],
        },
        {
          heading: "Quotations and orders",
          body: [
            "A quotation request is not a purchase. A website order submission is not a confirmed sale or a payment: the order is confirmed only when the store confirms it to you.",
            "Opening WhatsApp from this website does not mean a message has been sent or an order accepted. Please send the message in WhatsApp and wait for the store's reply.",
          ],
        },
        {
          heading: "Payment",
          body: ["Nothing is charged on this website. Payment is arranged directly with the store."],
        },
        {
          heading: "Product information",
          body: ["We try to keep descriptions and specifications accurate. Please confirm important details such as size and compatibility with the store before you buy."],
        },
      ]}
    />
  );
}
