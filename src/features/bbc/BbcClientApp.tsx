// =============================================================================
// BbcClientApp — l'app MEMBRE BBC (PWA), port du design validé Thomas.
// Coquille (header + scroll + bottom nav + Noaly + QR plein écran) + onglet
// ACCUEIL entièrement câblé en réel (visites, QR du token, transformation Δ
// poids, prochain RDV). Évolution / Cœurs / Journal / Messages : portés dans
// les commits suivants (déjà dessinés). Identité --ls-bbc-*.
// 21/09/2026 : « Journal » (journal nutritionnel) remplace « Conseils » — le mot
// du coach et l'assiette y sont repris ; ?tab=conseils mène au journal.
// 21/09/2026, maquette v8 validée par Thomas : la carte « Mon journal » prend la
// place du gros bloc du poids sur l'accueil (le poids reste, en une ligne) ;
// Noaly passe au centre de la barre, rond, dans le rose du site ; la barre
// garde 4 onglets (les Cœurs s'ouvrent depuis leur carte de l'accueil).
// =============================================================================

import "../../styles/bbc-tokens.css";
import { useState } from "react";
import { QRCode } from "../../components/ui/QRCode";
import { MemberEvolution, type Measurement, type Metric } from "./member/MemberEvolution";
import { MemberReglages } from "./member/MemberReglages";
import { MemberCoeurs } from "./member/MemberCoeurs";
import { JournalMembre } from "../journal/JournalMembre";
import { JournalAccueil } from "../journal/JournalAccueil";
import { JournalIcone, TRACE_ONGLET_JOURNAL } from "../journal/JournalIcone";
import { MemberMessages } from "./member/MemberMessages";
import { BbcMemberEntry } from "./BbcMemberEntry";
import { MemberNoaly } from "./member/MemberNoaly";

type MemberTab = "accueil" | "evolution" | "coeurs" | "journal" | "messages";

interface BbcClientAppProps {
  clientName?: string;
  coachName?: string;
  programTitle?: string;
  token?: string;
  visitsCount?: number;
  /** Les jours où elle est passée, en ISO — posés sous sa courbe (19/08). */
  visitDates?: string[];
  weightDeltaKg?: number | null;
  currentWeight?: number | null;
  nextRdvDate?: string | null;
  nextRdvType?: string | null;
  metrics?: Metric[];
  measurements?: Measurement[];
  heartsCount?: number;
  clientId?: string;
  coachId?: string;
  coachAdvice?: string | null;
  /** Carte de membre active (null = pas de carte en cours). */
  card?: { type: number; used: number; remaining: number; expires_at: string | null; expired?: boolean } | null;
  /** L'écran d'entrée a-t-il déjà été vu ? (sinon on l'affiche une fois) */
  entrySeen?: boolean;
  /** Réglages du club servis par `client-app-data` (barème des cœurs, horaires,
   *  nom du club). Le membre n'a pas de session : c'est le seul canal. */
  clubSettings?: {
    hearts_bareme?: Record<string, string>;
    open_hours?: string;
    club_name?: string | null;
  } | null;
}


