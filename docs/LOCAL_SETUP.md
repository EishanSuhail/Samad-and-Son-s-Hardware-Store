# Local setup

This guide gets the site and admin panel running on your own computer for development or testing.

For the live server, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Prerequisites

- **Node.js 22.12 or newer** (22 LTS or 24 are fine). The project has no `engines` field in `package.json`. The minimum comes from the dependencies: Prisma 7 needs Node 20.19+, 22.12+ or 24+, and Vitest 5 (used for tests) needs 22.12+, 24+ or 26+.
- **npm** (installed with Node.js).
- **PostgreSQL**, any currently supported release. The version is not pinned in the project. Install it with your operating system's package manager or the official installer, and make sure you can connect with `psql`.
- **Git**, to clone the repository.

Check your versions:

```bash
node -v
npm -v
psql --version
```

## 1. Get the code

```bash
git clone <repository-url> samad-hardware
cd samad-hardware
```

## 2. Install dependencies

```bash
npm install
```

The `postinstall` step runs `prisma generate`, which creates the Prisma client in `src/generated/prisma`. That folder is not committed, so this step must run on each machine. If you see errors about a missing `@/generated/prisma/client` module, run `npx prisma generate`.

## 3. Create the environment file

```bash
cp .env.example .env
```

**If a `.env` file already exists, do not run that command.** It would replace your existing values. Open the existing file and add or edit the values below instead.

Open `.env` and set the values below. Never commit `.env`; it is listed in `.gitignore`.

| Variable | What to put |
| --- | --- |
| `DATABASE_URL` | Connection string for your local PostgreSQL database, for example `postgresql://postgres:yourpassword@localhost:5432/samad_hardware` |
| `AUTH_SECRET` | A random string of at least 32 characters. See step 4. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local work |

Leave these blank or commented out locally:

- `CLOUDINARY_*`: optional. If they are not set, uploaded images are saved to the `uploads/` folder in the project.
- `UPLOAD_DIR`: optional. Overrides the upload folder. Defaults to `uploads/` inside the project.
- `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`: only read by `npm run admin:create`. The script asks for these when they are not set, which is the safer option. Passing a password on the command line can leave it in your shell history.

## 4. Generate AUTH_SECRET

`AUTH_SECRET` signs admin session tokens. Generate one and paste it into `.env`:

```bash
openssl rand -base64 48
```

Use a different value for every environment (local, test, production). If it is missing or shorter than 32 characters, the server throws `AUTH_SECRET must be set to a random string of at least 32 characters`.

## 5. Create the database

Create an empty database. The name must match the one in `DATABASE_URL`:

```bash
createdb samad_hardware
```

If `createdb` is not available, use `psql` to run `CREATE DATABASE samad_hardware;`.

## 6. Create the tables

```bash
npm run db:migrate
```

This runs `prisma migrate dev`, which applies the migrations in `prisma/migrations` to your database. Development migrations can also create new migration files when the schema changes. Do not use `prisma migrate reset` on any database with data you want to keep. It deletes everything. See [DATABASE.md](DATABASE.md) for the full migration workflow.

## 7. Load seed data

```bash
npm run db:seed
```

The seed creates:

- the 13 units of measure, which the product forms need,
- the 17 product categories,
- default settings,
- 12 placeholder products, all labelled `[SAMPLE]`.

The seed can be run again safely. See [DATABASE.md](DATABASE.md) for exactly what it changes.

## 8. Create an admin account

```bash
npm run admin:create
```

The script asks for:

1. the admin email address,
2. the full name,
3. a password (at least 12 characters, with letters and numbers), typed twice. Typing is hidden.

The account is an **owner** by default. For a staff account, run `npm run admin:create -- --role=staff`. To change an existing account's password, run `npm run admin:create -- --reset-password`. See [ADMIN_GUIDE.md](ADMIN_GUIDE.md) and [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md).

## 9. Start the site

```bash
npm run dev
```

- Website: http://localhost:3000
- Admin sign-in: http://localhost:3000/admin/login

Sign in with the account from step 8.

## Common problems

**`DATABASE_URL is not set`**
The `.env` file is missing, is not in the project root, or does not contain `DATABASE_URL`. Run commands from the project root.

**`Can't reach database server` or `ECONNREFUSED`**
PostgreSQL is not running, or the host and port in `DATABASE_URL` are wrong. Start the database service and check the port (5432 by default).

**`password authentication failed`**
The user name or password in `DATABASE_URL` is wrong. Special characters in a password must be URL-encoded inside the connection string.

**`relation "Product" does not exist`**
The migrations have not been applied. Run `npm run db:migrate`.

**`Cannot find module '@/generated/prisma/client'`**
The Prisma client has not been generated. Run `npx prisma generate`.

**Port 3000 is already in use**
Another program or an old copy of the site is using the port. Either stop it, or start on another port with `npm run dev -- -p 3001` and open http://localhost:3001. A different port does not change `NEXT_PUBLIC_SITE_URL`, which only affects canonical links and the sitemap.

**Odd 500 errors, or pages that do not match the code after an update**
The `.next` folder holds an old build cache. Stop the server, delete the folder, and start again:

```bash
rm -rf .next
npm run dev
```

**Sign-in works but the admin panel sends you back to the login page**
Check that `AUTH_SECRET` has not changed since you signed in. Changing it signs everyone out. Clear the site's cookies for `localhost` and sign in again.

**Uploaded images do not appear**
Check that the `uploads/` folder exists in the project and that the user running the server can write to it. Images are served from `/uploads/<name>`.

**Admin account cannot be created: "An admin with ... already exists"**
Use `npm run admin:create -- --reset-password` to set a new password for that account.
