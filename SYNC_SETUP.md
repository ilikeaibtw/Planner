# Setting up sync (optional)

Planner works fully offline without this. Do this once to sync across your devices.

1. Go to supabase.com, sign up free, and create a new project.
2. In the project, open the **SQL Editor**, paste the contents of `supabase_setup.sql`
   from this folder, and run it. This creates the storage table and locks it so
   each person can only see their own data.
3. Open **Authentication → URL Configuration**. Set **Site URL** to the address
   where you host the app (e.g. `https://yourname.github.io/planner/`). Add the
   same address under **Redirect URLs**.
4. Open **Project Settings → API**. Copy the **Project URL** and the
   **anon / publishable key**.
5. In the Planner app, open the gear icon → **Sync** → paste the URL and key
   into "Save connection".
6. Enter your email and tap **Send magic link**. Open the email and tap the
   link — it opens the app and signs you in.
7. On every other device, repeat steps 5–6 with the same URL, key, and email.
   All devices signed in with the same email share the same data.

Sync happens automatically after that: on launch, when you switch back to the
app, when you come back online, and a couple of seconds after you make a
change.
