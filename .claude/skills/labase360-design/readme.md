# La Base 360 — Design System

A design system for **La Base 360**, a wellness-nutrition coaching platform, and its member community **The Breakfast Club**. Everything here is derived from the production identity spec (`IDENTITE-GRAPHIQUE.md`, last updated 9 Aug 2026) and the real brand asset files that were provided.

> The source spec and all copy are in **French**. This design system keeps the brand's French voice; component APIs and documentation are in English.

---

## Sources

This system was built from a provided brand-identity package (read-only), not a live codebase:

- **`LaBase360-Identite/IDENTITE-GRAPHIQUE.md`** — the authoritative identity spec. All color, type, geometry, and rule values here come from it verbatim.
- **`LaBase360-Identite/logo-labase360/`** — La Base 360 logo marks (SVG light/dark/mono + PNG/favicon rasters).
- **`LaBase360-Identite/logo-breakfast-club/`** — Breakfast Club wordmark logos (PNG) + heart favicon (SVG).

The spec references production files not provided here (kept for whoever has repo access): tokens in `src/styles/globals.css`, `src/styles/bbc-tokens.css`, `src/styles/pwa2.css`; site styles in `src/pages/ClubLandingPage.css`; logos in `public/brand/`. Fonts are loaded from Google Fonts in the app's `index.html`.

---

## The three systems — never mix them

Three visual universes coexist. They share a color family but are **implemented separately**; a token from one must never leak into another.

| System | Where | Audience | Mood | Namespace |
|---|---|---|---|---|
| **La Base 360** | coach app + client app (PWA) | the distributor at work, their client | dark, warm, premium | `--ls-*` |
| **Breakfast Club — site** | `thebreakfast-club.com`, `/club`, `/reserver` | a prospect who doesn't know the club | light, cream + orange, welcoming | `--bc-*` |
| **Mode BBC — in-app** | Mode BBC tab + member PWA | the club coach, the member | dark, same family as the app | `--ls-bbc-*` |

**The trap:** systems ②&nbsp;and&nbsp;③ are both called "Breakfast Club" but share nothing technically. The site is cream and orange (it *sells*); the in-app mode is deep green (it *works*). This is intentional.

---

## CONTENT FUNDAMENTALS

**Language & voice.** All product copy is **French**. The tone is warm, direct, and human — a coach talking to a person, not a SaaS talking to a user. It is confident and premium without being corporate.

**Person.** The app addresses the user with **"tu"** in coaching moments and uses collective **"on"** ("on ne redessine rien, on réutilise") for shared method. The brand refers to itself in the first person plural. It is a *club*, so belonging language ("membre", "le club", "rituel") recurs.

**Casing.** Titles set in Anton are **ALWAYS UPPERCASE** — this is a hard rule, Anton is a display face with a single weight. Eyebrows (JetBrains Mono) are small **UPPERCASE**, widely letter-spaced. Body copy is sentence case.

**Register & rhythm.** Short, declarative sentences. Rules are stated as rules ("Le lime est réservé aux victoires."). Comparisons are used to teach ("le site vend, l'app travaille"). Numbers and data are treated as first-class — set in mono, aligned.

**Meaning is coded into color.** Copy leans on the color system: a "victory" is lime, an "urgent" state is coral, "silence / nobody opened" is amber. Writers should choose words that match the accent's meaning, not fight it.

