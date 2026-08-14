// =============================================================================
// BbcBilan10 — le bilan des 10 visites (chantier BBC).
// Le rendez-vous charnière : à la 10ᵉ visite, 9 étapes dans l'ordre
// (module Formation 05 — était 04 avant la réorganisation du parcours du
// 2026-07-28). Coché = persisté dans club_bilans.steps ; quand tout est coché,
// completed_at est posé.
//
// ⚠️ BILAN10_STEPS est la source UNIQUE : le module Formation la ré-affiche
// telle quelle. Les `key` sont enregistrés en base — on peut retoucher un
// `label` ou un `hint`, jamais une clé.
//
// ── L'ÉTAPE 1 A DES CHIFFRES (2026-08-14, maquette validée) ──────────────────
// « Refaire le scan corporel — on compare avec le point de départ » demandait
// une comparaison que rien à l'écran ne montrait : neuf cases à cocher et zéro
// valeur. Elle porte désormais la saisie des 8 mesures et le volet comparatif
// (cf. BbcBilan10Scan), et surtout son ENREGISTREMENT crée un vrai bilan de
// suivi — la seule écriture qui allume la courbe du membre dans son app.
//
// `club_bilans.steps` (jsonb) porte donc deux choses :
//   • les 9 booléens de la checklist, un par clé de BILAN10_STEPS ;
//   • sous la clé réservée `__pesee`, l'id du bilan créé + sa date d'écriture.
// Aucune migration : la colonne est déjà un jsonb libre. Le calcul de
// complétion ne regarde que les 9 clés connues, la clé réservée lui est
// invisible.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { BbcBilan10Scan, type ScanValues } from "./BbcBilan10Scan";
import {
  chargerContextePesee,
  enregistrerPeseeBilan10,
  estDeAujourdhui,
  type ContextePesee,
} from "./bilan10Pesee";

export const BILAN10_STEPS: Array<{ key: string; label: string; hint: string }> = [
  { key: "scan", label: "Refaire le scan corporel", hint: "on compare avec le point de départ" },
  { key: "objectifs", label: "Objectifs + victoires hors balance", hint: "énergie, sommeil, vêtements — pas que le poids" },
  { key: "grand_pot", label: "Proposer le format économique", hint: "le grand pot : mieux pour lui, mieux pour toi" },
  { key: "carte", label: "Renouveler la carte de visites", hint: "10 ou 30 visites — on enchaîne, on ne s'arrête pas" },
  { key: "appel", label: "Inscrire à l'Appel Ambassadeur", hint: "on réserve le créneau MAINTENANT, pas « plus tard »" },
  { key: "ardoise", label: "Ardoise + vidéo témoignage", hint: "sa progression affichée au club" },
  { key: "reseaux", label: "Partager sur les réseaux", hint: "avant/après + ressenti, avec son accord" },
  { key: "google", label: "Demander un avis Google", hint: "le moment idéal : il est content de ses résultats" },
  { key: "recos", label: "Demander les recommandations", hint: "« qui connais-tu qui pourrait en bénéficier ? »" },
];

/** Clé réservée de `club_bilans.steps` : elle ne fait PAS partie des 9 étapes. */
const PESEE_META_KEY = "__pesee";

/** La 1ʳᵉ étape, celle qui porte les chiffres. Jamais réécrite en dur ailleurs. */
const CLE_SCAN = BILAN10_STEPS[0].key;

interface PeseeMeta {
  assessmentId: string;
  savedAt: string;
}

/** Sépare les 9 booléens de la clé réservée, à la lecture du jsonb. */
function lireSteps(brut: Record<string, unknown> | null | undefined): {
  flags: Record<string, boolean>;
  meta: PeseeMeta | null;
} {
  const flags: Record<string, boolean> = {};
  for (const s of BILAN10_STEPS) {
    if (brut?.[s.key]) flags[s.key] = true;
  }
  const brutMeta = brut?.[PESEE_META_KEY] as Partial<PeseeMeta> | undefined;
  const meta =
    brutMeta && typeof brutMeta.assessmentId === "string"
      ? { assessmentId: brutMeta.assessmentId, savedAt: String(brutMeta.savedAt ?? "") }
      : null;
  return { flags, meta };
}

