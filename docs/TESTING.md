# Testing

The project has two kinds of automated tests, plus a few static checks:

| Command | What it runs | Needs |
| --- | --- | --- |
| `npm test` | Unit and integration tests with Vitest (`src/**/*.test.ts`) | PostgreSQL (a separate `*_test` database) |
| `npm run test:e2e` | Browser tests with Playwright-core against a **running** site (`tests/e2e/*.e2e.ts`) | A running site, a seeded database, and Chromium |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) | Nothing extra |
| `npm run lint` | ESLint | Nothing extra |
| `npm run build` | Production build | Nothing extra (needs internet for Google Fonts) |

Run all the checks before a release.

## Unit and integration tests (`npm test`)

### Requirements

- A running PostgreSQL server that the test run can reach.
- A database user that is allowed to create databases. The tests create the test database if it does not exist.

### What happens when you run it

`tests/global-setup.ts` runs first, for the whole run:

1. Reads the test database URL from `TEST_DATABASE_URL`, or uses the default `postgresql://postgres@localhost:5432/samad_hardware_test`.
2. Refuses to run if the database name does not end in `_test`. This protects your real database.
3. Connects to the `postgres` database on the same server and creates the test database if it is missing.
4. Runs `npx prisma migrate deploy` against the test database, so its tables match the current migrations.

Vitest then sets `DATABASE_URL` to the test database and `AUTH_SECRET` to a test value for the test run. The tests do not use the `DATABASE_URL` in your `.env` file.

Test files run one at a time (`fileParallelism: false`), because they share the test database.

If the default URL does not match your PostgreSQL login (the default has no password), set your own:

```bash
TEST_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/samad_hardware_test" npm test
```

Keep the name ending in `_test`.

To run one file while you work:

```bash
npx vitest run src/lib/__tests__/money.test.ts
```

The global setup still runs, so the database must be reachable even for a file that does not use it.

### What the unit and integration tests cover

Thirteen test files, grouped by area.

**Sign-in, sessions and access**
- Anonymous visitors are redirected from every admin page to the sign-in page.
- A forged, tampered, expired, unsigned or differently signed session cookie is rejected.
- A deactivated account loses access straight away, even with a valid token.
- The role used for access comes from the database, not from the token.
- Owner-only actions (settings, deleting products and categories) refuse staff.
- Five failed sign-ins lock the account for 15 minutes, even for the correct password. An unknown email and a wrong password give the same result.
- Password rules: at least 12 characters, letters and numbers, at most 128 characters.

**Ordering and quotations**
- Prices and product names come from the database. Prices sent by the browser are ignored.
- Sale prices are used only when they are lower. Price on Request items are left out of totals and flagged.
- Stock problems (out of stock, not enough stock, unavailable products) are flagged and excluded from totals.
- Duplicate lines are merged and quantities are capped.
- A website order is saved as New, takes no stock, and stores price snapshots.
- The honeypot field silently refuses bots, and submissions are rate limited.
- Reference numbers are well formed and vary.

**Stock and order status**
- Stock is taken once when an order is confirmed, and only for tracked products.
- Confirmation is refused, with nothing changed, when stock is short.
- Cancelling restores exactly what was taken. Cancelling a pending order touches no stock.
- Illegal status moves are rejected. Final statuses cannot change.
- Two simultaneous confirmations cannot take stock twice.
- Manual adjustments cannot take stock below zero, and they are recorded.

**Products and categories**
- Creating a product with brand, specifications, price, stock and an opening-stock record.
- Validation errors save nothing. Duplicate SKUs are refused with a clear message.
- Products with the same name get different web addresses.
- Switching to Price on Request clears the price.
- Archiving and republishing.
- Delete requires the confirmation box, and order history keeps its copy of the product.
- Bulk actions: set price, change prices by a percentage (exact rounding, unpriced items left alone), set stock, move category, archive.
- Categories: create with the next sort order, reject duplicates, move up and down, toggle, block deleting a category that still has products.

**CSV import and export**
- Parsing of quotes, commas, line breaks, CRLF and the byte-order mark.
- Export neutralises spreadsheet formulas.
- Validation reports row numbers. Duplicate SKUs in the same file are flagged on the later row only.
- Existing SKUs are updated, or skipped in create-only mode.
- Missing or unknown columns, empty files, and size and row limits are refused.
- Two new products that would share a web address are flagged.
- Database writes are all-or-nothing: a failure part-way leaves nothing behind.
- On update, blank cells keep the current values.

**Images**
- Images are identified by their first bytes, not by file name or the browser's type. JPEG, PNG and WebP are accepted. SVG, GIF, HTML, PDF, executables and text are refused.
- Image links are accepted only from this store's upload paths, or from the configured Cloudinary account.

**Other**
- Phone numbers are normalised to the digits-only form that WhatsApp needs. Invalid numbers disable the link.
- WhatsApp messages are URL-encoded and decode back to the original text. Cart messages omit the delivery address for pickup and omit the subtotal when it cannot be calculated.
- Money: rupee input becomes integer paise, and paise are formatted for display.
- The session token round-trips the admin ID and role, and rejects unknown roles.
- The proxy guard redirects anonymous visitors, lets the sign-in page load, and does not let forged cookies through.

