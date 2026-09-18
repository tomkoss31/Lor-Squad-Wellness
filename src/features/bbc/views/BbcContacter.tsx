// =============================================================================
// « Contacter » — la liste du jour, remplie par l'app, 20 par jour.
// La feuille d'une personne : appeler, ✨ écrire (le message prêt), et
// « Et alors ? » — une réponse, une seule, celle du CRM pour un lead.
// =============================================================================

import { useState } from "react";
import { CRM_SOURCE_META, type CrmLead } from "../../../hooks/useCrmLeads";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { REPONSES_APPEL, type Reponse } from "../../crm/qualification";
import { messagePour, type AContacter } from "../contacter";
import { BoutonDoux, BoutonFort, Carte, Choix, Feuille, Ligne, Rond, Vide } from "../ui";

type Filtre = "jour" | "leads" | "relances" | "faits";

interface Props {
  contacts: AContacter[];
  faits: Set<string>;
  count: number;
  target: number;
  onContact: (c: AContacter) => void;
}

export function BbcContacter({ contacts, faits, count, target, onContact }: Props) {
  const [filtre, setFiltre] = useState<Filtre>("jour");
  const aFaire = contacts.filter((c) => !faits.has(c.key));
  const liste =
    filtre === "jour" ? aFaire
    : filtre === "leads" ? aFaire.filter((c) => c.lead && c.raison === "lead_nouveau")
    : filtre === "relances" ? aFaire.filter((c) => c.raison === "relance_due")
    : contacts.filter((c) => faits.has(c.key));
  const pct = Math.min(100, Math.round((count / target) * 100));
  const onglets: [Filtre, string][] = [
    ["jour", `Aujourd'hui · ${aFaire.length}`],
    ["leads", `Leads · ${aFaire.filter((c) => c.raison === "lead_nouveau").length}`],
    ["relances", `À relancer · ${aFaire.filter((c) => c.raison === "relance_due").length}`],
    ["faits", `Faits · ${count}`],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
      <div role="tablist" aria-label="Filtres" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        {onglets.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filtre === k}
            onClick={() => setFiltre(k)}
            className="bbc-pression"
            style={{
              flex: "none", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 999, cursor: "pointer",
              border: "1px solid var(--ls-bbc-line2)", background: filtre === k ? "var(--ls-bbc-text)" : "var(--ls-bbc-s1)", color: filtre === k ? "var(--ls-bbc-bg)" : "var(--ls-bbc-muted)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <Carte eye={filtre === "faits" ? "Faits aujourd'hui" : "Contacter aujourd'hui"} tone="trou" right={<span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, color: count >= target ? "var(--ls-bbc-sage)" : "var(--ls-bbc-orange-text)", letterSpacing: ".02em" }}>{count} / {target}</span>}>
        {liste.length === 0 ? (
          <Vide>{filtre === "faits" ? "Rien de noté aujourd'hui pour l'instant." : count >= target ? "20 contacts, objectif du jour atteint 👏" : "Rien dans cette liste. Les leads arrivent par la pub, le site et les recommandations ; les relances à la date que tu as dite."}</Vide>
        ) : (
          liste.map((c) => (
            <Ligne
              key={c.key}
              fait={faits.has(c.key)}
              avant={<Rond tone={c.geste === "appeler" ? "lead" : "msg"}>{c.geste === "appeler" ? "📞" : "💬"}</Rond>}
              titre={c.nom}
              sous={faits.has(c.key) ? "✓ fait aujourd'hui" : c.texte}
              sousTone={!faits.has(c.key) && c.raison === "lead_nouveau" && (c.attenteMin ?? 0) >= 120 ? "alerte" : undefined}
              action={faits.has(c.key) ? "Revoir" : c.geste === "appeler" ? "Appeler" : "✨ Écrire"}
              actionTone={faits.has(c.key) ? "neutre" : c.geste === "appeler" ? "fort" : "neutre"}
              onClick={() => onContact(c)}
            />
          ))
        )}
        <div style={{ height: 6, borderRadius: 999, background: "var(--ls-bbc-s3)", overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: count >= target ? "var(--ls-bbc-sage)" : "var(--ls-bbc-orange)", transition: "width .5s cubic-bezier(.32,.72,0,1)" }} />
        </div>
      </Carte>

      <Carte eye="Pourquoi ces personnes" tone="plein" right="l'ordre">
        <Vide>
          1 · les leads qui attendent (pub, site, recommandations) · 2 · les relances à la date que tu as dite · 3 · la 9e visite, les cartes finies, les absentes depuis 6 jours · 4 · les régulières depuis 3 semaines et les cœurs à demander.
          Quand tu réponds « et alors ? », la ligne passe dans « Faits » et le compteur monte. Une personne appelée par une autre coach du club sort aussi de ta liste.
        </Vide>
      </Carte>
    </div>
  );
}

/** La feuille d'une personne à contacter. */
export function BbcContactSheet({
  c,
  coachPrenom,
  coachUserId,
  fait,
  onClose,
  onReponseLead,
  onFaitMembre,
  onOuvrirLead,
}: {
  c: AContacter;
  coachPrenom: string;
  coachUserId?: string;
  fait: boolean;
  onClose: () => void;
  onReponseLead: (c: AContacter, r: Reponse) => Promise<string | null>;
  onFaitMembre: (c: AContacter, libelle: string) => Promise<void>;
  onOuvrirLead: (lead: CrmLead) => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  // Le message prêt (gabarit), que Noaly peut réécrire avec le contexte de la personne.
  const [message, setMessage] = useState(() => messagePour(c, coachPrenom));
  const [ia, setIa] = useState(false);
  const tel = c.telephone?.replace(/\s+/g, "") ?? null;

  // ✨ Noaly — le même mode `crm_message` que la fiche lead du CRM (useLeadQuickActions).
  // Pour une membre, on lui donne le contexte de la règle (« 9e visite », « absente… »).
  async function proposerNoaly() {
    setIa(true); setErreur(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const lead = c.lead;
      const { data, error } = await sb.functions.invoke("noaly", {
        body: {
          mode: lead && lead.status === "new" ? "first_contact" : "relance",
          coachFirstName: coachPrenom,
          coachUserId,
          bilanDone: lead?.source === "bilan-online" || !!lead?.resultToken,
          lead: lead
            ? { firstName: lead.firstName, source: lead.source, sourceLabel: CRM_SOURCE_META[lead.source]?.label, viaName: lead.viaName, city: lead.city, status: lead.status, extra: lead.extra, notes: lead.notes }
            : { firstName: c.nom, source: "club", sourceLabel: "membre du Breakfast Club", status: "membre", extra: c.texte },
        },
      });
      const payload = data as { message?: string; error?: string } | null;
      if (error || !payload?.message) throw new Error(payload?.message || "Noaly est indisponible — le message prêt reste là.");
      setMessage(payload.message);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur IA.");
    } finally {
      setIa(false);
    }
  }
  const wa = tel ? `https://wa.me/${tel.replace(/^0/, "33").replace(/^\+/, "")}?text=${encodeURIComponent(message)}` : null;

  return (
    <Feuille titre={c.nom} sous={c.texte} onClose={onClose}>
      {erreur ? <div style={{ fontSize: 12.5, color: "var(--ls-bbc-coral)" }}>{erreur}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Info label={tel ? "Téléphone" : "Contact"}>{tel ?? c.lead?.email ?? "—"}</Info>
        <Info label={c.lead ? "D'où" : "Membre"}>{c.lead ? (c.lead.viaName ? `Recommandé·e par ${c.lead.viaName}` : c.lead.source) : "du club"}</Info>
      </div>

      {c.geste === "ecrire" || !tel ? (
        <>
          <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: 12, padding: "10px 12px", fontSize: 13.5, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{message}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {wa ? <BoutonFort href={wa} large>Envoyer sur WhatsApp</BoutonFort> : null}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <BoutonDoux large onClick={() => { void navigator.clipboard?.writeText(message); setCopie(true); }}>{copie ? "Copié ✓" : "Copier"}</BoutonDoux>
              <BoutonDoux large onClick={() => void proposerNoaly()}>{ia ? "Noaly écrit…" : "✨ Noaly propose"}</BoutonDoux>
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <BoutonFort href={`tel:${tel}`} large>📞 Appeler {c.telephone}</BoutonFort>
          {wa ? <BoutonDoux large onClick={() => window.open(wa, "_blank", "noopener")}>✨ Écrire plutôt (WhatsApp)</BoutonDoux> : null}
        </div>
      )}

      {c.lead ? (
        <Choix tone="passerelle" small="→ CRM : historique, notes" onClick={() => onOuvrirLead(c.lead!)}>Sa fiche de lead</Choix>
      ) : null}

      {!fait ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>Et alors ?</span>
            <span style={{ fontSize: 12, color: "var(--ls-bbc-hint)" }}>une réponse, une seule</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {c.lead
              ? REPONSES_APPEL.map((r) => (
                  <Choix key={r.cle} small={r.quand} onClick={async () => { const e = await onReponseLead(c, r); if (e) setErreur(e); else onClose(); }}>{r.titre}</Choix>
                ))
              : [
                  ["Contactée", "on en reparle au club"],
                  ["À relancer", "je la relance dans 3 jours"],
                  ["Pas maintenant", "sort de la liste du jour"],
                ].map(([t, s]) => (
                  <Choix key={t} small={s} onClick={async () => { await onFaitMembre(c, t); onClose(); }}>{t}</Choix>
                ))}
          </div>
        </>
      ) : (
        <Vide>✓ Déjà fait aujourd'hui.</Vide>
      )}
    </Feuille>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 12, padding: "8px 10px", fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
      <b style={{ display: "block", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", marginBottom: 2, fontWeight: 700 }}>{label}</b>
      {children}
    </div>
  );
}
