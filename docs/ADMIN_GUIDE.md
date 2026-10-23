# Admin guide

This guide is for the shop owner and staff. It explains how to use the admin panel to keep the website up to date: products, prices, stock, orders and quotation requests.

You do not need to be a developer to use the panel. Some one-time setup steps (creating the first account, making the website live) are done by whoever set up the website. This guide marks those steps.

## Who can do what

There are two kinds of account:

- **Owner**: can do everything.
- **Staff**: can run the day-to-day work but cannot change the website's settings, see the activity log or delete things.

| Task | Staff | Owner |
| --- | :---: | :---: |
| Dashboard | Yes | Yes |
| Add and edit products, publish or archive them | Yes | Yes |
| Bulk changes to products (prices, stock, category, publish) | Yes | Yes |
| Import and export product spreadsheets | Yes | Yes |
| Add and edit categories, reorder them, show or hide them | Yes | Yes |
| Change stock and low-stock levels | Yes | Yes |
| Confirm, change and cancel orders | Yes | Yes |
| Reply to quotation requests | Yes | Yes |
| **Delete a product** | No | Yes |
| **Delete a category** | No | Yes |
| **Change website settings** | No | Yes |
| **View the activity log** | No | Yes |

If staff open an owner-only page, they are sent back to the dashboard with the message "That page is for the store owner only."

## Signing in

1. Go to the website address and add `/admin/login` to the end, for example `https://your-shop-website.example/admin/login`.
2. Enter your email address and password, then press **Sign in**.
3. You stay signed in for **8 hours**. After that, sign in again.
4. To sign out, press **Sign out** at the bottom of the left menu (on a phone, at the bottom of the screen).

**Keep your password private.** Use a password that is at least 12 characters long and contains both letters and numbers. Do not share one account between two people; ask for a staff account for each person.

**If you enter the wrong password five times in a row**, the account is locked for **15 minutes**. The message says "Too many failed attempts." Wait 15 minutes and try again. Trying many different emails or passwords from one computer is also blocked for a while ("Too many sign-in attempts"). These limits clear themselves after 15 minutes.

**If you forget your password**, ask whoever manages the website to reset it (see [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)). There is no "forgot password" button.

## Creating accounts (one-time, by the person who sets up the site)

The panel cannot add or remove staff. This is done from the server, by the person who manages the website:

- Owner account: `npm run admin:create`
- Staff account: `npm run admin:create -- --role=staff`

The script asks for the email, the name and a password. Passwords are never shown on screen.

**To stop a staff member from signing in**, the website manager sets their account to inactive in the database. A signed-in session ends on their next page load. Ask the manager to do this on the day someone leaves.

## Dashboard

The first page shows:

- total products, active (published) products,
- low-stock and out-of-stock products,
- total orders and pending orders,
- new quotation requests.

Tap or click any number to open that list. The dashboard also shows the five latest orders and the latest activity.

## Products

### Finding products

Go to **Products**. Use the search box to find a product by name, SKU or brand. Use the filters to show:

- published or archived products,
- low stock or out of stock,
- one category.

The list shows 25 products per page.

### Adding a product

1. Go to **Products**, then press **Add product**.
2. Fill in the form:
   - **Product name**: the name customers see.
   - **SKU**: your own unique code for the product. Use letters, numbers and `. _ - /`. Two products cannot share a SKU.
   - **Web address** (optional): leave it empty and it is created from the name.
   - **Category**: choose one.
   - **Product type** (optional): for example "Emulsion" or "Elbow". Used by the Product type filter on the website.
   - **Brand** (optional): type the brand. A new brand name is added automatically.
   - **Sold per (unit)**: for example Piece, Bag, Litre. Choose from the list.
   - **Short description**: one or two lines shown on product cards.
   - **Full description**: only facts you are sure of.
   - **Pricing**: see below.
   - **Track stock**: see below.
   - **Specifications**: name and value pairs, for example "Thickness: 18 mm". Suggestions appear for the category.
   - **Photos**: see below.
   - **Published**: untick to hide the product from the website.
   - **Featured on the homepage**: tick to show it on the home page.
3. Press **Create product** (or **Save product** when editing). Nothing is saved until you press the button. If a field needs attention, the message at the top says so and nothing is saved.

