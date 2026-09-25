# Setting up WAHB'S WORLD

These are the steps only Wahb can do, because they need his accounts. Everything else is in the repo. Allow about 30 minutes. Keys go into the Vercel and Supabase dashboards, never into the repo or a chat.

## 1. Make the GitHub repository private

GitHub, the `wahbs-world` repository, Settings, Danger Zone, Change visibility, Private. The project holds your schedule and personal plans.

## 2. Supabase (database, sign in, photos)

1. Create a free account at supabase.com and a new project named `wahbs-world`. Choose the region **Canada (Central)**. Save the database password in your password manager.
2. Open the SQL Editor. Paste the whole of `supabase/migrations/0001_init.sql` and run it. Then do the same with `0002_storage.sql`. Copy with GitHub's Copy raw file button so nothing is cut off.
   When a later phase changes `0001_init.sql`, run it again the same way: it only adds what is new and never touches your data.
3. Authentication, Sign In / Providers: keep **Email** on, and turn **off** "Allow new users to sign up". Nobody else can ever create an account. You do not need to add a user, change email templates or set up SMTP: there are no emails at all. The site creates your one account itself the first time you unlock it.
4. Copy three values for step 3. The **Connect** button at the top of the project (or Project Settings, API Keys) shows them:
   * the **Project URL**, which looks like `https://abcdefghij.supabase.co`;
   * the **publishable** key (`sb_publishable_...`) or the legacy **anon** key; either works;
   * the **secret** key (`sb_secret_...`) or the legacy **service_role** key; either works. Keep it secret.

## 3. Vercel (hosting)

1. Create a free Hobby account at vercel.com with your GitHub, then Add New, Project, import `wahbs-world`.
2. Before the first deploy, add these Environment Variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL, `https://....supabase.co` (not a key) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable key or the anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key or the service_role key (server only, used by the daily backup) |
| `CRON_SECRET` | any long random string |
| `OWNER_EMAIL` | your Gmail address (server only; it is never shown or emailed) |
| `ACCESS_PASSWORD` | the password you will type once on each device. Pick a long one; iCloud Keychain can remember it |
| `NEXT_PUBLIC_SYNC` | `on` to sync between your devices through Supabase. Leave it out and everything stays on each device |

3. Deploy. The address to use is the short one under Domains (for example `wahbs-worlds.vercel.app`). The long links with a random part belong to single deployments and ask for a Vercel login.
4. Changed a variable later? Deployments, the latest one, Redeploy. Variables starting with `NEXT_PUBLIC_` are built into the site, so they only take effect after a redeploy.
5. Back in Supabase, Authentication, URL Configuration: set the Site URL to that address.

The daily backup runs by itself (Vercel Cron, once a day). It saves a JSON copy of everything into the private `backups` storage bucket and keeps the last 14.

## 4. Your devices

* **iPhone:** open the address in Safari, type your password once, then Share, Add to Home Screen. Open it from the home screen from then on: that is the app, it works offline, and iOS protects its storage.
* **Laptop:** open the address and type your password once. In Chrome or Edge you can also install it from the address bar.
* In Settings, Privacy, set a **passcode** on each device. The app then asks for it when it opens and after it has been away for the time you pick (1 minute to 1 hour). The passcode is kept only on that device, as a salted hash, and is never synced or exported. Forgot it? Clear the site's data in the browser; with sync on, everything comes back from Supabase after you unlock with your password.
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
