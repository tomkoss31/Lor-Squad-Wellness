// =============================================================================
// BbcClub100 — le tableau de bord du modèle + le calculateur de rentabilité.
// Deux zones nettement séparées : les REPÈRES (sourcés Notion) et TON CALCUL
// (tes chiffres → résultats calculés, formules affichées). Rien d'inventé.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useBbcMembers } from "../useBbcMembers";
import { useClubSettings } from "../useClubSettings";
import { coutVisiteDepuisCarte, dosesParDefaut } from "../data/bbcClubPrices";
import { CLUB100, ECHELLE_ORG, DEFAULT_RENTA, calculerRenta, type RentaInput } from "../data/bbcClub100";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const eur2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const num = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

interface BbcClub100Props {
  userId?: string;
  clubId?: string | null;
}

export function BbcClub100({ userId, clubId }: BbcClub100Props) {
  const { members } = useBbcMembers(userId);
  const { settings } = useClubSettings(clubId);
  const [input, setInput] = useState<RentaInput>(DEFAULT_RENTA);
  // Le coach a modifié un champ à la main : on cesse de le réécrire.
  const [touche, setTouche] = useState(false);
  const r = useMemo(() => calculerRenta(input), [input]);

  // Les prix des cartes et le coût d'une visite viennent de SES réglages et de
  // SA carte. Sans ça, l'écran affichait 80 €/185 € et un coût de portion à
  // zéro — un calcul de rentabilité faux pour tout club qui ne pratique pas
  // exactement ces prix, et une ressaisie de ce que l'app savait déjà.
  useEffect(() => {
    if (touche) return;
    const doses = { ...dosesParDefaut(), ...Object.fromEntries(Object.entries(settings.carte ?? {}).map(([k, v]) => [k, v?.doses ?? null])) };
    const cout = coutVisiteDepuisCarte(doses, settings.palier_remise ?? 50);
    setInput((p) => ({
      ...p,
      prixCarte10: settings.cards?.["10"]?.price ?? p.prixCarte10,
      prixCarte30: settings.cards?.["30"]?.price ?? p.prixCarte30,
      coutPortion: cout != null ? Math.round(cout * 100) / 100 : p.coutPortion,
    }));
  }, [settings, touche]);

  const set = (patch: Partial<RentaInput>) => {
    setTouche(true);
    setInput((p) => ({ ...p, ...patch }));
  };
  const membresReels = members.length;
  const pctMembres = Math.min(Math.round((membresReels / CLUB100.membres) * 100), 100);
  const chargesRenseignees = input.coutPortion > 0 || input.chargesFixes > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
      {/* ── LE MODÈLE (sourcé) ─────────────────────────────────────────── */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
        <Eye>le modèle club 100</Eye>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          L'unité de mesure du système. Un club à maturité, c'est ça — pas plus, pas moins.
        </div>

        {/* progression membres : RÉELLE */}
        <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 40, lineHeight: 1, color: "var(--ls-bbc-lime-text)" }}>{membresReels}</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 20, color: "var(--ls-bbc-muted)" }}>/ {CLUB100.membres}</span>
            <span style={{ flex: 1, textAlign: "right", fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>membres BBC dans ton club</span>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: "var(--ls-bbc-bg)", overflow: "hidden", marginTop: 12 }}>
            <div style={{ width: `${pctMembres}%`, height: "100%", background: "var(--ls-bbc-lime)", transition: "width .3s" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <Repere v={String(CLUB100.superviseursActifs)} l="superviseurs actifs" s="junior partners" />
          <Repere v={String(CLUB100.coachsStagiaires)} l="coachs stagiaires" s="en formation" />
          <Repere v={`~${CLUB100.superviseursTotal}`} l="superviseurs au total" s="dans l'organisation" />
          <Repere v={num(CLUB100.pvOrganisation)} l="PV d'organisation" s="club à maturité" />
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", marginTop: 12 }}>
          source · Formation 00 « La machine à royalties » (Clare &amp; Dan)
        </div>
      </div>

      {/* ── LE CALCUL (tes chiffres) ───────────────────────────────────── */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid rgba(197,248,42,.28)", borderRadius: 20, padding: "22px 24px" }}>
        <Eye>ton calcul de rentabilité</Eye>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          Les prix des cartes ({eur(input.prixCarte10)} / {eur(input.prixCarte30)}) et le coût d'une visite viennent de tes
          réglages et de ta carte — modifiables ici sans rien casser. Tes{" "}
          <b style={{ color: "var(--ls-bbc-text)" }}>charges fixes</b> ne sont connus que de toi : renseigne-les pour obtenir un résultat réel.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
          <Field label="Membres actifs" value={input.membres} onChange={(v) => set({ membres: v })} />
          <Field label="Viennent chaque jour (%)" value={Math.round(input.frequentation * 100)} onChange={(v) => set({ frequentation: v / 100 })} suffix="%" />
          <Field label="Jours d'ouverture / semaine" value={input.joursParSemaine} onChange={(v) => set({ joursParSemaine: v })} />
          <Field label="Carte 10 visites (€)" value={input.prixCarte10} onChange={(v) => set({ prixCarte10: v })} />
          <Field label="Carte 30 visites (€)" value={input.prixCarte30} onChange={(v) => set({ prixCarte30: v })} />
          <Field label="Membres en carte 30 (%)" value={Math.round(input.partCarte30 * 100)} onChange={(v) => set({ partCarte30: v / 100 })} suffix="%" />
          <Field label="Coût d'une portion (€)" value={input.coutPortion} onChange={(v) => set({ coutPortion: v })} highlight={input.coutPortion === 0} step="0.01" />
          <Field label="Loyer + charges / mois (€)" value={input.chargesFixes} onChange={(v) => set({ chargesFixes: v })} highlight={input.chargesFixes === 0} />
        </div>

        {/* résultats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Out v={eur2(r.prixVisite10)} l="prix / visite (carte 10)" f={`${eur(input.prixCarte10)} ÷ 10`} />
          <Out v={eur2(r.prixVisite30)} l="prix / visite (carte 30)" f={`${eur(input.prixCarte30)} ÷ 30`} />
          <Out v={num(r.visitesParJour)} l="visites / jour" f="membres × fréquentation" />
          <Out v={num(r.visitesParMois)} l="visites / mois" f="× jours × 52/12" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
          <Out v={eur(r.caMensuel)} l="chiffre d'affaires / mois" f="visites × prix moyen" tone="lime" />
          <Out v={chargesRenseignees ? eur(r.coutProduits) : "—"} l="coût produits / mois" f="visites × coût portion" />
          <Out v={chargesRenseignees ? eur(r.margeBrute) : "—"} l="marge brute / mois" f="CA − produits" />
          <Out
            v={chargesRenseignees ? eur(r.resultatMensuel) : "—"}
            l="résultat / mois"
            f="marge − charges fixes"
            tone={chargesRenseignees ? (r.resultatMensuel >= 0 ? "teal" : "coral") : undefined}
          />
        </div>

        {/* point mort */}
        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 14, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", marginBottom: 6 }}>
            ton point mort
          </div>
          {!chargesRenseignees ? (
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", lineHeight: 1.5 }}>
              Renseigne le coût d'une portion et tes charges fixes — je te dirai combien de visites et de membres il te faut pour être à l'équilibre.
            </div>
          ) : r.seuilVisites === null ? (
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-coral)", lineHeight: 1.5 }}>
              Avec ce coût de portion, chaque visite perd de l'argent ({eur2(r.margeParVisite)} de marge) : le point mort n'existe pas. Il faut revoir le prix ou le coût.
            </div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Chaque visite te laisse <b style={{ color: "var(--ls-bbc-lime-text)" }}>{eur2(r.margeParVisite)}</b> de marge.
              <br />
              Il te faut <b style={{ color: "var(--ls-bbc-lime-text)" }}>{num(r.seuilVisites)} visites / mois</b>
              {r.seuilMembres !== null ? (
                <> — soit environ <b style={{ color: "var(--ls-bbc-lime-text)" }}>{num(r.seuilMembres)} membres</b> à ce rythme de fréquentation</>
              ) : null}{" "}
              pour couvrir tes charges.
            </div>
          )}
        </div>
      </div>

      {/* ── ÉCHELLE ORGANISATION (sourcée) ─────────────────────────────── */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
        <Eye>l'échelle : combien de clubs pour ton objectif</Eye>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
          {ECHELLE_ORG.map((e) => (
            <div key={e.clubs} style={{ background: e.clubs === 3 ? "rgba(197,248,42,.08)" : "var(--ls-bbc-s2)", border: `1px solid ${e.clubs === 3 ? "rgba(197,248,42,.3)" : "var(--ls-bbc-line)"}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, color: e.clubs === 3 ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-text)" }}>
                {e.clubs} club{e.clubs > 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 4 }}>~{e.superviseurs} superviseurs</div>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 14, fontWeight: 700, marginTop: 6 }}>~{num(e.pv)} PV</div>
              {e.clubs === 3 ? <div style={{ fontSize: 10.5, color: "var(--ls-bbc-lime-text)", marginTop: 4 }}>🎯 ta cible</div> : null}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", marginTop: 12 }}>
          source · Formation 00 — échelle organisation
        </div>
      </div>
    </div>
  );
}

function Eye({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)", flex: "none" }} />
      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

function Repere({ v, l, s }: { v: string; l: string; s: string }) {
  return (
    <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 24, color: "var(--ls-bbc-text)", lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{l}</div>
      <div style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)", marginTop: 2 }}>{s}</div>
    </div>
  );
}

function Out({ v, l, f, tone }: { v: string; l: string; f: string; tone?: "lime" | "teal" | "coral" }) {
  const color = tone === "lime" ? "var(--ls-bbc-lime-text)" : tone === "teal" ? "var(--ls-bbc-teal)" : tone === "coral" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-text)";
  return (
    <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "13px 15px" }}>
      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 19, color, lineHeight: 1.1 }}>{v}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 5 }}>{l}</div>
      <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, color: "var(--ls-bbc-hint)", marginTop: 3 }}>{f}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  highlight,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  highlight?: boolean;
  step?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 11.5, color: highlight ? "var(--ls-bbc-coral)" : "var(--ls-bbc-muted)", marginBottom: 5 }}>
        {label}
        {highlight ? " · à renseigner" : ""}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          inputMode="decimal"
          step={step ?? "1"}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{
            flex: 1, minWidth: 0, height: 44, borderRadius: 12,
            border: `1px solid ${highlight ? "rgba(251,113,133,.4)" : "var(--ls-bbc-line2)"}`,
            background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)",
            fontFamily: "var(--ls-bbc-font-mono)", fontSize: 16, padding: "0 12px", outline: "none",
          }}
        />
        {suffix ? <span style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>{suffix}</span> : null}
      </span>
    </label>
  );
}
