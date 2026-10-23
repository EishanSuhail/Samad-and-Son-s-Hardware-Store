"use server";

import { Prisma } from "@/generated/prisma/client";
import { customerSchema, linesInputSchema, makeReference, priceLines, type PricedCart } from "@/lib/checkout";
import { db } from "@/lib/db";
import { uniqueViolationInfo } from "@/lib/db-errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";

export type PriceResult = { ok: true; cart: PricedCart } | { ok: false; message: string };

/** Read-only: returns trusted names, prices and stock problems for the lines in the browser's list. */
export async function priceLinesAction(rawLines: unknown): Promise<PriceResult> {
  const parsed = linesInputSchema.safeParse(rawLines);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid list." };
  const ip = await getClientIp();
  if (!rateLimit(`price:${ip}`, 120, 60_000).ok) return { ok: false, message: "Too many requests. Wait a moment and try again." };
  return { ok: true, cart: await priceLines(parsed.data) };
}

export interface QuotationState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Present only when the server has saved the request. */
  reference?: string;
  whatsappText?: string;
}

/** Saves a quotation request. Success is reported only after the row exists in the database. */
export async function submitQuotationAction(_prev: QuotationState, formData: FormData): Promise<QuotationState> {
  // Honeypot: real people never fill this hidden field.
  if (String(formData.get("website") ?? "") !== "") return { ok: false, message: "Could not send the request." };

  const ip = await getClientIp();
  const limit = rateLimit(`quote:${ip}`, 5, 60 * 60_000);
  if (!limit.ok) return { ok: false, message: "Too many requests from this device. Please try again later or contact us on WhatsApp." };

  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, message: "Your list could not be read. Reload the page and try again." };
  }
  const lines = linesInputSchema.safeParse(rawLines);
  if (!lines.success) return { ok: false, message: lines.error.issues[0]?.message ?? "Add at least one product." };

  const customer = customerSchema.safeParse({
    customerName: formData.get("customerName") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
  const preferred = formData.get("preferredContact") === "PHONE" ? "PHONE" : "WHATSAPP";
  if (!customer.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of customer.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const priced = await priceLines(lines.data);
  const usable = priced.lines.filter((l) => l.problem !== "UNAVAILABLE");
  if (usable.length === 0) return { ok: false, message: "None of these products are available any more. Remove them and add current products." };

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = makeReference("QT");
    try {
      await db.quotation.create({
        data: {
          reference,
          customerName: customer.data.customerName,
          phone: customer.data.phone,
          preferredContact: preferred,
          notes: customer.data.notes,
          items: { create: usable.map((l) => ({ productId: l.productId, productName: l.name, sku: l.sku, unit: l.unit, quantity: l.quantity })) },
        },
      });
      const text = [
        "Assalamu Alaikum,",
        "",
        `I have sent a quotation request on your website. Reference: ${reference}`,
        `Name: ${customer.data.customerName}`,
        "",
        ...usable.map((l, i) => `${i + 1}. ${l.name} (${l.sku}) — ${l.quantity} ${l.unit}`),
        "",
        "Please share the quotation. Thank you.",
      ].join("\n");
      return { ok: true, reference, message: "Your quotation request has been received.", whatsappText: text };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && uniqueViolationInfo(error).includes("reference")) continue;
      console.error("submitQuotation failed", error);
      return { ok: false, message: "We could not save your request. Nothing was sent. Please try again or contact us on WhatsApp." };
    }
  }
  return { ok: false, message: "We could not save your request. Please try again." };
}

export interface OrderState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Present only when the server has saved the order. */
  reference?: string;
  subtotalPaise?: number | null;
  hasUnpricedItems?: boolean;
  whatsappText?: string;
}

/**
 * Saves a website order request (not a payment). Prices, names and units are re-read from the
 * database; the browser's copy is only used for product ids and quantities. Stock is NOT deducted
 * here: it is taken off when the shop confirms the order.
 */
export async function submitOrderAction(_prev: OrderState, formData: FormData): Promise<OrderState> {
  if (String(formData.get("website") ?? "") !== "") return { ok: false, message: "Could not send the order." };

  const settings = await getSettings();
  if (!settings.orderSubmissionEnabled) return { ok: false, message: "Website orders are switched off right now. Please order on WhatsApp or call the shop." };

  const ip = await getClientIp();
  if (!rateLimit(`order:${ip}`, 5, 60 * 60_000).ok) return { ok: false, message: "Too many orders from this device. Please try again later or contact us on WhatsApp." };

  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, message: "Your cart could not be read. Reload the page and try again." };
  }
  const lines = linesInputSchema.safeParse(rawLines);
  if (!lines.success) return { ok: false, message: lines.error.issues[0]?.message ?? "Add at least one product." };

  const customer = customerSchema.safeParse({
    customerName: formData.get("customerName") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
  const fieldErrors: Record<string, string> = {};
  if (!customer.success) for (const i of customer.error.issues) fieldErrors[String(i.path[0])] ??= i.message;

  const fulfilment = formData.get("fulfilment") === "DELIVERY" ? "DELIVERY" : "PICKUP";
  if (fulfilment === "PICKUP" && !settings.pickupEnabled) fieldErrors.fulfilment = "Pickup is not available right now.";
  if (fulfilment === "DELIVERY" && !settings.deliveryEnabled) fieldErrors.fulfilment = "Delivery is not available right now.";
  const address = String(formData.get("address") ?? "").trim();
  if (fulfilment === "DELIVERY" && (address.length < 5 || address.length > 400)) fieldErrors.address = "Enter the full delivery address (5 to 400 characters).";
  if (Object.keys(fieldErrors).length || !customer.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

  const priced = await priceLines(lines.data);
  if (priced.hasProblems) return { ok: false, message: "Some items in your cart are unavailable or short on stock. Please update your cart and try again." };

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = makeReference("SH");
    try {
      await db.order.create({
        data: {
          reference,
          customerName: customer.data.customerName,
          phone: customer.data.phone,
          fulfilment,
          address: fulfilment === "DELIVERY" ? address : null,
          notes: customer.data.notes,
          subtotalPaise: priced.subtotalPaise,
          hasUnpricedItems: priced.hasUnpricedItems,
          items: {
            create: priced.lines.map((l) => ({ productId: l.productId, productName: l.name, sku: l.sku, unit: l.unit, quantity: l.quantity, unitPricePaise: l.unitPricePaise })),
          },
        },
      });
      const text = [
        "Assalamu Alaikum,",
        "",
        `I have submitted an order on your website. Reference: ${reference}`,
        `Name: ${customer.data.customerName}`,
        "",
        "Please confirm my order. Thank you.",
      ].join("\n");
      return { ok: true, reference, message: "Your order has been received.", subtotalPaise: priced.subtotalPaise, hasUnpricedItems: priced.hasUnpricedItems, whatsappText: text };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && uniqueViolationInfo(error).includes("reference")) continue;
      console.error("submitOrder failed", error);
      return { ok: false, message: "We could not save your order. Nothing was sent. Please try again or order on WhatsApp." };
    }
  }
  return { ok: false, message: "We could not save your order. Please try again." };
}
