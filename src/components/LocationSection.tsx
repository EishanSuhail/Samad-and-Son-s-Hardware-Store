import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { BUSINESS } from "@/lib/business";
import { directionsUrl, telLink, type SiteSettings } from "@/lib/settings";
import { WhatsAppLink } from "./WhatsAppLink";

export function LocationSection({ settings, heading = "Visit the store" }: { settings: SiteSettings; heading?: string }) {
  const tel = telLink(settings.phoneNumber);
  const phoneDigits = settings.phoneNumber.replace(/\D/g, "");
  const phoneDisplay = phoneDigits.length === 12 ? `+${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2)}` : `+${phoneDigits}`;
  const usingOwnerMapLink = Boolean(settings.googleMapsUrl);

  return (
    <section aria-labelledby="location-heading" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid overflow-hidden rounded-lg border border-line md:grid-cols-[1.1fr_1fr]">
        <div className="p-6 sm:p-8">
          <h2 id="location-heading" className="text-2xl font-extrabold sm:text-3xl">
            {heading}
          </h2>
          <p className="mt-3 max-w-[52ch] text-muted">{BUSINESS.locationStatement}</p>

          <dl className="mt-6 space-y-4 text-sm">
            <div className="relative pl-8">
              <MapPin className="absolute left-0 top-0.5 h-5 w-5 text-forest" aria-hidden="true" />
                <dt className="font-bold">Address</dt>
                <dd className="text-muted">
                  {settings.businessName}
                  <br />
                  {settings.address}
                  <br />
                  {settings.landmark}
                </dd>
            </div>
            <div className="relative pl-8">
              <Phone className="absolute left-0 top-0.5 h-5 w-5 text-forest" aria-hidden="true" />
                <dt className="font-bold">Phone and WhatsApp</dt>
                <dd className="text-muted">
                  {tel ? (
                    <a href={tel} className="underline underline-offset-4 hover:text-forest">
                      {phoneDisplay}
                    </a>
                  ) : (
                    "Not configured yet"
                  )}
                </dd>
            </div>
            <div className="relative pl-8">
              <Clock className="absolute left-0 top-0.5 h-5 w-5 text-forest" aria-hidden="true" />
                <dt className="font-bold">Business hours</dt>
                <dd className="whitespace-pre-line text-muted">
                  {settings.businessHours || "Hours are not listed yet. Message us on WhatsApp to check before you visit."}
                </dd>
            </div>
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={directionsUrl(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep"
            >
              <Navigation className="h-4 w-4" aria-hidden="true" />
              Get directions
            </a>
            <WhatsAppLink number={settings.whatsappNumber} label="Chat on WhatsApp" variant="outline" />
          </div>
          {!usingOwnerMapLink && (
            <p className="mt-3 text-xs text-muted">
              Directions search the written address. For a pin on the exact shop, the owner can add a Google Maps link in
              Settings.
            </p>
          )}
        </div>

        <div className="flex flex-col justify-between bg-forest p-6 text-white sm:p-8">
          <div>
            <p className="font-display text-xl font-bold">Find us opposite J&amp;K Bank</p>
            <p className="mt-2 text-white/80">Peerpora, Ganderbal. Ask on WhatsApp if you are unsure how to reach us.</p>
          </div>
          <div className="ruler-forest mt-8 h-3.5" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
