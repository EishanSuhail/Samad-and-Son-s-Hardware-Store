import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

// NOTE FOR THE OWNER: this is a plain-language summary of what the website actually does.
// Have it reviewed and adjust it before launch if your practices differ.
export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      sections={[
        {
          heading: "What we collect",
          body: [
            "When you send a quotation request or submit an order on this website, we collect the details you type into the form: your name, contact number, the products and quantities you chose, your pickup or delivery preference, a delivery address (only if you choose delivery), and any notes you add.",
            "Your shopping cart and quotation list are kept in your own browser until you submit them. They are not sent to us until you submit a form.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "We use these details only to respond to your request, confirm availability and prices, and prepare your order or quotation.",
            "Opening WhatsApp from this website starts a chat from your own phone. We only receive what you choose to send in that chat.",
          ],
        },
        {
          heading: "Payments",
          body: ["This website does not take online payments and does not collect card or bank details."],
        },
        {
          heading: "Storage and access",
          body: [
            "Submitted requests are stored in the store's database and are visible only to authorised store administrators.",
            "To ask us to correct or delete your details, contact the store on WhatsApp.",
          ],
        },
      ]}
    />
  );
}
