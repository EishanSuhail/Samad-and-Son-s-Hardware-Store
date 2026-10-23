# Deployment

This guide describes two ways to run the site in production:

- **Option A**: Vercel for the Next.js app, with a managed PostgreSQL database and Cloudinary for images. This is the route the project is prepared for.
- **Option B**: a single Linux server (VPS) running the Node.js server directly behind a reverse proxy, with PostgreSQL and a persistent upload folder.

Nothing in this document means the site has been deployed. Follow it when you are ready.

Read the whole guide before you start, and complete [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before you announce the site.

## Requirements (both options)

- **Node.js 22.12 or newer** on the server or build environment. See [LOCAL_SETUP.md](LOCAL_SETUP.md) for why.
- **PostgreSQL** that the app can reach over the network. The project does not pin a version; use a currently supported release.
- **HTTPS** for the public domain. The production build sends a Strict-Transport-Security header, so the site must be served over HTTPS (see the headers section below).
- **Internet access during the build.** The build downloads the Archivo and Public Sans fonts from Google Fonts (`next/font/google`).

## Environment variables

Set these in your host (Vercel project settings, or the `.env` file on a server). Never commit real values.

| Variable | Required | Notes |
| --- | :---: | --- |
| `DATABASE_URL` | Yes | Connection string for the production database. Used by the running app and by the `prisma migrate deploy`, `db:seed` and `admin:create` commands. |
| `AUTH_SECRET` | Yes | A random string of at least 32 characters. Generate a new one for production with `openssl rand -base64 48`. Do not reuse a local value. |
| `NEXT_PUBLIC_SITE_URL` | Yes | The public address, for example `https://www.your-domain.example`, with no trailing slash. Used for canonical links, the sitemap and social previews. |
| `CLOUDINARY_CLOUD_NAME` | **Yes on Vercel** | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | **Yes on Vercel** | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | **Yes on Vercel** | Cloudinary API secret. Keep it private. |
| `UPLOAD_DIR` | Only on a server without Cloudinary | Absolute path to a folder that persists between restarts and deployments, outside the code folder. Used only when Cloudinary is not configured. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | No | Read only by `npm run admin:create`. Do not keep them set on the host. The script's prompts are safer. |

`NEXT_PUBLIC_` variables are built into the app when it is built. After you change `NEXT_PUBLIC_SITE_URL`, build and deploy again.

### Why Cloudinary is required on Vercel

Product and category photos are saved either to Cloudinary or to a folder on the server's disk. **On Vercel, Cloudinary is required.** The app's code folder is read-only at run time, and anything written elsewhere is not kept after the function finishes. Without Cloudinary, photo uploads will fail or be lost.

Do not change `CLOUDINARY_CLOUD_NAME` after photos have been uploaded. The app only accepts image links from its own Cloudinary account, so existing photos from another account will be refused the next time that product or category is saved.

## Rate limiting and the client IP address

Limits on sign-in attempts, quotation and order requests, uploads and imports are stored **in memory, per server instance**.

- Each instance has its own counts. On a platform that runs several instances (such as Vercel, where instances start and stop as needed), a visitor can get more attempts than the limit says.
- A restart clears the counts.
- For stronger limits, replace the store in `src/lib/rate-limit.ts` with a shared one. The code comment suggests Upstash Redis. This is a code change and is **not** done in this project yet.

The client address is taken from the first value of the `X-Forwarded-For` header, falling back to `X-Real-IP`, then to `unknown`. This matters in two ways:

- A proxy must **replace** `X-Forwarded-For` with the real client address. If it adds to a value supplied by the visitor, a visitor can fake their address and avoid the limits.
- If no address header is sent at all, every visitor shares the `unknown` bucket and the limits apply to all of them together.

Check this in your host's or proxy's documentation, and test it (see the checks below).

## Option A: Vercel with managed PostgreSQL

### 1. Create the database

1. Create a PostgreSQL database with a managed provider. Keep the connection string private.
2. Some providers require SSL in the connection string. Use the string your provider gives you, and check its documentation.
3. Note the connection string for `DATABASE_URL`.

Check the provider's backup and restore options before you rely on them. See [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md).

### 2. Set up Cloudinary

1. Create a Cloudinary account and note the cloud name, API key and API secret.
2. Use these as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.

### 3. Create the Vercel project

1. Import the Git repository into Vercel. Vercel detects Next.js.
2. Build command: the default, `npm run build`. Install command: the default, `npm install`. The install step runs `prisma generate` automatically through the `postinstall` script.
3. In the project settings, choose a Node.js version of **22.12 or newer**.
4. Add the environment variables from the table above. Set them for **Production**. If you use Preview deployments, do not point them at the production database. Give them a separate database, or leave `DATABASE_URL` unset for previews.

### 4. Create the tables

Run the migrations against the production database from a trusted computer. Use a shell where the variable is set only for that session, and do not save it in a file that gets committed:

```bash
DATABASE_URL="<production connection string>" npx prisma migrate deploy
```

`prisma migrate deploy` applies the migrations in `prisma/migrations` and creates nothing new. It is safe to run again. Do not use `prisma migrate dev` or `prisma migrate reset` against production.

You can also add `npx prisma migrate deploy` as a step before `npm run build` in the build command. That runs it on every build, so use it only if you are comfortable with that.

### 5. Load the first data

The migrations do not create any data. The seed creates the 13 units and 17 categories that the product forms need, and it also creates 12 SAMPLE products. Run it once, then remove the sample products before launch:

```bash
DATABASE_URL="<production connection string>" npm run db:seed
```

Then follow the steps in [DATABASE.md](DATABASE.md#removing-sample-data-safely). **Do not run the seed again after you have removed the samples.**

### 6. Create the owner account

```bash
DATABASE_URL="<production connection string>" npm run admin:create
```

Answer the prompts. Use a strong password. Staff accounts are created the same way with `-- --role=staff`. See [ADMIN_GUIDE.md](ADMIN_GUIDE.md).

### 7. Deploy

Before you deploy, in the Vercel project settings add `NEXT_PUBLIC_SITE_URL` with your real address (for example `https://www.yourshop.in`) **before the first build**: the value is read when the site is built, so changing it later needs a redeploy.

Deploy from Vercel (push to the production branch, or use the Vercel dashboard). When the build finishes, open the site and continue with the checks at the end of this guide.

### 8. Add your domain

1. In the Vercel project, open **Domains** and add your domain or subdomain.
2. Follow Vercel's DNS instructions at your domain registrar.
3. Set `NEXT_PUBLIC_SITE_URL` to the final address (for example `https://www.your-domain.example`), then deploy again.
4. Check that the HTTPS certificate is valid. Vercel manages certificates for domains added to the project; check its current documentation for details.

## Option B: a single Linux server

This runs the app with `npm start` on one machine. The machine must keep its own disk, so uploads persist.

### 1. Prepare the server

- Install Node.js 22.12 or newer, PostgreSQL (on the same machine or a separate one), and a reverse proxy such as Nginx or Caddy for HTTPS.
- Create a system user for the app, for example `samad`, that owns only the app folder and the upload folder.
- Create an upload folder outside the code, for example `/var/lib/samad-hardware/uploads`, owned by the app user. Do not put it inside the code folder, where a redeploy could replace it.

### 2. Get the code and install

```bash
sudo git clone <repository-url> /srv/samad-hardware
cd /srv/samad-hardware
npm ci          # uses package-lock.json; runs prisma generate
```

### 3. Create the production environment file

Create `/srv/samad-hardware/.env` with the variables from the table above. Set:

- `DATABASE_URL` to the production database,
- `AUTH_SECRET` to a new random value,
- `NEXT_PUBLIC_SITE_URL` to the public HTTPS address,
- `UPLOAD_DIR=/var/lib/samad-hardware/uploads`,
- the Cloudinary variables only if you use Cloudinary.

Restrict the file so only the app user can read it (for example `chmod 600 .env`).

### 4. Create the tables, load data, create the owner

```bash
npx prisma migrate deploy
npm run db:seed          # first time only; then remove the SAMPLE products
npm run admin:create
```

See the notes in Option A, steps 4 to 6.

### 5. Build and start

```bash
npm run build
npm start                # listens on port 3000; use `npm start -- -p 3100` to change it
```

Keep the server running with a process manager such as systemd or pm2, so it restarts after a reboot or a crash. Adjust the paths and user in any example you copy.

### 6. Put a reverse proxy in front

The app listens on `127.0.0.1:3000`. The proxy:

- terminates HTTPS and forwards requests to the app,
- **sets `X-Forwarded-For` to the real client address** (replacing any value sent by the visitor),
- allows uploads up to at least 6 MB, because the app accepts images up to 5 MB and the request adds some overhead.

Nginx example for the important lines (adapt the rest to your server):

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
}
client_max_body_size 6m;
```

Nginx's default upload limit is 1 MB, so the `client_max_body_size` line is needed for product photos. Caddy handles HTTPS automatically; check that it sets `X-Forwarded-For` the way described above.

Uploaded photos are served by the app itself at `/uploads/<name>`, so the proxy does not need a separate rule for them.

### 7. Updating a server deployment

```bash
cd /srv/samad-hardware
git pull
npm ci
npx prisma migrate deploy
npm run build
# restart the process manager service that runs `npm start`
```

Back up the database before updating (see [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)).

## Security headers (next.config.ts)

The app sends these headers on every page:

- **Content-Security-Policy**: limits where scripts, styles, images and connections may come from. Images may come from any `https:` address (needed for Cloudinary and for images you upload). Scripts and styles are limited to the site itself plus inline code that Next.js needs. Frames are blocked. In development the policy also allows `unsafe-eval` for the dev tools; production does not.
- **X-Frame-Options: DENY** and `frame-ancestors 'none'`: the site cannot be shown inside another site's frame.
- **X-Content-Type-Options: nosniff**.
- **Referrer-Policy: strict-origin-when-cross-origin**.
- **Permissions-Policy**: camera, microphone, geolocation and payment are switched off.
- **Strict-Transport-Security** (production builds only): `max-age=63072000; includeSubDomains`. Browsers will then use HTTPS only for the domain and all its subdomains for two years. Make sure every subdomain works over HTTPS before you deploy.

If you add a third-party script (analytics, a chat widget, a map embed), the Content-Security-Policy will block it until you add its address in `next.config.ts`. Test any change on a staging copy first.

## After deploying: checks

Run these on the live site. Tick them off in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) as you go.

- [ ] The domain opens over HTTPS with a valid certificate.
- [ ] `http://` addresses lead to the `https://` site. This depends on your host or proxy; check it.
- [ ] Headers are present. From a terminal: `curl -sI https://your-domain.example/ | grep -i -E "content-security|strict-transport|x-frame"`.
- [ ] `https://your-domain.example/robots.txt` and `/sitemap.xml` show your real domain.
- [ ] The page source shows a canonical link with your real domain.
- [ ] `/admin/login` loads. Sign in as the owner, open every menu item, then sign out.
- [ ] Upload one test photo to a product and save it. The photo appears on the product page. (On Vercel, this checks Cloudinary.)
- [ ] The WhatsApp button opens WhatsApp with the shop's number.
- [ ] Submit one test quotation and one test order. There is **no delete button for orders or quotations** in the panel, so mark each test record clearly (for example, put `TEST - do not process` in the customer name) and cancel the order or set the quotation to Closed.
- [ ] No `[SAMPLE]` products are visible on the site or in search.
- [ ] The site works on a phone (check the layout and the cart).
- [ ] The Activity log shows your sign-in.
- [ ] Backups are running (see [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)).


## After the first deploy: quick check

1. Open `https://YOUR-SITE/api/health`. It should show `{"ok":true}`. If it shows `{"ok":false}`, the site cannot reach the database: re-check `DATABASE_URL` (and SSL options) in the hosting settings.
2. In the admin, upload one photo. If you see "Image storage is not set up", the three Cloudinary variables are missing from the hosting settings. On Vercel the app deliberately refuses to save photos to disk, because they would be lost.
3. If the database complains about too many connections, set `DB_POOL_MAX` to a smaller number (each server instance keeps its own pool; the default is 5).
