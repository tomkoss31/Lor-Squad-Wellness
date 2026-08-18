// =============================================================================
// BbcClientApp — l'app MEMBRE BBC (PWA), port du design validé Thomas.
// Coquille (header + scroll + bottom nav + Noaly + QR plein écran) + onglet
// ACCUEIL entièrement câblé en réel (visites, QR du token, transformation Δ
// poids, prochain RDV). Évolution / Cœurs / Conseils / Messages : portés dans
// les commits suivants (déjà dessinés). Identité --ls-bbc-*.
// =============================================================================

import "../../styles/bbc-tokens.css";
import { useState } from "react";
import { QRCode } from "../../components/ui/QRCode";
import { MemberEvolution, type Measurement, type Metric } from "./member/MemberEvolution";
import { MemberCoeurs } from "./member/MemberCoeurs";
import { MemberConseils } from "./member/MemberConseils";
import { MemberMessages } from "./member/MemberMessages";
import { BbcMemberEntry } from "./BbcMemberEntry";
import { MemberNoaly } from "./member/MemberNoaly";

type MemberTab = "accueil" | "evolution" | "coeurs" | "conseils" | "messages";

interface BbcClientAppProps {
  clientName?: string;
  coachName?: string;
  programTitle?: string;
  token?: string;
  visitsCount?: number;
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
  const { clientName, coachName, token, visitsCount = 0, weightDeltaKg, currentWeight, nextRdvDate, nextRdvType, metrics = [], measurements = [], heartsCount = 0, clientId, coachId, coachAdvice, card, entrySeen, clubSettings } = props;
  // La notif « ton coach t'a répondu » ouvre l'app avec ?tab=messages. Sans
  // lire ce paramètre, le membre atterrissait sur l'Accueil et refermait,
  // persuadé que la notification était vide.
  const [tab, setTab] = useState<MemberTab>(() => {
    if (typeof window === "undefined") return "accueil";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "messages" || t === "evolution" || t === "coeurs" || t === "conseils" ? (t as MemberTab) : "accueil";
  });
  // L'intro ne s'affiche que si le serveur dit explicitement « pas encore vue »
  // (undefined = données pas encore chargées → on n'affiche rien, pas de flash).
  const [entryDismissed, setEntryDismissed] = useState(false);
  const showEntry = !entryDismissed && entrySeen === false;
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

  const NAV: Array<{ k: MemberTab; label: string; d: string; badge?: boolean }> = [
    { k: "accueil", label: "Accueil", d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
    { k: "evolution", label: "Évolution", d: "M3 12h4l2-7 4 14 2-7h6" },
    { k: "coeurs", label: "Cœurs", d: "M12 20.3S4.6 15.7 2.6 11.3C1.4 8.7 2.9 5.6 6 5.6c1.9 0 3.2 1.2 4 2.2.8-1 2.1-2.2 4-2.2 3.1 0 4.6 3.1 3.4 5.7C19.4 15.7 12 20.3 12 20.3z" },
    { k: "conseils", label: "Conseils", d: "M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.2 1 2V17h6v-1.5c0-.8.3-1.4 1-2A6 6 0 0 0 12 3zM9 21h6" },
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
        onDone={() => setEntryDismissed(true)}
      />
    );
  }

  return (
    <div className="bbc-mode" style={{ position: "relative", minHeight: "100vh", background: "var(--ls-bbc-bg)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", maxWidth: 460, margin: "0 auto", overflow: "hidden" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "calc(14px + env(safe-area-inset-top)) 18px 8px" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-display)", fontSize: 16, color: "#04201b", flex: "none" }}>{initials(clientName)}</div>
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
      <div style={{ padding: "8px 16px 96px", display: "flex", flexDirection: "column", gap: 14 }}>
        {tab === "accueil" ? (
          <>
            {/* HERO carte membre + QR */}
            <div style={{ position: "relative", background: "var(--ls-bbc-s2)", border: "1px solid rgba(197,248,42,.34)", borderRadius: 22, padding: 18, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -50, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(197,248,42,.16), transparent 65%)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />carte de membre
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: card?.expired ? "var(--ls-bbc-coral)" : "var(--ls-bbc-lime-text)", border: `1px solid ${card?.expired ? "rgba(251,113,133,.5)" : "rgba(197,248,42,.4)"}`, padding: "4px 10px", borderRadius: 999 }}>
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
                    {isNew ? "ta carte démarre" : !card ? "vois ton coach pour ta carte" : left > 0 ? `plus que ${left} visite${left > 1 ? "s" : ""}` : "carte complète 🎉"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
                  {Array.from({ length: cardMax }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < shown ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s1)" }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ls-bbc-lime-text)", marginTop: 9 }}>
                  {isNew
                    ? "ta 1ʳᵉ visite est offerte 🎁"
                    : !card
                      ? "demande ta carte à ton coach pour continuer 🎟️"
                      : card.expired
                        ? "ta carte a expiré · vois ton coach pour la renouveler"
                        : left > 0
                          ? `plus que ${left} → ton bilan t'attend 🎁`
                          : "carte finie · ton bilan avec ton coach 🎁"}
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

            {/* transformation */}
            {isNew ? (
              <div style={{ borderRadius: 18, padding: 18, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(197,248,42,.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 18 }} aria-hidden="true">📈</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>ta transformation démarre</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>ta 1ʳᵉ pesée au club = ton point de départ.</div>
                </div>
              </div>
            ) : weightDeltaKg != null ? (
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: 20, textAlign: "center", background: "var(--ls-bbc-s1)", border: "1px solid rgba(197,248,42,.28)" }}>
                <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 220, height: 220, background: "radial-gradient(circle, rgba(197,248,42,.14), transparent 66%)" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", fontWeight: 600, marginBottom: 4 }}>ta transformation</div>
                  <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 48, lineHeight: 1, color: "var(--ls-bbc-lime)" }}>{weightDeltaKg > 0 ? "+" : ""}{weightDeltaKg.toFixed(1).replace(".", ",")}</div>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 4 }}>kg depuis le départ{currentWeight ? ` · ${currentWeight.toFixed(1).replace(".", ",")} kg aujourd'hui` : ""}</div>
                  <button type="button" onClick={() => setTab("evolution")} style={{ marginTop: 14, background: "var(--ls-bbc-lime)", border: 0, borderRadius: 10, padding: "10px 16px", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>voir toute mon évolution →</button>
                </div>
              </div>
            ) : null}

