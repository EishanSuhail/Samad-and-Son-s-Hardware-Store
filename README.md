# Samad and Son's Hardware Store

Website and owner admin panel for **Samad and Son's Hardware Store**, Peerpora, Ganderbal, Jammu & Kashmir, India (opposite J&K Bank).

The site shows the shop's product catalogue, lets customers build a cart or a quotation list, and sends their request to the shop on WhatsApp or through the website. The admin panel lets the owner and staff manage products, prices, stock, orders and quotation requests without touching code.

Nothing on the website takes payment. Website orders are **requests** that the shop confirms by phone or WhatsApp.

## Features

**Public website**

- 17 product categories, each with its own page.
- Product listing with search, filters (category, brand, product type, price range, in-stock only), sorting (name, price, relevance) and pagination (12 products per page).
- Product pages with photos, short and full description, specifications, price (or "Price on Request") and stock status.
- Cart and quotation list kept in the visitor's browser until they submit them.
- Order on WhatsApp to **+91 7006839895**, with the cart contents written into a ready-to-send message.
- Quotation requests saved to the database, with a reference number (for example `QT-...`).
- Website order requests saved to the database, with a reference number (for example `SH-...`). Not a payment.
- Pages for About, Contact (with location and Google Maps link), Privacy, Terms and Returns.
- SEO: sitemap, robots file, canonical links, Open Graph tags and JSON-LD structured data.

**Admin panel** (`/admin`, owner or staff sign-in)

- Dashboard with counts for products, low stock, pending orders and new quotation requests.
- Products: add, edit, publish or archive, feature on the homepage, delete (owner only), bulk actions (set or change prices, set stock, move category, archive or publish).
- Product images upload (JPG, PNG or WebP, up to 5 MB each, up to 8 per product).
- CSV import (preview first, then confirm) and CSV export, plus a downloadable template.
- Categories: add, edit, reorder, activate or deactivate, delete (owner only, and only when empty).
- Inventory: stock levels, add/remove or set exact quantity with a reason, low-stock thresholds, recent stock movements.
- Orders: list and filter, status updates, cancel (with confirmation), internal notes.
- Quotations: status, response to the customer, optional quoted total, internal notes.
- Activity log (owner only).
- Settings (owner only): business details, contact numbers, Google Maps link, opening hours, social links, About text, logo, founder photo, and switches for website orders, pickup, delivery and stock display.
- Accounts: owner and staff roles, sign-in lockout after repeated failures, 8-hour sessions.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, server actions, route handlers)
- React 19 and TypeScript
- Tailwind CSS 4
- Prisma 7 with PostgreSQL (`@prisma/adapter-pg`)
- Zod for validation
- jose for signed session tokens (JWT, HS256) in an HTTP-only cookie
- bcryptjs for password hashing
- Cloudinary (optional) for image storage
- Vitest for tests and Playwright (`playwright-core`) for browser tests

## Quick start

Full instructions are in [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md). The short version:

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate          # creates the tables in your PostgreSQL database
npm run db:seed             # categories, units, settings and SAMPLE products
npm run admin:create        # creates the owner account (asks for email, name, password)
npm run dev                 # http://localhost:3000  (admin: /admin/login)
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the development server on http://localhost:3000. |
| `npm run build` | Production build (`next build`). |
| `npm start` | Runs the production build (`next start`). Build first. |
| `npm run lint` | Runs ESLint. |
| `npm run typecheck` | Type-checks the project without emitting files (`tsc --noEmit`). |
| `npm test` | Unit and integration tests (Vitest). Needs PostgreSQL. See [docs/TESTING.md](docs/TESTING.md). |
| `npm run test:e2e` | Browser tests against a running site. See [docs/TESTING.md](docs/TESTING.md). |
| `npm run db:migrate` | Development migrations (`prisma migrate dev`). |
| `npm run db:seed` | Loads categories, units, default settings and SAMPLE products (`prisma db seed`). Safe to re-run; see [docs/DATABASE.md](docs/DATABASE.md). |
| `npm run admin:create` | Creates an owner account, or a staff account with `-- --role=staff`, or resets a password with `-- --reset-password`. |
| `npm install` (postinstall) | Runs `prisma generate` to create the Prisma client in `src/generated/prisma`. |

