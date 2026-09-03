// =============================================================================
// BbcCardSheet — attribuer / renouveler une carte de membre (chantier BBC).
// 10 visites (30 jours) ou 30 visites (90 jours). Le prix est SAISI, jamais en
// dur (il varie par club et n'est pas figé). Attribuer ferme la carte en cours.
// =============================================================================

import { useState } from "react";

interface BbcCardSheetProps {
  memberName: string;
  currentCard: { type: number; used: number; remaining: number } | null;
  /** Prix + durée par type, depuis les réglages du club (jamais en dur). */
  cardsConfig?: Record<string, { price: number | null; days: number }> | null;
  /**
   * Le jour d'ouverture du club (`clubs.settings.opening_date`, AAAA-MM-JJ).
   * Tant qu'il est devant nous, c'est LUI la date de début proposée : une carte
   * vendue en pré-lancement ne doit pas se consommer avant le premier
   * petit-déjeuner (Thomas, 18/08).
   */
  ouvertureIso?: string | null;
  onClose: () => void;
  onAssign: (
    type: 10 | 30,
    priceEur: number | null,
    days: number | null,
    debutIso: string | null,
  ) => Promise<boolean>;
}

/** AAAA-MM-JJ du jour, en heure locale (pas en UTC : `toISOString` décale). */
function aujourdhuiIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** « 7 septembre » — pour dire au coach ce qu'il est en train de poser. */
function jourLisible(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function BbcCardSheet({ memberName, currentCard, cardsConfig, ouvertureIso, onClose, onAssign }: BbcCardSheetProps) {
  const [type, setType] = useState<10 | 30>(10);
  // Par défaut : le jour d'ouverture s'il est encore devant nous, sinon
  // aujourd'hui. Le coach peut corriger — on propose, on n'impose pas.
  const aujourdhui = aujourdhuiIso();
  const [debut, setDebut] = useState(() =>
    ouvertureIso && ouvertureIso > aujourdhui ? ouvertureIso : aujourdhui,
  );
  const [price, setPrice] = useState(() => {
    const p = cardsConfig?.["10"]?.price;
    return p != null ? String(p) : "";
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setErr("");
    const parsed = price.trim() ? Number(price.replace(",", ".")) : null;
    // La durée vient des réglages du club : c'est elle qui est annoncée à
    // l'écran (« valable X jours »), elle doit donc être celle qui est écrite.
    const jours = cardsConfig?.[String(type)]?.days ?? null;
    // 7 h du matin, l'heure d'ouverture : minuit pile tombe sur la frontière de
    // fuseau et se relit « la veille » en base (règle timestamptz du projet).
    const debutIso = debut ? new Date(`${debut}T07:00:00`).toISOString() : null;
    const ok = await onAssign(
      type,
      Number.isFinite(parsed as number) ? (parsed as number) : null,
      jours,
      debutIso,
    );
    setBusy(false);
    if (ok) onClose();
    else setErr("Impossible d'enregistrer la carte — réessaie.");
  }

  // Durées issues des réglages du club, avec repli sur les défauts métier.
  const days10 = cardsConfig?.["10"]?.days ?? 30;
  const days30 = cardsConfig?.["30"]?.days ?? 90;
  const options: Array<{ t: 10 | 30; label: string; days: string }> = [
    { t: 10, label: "10 visites", days: `valable ${days10} jours` },
    { t: 30, label: "30 visites", days: `valable ${days30} jours` },
  ];

  /** Changer de type recharge le prix configuré pour ce type. */
  function pickType(t: 10 | 30) {
    setType(t);
    const p = cardsConfig?.[String(t)]?.price;
    setPrice(p != null ? String(p) : "");
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      {/* ⚠️ 03/09 — Thomas, sur son téléphone : « juste impossible le scroll et
          cliquer sur validé ». Cette feuille n'avait NI hauteur maximale NI
          défilement : sur un écran de téléphone elle dépassait le bas, et le
          bouton de validation devenait inatteignable — la feuille s'ouvrait
          pour rien. Les autres feuilles de l'app (QualifierRdvSheet…) portent
          `maxHeight: 88vh` + `overflowY: auto` depuis le début ; celle-ci était
          la seule à ne pas l'avoir. */}
      <div onClick={(e) => e.stopPropagation()} className="bbc-mode" style={{ width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", overscrollBehavior: "contain", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20 }}>{currentCard ? "Renouveler la carte" : "Attribuer une carte"}</div>
            <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{memberName}</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15, flex: "none" }}>✕</button>
        </div>

        {currentCard ? (
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 12, padding: "10px 13px", margin: "10px 0 14px", lineHeight: 1.5 }}>
            Carte en cours : <b style={{ color: "var(--ls-bbc-text)" }}>{currentCard.type} visites</b> · {currentCard.used} utilisées, {currentCard.remaining} restantes.
            <br />En attribuer une nouvelle clôturera celle-ci.
          </div>
        ) : (
          <div style={{ height: 12 }} />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {options.map((o) => {
            const on = type === o.t;
            return (
              <button key={o.t} type="button" onClick={() => pickType(o.t)} style={{ padding: "14px 12px", borderRadius: 14, cursor: "pointer", textAlign: "left", background: on ? "rgba(197,248,42,.10)" : "var(--ls-bbc-s2)", border: `1px solid ${on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`, color: "var(--ls-bbc-text)" }}>
                <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 20, color: on ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-text)" }}>{o.t}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{o.label}</div>
                <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 1 }}>{o.days}</div>
              </button>
            );
          })}
        </div>

        <label htmlFor="bbc-carte-debut" style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)", marginBottom: 6 }}>
          Premier jour de validité
        </label>
        <input
          id="bbc-carte-debut"
          type="date"
          value={debut}
          min={aujourdhui < debut ? undefined : aujourdhui}
          onChange={(e) => setDebut(e.target.value)}
          style={{ width: "100%", height: 48, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none", marginBottom: 6 }}
        />
        <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginBottom: 12, lineHeight: 1.5 }}>
          {debut && debut > aujourdhui
            ? `Les ${cardsConfig?.[String(type)]?.days ?? (type === 10 ? 30 : 90)} jours partent du ${jourLisible(debut)} — pas d'aujourd'hui.`
            : `Les ${cardsConfig?.[String(type)]?.days ?? (type === 10 ? 30 : 90)} jours partent d'aujourd'hui.`}
        </div>

        <label style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)", marginBottom: 6 }}>Prix payé (optionnel, en €)</label>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          placeholder="ex. 80"
          style={{ width: "100%", height: 48, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none", marginBottom: 12 }}
        />

        {err ? <div style={{ fontSize: 11.5, color: "var(--ls-bbc-coral)", marginBottom: 10 }}>{err}</div> : null}

        <button type="button" onClick={() => void confirm()} disabled={busy} style={{ width: "100%", height: 50, border: 0, borderRadius: 13, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "enregistrement…" : currentCard ? "Renouveler" : "Attribuer la carte"}
        </button>
      </div>
    </div>
  );
}
