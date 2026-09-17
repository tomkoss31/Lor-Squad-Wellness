// =============================================================================
// « Les boîtes » — l'écran des boîtes de contact posées chez les commerçants.
//
// MAQUETTE VALIDÉE PAR THOMAS le 16/09/2026, après un premier jet rejeté. Son
// reproche, mot pour mot : « on arrive sur la page on sait pas où aller quoi y
// faire ». D'où les trois règles de cet écran, qu'il ne faut pas défaire :
//
//   1. LE GESTE AVANT LA DONNÉE. Le premier élément sous les onglets est un
//      verbe : « ＋ Saisir un coupon ». Aucun chiffre ne passe devant.
//   2. PAS DE BLOC DE CHIFFRES. Les quatre tuiles du premier jet coûtaient
//      ~200 px et repoussaient le bouton sous le pli d'un iPhone SE. Les mêmes
//      chiffres tiennent dans l'en-tête de la carte qu'ils décrivent.
//   3. ZÉRO BOUTON DANS UNE LIGNE DE LISTE. C'est ce qui coupait les prénoms
//      dans « Les visites » (cf. BbcClub.tsx) : la ligne entière est la cible.
//
// Le bandeau du haut n'existe que s'il y a une fuite, et il met les GENS avant
// les boîtes : quelqu'un à qui on a promis une évaluation par écrit et que
// personne ne rappelle est la seule vraie promesse de cet écran.
// =============================================================================

import { useMemo, useState } from "react";
import type { Club } from "../../../types/domain";
import { BbcCouponSheet } from "../BbcCouponSheet";
import { useBbcBoites } from "../useBbcBoites";
import {
  classementPoseurs,
  entonnoir,
  etatBoite,
  fuites,
  ilYA,
  prochainNumero,
  sousTitreBoite,
  trierBoites,
  type Boite,
  type Coupon,
  type IssueCoupon,
} from "../boites";

type Filtre = "a_relever" | "toutes" | "miennes" | "membres";

interface Props {
  userId?: string;
  club: Club | null;
}

