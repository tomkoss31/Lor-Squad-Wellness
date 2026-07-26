// =============================================================================
// BbcClub — pointage du club, DONNÉES RÉELLES (chantier BBC).
// Chaque membre = un client du coach ; « +1 visite » insère club_visits.
// Alerte 7-9 = orange (bientôt bilan), 10+ = rouge (bilan des 10 à faire).
// Le scan QR caméra (port Shake Bar) viendra compléter le tap.
// =============================================================================

import { useState } from "react";
import { useBbcVisits, visitLevel, type VisitLevel } from "../useBbcVisits";
import { BbcScanner } from "../BbcScanner";
import { BbcBilan10 } from "../BbcBilan10";
import { BbcCardSheet } from "../BbcCardSheet";
import type { Club } from "../../../types/domain";

function levelColor(l: VisitLevel) {
  return l === "bilan" ? "var(--ls-bbc-coral)" : l === "warn" ? "var(--ls-bbc-amber)" : "var(--ls-bbc-teal)";
}
function levelBg(l: VisitLevel) {
  return l === "bilan" ? "rgba(251,113,133,.12)" : l === "warn" ? "rgba(233,162,59,.14)" : "rgba(45,212,191,.12)";
}
interface BbcClubProps {
  userId?: string;
  club?: Club | null;
}

export function BbcClub({ userId, club }: BbcClubProps) {
  const { members, loading, addVisit, assignCard, refetch } = useBbcVisits(userId);
  const [cardFor, setCardFor] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const [bilan, setBilan] = useState<{ id: string; name: string } | null>(null);
  const totalVisits = members.reduce((s, m) => s + m.visits, 0);
  // Bilan à faire = carte consommée (pas le cumul à vie).
  const bilans = members.filter((m) => m.card && m.card.used >= m.card.type);

  const stats: Array<{ label: string; value: string; tone: string }> = [
    { label: "membres", value: String(members.length), tone: "var(--ls-bbc-lime-text)" },
    { label: "visites cumulées", value: String(totalVisits), tone: "var(--ls-bbc-teal)" },
    { label: "bilans à faire", value: String(bilans.length), tone: bilans.length ? "var(--ls-bbc-coral)" : "var(--ls-bbc-text)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "18px 20px", borderTop: `2px solid ${s.tone}` }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 34, color: s.tone, lineHeight: 1, marginTop: 8 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setScan(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", minHeight: 52, border: 0, borderRadius: 14, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-lime-ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" /></svg>
        Scanner un membre (QR)
      </button>

      {/* bilans à faire (alerte) */}
      {bilans.length > 0 ? (
        <div style={{ background: "rgba(251,113,133,.10)", border: "1px solid rgba(251,113,133,.28)", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{bilans.map((m) => m.name).join(", ")} {bilans.length > 1 ? "ont" : "a"} atteint 10 visites — bilan des 10 à faire.</span>
          <button type="button" onClick={() => setBilan({ id: bilans[0].id, name: bilans[0].name })} style={{ flex: "none", border: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, padding: "8px 13px", borderRadius: 10, background: "var(--ls-bbc-coral)", color: "#fff" }}>faire le bilan →</button>
        </div>
      ) : null}

      {/* pointage */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />pointage du matin
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 16 }}>1 tap = +1 visite. (Le scan QR caméra du membre viendra compléter le tap.)</div>
        {loading ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0" }}>chargement…</div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "12px 0" }}>Aucun membre pour l'instant — tes clients apparaîtront ici pour le pointage.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {members.map((m) => {
              // Carte expirée = alerte au même titre qu'une carte finie.
              const lvl = m.card?.expired ? "bilan" : visitLevel(m.card?.used ?? 0, m.card?.type);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 14px", borderRadius: 14, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
                  <span style={{ width: 42, height: 42, borderRadius: 999, flex: "none", background: levelBg(lvl), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 15, fontWeight: 800, color: levelColor(lvl) }}>{m.card ? m.card.used : m.visits}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: levelColor(lvl) }}>
                      {m.card
                        ? m.card.expired
                          ? `carte ${m.card.type} EXPIRÉE · à renouveler`
                          : `carte ${m.card.type} · ${m.card.remaining} restante${m.card.remaining > 1 ? "s" : ""}`
                        : `${m.visits} visite${m.visits > 1 ? "s" : ""} au total · pas de carte`}
                    </div>
                  </div>
                  <button type="button" onClick={() => setCardFor(m.id)} title={m.card ? "Renouveler la carte" : "Attribuer une carte"} style={{ border: "1px solid var(--ls-bbc-line2)", background: "transparent", cursor: "pointer", fontSize: 11.5, fontWeight: 700, padding: "8px 11px", borderRadius: 10, color: m.card ? "var(--ls-bbc-muted)" : "var(--ls-bbc-lime-text)", flex: "none" }}>
                    {m.card ? "carte" : "+ carte"}
                  </button>
                  {lvl === "bilan" ? (
                    <button type="button" onClick={() => setBilan({ id: m.id, name: m.name })} style={{ border: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, padding: "8px 11px", borderRadius: 10, background: "var(--ls-bbc-coral)", color: "#fff", flex: "none" }}>bilan</button>
                  ) : null}
                  <button type="button" onClick={() => void addVisit(m.id)} style={{ border: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, padding: "8px 13px", borderRadius: 10, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", flex: "none" }}>+1</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {scan ? <BbcScanner onClose={() => setScan(false)} onScanned={() => void refetch()} /> : null}
      {cardFor ? (
        <BbcCardSheet
          memberName={members.find((m) => m.id === cardFor)?.name ?? ""}
          currentCard={members.find((m) => m.id === cardFor)?.card ?? null}
          cardsConfig={club?.settings?.cards ?? null}
          onClose={() => setCardFor(null)}
          onAssign={(type, priceEur, days) => assignCard(cardFor, type, priceEur, days)}
        />
      ) : null}
      {bilan && userId ? (
        <BbcBilan10
          clientId={bilan.id}
          clientName={bilan.name}
          coachUserId={userId}
          onClose={() => setBilan(null)}
          onDone={() => void refetch()}
        />
      ) : null}
    </div>
  );
}
