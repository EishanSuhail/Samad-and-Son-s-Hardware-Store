# Backup and recovery

This guide covers what to back up, how to back it up, how to test a restore, and what to do after accidents or security problems.

The commands assume you have the PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) installed where you run them. `pg_dump` must be the same major version as the server or newer.

## What needs backing up

| What | Where it lives | Why it matters |
| --- | --- | --- |
| **Database** | Your PostgreSQL server | Products, prices, stock history, orders, quotations, admin accounts, settings, activity log. The most important item. |
| **Product and category photos** | Cloudinary (if configured) or the `UPLOAD_DIR` folder on the server (default `uploads/` in the project) | Database rows only store the photo links. Without the photos, the links break. |
| **Configuration** | Your host's environment settings, or the server's `.env` file | `DATABASE_URL`, `AUTH_SECRET`, Cloudinary keys. Keep a private copy in a password manager. |
| **Code** | Your Git repository | Rebuilt from Git. Keep the repository itself safe (for example, a private remote). |

A database backup alone does not restore photos. Back up both.

**Backups contain personal data.** Customer names, phone numbers and addresses are in the database, as are admin password hashes. Store backups somewhere private, restrict who can read them, and delete old copies you no longer need.

## Database backups

### Make a backup

```bash
pg_dump --format=custom --no-owner \
  --file="samad_hardware_$(date +%F_%H%M).dump" \
  "$DATABASE_URL"
```

- `--format=custom` produces a compressed file that `pg_restore` understands.
- `--no-owner` leaves out ownership details, which makes restoring to a different server or user easier.
- `"$DATABASE_URL"` is the production connection string. Set it only in the shell session you are using.

Check that the file can be read:

```bash
pg_restore --list samad_hardware_2026-10-23_0900.dump | head -20
```

This lists the contents without changing anything.

### Managed database providers

Many managed PostgreSQL providers offer automatic backups and point-in-time recovery. Check in your provider's documentation:

- how often backups are taken,
- how long they are kept,
- how to restore one, and whether restoring creates a new database or overwrites the old one,
- whether you can download a backup file.

Even with provider backups, keep your own dump file somewhere else if you can. It protects you if the provider's account is locked or an error affects the provider.

## Image backups

### Local folder (no Cloudinary)

Copy the whole upload folder. Use the path from `UPLOAD_DIR`, or the `uploads/` folder in the project if `UPLOAD_DIR` is not set:

```bash
rsync -a /var/lib/samad-hardware/uploads/ /path/to/backups/uploads/
```

Do this at the same time as the database backup, so that the photos match the product rows.

### Cloudinary

The app does not download or export Cloudinary assets. Keep your own copies of the photos on the computer or phone where you took them, and check Cloudinary's documentation for how to download or back up your media library.

## How often (recommendation)

These are starting points for a small shop. Adjust them to how much work you can afford to lose.

- **Database**: at least once a day, plus a backup just before every deployment, every bulk price change, and every CSV import.
- **Photos**: after each batch of new photos, and at least once a week.
- **Keep** several generations (for example, the last 30 days of daily backups) and at least one copy somewhere other than the server.
- **Test a restore** into a scratch database once a month (below).

## Test a restore into a scratch database

Do this on a separate database. Never test on the live one.

```bash
# 1. Create a scratch database with a name that is clearly not the live one
createdb samad_hardware_restore_test

# 2. Restore the dump into it
pg_restore --no-owner \
  --dbname="postgresql://USER:PASSWORD@HOST:5432/samad_hardware_restore_test" \
  samad_hardware_2026-10-23_0900.dump

# 3. Compare some numbers with the live database
psql "postgresql://USER:PASSWORD@HOST:5432/samad_hardware_restore_test" -c 'SELECT COUNT(*) AS products FROM "Product";'
psql "postgresql://USER:PASSWORD@HOST:5432/samad_hardware_restore_test" -c 'SELECT COUNT(*) AS orders, MAX("createdAt") AS latest FROM "Order";'
psql "postgresql://USER:PASSWORD@HOST:5432/samad_hardware_restore_test" -c 'SELECT COUNT(*) AS admins FROM "AdminUser";'

# 4. When finished, delete the scratch database
dropdb samad_hardware_restore_test
```

