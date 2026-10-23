import { BUSINESS } from "./business";
import { formatPaise } from "./money";

const DIGITS_ONLY = /\D/g;

/**
 * Normalises a phone number into the digits-only form wa.me expects
 * (country code + number, no "+", spaces or dashes). Returns null if invalid.
 * A bare 10-digit Indian number gets "91" prepended.
 */
export function normaliseWhatsappNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(DIGITS_ONLY, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `91${digits}`;
  // E.164 allows at most 15 digits; shortest sensible number is 11 with a country code.
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

/** Builds a https://wa.me link, optionally with a URL-encoded prefilled message. */
export function buildWhatsappLink(
  message?: string,
  number: string | null | undefined = BUSINESS.whatsappNumber,
): string | null {
  const normalised = normaliseWhatsappNumber(number);
  if (!normalised) return null;
  const base = `https://wa.me/${normalised}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export interface WhatsappProduct {
  name: string;
  sku?: string | null;
  unit: string;
  quantity?: number;
  pricePaise?: number | null;
}

export function productEnquiryMessage(product: WhatsappProduct): string {
  const lines = [
    "Assalamu Alaikum,",
    "",
    `I would like to enquire about the following product from ${BUSINESS.name}.`,
    "",
    `Product: ${product.name}`,
  ];
  if (product.sku) lines.push(`SKU: ${product.sku}`);
  if (product.quantity) lines.push(`Quantity: ${product.quantity} ${product.unit}`);
  lines.push(`Price: ${product.pricePaise != null ? formatPaise(product.pricePaise) : "Price on Request"}`);
  lines.push("", "Please share the availability and final price.", "", "Thank you.");
  return lines.join("\n");
}

export interface WhatsappOrderInput {
  customerName?: string;
  items: (WhatsappProduct & { quantity: number })[];
  estimatedSubtotalPaise?: number | null;
  fulfilment: "PICKUP" | "DELIVERY";
  address?: string;
  notes?: string;
}

export function cartOrderMessage(order: WhatsappOrderInput): string {
  const lines = [
    "Assalamu Alaikum,",
    "",
    `I would like to place an order enquiry with ${BUSINESS.name}.`,
  ];
  if (order.customerName?.trim()) lines.push("", `Name: ${order.customerName.trim()}`);
  lines.push("", "Items:");
  order.items.forEach((item, i) => {
    const price = item.pricePaise != null ? ` (${formatPaise(item.pricePaise)} per ${item.unit})` : "";
    lines.push(`${i + 1}. ${item.name} — ${item.quantity} ${item.unit}${price}`);
  });
  lines.push("");
  if (order.estimatedSubtotalPaise != null) {
    lines.push(`Estimated Subtotal: ${formatPaise(order.estimatedSubtotalPaise)}`);
  }
  lines.push(`Fulfilment Preference: ${order.fulfilment === "DELIVERY" ? "Delivery Enquiry" : "Pickup"}`);
  if (order.fulfilment === "DELIVERY" && order.address?.trim()) {
    lines.push(`Delivery Address: ${order.address.trim()}`);
  }
  if (order.notes?.trim()) lines.push(`Notes: ${order.notes.trim()}`);
  lines.push("", "Please confirm availability and the final payable amount.", "", "Thank you.");
  return lines.join("\n");
}
