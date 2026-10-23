import { MessageCircle } from "lucide-react";
import { buildWhatsappLink } from "@/lib/whatsapp";

/**
 * Floating chat button. Sits in the bottom-right corner with a safe margin so it does not cover
 * page content (the footer reserves bottom padding) or browser/system controls.
 */
export function FloatingWhatsApp({ number }: { number: string }) {
  const href = buildWhatsappLink(undefined, number);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-wa text-white shadow-lg ring-2 ring-white transition-colors hover:bg-wa-deep sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
      <span className="hidden text-sm font-semibold sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