Optional: point a local copy of the app's `DATABASE_URL` at the scratch database and check that the admin panel shows the expected products and orders. Do not use the production `AUTH_SECRET` for this test unless you are working on a private machine.

### Restoring over the live database (emergency only)

Only do this when the live data is wrong or lost, and you have decided which backup to use.

1. Stop the website (stop the server, or pause the deployment), so nothing is written during the restore.
2. Take a fresh backup of the current database, even if it looks broken. You may need it.
3. Restore with `--clean --if-exists`, which drops the tables in the dump before recreating them:

   ```bash
   pg_restore --clean --if-exists --no-owner \
     --dbname="$DATABASE_URL" \
     samad_hardware_2026-10-23_0900.dump
   ```

4. Check the counts (as in the scratch test above).
5. Start the website again. Sign in and check the admin panel and a few products.

Photos are not restored by this step. Restore the image folder as well if you use local storage.

## After an accidental delete

The admin panel does not have an undo.

- **Product deleted**: it cannot be recovered from the panel. Options:
  - Restore the most recent backup into a scratch database (above), then copy the product's rows back with SQL. The rows are in `Product`, `ProductImage`, `ProductAttribute` and `InventoryMovement`. Get help from your developer for this.
  - Or re-create the product from your product CSV export, if you keep one, and re-upload its photos.
- **Category deleted**: the panel only allows deleting an empty category, so no products are lost. Re-create the category with the same name and slug, then move the products back.
- **Product archived by mistake**: open it and tick **Published**. Nothing is lost.
- **Wrong edit to a product**: the panel keeps no history of product edits. Re-enter the old values from your CSV export, or from a backup.
- **Wrong stock number**: set it to the correct count on the Inventory page, with a reason. The stock history keeps both changes.
- **Wrong settings**: the activity log records only which settings changed, not their values. Re-enter the correct values in Settings.
- **Orders and quotations**: the panel does not delete them. Cancel an order or close a quotation instead. If a record has been removed by database work, restore it from a backup.

## Changing AUTH_SECRET (signing everyone out)

`AUTH_SECRET` signs admin sign-in tokens. Change it when you suspect it has been seen by someone who should not have it, or when someone who had server access leaves.

**Effect:** every signed-in admin is signed out at once. Everyone must sign in again. No data is lost, and passwords do not change.

Steps:

1. Generate a new value:

   ```bash
   openssl rand -base64 48
   ```

2. Replace `AUTH_SECRET` in your host's environment settings, or in the server's `.env` file. Use a value of at least 32 characters.
3. Restart the server, or deploy again. Environment changes do not apply until the app restarts.
4. Sign in again to check.

Keep the new value in your password manager. Do not write it in a document or send it in a message.

## Resetting a forgotten admin password

Run this where `DATABASE_URL` points to the live database, usually on the server or in the host's shell:

```bash
npm run admin:create -- --reset-password
```

The script asks for the email address of the existing account, then asks for a new password twice. The password must be at least 12 characters with letters and numbers.

The reset also:

- clears the failed-sign-in count and any lock,
- **sets the account to active**, which means it also brings back an account that was switched off,
- writes an activity log entry marked as a password reset from the command line.

Give the new password to the account owner in person or through a secure channel. The panel has no change-password screen, so any later change is made with the same command.

### Switching a staff account off

The panel cannot deactivate accounts. To stop a staff member from signing in, set the account to inactive in the database, for example:

```sql
UPDATE "AdminUser" SET "isActive" = false WHERE email = 'staff@example.com';
```

The change takes effect on their next page load. To switch them back on, use `--reset-password` (which also sets a new password).

## Keep a recovery checklist

- [ ] Database backup runs automatically or on a schedule, and the last one is recent.
- [ ] Backups are stored in at least two places, one away from the server.
- [ ] Photos are backed up (folder copy, or Cloudinary export).
- [ ] `AUTH_SECRET`, `DATABASE_URL` and Cloudinary keys are in a password manager.
- [ ] A restore into a scratch database has been tested, and the date is written down.
- [ ] The owner knows who to call to reset a password, and that changing `AUTH_SECRET` signs everyone out.
