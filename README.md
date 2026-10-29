# RideMyWork

RideMyWork helps verified people share journeys a Trip Host was already making. The web app is mobile-first and the existing marketing page remains available at `/about`.

## Supabase project status

The connected production project (`apzppcudruzzxmteialh`) has already been configured:

- The account-role and secure trip-search-view migrations have been applied.
- The latest map/private-location migration must still be run in the SQL Editor before publishing trips from the updated offer form.
- Email confirmation is off. Signup accepts name, username, email and password; login accepts either username or email. Email remains available for account recovery, with no phone verification.
- The `sign-in` and `send-push` Edge Functions are deployed. `sign-in` keeps JWT verification enabled; `send-push` has gateway JWT verification disabled and checks the private `x-rmw-push-secret` header itself.
- VAPID and webhook secrets are stored in Edge Function Secrets. The Database Webhooks integration (`pg_net`) is installed, and `notifications_send_push` calls `send-push` after inserts to `public.notifications`.

The setup steps below document project bootstrap and recovery. The connected production project already has the account-role and initial secure trip-search migrations, functions, secrets and push webhook configured. The latest map and private-location migration is pending. For a fresh project, follow the relevant steps below; do not rerun an already-applied migration.

## Run locally

1. Install the project dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the intended Supabase project. Never put a service-role key in browser code or commit it.
3. In that Supabase project, open **SQL Editor**, review and execute [`supabase/migrations/202610260001_initial_schema.sql`](supabase/migrations/202610260001_initial_schema.sql). This creates the tables, row-level security policies, private media bucket, and guarded seat-request functions. It does not contact or modify any Supabase project on your behalf.
4. In **Authentication → Providers → Email**, turn off **Confirm email** to match the no-verification signup flow. Sign-up collects name, username, email and password; it does not send a verification challenge. Email is used for password recovery and email sign-in; usernames can also be used for sign-in. The sign-in screen asks for one identifier and password. **Forgot password?** asks for the account email. Configure a working SMTP provider in **Project Settings → Authentication → SMTP Settings** before relying on password recovery outside development.
5. For a project where only the initial schema has been installed, run these SQL files in **SQL Editor**, in order. The first two have already been applied to the connected production project; the third is pending:

   - [`supabase/migrations/202610280001_account_roles.sql`](supabase/migrations/202610280001_account_roles.sql) adds the starting experience (`passenger` or `trip_host`) and updates new-profile creation. Both choices use the same account and both sides remain available; the home dashboard emphasizes the selected starting experience.
   - [`supabase/migrations/20261028121113_secure_trip_search_view.sql`](supabase/migrations/20261028121113_secure_trip_search_view.sql) makes the trip search view obey the caller's row-level security policies. The initial view was created without `security_invoker`.
   - [`supabase/migrations/20261029095000_trip_map_and_booking_hardening.sql`](supabase/migrations/20261029095000_trip_map_and_booking_hardening.sql) creates an RLS-protected table for precise route/pickup locations, exposes only rounded route coordinates to trip search, and reinforces the host seat-request restriction. Run this before publishing trips from the updated app.

   Paste and run applicable files in the SQL Editor, then verify the role column exists and `trip_search` has `security_invoker=true` in its view options. The latest migration only adds the private route table and updates the search view/policy; it does not delete or rewrite trip rows.
6. Deploy the username sign-in function. It resolves a username to its account email server-side so member email addresses are never returned by public profile queries. You need the Supabase CLI authenticated to the same account; installation and login are one-time:

   ```powershell
   npx supabase login
   npx supabase functions deploy sign-in --project-ref apzppcudruzzxmteialh
   ```

   The sign-in function also checks username availability so signup can show a specific duplicate-username error. Email sign-in uses Supabase Auth directly. Username sign-in uses this function and Supabase Auth. Both rely on Supabase Auth rate limits; configure additional edge protection if you expose the app widely.