            {/* RDV */}
            {rdv ? (
              <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderLeft: "3px solid var(--ls-bbc-teal)", borderRadius: 16, padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(45,212,191,.14)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 18 }} aria-hidden="true">📅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", fontWeight: 600 }}>prochain rdv</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{rdv}</div>
                  {nextRdvType ? <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{nextRdvType} avec {coach}.</div> : null}
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: 15, display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ls-bbc-s2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 18 }} aria-hidden="true">📅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>pas encore de rdv</div>
                  <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>demande à {coach} ton prochain créneau depuis la messagerie.</div>
                </div>
              </div>
            )}

            {/* cœurs / remise */}
            <div style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-bbc-lime) 12%, var(--ls-bbc-s1)), var(--ls-bbc-s1))", border: "1px solid rgba(197,248,42,.3)", borderRadius: 18, padding: 18 }}>
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

            {/* tuiles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => setTab("evolution")} style={{ textAlign: "center", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "16px 12px", cursor: "pointer", color: "var(--ls-bbc-text)" }}>
                <div style={{ fontSize: 22 }} aria-hidden="true">📐</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>mes mensurations</div>
                <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 2 }}>suis ton évolution</div>
              </button>
              <button type="button" onClick={() => setTab("conseils")} style={{ textAlign: "center", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "16px 12px", cursor: "pointer", color: "var(--ls-bbc-text)" }}>
                <div style={{ fontSize: 22 }} aria-hidden="true">💡</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>mes conseils</div>
                <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 2 }}>assiette & routine</div>
              </button>
            </div>
          </>
        ) : tab === "evolution" ? (
          <MemberEvolution token={token ?? ""} metrics={metrics} measurements={measurements} />
        ) : tab === "coeurs" ? (
          <MemberCoeurs heartsCount={heartsCount} clientName={clientName} clientId={clientId} coachId={coachId} bareme={clubSettings?.hearts_bareme} />
        ) : tab === "conseils" ? (
          <MemberConseils coachAdvice={coachAdvice} coachName={coachName} />
        ) : (
          <MemberMessages token={token ?? ""} coachName={coachName} />
        )}
      </div>

      {/* bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 460, margin: "0 auto", display: "flex", alignItems: "flex-end", padding: "8px 4px calc(20px + env(safe-area-inset-bottom))", background: "color-mix(in srgb, var(--ls-bbc-bg) 82%, transparent)", backdropFilter: "blur(14px)", borderTop: "1px solid var(--ls-bbc-line)", zIndex: 20 }}>
        {NAV.slice(0, 3).map((n) => (
          <NavBtn key={n.k} n={n} active={tab === n.k} onClick={() => setTab(n.k)} />
        ))}
        <button type="button" onClick={() => setNoaly(true)} style={{ flex: "none", width: 62, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: 0, cursor: "pointer", padding: "6px 0 4px" }}>
          <span style={{ width: 50, height: 50, marginTop: -20, borderRadius: 17, background: "linear-gradient(140deg, var(--ls-bbc-teal), var(--ls-bbc-lime))", border: "3px solid var(--ls-bbc-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span aria-hidden="true" style={{ fontSize: 22 }}>✦</span>
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: "var(--ls-bbc-teal)" }}>Noaly</span>
        </button>
        {NAV.slice(3).map((n) => (
          <NavBtn key={n.k} n={n} active={tab === n.k} onClick={() => setTab(n.k)} />
        ))}
      </div>

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
    </div>
  );
}

function NavBtn({ n, active, onClick }: { n: { label: string; d: string; badge?: boolean }; active: boolean; onClick: () => void }) {
  const color = active ? "var(--ls-bbc-lime)" : "var(--ls-bbc-muted)";
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: 0, cursor: "pointer", padding: "6px 0 4px", color, boxShadow: active ? "inset 0 2px 0 var(--ls-bbc-lime)" : "inset 0 2px 0 transparent", position: "relative" }}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.d} /></svg>
      <span style={{ fontSize: 9, fontWeight: 600 }}>{n.label}</span>
    </button>
  );
}
