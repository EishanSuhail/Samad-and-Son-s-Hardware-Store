"use client";

import { useState } from "react";
import { useFormAction } from "@/lib/use-form-action";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type { SiteSettings } from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { saveSettingsAction, type SettingsState } from "./actions";

const initial: SettingsState = {};
const input = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm focus:border-forest";
const textarea = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-forest";

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-line bg-white p-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-5 w-5 accent-forest" />
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const { state, pending, onSubmit } = useFormAction(saveSettingsAction, initial);
  const [wa, setWa] = useState(settings.whatsappNumber);
  const err = state.fieldErrors ?? {};
  const testLink = buildWhatsappLink("Test message from the store admin settings.", wa);

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="businessName" label="Business name" error={err.businessName}>
            <input id="businessName" name="businessName" defaultValue={settings.businessName} className={input} />
          </Field>
          <Field id="founderName" label="Founder name" error={err.founderName}>
            <input id="founderName" name="founderName" defaultValue={settings.founderName} className={input} />
          </Field>
        </div>
        <Field id="address" label="Address" error={err.address}>
          <input id="address" name="address" defaultValue={settings.address} className={input} />
        </Field>
        <Field id="landmark" label="Landmark" error={err.landmark}>
          <input id="landmark" name="landmark" defaultValue={settings.landmark} className={input} />
        </Field>
        <Field id="businessHours" label="Business hours" hint="Shown on the site only when filled in. One line per day or range." error={err.businessHours}>
          <textarea id="businessHours" name="businessHours" rows={3} defaultValue={settings.businessHours} className={textarea} />
        </Field>
        <Field id="googleMapsUrl" label="Google Maps link" hint="Paste the share link of the shop's exact location. Leave empty to search by the written address." error={err.googleMapsUrl}>
          <input id="googleMapsUrl" name="googleMapsUrl" type="url" defaultValue={settings.googleMapsUrl} className={input} />
        </Field>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Contact</h2>
        <Field
          id="whatsappNumber"
          label="WhatsApp number"
          hint="Include the country code, for example +91 7006839895. Leave empty to turn WhatsApp buttons off."
          error={err.whatsappNumber}
        >
          <input id="whatsappNumber" name="whatsappNumber" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} className={input} />
        </Field>
        <p className="text-sm">
          {testLink ? (
            <>
              <a href={testLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest underline underline-offset-4">
                Test this number on WhatsApp
              </a>
              <span className="text-muted"> (opens a chat with a test message; nothing is sent until you press send)</span>
            </>
          ) : (
            <span className="font-semibold text-danger">
              No valid WhatsApp number. WhatsApp buttons are disabled on the website until you add one.
            </span>
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="phoneNumber" label="Phone number" hint="Used for call links. Include the country code." error={err.phoneNumber}>
            <input id="phoneNumber" name="phoneNumber" inputMode="tel" defaultValue={settings.phoneNumber} className={input} />
          </Field>
          <Field id="email" label="Email" hint="Optional. Shown only when filled in." error={err.email}>
            <input id="email" name="email" type="email" defaultValue={settings.email} className={input} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="facebook" label="Facebook link" error={err.facebook}>
            <input id="facebook" name="facebook" type="url" defaultValue={settings.socialLinks.facebook ?? ""} className={input} />
          </Field>
          <Field id="instagram" label="Instagram link" error={err.instagram}>
            <input id="instagram" name="instagram" type="url" defaultValue={settings.socialLinks.instagram ?? ""} className={input} />
          </Field>
          <Field id="youtube" label="YouTube link" error={err.youtube}>
            <input id="youtube" name="youtube" type="url" defaultValue={settings.socialLinks.youtube ?? ""} className={input} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Homepage and About page</h2>
        <Field id="aboutText" label="About us text" hint="Separate paragraphs with a blank line." error={err.aboutText}>
          <textarea id="aboutText" name="aboutText" rows={9} defaultValue={settings.aboutText} className={textarea} />
        </Field>
        <Field id="whyChooseUs" label="Why shop with us" hint="One point per line, up to 10. Do not add awards, certifications or guarantees you cannot back up." error={err.whyChooseUs}>
          <textarea id="whyChooseUs" name="whyChooseUs" rows={6} defaultValue={settings.whyChooseUs.join("\n")} className={textarea} />
        </Field>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Logo and founder photo</h2>
        <p className="text-xs text-muted">Optional. JPG, PNG or WebP under 5 MB. Without a logo the site shows its built-in SS monogram. Only upload a photo of yourself that you are happy to show publicly.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <ImageUploader name="logoUrl" label="Shop logo" max={1} withAlt={false} initial={settings.logoUrl ? [{ url: settings.logoUrl, altText: "" }] : []} />
          <ImageUploader name="founderPhotoUrl" label="Founder photo" max={1} withAlt={false} initial={settings.founderPhotoUrl ? [{ url: settings.founderPhotoUrl, altText: "" }] : []} />
        </div>
        {(err.logoUrl || err.founderPhotoUrl) && <p className="text-xs font-semibold text-danger">{err.logoUrl ?? err.founderPhotoUrl}</p>}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Ordering and display</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="orderSubmissionEnabled" label="Accept website orders" hint="Customers can submit an order. It is not a payment and is not final until you confirm it." defaultChecked={settings.orderSubmissionEnabled} />
          <Toggle name="pickupEnabled" label="Store pickup available" defaultChecked={settings.pickupEnabled} />
          <Toggle name="deliveryEnabled" label="Delivery available" hint="When on, customers can enter a delivery address." defaultChecked={settings.deliveryEnabled} />
          <Toggle name="showStock" label="Show stock status" hint="Shows In stock, Low stock or Out of stock on products that track inventory." defaultChecked={settings.showStock} />
        </div>
        <p className="text-xs text-muted">Currency: Indian rupee (₹). All prices are in rupees.</p>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-forest px-6 text-sm font-semibold text-white hover:bg-forest-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`text-sm font-semibold ${state.ok ? "text-forest" : "text-danger"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
