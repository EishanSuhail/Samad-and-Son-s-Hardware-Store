import { MessageCircle } from "lucide-react";
import { buildWhatsappLink } from "@/lib/whatsapp";

interface Props {
  number: string;
  message?: string;
  label?: string;
  variant?: "solid" | "outline" | "icon" | "onDark";
  className?: string;
}

const styles = {
  solid: "bg-wa text-white hover:bg-wa-deep",
  outline: "border border-wa text-wa hover:bg-wa hover:text-white",
  onDark: "bg-white text-wa-deep hover:bg-stone",
  icon: "border border-wa text-wa hover:bg-wa hover:text-white",
} as const;

/** Opens WhatsApp chat with the configured number. If no valid number is configured, the button is disabled. */
export function WhatsAppLink({ number, message, label = "WhatsApp", variant = "solid", className = "" }: Props) {
  const href = buildWhatsappLink(message, number);
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors min-h-11 " +
    (variant === "icon" ? "w-11 px-0" : "px-4");

  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        title="WhatsApp number is not configured yet"
        className={`${base} cursor-not-allowed bg-line text-muted ${className}`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {variant !== "icon" && label}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={variant === "icon" ? label : undefined}
      className={`${base} ${styles[variant]} ${className}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {variant !== "icon" && label}
    </a>
  );
}
