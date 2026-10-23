# Launch checklist

Work through this list before you tell customers about the website. Some items are for the owner, and some are for the person who set up the website (marked **[Developer]**). Tick each box when it is done.

Keep this file. Come back to it whenever you add a big change, such as a new range of products or a new branch.

## 1. Remove the sample products

The website comes with 12 placeholder products. Each one is labelled "[SAMPLE]" and shows a "Sample data" badge.

- [ ] Go to **Products** and search for `SAMPLE`. Every product found this way is placeholder data.
- [ ] For each one, either edit it into a real product, or delete it (owner only), or archive it so it is hidden.
- [ ] Search again for `SAMPLE` and confirm the list is empty.
- [ ] **[Developer]** Check in the database that no product has `isSample = true` (see [DATABASE.md](DATABASE.md#removing-sample-data-safely)).
- [ ] **[Developer]** Do not run the seed again on the live database.

## 2. Real products, prices and photos

- [ ] Add your real products, either one by one or with a CSV import (see [ADMIN_GUIDE.md](ADMIN_GUIDE.md)).
- [ ] Check every price. Use Price on Request for any product you do not want to show a price for.
- [ ] Check sale prices, if any, are lower than the normal price.
- [ ] Turn on stock tracking for the products you count, and enter the real stock numbers.
- [ ] Set the low-stock level for each tracked product.
- [ ] Add clear photos of each product. Use only photos you have the right to use.
- [ ] Check each product's descriptions and specifications. Include only facts you are sure of.
- [ ] Check every category has the right products, or is hidden until it does.
- [ ] Check the product names and spellings.

## 3. Shop details in Settings

- [ ] Business name and founder name are spelled correctly.
- [ ] Address and landmark are correct.
- [ ] **WhatsApp number** is correct and includes the country code. The WhatsApp buttons use this number.
- [ ] **Phone number** is correct, for the call buttons.
- [ ] Email address is correct, or left empty if you do not want it shown.
- [ ] **Opening hours** are filled in, or left empty. If empty, the site says the hours are not listed.
- [ ] **Google Maps link** points to the shop's exact location. Open it on a phone and check that it shows the right place.
- [ ] Facebook, Instagram and YouTube links are correct, or left empty if you do not use them.
- [ ] About text is correct and does not claim anything you cannot back up.
- [ ] "Why shop with us" lists only true points. Do not add awards, certificates or guarantees you do not have.
- [ ] Logo is uploaded, or you have decided to use the default mark.
- [ ] Founder photo is uploaded only if you are happy for it to be public, or left empty.

## 4. Policy pages

The Privacy, Terms and Returns pages are plain drafts. They describe what the site does, but they are not a legal document.

- [ ] Read the **Privacy Policy** and change anything that does not match what you actually do.
- [ ] Replace the **Returns and Refund** text with the shop's real rules. The draft does not promise any return period or refund.
- [ ] Read the **Terms and Conditions** and change anything that does not match how the shop works.
- [ ] Ask someone you trust, or a professional adviser, to review these pages. This checklist does not give legal advice.

## 5. Order settings

- [ ] **Accept website orders**: decide whether customers can send orders on the website. When off, customers are asked to order on WhatsApp or call.
- [ ] **Store pickup available**: on, if customers can collect from the shop.
- [ ] **Delivery available**: on only if you deliver and can confirm the charge with each customer.
- [ ] **Show stock status**: decide whether customers see In stock, Low stock and Out of stock.
- [ ] Save the settings and check the changes on the website.

## 6. Accounts

- [ ] The owner account exists and uses a strong password (at least 12 characters, with letters and numbers).
- [ ] **[Developer]** Test accounts are removed or switched off. Ask the developer to list `AdminUser` rows and confirm only real people remain.
- [ ] Each staff member has their own account. Nobody shares a password.
- [ ] Staff accounts exist only for people who should have access.
- [ ] Everyone who uses the panel knows to sign out on a shared computer.
- [ ] The owner knows how a forgotten password is reset (see [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)).

## 7. Technical settings

**[Developer]**

- [ ] `AUTH_SECRET` is set to a new random value of at least 32 characters, generated for this server only.
- [ ] `DATABASE_URL` points to the live database, and only the live database.
- [ ] `NEXT_PUBLIC_SITE_URL` is the real public address, using `https://`.
- [ ] Cloudinary is set up and a test photo upload works. This is **required** on Vercel.
- [ ] Database migrations are applied with `prisma migrate deploy`.
- [ ] Rate limiting and client IP handling were reviewed (see [DEPLOYMENT.md](DEPLOYMENT.md)).

## 8. Automated checks

**[Developer]**

- [ ] `npm test` passes on the code being launched.
- [ ] `npm run typecheck` and `npm run lint` pass.
- [ ] `npm run build` completes without errors.
- [ ] If you run `npm run test:e2e`, run it against a staging copy or a local copy, not the live site. The browser tests create records named "E2E ..." and those should be removed afterwards (see [TESTING.md](TESTING.md)).

## 9. Test the whole flow by hand

Do these on the live site once the sample products are gone. Use a product you are happy to test with, and mark any test record clearly.

- [ ] **Quotation**: add a product to the quotation list on your phone, fill in the form and send it. Check the reference appears, and that the request shows in **Quotations** in the panel.
- [ ] **Website order**: add a product to the cart and send an order. Check the reference appears, and that the order shows in **Orders** as "New (awaiting confirmation)".
- [ ] **Confirm and cancel**: confirm the test order and check the stock number went down. Cancel it and check the stock went back. Use a product whose stock you can correct afterwards.
- [ ] **WhatsApp**: from the cart and from a product page, open WhatsApp. Check the message arrives at the shop's number and that the message lists the right items.
- [ ] **Clean up**: cancel the test order and set the test quotation to Closed. Name the test records clearly so they are not mistaken for real customers. The panel has no delete button for orders or quotations.

## 10. Phone check

- [ ] Open the home page, categories, a product page, the cart and the quotation page on a phone.
- [ ] Check that you can read the text without zooming, and that the page does not scroll sideways.
- [ ] Check the menu opens and closes.
- [ ] Sign in to the admin panel on a phone and check the product list and an order.

## 11. Search engines

- [ ] Open `https://your-domain.example/robots.txt` and `/sitemap.xml`. Both should show your real domain.
- [ ] Create or sign in to a Google Search Console account and add your website. Verify you own it, using the method Search Console offers.
- [ ] Submit the sitemap (`/sitemap.xml`) in Search Console.

## 12. Backups

- [ ] A database backup is set up to run on a schedule, and one backup has been made by hand.
- [ ] A restore has been tested into a scratch database (see [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)).
- [ ] Product photos are backed up (copy of the upload folder, or your own copies of the photos for Cloudinary).
- [ ] `AUTH_SECRET`, `DATABASE_URL` and the Cloudinary keys are saved in a password manager, not in a document or a message.

## 13. Ready for customers

- [ ] The owner has read the [ADMIN_GUIDE.md](ADMIN_GUIDE.md).
- [ ] Someone is named to check **Orders** and **Quotations** every working day. The website does not send an alert.
- [ ] Staff know that a website order is a request, not a payment, and is not final until the shop confirms it.
- [ ] Staff know how to reply to a quotation, and that the panel does not send it for them.
- [ ] The owner knows who to contact about a technical problem, and how to sign in if locked out.
- [ ] Someone will check the site after each change, especially prices and stock.