### Price on Request or a fixed price

- **Price on Request**: the website shows "Price on Request", not a number. Customers are asked to enquire. Use this when prices change often or you prefer to quote each customer.
- **Fixed price**: enter the price per unit in rupees, for example `250` or `250.50`. Optionally enter a **sale price**. It must be lower than the price. The website then shows the sale price, with the normal price crossed out.

The cart adds up only the products that have a fixed price. It shows a note that Price on Request items are not included in the estimate. The customer is told the final amount is confirmed by the shop.

### Tracking stock

Tick **Track stock** to keep a count for the product. Then enter:

- **Quantity in stock**: the current count. Changing this number is recorded in the stock history.
- **Low-stock warning at**: when the count reaches this number or lower, the product shows as Low stock.

When stock is tracked:

- the website can show In stock, Low stock or Out of stock (this can be switched off in Settings),
- the cart warns the customer when a quantity is more than the stock available, and the website will not accept the order until the cart is fixed,
- confirming an order takes its quantity off the stock (see Orders below).

If you do not tick Track stock, the product has no stock count and no limit.

### Photos

- Press **Choose photos** and pick JPG, PNG or WebP files. Each file must be 5 MB or smaller.
- You can add up to **8 photos** per product.
- The first photo is the main photo. Use the arrows on each photo to change the order, or the red button to remove it.
- Nothing is saved until you press **Save product**.
- Use clear photos of the actual product. Only upload photos you have the right to use.

### Publishing, archiving and deleting

- **Archive** (or untick **Published**) hides a product from the website. Nothing is lost, and you can publish it again later.
- **Delete product** removes the product for good, with its photos and its stock history. Past orders keep their own copy of the name and price. Only the owner can delete. The product page asks you to tick a box before it will delete. If you only want to hide a product, archive it instead.

### Changing many products at once

On the Products list, tick the products (the checkbox on each row), choose an action, and press **Apply**. Actions:

- **Set price**: sets the same price on all of them, and removes their sale prices. Products on Price on Request are switched to a fixed price.
- **Change prices by %**: for example `10` raises every price by 10%, and `-5` lowers them by 5%. Prices are rounded to the paisa. Products with no price are left alone.
- **Set stock quantity**: sets the stock of each selected product and turns on stock tracking for them.
- **Move to category**: moves them to the category you choose.
- **Archive (hide)** or **Publish**.

Read the message that appears after an action. It says how many products changed.

## Importing products from a spreadsheet

Use this to add or update many products at once. Keep a copy of your current product list first: export it (see below) before you import.

1. Go to **Products**, then **Import CSV**.
2. Press **Download CSV template**. It has the right column names and one example row. Delete that example row or replace it. If you import it unchanged, it creates a product called "Example product name" with SKU `SAMPLE-100`.
3. Fill in one product per row. Keep the top row (the column names) exactly as it is.
4. Save the file as a CSV:
   - Excel: **Save As**, then **CSV UTF-8**.
   - Google Sheets: **File**, then **Download**, then **Comma-separated values (.csv)**.
5. Upload the file. Choose what happens when a SKU already exists:
   - **Update it**: the product's details are updated from the file.
   - **Skip it (only add new products)**: existing products are not touched.
6. Press **Check file**. Nothing is changed yet. You see every row marked as:
   - **Will be added**,
   - **Will update**,
   - **Skipped (exists)**,
   - **Has errors**, with the problem written underneath.
7. Fix the rows with errors in your spreadsheet and import again, or press **Download error report** to get a list of them. Rows with errors are left out; the other rows still import.
8. Press **Import N products**. When it finishes, the summary shows how many were added, updated, skipped and left out.

Limits: a file must be under 500 KB and have at most 2,000 product rows. You can run up to 10 imports per hour.

### Columns

