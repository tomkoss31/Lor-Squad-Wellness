// =============================================================================
// SalleOpsQuotidien — écran cockpit « La Base Académie » (onboarding coach).
//
// Pédagogie : chaque étape porte sa leçon APPRENDRE → FAIRE → PREUVE (contenu
// academyLessons, tiré du Notion La Base). Parcours = 6 étapes Go Pro. Noaly en
// tuteur. 100 % tokens --ls-ops-* (theme-aware). Vocab : « Coach en formation ».
//
// Responsive : mobile = colonne unique · desktop (≥1000px) = colonne focus +
// rail latéral persistant (phases · parcours 6 étapes · fil de sécurité).
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OPS_PHASES, type SalleOpsView } from "./useSalleOps";
import { QuiInviterLive } from "./QuiInviterLive";
import { InviteDistributorModal } from "../../../components/users/InviteDistributorModal";
import { AllerPlusLoin } from "./AllerPlusLoin";
import { MonParrain } from "./MonParrain";
import "./salle-ops.css";

const MONO: React.CSSProperties = { fontFamily: "var(--ls-ops-font-mono)" };
const PHASES = OPS_PHASES.map((p) => p.short);

/** Ouvre Noaly (écouté par NoalyFab) avec un prompt pré-injecté. */
function askNoaly(prompt?: string) {
  window.dispatchEvent(new CustomEvent("noaly:ask", { detail: { prompt } }));
}

