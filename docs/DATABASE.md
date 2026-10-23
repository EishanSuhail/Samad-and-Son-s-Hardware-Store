# Database

The app uses PostgreSQL through Prisma 7. The schema is in `prisma/schema.prisma`, the migrations are in `prisma/migrations`, and the seed script is `prisma/seed.ts`. Prisma reads the connection string from `DATABASE_URL` (see `prisma.config.ts`). The application's runtime connection uses the `@prisma/adapter-pg` driver with the same variable.

The generated client is written to `src/generated/prisma` (not committed). Regenerate it with `npx prisma generate` after any schema change. `npm install` does this automatically.

## Models

| Model | Purpose |
| --- | --- |
| `AdminUser` | Owner and staff accounts. Stores the bcrypt password hash, role (`OWNER` or `STAFF`), `isActive`, failed sign-in count, lock time and last sign-in. |
| `AuditLog` | Activity log: who did what, when, from which IP, with a small JSON `details` field. Entries are written by the app and never edited from the UI. |
| `Category` | The 17 product categories. Has a unique name and slug, a sort order, an optional photo, and `isActive`. |
| `Brand` | Brand names. Created automatically the first time a product is saved with that brand. |
| `Unit` | Units of measure (Piece, Box, Kilogram, ...). Products store the unit name as text and must use a name from this table. There is no admin screen for units. |
| `Product` | The catalogue. Unique SKU and slug, category, optional brand and product type (`subcategory`), descriptions, unit, pricing mode, prices, stock settings, `isFeatured`, `isActive` (published or archived) and `isSample`. |
| `ProductImage` | Photos for a product, in order, with optional alt text. `publicId` is set for Cloudinary images. |
| `ProductAttribute` | Specifications as name and value pairs (for example Thickness = 18 mm). A product cannot have the same specification name twice. |
| `InventoryMovement` | Every stock change: type, change, resulting quantity, reason, and the order or admin user involved. |
| `Order` | A website order request: unique reference (`SH-...`), status, customer name and phone, pickup or delivery, address, customer notes, internal notes, estimated subtotal and a flag for unpriced items. |
| `OrderItem` | Lines of an order. Stores a copy of the product name, SKU, unit and unit price at the time of the order. |
| `Quotation` | A quotation request: unique reference (`QT-...`), status, customer details, preferred contact method, notes, the shop's response, optional quoted total and internal notes. |
| `QuotationItem` | Lines of a quotation, with a copy of the product name, SKU, unit and quantity. |
| `Setting` | Key and JSON value pairs for the site settings (business name, contact details, switches and so on). |

Relations to note:

- Deleting a category is blocked by the database while products still belong to it (`Restrict`). The app also refuses this and tells the owner.
- Deleting a product removes its images, specifications and stock movements (cascade). Order and quotation lines keep their snapshot and get `productId` set to null.
- Deleting an order or a quotation removes its lines (cascade). The admin UI does not offer deleting orders or quotations; the normal way to close one is to cancel it or set it to Closed.

## Money is stored as whole paise

All amounts are integers in **paise**, where 100 paise = ₹1. Values such as `pricePaise`, `salePricePaise`, `unitPricePaise`, `subtotalPaise` and `quotedTotalPaise` never use floating-point numbers.

- `rupeesToPaise("1,250.50")` returns `125050`. It accepts up to two decimal places and strips `₹`, commas and spaces. It returns `null` for anything else.
- `formatPaise(125050)` returns `₹1,250.50` (Indian digit grouping).
- `effectivePricePaise(product)` is the price a customer pays per unit. It returns the sale price only when the product is `FIXED`, a price exists and the sale price is lower than the regular price. Otherwise it returns `null` for Price on Request, or the regular price.

Prices are always read from the database when a cart, order or quotation is submitted. Anything the browser sends about price or product name is ignored.

## Pricing modes

- `PRICE_ON_REQUEST` (default): no price is stored or shown. Such lines are left out of the estimated subtotal, and the customer is told the subtotal excludes them.
- `FIXED`: `pricePaise` is required. `salePricePaise` is optional and must be lower than the price.

