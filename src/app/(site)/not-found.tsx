import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <p className="font-display text-6xl font-extrabold text-forest">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">We could not find that page</h1>
      <p className="mt-3 text-muted">The link may be old, or the product may no longer be listed.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="inline-flex min-h-11 items-center rounded-md bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-deep">
          Browse products
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-forest px-5 text-sm font-semibold text-forest hover:bg-forest hover:text-white">
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
