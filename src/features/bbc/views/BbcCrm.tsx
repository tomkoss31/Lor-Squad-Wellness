// =============================================================================
// BbcCrm — « Cobayes & membres » : la liste RÉELLE des membres BBC du coach,
// cliquable, avec un RÉCAP complet par membre (contact, objectif, programme,
// statut, visites, cœurs, RDV). Données réelles via useBbcMembers.
// =============================================================================

import { useMemo, useState } from "react";
import { useBbcMembers, type BbcMember } from "../useBbcMembers";
import { visitLevel } from "../useBbcVisits";
import { BbcNewMemberButton } from "../BbcNewMemberButton";
import { BbcMemberCorps } from "./BbcMemberCorps";
import { objectifAffichable } from "../bilan10Pesee";
import { BbcPeseeSheet } from "../BbcPeseeSheet";
import { BbcSupprimerMembre } from "./BbcSupprimerMembre";
import { useAppContext } from "../../../context/AppContext";

function objLabel(o?: string) {
  const map: Record<string, string> = {
    "weight-loss": "perte de poids",
    sport: "sport / performance",
    "mass-gain": "prise de masse",
    strength: "force",
    cutting: "sèche",
    endurance: "endurance",
    fitness: "forme",
    competition: "compétition",
  };
  return o ? map[o] ?? o : "—";
}
function lifeLabel(s?: string) {
  const map: Record<string, string> = {
    active: "en suivi actif",
    not_started: "à démarrer",
    paused: "en pause",
    stopped: "arrêté",
    lost: "perdu",
  };
  return s ? map[s] ?? s : "—";
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
function levelColor(m: BbcMember) {
  const l = visitLevel(m.card?.used ?? 0, m.card?.type);
  return l === "bilan" ? "var(--ls-bbc-coral)" : l === "warn" ? "var(--ls-bbc-amber)" : "var(--ls-bbc-teal)";
}
/** Ce que le coach doit lire : le solde de la carte, sinon le cumul. */
function visitLabel(m: BbcMember) {
  return m.card ? `${m.card.used}/${m.card.type}` : `${m.visits} au total`;
}

interface BbcCrmProps {
  userId?: string;
  /** Ouvre la feuille « Évaluation bien-être » (montée par BbcApp). */
  onNouveauMembre?: () => void;
}

export function BbcCrm({ userId, onNouveauMembre }: BbcCrmProps) {
  const { members: tous, loading } = useBbcMembers(userId);
  const [open, setOpen] = useState<string | null>(null);
  // Un admin voit tout le club (décision Thomas, 17/08). Le filtre n'est là que
  // pour retrouver les siens vite — il ne cache rien qu'on ne puisse rouvrir.
  const [filtre, setFiltre] = useState<"club" | "moi">("club");
  // La feuille de pesée, ouverte depuis une fiche dépliée.
  const [pesee, setPesee] = useState<BbcMember | null>(null);
  // Change après chaque écriture : force le rechargement des relevés.
  const [cleCorps, setCleCorps] = useState(0);
  // Combien de pesées chaque membre a déjà : remonté par la fiche dépliée, il
  // décide si la feuille pose la question « départ ou suivi » (la toute
  // première pesée EST le départ, il n'y a rien à demander).
  const [nbReleves, setNbReleves] = useState<Record<string, number>>({});
  // La fiche qu'on s'apprête à supprimer (19/08). Elle n'existait nulle part
  // côté club : une saisie en double au comptoir restait là pour toujours.
  const [aSupprimer, setASupprimer] = useState<BbcMember | null>(null);
  const { deleteClient } = useAppContext();

  const inscritsParDautres = useMemo(
    () => tous.some((m) => m.ownerId && m.ownerId !== userId),
    [tous, userId],
  );
  const members = useMemo(
    () => (filtre === "moi" ? tous.filter((m) => m.ownerId === userId) : tous),
    [tous, filtre, userId],
  );

  const totalVisits = members.reduce((s, m) => s + m.visits, 0);
  const totalHearts = members.reduce((s, m) => s + m.hearts, 0);
  const pending = members.reduce((s, m) => s + m.pendingHearts, 0);

  const stats: Array<{ label: string; value: string; tone: string }> = [
    { label: "membres BBC", value: String(members.length), tone: "var(--ls-bbc-lime-text)" },
    { label: "visites cumulées", value: String(totalVisits), tone: "var(--ls-bbc-teal)" },
    { label: "cœurs", value: String(totalHearts), tone: "var(--ls-bbc-lime-text)" },
    { label: "recos à valider", value: String(pending), tone: pending ? "var(--ls-bbc-coral)" : "var(--ls-bbc-text)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "18px 20px", borderTop: `2px solid ${s.tone}` }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 34, color: s.tone, lineHeight: 1, marginTop: 8 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Le point d'entrée de la saisie papier. Il vit en tête de la liste que
          le coach ouvre déjà tous les matins — pas dans une 6e section de menu
          (la nav BBC tient à 5, cf. la règle anti-dérive navigation). */}
      {onNouveauMembre ? (
        <BbcNewMemberButton
          onClick={onNouveauMembre}
          aide={
            <>
              La fiche papier se saisit ici, dans l'ordre où elle est remplie.
              <br />
              Le même bouton est repris sur « Ce matin ».
            </>
          }
        />
      ) : null}

      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />
          {filtre === "moi" ? "mes membres BBC" : "les membres du club"}
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 12 }}>Tape un membre pour voir son récap complet.</div>

        {/* Le filtre n'apparaît que s'il sert à quelque chose : tant que
            personne d'autre n'a inscrit de membre, deux boutons donneraient
            deux fois la même liste. */}
        {inscritsParDautres ? (
          <div role="group" aria-label="Filtrer les membres" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {([
              { k: "club", label: "Tout le club" },
              { k: "moi", label: "Mes membres" },
            ] as const).map((o) => {
              const actif = filtre === o.k;
              return (
                <button
                  key={o.k}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => setFiltre(o.k)}
                  style={{
                    minHeight: 44,
                    padding: "11px 15px",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: "var(--ls-bbc-font-body)",
                    fontSize: 13,
                    fontWeight: actif ? 800 : 600,
                    border: `1px solid ${actif ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
                    background: actif ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
                    color: actif ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {loading ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0" }}>chargement…</div>
        ) : members.length === 0 ? (
          // Ce vide renvoyait vers « la fiche client → Actions », un écran qui
          // n'existe PAS en mode BBC : AppLayout n'y monte que BbcApp, il n'y a
          // ni route /clients/:id ni onglet Actions atteignable. On expulsait le
          // coach de son propre mode pour créer son premier membre.
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0", lineHeight: 1.5 }}>
            Aucun membre BBC pour l'instant. Saisis ta première fiche papier avec « ＋ Nouvelle évaluation », juste au-dessus.
          </div>
        ) : (
          members.map((m) => (
            <MemberRow key={m.id} m={m} userId={userId} open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} onPesee={setPesee} cleCorps={cleCorps}
              onCorpsCharge={(id, nb) => setNbReleves((p) => (p[id] === nb ? p : { ...p, [id]: nb }))} onSupprimer={setASupprimer} />
          ))
        )}
      </div>

      {aSupprimer ? (
        <BbcSupprimerMembre
          prenom={aSupprimer.name.trim().split(/\s+/)[0] || "ce membre"}
          nomComplet={aSupprimer.name}
          visites={aSupprimer.visits}
          onFermer={() => setASupprimer(null)}
          onConfirmer={async () => {
            try {
              await deleteClient(aSupprimer.id);
              // La liste se relit toute seule : deleteClient rafraîchit les
              // données de l'app. On repousse quand même la clé des relevés,
              // sinon un corps déjà chargé resterait en mémoire.
              setCleCorps((n) => n + 1);
              setOpen(null);
              return null;
            } catch (e) {
              return e instanceof Error ? e.message : "La suppression n'a pas abouti.";
            }
          }}
        />
      ) : null}

      {pesee ? (
        <BbcPeseeSheet
          clientId={pesee.id}
          clientName={pesee.name}
          nbReleves={nbReleves[pesee.id] ?? 0}
          onClose={() => setPesee(null)}
          onEnregistre={() => setCleCorps((k) => k + 1)}
        />
      ) : null}
    </div>
  );
}

/**
 * La phrase du bandeau. Elle se calcule dans l'ordre de l'urgence réelle : ce
 * qui bloque le club d'abord, ce qui se prépare ensuite, le calme en dernier.
 * Un bandeau toujours rouge ne veut plus rien dire, un bandeau jamais rouge
 * non plus.
 */
function quoiFaire(m: BbcMember): { ton: string; ic: string; titre: string; detail: string } {
  const c = m.card;
  if (c?.expired) {
    return {
      ton: "var(--ls-bbc-coral)", ic: "🎫",
      titre: "Sa carte est périmée",
      detail: "Renouvelle-la avant son prochain passage, sinon le pointage ne compte sur rien.",
    };
  }
  if (c && c.used >= c.type) {
    return {
      ton: "var(--ls-bbc-coral)", ic: "📋",
      titre: `Carte finie — fais son bilan des ${c.type}`,
      detail: "C'est là qu'on refait le scan, qu'on renouvelle la carte et qu'on demande ses recommandations.",
    };
  }
  if (!c) {
    return {
      ton: "var(--ls-bbc-amber)", ic: "🎫",
      titre: "Pas de carte active",
      detail: "Sans carte, ses visites ne comptent vers aucun bilan — attribue-lui-en une.",
    };
  }
  if (m.pendingHearts > 0) {
    return {
      ton: "var(--ls-bbc-amber)", ic: "❤️",
      titre: `${m.pendingHearts} reco${m.pendingHearts > 1 ? "s" : ""} à valider`,
      detail: "Un cœur ne compte que si la personne a démarré. Tranche depuis l'onglet Cœurs.",
    };
  }
  if (c.remaining <= 3) {
    return {
      ton: "var(--ls-bbc-amber)", ic: "📣",
      titre: `Plus que ${c.remaining} visite${c.remaining > 1 ? "s" : ""} avant son bilan`,
      detail: "Préviens-la : le bilan se prépare, il ne se subit pas.",
    };
  }
  return {
    ton: "var(--ls-bbc-sage)", ic: "☕",
    titre: `Rien d'urgent — ${c.remaining} visites avant son bilan`,
    detail: m.nextFollowUp
      ? `Sa carte de ${c.type} est à ${c.used}. Son prochain rendez-vous est le ${fmtDate(m.nextFollowUp)}.`
      : `Sa carte de ${c.type} est à ${c.used}.`,
  };
}

function MemberRow({
  m, open, onToggle, userId, onPesee, cleCorps, onCorpsCharge, onSupprimer,
}: {
  m: BbcMember; open: boolean; onToggle: () => void; userId?: string;
  onSupprimer: (m: BbcMember) => void;
  onPesee?: (m: BbcMember) => void; cleCorps?: number;
  onCorpsCharge?: (id: string, nb: number) => void;
}) {
  const lvlColor = levelColor(m);
  // On ne le dit que quand c'est une information : « inscrite par moi » n'en
  // est pas une. Le prénom suffit, c'est un club de deux personnes.
  const parQui = m.ownerId && m.ownerId !== userId ? (m.ownerName ?? "").trim().split(/\s+/)[0] : null;
  return (
    <div style={{ borderTop: "1px solid var(--ls-bbc-line)" }}>
      <button type="button" onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", padding: "13px 4px", color: "var(--ls-bbc-text)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 999, flex: "none", background: "var(--ls-bbc-s2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: lvlColor }}>{m.name[0]?.toUpperCase() ?? "?"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>
            {m.started ? "membre" : "à démarrer"} · {objLabel(m.objective)}
            {parQui ? <> · inscrite par {parQui}</> : null}
          </div>
        </div>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: lvlColor }}>{visitLabel(m)}</span>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: "var(--ls-bbc-lime-text)" }}>{m.hearts}♥</span>
        <span aria-hidden="true" style={{ fontSize: 11, color: "var(--ls-bbc-hint)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
      </button>

      {open ? (
        <div style={{ padding: "4px 4px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* ── QUOI FAIRE MAINTENANT ──────────────────────────────────────
              En tête parce que c'est la seule ligne qu'on lit toujours. Elle
              se calcule, elle ne se choisit pas : un bandeau qui dit « rien
              d'urgent » aussi clairement qu'il crierait s'il fallait agir. */}
          {(() => {
            const a = quoiFaire(m);
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 11,
                  padding: "13px 14px",
                  borderRadius: 15,
                  lineHeight: 1.5,
                  background: `color-mix(in srgb, ${a.ton} 13%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${a.ton} 45%, transparent)`,
                  color: a.ton,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 19, flex: "none", lineHeight: 1.2 }}>{a.ic}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{a.titre}</div>
                  <div style={{ fontSize: 12.5, marginTop: 3, opacity: 0.9 }}>{a.detail}</div>
                </div>
              </div>
            );
          })()}

          {/* chiffres clés */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Stat
              label={m.card ? `carte ${m.card.type}` : "visites"}
              value={visitLabel(m)}
              color={lvlColor}
              sub={
                !m.card
                  ? "pas de carte active"
                  : visitLevel(m.card.used, m.card.type) === "bilan"
                    ? "carte finie · bilan à faire"
                    : visitLevel(m.card.used, m.card.type) === "warn"
                      ? "bientôt le bilan"
                      : `${m.card.remaining} restantes`
              }
            />
            <Stat label="cœurs" value={`${m.hearts}`} color="var(--ls-bbc-lime-text)" sub={m.pendingHearts ? `${m.pendingHearts} à valider` : "à jour"} />
            <Stat label="statut" value={lifeLabel(m.lifecycleStatus)} color="var(--ls-bbc-text)" small sub="" />
          </div>
          {/* ── SON CORPS ── chargé paresseusement, seulement à l'ouverture. */}
          <BbcMemberCorps
            clientId={m.id}
            prenom={(m.name || "").trim().split(/\s+/)[0] || "elle"}
            objectif={objectifAffichable(m.objective)}
            onCharge={(c) => onCorpsCharge?.(m.id, c.releves.length)}
            onNouvellePesee={onPesee ? () => onPesee(m) : undefined}
            cle={cleCorps}
          />

          {/* ── CE QUI MANQUE, avec ce que ça coûte ────────────────────────
              Un tiret ne dit ni pourquoi c'est vide, ni le prix du vide.
              « Email — » veut dire « pas de rappel la veille de son RDV ». */}
          {!m.email ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14, background: "color-mix(in srgb, var(--ls-bbc-amber) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-bbc-amber) 32%, transparent)", fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-bbc-amber)" }}>
              <span aria-hidden="true">⚠️</span>
              <span>
                <strong>{m.phone ? "Pas d'email." : "Ni téléphone ni email."}</strong> Elle ne recevra aucun rappel la
                veille de son rendez-vous{m.nextFollowUp ? ` du ${fmtDate(m.nextFollowUp)}` : ""} — ce rappel part par mail.
                Son QR et son application marchent quand même.
              </span>
            </div>
          ) : null}

          {/* détails */}
          <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Line k="Objectif" v={objLabel(m.objective)} />
            <Line k="Programme" v={m.program || "—"} />
            <Line k="Démarré le" v={fmtDate(m.startDate)} />
            <Line k="Prochain RDV" v={fmtDate(m.nextFollowUp)} />
            <Line k="Téléphone" v={m.phone || "—"} />
            <Line k="Email" v={m.email || "—"} />
          </div>

          {/* Voir l'app telle que le membre la voit — indispensable pour la
              recette : le coach ouvre la PWA du membre sans chercher son lien. */}
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {m.appToken ? (
              <>
                <a
                  href={`/client/${m.appToken}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "10px 16px",
                    borderRadius: 12,
                    background: "var(--ls-bbc-lime)",
                    color: "var(--ls-bbc-lime-ink)",
                    fontWeight: 800,
                    fontSize: 12.5,
                    textDecoration: "none",
                  }}
                >
                  📱 Ouvrir son app
                </a>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/client/${m.appToken}`)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 12,
                    background: "var(--ls-bbc-s2)",
                    border: "1px solid var(--ls-bbc-line)",
                    color: "var(--ls-bbc-muted)",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: "pointer",
                    fontFamily: "var(--ls-bbc-font-body)",
                  }}
                >
                  Copier le lien
                </button>
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: "var(--ls-bbc-hint)" }}>
                Pas encore d'accès à l'app pour ce membre — génère-le depuis sa fiche client.
              </div>
            )}
          </div>

          {/* ── Sortir de là ────────────────────────────────────────────────
              Thomas (19/08) : « les clients rentrés par erreur sur l'app BBC —
              côté classique on peut tout faire depuis Actions, mais rien sur le
              BBC. » Deux sorties, dans cet ordre : le lien vers sa fiche, qui
              donne accès à TOUT le reste sans le redévelopper ici, puis la
              suppression, qui n'existait nulle part côté club. */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--ls-bbc-line)", display: "flex", flexWrap: "wrap", gap: 9, alignItems: "center" }}>
            <a
              href={`/clients/${m.id}`}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: "var(--ls-bbc-s2)",
                border: "1px solid var(--ls-bbc-line)",
                color: "var(--ls-bbc-text)",
                fontWeight: 600,
                fontSize: 12.5,
                textDecoration: "none",
              }}
            >
              📋 Sa fiche complète
            </a>
            <button
              type="button"
              onClick={() => onSupprimer(m)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: "transparent",
                border: "1px solid color-mix(in srgb, var(--ls-bbc-coral) 45%, var(--ls-bbc-line))",
                color: "var(--ls-bbc-coral)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "var(--ls-bbc-font-body)",
                minHeight: 44,
              }}
            >
              Supprimer ce membre
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, color, sub, small }: { label: string; value: string; color: string; sub: string; small?: boolean }) {
  return (
    <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>{label}</div>
      <div style={{ fontFamily: small ? "var(--ls-bbc-font-body)" : "var(--ls-bbc-font-mono)", fontWeight: small ? 600 : 800, fontSize: small ? 12.5 : 20, color, lineHeight: 1.1, marginTop: 5 }}>{value}</div>
      {sub ? <div style={{ fontSize: 9.5, color: "var(--ls-bbc-hint)", marginTop: 3 }}>{sub}</div> : null}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
      <span style={{ flex: "none", width: 100, color: "var(--ls-bbc-muted)" }}>{k}</span>
      <span style={{ flex: 1, fontWeight: 600, color: "var(--ls-bbc-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
    </div>
  );
}