## Browser tests (`npm run test:e2e`)

These tests use a real browser to open the **running** site. They do not start the site for you.

### Requirements

1. **The site must be running.** Start it with `npm run dev`, or with `npm run build` and `npm start`, and note its address.
2. **The database must be seeded.** The ordering tests use the sample product `sample-pvc-pipe` (SKU `SAMPLE-002`, priced at ₹250), and check for a subtotal of ₹1,000 for four units. If you have removed the samples, these tests will fail.
3. **Chromium.** `playwright-core` does not download a browser. The helper looks for a Chromium at `CHROMIUM_PATH`, or at one of these paths: `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`, `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/usr/bin/google-chrome`. Install Chromium by your usual method and set `CHROMIUM_PATH` if it is elsewhere.

### Environment variables

These are read by the tests. They are not in `.env.example`, so set them in your shell for the test run.

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:3000` | Address of the running site. |
| `CHROMIUM_PATH` | (searched, see above) | Path to a Chromium executable. |
| `E2E_ADMIN_EMAIL` | none | Email of an existing **owner** account. |
| `E2E_ADMIN_PASSWORD` | none | Password of that account. |

If `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` are not both set, the signed-in admin tests are **skipped**. The signed-out tests still run.

Example:

```bash
E2E_BASE_URL=http://localhost:3000 \
E2E_ADMIN_EMAIL=owner@example.com \
E2E_ADMIN_PASSWORD='the-owner-password' \
npm run test:e2e
```

### Important: these tests write data

The ordering tests create real rows in the database that the site is using:

- a quotation request with the customer name `E2E Quote Person`,
- a website order with the customer name `E2E Order Person`.

The admin tests sign in, which writes sign-in entries to the activity log.

**Run browser tests against a staging or local database, not against the live shop.** If you run them against a database that matters, remove the test rows afterwards. Check the counts first, then delete:

```sql
BEGIN;
SELECT COUNT(*) FROM "Order" WHERE "customerName" LIKE 'E2E %';
SELECT COUNT(*) FROM "Quotation" WHERE "customerName" LIKE 'E2E %';
DELETE FROM "Order" WHERE "customerName" LIKE 'E2E %';
DELETE FROM "Quotation" WHERE "customerName" LIKE 'E2E %';
COMMIT;   -- or ROLLBACK; if the counts are not what you expected
```

Deleting an order or quotation also deletes its lines. Website orders from the browser tests are `PENDING`, so they take no stock.

### What the browser tests cover

Three test files, plus a shared helper file (`helpers.ts`) and a Vitest config for the browser tests.

**Public site** (`public.e2e.ts`)
- No horizontal scrolling and no console errors on the main pages at 320, 390, 768 and 1280 pixels wide.
- The mobile menu opens, its links work, and Escape closes it.
- The home page shows the real business details and a working WhatsApp link.
- Search, sort and filters on the product list work, and the empty-results message is helpful.
- An unknown product or category gives a "not found" page.
- Main pages have no serious or critical accessibility problems (axe-core, WCAG 2 A and AA).
- `robots.txt`, `sitemap.xml`, canonical tags and structured data are present.

**Cart and ordering** (`ordering.e2e.ts`)
- Prices in the cart come from the server, and the WhatsApp message matches the cart contents and the estimated subtotal.
- A cart altered in the browser's storage cannot change the price.
- A quotation request validates the form, keeps the list until success, shows a reference, and only then empties the list.
- A website order shows a reference, says it is not final, and has no serious accessibility problems.

**Admin** (`admin.e2e.ts`)
- Every admin page redirects to the sign-in page when signed out, and the export URL does not return data.
- A wrong password gives a generic message.
- With owner credentials: signing in through the real form works, every menu link returns a page with no serious accessibility problems and no errors, and signing out ends the session.

## Other checks before release

- `npm run typecheck` and `npm run lint` pass.
- `npm run build` completes.
- Browse the site on a real phone (see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)).
- Walk through a quotation and an order by hand on the staging site.

## What is NOT covered

- **Load and performance testing.** No tests measure how the site behaves with many visitors or large catalogues.
- **Real payments.** The site takes no payments, so none are tested. There is no payment gateway to test.
- **Other browsers.** The browser tests run in Chromium only. Safari and Firefox are not tested automatically, and they should be checked by hand before launch.
- **Visual regression.** No tests compare screenshots, so layout changes that do not break behaviour are not caught automatically.
- **Email and SMS.** The site sends none, so there is nothing to test.
- **Live Cloudinary uploads.** The tests check which image links are accepted. They do not call Cloudinary's upload service.
- **Backups and restores.** Not automated; see [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md) for the manual restore test.
- **Hosting and deployment.** Not tested by these suites. Check the live site with the steps in [DEPLOYMENT.md](DEPLOYMENT.md).
- **Rate limits across several servers.** The limits are in memory, so the tests cover one instance only.
