import { z } from "zod";
import { isAllowedImageUrl } from "./uploads";
import { normaliseWhatsappNumber } from "./whatsapp";

const MAPS_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"]);

const httpsUrl = (hostCheck?: (host: string) => boolean, message = "Enter a full https:// link.") =>
  z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => {
        if (v === "") return true;
        try {
          const u = new URL(v);
          return u.protocol === "https:" && (!hostCheck || hostCheck(u.hostname.toLowerCase()));
        } catch {
          return false;
        }
      },
      { message },
    );

/** Empty string is allowed and means "not configured". Anything else must be a valid number. */
const phone = (label: string) =>
  z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || normaliseWhatsappNumber(v) !== null, {
      message: `${label} must include the country code, for example +91 7006839895.`,
    })
    .transform((v) => (v === "" ? "" : normaliseWhatsappNumber(v)!));

export const settingsFormSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name.").max(120),
  founderName: z.string().trim().min(2, "Enter the founder's name.").max(120),
  address: z.string().trim().min(5, "Enter the address.").max(300),
  landmark: z.string().trim().max(200),
  whatsappNumber: phone("WhatsApp number"),
  phoneNumber: phone("Phone number"),
  email: z.string().trim().max(200).refine((v) => v === "" || z.email().safeParse(v).success, { message: "Enter a valid email address." }),
  businessHours: z.string().trim().max(500),
  googleMapsUrl: httpsUrl((h) => MAPS_HOSTS.has(h), "Use a Google Maps link (https://maps.app.goo.gl/… or https://www.google.com/maps/…)."),
  aboutText: z.string().trim().min(20, "Write at least a short description.").max(5000),
  whyChooseUs: z
    .string()
    .max(2000)
    .transform((v) => v.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10))
    .refine((arr) => arr.every((l) => l.length <= 120), { message: "Keep each point under 120 characters." }),
  facebook: httpsUrl(),
  instagram: httpsUrl(),
  youtube: httpsUrl(),
  orderSubmissionEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  showStock: z.boolean(),
  logoUrl: z.string().trim().refine((v) => v === "" || isAllowedImageUrl(v), { message: "Image is not from this store's uploads." }),
  founderPhotoUrl: z.string().trim().refine((v) => v === "" || isAllowedImageUrl(v), { message: "Image is not from this store's uploads." }),
});

export type SettingsFormInput = z.input<typeof settingsFormSchema>;
export type SettingsFormValues = z.output<typeof settingsFormSchema>;
