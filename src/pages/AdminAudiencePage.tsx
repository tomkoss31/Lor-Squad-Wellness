// =============================================================================
// AdminAudiencePage — « Qui vient, et où on les perd ». Route /admin/audience.
//
// Rend la maquette validée par Thomas le 2026-08-13
// (public/mockups/audience-site.html), branchée sur les compteurs du lot 1.
//
// ⚠️ Les sections « boutons » et « où ça décroche » n'ont pas encore de source :
// personne n'appelle `noterClic` / `noterEtape` (c'est le lot 3). Elles
// affichent donc un état vide qui DIT pourquoi — un tableau vide sans
// explication se lit comme une panne.
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useAudience } from "../features/audience/useAudience";
import { analyserTunnels } from "../features/audience/tunnels";
import { duree, evolution, PERIODES, type ClePeriode } from "../features/audience/periodes";

export function AdminAudiencePage() {
  const { currentUser } = useAppContext();
  const [periode, setPeriode] = useState<ClePeriode>("semaine");
  const [mesLiens, setMesLiens] = useState(false);
  const { data, loading, error } = useAudience(periode, mesLiens, currentUser?.id ?? null);

  const tunnels = useMemo(() => analyserTunnels(data.etapes), [data.etapes]);

  // Part de ceux qui traversent un tunnel en entier, tous tunnels confondus.
  // `null` tant qu'aucune étape n'est posée : mieux vaut un tiret qu'un « 0 % »
  // qui ferait croire que personne n'aboutit.
  const vontAuBout = useMemo(() => {
    const entrent = tunnels.reduce((n, t) => n + t.entrent, 0);
    if (entrent === 0) return null;
    return Math.round((tunnels.reduce((n, t) => n + t.arrivent, 0) / entrent) * 100);
  }, [tunnels]);

  const kpis = useMemo(() => {
    const p = data.precedent;
    return [
      { lab: "Visites", val: data.totalVues.toLocaleString("fr-FR"), d: p ? evolution(data.totalVues, p.vues) : null },
      { lab: "Personnes", val: data.totalVisites.toLocaleString("fr-FR"), d: p ? evolution(data.totalVisites, p.visites) : null },
      { lab: "Temps moyen", val: duree(data.dureeMoyenne), d: p ? evolution(data.dureeMoyenne, p.dureeMoyenne) : null },
      { lab: "Vont au bout", val: vontAuBout === null ? "—" : `${vontAuBout} %`, d: null },
    ];
  }, [data, vontAuBout]);

  const rien = !loading && !error && data.pages.length === 0;

  return (
    <div style={page}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={titre}>Qui vient, et où on les perd</h1>
        <p style={sous}>
          Tes pages publiques : le club, le bilan en ligne, la boutique, le
          recrutement. Aucune donnée personnelle, aucun cookie.
        </p>
      </header>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {PERIODES.map((p) => (
          <button
            key={p.cle}
            type="button"
            onClick={() => setPeriode(p.cle)}
            aria-current={periode === p.cle}
            style={seg(periode === p.cle)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[
          { on: false, label: "Tout le site" },
          { on: true, label: "Mes liens à moi" },
        ].map((o) => (
          <button
            key={String(o.on)}
            type="button"
            onClick={() => setMesLiens(o.on)}
            aria-current={mesLiens === o.on}
            style={pilule(mesLiens === o.on)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {error ? (
        <div style={alerte}>Chiffres indisponibles : {error}</div>
      ) : null}

      {loading ? (
        <div style={hint}>Lecture des compteurs…</div>
      ) : rien ? (
        <div style={carte}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ls-text-muted)" }}>
            <strong style={{ color: "var(--ls-text)" }}>Rien encore mesuré sur cette période.</strong>
            <br />
            La mesure a démarré aujourd'hui et ne compte que les <em>vraies</em> visites :
            ni ton dev local, ni les visiteurs qui refusent le pistage. Reviens
            demain — ou ouvre ton site depuis ton téléphone pour voir le premier
            chiffre monter.
          </p>
        </div>
      ) : (
        <>
          <div style={grilleKpi}>
            {kpis.map((k) => (
              <div key={k.lab} style={carteKpi}>
                <div style={labKpi}>{k.lab}</div>
                <div style={valKpi}>{k.val}</div>
                <div style={{ ...dltKpi, color: k.d === null ? "var(--ls-text-muted)" : k.d >= 0 ? "var(--ls-lime)" : "var(--ls-coral)" }}>
                  {k.d === null
                    ? periode === "total" ? "depuis le début" : "pas de point de comparaison"
                    : `${k.d >= 0 ? "▲ +" : "▼ "}${k.d} % vs période d'avant`}
                </div>
              </div>
            ))}
          </div>

          <section style={{ marginBottom: 30 }}>
            <h2 style={h2}>Où ça décroche</h2>
            <p style={h2sub}>
              C'est la seule partie qui dit quoi corriger. Chaque barre est une
              étape ; le rouge marque l'endroit où l'on perd la plus grosse part.
            </p>
            {tunnels.length === 0 ? (
              <div style={carte}>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--ls-text-muted)" }}>
                  Les étapes de tes tunnels ne sont pas encore posées — c'est le
                  prochain lot. Tant qu'elles ne le sont pas, cette section reste
                  vide : elle ne peut rien inventer.
                </p>
              </div>
            ) : (
              tunnels.map((t) => (
                <div key={t.tunnel} style={carteTunnel}>
                  <h3 style={{ margin: "0 0 2px", fontSize: 14.5, fontWeight: 700, color: "var(--ls-text)" }}>{t.tunnel}</h3>
                  <p style={metaTunnel}>
                    {t.entrent} entrent → {t.arrivent} au bout, soit {t.tauxFin} %
                  </p>
                  {t.etapes.map((e) => (
                    <div key={e.etape} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                      <span style={nomEtape}>{e.etape}</span>
                      <span style={barre}>
                        <i style={{
                          display: "block", height: "100%", borderRadius: 7, width: `${e.part}%`,
                          background: `color-mix(in srgb, ${e.pire ? "var(--ls-coral)" : "var(--ls-teal)"} 45%, transparent)`,
                        }} />
                        <b style={valBarre}>{e.n}</b>
                      </span>
                      <span style={{ ...chuteStyle, color: e.pire ? "var(--ls-coral)" : "var(--ls-text-muted)", fontWeight: e.pire ? 700 : 400 }}>
                        {e.chute === null ? "" : `−${e.chute} %`}
                      </span>
                    </div>
                  ))}
                  {t.pire ? (
                    <div style={verdict}>
                      L'étape <strong style={{ color: "var(--ls-coral)" }}>{t.pire.etape}</strong> fait
                      partir <strong style={{ color: "var(--ls-coral)" }}>{t.pire.chute} %</strong> de
                      ceux qui y arrivent.
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </section>

          <section style={{ marginBottom: 30 }}>
            <h2 style={h2}>Les pages</h2>
            <p style={h2sub}>
              Combien de fois vue, combien de temps on y reste, et la part qui
              quitte le site depuis cette page.
            </p>
            <div style={{ ...carte, padding: 0, overflow: "hidden" }}>
              <div style={enTete}>
                <div style={{ ...cellHead, flex: 1 }}>Page</div>
                <div style={{ ...cellHead, width: 52, textAlign: "right" }}>Vues</div>
                <div style={{ ...cellHead, width: 44, textAlign: "right" }}>Durée</div>
                <div style={{ ...cellHead, width: 48, textAlign: "right" }}>Sortie</div>
              </div>
              {data.pages.map((p, i) => {
                const sortie = p.vues > 0 ? Math.round((p.sorties / p.vues) * 100) : 0;
                return (
                  <div key={p.cle} style={{ ...ligne, borderBottom: i === data.pages.length - 1 ? "none" : "1px solid var(--ls-border)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={cheminStyle}>{p.cle}</div>
                      {p.visites > 0 ? (
                        <div style={{ fontSize: 10.5, color: "var(--ls-text-muted)", marginTop: 2 }}>
                          {p.visites} personne{p.visites > 1 ? "s" : ""}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ ...cellNum, width: 52 }}>{p.vues}</div>
                    <div style={{ ...cellNum, width: 44, color: "var(--ls-text-muted)" }}>
                      {p.dureeN > 0 ? duree(p.dureeMs / p.dureeN) : "—"}
                    </div>
                    <div style={{ ...cellNum, width: 48, color: sortie >= 55 ? "var(--ls-coral)" : "var(--ls-text-muted)" }}>
                      {p.sorties > 0 ? `${sortie} %` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={note}>
              <strong style={{ color: "var(--ls-text-muted)" }}>Durée</strong> = moyenne,
              chaque vue étant plafonnée à 10 minutes : l'onglet laissé ouvert
              toute la nuit compte pour 10 min et ne déforme pas le chiffre.
            </p>
          </section>

          <section style={{ marginBottom: 30 }}>
            <h2 style={h2}>Les boutons</h2>
            <p style={h2sub}>
              Ce sur quoi on clique — et ce sur quoi personne ne clique jamais,
              souvent l'information la plus utile.
            </p>
            {data.clics.length === 0 ? (
              <div style={carte}>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--ls-text-muted)" }}>
                  Aucun bouton n'est encore nommé sur le site — c'est le prochain
                  lot. Un bouton non nommé ne peut pas être compté.
                </p>
              </div>
            ) : (
              <div style={{ ...carte, padding: 0, overflow: "hidden" }}>
                {[...data.clics].sort((a, b) => (a.n === 0 ? -1 : b.n === 0 ? 1 : 0)).map((c, i) => (
                  <div key={c.cle} style={{ ...ligne, borderBottom: i === data.clics.length - 1 ? "none" : "1px solid var(--ls-border)" }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ls-text)" }}>{c.cle}</div>
                    <span style={pastilleClic(c.n === 0)}>
                      {c.n === 0 ? "jamais cliqué" : `${c.n} clic${c.n > 1 ? "s" : ""}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <footer style={pied}>
        Mesure d'audience anonyme : pas de cookie, pas d'adresse IP conservée,
        aucun profil. Un identifiant de session éphémère sert seulement à ne pas
        compter deux fois la même visite ; il disparaît à la fermeture de
        l'onglet. Les visiteurs qui activent « Do Not Track » ne sont pas
        comptés, et le développement local non plus.
      </footer>
    </div>
  );
}

// ─── Styles (tokens --ls-* uniquement) ──────────────────────────────────────

const page: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "4px 0 60px" };

const titre: React.CSSProperties = {
  margin: "0 0 6px", fontFamily: "'Anton', sans-serif", fontWeight: 400,
  fontSize: "clamp(28px, 6vw, 38px)", lineHeight: 1.02, textTransform: "uppercase",
  letterSpacing: ".01em", color: "var(--ls-text)",
};

const sous: React.CSSProperties = {
  margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--ls-text-muted)", maxWidth: 560,
};

function seg(actif: boolean): React.CSSProperties {
  return {
    flex: "1 1 70px", minHeight: 44, padding: "0 12px", borderRadius: 11,
    border: `1px solid ${actif ? "color-mix(in srgb, var(--ls-teal) 45%, transparent)" : "var(--ls-border)"}`,
    background: actif ? "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface))" : "var(--ls-surface)",
    color: actif ? "var(--ls-teal)" : "var(--ls-text-muted)",
    fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  };
}

function pilule(actif: boolean): React.CSSProperties {
  return {
    flex: 1, minHeight: 44, borderRadius: 999,
    border: `1px solid ${actif ? "var(--ls-border2)" : "var(--ls-border)"}`,
    background: actif ? "var(--ls-surface)" : "transparent",
    color: actif ? "var(--ls-text)" : "var(--ls-text-muted)",
    fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}

const grilleKpi: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 9, marginBottom: 26,
};

const carteKpi: React.CSSProperties = {
  background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
  borderRadius: 15, padding: "13px 14px",
};

const labKpi: React.CSSProperties = {
  fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
  color: "var(--ls-text-muted)", marginBottom: 6,
};

const valKpi: React.CSSProperties = {
  fontFamily: "'Anton', sans-serif", fontWeight: 400, fontSize: 29,
  lineHeight: 1, color: "var(--ls-text)",
};

const dltKpi: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, marginTop: 5,
};

const h2: React.CSSProperties = {
  margin: "0 0 3px", fontFamily: "'Anton', sans-serif", fontWeight: 400,
  fontSize: 19, textTransform: "uppercase", letterSpacing: ".02em", color: "var(--ls-text)",
};

const h2sub: React.CSSProperties = {
  margin: "0 0 12px", fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-text-muted)",
};

const carte: React.CSSProperties = {
  background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
  borderRadius: 16, padding: "15px 14px",
};

const carteTunnel: React.CSSProperties = { ...carte, marginBottom: 11 };

const metaTunnel: React.CSSProperties = {
  margin: "0 0 13px", fontSize: 11.5, color: "var(--ls-text-muted)",
};

const nomEtape: React.CSSProperties = {
  width: 104, flex: "none", fontSize: 11.5, color: "var(--ls-text-muted)", lineHeight: 1.25,
};

const barre: React.CSSProperties = {
  flex: 1, height: 26, borderRadius: 7, background: "var(--ls-surface2)",
  overflow: "hidden", position: "relative",
};

const valBarre: React.CSSProperties = {
  position: "absolute", top: 0, right: 8, height: 26, display: "flex", alignItems: "center",
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "var(--ls-text)",
};

const chuteStyle: React.CSSProperties = {
  width: 52, flex: "none", textAlign: "right",
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
};

const verdict: React.CSSProperties = {
  marginTop: 12, padding: "11px 12px", borderRadius: 12, fontSize: 12.5, lineHeight: 1.5,
  background: "color-mix(in srgb, var(--ls-coral) 4%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-coral) 30%, transparent)",
  color: "var(--ls-text)",
};

const enTete: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9, padding: "10px 14px",
  background: "var(--ls-surface2)", borderBottom: "1px solid var(--ls-border)",
};

const cellHead: React.CSSProperties = {
  fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase",
  color: "var(--ls-text-muted)", fontWeight: 500,
};

const ligne: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9, padding: "10px 14px",
};

const cheminStyle: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: "var(--ls-text)",
  fontFamily: "'JetBrains Mono', monospace",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const cellNum: React.CSSProperties = {
  textAlign: "right", fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12, color: "var(--ls-text)", flex: "none",
};

function pastilleClic(mort: boolean): React.CSSProperties {
  const teinte = mort ? "var(--ls-coral)" : "var(--ls-teal)";
  return {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
    padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
    color: teinte,
    border: `1px solid color-mix(in srgb, ${teinte} 38%, transparent)`,
  };
}

const note: React.CSSProperties = {
  marginTop: 10, fontSize: 11.5, lineHeight: 1.55, color: "var(--ls-text-muted)",
};

const hint: React.CSSProperties = { fontSize: 13, color: "var(--ls-text-muted)", padding: "20px 0" };

const alerte: React.CSSProperties = {
  ...carte, marginBottom: 16, fontSize: 13, color: "var(--ls-coral)",
  borderColor: "color-mix(in srgb, var(--ls-coral) 35%, var(--ls-border))",
};

const pied: React.CSSProperties = {
  marginTop: 34, paddingTop: 18, borderTop: "1px solid var(--ls-border)",
  fontSize: 11.5, lineHeight: 1.6, color: "var(--ls-text-muted)",
};
