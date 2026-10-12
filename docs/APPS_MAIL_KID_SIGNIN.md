# Newsroom app, academy mail, kid sign-in, school-wide presence

This is the owner's guide for the pieces added in October 2026. Nothing here archives anything.

## 1. Switch it on (one time, in the Supabase SQL editor)

Run these migrations in this order (each file is in `supabase/migrations/`):

1. `20261012000000_school_wide_presence.sql` : everyone appears to everyone, chat for the same grade or one grade above/below, six fixed emotes across grades.
2. `20261013000000_apps_mail_kid_login.sql` : admins and app access, the Newsroom tables, academy mail, and kid sign-in.

Both are covered by `supabase/tests/*.sql` (rolled-back checks). You can re-run all of them on any plain Postgres with `supabase/tests/run_local.sh`; CI does this on every push.

The site keeps working before the migrations are applied: the new screens show a friendly "not switched on yet" message instead of failing.

### Make yourself the first admin
Admins can use the Newsroom app, give it to other people, and create staff mail addresses. Nobody can make themselves an admin from the website. Run this once, with the email you sign in with:

```sql
insert into public.academy_admins(uid, note)
select id, 'owner' from auth.users where email = 'YOUR-EMAIL-HERE';
```

(Your email is deliberately not stored in the repository.)

### Rotating the Supabase secret key
The app never uses the secret (service) key. Rotating it is the owner's job in the Supabase dashboard (Project Settings, API Keys). The website only uses the publishable key in `supabase-config.js`.

## 2. The Newsroom app

* **Who can work in it:** admins, plus anyone an admin gives the "newsroom" app to (Newsroom, People tab: type their handle, pick Editor or Admin). A student can be given the app once they have their own sign-in.
* **What is in it:** Bulletin board posts (announcements, stories, alerts), Auditorium and class events (host, room, time, Go live), Look & feel (palettes, accents, ticker, live banner), People, and the existing Live studio (`news.html`, unchanged).
* **Where it shows up:** the shell shows a live strip and ticker under the top bar, a "Bulletin" button, and an event chip ("LIVE NOW: ... Join") in every room. The 3D hallway has bulletin boards and a marquee above the Newsroom door that fill from the same posts. Updates appear without a reload.
* **Customising:** every look-and-feel choice is stored in `app_settings` (keys `newsroom.*`, `bulletin.*`, `live.*`, `events.*`), so nothing needs a code change.

## 3. Kid sign-in and academy mail

* A parent opens the family screen, Parent tools for a child, and chooses "Give <child> their own sign-in". The child gets an address such as `maya.k7q2@unify.mail` and the password the parent chose (8 or more characters).
* The address is both the sign-in name and the child's mailbox. It only works inside UNIFY: nothing is ever delivered outside the academy and no confirmation email is sent.
* A child who signs in alone is their own student only. They cannot see the family's other children, the parent's chats, or change their grade, nickname or who they may talk to. A parent can reset the password or remove the sign-in at any time (the student's progress stays).
* **Mail rules:** same family always; any two grown-ups; teachers (staff addresses) and school announcements (system addresses) with anyone; two students only when chat would be allowed (same grade or one apart, both families open). Students cannot send links, outside email addresses or phone numbers. Parents can read their children's mail and chats (read-only).
* The Mail app is separate (`mail.html` plus `unify-mail.js`) so other UNIFY apps can reuse it: include `unify-mail.js` and call `UnifyMail.compose({to, subject, body})`.

## 4. Presence, grades and emotes

* Every signed-in student appears to every other family's students in every room, class and game. A parent can switch a child off ("Seen by other students at school") in Parent tools.
* Parents set each child's **grade** (Kindergarten to 12) when they add or edit a child. The grade decides who they may chat with: the same grade or one above or below, and only when both families have chat with other families switched on.
* Across grades (or without chat) the only thing students can send each other are the six fixed emotes: wave, thumbs up, heart, laugh, star, clap.
* Parents see their children's chats live on `parent.html?live=1`.
