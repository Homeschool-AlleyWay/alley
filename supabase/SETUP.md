# UNIFY Academy on Supabase

Project: `unify-academy` (ref `gfulnzpotabrsffinfpe`, us-east-1). Schema and row level security are in `academy-schema.sql` (already applied).
The page config is `supabase-config.js` (public anon key). supabase-js is self-hosted at `vendor/supabase.js` (`npm run vendor` rebuilds it).

## Switch on in the Supabase dashboard (Authentication)
1. **Sign In / Providers → Allow anonymous sign-ins: ON** (the phone and the people network use it for grown-ups without an account, and for the phone cloud save).
2. **Sign In / Providers → Email**: keep on. Either leave "Confirm email" on (parents get a confirmation link; the built-in mailer is limited to a few emails an hour, so add your own SMTP under Authentication → SMTP Settings for real use) or turn it off while testing.
3. **Sign In / Providers → Google** (optional): add a Google OAuth client ID and secret and put the Supabase callback URL in the Google console.
4. **URL Configuration**: set the Site URL to where the school is hosted and add that address (and `/academy/`) to Redirect URLs.
5. **Settings → Auth → Captcha / rate limits**: consider turning on CAPTCHA before a public launch (anonymous sign-ins can be abused).

Deleting an account removes the family, kids, people-network profile and phone copy; the sign-in itself can be removed from Authentication → Users.
