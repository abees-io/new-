# MIROKU

A responsive store with Home, Shop, Bag and Checkout pages, plus protected admin pages for products and paid orders. Built with standard HTML, CSS and JavaScript, with Node.js payment endpoints and no build step.

Run `node server.mjs` and open http://127.0.0.1:4173.

## Vercel deployment

Import this repository with the Root Directory left at the repository root. The included `vercel.json` serves the static pages from `dist` and payment functions from `api`. Pushes to the connected production branch trigger a new deployment.

Manage products at `/admin` and paid orders at `/admin/orders` after completing [Supabase setup](supabase/SETUP.md). Product records, orders and uploaded photos are stored in Supabase. `dist/products.js` supplies the labelled sample catalogue only while the database is unavailable; sample products cannot be purchased.

The bag persists in browser local storage. Checkout verifies prices, inventory and delivery charges on the server before creating a Razorpay order. Payment signatures and captured-payment status are verified before an order is marked paid. Addresses are private admin records.

MIROKU uses the supplied monochrome logo in the header and as the favicon. The fallback sample photographs come from Unsplash; admin-uploaded product photos use Supabase Storage. Sample sources:

- https://unsplash.com/photos/a-pair-of-white-sneakers-sitting-on-top-of-a-wooden-table-JhCVZC7FwX4
- https://unsplash.com/photos/black-wireless-headphones-on-white-table-6jMXHpbpL0M
- https://unsplash.com/photos/a-tote-bag-hanging-on-a-wall-pgEImVUs2rI
- https://unsplash.com/photos/gray-cup-XtyxEBiA8D8
- https://unsplash.com/photos/black-framed-sunglasses-on-white-surface-IFbyJ7DCLV4

## Razorpay checkout

The bag now links to `/checkout.html`. Complete the private server configuration and order database setup described in [supabase/CHECKOUT.md](supabase/CHECKOUT.md) to enable payments. No private keys are included in the repository. New orders and customer delivery addresses appear in the signed-in admin's Orders section.

## Code structure

- `dist/app.js`: catalogue, bag and product gallery interactions.
- `dist/admin.js` and `dist/orders.js`: product management and paid orders.
- `dist/admin-service.js`: shared Supabase client and admin membership checks.
- `dist/html-utils.js` and `dist/format.js`: safe HTML/image helpers and INR formatting.
- `dist/checkout.js`: delivery details and Razorpay checkout.
- `api/` and `lib/payments.js`: secure payment endpoints and shared server logic.
- `supabase/`: initial schema, upgrade scripts and setup guides.

Run `npm test` for the payment checks. Database setup scripts are run in Supabase's SQL Editor, not as part of a deployment.
