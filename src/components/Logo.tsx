import Link from "next/link";

/** Original "SS" monogram + wordmark. If the owner uploads a logo (Settings), that image replaces the monogram. */
export function Logo({ name, logoUrl, light = false }: { name: string; logoUrl?: string; light?: boolean }) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-11 w-11 rounded-md object-contain" />
      ) : (
        <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden="true">
          <rect width="48" height="48" rx="6" fill="#1d4b38" />
          <text
            x="24"
            y="30"
            textAnchor="middle"
            fontFamily="var(--font-heading), system-ui, sans-serif"
            fontWeight="800"
            fontSize="23"
            letterSpacing="-1.5"
            fill="#ffffff"
          >
            SS
          </text>
          <rect x="6" y="36" width="36" height="3" fill="#f2b705" />
          <path d="M10 36v-3M16 36v-2M22 36v-3M28 36v-2M34 36v-3M40 36v-2" stroke="#1f2326" strokeWidth="1" />
        </svg>
      )}
      <span className="min-w-0 leading-tight">
        <span
          className={`block font-display text-[0.9rem] font-extrabold tracking-tight min-[420px]:text-[1.05rem] sm:text-lg ${light ? "text-white" : "text-ink"}`}
        >
          {name}
        </span>
      </span>
    </Link>
  );
}
