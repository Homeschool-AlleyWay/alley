# Curriculum packs

A pack brings a curriculum into the sim: lessons, a **script the teacher performs**, and a **textbook** students read in depth.

* Put files in `curriculum/` and list them in `curriculum/index.json` (they ship with the app), **or**
* open a classroom, **More → Curriculum packs**, and import a `.md` / `.json` file or paste it (stays on that device).

A pack is either `kind: regular` (added to the end of the class's lessons), `kind: replace` (replaces the built-in lessons for that class)
or `kind: elective` (extra courses under **More → Electives**, e.g. high-school electives; they never change a student's lesson number).
Only online-completable courses make sense here: everything runs in the browser.

## Markdown format (easiest)

```
pack: my-algebra            id (optional)
title: Algebra I
subject: math               math | ela | science | history | careers | life
kind: elective              regular | replace | elective
grades: 9-12                (optional label)
course: Algebra I           (elective course name)

@book Algebra I Textbook
## Chapter title
### Section heading
Paragraphs. Lines starting with "- " are bullets. **bold** works.

@lesson Solving equations
blurb: one line
intro: what the teacher says to start
points:
- shown on the left board
examples:
- shown on the right board
script:
- say[smile,wave]: a spoken line with a mood and/or a gesture
- board[left] Title: line one | line two | line three
- ask                       (the teacher asks the class a question)
- read: Chapter title/Section heading   (teacher says "open your textbook", opens that spot)
check: order Put the steps in order.      (or: check: sort Prompt)
- step one
- step two
glossary:
- word: meaning
whys:
- a reason it works that way
wrap: closing line
homework: homework line
book: Chapter title/Section heading    (where "Textbook" opens for this lesson)
```

For `check: sort`, write groups as `- Group name: item | item | item`.
Moods: neutral smile joy frown upset frustrated surprised thinking stern. Gestures: cheer clap headhands shrug crossed wave chin facepalm explain finger point.

## JSON format

Same fields: `{ "title", "subject", "kind", "grades", "course", "book": {"title","chapters":[{"title","sections":[{"heading","body"}]}]},
"lessons": [{ "title", "blurb", "intro", "points": [], "examples": [], "script": [{"say","mood","gesture","board":{"side","title","lines"},"ask","read"}], "check": {...}, "glossary": {}, "whys": [], "wrap", "homework", "book" }] }`.

Every class also gets an automatic textbook of "class notes" built from its lessons, so the Textbook button is never empty.
Imported text is treated as data: it is validated and length-limited, and only ever shown as plain text.
