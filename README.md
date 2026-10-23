# Atelier — Shopify-style MVP for independent jewelry shops

**A functional jewelry-specific storefront + merchant dashboard, optimized for lean validation.**

**Status:** Usable local demo. Can become a shared, persistent live pilot by connecting a Supabase project and deploying a static frontend to Cloudflare Pages from a GitHub repository.

This is an original demonstration brand called **Atelier** (working name, not checked for trademarks). The three example jewelry stores and product illustrations are fictional. Replace samples with the pilot merchants' real brand assets and product photos, used with their permission.

## What is included?

- **Three fictional demo shops:** Maison Nour, Dar Dahab, Joud Jewelry. Switch stores in the preview dropdown; owners can create additional stores.
- **Branded responsive storefront:** home, product catalog, filters (type and karat), jewelry details, WhatsApp quote and in-store viewing requests, shareable product links.
- **Merchant studio:** login screen, overview, create/edit/delete items, photos, karat, weight, price-on-request or visible price, availability, branding and WhatsApp details, three themes.
- **Simple default wordmark** for unbranded shops: merchant name + geometric mark.
- **Two modes:** zero-setup demo with localStorage; connected multi-merchant Supabase mode with email/password sign-in, database and image uploads.
- **Supabase SQL:** stores and product catalog, row-level-security (RLS) access control, storage bucket and upload policy.

### What this does *not* do

No e-commerce payments, actual reservation guarantees, real-time gold rates, inventory synchronization with POS, customer-account system, recurring subscription billing, independent web domains, WhatsApp conversation tracking or booking confirmations. Clicking WhatsApp opens an inquiry; it does not prove a lead, booking or sale took place.

**Do not use fake demo gold information as real inventory.** Real gold quotations should be confirmed directly by merchants.

## 1. Try it locally (no installation)

1. Unzip this folder.
2. From the folder run: `python3 -m http.server 8000`
3. Open `http://localhost:8000/?store=maison-nour`
4. In the store, click **Merchant login**, then **Enter demo dashboard**.
5. Upload product photos, edit settings and see changes by opening **Preview store**.
6. Try the other demo shops: `?store=dar-dahab` and `?store=joud-jewelry`.

In demo mode, all edits live **only in the current browser's localStorage**. This works for a pitch/demo and *does not* share changes between devices, website visitors or merchants. The fictional WhatsApp numbers must be replaced before real use.

## 2. Push the source code to GitHub (use GitHub Pages only as a project demonstration)

1. Create an empty public GitHub repository, e.g. `jewelry-storefront-mvp`.
2. Upload all project files **to the repository root**, including the hidden `.nojekyll` file. You may also run:
   ```bash
   git init
   git add .
   git commit -m "Initial jewelry storefront MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/jewelry-storefront-mvp.git
   git push -u origin main
   ```
3. Your code is now in GitHub, ready for deployments and collaboration. For a purely noncommercial **project showcase**, you can explore GitHub Pages (Settings → Pages → Deploy from a branch → main → root), but review the use restrictions below.

**Critical:** GitHub officially says GitHub Pages is **not allowed as free hosting for an online business, e-commerce store, or commercial SaaS**. We should not use GitHub Pages to host our paid pilot or actual jewelry shops. Keep the source in GitHub, and deploy the working pilot through a commercial-friendly hosting provider such as Cloudflare Pages (next section). GitHub Pages cannot provide a backend database either.

### Deploy the storefront with Cloudflare Pages (recommended for pilot)

1. Visit https://dash.cloudflare.com/ and open **Workers & Pages → Create application → Pages → Connect to Git**.
2. Connect your GitHub repository. Choose the `main` branch.
3. Choose a **None / static HTML** framework preset, with **build command** `exit 0` and **build output directory** `.` (the repository root containing `index.html`).
4. Deploy. Cloudflare provides an HTTPS `*.pages.dev` URL.
5. View `https://YOUR_PROJECT.pages.dev/?store=maison-nour` for a demo.
6. You can connect a custom domain later. Changes pushed to GitHub will trigger deployments.

Cloudflare's current docs support deploying static HTML with Git integration. Review the provider's current commercial terms and plan limits before launch.

## 3. Enable real multi-merchant persistence with Supabase

1. Create your own Supabase project at https://supabase.com/.
2. In the **SQL Editor**, run `supabase/schema.sql` on a new project. If you run it multiple times, preexisting policies may give duplicate-name errors; do not assume it is an idempotent migration.
3. In **Project Settings → API Keys** (label may vary), copy:
   - Project URL, e.g. `https://abcxyz.supabase.co`
   - **Publishable** or legacy **anon** key (browser-safe when RLS is configured).
4. Edit `config.js`:
   ```js
   export const CONFIG = {
     supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
     supabasePublishableKey: 'sb_publishable_YOUR_KEY',
     productImageBucket: 'jewelry-products',
   };
   ```