7. Add `http://localhost:3000/**` and your deployed app URL to Supabase **Authentication → URL Configuration → Redirect URLs**. For password recovery, also include the exact `/auth?type=recovery` URL for each app origin if your URL allowlist requires it.
8. Run `npm run dev` and open `http://localhost:3000`. `/` redirects to `/ride`; `/auth` creates or signs in; `/about` is the marketing page. On the sign-in form choose **Forgot password?** to send a recovery link to the signup email.
9. Configure push notifications. The matching public key is already in `.env.local`, and the supplied VAPID keypair, `mailto:support@ridemywork.com` subject and a generated webhook secret are in the ignored local file `supabase/.env.functions`. Keep that file private and do not commit it. For background push you need the migration **and** the Edge Function secrets, deployed function and Database Webhook; SQL schema alone cannot deliver to a browser push service.

   The username login function uses a server-side service-role secret to look up the account email; that secret never goes into `.env.local`. Supabase provides the service-role secret to Edge Functions automatically. Keep the function deployed with JWT verification enabled.

   For browser push, install the Supabase CLI from the [official Windows instructions](https://supabase.com/docs/guides/cli/getting-started), then open PowerShell in this project and run:

   ```powershell
   npx supabase login
   npx supabase secrets set --env-file supabase/.env.functions --project-ref apzppcudruzzxmteialh
   npx supabase functions deploy send-push --no-verify-jwt --project-ref apzppcudruzzxmteialh
   npx supabase functions deploy sign-in --project-ref apzppcudruzzxmteialh
   ```

   `npx supabase login` opens a browser so you can authenticate with your Supabase account. The secrets command uploads the four VAPID/webhook values from the ignored private file to the project's **Edge Function Secrets**. Supabase also injects its project URL and service-role secret into Edge Functions; never paste those into the browser app. To confirm only secret names were uploaded, run `npx supabase secrets list --project-ref apzppcudruzzxmteialh`.

   Then create the push webhook in Supabase Dashboard → **Integrations → Database Webhooks → Webhooks → Create webhook**:

   1. Name it `notifications_send_push` and select the `public.notifications` table.
   2. Select the `INSERT` event and HTTP method `POST`.
   3. Set the URL to `https://apzppcudruzzxmteialh.supabase.co/functions/v1/send-push`.
   4. Add HTTP header `x-rmw-push-secret`. Copy its value from `RMW_PUSH_WEBHOOK_SECRET` in the ignored `supabase/.env.functions` file. Save the webhook.

   If you prefer the dashboard, create the secret names under **Edge Functions → Secrets** from the matching entries in `supabase/.env.functions`; deploy the two functions from their source in `supabase/functions/`. Then add the database webhook as above. Do not share or commit the private VAPID key or webhook secret.

   The `--no-verify-jwt` flag lets the database webhook reach the function without a user JWT; the function authenticates that request with the separate random `x-rmw-push-secret` header. This webhook sends each new notification record to the Edge Function, which checks the shared secret before sending a push. If it returns `401`, the webhook header does not match the function secret. If it returns `503`, re-run the secrets command and check the Function Logs. After adding the public key to `.env.local`, restart the web app so the browser can subscribe. Users must enable notifications in the app and allow notifications in their browser/device before they receive pushes.

## Environment values

## Install RideMyWork on a phone

RideMyWork is a progressive web app. On supported Android browsers, the app may show an **Install app** reminder on `/ride` no more than once every three days. Tapping **Install** opens the browser's own install prompt; the site cannot install itself without the user accepting. On iPhone and iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**. The reminder includes these steps because iOS does not expose the same install prompt event. The app hides the reminder after installation. Install prompts require the deployed site to use HTTPS; `localhost` is suitable for local development.

The manifest and service worker are already included. To change the app icon, replace `public/pwa-icon-192.png`, `public/pwa-icon-512.png`, `public/apple-touch-icon.png`, and `public/pwa-icon.svg` together, keeping the declared sizes and paths in `public/site.webmanifest` and `app/layout.tsx`.

- `NEXT_PUBLIC_SUPABASE_URL`: project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/publishable key only.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: public VAPID key used by browser subscription.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RMW_PUSH_WEBHOOK_SECRET`: stored in ignored `supabase/.env.functions` locally and uploaded as Supabase Edge Function Secrets. The subject is `mailto:support@ridemywork.com`. The private key and webhook secret must never be put in `.env.local`, browser code, or a committed file.
- The service worker displays incoming pushes; app-open updates use Supabase Realtime. Background push begins after you deploy the sender and add the notifications webhook.

## Product notes

- No payments are collected.
- Map display uses OpenStreetMap embeds and needs no map key. Routes are currently shown against Lagos until trip coordinates/geocoding are configured.
- Trip place search uses Photon for address suggestions and OSRM for fastest mapped driving routes. This MVP estimate uses a rounded ₦1,600/litre May 2026 national petrol reference, 8 L/100 km, and a 1.35 city-traffic factor; it is an editable fuel-share estimate, not a live-traffic or toll quote. The map offers a link to live traffic in Google Maps. Exact pickup/destination points are visible only to the host and approved passengers after the latest SQL migration is applied.
- Profile/vehicle image storage is private and owner-scoped.
- Safety reports create records for RideMyWork Operations; the app does not dispatch emergency services.
- RLS restricts private commute schedules, reports, contacts, push endpoints, notifications and trip messages to the appropriate owner or trip participants.

## Checks

Run `npm run typecheck`, `npm run lint`, and `npm run build` before deployment.
