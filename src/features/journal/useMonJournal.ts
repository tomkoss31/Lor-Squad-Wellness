// =============================================================================
// Le journal de la coach elle-même (22/09/2026, maquette GpUrQc511q3sewMXJw96BY,
// écran 1 validé par Thomas) : le jeton de SA fiche membre, si elle est reliée à
// son compte. `null` = pas encore reliée → « Mon journal » propose de la relier.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { journalCoachPerso } from "./journalApi";

export function useMonJournal(userId?: string) {
  const [token, setToken] = useState<string | null>(null);
  const [pret, setPret] = useState(false);

  const recharger = useCallback(async () => {
    if (!userId) {
      setToken(null);
      setPret(true);
      return;
    }
    try {
      setToken(await journalCoachPerso.monJeton());
    } catch {
      setToken(null); // le rond reste sur « à ouvrir » : rien ne casse dans l'app coach
    } finally {
      setPret(true);
    }
  }, [userId]);

  useEffect(() => { void recharger(); }, [recharger]);

  return { token, pret, recharger, setToken };
}