5. **Never** put your Supabase `service_role` / secret key, database password, or privileged token in `config.js` or GitHub. Publishing a frontend key is intentional. Protect backend data with RLS.
6. In **Authentication → Users**, add/invite a pilot merchant. Provide that merchant with their email/password or use Supabase's official invite flow; do not share passwords in this repo. Disable unrestricted public signups when operating an invitation-only pilot. Configure authentication redirect URLs and domain for your deployment as needed.
7. Deploy the updated frontend with Cloudflare Pages (section 2). Visit your URL with `?admin=1` and log in with the merchant account.
8. If they have no shop yet, the dashboard will show **Create your first store**. Enter shop name, URL slug, and WhatsApp number; then add products.
9. Share the storefront URL `https://YOUR_PROJECT.pages.dev/?store=SHOP-SLUG` with customers. The visitor sees only that store's visible products; the merchant can manage its own data after sign-in.
10. Create a separate merchant user for another shop and verify that they cannot edit or delete products belonging to anyone else.

For a real pilot, review the SQL policies with a database engineer and test the exact live setup. The supplied RLS policies are a starting point, not a substitute for a full security review. Public store profile fields and published product photos can be viewed by anyone.

### Storage and permissions

- Only JPEG/PNG/WebP product images up to 5 MB can be uploaded in live mode.
- Authenticated merchant uploads are scoped to the merchant's authenticated user-ID folder, and the policy requires ownership of at least one shop.
- Uploaded product images are publicly visible by design. Do not upload identity documents, customer data or private inventory.
- Product row deletion does not automatically delete its uploaded file; review storage and remove old files as needed.
- The underlying Supabase project must be configured correctly. The frontend intentionally does not contain a privileged admin backend.

## 4. How to create a pilot shop without an existing brand

1. Set the shop name; the app creates a simple typographic wordmark automatically.
2. Choose **Ivory & Gold**, **Midnight Gold**, or **Sage & Gold**.
3. Add WhatsApp number, Instagram username and store address.
4. Upload 20–30 actual product photos (with permission) and accurate karat/weight information.
5. Choose whether each product displays a manually set price or **Price on request**.
6. Mark pieces as **Available**, **Reserved**, or **Sold** as needed. Sold items are hidden from the public catalog.
7. Share the storefront URL through Instagram bio / Facebook / WhatsApp.

**No payment checkout** in this MVP. Visiting requests are WhatsApp messages that require staff confirmation. Owners must update stock manually. No automatic gold price quotes are given.

## 5. What to measure in the Lean Startup pilot

Start with 10–15 owner/manager demos and aim for two **paid** pilots (deposits or signed order with actual payment).

Measure:
- Demo-to-deposit conversion.
- Time to onboard one shop and upload 20 real products.
- Owner's ability to create/edit products without your help.
- Number of genuine WhatsApp conversations / store visits **confirmed by the shop** (not just button clicks).
- Shop's monthly usage, satisfaction and willingness to renew.

Questions for interviews: Why is the current Instagram/WhatsApp catalog insufficient? Who updates products? How quickly does stock change? Does the owner want prices visible? Do they already use POS/ERP? What is their actual monthly software/marketing spend?

## 6. Files

```text
index.html         Responsive app shell
styles.css         UI / layout / mobile styling
app.js             Storefront, dashboard, authentication and product actions
art.js             Fictional product placeholder vector illustrations
data.js            Fictional demo shops and sample products
config.js          Browser-safe optional backend configuration
assets/favicon.svg Local vector favicon
supabase/schema.sql Database, data access and image-upload policies
.nojekyll          Make GitHub Pages serve assets without Jekyll conversion
```

## 7. Known pilot limitations and launch checklist

- Demo and live mode are distinct. Demo changes are not uploaded automatically to Supabase.
- Existing product images have to be uploaded with merchant permission; illustrations are placeholders only.
- Merchant branding is intentionally basic; uploading a standalone image logo is not supported yet.
- Share links use a query-string store slug, not a dedicated subdomain/domain.
- Dashboard does not currently include audience analytics, CRM, automated gold price calculations, invoices, or admin billing.
- For a paid pilot: test RLS for cross-shop access, auth sessions, image upload abuse controls, responsive browsers and devices, domain/redirect configuration, backup/export plan, customer support route and privacy statement.
- Business/legal review should cover claims about jewelry details and prices, consumer-facing terms, data/privacy obligations and invoicing before offering a paid commercial service in Egypt.
- The name “Atelier” is only a temporary working name; verify brand/trademark availability before public launch.

**Next after first paying users:** Learn which additional feature actually changes retention. Strong candidates include bulk catalog upload, smart WhatsApp response handling, price quotation workflows, Arabic localization, and existing POS inventory integration.
