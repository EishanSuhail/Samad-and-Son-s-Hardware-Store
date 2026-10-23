import { describe, expect, it } from "vitest";
import { effectivePricePaise, formatPaise, rupeesToPaise } from "../money";

describe("money", () => {
  it("parses rupee input into integer paise", () => {
    expect(rupeesToPaise("1,250.50")).toBe(125050);
    expect(rupeesToPaise("₹99")).toBe(9900);
    expect(rupeesToPaise("0.1")).toBe(10);
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("1.234")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
    expect(rupeesToPaise("")).toBeNull();
  });

  it("formats paise for display", () => {
    expect(formatPaise(25000)).toBe("₹250");
    expect(formatPaise(125050)).toBe("₹1,250.50");
  });

  it("uses the sale price only when it is lower and pricing is fixed", () => {
    expect(effectivePricePaise({ pricingMode: "FIXED", pricePaise: 1000, salePricePaise: 800 })).toBe(800);
    expect(effectivePricePaise({ pricingMode: "FIXED", pricePaise: 1000, salePricePaise: 1200 })).toBe(1000);
    expect(effectivePricePaise({ pricingMode: "PRICE_ON_REQUEST", pricePaise: 1000, salePricePaise: null })).toBeNull();
    expect(effectivePricePaise({ pricingMode: "FIXED", pricePaise: null, salePricePaise: null })).toBeNull();
  });
});
