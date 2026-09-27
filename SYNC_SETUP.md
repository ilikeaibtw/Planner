# Setting up sync (optional)

Planner works fully offline without this. Do this once to sync across your
devices — your plans are encrypted on your device before they're sent, so
Supabase never sees them.

1. Go to supabase.com, sign up free, and create a new project.
2. In the project, open the **SQL Editor**, paste the contents of `supabase_setup.sql`
   from this folder, and run it. This creates the storage table and locks it so
   each person can only see their own row.
3. Open **Authentication → URL Configuration**. Set **Site URL** to
   `https://ilikeaibtw.github.io/Planner/` and add it under **Redirect URLs**.
4. Open **Project Settings → API**. Copy the **Project URL** and **anon key**.
5. In the Planner app, open the gear icon → **Sync** → paste the URL and key
   into "Save connection".
6. Pick **Create account**, enter your email and a password. The free
   Supabase plan can't customise its email template (needs custom SMTP), so
   it just sends a confirmation link — that's fine, no setup needed. Tap the
   link (it may open Safari even on an installed app — normal), then come
   back and **Sign in** with the same email and password.
7. On every other device, open Sync and **Sign in** with the same credentials.
8. Set a **passphrase** (encrypts your data before it leaves the device — if
   you forget it, your cloud copy cannot be recovered; this device is fine).
9. On other devices, after signing in, use **Unlock** with that passphrase.

("Use email code instead" still works if you prefer it, but password
sign-in is recommended for installed apps, since the emailed link/code opens
in Safari, which has separate storage from an installed home-screen app.)

Sync happens automatically after that: on launch, when you switch back to the
app, when you come back online, and a couple of seconds after a change.

## What's private

- This repo contains only code — no personal data or keys are ever committed.
- Your routines live on your devices, and as encrypted ciphertext in Supabase.
- Supabase only ever sees: your account email, sync timestamps, and the size
  of the encrypted blob — never your plans.
- The Supabase anon key is safe to be public: Row Level Security restricts
  every row to its own signed-in user, so the key alone grants no access.