Switching a product to Price on Request clears its price. The bulk "Set price" action also clears sale prices.

## Order snapshots

When an order or quotation is saved, each line copies the product's name, SKU, unit and (for orders) unit price. Later changes to the product do not change past orders or quotations. This is why deleting a product does not change order history.

The order's `subtotalPaise` is calculated on the server from current prices, and it is an estimate. `hasUnpricedItems` is true when at least one line has no price.

## Stock and inventory rules

Stock applies only to products with `trackInventory = true`. Untracked products have no stock limit and produce no stock movements.

Stock is changed only through the helpers in `src/lib/inventory.ts`:

- `applyStockChange` changes the quantity with an atomic database increment and writes an `InventoryMovement` with the resulting quantity. If the result would be below zero, it throws and the surrounding transaction is rolled back.
- `setStockTo` sets an exact quantity. It locks the product row first (`SELECT ... FOR UPDATE`), records only the difference, and does nothing if the quantity is unchanged.

Movement types:

| Type | When it is written |
| --- | --- |
| `INITIAL` | A new product is saved with opening stock. |
| `ADJUSTMENT` | Stock changed on the product form, on the Inventory page, or by a bulk stock update. |
| `IMPORT` | A CSV import sets a product's stock. |
| `ORDER_DEDUCTION` | An order moves to a stock-holding status for the first time (see below). |
| `ORDER_RESTORE` | A confirmed order is cancelled, and the stock it took is put back. |

Order stock rules:

- **Website order submission does not change stock.** It is only a request.
- **Stock is taken when the order first reaches Confirmed** (or any later stock-holding status: Being prepared, Ready for pickup, Dispatched, Completed). Duplicate lines for the same product are merged into one deduction.
- **If there is not enough stock, the status change is refused** and nothing changes. The message names the product and the shortfall.
- **Each order can deduct a product only once.** The database has a unique constraint on `(orderId, productId, type)` for movements, so two admins clicking Confirm at the same moment cannot deduct twice.
- **Cancelling an order puts back exactly what was deducted.** It is also only done once. Cancelling a pending order changes no stock.
- Manual movements have no order ID, so the unique constraint does not apply to them (PostgreSQL treats NULL values as distinct).

## Order and quotation statuses

Orders (`OrderStatus`): `PENDING` (New, awaiting confirmation), `CONFIRMED`, `PROCESSING` (Being prepared), `READY_FOR_PICKUP`, `DISPATCHED`, `COMPLETED`, `CANCELLED`.

Rules from `src/lib/orders.ts`:

- Status only moves forward through the list. A status cannot be set back.
- Pickup orders use `READY_FOR_PICKUP`; delivery orders use `DISPATCHED`. The other one is not offered.
- Steps can be skipped forward (for example, from New straight to Completed).
- `COMPLETED` and `CANCELLED` are final. `CANCELLED` can be chosen from any status before those two.
- Every status change is written to the activity log.

Quotations (`QuotationStatus`): `NEW`, `UNDER_REVIEW`, `QUOTATION_PREPARED`, `SENT_TO_CUSTOMER`, `ACCEPTED`, `REJECTED`, `CLOSED`. Quotations have no stock effect and can be set to any status.

## Settings

`Setting` rows hold these keys: `businessName`, `founderName`, `address`, `landmark`, `whatsappNumber`, `phoneNumber`, `email`, `businessHours`, `googleMapsUrl`, `socialLinks` (`facebook`, `instagram`, `youtube`), `aboutText`, `whyChooseUs`, `orderSubmissionEnabled`, `pickupEnabled`, `deliveryEnabled`, `showStock`, `logoUrl`, `founderPhotoUrl`.

If a key is missing, the app uses built-in defaults from `src/lib/business.ts` and `src/lib/settings.ts`. The settings page saves all keys in one transaction and records only the names of the keys that changed in the activity log, not their values.

## Migrations