| Column | Required | What to put |
| --- | :---: | --- |
| `sku` | Yes | Your unique code. Letters, numbers and `. _ - /`, up to 60 characters. |
| `name` | Yes | Product name, 2 to 160 characters. |
| `category` | Yes | The exact name of a category, for example `Wall Putty`. Capital letters do not matter. |
| `subcategory` | No | Product type, for example `Emulsion`. |
| `brand` | No | Brand name. |
| `unit` | Yes | One of: Piece, Box, Packet, Kilogram, Bag, Litre, Millilitre, Metre, Foot, Roll, Sheet, Set, Bundle. |
| `short_description` | No | One or two lines. |
| `description` | No | Longer text. |
| `price` | No | Price in rupees, for example `250` or `250.50`. Leave empty for Price on Request on a new product. |
| `sale_price` | No | Sale price in rupees. Must be lower than `price`, and needs a `price`. |
| `track_inventory` | No | `yes` or `no`. |
| `stock` | No | Whole number of units in stock. Putting a number here turns stock tracking on. |
| `low_stock_threshold` | No | Whole number. The low-stock warning level. |
| `featured` | No | `yes` or `no`. Show on the homepage. |
| `active` | No | `yes` or `no`. `no` means archived (hidden). Empty means published for a new product. |
| `specs` | No | Specifications as `Name=Value; Name=Value`, for example `Thickness=18 mm; Sheet dimensions=8 ft x 4 ft`. |

Yes or no can be written as `yes`, `y`, `true`, `1` or `no`, `n`, `false`, `0`.

**Blank cells on existing products do not clear anything.** If a row for an existing SKU has an empty `brand`, the brand stays as it was. To remove a price or change a product to Price on Request, use the product form instead.

Stock from an import is recorded in the stock history as an import.

### Exporting

Press **Export CSV** on the Products page to download every product, including archived ones, in the same column layout. Keep the file somewhere safe. It is a good way to keep a copy before a big change.

## Categories

Go to **Categories**.

- **Add a category** with a name, optional web address, description and photo.
- **Move up or down** with the arrows. The order shown here is the order on the website.
- **Deactivate** a category to hide it from the website, along with all of its products. **Activate** shows it again.
- **Delete a category** is owner only, and is possible only when the category has no products. Move or delete its products first.

## Inventory

Go to **Inventory**. It lists the published products that have stock tracking on, lowest stock first. Products that are out of stock or low are marked.

- **Change stock**: choose **Add / remove** and enter a positive number to add, or a negative number to remove. Or choose **Set to** and enter the exact count after a stock check. You cannot go below zero.
- **Reason** (optional): for example "Delivery from supplier" or "Damaged". It is kept in the stock history.
- **Low-stock warning at**: change the level and press **Save**.
- **Recent stock movements** at the bottom show the latest changes, with the reason and the quantity after the change.

Stock changes from orders are recorded automatically (see below).

## Orders

Orders come from the website. A customer picks products, enters their name and phone number, and presses **Send order to shop**. Nothing is paid online.

**The website does not send you a notification.** Check **Orders** regularly, or whenever you expect new requests. The Dashboard shows pending orders.

Each order has a reference that starts with `SH-` and the date. The customer sees it on screen and can quote it when they call or message you.

### Working through an order

1. Open the order from **Orders**. Check the items, quantities and the estimated subtotal.
2. Call or WhatsApp the customer, using the buttons on the order page. Confirm the items are in stock, the final price, and (for delivery) the address.
3. Press **Mark as confirmed**. **This is the step that takes the stock off the shelf in the system.** If there is not enough stock, the panel refuses and tells you what is short. Then either change the stock on the Inventory page and try again, or cancel the order.
4. Move the order along with the buttons that appear: **Mark as being prepared**, then **Mark as ready for pickup** (pickup orders) or **Mark as dispatched** (delivery orders), then **Mark as completed**.
5. Use the internal notes box for your own notes. The customer cannot see them.

You can skip a step, for example go from New straight to Completed. The system only allows moving forward, so an order cannot go back to an earlier step.

### Order statuses

| Status shown | Meaning |
| --- | --- |
| New (awaiting confirmation) | Received. Not yet checked with the customer. No stock has been taken. |
| Confirmed | You have agreed the order with the customer. Stock has been taken. |
| Being prepared | Items are being collected or packed. |
| Ready for pickup | Customer can collect it from the shop. |
| Dispatched | Order has left for delivery. |
| Completed | Done. This cannot be changed. |
| Cancelled | Cancelled. If stock had been taken, it is put back. This cannot be changed. |

### When stock is taken and put back

