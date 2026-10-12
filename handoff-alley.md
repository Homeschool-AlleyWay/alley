# active-memory handoff: alley (Homeschool-AlleyWay/alley)

**Handoff #1** · 2026-10-12 · Lineage: #1 (2026-10-12): handoff written at the start of a session; the chat held no prior work except the audience note, so the repo state is the only other context

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** Not stated in the chat beyond the audience note below. See section 12.
- **Audience:** "the site isnt just kids but will ve for continuing students and career paths students of any age" (user's words, typos kept). Do not assume child-only users in copy, UI, or features.
- **Done looks like:** Not stated.
- **Why it matters / context:** The repo is a homeschool "school sim" web project (see section 10). That is read from the repo, not from the user.

## 2. About the user (as relevant to this work)
- Account email on file: ayrissacanty@gmail.com (identity only).
- Role and skill level: not stated in the chat.
- Audience they build for: all ages, including kids, continuing students, and career-path students.

## 3. Style & communication
- **Language:** English (the only language used in the chat).
- **Tone:** Not stated.
- **Reply length:** Not stated.
- **Formatting:** Not stated.
- **Working style:** Not stated.
- **Avoid:** Nothing stated.

## 4. Hard rules (word for word)
1. "Remember the site isnt just kids but will ve for continuing students and career paths students of any age" (product constraint: write copy, UI, and features for all ages, not only children)

Session constraints from the environment (not user-stated):
1. Develop only on branch `claude/am-handoff-6gm3x3` in `Homeschool-AlleyWay/alley`. Do not push to another branch without permission.
2. Do not create a pull request unless the user explicitly asks.

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| None | None | None |

## 6. Decisions
| Decision | Why |
|---|---|
| None recorded in the chat | n/a |

## 7. Changed / rejected
None.

## 8. Data & facts (exact)
| Item | Value |
|---|---|
| Repo | `homeschool-alleyway/alley` (GitHub org is spelled `Homeschool-AlleyWay`) |
| Working directory | `/home/user/alley` |
| Branch | `claude/am-handoff-6gm3x3` |
| Audience | Kids, continuing students, career-path students; any age |
| Handoff file | `handoff-alley.md` (repo root) |
| Handoff date | 2026-10-12 |

Recent commits on the branch at handoff time (from `git log`, newest first):
- `179976e` Remove Google sign-in
- `4f0e538` Remove Google sign-in
- `384ad5c` Lock down Supabase helper functions flagged by the advisor
- `88d8f42` Lock down Supabase helper functions flagged by the advisor
- `d0586a3` Show classmates' lockers and avatars (parent can switch off)
- `027fa95` Show classmates' lockers and avatars (parent can switch off)
- `9537f28` Merge pull request #8 (`ccr-7ee7e87c-5xlz2c`)
- `ed3f6a5` Remove Firebase: Supabase is the only cloud back end
- `a475d83` Merge pull request #7 (`ccr-7ee7e87c-5xlz2c`)
- `461882f` Academy schema: let a person read their own presence row (fixes presence upsert)

## 9. People, terms & names
- **People:** The user (email above). No other people named.
- **Terms & nicknames:** None stated.
- **Names in use:** `alley`, `Homeschool-AlleyWay`, `claude/am-handoff-6gm3x3`, `handoff-alley.md`.

## 10. Work state
Observed from the repo root listing, not from the chat.

| Item | Status | Version / location | Notes |
|---|---|---|---|
| Repo contents | Existing | `/home/user/alley` | HTML pages (`index.html`, `parent.html`, `phone.html`, `hallway.html`, `classroom3d.html`, `auditorium.html`, `curriculum.html`, `news.html`, `fieldtrip.html`, `opendoor.html`, `school-sim.html`), plus `src/`, `server/`, `supabase/`, `curriculum/`, `docs/`, `demo/`, `prototypes/`, `public/`, `netlify.toml`, `package.json` |
| Back end | Per commit `ed3f6a5` | Supabase | Firebase removed; Supabase is the only cloud back end |
| Google sign-in | Per commit `179976e` | removed | |
| This handoff | Written | `handoff-alley.md` | Committed and pushed to the branch above |

## 11. Next steps
1. **Next action:** Ask the user what they want to work on next in this repo, because the chat stated no goal.
2. Once the goal is known, record it in section 1 of a new handoff if the chat grows.

## 12. Open questions ⚠️
- What is the goal for this repo or session? (The chat held no task.)
- Any style, language, or format rules the user wants followed? (None were given.)

## 13. Re-attach checklist
Nothing to attach.

---
<sub>Audit: 13/13 sections · 1 rule · 0 corrections · 16 data points · secrets removed: none found · generated by active-memory</sub>