## Project structure

```
src/
  app/
    (site)/            Public pages: home, products, categories, cart, quotation, about, contact, policies
    (admin)/admin/     Admin login and the admin panel (products, orders, inventory, settings, ...)
    api/admin/         Admin route handlers: image upload, product CSV export
    uploads/[name]/   Serves images stored on the server's own disk (when Cloudinary is not used)
    sitemap.ts         sitemap.xml
    robots.ts          robots.txt
  components/          Shared UI (site and admin)
  lib/                 Business logic: checkout, orders, inventory, CSV import, uploads, auth, settings
  proxy.ts             Quick session check for /admin (the real check is in lib/auth.ts)
  generated/prisma/    Generated Prisma client (not committed; created by `prisma generate`)
prisma/
  schema.prisma        Database models
  migrations/          Migration history (applied with `prisma migrate`)
  seed.ts              Seed data (categories, units, settings, SAMPLE products)
prisma.config.ts       Prisma configuration (schema path, migrations, seed command, DATABASE_URL)
scripts/
  create-admin.ts      Creates or resets admin accounts
src/__tests__/         Integration tests (actions, checkout, orders, proxy)
src/lib/__tests__/     Unit and integration tests for library code
tests/
  e2e/                 Browser tests (run with `npm run test:e2e`)
  global-setup.ts      Creates and migrates the separate test database
public/                Static files
uploads/               Images stored locally when Cloudinary is not configured (not committed)
docs/                  Documentation (this folder)
```

## Documentation

- [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md): run the project on your own computer.
- [docs/DATABASE.md](docs/DATABASE.md): data model, money handling, stock rules, migrations, seed data.
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md): guide for the shop owner and staff.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): putting the site online (Vercel with managed PostgreSQL, or a single server).
- [docs/BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md): backups, restores, password and secret recovery.
- [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md): what to do before the site goes live.
- [docs/TESTING.md](docs/TESTING.md): running the automated tests and what they cover.

## Known limitations

- **Rate limiting is in memory, per server instance.** The limits for sign-in, quotation and order requests, uploads and imports are kept in the memory of each running server. Restarting the server resets them, and on a platform that runs several instances (such as Vercel) each instance keeps its own count. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **No payment gateway.** The site does not take card, UPI or any other online payment. Orders are requests that the shop confirms.
- **No email or SMS notifications.** When a new order or quotation arrives, nothing is sent to the owner. Check the Orders and Quotations pages, or set up your own alert. Responses to customers are sent by the shop itself (WhatsApp or phone).
- **Local image storage is not persistent on serverless hosts.** Without Cloudinary, uploaded images are written to a folder on the server's disk. Serverless hosts such as Vercel do not keep that disk, so Cloudinary is required there.
- **Seed data is labelled [SAMPLE].** The seed creates 12 placeholder products (SKUs `SAMPLE-001` to `SAMPLE-012`) with placeholder prices and stock. They are marked and shown as sample data. They must be removed or archived before launch. See [docs/DATABASE.md](docs/DATABASE.md).
- **Policy pages are plain drafts.** The Privacy, Terms and Returns pages describe what the site does, but they are drafts. The owner must review and replace the text with the shop's real rules. This is not legal advice.
- **The admin panel has no units screen.** Units of measure (Piece, Box, Kilogram and so on) are stored in the database and are only added or changed by a developer.
- **Sessions are not revoked on the server.** Signing out clears the cookie in that browser, but a stolen session token would stay valid until it expires (8 hours) unless the account is deactivated or `AUTH_SECRET` is changed (which signs everyone out). Accounts are re-checked against the database on every request, so deactivating one takes effect immediately.
- **There is no screen to add or remove staff accounts.** Create them with `npm run admin:create -- --role=staff`.
- **Deleting a product is permanent.** It removes the product, its photos and its stock history. Past orders keep their own copy of the name and price.