export function BbcBoites({ userId, club }: Props) {
  const b = useBbcBoites(userId, club?.id ?? null);
  const [filtre, setFiltre] = useState<Filtre>("a_relever");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [saisieSur, setSaisieSur] = useState<Boite | null>(null);
  const [poser, setPoser] = useState(false);
  const [ficheCoupon, setFicheCoupon] = useState<Coupon | null>(null);

  const maintenant = Date.now();
  const vivantes = useMemo(() => b.boites.filter((x) => !x.retireeLe), [b.boites]);
  const f = useMemo(() => fuites(vivantes, b.coupons, maintenant), [vivantes, b.coupons, maintenant]);
  const parBoite = useMemo(() => {
    const m = new Map<string, Coupon[]>();
    for (const c of b.coupons) m.set(c.boiteId, [...(m.get(c.boiteId) ?? []), c]);
    return m;
  }, [b.coupons]);

  const boiteOuverte = ouverte ? (b.boites.find((x) => x.id === ouverte) ?? null) : null;

  if (boiteOuverte) {
    return (
      <>
        <Detail
          boite={boiteOuverte}
          coupons={parBoite.get(boiteOuverte.id) ?? []}
          maintenant={maintenant}
          onRetour={() => setOuverte(null)}
          onSaisir={() => setSaisieSur(boiteOuverte)}
          onRelevee={() => void b.marquerRelevee(boiteOuverte.id)}
          onRetirer={() => {
            void b.retirerBoite(boiteOuverte.id);
            setOuverte(null);
          }}
          onCoupon={setFicheCoupon}
        />
        {feuilles()}
      </>
    );
  }

  const liste = trierBoites(
    vivantes.filter((x) => {
      if (filtre === "a_relever") return etatBoite(x, maintenant) === "a_relever";
      if (filtre === "miennes") return x.poseurUserId === userId;
      if (filtre === "membres") return Boolean(x.poseurClientId);
      return true;
    }),
    maintenant,
  );

  const nbCoupons = b.coupons.length;
  const nbDemarrages = b.coupons.filter((c) => c.issue === "demarre").length;
  const desMembres = vivantes.filter((x) => Boolean(x.poseurClientId)).length;
  const classement = classementPoseurs(b.boites, b.coupons);

  return (
    <>
      {/* 1. LE GESTE, avant toute donnée. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <button
          type="button"
          onClick={() => setSaisieSur(liste[0] ?? vivantes[0] ?? null)}
          disabled={vivantes.length === 0}
          style={boutonLime(vivantes.length > 0)}
        >
          ＋ Saisir un coupon
        </button>
        <div style={aideCentree}>
          {vivantes.length
            ? "Tu relèves une boîte ? La feuille enchaîne, tu ne ressors pas entre deux coupons."
            : "Pose ta première boîte pour pouvoir saisir des coupons."}
        </div>
        <button type="button" onClick={() => setPoser(true)} style={boutonFantome}>
          ＋ Poser une boîte
        </button>
      </div>

      {/* 2. CE QUI FUIT — les gens d'abord. Rien du tout si tout va bien. */}
      {f.aAppeler.length || f.aRelever.length ? (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
          {f.aAppeler.length ? (
            <div style={bandeau("coral")}>
              <span aria-hidden="true" style={{ fontSize: 16 }}>
                📞
              </span>
              <span style={{ flex: 1, minWidth: 150, fontSize: 13, lineHeight: 1.45 }}>
                <b>
                  {f.aAppeler.length} personne{f.aAppeler.length > 1 ? "s attendent" : " attend"} ton appel.
                </b>{" "}
                <span style={{ color: "var(--ls-bbc-muted)" }}>
                  {f.attenteMax > 0
                    ? `La plus ancienne depuis ${f.attenteMax} j — on lui a promis une évaluation par écrit.`
                    : "Saisies aujourd'hui."}
                </span>
              </span>
            </div>
          ) : null}
          {f.aRelever.length ? (
            <div style={bandeau("amber")}>
              <span aria-hidden="true" style={{ fontSize: 16 }}>
                📦
              </span>
              <span style={{ flex: 1, minWidth: 150, fontSize: 13, lineHeight: 1.45 }}>
                <b>
                  {f.aRelever.length} boîte{f.aRelever.length > 1 ? "s" : ""} à relever.
                </b>{" "}
                <span style={{ color: "var(--ls-bbc-muted)" }}>
                  {f.aRelever.map((x) => x.commerce).slice(0, 3).join(", ")}
                  {f.aRelever.length > 3 ? "…" : ""}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3. LA LISTE — les chiffres vivent dans l'en-tête, pas en tuiles. */}
      <div style={{ ...carte, marginTop: 16 }}>
        <div style={oeilleton}>
          <span style={point} />
          <span style={{ flex: 1 }}>📦 les boîtes posées</span>
          <span style={chiffresEntete}>
            {vivantes.length} posée{vivantes.length > 1 ? "s" : ""} · {nbCoupons} coupon{nbCoupons > 1 ? "s" : ""} · {nbDemarrages} ❤
          </span>
        </div>
        <div style={phrase}>Tape une boîte pour voir ses coupons et en saisir.</div>

        <div style={rangeeFiltres}>
          <Pastille on={filtre === "a_relever"} onClick={() => setFiltre("a_relever")}>
            À relever · {f.aRelever.length}
          </Pastille>
          <Pastille on={filtre === "toutes"} onClick={() => setFiltre("toutes")}>
            Toutes · {vivantes.length}
          </Pastille>
          <Pastille on={filtre === "miennes"} onClick={() => setFiltre("miennes")}>
            Les miennes · {vivantes.filter((x) => x.poseurUserId === userId).length}
          </Pastille>
          {desMembres > 0 ? (
            <Pastille on={filtre === "membres"} onClick={() => setFiltre("membres")}>
              Celles de mes membres · {desMembres}
            </Pastille>
          ) : null}
        </div>

        {b.loading ? (
          <div style={vide}>Chargement…</div>
        ) : liste.length === 0 ? (
          <div style={vide}>
            {vivantes.length === 0
              ? "Aucune boîte pour l'instant. Pose la première avec « ＋ Poser une boîte », juste au-dessus."
              : "Rien à relever — tout est à jour. Passe le filtre sur « Toutes » pour voir le parc."}
          </div>
        ) : (
          liste.map((x) => {
            const n = (parBoite.get(x.id) ?? []).length;
            const etat = etatBoite(x, maintenant);
            return (
              <button key={x.id} type="button" onClick={() => setOuverte(x.id)} style={ligne}>
                <span style={pastilleNumero(etat)}>{String(x.numero).padStart(2, "0")}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={nomLigne}>{x.commerce}</span>
                  <span style={{ ...sousLigne, color: etat === "a_relever" ? "var(--ls-bbc-amber)" : "var(--ls-bbc-muted)" }}>
                    {sousTitreBoite(x, n, maintenant)}
                  </span>
                </span>
                <span style={{ flex: "none", textAlign: "right" }}>
                  <span style={{ ...compte, color: n ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-hint)" }}>{n}</span>
                  <span style={unite}>coupon{n > 1 ? "s" : ""}</span>
                </span>
                <span aria-hidden="true" style={chevron}>
                  ›
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* 4. QUI POSE, QUI RÉCOLTE — validé tel quel par Thomas, on n'y touche pas. */}
      <div style={{ ...carte, marginTop: 14 }}>
        <div style={oeilleton}>
          <span style={{ flex: 1 }}>🏆 qui pose, qui récolte</span>
          <span style={chiffresEntete}>ce mois</span>
        </div>
        <div style={phrase}>Le cœur tombe quand la personne démarre, pas quand le coupon arrive.</div>
        {classement.length === 0 ? (
          <div style={vide}>Personne n'a encore posé de boîte.</div>
        ) : (
          classement.map((p) => (
            <div key={p.cle} style={{ ...ligne, cursor: "default" }}>
              <span style={rond}>{(p.nom[0] ?? "?").toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={nomLigne}>
                  {p.nom} <span style={{ color: "var(--ls-bbc-hint)", fontWeight: 500 }}>· {p.estMembre ? "membre" : "équipe"}</span>
                </span>
                <span style={sousLigne}>
                  {p.boites} boîte{p.boites > 1 ? "s" : ""} · {p.coupons} coupon{p.coupons > 1 ? "s" : ""} ·{" "}
                  {p.demarrages} démarrage{p.demarrages > 1 ? "s" : ""}
                </span>
              </span>
              <span style={coeurs}>❤ {p.demarrages}</span>
            </div>
          ))
        )}
      </div>

      {feuilles()}
    </>
  );

  function feuilles() {
    return (
      <>
        {saisieSur ? (
          <BbcCouponSheet
            boite={saisieSur}
            onClose={() => setSaisieSur(null)}
            chercherDoublon={b.chercherDoublon}
            onSaisir={(c) =>
              b.saisirCoupon({
                boiteId: saisieSur.id,
                prenom: c.prenom,
                nom: c.nom,
                ville: c.ville,
                telephone: c.telephone,
              })
            }
          />
        ) : null}

        {poser ? (
          <PoserBoiteSheet
            numeroPropose={prochainNumero(b.boites)}
            villeClub={club?.city ?? null}
            onClose={() => setPoser(false)}
            onPoser={async (n) => {
              const ok = await b.poserBoite(n);
              if (ok) setPoser(false);
              return ok;
            }}
          />
        ) : null}

        {ficheCoupon ? (
          <FicheCouponSheet
            coupon={ficheCoupon}
            onClose={() => setFicheCoupon(null)}
            onTrancher={async (issue) => {
              await b.trancherCoupon(ficheCoupon.id, issue);
              setFicheCoupon(null);
            }}
          />
        ) : null}
      </>
    );
  }
}

// ── L'écran de détail d'une boîte ───────────────────────────────────────────
function Detail({
  boite,
  coupons,
  maintenant,
  onRetour,
  onSaisir,
  onRelevee,
  onRetirer,
  onCoupon,
}: {
  boite: Boite;
  coupons: Coupon[];
  maintenant: number;
  onRetour: () => void;
  onSaisir: () => void;
  onRelevee: () => void;
  onRetirer: () => void;
  onCoupon: (c: Coupon) => void;
}) {
  const [confirme, setConfirme] = useState(false);
  const e = entonnoir(coupons);
  const max = Math.max(e.coupons, 1);

  return (
    <>
      <button type="button" onClick={onRetour} style={retour}>
        ‹ Toutes les boîtes
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, margin: "2px 0 18px" }}>
        <span style={numeroDetail}>{String(boite.numero).padStart(2, "0")}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 26, lineHeight: 1.08 }}>{boite.commerce}</div>
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.45 }}>
            {[boite.ou, boite.ville].filter(Boolean).join(" · ") || "—"}
            <br />
            Posée par {boite.poseurNom} · relevée {ilYA(boite.releveeLe, maintenant)}
            {boite.contactCommercant ? ` · ${boite.contactCommercant}` : ""}
          </div>
        </div>
      </div>

      {/* LA CORRECTION DE THOMAS : le geste avant l'entonnoir et la liste. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <button type="button" onClick={onSaisir} style={boutonLime(true)}>
          ＋ Saisir un coupon
        </button>
        <div style={aideCentree}>La feuille reste sur {boite.commerce} : enchaîne tout le paquet sans ressortir.</div>
        <button type="button" onClick={onRelevee} style={boutonFantome}>
          Relevée, elle était vide
        </button>
      </div>

      <div style={{ ...carte, marginTop: 16 }}>
        <div style={oeilleton}>
          <span style={{ flex: 1 }}>📈 ce qu'elle rapporte</span>
          <span style={chiffresEntete}>depuis la pose</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <Etape k="coupons" v={e.coupons} max={max} couleur="var(--ls-bbc-sage)" />
          <Etape k="joints" v={e.joints} max={max} couleur="var(--ls-bbc-teal)" />
          <Etape k="rdv pris" v={e.rdv} max={max} couleur="var(--ls-bbc-teal)" />
          <Etape k="démarrages" v={e.demarrages} max={max} couleur="var(--ls-bbc-lime)" />
        </div>
      </div>

      <div style={{ ...carte, marginTop: 14 }}>
        <div style={oeilleton}>
          <span style={{ flex: 1 }}>🎟️ les coupons</span>
          <span style={chiffresEntete}>
            {e.coupons} · {e.demarrages} démarrage{e.demarrages > 1 ? "s" : ""}
          </span>
        </div>
        {coupons.length === 0 ? (
          <div style={vide}>Aucun coupon pour l'instant. Saisis le premier avec « ＋ Saisir un coupon », juste au-dessus.</div>
        ) : (
          coupons.map((c) => (
            <button key={c.id} type="button" onClick={() => onCoupon(c)} style={ligne}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={nomLigne}>{`${c.prenom} ${c.nom ?? ""}`.trim()}</span>
                <span style={sousLigne}>
                  {[c.ville, c.telephone].filter(Boolean).join(" · ")} · saisi {ilYA(c.saisiLe, maintenant)}
                </span>
              </span>
              <span style={gelule(c)}>{libelleIssue(c)}</span>
            </button>
          ))
        )}
      </div>

      <div style={{ ...carte, marginTop: 14 }}>
        <div style={oeilleton}>
          <span style={{ flex: 1 }}>⚙️ gérer la boîte</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
          {confirme ? (
            <>
              <div style={{ fontSize: 13, color: "var(--ls-bbc-coral)", lineHeight: 1.45 }}>
                Retirer la boîte n° {boite.numero} ? Ses coupons et ses leads restent, son numéro redevient libre.
              </div>
              <button type="button" onClick={onRetirer} style={{ ...boutonFantome, color: "var(--ls-bbc-coral)" }}>
                Oui, la retirer
              </button>
              <button type="button" onClick={() => setConfirme(false)} style={boutonFantome}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirme(true)} style={{ ...boutonFantome, color: "var(--ls-bbc-coral)" }}>
              Retirer la boîte
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Etape({ k, v, max, couleur }: { k: string; v: number; max: number; couleur: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ flex: "none", width: 88, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>
        {k}
      </span>
      <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--ls-bbc-s2)", overflow: "hidden", minWidth: 0 }}>
        <span style={{ display: "block", width: `${Math.round((v / max) * 100)}%`, height: "100%", background: couleur, borderRadius: 3 }} />
      </span>
      <span style={{ flex: "none", width: 26, textAlign: "right", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 15, fontWeight: 700, color: couleur }}>
        {v}
      </span>
    </div>
  );
}

// ── Feuille : poser une boîte ───────────────────────────────────────────────
function PoserBoiteSheet({
  numeroPropose,
  villeClub,
  onClose,
  onPoser,
}: {
  numeroPropose: number;
  villeClub: string | null;
  onClose: () => void;
  onPoser: (n: {
    numero: number;
    commerce: string;
    ou: string;
    contactCommercant: string;
    ville: string;
    poseurNom: string;
  }) => Promise<boolean>;
}) {
  const [numero, setNumero] = useState(String(numeroPropose));
  const [commerce, setCommerce] = useState("");
  const [ou, setOu] = useState("");
  const [contact, setContact] = useState("");
  const [ville, setVille] = useState(villeClub ?? "");
  const [poseur, setPoseur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const pret = commerce.trim().length > 1 && poseur.trim().length > 1 && Number(numero) > 0;

  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau}>
        <div style={enteteFeuille}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={titreFeuille}>Poser une boîte</div>
            <div style={sousTitreFeuille}>la n° {numero || "—"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>
        <div style={corpsFeuille}>
          <div style={grille2}>
            <Saisie id="b-num" label="Numéro" valeur={numero} onChange={setNumero} type="number" />
            <Saisie id="b-poseur" label="Posée par" valeur={poseur} onChange={setPoseur} placeholder="Prénom Nom" />
          </div>
          <Saisie id="b-commerce" label="Le commerce" valeur={commerce} onChange={setCommerce} />
          <Saisie id="b-ou" label="Où exactement" valeur={ou} onChange={setOu} placeholder="sur le comptoir" />
          <div style={grille2}>
            <Saisie id="b-contact" label="Qui tient le commerce" valeur={contact} onChange={setContact} placeholder="Prénom + tél" />
            <Saisie id="b-ville" label="Ville" valeur={ville} onChange={setVille} />
          </div>
          <div style={{ ...alerteBase, background: "color-mix(in srgb, var(--ls-bbc-teal) 11%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-bbc-teal) 34%, transparent)" }}>
            <span aria-hidden="true" style={{ fontSize: 15 }}>
              🗓️
            </span>
            <span>
              <b style={{ color: "var(--ls-bbc-teal)" }}>Pas de date de retrait à saisir.</b> La boîte passe « à relever »
              toute seule après 4 semaines, et saisir un coupon la remet à jour.
            </span>
          </div>
        </div>
        <div style={piedFeuille}>
          <button
            type="button"
            disabled={!pret || envoi}
            onClick={async () => {
              setEnvoi(true);
              await onPoser({
                numero: Number(numero),
                commerce,
                ou,
                contactCommercant: contact,
                ville,
                poseurNom: poseur,
              });
              setEnvoi(false);
            }}
            style={boutonLime(pret && !envoi)}
          >
            {envoi ? "…" : `Poser la boîte n° ${numero || ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feuille : la fiche d'un coupon, SANS quitter le mode BBC ────────────────
function FicheCouponSheet({
  coupon,
  onClose,
  onTrancher,
}: {
  coupon: Coupon;
  onClose: () => void;
  onTrancher: (issue: IssueCoupon) => Promise<void>;
}) {
  const tel = coupon.telephone.replace(/\D/g, "");
  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau}>
        <div style={enteteFeuille}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={titreFeuille}>{`${coupon.prenom} ${coupon.nom ?? ""}`.trim()}</div>
            <div style={sousTitreFeuille}>{[coupon.ville, coupon.telephone].filter(Boolean).join(" · ")}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>
        <div style={corpsFeuille}>
          <a href={`tel:${tel}`} style={{ ...boutonLime(true), textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            📞 Appeler maintenant
          </a>
          <div style={{ display: "flex", gap: 9 }}>
            <button type="button" onClick={() => void onTrancher("rdv")} style={{ ...boutonFantome, flex: 1 }}>
              RDV calé
            </button>
            <button type="button" onClick={() => void onTrancher("sans_reponse")} style={{ ...boutonFantome, flex: 1 }}>
              Pas de réponse
            </button>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button type="button" onClick={() => void onTrancher("demarre")} style={{ ...boutonFantome, flex: 1, color: "var(--ls-bbc-lime-text)" }}>
              Elle a démarré ❤
            </button>
            <button type="button" onClick={() => void onTrancher("pas_interesse")} style={{ ...boutonFantome, flex: 1, color: "var(--ls-bbc-coral)" }}>
              Sans suite
            </button>
          </div>
          <div style={aideCentree}>
            Tout se fait ici : le mode BBC remplace l'app classique, on ne t'envoie pas sur un autre écran.
          </div>
        </div>
      </div>
    </div>
  );
}

function Saisie({
  id,
  label,
  valeur,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={etiquette}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={valeur}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        style={saisieStyle}
      />
    </div>
  );
}

function Pastille({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        flex: "none",
        minHeight: 44,
        padding: "0 14px",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: "var(--ls-bbc-font-body)",
        whiteSpace: "nowrap",
        background: on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
        border: `1px solid ${on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`,
        color: on ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
      }}
    >
      {children}
    </button>
  );
}

function libelleIssue(c: Coupon): string {
  if (c.issue === "demarre") return "démarré ❤";
  if (c.issue === "rdv") return "RDV calé";
  if (c.issue === "pas_interesse") return "sans suite";
  if (c.issue === "sans_reponse") return "à relancer";
  return c.appeleLe ? "appelée" : "à appeler";
}

function gelule(c: Coupon): React.CSSProperties {
  const base: React.CSSProperties = {
    flex: "none",
    fontFamily: "var(--ls-bbc-font-mono)",
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
  if (c.issue === "demarre")
    return { ...base, background: "color-mix(in srgb, var(--ls-bbc-lime) 13%, transparent)", color: "var(--ls-bbc-lime-text)" };
  if (c.issue === "rdv")
    return { ...base, background: "color-mix(in srgb, var(--ls-bbc-teal) 13%, transparent)", color: "var(--ls-bbc-teal)" };
  if (c.issue === "pas_interesse") return { ...base, background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-hint)" };
  if (c.issue === "sans_reponse")
    return { ...base, background: "color-mix(in srgb, var(--ls-bbc-coral) 15%, transparent)", color: "var(--ls-bbc-coral)" };
  return { ...base, background: "color-mix(in srgb, var(--ls-bbc-amber) 14%, transparent)", color: "var(--ls-bbc-amber)" };
}

// ── Styles ──────────────────────────────────────────────────────────────────
const carte: React.CSSProperties = {
  background: "var(--ls-bbc-s1)",
  border: "1px solid var(--ls-bbc-line)",
  borderRadius: 20,
  padding: "17px 19px",
};
const oeilleton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".14em",
  color: "var(--ls-bbc-muted)",
  textTransform: "uppercase",
};
const point: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  background: "var(--ls-bbc-lime)",
  boxShadow: "0 0 8px var(--ls-bbc-lime)",
  flex: "none",
};
const chiffresEntete: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  color: "var(--ls-bbc-hint)",
  letterSpacing: 0,
  textTransform: "none",
  whiteSpace: "nowrap",
};
const phrase: React.CSSProperties = { fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 7, lineHeight: 1.45 };
const rangeeFiltres: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  margin: "13px -19px 4px",
  padding: "0 19px 4px",
};
const ligne: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  width: "100%",
  minHeight: 64,
  padding: "11px 0",
  borderTop: "1px solid var(--ls-bbc-line)",
  borderLeft: 0,
  borderRight: 0,
  borderBottom: 0,
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
  color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)",
};
const nomLigne: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const sousLigne: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  color: "var(--ls-bbc-muted)",
  marginTop: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const compte: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.1,
};
const unite: React.CSSProperties = { display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)" };
const chevron: React.CSSProperties = { flex: "none", fontSize: 18, color: "var(--ls-bbc-hint)" };
const vide: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--ls-bbc-hint)",
  padding: "14px 0 4px",
  borderTop: "1px solid var(--ls-bbc-line)",
  lineHeight: 1.5,
};
const rond: React.CSSProperties = {
  flex: "none",
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "var(--ls-bbc-s2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--ls-bbc-teal)",
};
const coeurs: React.CSSProperties = {
  flex: "none",
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--ls-bbc-lime-text)",
};
const retour: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--ls-bbc-muted)",
  cursor: "pointer",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 13,
  fontWeight: 700,
  minHeight: 44,
  padding: 0,
};
const numeroDetail: React.CSSProperties = {
  flex: "none",
  width: 48,
  height: 48,
  borderRadius: 14,
  background: "var(--ls-bbc-s2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 17,
  fontWeight: 700,
  color: "var(--ls-bbc-lime-text)",
};
const aideCentree: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--ls-bbc-hint)",
  textAlign: "center",
  lineHeight: 1.45,
};

function pastilleNumero(etat: ReturnType<typeof etatBoite>): React.CSSProperties {
  const alerte = etat === "a_relever";
  return {
    flex: "none",
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--ls-bbc-font-mono)",
    fontSize: 15,
    fontWeight: 700,
    background: alerte ? "color-mix(in srgb, var(--ls-bbc-amber) 13%, transparent)" : "var(--ls-bbc-s2)",
    color: alerte ? "var(--ls-bbc-amber)" : "var(--ls-bbc-muted)",
  };
}

function bandeau(ton: "coral" | "amber"): React.CSSProperties {
  const c = ton === "coral" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-amber)";
  return {
    display: "flex",
    alignItems: "center",
    gap: 11,
    flexWrap: "wrap",
    borderRadius: 16,
    padding: "12px 15px",
    background: `color-mix(in srgb, ${c} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${c} 32%, transparent)`,
  };
}

function boutonLime(actif: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 52,
    border: 0,
    borderRadius: 14,
    background: actif ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s3)",
    color: actif ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)",
    fontFamily: "var(--ls-bbc-font-body)",
    fontSize: 15.5,
    fontWeight: 800,
    cursor: actif ? "pointer" : "default",
  };
}
const boutonFantome: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 13,
  background: "var(--ls-bbc-s2)",
  border: "1px solid var(--ls-bbc-line2)",
  color: "var(--ls-bbc-muted)",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};

// ── Styles partagés avec les feuilles ───────────────────────────────────────
const voile: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(8, 20, 18, .74)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};
const panneau: React.CSSProperties = {
  width: "min(560px, 100%)",
  maxHeight: "94vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "var(--ls-bbc-s1)",
  border: "1px solid var(--ls-bbc-line2)",
  borderRadius: "24px 24px 0 0",
  color: "var(--ls-bbc-text)",
};
const enteteFeuille: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  flex: "none",
  padding: "18px 20px 12px",
  borderBottom: "1px solid var(--ls-bbc-line)",
};
const titreFeuille: React.CSSProperties = { fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, lineHeight: 1.12 };
const sousTitreFeuille: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  color: "var(--ls-bbc-hint)",
  letterSpacing: ".1em",
  textTransform: "uppercase",
  marginTop: 5,
};
const croix: React.CSSProperties = {
  flex: "none",
  width: 44,
  height: 44,
  minHeight: 44,
  borderRadius: "50%",
  background: "var(--ls-bbc-s3)",
  border: 0,
  color: "var(--ls-bbc-muted)",
  fontSize: 17,
  cursor: "pointer",
};
const corpsFeuille: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const piedFeuille: React.CSSProperties = {
  flex: "none",
  padding: "12px 18px calc(18px + env(safe-area-inset-bottom))",
  borderTop: "1px solid var(--ls-bbc-line)",
};
const grille2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 11 };
const etiquette: React.CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--ls-bbc-hint)",
};
const saisieStyle: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 12,
  padding: "0 14px",
  background: "var(--ls-bbc-s2)",
  border: "1px solid var(--ls-bbc-line)",
  color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 16,
};
const alerteBase: React.CSSProperties = {
  display: "flex",
  gap: 11,
  alignItems: "flex-start",
  borderRadius: 13,
  padding: "11px 13px",
  fontSize: 13,
  lineHeight: 1.5,
};
