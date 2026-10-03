# Activate MIROKU product management

The website connects to project `cjrgnculemvkucoedlod` with the supplied publishable key. This key cannot create database tables or provision an administrator.

1. In Supabase Authentication → Users, create the user `murokireview@gmail.com`. Set a password yourself and confirm the email. Do not share the password. If the user already exists, reuse it.
2. In SQL Editor, paste and run the complete `supabase/setup.sql` file. It creates product tables, administrator permissions and the photo bucket. The final query must show the admin email. If it returns no rows, confirm the Auth user then rerun the script.
3. In Authentication → URL Configuration, set Site URL to `https://new-coral-beta.vercel.app` and add `https://new-coral-beta.vercel.app/admin` and `https://new-coral-beta.vercel.app/admin.html` to Redirect URLs for password recovery. Disable public signup if customers do not need accounts.
4. Visit `https://new-coral-beta.vercel.app/admin` and sign in with the account created in step 1. Add a draft product with a photo, then publish it. Refresh the Shop page to see it.

Visitors may read only published products. Admin access is checked against a table of Auth user IDs, rather than trusting a browser email check. Public users cannot add administrators. Product photos are public assets; only admins may upload or remove them. Photos must contain only intended public product imagery. Replacing photos keeps older files to avoid broken images; unused photos can be removed later in Supabase Storage. Use Unpublish to remove a product from the store without deleting it.

Until the product table is available, the storefront keeps the original sample catalogue, clearly labelled. Once the table is available it uses only published Supabase products, including a genuine empty state when none are published. It does not silently replace a successfully loaded empty catalogue with samples.

Payments remain a preview. This change adds product management, not Razorpay or order processing. Stock is displayed but does not reserve inventory. Checkout must later validate price and stock on the server.

Verification after setup: signed-out clients can read published products only; drafts and writes are denied. A signed-in non-admin cannot write products or upload images. The approved admin can create/edit/publish products and upload images. Test sign-out and recovery with your own account before relying on the dashboard.
