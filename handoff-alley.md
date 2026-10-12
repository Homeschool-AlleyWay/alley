# active-memory handoff: UNIFY Academy (homeschool-alleyway/alley)

**Handoff #2** · 2026-10-12 · Lineage: #1 (2026-10-12): written at session start with no work in the chat, only the all-ages audience note; #2 (2026-10-12): updated from the user's pasted "Chat checkpoint 🔴 Red" of the main UNIFY Academy chat

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** Ship UNIFY Academy (repo `homeschool-alleyway/alley`, live at https://alleyways.netlify.app/academy/).
- **Audience:** "the site isnt just kids but will ve for continuing students and career paths students of any age" (user's words, typos kept). Do not assume child-only users in copy, UI, or features.
- **Done looks like:** Not stated beyond shipping; the checkpoint's last step is a PR to `main` (only when the user asks, see rule 4).
- **Why it matters / context:** School-wide social layer (avatars, presence, grade-aware chat) with parent oversight, backed by Supabase.

## 2. About the user (as relevant to this work)
- Owns the project and the Supabase project; account email on file: ayrissacanty@gmail.com (identity only).
- Responsible for rotating the Supabase secret key (see rule 3).
- Builds for all ages: kids, continuing students, career-path students.
- Skill level and tools: not stated.

## 3. Style & communication
- **Language:** English.
- **Tone / length / formatting:** Not stated.
- **Working style:** The user uses chat checkpoints with a health rating (🔴 Red = move to a fresh chat) and the active-memory commands `/amhandoff` and `/amcodeword`.
- **Avoid:** Repeated cancelled tool calls cost the previous chat time; keep tool use lean.

## 4. Hard rules (word for word)
1. "Do not archive anything." (Nothing is archived.)
2. "No model names in commits or PRs."
3. "Don't use the secret key, and rotating it is your job." (The user rotates it; never use the secret key.)
4. "Don't open a PR unless asked."
5. "Remember the site isnt just kids but will ve for continuing students and career paths students of any age" (write copy, UI, and features for all ages, not only children)

Session constraint from the environment (not user-stated): in the handoff session, develop only on branch `claude/am-handoff-6gm3x3`.

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Assumed the site was for kids only (inferred from the "homeschool" repo) | Site is for kids, continuing students and career-path students of any age |
| 2 | Put a model name in two commits on `claude/am-handoff-6gm3x3` (attribution trailer) | Rule 2: no model names in commits or PRs. Do not repeat; those two commits already exist on the branch and the user should decide whether to rewrite them |

## 6. Decisions
| Decision | Why |
|---|---|
| Nothing is archived | User's rule |
| The two school-sim prototypes were removed | User's decision (from checkpoint) |
| Students of every grade appear to each other as avatars everywhere | User's decision |
| Everyone is visible by default (school-wide presence) | User's decision |
| Chat allowed for the same grade or one grade above or below; both families must be "open" | User's decision |
| Across grades, only the six fixed emotes are allowed | User's decision |
| Parents get a live view of kids' chats | User's decision |

## 7. Changed / rejected
- Chat only within the same grade band → chat within ±1 grade (user's change)
- Presence for friends only → presence school-wide (user's change)
- ❌ Archiving anything (user's rule)
- ❌ Keeping the two school-sim prototypes (removed)

## 8. Data & facts (exact)
| Item | Value |
|---|---|
| Repo | `homeschool-alleyway/alley` (GitHub org spelled `Homeschool-AlleyWay`) |
| Product branch (main chat) | `ccr-91d91c17-7mvuwz` |
| Handoff branch (this session) | `claude/am-handoff-6gm3x3` |
| Supabase project | `tijykdkoklubysmcqotp` |
| Live URL | https://alleyways.netlify.app/academy/ |
| Migration file | `supabase/migrations/20261012000000_school_wide_presence.sql` (drafted and pushed, not yet run) |
| CI | Run #7 passed (green on GitHub) |
| CI history | Actions first failed because of the org plan and the SHA-pinning policy |
| Chat grade rule | Same grade, or ±1 grade; both families "open" |
| Cross-grade messaging | Only the six fixed emotes |
| Working directory | `/home/user/alley` |
| Handoff file | `handoff-alley.md` (repo root) |

## 9. People, terms & names
- **People:** The user (project owner). Parents (live view of kids' chats). Families flagged "open" for chat.
- **Terms & nicknames:** "open" = a family's setting that allows cross-grade chat. "Private bucket A" and "Lossless images" are done items; their exact meaning is not defined in the checkpoint.
- **Names in use:** UNIFY Academy, `parent.html` (Parents' Live Chats panel goes here), News Desk editor, `supabase/migrations/20261012000000_school_wide_presence.sql`, `homeschool-alleyway/alley`.

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| CI on GitHub | Done (green) | Run #7 | |
| School-wide presence migration | Drafted and pushed, not run | `supabase/migrations/20261012000000_school_wide_presence.sql` | Run in the Supabase SQL editor, then the rolled-back safety test |
| Private bucket A | Done | | |
| Lossless images | Done | | |
| Removal of two school-sim prototypes | Done | | |
| Parents' Live Chats panel | Not started | `parent.html` | |
| App-side presence in every room, class and game | Not started | | Plus emote buttons and a grade field |
| News Desk editor | Not started | | |
| Unverified pages | Not started | | Which pages is not stated |
| PR to `main` | Not started | | Only when the user asks |

## 11. Next steps
1. **Next action:** Have the migration run in the Supabase SQL editor (project `tijykdkoklubysmcqotp`), then run the rolled-back safety test. Do not use the secret key.
2. Build the Parents' Live Chats panel on `parent.html`.
3. Add app-side presence in every room, class and game, plus the emote buttons and a grade field.
4. Build the News Desk editor and verify the unverified pages.
5. Open a PR to `main` only if the user asks.

## 12. Open questions ⚠️
- Which branch should the next chat work on: `ccr-91d91c17-7mvuwz` (product) or `claude/am-handoff-6gm3x3` (this handoff session)? The checkpoint names the first; this session was assigned the second.
- Who runs the migration in the SQL editor, and what exactly is the "rolled-back safety test"?
- What are the six fixed emotes?
- Which pages are the "unverified pages"?
- Two earlier commits on `claude/am-handoff-6gm3x3` carry a model name in the trailer, which breaks rule 2. Leave them, or rewrite that branch's history?

## 13. Re-attach checklist
- [ ] This file (`handoff-alley.md`): the only context for the new chat.
- [ ] Optional: the migration file, if the new chat is not on the product branch.

---
<sub>Audit: 13/13 sections · 5 rules · 2 corrections · 17 data points · secrets removed: none found (no keys were pasted) · generated by active-memory</sub>