/**
 * La meta ne vaut QUE pour la journée où elle a été écrite.
 *
 * Une feuille INACHEVÉE se recharge d'un jour à l'autre : le chargement filtre
 * `completed_at is null`, pas la date — c'est voulu, on reprend le rituel là où
 * il s'est arrêté. Mais l'id de pesée rangé dans sa checklist voyage avec elle.
 * Sans ce tri, la pesée du mercredi partait « corriger » le bilan du lundi,
 * alors que le garde-fou de secours (`chercherPeseeDuJour`), lui, filtre bien
 * sur la date : la feuille affichait 8 champs VIDES sous un bouton « mettre à
 * jour la pesée », et le relevé du jour n'était écrit nulle part.
 *
 * On garde la meta telle quelle en base (elle voyage avec les 9 booléens dans
 * la même colonne jsonb) : on l'ignore seulement pour décider créer / corriger.
 */
function metaDuJour(m: PeseeMeta | null): PeseeMeta | null {
  return m && estDeAujourdhui(m.savedAt) ? m : null;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

interface BbcBilan10Props {
  clientId: string;
  clientName: string;
  coachUserId: string;
  onClose: () => void;
  onDone?: () => void;
}

export function BbcBilan10({ clientId, clientName, coachUserId, onClose, onDone }: BbcBilan10Props) {
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  // Verrou : deux cases cochées coup sur coup ne doivent pas créer DEUX
  // lignes de bilan (la 2e écraserait la 1re et perdrait des étapes).
  // La ref est la source de vérité (lisible tout de suite, sans re-render).
  const rowIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string | null> | null>(null);
  // Les cases telles qu'elles sont MAINTENANT : une sauvegarde déclenchée depuis
  // une promesse ne doit pas repartir d'un `steps` capturé il y a trois clics.
  const stepsRef = useRef<Record<string, boolean>>({});
  const metaRef = useRef<PeseeMeta | null>(null);
  const [meta, setMeta] = useState<PeseeMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  // Contexte de la pesée : point de départ, objectif, programme et RDV à
  // redonner tels quels au service de suivi.
  const [contexte, setContexte] = useState<ContextePesee | null>(null);
  const [contexteCharge, setContexteCharge] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const enregistrementRef = useRef(false);
  const [erreurPesee, setErreurPesee] = useState<string | null>(null);

  // Charge (ou prépare) le bilan en cours pour ce membre.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        // Uniquement le bilan EN COURS. Sans ce filtre, rouvrir le bilan d'un
        // membre qui en a déjà fait un rechargeait l'ancien, coché et daté :
        // pour refaire le rituel il fallait décocher les 9 cases une à une, ce
        // qui effaçait la date du premier. Un bilan clôturé appartient à
        // l'historique, on repart d'une checklist vierge.
        const { data } = await sb
          .from("club_bilans")
          .select("id, steps, completed_at")
          .eq("client_id", clientId)
          .eq("coach_user_id", coachUserId)
          .is("completed_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        const row = data as { id: string; steps: Record<string, unknown>; completed_at: string | null } | null;
        if (row) {
          rowIdRef.current = row.id;
          const { flags, meta: metaLue } = lireSteps(row.steps);
          stepsRef.current = flags;
          setSteps(flags);
          metaRef.current = metaLue;
          setMeta(metaLue);
          setCompletedAt(row.completed_at);
        }
      } catch {
        // silent-fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, coachUserId]);

  // Le contexte de la pesée, en parallèle : il ne bloque pas la checklist.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await chargerContextePesee(clientId);
        if (!cancelled) setContexte(ctx);
      } catch {
        if (!cancelled) setContexte(null);
      } finally {
        if (!cancelled) setContexteCharge(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Échap ferme la feuille — elle est modale, elle doit se fermer au clavier.
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onClose]);

  const persist = useCallback(
    async (next: Record<string, boolean>) => {
      const allDone = BILAN10_STEPS.every((s) => next[s.key]);
      const completed = allDone ? new Date().toISOString() : null;
      setCompletedAt(completed);
      // La clé réservée voyage avec les 9 booléens : c'est une seule colonne.
      const payload = metaRef.current ? { ...next, [PESEE_META_KEY]: metaRef.current } : { ...next };
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;

        // 1) Une création déjà en vol ? On l'attend au lieu d'en lancer une 2e.
        if (!rowIdRef.current && creatingRef.current) {
          await creatingRef.current;
        }

        if (rowIdRef.current) {
          await sb.from("club_bilans").update({ steps: payload, completed_at: completed }).eq("id", rowIdRef.current);
        } else {
          creatingRef.current = (async () => {
            const { data } = await sb
              .from("club_bilans")
              .insert({ client_id: clientId, coach_user_id: coachUserId, steps: payload, completed_at: completed })
              .select("id")
              .maybeSingle();
            const id = data ? String((data as { id: string }).id) : null;
            if (id) rowIdRef.current = id;
            return id;
          })();
          await creatingRef.current;
          creatingRef.current = null;
        }
        if (allDone) onDone?.();
      } catch {
        creatingRef.current = null;
      }
    },
    [clientId, coachUserId, onDone],
  );

  const appliquerSteps = useCallback(
    (next: Record<string, boolean>) => {
      stepsRef.current = next;
      setSteps(next);
      void persist(next);
    },
    [persist],
  );

  function toggle(key: string) {
    appliquerSteps({ ...stepsRef.current, [key]: !stepsRef.current[key] });
  }

  /**
   * L'enregistrement de la 2ᵉ pesée. C'est la seule écriture de cet écran qui
   * sorte de `club_bilans` — et la seule qui fasse bouger la courbe du membre.
   */
  async function enregistrerPesee(valeurs: ScanValues) {
    if (enregistrementRef.current) return;
    if (!contexte) {
      setErreurPesee("Le dossier de ce membre n'a pas pu être lu — recharge la feuille.");
      return;
    }
    enregistrementRef.current = true;
    setEnregistrement(true);
    setErreurPesee(null);
    try {
      const resultat = await enregistrerPeseeBilan10({
        clientId,
        contexte,
        valeurs,
        // Uniquement la pesée d'AUJOURD'HUI : sur une feuille reprise un autre
        // jour, celle de la dernière fois n'est pas à corriger, elle est déjà
        // un point de la courbe. On en crée une seconde.
        assessmentIdConnu: metaDuJour(metaRef.current)?.assessmentId ?? null,
      });
      // L'id est posé dans la ref AVANT la sauvegarde de la checklist : même si
      // celle-ci échoue, une seconde validation dans la même session retombera
      // sur ce même bilan au lieu d'en créer un autre.
      const suivante: PeseeMeta = { assessmentId: resultat.assessmentId, savedAt: new Date().toISOString() };
      metaRef.current = suivante;
      setMeta(suivante);
      appliquerSteps({ ...stepsRef.current, [CLE_SCAN]: true });
    } catch (err) {
      setErreurPesee(err instanceof Error ? err.message : "La pesée n'a pas pu être enregistrée.");
    } finally {
      enregistrementRef.current = false;
      setEnregistrement(false);
    }
  }

  const done = BILAN10_STEPS.filter((s) => steps[s.key]).length;
  const pct = Math.round((done / BILAN10_STEPS.length) * 100);

  // Le bouton (« enregistrer » / « mettre à jour ») et le statut ne parlent de
  // pesée enregistrée que si elle l'a été AUJOURD'HUI : sur une feuille reprise
  // un autre jour, les champs sont vides, l'écran doit le dire pareil.
  const metaAffichee = metaDuJour(meta);

  const etapeScan = BILAN10_STEPS[0];
  const autresEtapes = BILAN10_STEPS.slice(1);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Pas de fermeture au clic sur le voile : on saisit huit nombres ici, un
          doigt qui dérape ne doit pas les effacer. La croix et Échap suffisent. */}
      <div
        className="bbc-mode"
        role="dialog"
        aria-modal="true"
        aria-label={`Bilan des 10 de ${clientName}`}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "24px 24px 0 0",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
        }}
      >
        {/* ── En-tête figé : le titre et la progression restent visibles ──── */}
        <div
          style={{
            flex: "none",
            padding: "20px 22px 12px",
            borderBottom: "1px solid var(--ls-bbc-line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-coral)", fontWeight: 700 }}>le rendez-vous charnière</div>
              <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1, marginTop: 3 }}>Bilan des 10 · {clientName}</div>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer le bilan des 10" style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15, flex: "none" }}>✕</button>
          </div>

          {/* progression */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 0" }}>
            <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--ls-bbc-s2)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: completedAt ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime)", transition: "width .25s" }} />
            </div>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 700, color: completedAt ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime-text)" }}>{done}/{BILAN10_STEPS.length}</span>
          </div>
        </div>

        {/* ── La seule zone qui défile ────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "14px 22px calc(24px + env(safe-area-inset-bottom))",
          }}
        >
          {completedAt ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "color-mix(in srgb, var(--ls-bbc-teal) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-bbc-teal) 30%, transparent)", marginBottom: 14 }}>
              <span aria-hidden="true">✅</span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Bilan terminé — {clientName} est prêt pour la suite.</span>
            </div>
          ) : null}

          {loading ? (
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "10px 0" }}>chargement…</div>
          ) : (
            <>
              {/* ── Étape 1 : la 2e pesée, avec ses chiffres ──────────────── */}
              {!contexteCharge ? (
                <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "10px 0" }}>
                  lecture du point de départ…
                </div>
              ) : contexte ? (
                <BbcBilan10Scan
                  depart={contexte.depart}
                  departDate={formatDate(contexte.departDate)}
                  dejaEnregistre={contexte.peseeDuJour?.scan ?? null}
                  objectifInitial={contexte.objectifAffiche}
                  fait={Boolean(steps[etapeScan.key])}
                  onBasculer={() => toggle(etapeScan.key)}
                  enCoursEnregistrement={enregistrement}
                  enregistreLe={
                    metaAffichee
                      ? formatDate(metaAffichee.savedAt)
                      : contexte.peseeDuJour
                        ? formatDate(contexte.peseeDuJour.date)
                        : null
                  }
                  erreur={erreurPesee}
                  onEnregistrer={(valeurs) => void enregistrerPesee(valeurs)}
                  numero={1}
                  titre={etapeScan.label}
                  sousTitre={etapeScan.hint}
                />
              ) : (
                <>
                  <div style={{ fontSize: 11.5, color: "var(--ls-bbc-coral)", lineHeight: 1.5, marginBottom: 10 }}>
                    Le dossier de ce membre n'a pas pu être lu : la comparaison chiffrée est
                    indisponible. La checklist, elle, fonctionne.
                  </div>
                  <EtapeCase
                    numero={1}
                    label={etapeScan.label}
                    hint={etapeScan.hint}
                    coche={Boolean(steps[etapeScan.key])}
                    onToggle={() => toggle(etapeScan.key)}
                  />
                </>
              )}

              {/* ── Les 8 étapes suivantes ────────────────────────────────── */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--ls-bbc-font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  color: "var(--ls-bbc-muted)",
                  textTransform: "uppercase",
                  margin: "4px 0 10px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)" }}
                />
                puis, dans l'ordre
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {autresEtapes.map((s, i) => (
                  <EtapeCase
                    key={s.key}
                    numero={i + 2}
                    label={s.label}
                    hint={s.hint}
                    coche={Boolean(steps[s.key])}
                    onToggle={() => toggle(s.key)}
                  />
                ))}
              </div>
            </>
          )}

          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", textAlign: "center", marginTop: 14 }}>
            les 9 étapes · module Formation 05 · sauvegarde auto
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Une case de la checklist
// -----------------------------------------------------------------------------

function EtapeCase({
  numero,
  label,
  hint,
  coche,
  onToggle,
}: {
  numero: number;
  label: string;
  hint: string;
  coche: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={coche}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        padding: "12px 14px",
        borderRadius: 13,
        background: coche ? "color-mix(in srgb, var(--ls-bbc-lime) 8%, transparent)" : "var(--ls-bbc-s2)",
        border: `1px solid ${coche ? "color-mix(in srgb, var(--ls-bbc-lime) 32%, transparent)" : "var(--ls-bbc-line)"}`,
        color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: coche ? "var(--ls-bbc-lime)" : "transparent",
          border: `1px solid ${coche ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
          fontFamily: "var(--ls-bbc-font-mono)",
          fontSize: 11,
          fontWeight: 700,
          color: coche ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)",
        }}
      >
        {coche ? "✓" : numero}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{label}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 2, lineHeight: 1.45 }}>{hint}</span>
      </span>
    </button>
  );
}
