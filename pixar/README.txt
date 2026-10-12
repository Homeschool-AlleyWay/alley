UNIFY Academy: look preview (separate site)
===========================================
A standalone static site that lets the owner compare the current paper-cut art style with the Pixar-inspired
"movie look". It ships none of the academy's real pages, news, mail, Supabase config or student data. Every page
is noindex and shows the banner "Look preview only. Nothing here is saved to any account."

Rebuild (from the repo root):
  npm run build                                          # builds demo/dist/*.js incl. pixar-compare.js and pixar-chars.js
  python3 tools/build_pixar_site.py OUT_DIR              # e.g. /tmp/claude-0/-home-user-alley/7bbe5bc9-a7dd-5fe8-b104-5a45d54ba7ef/scratchpad/pixarsite
Deploy OUT_DIR as its own Netlify project (drag the folder onto https://app.netlify.com/drop, or `netlify deploy --prod --dir=OUT_DIR`).

Pages: index.html (landing), compare.html, characters.html, dorm.html (Pixar by default; ?style=papercut for the old look).
Sources: pixar/*.html, demo/pixar-compare.ts, demo/pixar-chars.ts, tools/build_pixar_site.py.
Useful URL options: ?q=0|1|2 (Pixar quality), ?style=papercut|pixar (single canvas), ?hour=0..24 (compare page).
The build fails if any page references a file that was not copied.
