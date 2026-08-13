// =============================================================================
// tunnels — « où ça décroche », la seule partie de la page qui dit quoi faire.
//
// Deux décisions qui changent la conclusion :
//
// 1. **La pire étape se mesure en TAUX, pas en nombre.** Perdre 38 personnes
//    sur 96 (−40 %) fait moins mal que d'en perdre 36 sur 58 (−62 %) : c'est
//    la seconde qu'il faut réparer. Trouvé en testant la maquette, où le texte
//    et la barre rouge désignaient deux étapes différentes.
// 2. **Une étape ne peut pas dépasser la précédente.** Les compteurs sont
//    agrégés par jour : quelqu'un peut entrer à l'étape 2 aujourd'hui après
//    avoir vu l'étape 1 hier. Sans garde-fou, l'entonnoir afficherait une
//    « chute » négative, c'est-à-dire une remontée — et le lecteur croirait
//    à un bug plutôt qu'à une réalité de mesure.
// =============================================================================

export interface EtapeBrute {
  tunnel: string;
  etape: string;
  rang: number;
  n: number;
}

export interface EtapeLue {
  etape: string;
  n: number;
  /** Part restante par rapport à la 1re étape, pour la largeur de barre. */
  part: number;
  /** Chute depuis l'étape précédente, en %. `null` pour la première. */
  chute: number | null;
  /** `true` si c'est ici qu'on perd la plus grosse part. */
  pire: boolean;
}

export interface TunnelLu {
  tunnel: string;
  etapes: EtapeLue[];
  entrent: number;
  arrivent: number;
  /** Part de ceux qui vont au bout, en %. */
  tauxFin: number;
  /** L'étape qui saigne, si le tunnel en compte au moins deux. */
  pire: { etape: string; chute: number } | null;
}

export function analyserTunnels(brutes: EtapeBrute[]): TunnelLu[] {
  const parTunnel = new Map<string, EtapeBrute[]>();
  for (const b of brutes) {
    const l = parTunnel.get(b.tunnel) ?? [];
    l.push(b);
    parTunnel.set(b.tunnel, l);
  }

  const out: TunnelLu[] = [];
  for (const [tunnel, liste] of parTunnel) {
    const tri = [...liste].sort((a, b) => a.rang - b.rang);
    if (tri.length === 0) continue;

    const entrent = tri[0].n;
    let pireTaux = -1;
    let pireI = -1;
    const chutes: (number | null)[] = tri.map((e, i) => {
      if (i === 0) return null;
      const avant = Math.max(tri[i - 1].n, e.n); // cf. garde-fou n°2
      if (avant <= 0) return null;
      const taux = (avant - e.n) / avant;
      if (taux > pireTaux) { pireTaux = taux; pireI = i; }
      return Math.round(taux * 100);
    });

    // Un tunnel où personne ne décroche n'a pas d'étape « pire » à désigner.
    const aUnePire = pireI > 0 && pireTaux > 0;

    out.push({
      tunnel,
      entrent,
      arrivent: tri[tri.length - 1].n,
      tauxFin: entrent > 0 ? Math.round((tri[tri.length - 1].n / entrent) * 100) : 0,
      etapes: tri.map((e, i) => ({
        etape: e.etape,
        n: e.n,
        part: entrent > 0 ? Math.min(100, Math.round((e.n / entrent) * 100)) : 0,
        chute: chutes[i],
        pire: aUnePire && i === pireI,
      })),
      pire: aUnePire
        ? { etape: tri[pireI].etape, chute: Math.round(pireTaux * 100) }
        : null,
    });
  }

  return out.sort((a, b) => b.entrent - a.entrent);
}
