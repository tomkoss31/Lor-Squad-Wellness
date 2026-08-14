// =============================================================================
// CampaignEditor — éditeur de contenu + aperçu du mail (chantier Campagnes, ét. 4).
//
// Bascule simple Éditer / Aperçu (demande explicite de Thomas). Deux types :
//   - rich  : hero + blocs texte + offre optionnelle + bouton optionnel.
//             L'aperçu reproduit le rendu brandé de newsletter-html.ts (mapping
//             réel fait côté envoi, étape 5).
//   - plain : objet + une lettre en texte brut.
//
// {prénom} est remplacé dans l'aperçu par un prénom d'exemple pour montrer la
// perso. À l'envoi, remplacé par le vrai prénom de chaque destinataire.
// =============================================================================

import { useState } from "react";
import {
  type CampaignRichContent,
  type CampaignBlock,
  newBlockId,
  personalize,
} from "../../lib/campaignContent";

interface Props {
  type: "rich" | "plain";
  subject: string;
  onSubject: (v: string) => void;
  rich: CampaignRichContent;
  onRich: (v: CampaignRichContent) => void;
  plainText: string;
  onPlain: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  previewName?: string; // prénom d'exemple pour l'aperçu
}

export function CampaignEditor(props: Props) {
  const { type, subject, onSubject, rich, onRich, plainText, onPlain, onSave, saving } = props;
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const name = props.previewName || "Marie";

  function patchRich(patch: Partial<CampaignRichContent>) {
    onRich({ ...rich, ...patch });
  }
  function patchBlock(id: string, patch: Partial<CampaignBlock>) {
    patchRich({ blocks: rich.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  }
  function addBlock() {
    patchRich({ blocks: [...rich.blocks, { id: newBlockId(), emoji: "✨", title: "", body: "" }] });
  }
  function removeBlock(id: string) {
    patchRich({ blocks: rich.blocks.filter((b) => b.id !== id) });
  }

  return (
    <div>
      <style>{`
        .ceo-tabs { display:flex; gap:6px; margin-bottom:14px; }
        .ceo-tab { flex:1; text-align:center; font:700 12.5px 'DM Sans'; padding:10px; border-radius:8px; border:1px solid var(--ls-border); background:var(--ls-surface); color:var(--ls-text-muted); cursor:pointer; }
        .ceo-tab[data-on="1"] { background:var(--ls-surface2); color:var(--ls-text); border-color:var(--ls-border2); }
        .ceo-lbl { display:block; font:600 11px 'DM Sans'; color:var(--ls-text-muted); text-transform:uppercase; letter-spacing:.05em; margin:14px 0 6px; }
        .ceo-inp { width:100%; background:var(--ls-input-bg); border:1px solid var(--ls-border2); border-radius:8px; color:var(--ls-text); padding:11px 12px; font-family:'DM Sans',sans-serif; font-size:14px; }
        textarea.ceo-inp { resize:vertical; min-height:70px; line-height:1.5; }
        textarea.ceo-letter { min-height:280px; font-size:14.5px; }
        .ceo-block { background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:12px; padding:13px; margin-bottom:10px; }
        .ceo-bhead { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .ceo-emoji { width:44px; text-align:center; background:var(--ls-input-bg); border:1px solid var(--ls-border2); border-radius:8px; padding:9px 0; font-size:16px; }
        .ceo-del { margin-left:auto; background:none; border:0; color:var(--ls-text-hint); cursor:pointer; font-size:16px; }
        .ceo-add { width:100%; padding:12px; border:1px dashed var(--ls-border2); border-radius:12px; background:transparent; color:var(--ls-text-muted); font:600 13px 'DM Sans'; cursor:pointer; margin-bottom:10px; }
        .ceo-toggle { display:flex; align-items:center; gap:10px; padding:12px; background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:12px; margin:14px 0 8px; cursor:pointer; }
        .ceo-toggle .sw { width:38px; height:22px; border-radius:999px; background:var(--ls-border2); position:relative; flex:0 0 auto; transition:background .2s; }
        .ceo-toggle .sw::after { content:''; position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; transition:transform .2s; }
        .ceo-toggle[data-on="1"] .sw { background:var(--ls-teal); } .ceo-toggle[data-on="1"] .sw::after { transform:translateX(16px); }
        .ceo-toggle b { font-size:13.5px; } .ceo-toggle span { font-size:12px; color:var(--ls-text-muted); }
        .ceo-save { display:flex; align-items:center; justify-content:center; width:100%; padding:14px; border-radius:14px; border:0; font:700 14.5px 'DM Sans'; cursor:pointer; background:var(--ls-teal); color:var(--ls-teal-contrast); margin-top:16px; }
        .ceo-save:disabled { opacity:.5; }
        .ceo-hint { font-size:11.5px; color:var(--ls-text-hint); margin:4px 0 0; }

        /* aperçu email */
        .ceo-mail { background:#F4F1EA; border-radius:14px; overflow:hidden; color:#1a1a1a; font-family:'DM Sans',sans-serif; }
        .ceo-mh { background:linear-gradient(120deg,#0B0D11,#141821); padding:22px 20px; text-align:center; }
        .ceo-logo { width:52px; height:52px; border-radius:14px; margin:0 auto 10px; display:flex; align-items:center; justify-content:center; background:linear-gradient(150deg,#2ec5c0,#3f8ef0 55%,#7d6bf0); font-family:'Anton',sans-serif; font-size:28px; color:#fff; }
        .ceo-mh h2 { color:#F4F1EA; font-size:22px; margin:0; font-family:'Anton',sans-serif; font-weight:400; letter-spacing:.5px; }
        .ceo-mb { padding:20px; }
        .ceo-mb h3 { font-size:19px; margin:0 0 10px; }
        .ceo-mb p { font-size:14px; line-height:1.6; color:#333; margin:0 0 14px; white-space:pre-wrap; }
        .ceo-blk { margin:16px 0; }
        .ceo-blk h4 { font-size:16px; margin:0 0 5px; }
        .ceo-offer { background:#fff; border:1px solid #e5ddcf; border-radius:12px; padding:16px; text-align:center; margin:16px 0; }
        .ceo-offer .lb { font-size:13px; color:#666; }
        .ceo-offer .big { font-family:'Anton',sans-serif; font-size:32px; color:#0B0D11; margin:2px 0; }
        .ceo-offer .sx { font-size:13px; color:#444; }
        .ceo-cta { display:block; text-align:center; background:linear-gradient(135deg,#2DD4BF,#7d6bf0); color:#fff; font-weight:700; padding:14px; border-radius:12px; text-decoration:none; margin:6px 0; }
        .ceo-mf { background:#0B0D11; color:#7A8099; font-size:11px; text-align:center; padding:16px 20px; line-height:1.6; }
        .ceo-mf a { color:#9AA0A6; text-decoration:underline; }
        .ceo-letterview { background:#fff; color:#1a1a1a; border-radius:14px; padding:26px 22px; font-size:15px; line-height:1.7; white-space:pre-wrap; font-family:Georgia, serif; }
      `}</style>

      <div className="ceo-tabs">
        <button type="button" className="ceo-tab" data-on={tab === "edit" ? "1" : "0"} onClick={() => setTab("edit")}>
          ✏️ Éditer
        </button>
        <button type="button" className="ceo-tab" data-on={tab === "preview" ? "1" : "0"} onClick={() => setTab("preview")}>
          👁 Aperçu
        </button>
      </div>

      {tab === "edit" ? (
        <>
          <label className="ceo-lbl">Objet de l'email</label>
          <input
            className="ceo-inp"
            value={subject}
            onChange={(e) => onSubject(e.target.value)}
            placeholder={type === "rich" ? "Le club ouvre ses portes 🎉" : "Un petit mot pour toi"}
          />
          <p className="ceo-hint">Astuce : écris {"{prénom}"} n'importe où pour personnaliser (« Bonjour {"{prénom}"} »).</p>

          {type === "plain" ? (
            <>
              <label className="ceo-lbl">Ta lettre</label>
              <textarea
                className="ceo-inp ceo-letter"
                value={plainText}
                onChange={(e) => onPlain(e.target.value)}
                placeholder={"Bonjour {prénom},\n\nJe reviens vers toi car…"}
              />
            </>
          ) : (
            <>
              <label className="ceo-lbl">Titre principal (hero)</label>
              <input className="ceo-inp" value={rich.hero_title} onChange={(e) => patchRich({ hero_title: e.target.value })} placeholder="Le club ouvre ses portes" />

              <label className="ceo-lbl">Accroche</label>
              <textarea className="ceo-inp" value={rich.intro} onChange={(e) => patchRich({ intro: e.target.value })} placeholder={"Bonjour {prénom},\nOn y est. La Base 360 ouvre son club à Verdun…"} />

              <label className="ceo-lbl">Sections</label>
              {rich.blocks.map((b) => (
                <div key={b.id} className="ceo-block">
                  <div className="ceo-bhead">
                    <input className="ceo-emoji" value={b.emoji} onChange={(e) => patchBlock(b.id, { emoji: e.target.value })} maxLength={2} />
                    <input className="ceo-inp" style={{ flex: 1 }} value={b.title} onChange={(e) => patchBlock(b.id, { title: e.target.value })} placeholder="Titre de la section" />
                    <button type="button" className="ceo-del" onClick={() => removeBlock(b.id)} aria-label="Supprimer">✕</button>
                  </div>
                  <textarea className="ceo-inp" value={b.body} onChange={(e) => patchBlock(b.id, { body: e.target.value })} placeholder="Le texte de la section…" />
                </div>
              ))}
              <button type="button" className="ceo-add" onClick={addBlock}>＋ Ajouter une section</button>

              <div className="ceo-toggle" data-on={rich.offer.enabled ? "1" : "0"} onClick={() => patchRich({ offer: { ...rich.offer, enabled: !rich.offer.enabled } })}>
                <div className="sw" /><div><b>Bloc offre</b><br /><span>un cadeau bien visible (−30%, offert…)</span></div>
              </div>
              {rich.offer.enabled && (
                <div className="ceo-block">
                  <input className="ceo-inp" style={{ marginBottom: 8 }} value={rich.offer.label} onChange={(e) => patchRich({ offer: { ...rich.offer, label: e.target.value } })} placeholder="Ton cadeau d'ouverture" />
                  <input className="ceo-inp" style={{ marginBottom: 8 }} value={rich.offer.value} onChange={(e) => patchRich({ offer: { ...rich.offer, value: e.target.value } })} placeholder="−30%" />
                  <input className="ceo-inp" value={rich.offer.subtext} onChange={(e) => patchRich({ offer: { ...rich.offer, subtext: e.target.value } })} placeholder="sur ton 1er bilan + une boisson offerte" />
                </div>
              )}

              <div className="ceo-toggle" data-on={rich.cta.enabled ? "1" : "0"} onClick={() => patchRich({ cta: { ...rich.cta, enabled: !rich.cta.enabled } })}>
                <div className="sw" /><div><b>Bouton d'action</b><br /><span>« Je réserve ma place »</span></div>
              </div>
              {rich.cta.enabled && (
                <div className="ceo-block">
                  <input className="ceo-inp" style={{ marginBottom: 8 }} value={rich.cta.label} onChange={(e) => patchRich({ cta: { ...rich.cta, label: e.target.value } })} placeholder="Je réserve ma place" />
                  <input className="ceo-inp" value={rich.cta.url} onChange={(e) => patchRich({ cta: { ...rich.cta, url: e.target.value } })} placeholder="https://labase360.fr/rdv/thomas" />
                </div>
              )}
            </>
          )}

          <button type="button" className="ceo-save" onClick={onSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer le contenu"}
          </button>
        </>
      ) : type === "plain" ? (
        <div className="ceo-letterview">{personalize(plainText, name) || "Ta lettre apparaîtra ici."}</div>
      ) : (
        <div className="ceo-mail">
          <div className="ceo-mh">
            <div className="ceo-logo">B</div>
            <h2>LA BASE 360</h2>
          </div>
          <div className="ceo-mb">
            {rich.hero_title && <h3>{personalize(rich.hero_title, name)}</h3>}
            {rich.intro && <p>{personalize(rich.intro, name)}</p>}
            {rich.blocks.map((b) => (
              <div key={b.id} className="ceo-blk">
                <h4>{b.emoji ? `${b.emoji} ` : ""}{personalize(b.title, name)}</h4>
                <p>{personalize(b.body, name)}</p>
              </div>
            ))}
            {rich.offer.enabled && (
              <div className="ceo-offer">
                <div className="lb">{rich.offer.label}</div>
                <div className="big">{rich.offer.value || "—"}</div>
                <div className="sx">{rich.offer.subtext}</div>
              </div>
            )}
            {rich.cta.enabled && rich.cta.label && (
              <a className="ceo-cta" href={rich.cta.url || "#"}>{rich.cta.label} →</a>
            )}
          </div>
          <div className="ceo-mf">
            La Base 360 · Verdun, France<br />
            <a href="#">Se désabonner</a> · tu reçois ce mail car tu as laissé tes coordonnées.
          </div>
        </div>
      )}
    </div>
  );
}