function initials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function fmtRdv(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) +
      " · " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export function BbcClientApp(props: BbcClientAppProps) {
  const { clientName, coachName, token, visitsCount = 0, visitDates = [], weightDeltaKg, currentWeight, nextRdvDate, nextRdvType, metrics = [], measurements = [], heartsCount = 0, clientId, coachId, coachAdvice, card, entrySeen, clubSettings } = props;
  // La notif « ton coach t'a répondu » ouvre l'app avec ?tab=messages. Sans
  // lire ce paramètre, le membre atterrissait sur l'Accueil et refermait,
  // persuadé que la notification était vide.
  const [tab, setTab] = useState<MemberTab>(() => {
    if (typeof window === "undefined") return "accueil";
    const t = new URLSearchParams(window.location.search).get("tab");
    // « conseils » = les vieux liens (push, messages) : l'onglet est devenu le journal.
    if (t === "conseils" || t === "journal") return "journal";
    return t === "messages" || t === "evolution" || t === "coeurs" ? (t as MemberTab) : "accueil";
  });
  // L'intro ne s'affiche que si le serveur dit explicitement « pas encore vue »
  // (undefined = données pas encore chargées → on n'affiche rien, pas de flash).
  const [entryDismissed, setEntryDismissed] = useState(false);
  const [revoirEntree, setRevoirEntree] = useState(false);
  const showEntry = revoirEntree || (!entryDismissed && entrySeen === false);
  // Les réglages, ouverts depuis l'avatar. Avant, l'avatar n'était pas
  // cliquable et la membre n'avait AUCUN écran de réglages — ni thème, ni
  // sortie, ni moyen d'activer ses notifications (audit du 18/08).
  const [reglages, setReglages] = useState(false);
  // ⚠️ Le thème client n'est persisté NULLE PART dans l'app (le classique fait
  // aussi un simple useState). On garde la même règle plutôt que d'inventer un
  // stockage qui divergerait des deux côtés.
  const [clair, setClair] = useState(false);
  const [qrFull, setQrFull] = useState(false);
  const [noaly, setNoaly] = useState(false);

  const first = (clientName ?? "").split(/\s+/)[0] || "toi";
  const coach = (coachName ?? "").split(/\s+/)[0] || "ton coach";
  const visits = Math.max(0, visitsCount);
  // La carte active pilote l'affichage. SANS carte, on n'invente pas de
  // dénominateur : on montre le cumul de visites, sans « / 10 » trompeur
  // (sinon un membre à 23 visites verrait « 23 / 10 »).
  const cardMax = card?.type ?? 0;
  const onCard = card ? card.used : visits;
  const shown = card ? Math.min(card.used, cardMax) : 0;
  const left = card ? card.remaining : 0;
  const isNew = visits === 0 && weightDeltaKg == null;
  const rdv = fmtRdv(nextRdvDate);

  // 4 onglets pour que Noaly tienne le centre (maquette v8) ; les Cœurs
  // s'ouvrent depuis leur carte de l'accueil (et ?tab=coeurs).
  const NAV: Array<{ k: MemberTab; label: string; d: string; badge?: boolean }> = [
    { k: "accueil", label: "Accueil", d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
    { k: "journal", label: "Journal", d: TRACE_ONGLET_JOURNAL },
    { k: "evolution", label: "Évolution", d: "M3 12h4l2-7 4 14 2-7h6" },
    // Pas de `badge` : il n'était jamais rendu, et un vrai compteur de non-lus
    // suppose un `read_at` côté membre qui n'existe pas encore. Mieux vaut rien
    // qu'une promesse morte.
    { k: "messages", label: "Messages", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  ];

  // Écran d'entrée : une seule fois, avant l'app.
  if (showEntry) {
    return (
      <BbcMemberEntry
        firstName={first}
        clubName={clubSettings?.club_name ?? undefined}
        openHours={clubSettings?.open_hours}
        token={token}
        onDone={() => { setEntryDismissed(true); setRevoirEntree(false); }}
      />
    );
  }

  return (
    <div className={clair ? "bbc-mode bbc-light" : "bbc-mode"} style={{ position: "relative", minHeight: "100vh", background: "var(--ls-bbc-bg)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", maxWidth: 460, margin: "0 auto", overflow: "hidden" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "calc(14px + env(safe-area-inset-top)) 18px 8px" }}>
        <button
          type="button"
          onClick={() => setReglages(true)}
          aria-label="Mes réglages"
          style={{ width: 46, height: 46, borderRadius: "50%", border: 0, padding: 0, background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-display)", fontSize: 16, color: "#04201b", flex: "none", cursor: "pointer" }}
        >{initials(clientName)}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>Salut {first} !</div>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)", marginTop: 2 }}>ton club du matin · {card ? `carte ${onCard}/${cardMax}` : `${visits} visite${visits > 1 ? "s" : ""}`}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ls-bbc-teal)", boxShadow: "0 0 6px var(--ls-bbc-teal)" }} />
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-muted)", whiteSpace: "nowrap" }}>coach {coach}</span>
        </div>
      </div>

      {/* content */}
      {/* ⚠️ 07/09 — Thomas : « le bouton de validation sur mobile est caché par
          le menu en bas de page » (constaté en saisissant ses mensurations).
          La marge du bas était `96px` FIXE alors que la barre de navigation,
          elle, mesure 86 px PLUS `env(safe-area-inset-bottom)`. Sur un
          téléphone à barre gestuelle (21 à 34 px), la barre grandit et la
          marge non : le bas de CHAQUE onglet passait sous le menu — ici le
          bouton « enregistrer mes mesures », qui est le dernier élément de la
          page tant qu'aucune session n'a encore été enregistrée.
          La coquille COACH avait déjà la bonne recette (`.bbc-main` en
          `calc(84px + env(safe-area-inset-bottom))` pour une barre de 69 px) :
          on l'aligne dessus, même respiration de ~14 px. */}
      <div style={{ padding: "8px 16px calc(100px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14 }}>
        {tab === "accueil" ? (
          <>
            {/* HERO carte membre + QR */}
            <div style={{ position: "relative", background: "var(--ls-bbc-s2)", border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 34%, transparent)", borderRadius: 22, padding: 18, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -50, right: -40, width: 200, height: 200, background: "radial-gradient(circle, color-mix(in srgb, var(--ls-bbc-lime) 16%, transparent), transparent 65%)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />carte de membre
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: card?.expired ? "var(--ls-bbc-coral)" : "var(--ls-bbc-lime-text)", border: `1px solid ${card?.expired ? "rgba(251,113,133,.5)" : "color-mix(in srgb, var(--ls-bbc-lime) 40%, transparent)"}`, padding: "4px 10px", borderRadius: 999 }}>
                    {!card ? "pas de carte active" : card.expired ? "carte expirée" : `carte · ${cardMax} visites`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 56, lineHeight: 0.8, color: "var(--ls-bbc-lime)" }}>{onCard}</span>
                  {card ? (
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 500, fontSize: 22, color: "var(--ls-bbc-muted)", paddingBottom: 6 }}>/ {cardMax}</span>
                  ) : (
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 500, fontSize: 15, color: "var(--ls-bbc-muted)", paddingBottom: 8 }}>visite{visits > 1 ? "s" : ""}</span>
                  )}
                  <span style={{ flex: 1, textAlign: "right", fontSize: 11, color: "var(--ls-bbc-muted)", paddingBottom: 8 }}>
                    {isNew ? "ta carte démarre" : !card ? "vois ton coach pour ta carte" : left > 0 ? `plus que ${left} visite${left > 1 ? "s" : ""}` : <>carte complète <IconeClub nom="fete" /></>}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
                  {Array.from({ length: cardMax }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < shown ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s1)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, color: "var(--ls-bbc-lime-text)", marginTop: 9 }}>
                  {isNew ? (
                    <><IconeClub nom="cadeau" />ta 1ʳᵉ visite est offerte</>
                  ) : !card ? (
                    <><IconeClub nom="ticket" />demande ta carte à ton coach pour continuer</>
                  ) : card.expired ? (
                    "ta carte a expiré · vois ton coach pour la renouveler"
                  ) : left > 0 ? (
                    <><IconeClub nom="cadeau" />{`plus que ${left} → ton bilan t'attend`}</>
                  ) : (
                    <><IconeClub nom="cadeau" />carte finie · ton bilan avec ton coach</>
                  )}
                </div>
                {token ? (
                  <button type="button" onClick={() => setQrFull(true)} style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer", display: "flex", gap: 14, alignItems: "center", marginTop: 14, background: "#FBF7F0", borderRadius: 16, padding: 14 }}>
                    <QRCode value={token} size={80} fgColor="0B0D11" bgColor="FBF7F0" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0B0D11" }}>montre ce code au coach</div>
                      <div style={{ fontSize: 12, color: "#5b6472", marginTop: 3 }}>il scanne, ta visite du jour est validée.</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, color: "var(--ls-bbc-teal)", marginTop: 7, textTransform: "uppercase" }}>agrandir</div>
                    </div>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Le journal du jour, là où elles regardent tous les matins (maquette v8) */}
            <JournalAccueil token={token} format="bbc" coachPrenom={coachName} onOuvrirJournal={() => setTab("journal")} />

            {/* Le poids, en une ligne : la victoire reste visible, le journal prend la place */}
            {isNew ? (
              <div style={{ borderRadius: 16, padding: "12px 14px", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "color-mix(in srgb, var(--ls-bbc-lime) 14%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--ls-bbc-lime-text)" }} aria-hidden="true"><IconeClub nom="courbe" taille={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>ta transformation démarre</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>ta 1ʳᵉ pesée au club = ton point de départ.</div>
                </div>
              </div>
            ) : weightDeltaKg != null ? (
              <button type="button" onClick={() => setTab("evolution")} style={{ width: "100%", minHeight: 62, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", textAlign: "left", borderRadius: 16, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-text)", cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)" }}>
                <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 30, lineHeight: 1, color: "var(--ls-bbc-lime)", whiteSpace: "nowrap" }}>
                  {weightDeltaKg > 0 ? "+" : ""}{weightDeltaKg.toFixed(1).replace(".", ",")}
                  <small style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", marginLeft: 3 }}>kg</small>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>depuis le départ</b>
                  {currentWeight ? <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 1 }}>{currentWeight.toFixed(1).replace(".", ",")} kg aujourd'hui</span> : null}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600, color: "var(--ls-bbc-lime-text)", whiteSpace: "nowrap" }}>
                  mon évolution
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </span>
              </button>
            ) : null}

            {/* RDV */}
            {rdv ? (
              <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderLeft: "3px solid var(--ls-bbc-teal)", borderRadius: 16, padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(45,212,191,.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--ls-bbc-teal)" }} aria-hidden="true"><IconeClub nom="agenda" taille={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", fontWeight: 600 }}>prochain rdv</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{rdv}</div>
                  {nextRdvType ? <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{nextRdvType} avec {coach}.</div> : null}
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ls-bbc-s2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--ls-bbc-muted)" }} aria-hidden="true"><IconeClub nom="agenda" taille={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>pas encore de rdv</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>demande à {coach} ton prochain créneau depuis la messagerie.</div>
                </div>
              </div>
            )}

            {/* cœurs / remise */}
            <div style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-bbc-lime) 12%, var(--ls-bbc-s1)), var(--ls-bbc-s1))", border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 30%, transparent)", borderRadius: 18, padding: 18 }}>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-lime-text)", fontWeight: 700, marginBottom: 4 }}>tes cœurs</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>fais découvrir ton club</div>
              {/* La promesse vient du club, pas du code : le coach peut la changer. */}
              <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5, margin: "8px 0 14px" }}>
                2 cœurs = <strong style={{ color: "var(--ls-bbc-lime-text)" }}>{clubSettings?.hearts_bareme?.["2"]?.trim() || "−25 % à vie sur ta nutrition"}</strong>
                {" · "}3 = {clubSettings?.hearts_bareme?.["3"]?.trim() || "10 visites offertes"}
                {" · "}5 = {clubSettings?.hearts_bareme?.["5"]?.trim() || "30 visites offertes"}.
              </div>
              <button type="button" onClick={() => setTab("coeurs")} style={{ width: "100%", minHeight: 46, borderRadius: 12, border: 0, cursor: "pointer", background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 14, fontWeight: 700 }}>recommander un proche</button>
            </div>

          </>
        ) : tab === "evolution" ? (
          <MemberEvolution token={token ?? ""} metrics={metrics} measurements={measurements} visitDates={visitDates} />
        ) : tab === "coeurs" ? (
          <>
            <button type="button" onClick={() => setTab("accueil")} style={{ alignSelf: "flex-start", minHeight: 44, display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: 0, padding: "0 4px", color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              Accueil
            </button>
            <MemberCoeurs heartsCount={heartsCount} clientName={clientName} clientId={clientId} coachId={coachId} bareme={clubSettings?.hearts_bareme} />
          </>
        ) : tab === "journal" ? (
          <JournalMembre token={token} format="bbc" coachPrenom={coachName} motDuBilan={coachAdvice} />
        ) : (
          <MemberMessages token={token ?? ""} coachName={coachName} />
        )}
      </div>

      {/* La barre : 2 onglets · Noaly dans sa bosse · 2 onglets (bbc-tokens.css, .bbc-mnav) */}
      <nav className="bbc-mnav" aria-label="Onglets">
        {NAV.slice(0, 2).map((n) => (
          <NavBtn key={n.k} n={n} active={tab === n.k} onClick={() => setTab(n.k)} />
        ))}
        <button type="button" className="bbc-mnav-noaly" onClick={() => setNoaly(true)} aria-label="Parler à Noaly">
          <span className="bbc-mnav-orbe"><JournalIcone nom="etincelle" taille={24} /></span>
          Noaly
        </button>
        {NAV.slice(2).map((n) => (
          <NavBtn key={n.k} n={n} active={tab === n.k} onClick={() => setTab(n.k)} />
        ))}
      </nav>

      {/* QR plein écran */}
      {qrFull && token ? (
        <div onClick={() => setQrFull(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "#FBF7F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 30, cursor: "pointer" }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, color: "#0B0D11" }}>{first} · BBC</div>
          <QRCode value={token} size={260} fgColor="0B0D11" bgColor="FBF7F0" />
          <div style={{ fontSize: 12, fontWeight: 600, color: "#5b6472" }}>luminosité au max · touche pour fermer</div>
        </div>
      ) : null}

      {/* Noaly — chat réel (edge `noaly`, contexte BBC chargé côté serveur) */}
      {noaly ? <MemberNoaly token={token} firstName={first} onClose={() => setNoaly(false)} /> : null}
      {reglages ? (
        <MemberReglages
          token={token ?? ""}
          clientName={clientName}
          coachName={coachName}
          clair={clair}
          onTheme={setClair}
          onRevoirEntree={() => { setReglages(false); setRevoirEntree(true); }}
          onFermer={() => setReglages(false)}
        />
      ) : null}

    </div>
  );
}

/** Les icônes de l'accueil (21/09 : les emojis 📅 🎁 📈 🎟️ 🎉 passent en SVG, comme la barre). */
const TRACES_CLUB = {
  agenda: "M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18",
  cadeau: "M4 8h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5",
  ticket: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2zM13 5v2M13 17v2M13 11v2",
  courbe: "M22 7l-8.5 8.5-5-5L2 17M16 7h6v6",
  fete: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z",
} as const;

function IconeClub({ nom, taille = 14 }: { nom: keyof typeof TRACES_CLUB; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", verticalAlign: "-2px" }}>
      <path d={TRACES_CLUB[nom]} />
    </svg>
  );
}

function NavBtn({ n, active, onClick }: { n: { label: string; d: string; badge?: boolean }; active: boolean; onClick: () => void }) {
  const color = active ? "var(--ls-bbc-lime)" : "var(--ls-bbc-muted)";
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, minWidth: 0, minHeight: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4, background: "none", border: 0, cursor: "pointer", padding: "6px 0 2px", color, boxShadow: active ? "inset 0 2px 0 var(--ls-bbc-lime)" : "inset 0 2px 0 transparent", position: "relative", fontFamily: "var(--ls-bbc-font-body)" }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.d} /></svg>
      <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{n.label}</span>
    </button>
  );
}
