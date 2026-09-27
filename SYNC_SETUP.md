# Setting up sync (optional)

Planner works fully offline without this. Do this once to sync across your
devices — your plans are encrypted on your device before they're sent, so
Supabase never sees them.

1. Go to supabase.com, sign up free, and create a new project.
2. In the project, open the **SQL Editor**, paste the contents of `supabase_setup.sql`
   from this folder, and run it. This creates the storage table and locks it so
   each person can only see their own row.
3. Open **Authentication → URL Configuration**. Set **Site URL** and add it
   under **Redirect URLs** (e.g. `https://ilikeaibtw.github.io/Planner/`).
4. Open **Project Settings → API**. Copy the **Project URL** and **anon key**.
5. In the Planner app, open the gear icon → **Sync** → paste the URL and key
   into "Save connection".
6. In Supabase go to **Authentication → Emails → Magic Link** template and
   add a line showing the code, e.g. `Your code: {{ .Token }}`, then save.
   Then in the app enter your email and tap **Email me a sign-in code**.
   Open the email and either tap the link, or type the code into the app —
   the code also works from an installed home-screen/dock app, where the
   emailed link opens Safari instead of the app.
7. Set a **passphrase**. This encrypts your data before it leaves the device.
   **If you forget it, your cloud copy cannot be recovered — your data on
   this device is unaffected.** Write it down somewhere safe.
8. On every other device, repeat steps 5–7, using **Unlock** with the same
   passphrase instead of "Set up encryption".

Sync happens automatically after that: on launch, when you switch back to the
app, when you come back online, and a couple of seconds after you make a
change. A lock icon and "End-to-end encrypted" label show when it's active.

## What's private

- This repo contains only code — no personal data or keys are ever committed.
- Your routines live on your devices, and as encrypted ciphertext in Supabase.
- Supabase only ever sees: your account email, sync timestamps, and the size
  of the encrypted blob — never your plans.
- The Supabase anon key is safe to be public: Row Level Security restricts
  every row to its own signed-in user, so the key alone grants no access.
