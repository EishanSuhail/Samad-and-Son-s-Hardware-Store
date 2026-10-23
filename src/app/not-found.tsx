import Link from "next/link";

// Fallback for URLs that match no route at all (pages inside the site use (site)/not-found.tsx).
export default function RootNotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl font-extrabold text-forest">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">We could not find that page</h1>
      <Link href="/" className="mt-8 inline-flex min-h-11 items-center rounded-md bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-deep">
        Go to the homepage
      </Link>
    </main>
  );
}
