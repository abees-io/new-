# Enable MIROKU checkout

The checkout page is /checkout.html. It collects name, email, Indian mobile number and delivery address. Prices, stock and delivery charges are calculated from Supabase on the server. The browser cannot choose the payment amount. Razorpay handles payment credentials; MIROKU saves no card or UPI credentials.

## 1. Supabase
Open the project whose URL is https://dfnqemmualhdswvlpawk.supabase.co. In SQL Editor run add-delivery.sql if not already installed, then run supabase/add-checkout.sql from this repository. This adds private orders and server-only transaction functions. Only signed-in members of miroku_admins can read orders in the admin page.

From the project's API Keys settings obtain the private secret key (or legacy service_role key). Put it ONLY in Vercel's server environment variables. Do not put it in website JavaScript, GitHub or a chat message. The publishable key is not sufficient for the payment server.

## 2. Vercel environment variables
In the new- project's Settings → Environment Variables, add these for the Production environment:

| Name | Value |
| --- | --- |
| SUPABASE_URL | https://dfnqemmualhdswvlpawk.supabase.co |
| SUPABASE_SECRET_KEY | Supabase private secret key or legacy service_role key |
| PAYMENTS_MODE | test |
| RAZORPAY_KEY_ID | Your Razorpay TEST key ID starting rzp_test_ |
| RAZORPAY_KEY_SECRET | Secret paired with that test key |
| RAZORPAY_WEBHOOK_SECRET | A new random secret you also enter in Razorpay webhook setup |
| SITE_URL | https://new-coral-beta.vercel.app |

Do not prefix private variables with VITE_ or NEXT_PUBLIC_. Redeploy after adding/changing variables. The code will refuse to use a live key while PAYMENTS_MODE is test. API endpoints are Vercel Node functions in /api; the static pages are in /dist.

## 3. Razorpay test setup
In Razorpay Test Mode, generate API keys. Set automatic payment capture in the dashboard. Add a webhook with URL:

https://new-coral-beta.vercel.app/api/payment-webhook

Use the same RAZORPAY_WEBHOOK_SECRET and enable payment.captured and order.paid. Both the browser callback and signed webhooks verify payments; only captured payments are confirmed. The Check payment status button can also reconcile captured payments if a webhook is delayed. An authorized payment stays pending until captured.

## 4. Test before accepting real payments
Publish an in-stock product and choose free or paid delivery in admin. Add it to the bag, open checkout and complete a Razorpay test payment using the test details from Razorpay's documentation. Confirm the amount includes delivery, the admin Orders section displays the address with TEST status, and stock decreases exactly once. Retry the webhook: it must not decrease stock again. Test cancellation, failed payment, refreshing after payment, and invalid addresses. No real payment has been exercised by the developer without your credentials.

## 5. Go live when ready
Complete Razorpay account activation, configure automatic capture and the webhook in Live Mode, replace the test API keys with the live pair, change PAYMENTS_MODE to live and redeploy. Test/live orders are clearly marked in admin. Restore any stock used by your test transactions before selling.

## Order behaviour and limits
Checkout snapshots each product's selling price and delivery fee. Delivery is charged once per distinct product, matching the bag. Pending checkouts hold availability for 30 minutes; paid orders reduce stock once in a database transaction. A late captured payment that can no longer be fulfilled is marked paid_review and must be reviewed/refunded in Razorpay. Failed/abandoned checkouts remain pending records; they are not paid orders. Pending records older than 30 minutes stop holding availability.

Addresses are private admin records; they are not emailed automatically. Contact details and addresses are not saved in browser storage. Payment references are stored in session storage to recover on refresh. Refunds, invoices, shipment tracking and delivery-service booking are not automated by this integration. Admin currently displays the latest 100 orders. Review abandoned records periodically according to your retention policy. Configure Vercel's firewall/rate limits for /api/create-order before a public launch to reduce automated checkout abuse.

Official integration and webhook guidance:
https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
https://razorpay.com/docs/webhooks/validate-test/
