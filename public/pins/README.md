# Pins Herbalife — assets pour RankPinBadge

Le composant `src/components/rank/RankPinBadge.tsx` affiche le pin
correspondant au rang Herbalife du distri.

## Fichiers attendus (8 PNG carrés, fond transparent recommandé)

Mapping `users.current_rank` → fichier :

| Rang DB | Fichier attendu |
|---|---|
| `distributor_25` | `pins/distributor.png` |
| `senior_consultant_35` | `pins/senior-consultant.png` |
| `success_builder_42` | `pins/success-builder.png` |
| `supervisor_50` | `pins/supervisor.png` |
| `world_team_50` | `pins/world-team.png` |
| `get_team_50` | `pins/get-team.png` |
| `millionaire_50` | `pins/millionaire-team.png` |
| `presidents_50` | `pins/presidents-team.png` |

## Format recommandé

- PNG, fond transparent
- 256×256 px minimum (le composant scale en sm 40 / md 64 / lg 96 / xl 128)
- Pin Herbalife officiel (collection 2026 ou plus récente)

## Fallback

Si un fichier est absent, le composant affiche un cercle gris avec
les initiales du rang. Aucun crash, pas de placeholder cassé.
