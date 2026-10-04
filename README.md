# MIROKU

A responsive three-page storefront: Home, Shop, and Bag. Built with standard HTML, CSS and JavaScript, without a build step.

Run `node server.mjs` and open http://127.0.0.1:4173.

## Vercel deployment

Import this repository with the Root Directory left at the repository root. The included `vercel.json` selects a static site and serves `dist` without an install or build step. Keep the `.html` URLs used by the three pages. Pushes to the connected production branch trigger a new deployment.

Manage products at `/admin` after completing [Supabase setup](supabase/SETUP.md). Product records and uploaded photos are stored in Supabase. `dist/products.js` supplies the labelled sample catalogue only while the database is unavailable. Shared layouts and interactions live in `dist/app.js`; styles live in `dist/style.css`.

The bag persists on this browser using local storage. This is a storefront preview with sample INR prices. It does not accept payments or create orders. Connect a commerce backend and payment provider before launching sales; prices, inventory, taxes and delivery must be validated on the server.

MIROKU uses the supplied monochrome logo in the header and as the favicon. Product photographs are remotely served from Unsplash. Sources:
- https://unsplash.com/photos/a-pair-of-white-sneakers-sitting-on-top-of-a-wooden-table-JhCVZC7FwX4
- https://unsplash.com/photos/black-wireless-headphones-on-white-table-6jMXHpbpL0M
- https://unsplash.com/photos/a-tote-bag-hanging-on-a-wall-pgEImVUs2rI
- https://unsplash.com/photos/gray-cup-XtyxEBiA8D8
- https://unsplash.com/photos/black-framed-sunglasses-on-white-surface-IFbyJ7DCLV4

## Razorpay checkout
The bag now links to `/checkout.html`. Complete the private server configuration and order database setup described in [supabase/CHECKOUT.md](supabase/CHECKOUT.md) to enable payments. No private keys are included in the repository. New orders and customer delivery addresses appear in the signed-in admin's Orders section.
