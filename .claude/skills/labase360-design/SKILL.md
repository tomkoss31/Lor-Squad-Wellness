---
name: labase360-design
description: Use this skill to generate well-branded interfaces and assets for La Base 360 and its member community The Breakfast Club — production code or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, logo assets, and UI kit components for prototyping. Trigger whenever the user asks to design, mock, or build anything for La Base 360, the coaching app, the client PWA, Mode BBC, or the Breakfast Club site.
user-invocable: true
---

Read `readme.md` in this skill first, then explore the other files. It covers the three separate visual systems (La Base 360 app · Breakfast Club site · Mode BBC), the color/type/spacing tokens, content voice (French, warm, coach-to-person), the logo rules, and iconography.

Key files:
- `styles.css` — link this one file to get all tokens + fonts. Tokens live in `tokens/`.
- `assets/labase360/` and `assets/breakfast-club/` — real logo marks.
- `components/core/` — React primitives (Button, Card, StatBlock, Badge, EyebrowPill, Logo, Icon).
- `ui_kits/app-360/` and `ui_kits/breakfast-club-site/` — full-screen product recreations.
- `foundations/` — specimen cards.

Hard rules: lime = wins only (teal is structural); no gold; never mix the three systems' tokens; Anton is always uppercase; light mode is not an inversion of dark. Icons use Lucide (a flagged substitution — no brand icon set was provided).

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and produce static HTML files for the user to view. For production code, copy assets and apply the rules here. If the user invokes this skill without guidance, ask what they want to build, ask a few clarifying questions, then act as an expert La Base 360 designer who outputs HTML artifacts or production code as needed.