There is one migration so far: `prisma/migrations/<timestamp>_init`. The migrations folder and `migration_lock.toml` belong in version control. Do not edit an applied migration by hand.

**Development** (creates migration files from schema changes):

```bash
# edit prisma/schema.prisma, then:
npm run db:migrate -- --name short_description_of_change
```

Commit the new folder under `prisma/migrations`.

**Production or any shared database** (applies existing migrations, creates none, never prompts):

```bash
npx prisma migrate deploy
```

**Test database**: `npm test` creates the `*_test` database if needed and runs `prisma migrate deploy` on it. See [TESTING.md](TESTING.md).

**Never on a database with data you need:**

- `prisma migrate reset` drops every table and deletes all data. Prisma also runs the seed after a reset.
- If `prisma migrate dev` reports drift and offers to reset, answer no and find out why first.

## Seed data

`npm run db:seed` runs `prisma/seed.ts`. It is written so it can be run more than once. It creates or updates:

1. **13 units**: Piece, Box, Packet, Kilogram, Bag, Litre, Millilitre, Metre, Foot, Roll, Sheet, Set, Bundle.
2. **17 categories**, in the launch order. Re-running updates their sort order only, so renamed categories keep their names.
3. **Default settings**, created only when missing. Existing values are never overwritten, so the owner's edits are safe. The defaults are: pickup on, website orders on, delivery off, stock shown.
4. **12 SAMPLE products**, with SKUs `SAMPLE-001` to `SAMPLE-012`. Each has `isSample = true`, a name starting with `[SAMPLE] `, and a description that says it is development data.

The sample products have a few placeholder values so that cart maths and stock messages can be tested:

| SKU | Product | Price | Stock |
| --- | --- | --- | --- |
| SAMPLE-002 | PVC Pipe | ₹250 | 40 |
| SAMPLE-008 | Sandpaper Sheet | ₹15 | 3 |
| SAMPLE-011 | Wall Putty | ₹900 | 0 (out of stock) |

The other sample products have no price (Price on Request) and no stock tracking.

**Re-running the seed overwrites the sample products.** Their fields and specifications are reset to the seed values, and any sample product you deleted is created again. Do not run the seed after you have removed the samples.

The seed does **not** create any admin account. Use `npm run admin:create`.

Because the migrations contain no data and the admin screens cannot create units, a new production database needs the seed to get its units and categories. Then remove the sample products (below). See [DEPLOYMENT.md](DEPLOYMENT.md).

## Removing sample data safely

Do this before launch, and only after taking a backup ([BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)).

1. **List the samples:**

   ```sql
   SELECT sku, name FROM "Product" WHERE "isSample" = true ORDER BY sku;
   ```

2. **Check whether any real order or quotation uses them.** Expect `0` for both on a fresh database.

   ```sql
   SELECT COUNT(*) FROM "OrderItem" oi JOIN "Product" p ON p.id = oi."productId" WHERE p."isSample";
   SELECT COUNT(*) FROM "QuotationItem" qi JOIN "Product" p ON p.id = qi."productId" WHERE p."isSample";
   ```

   Non-zero results are not a problem. The lines keep their saved name and price. Still, record it.

3. **Delete them**, using one of these:

   - **Through the admin panel** (owner only): open each sample product and use Delete product, or use Archive if you want to keep them hidden.
   - **In SQL**, in a transaction, after checking the count:

     ```sql
     BEGIN;
     DELETE FROM "Product" WHERE "isSample" = true;
     -- Check the number of rows reported, then:
     COMMIT;   -- or ROLLBACK; if the count is wrong
     ```

     This also removes their images, specifications and stock movements, and leaves order and quotation lines in place with `productId` set to null.

4. **Do not run `npm run db:seed` again** on that database.

Categories and units are not sample data. Keep them.

## Useful checks

```sql
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "Product" WHERE "isActive" = false;
SELECT status, COUNT(*) FROM "Order" GROUP BY status;
SELECT key FROM "Setting" ORDER BY key;
```
