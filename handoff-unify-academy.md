# active-memory handoff: UNIFY Academy

**Handoff #1** · 2026-10-12 · Lineage: #1 (2026-10-12): built from the chat checkpoint (🔴 Red) of the long UNIFY Academy chat; the full chat was not available, only its checkpoint summary

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** Ship UNIFY Academy (repo homeschool-alleyway/alley, Supabase project tijykdkoklubysmcqotp, live at https://alleyways.netlify.app/academy/).
- **Done looks like:** Not stated in the checkpoint. Implied by the open steps (section 11): school-wide presence working in every room, class and game; parents' Live Chats panel; News Desk editor; PR to main when asked.
- **Why it matters / context:** A homeschool academy where students of every grade see each other as avatars, with grade-limited, family-gated chat and parent oversight.

## 2. About the user (as relevant to this work)
- Owner of the homeschool-alleyway/alley repo; email ayrissacanty@gmail.com.
- Owns Supabase key rotation (see section 4, rule 3).
- Builds a children's school platform, so child safety and parent visibility matter.

## 3. Style & communication
- **Language:** English.
- **Tone:** Not stated beyond the rules below.
- **Reply length:** Not stated.
- **Formatting:** Not stated.
- **Working style:** The user wanted a status checkpoint with health warnings in the old chat. Do not open PRs unless asked.
- **Avoid:** Model names in commits or PRs. Repeated cancelled tool calls wasted time in the old chat, so avoid retrying cancelled calls verbatim.

## 4. Hard rules (word for word)
1. "Do not archive anything."
2. "No model names in commits or PRs."
3. "Don't use the secret key, and rotating it is your job." (Said by the old Claude to the user: Claude must not use the secret key; rotating it is the user's job.)
4. "Don't open a PR unless asked."

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| – | None recorded in the checkpoint. Rule replacements are in section 7. | – |

## 6. Decisions
| Decision | Why |
|---|---|
| Nothing is archived | User's rule |
| The two school-sim prototypes were removed | User's call (removed, not archived) |
| Students of every grade appear to each other as avatars everywhere | User's call |
| Everyone is visible by default | User's call |
| Chat allowed for the same grade or one grade above or below, and both families must be "open" | User's call |
| Across grades, only the six fixed emotes are allowed | User's call |
| Parents get a live view of kids' chats | User's call |

## 7. Changed / rejected
- Chat only within the same grade band → chat for same grade or ±1 grade
- Presence for friends only → school-wide presence

## 8. Data & facts (exact)
| Item | Value |
|---|---|
| Repo | homeschool-alleyway/alley |
| Old chat branch | ccr-91d91c17-7mvuwz |
| This session's assigned branch | ccr-f001028e-qorwak |
| Supabase project | tijykdkoklubysmcqotp |
| Live site | https://alleyways.netlify.app/academy/ |
| Migration file | supabase/migrations/20261012000000_school_wide_presence.sql |
| CI | GitHub Actions run #7 passed |
| Earlier Actions failure causes | org plan, and the SHA-pinning policy |
| Chat grade rule | same grade or ±1 grade; both families "open" |
| Cross-grade chat | six fixed emotes only |

## 9. People, terms & names
- **People:** Parents (see kids' chats live); students (appear as avatars); the user (repo owner, rotates the secret key).
- **Terms & nicknames:** "open" = a family's chat-availability setting (exact meaning not in the checkpoint); presence = avatar visibility; "News Desk" = an editor feature; "private bucket A" = a Supabase storage bucket; "lossless images" = image handling done without lossy compression.
- **Names in use:** parent.html (parents' page, will host the Live Chats panel); 20261012000000_school_wide_presence.sql.

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| CI on GitHub | Final (green) | run #7 | |
| Migration school_wide_presence | Drafted and pushed | supabase/migrations/20261012000000_school_wide_presence.sql | Not yet run |
| Private bucket A | Done | Supabase | |
| Lossless images | Done | | |
| Parents' Live Chats panel | Not started | parent.html | |
| App-side presence in every room, class and game | Not started | | Plus emote buttons and a grade field |
| News Desk editor | Not started | | |
| Unverified pages | Not started | | Exact list not in checkpoint |
| PR to main | Not started | | Only when the user asks |

## 11. Next steps
1. **Next action:** Run supabase/migrations/20261012000000_school_wide_presence.sql in the Supabase SQL editor (project tijykdkoklubysmcqotp), then run the rolled-back safety test. Do not use the secret key.
2. Build the parents' Live Chats panel on parent.html.
3. Add app-side presence in every room, class and game, plus the emote buttons and a grade field.
4. Build the News Desk editor and handle the unverified pages.
5. Open a PR to main only when the user asks.

## 12. Open questions ⚠️
- The six fixed emotes are not listed in the checkpoint. Ask the user for the list or find it in the repo.
- This session's branch is ccr-f001028e-qorwak, but the old work was on ccr-91d91c17-7mvuwz. Confirm which branch holds the migration and CI run #7.
- What does the "rolled-back safety test" cover, and what are the "unverified pages"? Not stated in the checkpoint.
- Who runs the SQL editor step: the user, or a Supabase tool without the secret key?

## 13. Re-attach checklist
- [ ] Nothing to attach. The migration file is in the repo at supabase/migrations/20261012000000_school_wide_presence.sql.

---
<sub>Audit: 13/13 sections · 4 rules · 0 corrections · 10 data points · secrets removed: none found · generated by active-memory</sub>