export function SalleOpsQuotidien({
  view,
  onEscape,
  fullscreen,
  demoParrain,
}: {
  view: SalleOpsView;
  onEscape?: () => void;
  fullscreen?: boolean;
  /** Parrain imposé — uniquement pour la démonstration de /salle-ops. */
  demoParrain?: { nom: string; telephone?: string };
}) {
  const navigate = useNavigate();
  // Étape consultée : null = on suit l'étape en cours ; sinon on revoit une
  // étape (avant/après) sans la valider.
  const [viewedN, setViewedN] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Cockpit plein écran → on masque la barre de nav du bas (mobile) : elle
  // flottait AU-DESSUS de l'overlay et offrait des sorties accidentelles vers
  // des pages profondes. Le débutant reste focus (retour Thomas 2026-08-04).
  // Le « Retour à mon parcours » gère déjà le retour depuis une action.
  useEffect(() => {
    if (!fullscreen) return;
    document.body.classList.add("ls-ops-cockpit-open");
    return () => document.body.classList.remove("ls-ops-cockpit-open");
  }, [fullscreen]);
  const activeN = view.activeStepNumber;
  const shownN = viewedN ?? activeN;
  const shownStep = view.steps.find((s) => s.n === shownN) ?? view.steps[0];
  const lesson = shownStep?.lesson ?? null;
  const isActiveShown = shownN === activeN;
  const shownGateKey = isActiveShown ? view.currentGateKey : shownStep?.gateKey ?? null;

  const phaseIndex = Math.max(0, view.phaseIndex);
  const phaseLabel = OPS_PHASES[phaseIndex]?.label ?? "Allumage";
  const activeLabel = view.steps.find((s) => s.state === "active")?.label ?? "";

  /**
   * Les étapes DÉPASSÉES sans être faites — celles dont l'app ne peut pas
   * constater la preuve (250 PV sur myHerbalife, Liste 100, 1ʳᵉ story, HOM).
   * Elles sont proposées, jamais imposées : c'est la contrepartie du fait
   * qu'elles ne bloquent plus le parcours depuis le 12/08/2026.
   */
  const proposees = view.steps.filter(
    (s) => s.n < activeN && s.state !== "done" && s.state !== "locked" && !s.bloquante && s.lesson,
  );

  /** Clic sur une étape du parcours → on la revoit (sauf verrouillée). */
  function pickStep(n: number) {
    const s = view.steps.find((x) => x.n === n);
    if (!s || s.state === "locked") return;
    setViewedN(n === activeN ? null : n);
  }

  function runFaire() {
    if (!lesson) return;
    if (lesson.faire.opensInvite) {
      setInviteOpen(true);
      return;
    }
    const path = lesson.faire.linkPath;
    if (path) {
      // Lien EXTERNE (ex. myHerbalife) → nouvel onglet ; sinon route interne.
      if (/^https?:\/\//.test(path)) window.open(path, "_blank", "noopener,noreferrer");
      else navigate(path);
    } else if (shownGateKey) {
      void view.toggle(shownGateKey);
    }
  }

  return (
    <div className="ls-ops-root" style={fullscreen ? { ...pageWrap, ...fixedOverlay } : pageWrap}>
      <div className="ls-ops-shell">
        {/* ── COLONNE FOCUS ── */}
        <div className="ls-ops-main" style={column}>
          {/* Bandeau + sortie toujours visible (anti-piège). */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, ...MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
              <span className="ls-ops-dot" />
              <span style={{ color: "var(--ls-ops-text3)" }}>La Base · Verdun (55)</span>
              <span style={{ color: "var(--ls-ops-border-active)" }}>/</span>
              <span style={{ color: "var(--ls-ops-accent-text)" }}>Jour {view.dayNumber} / 90</span>
            </div>
            {onEscape ? (
              <button type="button" onClick={onEscape} style={topEscape}>
                Plus tard →
              </button>
            ) : null}
          </div>

          <div style={hair} />

          {/* Maquette validée du 12/08/2026 — LE BUT PREND LA VEDETTE.
              « Aujourd'hui » occupait tout le haut de l'écran sans rien dire :
              on lisait le nom de la page, puis l'étape, puis seulement le titre
              de la leçon en plus petit. Le vrai sujet arrivait en troisième.
              Il passe devant ; « Aujourd'hui » redevient une mention. */}
          <div style={{ ...MONO, fontSize: 11, letterSpacing: ".2em", color: "var(--ls-ops-muted)", textTransform: "uppercase", marginBottom: 4 }}>
            La Base Académie · Aujourd'hui
          </div>

          {/* Jalon J30-45 : prêt pour le plan marketing. */}
          {view.jalonPlanMarketing ? (
            <button type="button" onClick={() => navigate("/plan-marketing")} style={jalonCard}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>🎯</span>
              <span style={{ flex: 1, textAlign: "left" }}>
                <span style={{ display: "block", ...MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-on-accent2)" }}>
                  Jalon J30-45
                </span>
                <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--ls-ops-on-accent)", marginTop: 2 }}>
                  Tu es prêt·e pour le plan marketing
                </span>
              </span>
              <span aria-hidden="true" style={{ color: "var(--ls-ops-on-accent)" }}>→</span>
            </button>
          ) : null}

          {/* Phases — inline mobile, masqué desktop (→ rail) */}
          <div className="ls-ops-hide-desktop">
            <PhaseTracker phaseIndex={phaseIndex} phaseLabel={phaseLabel} />
          </div>

          {/* LEÇON : Apprendre → Faire → Preuve */}
          {lesson ? (
            <div style={{ marginTop: 24 }}>
              <div style={butEyebrow}>
                {/* `goProStep` est un index (0 = S'équiper) alors que le compteur
                    dit « Étape N sur 7 » à partir de 1 : on lisait « Étape 4 ·
                    Relancer » sous « Étape 5 sur 7 » (repéré 2026-08-04). */}
                {isActiveShown ? "Ton but · " : ""}étape {lesson.goProStep + 1} · {lesson.goProLabel}
              </div>
              <h1 className="ls-ops-display" style={butTitre}>{lesson.title}</h1>
              {/* APPRENDRE sort de sa carte : c'est le « pourquoi » du but, il
                  se lit d'un trait, pas dans un tiroir étiqueté « 1 · 30 sec ». */}
              <p style={butApprendre}>{lesson.apprendre}</p>

              {!isActiveShown ? (
                <div style={reviewBanner}>
                  <span style={{ flex: 1 }}>
                    {shownStep?.state === "done" ? "✓ Étape déjà validée — tu la revois." : "Aperçu d'une étape à venir."}
                  </span>
                  <button type="button" style={reviewBack} onClick={() => setViewedN(null)}>
                    ← Mon étape
                  </button>
                </div>
              ) : null}

              {/* L'ACTION reste toujours visible : c'est le geste du jour, il ne
                  se replie pas. Le reste (preuve, réponses) passe en volets. */}
              <div style={limeCard}>
                <div style={{ ...MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-on-accent2)", marginBottom: 8 }}>
                  Ce que tu fais maintenant
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ls-ops-on-accent)", margin: 0, fontWeight: 500 }}>
                  {lesson.faire.instruction}
                </p>
                {lesson.faire.script ? <ScriptBox script={lesson.faire.script} /> : null}
                {/* CTA : outil (lien) OU ouverture du parrainage. */}
                {lesson.faire.linkPath || lesson.faire.opensInvite ? (
                  <button type="button" style={limeCta} onClick={runFaire}>{lesson.faire.ctaLabel} →</button>
                ) : null}
              </div>

              <Volet titre="C'est gagné quand…" defaut>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--ls-ops-accent)", flex: "none", marginTop: 1, boxSizing: "border-box" }} />
                  <p style={{ ...lessonText, margin: 0 }}>{lesson.preuve}</p>
                </div>
                {/* AVANCEMENT :
                    • étape revisitée → on ne valide pas, juste l'état + retour.
                    • autoOnly (vrai bilan/commande) → se valide TOUT SEUL (trigger).
                    • sinon → gros bouton « ✓ C'est fait » (seul moyen d'avancer). */}
                {!isActiveShown ? (
                  <div style={autoNote}>
                    {shownStep?.state === "done"
                      ? "✓ Cette étape est validée."
                      : "Tu pourras valider cette étape quand ce sera son tour."}
                  </div>
                ) : lesson.autoOnly ? (
                  <div style={autoNote}>
                    ⏳ Pas besoin de cocher : cette étape se valide <strong style={{ color: "var(--ls-ops-accent-text)" }}>toute seule</strong> dès que l'acte réel est enregistré (anti-triche).
                  </div>
                ) : lesson.proofCounter && shownGateKey ? (
                  /* PREUVE CHIFFRÉE — on compte les gestes au lieu d'une case
                     tout-ou-rien. C'est ce qui donne enfin une sortie à
                     « Relancer », qui n'en avait aucune : le parcours s'y
                     figeait et personne n'en sortait (2026-08-04). */
                  (() => {
                    const target = lesson.proofCounter.target;
                    const count = Math.min(target, view.counts[shownGateKey] ?? 0);
                    const reste = target - count;
                    return (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
                          {Array.from({ length: target }, (_, i) => (
                            <span
                              key={i}
                              style={{
                                flex: 1,
                                height: 7,
                                borderRadius: 999,
                                background:
                                  i < count ? "var(--ls-ops-accent)" : "var(--ls-ops-border)",
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ ...MONO, fontSize: 11, color: "var(--ls-ops-muted)", marginBottom: 10 }}>
                          {count} / {target} {lesson.proofCounter.unit}
                          {reste > 0 ? ` · encore ${reste}` : " · étape terminée ✓"}
                        </div>
                        {reste > 0 ? (
                          <button
                            type="button"
                            style={doneBtn}
                            onClick={() =>
                              shownGateKey && void view.bump(shownGateKey, target)
                            }
                          >
                            {lesson.proofCounter.bumpLabel}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()
                ) : shownGateKey ? (
                  <button type="button" style={doneBtn} onClick={() => shownGateKey && void view.toggle(shownGateKey)}>
                    ✓ C'est fait — passer à l'étape suivante
                  </button>
                ) : (
                  /* Étapes OUVERTES sans « porte » (Démarrer ta recrue,
                     Dupliquer) : elles se vivent dans la durée, il n'y a pas
                     d'acte unique à cocher. On affiche une note plutôt qu'un
                     vide — le vide donnait un cul-de-sac (audit 2026-08-04). */
                  <div style={autoNote}>
                    🌱 Cette étape se vit dans la durée — pas de case à cocher.
                    Reviens-y au fil de tes recrues ; Noaly et ton parrain sont
                    là pour t'accompagner.
                  </div>
                )}
              </Volet>

              {/* Réponses prêtes — repliées : on les ouvre au moment où on se
                  fait objecter, pas avant. */}
              {lesson.repondre && lesson.repondre.length > 0 ? (
                <Volet titre={`Si on te dit… (${lesson.repondre.length})`}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lesson.repondre.map((r) => (
                      <Repondre key={r.situation} situation={r.situation} reponse={r.reponse} />
                    ))}
                  </div>
                </Volet>
              ) : null}
            </div>
          ) : null}

          {/* ── PAS ENCORE FAIT ? ────────────────────────────────────────────
              Depuis le 12/08/2026, une étape que l'app ne sait pas CONSTATER
              ne retient plus le fil (cf. goProSteps). Conséquence : les 250 PV,
              la Liste 100 et la 1ʳᵉ story sont désormais dépassées en silence.
              Sans ce bloc, leurs leçons ne seraient plus atteignables qu'en
              tapant un petit repère du parcours — autant dire jamais.
              Elles sont donc PROPOSÉES ici, jamais imposées. */}
          {proposees.length > 0 ? (
            <div style={{ marginTop: 22 }}>
              <SectionLabel>Pas encore fait ? Quand tu veux</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {proposees.map((s) => (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => pickStep(s.n)}
                    style={proposeeCard}
                  >
                    <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                      <span style={{ display: "block", ...MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
                        Étape {s.n} · {s.label}
                      </span>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--ls-ops-ink)", marginTop: 2 }}>
                        {s.lesson?.title}
                      </span>
                    </span>
                    <span aria-hidden="true" style={{ color: "var(--ls-ops-accent-text)", fontWeight: 700, flex: "none" }}>→</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-ops-faint)", margin: "10px 0 0" }}>
                Ces étapes comptent, mais l'app ne peut pas les vérifier à ta
                place — elles ne bloquent donc plus ta progression.
              </p>
            </div>
          ) : null}

          {/* Qui inviter (données réelles) */}
          <QuiInviterLive />

          {/* Noaly tuteur */}
          <div style={{ ...card, marginTop: 18, padding: 18, borderRadius: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span className="ls-ops-display" style={noalyBadge}>N</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 600 }}>Noaly</div>
                <div style={{ ...MONO, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>ton tuteur · 24/7</div>
              </div>
              <span className="ls-ops-dot" />
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ls-ops-text3)", margin: "13px 0 13px" }}>
              « Bloqué·e sur cette étape ? Demande-moi — je t'aide en 2 secondes. »
            </p>
            <button type="button" onClick={() => askNoaly(lesson?.noalyPrompt)} style={noalyInput} aria-label="Demander à Noaly">
              <span style={{ flex: 1, fontSize: 13, color: "var(--ls-ops-faint)", textAlign: "left" }}>
                {lesson ? `M'aider : ${lesson.goProLabel.toLowerCase()}…` : "Pose ta question…"}
              </span>
              <span style={noalySend} aria-hidden="true">↑</span>
            </button>
          </div>

          {/* Progression — inline mobile, masqué desktop (→ rail) */}
          <MonParrain demo={demoParrain} />

          <div className="ls-ops-hide-desktop">
            <SectionLabel>Ton parcours · {view.totalSteps} étapes</SectionLabel>
            <Progression view={view} activeLabel={activeLabel} shownN={shownN} onPick={pickStep} />
            {/* Formation + boîte à outils + glossaire (LOT 4) — version mobile,
                le rail desktop porte le même bloc. */}
            <AllerPlusLoin />
          </div>
        </div>

        {/* ── RAIL LATÉRAL (desktop) ── */}
        <aside className="ls-ops-rail">
          <PhaseTracker phaseIndex={phaseIndex} phaseLabel={phaseLabel} />
          <div style={{ height: 1, background: "var(--ls-ops-border-soft)", margin: "26px 0" }} />
          <div style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 16 }}>
            Ton parcours · {view.activeStepNumber}/{view.totalSteps}
          </div>
          <RailSteps view={view} shownN={shownN} onPick={pickStep} />
          <div style={{ height: 1, background: "var(--ls-ops-border-soft)", margin: "26px 0" }} />
          <div style={{ ...MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 8 }}>
            Fil de sécurité
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ls-ops-text3)", margin: "0 0 12px" }}>
            Un blocage, même bête ? Ton parrain et Noaly sont là. Il n'y a pas de question idiote.
          </p>
          <button type="button" onClick={() => askNoaly(lesson?.noalyPrompt)} style={railNoalyBtn}>
            Demander à Noaly →
          </button>
          {/* Le fil de sécurité ci-dessus nomme le parrain depuis toujours —
              sans jamais donner le moyen de le joindre (12/08/2026). */}
          <MonParrain demo={demoParrain} />
          {/* La porte « apprendre » des coachs (LOT 4, 2026-07-27) : formation
              Herbalife, scripts et glossaire, rapatriés ici depuis le hub
              « Mon développement » qui devient l'espace de Thomas. */}
          <div style={{ height: 1, background: "var(--ls-ops-border-soft)", margin: "26px 0" }} />
          <AllerPlusLoin />
        </aside>
      </div>

      {/* Parrainage d'une recrue (étape « Démarrer ta recrue »). Le coach
          connecté devient le sponsor — l'edge dérive le parrain de l'auth. */}
      <InviteDistributorModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

/**
 * Volet repliable — maquette validée du 12/08/2026.
 *
 * Avant, la leçon s'étalait en trois cartes toujours ouvertes : APPRENDRE,
 * FAIRE, PREUVE, plus les réponses aux objections. Un écran de haut, à faire
 * défiler avant d'atteindre le bouton. Le débutant lisait tout, ou rien.
 *
 * Désormais : le but et l'action restent à découvert — c'est ce qu'on fait
 * aujourd'hui. La preuve et les réponses attendent qu'on en ait besoin.
 */
function Volet({
  titre,
  defaut,
  children,
}: {
  titre: string;
  /** Ouvert au premier rendu (la preuve : on aime savoir où on va). */
  defaut?: boolean;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(Boolean(defaut));
  return (
    <div style={{ ...softCard, marginTop: 10, padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        style={voletTete}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{titre}</span>
        <span
          aria-hidden="true"
          style={{
            color: "var(--ls-ops-accent-text)",
            fontWeight: 700,
            transform: ouvert ? "rotate(90deg)" : "none",
            transition: "transform .18s",
          }}
        >
          ›
        </span>
      </button>
      {ouvert ? <div style={{ padding: "0 16px 16px" }}>{children}</div> : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)", margin: "30px 0 14px" }}>
      {children}
    </div>
  );
}

function PhaseTracker({ phaseIndex, phaseLabel }: { phaseIndex: number; phaseLabel: string }) {
  const limeSegments = phaseIndex + 1;
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", ...MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 9 }}>
        <span>Phase · <span style={{ color: "var(--ls-ops-accent-text)" }}>{phaseLabel}</span></span>
        <span style={{ color: "var(--ls-ops-faint)" }}>{phaseIndex + 1} / {PHASES.length}</span>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {PHASES.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < limeSegments ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, ...MONO, fontSize: 11, letterSpacing: ".03em", textTransform: "uppercase" }}>
        {PHASES.map((p, i) => (
          <span key={p} style={{ color: i === phaseIndex ? "var(--ls-ops-accent-text)" : "var(--ls-ops-faint)" }}>{p}</span>
        ))}
      </div>
    </div>
  );
}

function Progression({ view, activeLabel, shownN, onPick }: { view: SalleOpsView; activeLabel: string; shownN: number; onPick: (n: number) => void }) {
  return (
    <div style={{ ...card, padding: "18px 16px", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {view.steps.map((s, i) => (
          <Step key={s.n} n={s.n} state={s.state} picked={s.n === shownN} connectorDone={s.state === "done"} last={i === view.steps.length - 1} onPick={onPick} />
        ))}
      </div>
      <div style={{ marginTop: 14, textAlign: "center" }}>
        <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 600 }}>
          {view.activated ? "Tu es lancé·e 🚀" : `Étape ${view.activeStepNumber} sur ${view.totalSteps} · ${activeLabel}`}
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-ops-muted)", marginTop: 3, lineHeight: 1.4 }}>
          {view.activated
            ? "Tes fondations sont posées. Place au rythme : une exposition par jour."
            : "Apprends, fais, prouve. Une étape à la fois."}
        </div>
        <div style={{ ...MONO, fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ls-ops-faint)", marginTop: 8 }}>
          Touche une étape pour la revoir
        </div>
      </div>
    </div>
  );
}

/** Liste verticale des étapes Go Pro (rail desktop), cliquable pour revisiter. */
function RailSteps({ view, shownN, onPick }: { view: SalleOpsView; shownN: number; onPick: (n: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {view.steps.map((s, i) => {
        const done = s.state === "done";
        const active = s.state === "active";
        const locked = s.state === "locked";
        const last = i === view.steps.length - 1;
        return (
          <button
            type="button"
            key={s.n}
            disabled={locked}
            onClick={() => onPick(s.n)}
            style={{
              display: "flex",
              gap: 13,
              alignItems: "flex-start",
              width: "100%",
              textAlign: "left",
              background: s.n === shownN && !active ? "var(--ls-ops-surface)" : "transparent",
              border: "none",
              borderRadius: 10,
              padding: s.n === shownN && !active ? "4px 6px" : "0",
              cursor: locked ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
              <div
                className={active ? "ls-ops-ring" : undefined}
                style={{
                  width: active ? 28 : 24,
                  height: active ? 28 : 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  boxSizing: "border-box",
                  fontFamily: active ? "var(--ls-ops-font-display)" : "inherit",
                  ...(done || active
                    ? { background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)", fontWeight: 700 }
                    : { border: "2px solid var(--ls-ops-disabled)", color: "var(--ls-ops-faint)" }),
                }}
              >
                {done ? "✓" : locked ? "🔒" : s.n}
              </div>
              {!last && <div style={{ width: 2, height: 22, background: done ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)" }} />}
            </div>
            <div style={{ paddingTop: 2, paddingBottom: last ? 0 : 8 }}>
              <div style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? "var(--ls-ops-ink)" : done ? "var(--ls-ops-text3)" : "var(--ls-ops-faint)" }}>
                {s.label}
              </div>
              {locked ? (
                <div style={{ ...MONO, fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ls-ops-faint)", marginTop: 2 }}>
                  bientôt · faire faire
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Repondre({ situation, reponse }: { situation: string; reponse: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...softCard, padding: "13px 15px", cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, fontSize: 14, color: "var(--ls-ops-ink)", fontWeight: 500 }}>{situation}</span>
        <span style={{ ...MONO, fontSize: 14, color: "var(--ls-ops-accent-text)" }} aria-hidden="true">{open ? "−" : "+"}</span>
      </div>
      {open ? (
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ls-ops-text3)", margin: "10px 0 0" }}>{reponse}</p>
      ) : null}
    </div>
  );
}

function ScriptBox({ script }: { script: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try {
      void navigator.clipboard?.writeText(script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indispo — best-effort */
    }
  }
  return (
    <div style={scriptBox}>
      <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ls-ops-on-accent3)", margin: "0 0 10px", fontStyle: "italic" }}>
        « {script} »
      </p>
      <button type="button" onClick={copy} style={scriptCopy}>
        {copied ? "✓ Copié" : "Copier le message"}
      </button>
    </div>
  );
}

function Step({ n, state, connectorDone, last, picked, onPick }: { n: number; state: "done" | "active" | "todo" | "locked"; connectorDone: boolean; last: boolean; picked: boolean; onPick: (n: number) => void }) {
  const done = state === "done";
  const active = state === "active";
  const locked = state === "locked";
  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={() => onPick(n)}
        className={active ? "ls-ops-ring" : undefined}
        aria-label={`Étape ${n}`}
        style={{
          width: active ? 30 : 26,
          height: active ? 30 : 26,
          borderRadius: "50%",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: active ? 15 : 13,
          fontFamily: active ? "var(--ls-ops-font-display)" : "inherit",
          boxSizing: "border-box",
          cursor: locked ? "default" : "pointer",
          outline: picked && !active ? "2px solid var(--ls-ops-accent-text)" : "none",
          outlineOffset: 2,
          padding: 0,
          ...(done || active
            ? { background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)", border: "none", fontWeight: 700 }
            : { background: "transparent", border: "2px solid var(--ls-ops-disabled)", color: "var(--ls-ops-faint)" }),
        }}
      >
        {done ? "✓" : locked ? "🔒" : n}
      </button>
      {!last && <div style={{ height: 2, flex: 1, background: connectorDone ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)", margin: "0 6px" }} />}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  background: "var(--ls-ops-bg)",
  minHeight: "100%",
  // Grosse marge basse : le contenu (dont « ✓ C'est fait ») doit passer
  // AU-DESSUS de la nav du bas de l'app, jamais caché derrière.
  padding: "calc(16px + env(safe-area-inset-top)) 0 calc(120px + env(safe-area-inset-bottom))",
};

const fixedOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

const column: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  margin: "0 auto",
  padding: "0 24px",
  boxSizing: "border-box",
};

const topEscape: React.CSSProperties = {
  flex: "none",
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 11,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ls-ops-text3)",
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 999,
  padding: "7px 13px",
  cursor: "pointer",
};

const hair: React.CSSProperties = {
  height: 1,
  background: "linear-gradient(90deg, var(--ls-ops-hair), transparent)",
  margin: "14px 0 18px",
};



const softCard: React.CSSProperties = {
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
  padding: 16,
};

// ─── Le but (maquette validée 12/08/2026) ───────────────────────────────────

/** L'étape et la phase, au-dessus du but — petit, pour laisser la place. */
const butEyebrow: React.CSSProperties = {
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 11,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ls-ops-accent-text)",
  fontWeight: 600,
  marginBottom: 6,
};

/** LE but. Même échelle que l'ancien « Aujourd'hui » — il la mérite mieux. */
const butTitre: React.CSSProperties = {
  fontSize: "clamp(34px, 9.5vw, 48px)",
  lineHeight: 0.94,
  letterSpacing: ".01em",
  margin: 0,
  color: "var(--ls-ops-ink)",
};

/** Le « pourquoi », d'un trait, sans étiquette ni carte. */
const butApprendre: React.CSSProperties = {
  fontSize: 14.5,
  lineHeight: 1.6,
  color: "var(--ls-ops-text3)",
  margin: "14px 0 4px",
  maxWidth: "58ch",
};

const voletTete: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "14px 16px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--ls-ops-ink)",
};

/**
 * Étape proposée, jamais imposée — trait discontinu : rien n'est dû ici.
 *
 * ⚠️ Le trait était `var(--ls-ops-border)` : mesuré à l'écran, rgb(42,65,60)
 * sur un fond rgb(30,51,48). TROIS points d'écart — la carte ne se distinguait
 * pas d'une carte ordinaire, et le signal « c'est optionnel » était perdu.
 * Teinté à l'accent : le pointillé se voit, sans crier.
 */
const proposeeCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  background: "transparent",
  border: "1.5px dashed color-mix(in srgb, var(--ls-ops-accent) 34%, transparent)",
  borderRadius: 14,
  padding: "12px 14px",
  cursor: "pointer",
  fontFamily: "inherit",
};


const lessonText: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--ls-ops-text2)",
  margin: 0,
};

const limeCard: React.CSSProperties = {
  marginTop: 12,
  background: "var(--ls-ops-accent)",
  borderRadius: 18,
  padding: "18px 18px 16px",
};

const jalonCard: React.CSSProperties = {
  marginTop: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  background: "var(--ls-ops-accent)",
  border: "none",
  borderRadius: 16,
  padding: "13px 16px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const reviewBanner: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border-active)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 12.5,
  color: "var(--ls-ops-text3)",
};

const reviewBack: React.CSSProperties = {
  flex: "none",
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 11,
  letterSpacing: ".04em",
  color: "var(--ls-ops-accent-text)",
  background: "transparent",
  border: "1px solid var(--ls-ops-border-active)",
  borderRadius: 999,
  padding: "6px 11px",
  cursor: "pointer",
};

const autoNote: React.CSSProperties = {
  marginTop: 14,
  background: "color-mix(in srgb, var(--ls-ops-accent) 8%, transparent)",
  border: "1px solid var(--ls-ops-border-active)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--ls-ops-text3)",
};

const doneBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  background: "var(--ls-ops-accent)",
  border: "none",
  color: "var(--ls-ops-on-accent)",
  borderRadius: 12,
  padding: 14,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
};

const scriptBox: React.CSSProperties = {
  marginTop: 12,
  background: "color-mix(in srgb, var(--ls-ops-on-accent) 8%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-ops-on-accent) 22%, transparent)",
  borderRadius: 12,
  padding: "12px 13px",
};

const scriptCopy: React.CSSProperties = {
  width: "100%",
  background: "var(--ls-ops-cta-bg)",
  color: "var(--ls-ops-accent)",
  border: "none",
  borderRadius: 10,
  padding: 11,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const limeCta: React.CSSProperties = {
  marginTop: 14,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ls-ops-cta-bg)",
  color: "var(--ls-ops-accent)",
  border: "none",
  borderRadius: 14,
  padding: 15,
  fontWeight: 700,
  fontSize: 16,
  minHeight: 44,
  boxSizing: "border-box",
  cursor: "pointer",
  fontFamily: "inherit",
};

const card: React.CSSProperties = {
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
};

const noalyBadge: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 13,
  background: "var(--ls-ops-accent)",
  color: "var(--ls-ops-on-accent)",
  flex: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
};

const noalyInput: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  background: "var(--ls-ops-bg)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 12,
  padding: "12px 14px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const noalySend: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  background: "var(--ls-ops-accent)",
  color: "var(--ls-ops-on-accent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  flex: "none",
};

const railNoalyBtn: React.CSSProperties = {
  width: "100%",
  background: "var(--ls-ops-cta-bg)",
  border: "1px solid var(--ls-ops-border-active)",
  color: "var(--ls-ops-accent-text)",
  borderRadius: 12,
  padding: "11px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

