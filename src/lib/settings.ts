import { cache } from "react";
import { db } from "./db";
import { BUSINESS } from "./business";

export interface SiteSettings {
  businessName: string;
  founderName: string;
  address: string;
  landmark: string;
  whatsappNumber: string;
  phoneNumber: string;
  email: string;
  businessHours: string;
  googleMapsUrl: string;
  aboutText: string;
  whyChooseUs: string[];
  socialLinks: Record<string, string>;
  orderSubmissionEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  showStock: boolean;
  logoUrl: string;
  founderPhotoUrl: string;
}

const DEFAULTS: SiteSettings = {
  businessName: BUSINESS.name,
  founderName: BUSINESS.founder,
  address: BUSINESS.addressLine,
  landmark: BUSINESS.landmark,
  whatsappNumber: BUSINESS.whatsappNumber,
  phoneNumber: BUSINESS.whatsappNumber,
  email: "",
  businessHours: "",
  googleMapsUrl: "",
  aboutText: BUSINESS.aboutText.join("\n\n"),
  whyChooseUs: [...BUSINESS.whyChooseUs],
  socialLinks: {},
  orderSubmissionEnabled: true,
  pickupEnabled: true,
  deliveryEnabled: false,
  showStock: true,
  logoUrl: "",
  founderPhotoUrl: "",
};

/** Settings stored in the database, merged over the built-in defaults. Cached per request. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await db.setting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in DEFAULTS && row.value !== null) merged[row.key] = row.value;
  }
  return merged as unknown as SiteSettings;
});

/** tel: link built from the configured number (digits only, with +). */
export function telLink(number: string): string | null {
  const digits = number.replace(/\D/g, "");
  return digits.length >= 10 ? `tel:+${digits.length === 10 ? "91" + digits : digits}` : null;
}

/** Owner-supplied Google Maps link if set, otherwise a map search for the written address (no invented coordinates). */
export function directionsUrl(s: Pick<SiteSettings, "googleMapsUrl" | "address" | "landmark">): string {
  if (s.googleMapsUrl) return s.googleMapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
}
