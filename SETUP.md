# Setting up WAHB'S WORLD

These are the steps only Wahb can do, because they need his accounts. Everything else is in the repo. Allow about 30 minutes. Keys go into the Vercel and Supabase dashboards, never into the repo or a chat.

## 1. Make the GitHub repository private

GitHub, the `wahbs-world` repository, Settings, Danger Zone, Change visibility, Private. The project holds your schedule and personal plans.

## 2. Supabase (database, sign in, photos)

1. Create a free account at supabase.com and a new project named `wahbs-world`. Choose the region **Canada (Central)**. Save the database password in your password manager.
2. Open the SQL Editor. Paste the whole of `supabase/migrations/0001_init.sql` and run it. Then do the same with `0002_storage.sql`.
3. Authentication, Sign In / Providers: keep **Email** on, and turn **off** "Allow new users to sign up". Nobody else can ever create an account.
4. Authentication, Users, Add user, Create new user: your Gmail address, tick auto confirm. This is the only account.
5. Authentication, Emails, the **Magic Link** template: replace the body with a short message that shows the code, for example `Your WAHB'S WORLD code is {{ .Token }}`. The app asks for this six digit code; a code works inside the installed iPhone app, where a link would open Safari.
6. Authentication, Emails, SMTP Settings (the built in sender allows only 2 emails an hour): turn on custom SMTP with your Gmail.
   * Host `smtp.gmail.com`, port `587`, user your Gmail address.
   * Password: a Google **app password** (Google Account, Security, 2 Step Verification must be on, then App passwords). Not your normal password.
   * Sender name `WAHB'S WORLD`.
7. Project Settings, API: copy the **Project URL**, the **anon public** key and the **service_role** key for step 3.

## 3. Vercel (hosting)

1. Create a free Hobby account at vercel.com with your GitHub, then Add New, Project, import `wahbs-world`.
2. Before the first deploy, add these Environment Variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key (server only, used by the daily backup) |
| `CRON_SECRET` | any long random string |

3. Deploy. Your address is `wahbs-world.vercel.app` or similar.
4. Back in Supabase, Authentication, URL Configuration: set the Site URL to that address.

The daily backup runs by itself (Vercel Cron, once a day). It saves a JSON copy of everything into the private `backups` storage bucket and keeps the last 14.

## 4. Your devices

* **iPhone:** open the address in Safari, sign in with the code, then Share, Add to Home Screen. Open it from the home screen from then on: that is the app, it works offline, and iOS protects its storage.
* **Laptop:** open the address in your browser and sign in. In Chrome or Edge you can also install it from the address bar.
* In Settings, Data, press **Export a backup** once in a while and keep the file somewhere safe. Import never deletes anything.

## Running it locally (for development)

```
npm ci
cp .env.example .env.local        # leave empty for device only mode
npm run dev                       # http://localhost:3000
npm run check                     # typecheck, unit tests, generated files, no dash, contrast
npm run test:sql                  # migration and sync functions on a throwaway Postgres
npm run e2e                       # two device, offline, export and import, accessibility
```

With `SYNC_MODE=memory` and `NEXT_PUBLIC_SYNC_MODE=memory` the app syncs through an in memory server at `/api/dev-sync`, which is how the tests run two devices without Supabase.
