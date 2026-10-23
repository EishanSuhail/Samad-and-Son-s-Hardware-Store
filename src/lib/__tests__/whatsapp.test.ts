import { describe, expect, it } from "vitest";
import {
  buildWhatsappLink,
  cartOrderMessage,
  normaliseWhatsappNumber,
  productEnquiryMessage,
} from "../whatsapp";

describe("WhatsApp number handling", () => {
  it("uses the configured click-to-chat number 917006839895 by default", () => {
    expect(buildWhatsappLink()).toBe("https://wa.me/917006839895");
  });

  it("normalises display formats to digits-only", () => {
    expect(normaliseWhatsappNumber("+91 7006839895")).toBe("917006839895");
    expect(normaliseWhatsappNumber("7006839895")).toBe("917006839895");
    expect(normaliseWhatsappNumber("+91-70068-39895")).toBe("917006839895");
  });

  it("rejects invalid numbers and disables the link", () => {
    expect(normaliseWhatsappNumber("")).toBeNull();
    expect(normaliseWhatsappNumber("12345")).toBeNull();
    expect(normaliseWhatsappNumber("abc")).toBeNull();
    expect(buildWhatsappLink("hi", "")).toBeNull();
  });
});

describe("WhatsApp messages", () => {
  it("URL-encodes the prefilled message and round-trips", () => {
    const msg = productEnquiryMessage({ name: "PVC Pipe & Elbow", sku: "A-1", unit: "Piece", quantity: 2, pricePaise: null });
    const link = buildWhatsappLink(msg)!;
    expect(link.startsWith("https://wa.me/917006839895?text=")).toBe(true);
    expect(link).not.toMatch(/\s/);
    expect(decodeURIComponent(link.split("?text=")[1])).toBe(msg);
    expect(msg).toContain("Price: Price on Request");
    expect(msg).toContain("Quantity: 2 Piece");
  });

  it("shows the configured price when present", () => {
    const msg = productEnquiryMessage({ name: "X", unit: "Piece", pricePaise: 25000 });
    expect(msg).toContain("Price: ₹250");
  });

  it("builds a cart order message without delivery address for pickup", () => {
    const msg = cartOrderMessage({
      items: [{ name: "A", unit: "Piece", quantity: 3, pricePaise: 1000 }, { name: "B", unit: "Bag", quantity: 1 }],
      estimatedSubtotalPaise: 3000,
      fulfilment: "PICKUP",
      address: "should not appear",
      notes: "Call before 5",
    });
    expect(msg).toContain("1. A — 3 Piece");
    expect(msg).toContain("2. B — 1 Bag");
    expect(msg).toContain("Estimated Subtotal: ₹30");
    expect(msg).toContain("Fulfilment Preference: Pickup");
    expect(msg).not.toContain("should not appear");
    expect(msg).toContain("Notes: Call before 5");
  });

  it("omits the subtotal when it cannot be calculated", () => {
    const msg = cartOrderMessage({ items: [{ name: "B", unit: "Bag", quantity: 1 }], fulfilment: "DELIVERY", address: "Ganderbal" });
    expect(msg).not.toContain("Estimated Subtotal");
    expect(msg).toContain("Delivery Address: Ganderbal");
  });
});
