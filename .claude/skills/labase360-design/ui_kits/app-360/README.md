# UI Kit — App 360 (client PWA)

The dark, warm client-facing app. Deep-green surfaces, teal structure, lime for wins only. Composes the design system's core primitives (`Button`, `Card`, `StatBlock`, `Badge`, `EyebrowPill`, `Logo`, `Icon`).

**Interactive flow:** login → dashboard. Tab bar switches Accueil / Club / Profil. The **Repas** tab (and the "Ajouter" button) opens the log-meal bottom sheet; picking a meal appends it to the day. Profil → "Se déconnecter" returns to login.

## Screens
- `LoginScreen.jsx` — stacked logo lockup, form, pill CTA.
- `HomeScreen.jsx` — dashboard: progress ring, macro stats, streak/ritual cards, today's meals.
- `ClubScreen.jsx` — Mode BBC member feed; each item uses one of the five carrier accents.
- `LogMealSheet.jsx` — bottom sheet to add a meal.
- `BottomNav.jsx` — blurred tab bar.
- `App.jsx` — orchestrator (screen + tab + sheet state).

Icons are Lucide (CDN) — see readme ICONOGRAPHY (flagged substitution).