**Emoji.** Not used in product UI. The spec uses ✅/❌/⚠️ only inside documentation (do/don't lists, warnings) — never in the interface itself. Do not introduce emoji into product copy.

**Sample voice (from the spec):**
- "Le lime est réservé aux victoires. Jamais en fond de sauce, jamais en couleur de base — sinon ça devient une canette d'energy drink."
- "Le clair n'est pas l'inverse du sombre."
- "The Wellness Nutrition Club" (the La Base 360 tagline, set in mono).

---

## VISUAL FOUNDATIONS

**Overall vibe.** Warm, premium, editorial. The app is a dark deep-**green** world (never black, never blue-night) that feels calm and focused; the club site is a bright cream-and-orange world that feels like breakfast and belonging.

**Color.**
- App ground is deep green `#162624`; surfaces step up in green (`#1E3330`, `#26403B`).
- **Teal `#2DD4BF` is the structural / signature color.** **Lime `#C5F82A` is reserved for wins only** — never a base fill or background sauce.
- Semantic accents each carry a fixed meaning: coral = urgency, sage = calm, amber = attention/silence, purple = XP/ritual.
- The Breakfast Club site is cream `#FCF8F1` with an orange→red CTA gradient (`#FF7A2F → #FF1E3C`) and warm secondary accents (pink, yellow, sage, peach).
- **Gold is abandoned** (5 Aug 2026). `--ls-gold` still exists but points at teal as a safety net — never re-gild.
- Max discipline: two background colors per surface. Light mode is **not** an inversion of dark.

**Typography.** Anton (titles, uppercase, one weight), Syne (editorial signature / featured amounts, 500–800), DM Sans (app body & UI), JetBrains Mono (data, timestamps, eyebrows). Breakfast Club site body is Poppins; Mode BBC body is Inter (deliberately different from the app's DM Sans).

**Backgrounds.** Flat green fields in the app — no gradients behind content, no photographic hero washes in the app UI. The **club site** uses alternating full-bleed bands (cream / cream-alt / dark green) and a signature **"ghost numeral"** (a giant Anton number in pale peach `#F6C6A0` sitting behind a card). Framed images on the site get an offset tinted panel behind them (`::before` in sage/pink/orange at ~30%). No repeating textures; no grain.

**Corner radii.** Standard `8px`, large `16px`, pills `999px` (primary CTAs). Club-site cards use a softer `22px`. App-icon squircles ≈ 22% of the side.

**Cards.** App cards: green surface, hairline border (`rgba(244,239,228,.10)`), no heavy shadow in dark mode. Club-site cards: `22px` radius, a **5px accent rule along the top edge**, and a soft drop shadow `0 34px 60px -34px rgba(30,51,48,.34)`.

**Shadows.** Never pure black — always **green-tinted**. Small `0 8px 20px -16px rgba(30,51,48,.30)`, medium `0 20px 44px -32px rgba(30,51,48,.34)`. In dark mode, separation comes from surface steps and hairline borders, not shadow. In light mode, soft tinted shadows separate blocks — borders are nearly invisible on purpose (`rgba(30,51,48,.07)`).

**Borders.** Hairline, low-opacity warm-white on dark (`.10` default, `.17` marked). On light, almost invisible; shadows do the separating.

**Buttons & states.** Primary CTAs are pills. In the app, primary uses teal; the club site uses the orange→red gradient with a colored shadow (`0 16px 34px -14px rgba(255,45,60,.6)`). Hover darkens the fill (orange→`#FF3B2E` on the site); press states shrink slightly. Lime buttons are avoided (lime = wins, not chrome).

**Transparency & blur.** Used sparingly — low-opacity warm-white for borders and muted text on dark. No heavy glassmorphism.

**Motion.** Restrained. Fades and short eases (standard `cubic-bezier(.2,.7,.3,1)`, ~120–320ms). No bounces, no flashy transitions. The brand is premium and calm.

**Imagery vibe.** Warm. Food / breakfast / community photography, framed with an offset tinted panel on the site. No black-and-white, no heavy grain.

**Eyebrow / pill component.** A signature motif: a pill (999px) with a warm fill (yellow/orange/pink/sage/peach on the site; surface + accent text in the app), text 10–12px uppercase mono, `letter-spacing: .2em`, sitting above a title.

---

## ICONOGRAPHY

The provided sources contain **brand logo assets only** — no product icon set, icon font, or SVG sprite was included in the identity package, and the spec does not name an icon library.

- **Logos / marks (provided, copied into `assets/`):** the La Base 360 symbol as SVG (dark `logo-mark.svg`, light `logo-mark-light.svg`, mono `logo-mark-mono.svg`) plus PNG/favicon rasters; the Breakfast Club wordmark PNGs (`logo-heart.png`, `logo-wordmark.png`, `logo-wordmark-dark.png`, `logo-mark.png`, `logo-medaillon.png`) and the heart favicon SVG (`favicon.svg`, `#E5352B`).
- **The La Base 360 mark** is a flat construction: a white filled **B** inside an open teal ring (opening top-right) with a lime bar at 45° in the gap. Rendered 100% flat — never add shadow, bevel, sheen, or a gradient; never close the ring; never gradient-fill the B. Use the mono version (`currentColor`) for single-color contexts. The **wordmark is composed in HTML** (symbol + live text in Anton), never baked into the SVG.
- **UI icons — substitution (FLAGGED):** because no product icon set was provided, this system uses **[Lucide](https://lucide.dev)** (loaded from CDN) as the interface icon set. Lucide's clean 2px-stroke, rounded-cap geometry matches the mark's rounded stroke terminals and the brand's calm, premium feel. **This is a substitution, not a brand asset** — if La Base 360 has an official icon set, provide it and it will replace Lucide.
- **Emoji / unicode as icons:** not used in product UI (documentation only). Do not introduce them into the interface.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (imports only). Consumers link this one file.
- `readme.md` — this document.
- `thumbnail.html` — homepage tile.
- `SKILL.md` — Agent-Skills-compatible entry.

**Tokens** (`tokens/`)
- `fonts.css` — Google Fonts import (Anton, Syne, DM Sans, JetBrains Mono, Poppins, Inter).
- `colors.css` — all three systems' color tokens.
- `typography.css` — font-family tokens, type scale, title/eyebrow tuning.
- `spacing.css` — spacing scale, radii, shadows, motion.

**Assets** (`assets/`)
- `labase360/` — La Base 360 marks (SVG + rasters).
- `breakfast-club/` — Breakfast Club wordmarks + heart favicon.

**Foundation cards** (`foundations/`) — specimen cards for the Design System tab (Colors, Type, Spacing, Brand).

**Components** (`components/`) — reusable React primitives (see below). Namespace: `window.LaBase360DesignSystem_afe5db`.

**UI kits** (`ui_kits/`) — full-screen product recreations.
- `app-360/` — the dark coaching app.
- `breakfast-club-site/` — the light public club site.

**Slides** (`slides/`) — branded slide templates.

---

## Components

Authored from the brand's foundations (no source component library was provided). Grouped under `components/`:
- **core/** — `Button`, `EyebrowPill`, `Card`, `StatBlock`, `Badge`, `Icon`, `Logo`.

Each component reads styling from the CSS custom properties and supports the app's dark surfaces. See each `*.prompt.md` for usage.

### Intentional additions
- **`Icon`** — a thin wrapper over Lucide (CDN), because no brand icon set was provided and screens need glyphs. Flagged as a substitution above.
- **`Logo`** — renders the La Base 360 lockup (SVG mark + HTML text) per the spec's rule that the wordmark is composed in HTML, not baked into the SVG.

---

## Rules never to break (from the spec)

1. **Lime = wins only.** Teal is the structural color.
2. **No hard-coded colors in components** — always `var(--ls-*)` so light/dark follow the theme.
3. **No gold.** Abandoned 5 Aug 2026.
4. **The three systems don't mix.**
5. **Every visible change goes through a mockup** before code.
6. **Light is not the inverse of dark** — cream ground, soft green-tinted shadows, near-invisible borders.
7. **Anton is always uppercase.**

---

## Caveats / substitutions

- **Fonts:** all six families are genuine Google Fonts, loaded from the Google CDN — no substitution. If you self-host, drop the `@font-face`/`src` files in and update `tokens/fonts.css`.
- **Icons:** Lucide substitutes for an unprovided product icon set (flagged above).
- **Breakfast Club logo in code artifacts:** the wordmark is a PNG (`assets/breakfast-club/logo-heart.png`); reference the file directly. For a fully self-contained artifact that can't load external images, base64-inline it.
