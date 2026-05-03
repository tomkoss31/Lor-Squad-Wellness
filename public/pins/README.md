# Pins Herbalife — assets pour RankPinBadge

Le composant `src/components/rank/RankPinBadge.tsx` affiche le pin
correspondant au rang Herbalife du distri.

## Mapping principal (8 paliers, current_rank → fichier)

| Rang DB | Fichier |
|---|---|
| `distributor_25` | `distributor.webp` |
| `senior_consultant_35` | `senior-consultant.webp` |
| `success_builder_42` | `success-builder.webp` |
| `supervisor_50` | `supervisor.webp` |
| `world_team_50` | `world-team.webp` |
| `get_team_50` | `get-team.webp` |
| `millionaire_50` | `millionaire-team.webp` |
| `presidents_50` | `presidents-team.webp` ⚠️ manque |

## Pins extras (paliers RO intermédiaires, déjà déposés)

Ces 3 fichiers sont dans `/public/pins/` mais ne sont **pas encore
mappés à un rang DB** (la colonne `users.current_rank` n'a que les 8
valeurs ci-dessus). Ils sont exportés via `PIN_FILE_EXTRA` pour usage
ultérieur (extension du type HerbalifeRank avec sous-paliers).

| Pin | Fichier | Mapping futur potentiel |
|---|---|---|
| Active Supervisor | `active-supervisor.webp` | `supervisor_active_50` |
| G.E.T. 2500 | `get-team-2500.webp` | `get_team_2500_50` |
| Millionaire 7500 | `millionaire-team-7500.webp` | `millionaire_team_7500_50` |

## Format

- WebP, fond transparent (plus léger que PNG, mêmes capacités)
- ~256×256 minimum (le composant scale en sm 40 / md 64 / lg 96 / xl 128)
- Pins Herbalife officiels (collection 2026)

## Fallback

Si un fichier est absent, le composant affiche un cercle gris avec
les initiales du rang. Aucun crash, pas de placeholder cassé.