- Placing an order on the website **does not** take stock. Two customers can request the same last item. Whichever order you confirm first gets it.
- Confirming an order takes its quantities off the stock (only for products with stock tracking on).
- Cancelling a confirmed order puts the same quantities back. Cancelling a new order changes no stock.
- Each order takes stock only once and gives it back only once.

### Cancelling an order

Open the order, tick **Yes, cancel this order**, and press **Cancel order**. The box stops you cancelling by accident. A cancelled order cannot be reopened, so check with the customer first.

### Searching orders

Search by reference, customer name or phone number. Filter by status and by date range (India time).

## Quotations

Some customers ask for a quotation instead of an order. They add products to their quotation list and send a request with their name and phone number. Each request has a reference that starts with `QT-`.

Go to **Quotations**. New requests are marked New.

1. Open the request. You see the customer's name, phone number (tap to call or open WhatsApp) and the products they asked about with quantities.
2. Prepare the prices and availability.
3. On the request page, set the **Status**, for example Under review, Quotation prepared, Sent to customer, Accepted, Rejected or Closed.
4. Optionally enter the **Quoted total** in rupees.
5. Write the **Message to the customer** with the details of your quotation.
6. Press **Save**.

**Saving does not send anything to the customer.** Send the quotation yourself by WhatsApp or phone. Use the internal notes box for your own notes.

## Settings (owner only)

Go to **Settings**. Press **Save settings** at the bottom. If a field is wrong, the message says which one, and nothing is saved until all fields are correct.

- **Business details**: business name, founder name, address, landmark and opening hours. Opening hours appear on the website only when you fill them in. Write one line per day or range.
- **Google Maps link**: paste the share link of the shop's exact location (from Google Maps, "Share"). If you leave it empty, the website sends visitors to a map search for the written address.
- **Contact**: the **WhatsApp number** with the country code (for example `+91 7006839895`). This number is used by the WhatsApp buttons across the site. The phone number is used for call buttons. The email is optional and shown only when filled in. Facebook, Instagram and YouTube links are optional, and must start with `https://`.
- **Homepage and About page**: the About text (separate paragraphs with a blank line) and "Why shop with us" (one point per line, up to 10). Do not add awards, certificates or guarantees that you cannot back up.
- **Logo and founder photo**: optional. Upload a JPG, PNG or WebP under 5 MB. Without a logo, the website shows a simple "SS" mark. Only upload a photo of yourself that you are happy to show publicly.
- **Ordering and display**:
  - **Accept website orders**: when off, the cart does not show the order form. Customers are asked to order on WhatsApp or call the shop. Quotation requests are separate.
  - **Store pickup available**: when off, customers cannot choose pickup.
  - **Delivery available**: when on, customers can enter a delivery address. Delivery charges are not calculated by the website; confirm them with the customer.
  - **Show stock status**: when off, the website hides In stock, Low stock and Out of stock labels.

Changes appear on the website straight after saving.

## Activity log (owner only)

Go to **Activity log**. It records who did what and when, for example product changes, stock changes, order status changes, settings changes, sign-ins and failed sign-ins. Entries cannot be edited or deleted from the panel. The settings entry records which settings changed, not their old or new values.

## Simple rules to follow

- Do not give your password to anyone. Ask for a separate account for each person.
- Sign out when you leave a shared computer.
- Confirm an order with the customer before you press Mark as confirmed.
- Archive products you no longer sell rather than deleting them, unless you are sure.
- Keep the WhatsApp number, address and opening hours in Settings up to date. Customers see them.
- Do not add certificates, awards or guarantees to the website unless they are true.
- Review the Privacy, Terms and Returns pages with the person who manages the website. They are drafts. Their wording must match how the shop actually works.

## If something looks wrong

- **A product shows the wrong price**: check whether it is on Price on Request or a fixed price, and whether a sale price is set.
- **A customer says a product is out of stock but it is on the shelf**: check the stock count on the Inventory page and set it to the real number, with a reason.
- **You cannot confirm an order**: the message names the product that is short. Adjust its stock or cancel the order.
- **The website looks out of date**: wait a minute and refresh the page. If it still looks wrong, tell the person who manages the website.
- **You are locked out**: wait 15 minutes. If it still fails, ask the website manager to reset your password.
