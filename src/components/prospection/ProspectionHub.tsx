// Chantier #3 V4 — Hub Prospection (2026-05-19).
// Affiché aux distri qui ont déjà fait le tunnel onboarding 1ère visite
// (users.prospection_onboarded_at != null). Filtres Marché + Profil sticky
// en haut. 10 modules en cards, accordéon-style : un module se déplie au
// clic et affiche son contenu (lecture seule).
//
// Le contenu vient du hook useProspectionData (V4). Le copy est multi-marché
// (FR/EN/ES/PT/TR/HI) avec body_fr renseigné pour les non-FR.

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  PLATFORM_GRADIENTS,
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  PROSPECTION_MODULES,
  filterByMarket,
  filterByMarketAndProfile,
  filterHashtags,
  filterScripts,
  type ProspectionHashtag,
  type ProspectionMarket,
  type ProspectionMarketTip,
  type ProspectionProfile,
  type ProspectionScript,
  type ProspectionMindsetBlock,
  type ProspectionMetric,
  type ProspectionProfileFlag,
  type ProspectionSource,
  type ProspectionReplyNode,
  type ProspectionObjection,
  type ProspectionFollowup,
  type ProspectionClosingBlock,
  type ProspectionSpecialCase,
  type ProspectionStoryBlock,
  type ProspectionRoutineItem,
  type ProspectionModuleId,
} from "../../hooks/useProspectionData";

interface Props {
  markets: ProspectionMarket[];
  profiles: ProspectionProfile[];
  hashtags: ProspectionHashtag[];
  scripts: ProspectionScript[];
  marketTips: ProspectionMarketTip[];
  mindsetBlocks: ProspectionMindsetBlock[];
  metrics: ProspectionMetric[];
  profileFlags: ProspectionProfileFlag[];
  sources: ProspectionSource[];
  replyTree: ProspectionReplyNode[];
  objections: ProspectionObjection[];
  followups: ProspectionFollowup[];
  closing: ProspectionClosingBlock[];
  specialCases: ProspectionSpecialCase[];
  storytelling: ProspectionStoryBlock[];
  routines: ProspectionRoutineItem[];
  /** Si Thomas veut revoir le tunnel onboarding manuellement. */
  onRestartTunnel: () => void;
}

export function ProspectionHub(p: Props) {
  // Sticky filters market + profile. Défaut = 1ers items dispo.
  const [marketCode, setMarketCode] = useState<string>(p.markets[0]?.code ?? "fr");
  const [profileSlug, setProfileSlug] = useState<string>(p.profiles[0]?.slug ?? "weight-women");
  const [openModule, setOpenModule] = useState<ProspectionModuleId | null>(null);

  const profile = useMemo(() => p.profiles.find((pp) => pp.slug === profileSlug) ?? null, [p.profiles, profileSlug]);
  const marketTip = useMemo(() => p.marketTips.find((t) => t.market_code === marketCode) ?? null, [p.marketTips, marketCode]);

  // Filtered data par market+profil (pour les modules qui en ont besoin)
  const hashtags = useMemo(() => filterHashtags(p.hashtags, marketCode, profileSlug), [p.hashtags, marketCode, profileSlug]);
  const scripts = useMemo(() => filterScripts(p.scripts, marketCode, profileSlug), [p.scripts, marketCode, profileSlug]);
  const mindsetBlocks = useMemo(() => filterByMarket(p.mindsetBlocks, marketCode), [p.mindsetBlocks, marketCode]);
  const metrics = useMemo(() => filterByMarket(p.metrics, marketCode), [p.metrics, marketCode]);
  const flags = useMemo(
    () => p.profileFlags.filter((f) => f.market_code === marketCode && f.profile_slug === profileSlug),
    [p.profileFlags, marketCode, profileSlug],
  );
  const sources = useMemo(
    () => filterByMarketAndProfile(p.sources, marketCode, profileSlug),
    [p.sources, marketCode, profileSlug],
  );
  const replyTree = useMemo(
    () => p.replyTree.filter((r) => r.market_code === marketCode && r.profile_slug === profileSlug),
    [p.replyTree, marketCode, profileSlug],
  );
  const objections = useMemo(() => filterByMarket(p.objections, marketCode), [p.objections, marketCode]);
  const followups = useMemo(() => filterByMarket(p.followups, marketCode), [p.followups, marketCode]);
  const closing = useMemo(() => filterByMarket(p.closing, marketCode), [p.closing, marketCode]);
  const specialCases = useMemo(() => filterByMarket(p.specialCases, marketCode), [p.specialCases, marketCode]);
  const storytelling = useMemo(
    () => filterByMarketAndProfile(p.storytelling, marketCode, profileSlug),
    [p.storytelling, marketCode, profileSlug],
  );
  const routines = useMemo(() => filterByMarket(p.routines, marketCode), [p.routines, marketCode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 }}>
      <style>{HUB_KEYFRAMES}</style>

      {/* Sticky filter bar */}
      <div style={STICKY_BAR}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {p.markets.map((m) => (
            <button
              key={m.code}
              onClick={() => setMarketCode(m.code)}
              style={{
                ...PILL,
                ...(m.code === marketCode ? PILL_ACTIVE : {}),
                fontFamily:
                  "'Twemoji Country Flags','Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif",
              }}
            >
              <span style={{ marginRight: 6 }}>{m.flag}</span>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {p.profiles.map((pp) => (
            <button
              key={pp.slug}
              onClick={() => setProfileSlug(pp.slug)}
              style={{
                ...PILL,
                ...(pp.slug === profileSlug ? PILL_ACTIVE : {}),
              }}
            >
              <span style={{ marginRight: 6 }}>{pp.emoji}</span>
              {pp.label}
            </button>
          ))}
        </div>
        {marketTip ? (
          <div style={MARKET_TIP_BANNER}>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>{marketTip.timing}</div>
            <div style={{ fontSize: 13, color: "var(--ls-text)" }}>{marketTip.cultural_tip}</div>
          </div>
        ) : null}
      </div>

      {/* Modules grid */}
      <div style={MODULES_GRID}>
        {PROSPECTION_MODULES.map((mod) => {
          const isOpen = openModule === mod.id;
          return (
            <div key={mod.id} style={{ ...MODULE_CARD, ...(isOpen ? MODULE_CARD_OPEN : {}) }}>
              <button
                onClick={() => setOpenModule(isOpen ? null : mod.id)}
                style={MODULE_HEADER_BTN}
                aria-expanded={isOpen}
              >
                <span style={{ fontSize: 22, marginRight: 10 }}>{mod.emoji}</span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
                  <span style={{ fontFamily: "Syne, serif", fontSize: 16, fontWeight: 600 }}>{mod.title}</span>
                  <span style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{mod.subtitle}</span>
                </span>
                <span style={MODULE_CHIP}>{mod.section}</span>
                <span style={{ fontSize: 18, color: "var(--ls-text-muted)", marginLeft: 8 }}>
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>
              {isOpen ? (
                <div style={MODULE_BODY}>
                  {mod.id === "mindset"       && <MindsetModule blocks={mindsetBlocks} metrics={metrics} />}
                  {mod.id === "find_prospects" && (
                    <FindProspectsModule
                      flags={flags}
                      sources={sources}
                      hashtags={hashtags}
                      profile={profile}
                    />
                  )}
                  {mod.id === "messages_m1"   && <MessagesM1Module scripts={scripts} marketCode={marketCode} />}
                  {mod.id === "reply_tree"    && <ReplyTreeModule nodes={replyTree} marketCode={marketCode} />}
                  {mod.id === "objections"    && <ObjectionsModule items={objections} marketCode={marketCode} />}
                  {mod.id === "followups"     && <FollowupsModule items={followups} marketCode={marketCode} />}
                  {mod.id === "closing"       && <ClosingModule items={closing} marketCode={marketCode} />}
                  {mod.id === "special_cases" && <SpecialCasesModule items={specialCases} marketCode={marketCode} />}
                  {mod.id === "storytelling"  && <StorytellingModule items={storytelling} />}
                  {mod.id === "routine"       && <RoutineModule items={routines} />}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button onClick={p.onRestartTunnel} style={RESTART_BTN}>
        🔁 Revoir le tunnel onboarding
      </button>
    </div>
  );
}

// ============================================================================
// Module renderers — read-only display
// ============================================================================

function MindsetModule({
  blocks, metrics,
}: { blocks: ProspectionMindsetBlock[]; metrics: ProspectionMetric[] }) {
  const truths = blocks.filter((b) => b.kind === "truth");
  const errors = blocks.filter((b) => b.kind === "error");
  const funnel = metrics.filter((m) => m.kind === "funnel_step");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section>
        <h4 style={H4}>Les vérités à accepter</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {truths.map((t) => (
            <article key={t.id} style={INFO_CARD}>
              <div style={{ fontFamily: "Syne, serif", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: "var(--ls-text)", whiteSpace: "pre-wrap" }}>{t.body}</div>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h4 style={H4}>Erreurs du débutant</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {errors.map((e, idx) => (
            <article key={e.id} style={ERROR_CARD}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{idx + 1}. {e.title}</div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>{e.body}</div>
            </article>
          ))}
        </div>
      </section>
      {funnel.length > 0 ? (
        <section>
          <h4 style={H4}>Métriques réalistes (débutant)</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {funnel.map((f) => (
                <tr key={f.id} style={{ borderBottom: "1px solid var(--ls-border)" }}>
                  <td style={{ padding: "6px 4px" }}>{f.label}</td>
                  <td style={{ padding: "6px 4px", textAlign: "right", fontFamily: "Syne, serif", fontWeight: 600 }}>
                    {formatRange(f.value_min, f.value_max, f.value_unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function FindProspectsModule({
  flags, sources, hashtags, profile,
}: {
  flags: ProspectionProfileFlag[];
  sources: ProspectionSource[];
  hashtags: ProspectionHashtag[];
  profile: ProspectionProfile | null;
}) {
  const green = flags.filter((f) => f.flag_type === "green");
  const red = flags.filter((f) => f.flag_type === "red");
  const mainstream = hashtags.filter((h) => h.category === "mainstream");
  const niche = hashtags.filter((h) => h.category === "niche");
  const cross = hashtags.filter((h) => h.category === "cross");
  const advices = sources.filter((s) => s.kind === "hashtag_advanced");
  const groupedSources = [
    { key: "fb_groups",       label: "Groupes Facebook" },
    { key: "irl",             label: "IRL" },
    { key: "recommendations", label: "Recommandations" },
    { key: "inbound_content", label: "Contenu entrant" },
  ] as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={GREEN_CARD}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>✅ Green flags (envoie le M1)</div>
          {green.map((f) => (
            <div key={f.id} style={{ fontSize: 13, padding: "2px 0" }}>• {f.text}</div>
          ))}
        </div>
        <div style={RED_CARD}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>❌ Red flags (passe ton chemin)</div>
          {red.map((f) => (
            <div key={f.id} style={{ fontSize: 13, padding: "2px 0" }}>• {f.text}</div>
          ))}
        </div>
      </section>
      {advices.length > 0 ? (
        <section>
          <h4 style={H4}>Conseils transverses</h4>
          {advices.map((a) => (
            <article key={a.id} style={INFO_CARD}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
              {a.detail ? (
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)", whiteSpace: "pre-wrap", marginTop: 4 }}>
                  {a.detail}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      <section>
        <h4 style={H4}>Hashtags par catégorie</h4>
        <HashtagRow title="Mainstream (large)" items={mainstream} accent="var(--ls-text-muted)" />
        <HashtagRow title="Niche (segment précis)" items={niche} accent="var(--ls-teal)" />
        <HashtagRow title="Cross (à croiser)" items={cross} accent="var(--ls-gold)" showHint />
        {profile?.hashtag_advice ? (
          <div style={{ ...INFO_CARD, marginTop: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Astuce pour ce profil</div>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4 }}>{profile.hashtag_advice}</div>
          </div>
        ) : null}
      </section>
      <section>
        <h4 style={H4}>Sources alternatives</h4>
        {groupedSources.map(({ key, label }) => {
          const items = sources.filter((s) => s.kind === key);
          if (items.length === 0) return null;
          return (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</div>
              {items.map((it) => (
                <div key={it.id} style={INFO_CARD_TIGHT}>
                  <div style={{ fontSize: 13 }}>{it.label}</div>
                  {it.detail ? <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{it.detail}</div> : null}
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function HashtagRow({
  title, items, accent, showHint,
}: { title: string; items: ProspectionHashtag[]; accent: string; showHint?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginBottom: 4 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((h) => (
          <span key={h.id} style={{ ...TAG, color: accent, borderColor: accent }}>{h.hashtag}</span>
        ))}
      </div>
      {showHint
        ? items.filter((h) => h.crossover_hint).map((h) => (
            <div key={h.id + "-hint"} style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>
              {h.hashtag} — {h.crossover_hint}
            </div>
          ))
        : null}
    </div>
  );
}

function MessagesM1Module({
  scripts, marketCode,
}: { scripts: ProspectionScript[]; marketCode: string }) {
  const m1 = scripts.filter((s) => s.kind === "first_contact");
  if (m1.length === 0) {
    return <Empty>Aucun script M1 pour ce profil sur ce marché.</Empty>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {m1.map((s) => (
        <ScriptCard key={s.id} script={s} marketCode={marketCode} />
      ))}
    </div>
  );
}

function ScriptCard({ script, marketCode }: { script: ProspectionScript; marketCode: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <article style={SCRIPT_CARD}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            width: 26, height: 26, borderRadius: 8, display: "inline-flex",
            alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff",
            background: PLATFORM_GRADIENTS[script.platform],
          }}
        >
          {PLATFORM_ICONS[script.platform]}
        </span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{script.label ?? PLATFORM_LABELS[script.platform]}</span>
        {script.language_label ? <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ls-text-muted)" }}>{script.language_label}</span> : null}
      </header>
      <pre style={SCRIPT_BODY}>{script.body}</pre>
      {marketCode !== "fr" && script.body_fr ? (
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 12, color: "var(--ls-text-muted)", cursor: "pointer" }}>🇫🇷 Voir la traduction française</summary>
          <pre style={{ ...SCRIPT_BODY, marginTop: 4 }}>{script.body_fr}</pre>
        </details>
      ) : null}
      {script.tip ? (
        <div style={TIP_BOX}>💡 {script.tip}</div>
      ) : null}
      <button
        onClick={() => {
          void navigator.clipboard.writeText(script.body);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        style={COPY_BTN}
      >
        {copied ? "✓ Copié" : "Copier le message"}
      </button>
    </article>
  );
}

function ReplyTreeModule({
  nodes, marketCode,
}: { nodes: ProspectionReplyNode[]; marketCode: string }) {
  if (nodes.length === 0) return <Empty>Aucune arborescence pour ce profil sur ce marché.</Empty>;
  const m2 = nodes.filter((n) => n.level === "M2");
  const m3 = nodes.filter((n) => n.level === "M3");
  const branchOrder: Record<string, number> = {
    positive: 1, vague: 2, negative: 3, question: 4, hot: 1, lukewarm: 2,
  };
  const branchLabel: Record<string, string> = {
    positive: "✅ Réponse positive",
    vague: "🤔 Réponse vague",
    negative: "❌ Réponse négative",
    question: "❓ Question",
    hot: "🔥 Conv qui chauffe",
    lukewarm: "🌡️ Conv tiède",
  };
  const sort = (arr: ProspectionReplyNode[]) =>
    [...arr].sort((a, b) => (branchOrder[a.branch] ?? 9) - (branchOrder[b.branch] ?? 9));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section>
        <h4 style={H4}>M2 — Après ton M1</h4>
        {sort(m2).map((n) => <ReplyNodeCard key={n.id} node={n} label={branchLabel[n.branch]} marketCode={marketCode} />)}
      </section>
      {m3.length > 0 ? (
        <section>
          <h4 style={H4}>M3 — La conversation continue</h4>
          {sort(m3).map((n) => <ReplyNodeCard key={n.id} node={n} label={branchLabel[n.branch]} marketCode={marketCode} />)}
        </section>
      ) : null}
    </div>
  );
}

function ReplyNodeCard({ node, label, marketCode }: { node: ProspectionReplyNode; label: string; marketCode: string }) {
  return (
    <article style={INFO_CARD}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{label}</div>
      <pre style={SCRIPT_BODY}>{node.body}</pre>
      {marketCode !== "fr" && node.body_fr ? (
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 12, color: "var(--ls-text-muted)", cursor: "pointer" }}>🇫🇷 Traduction</summary>
          <pre style={{ ...SCRIPT_BODY, marginTop: 4 }}>{node.body_fr}</pre>
        </details>
      ) : null}
      {node.tip ? <div style={TIP_BOX}>💡 {node.tip}</div> : null}
    </article>
  );
}

function ObjectionsModule({ items, marketCode }: { items: ProspectionObjection[]; marketCode: string }) {
  if (items.length === 0) return <Empty>Aucune objection pour ce marché.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((o) => (
        <article key={o.id} style={INFO_CARD}>
          <div style={{ fontFamily: "Syne, serif", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
            « {o.title} »
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginBottom: 8 }}>
            <strong>Ce qu'elle veut dire :</strong> {o.meaning}
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-coral, #e57373)", marginBottom: 8 }}>
            <strong>❌ Mauvaise réponse :</strong> {o.bad_response}
          </div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <strong>✅ Bonne réponse :</strong>
          </div>
          <pre style={SCRIPT_BODY}>{o.good_response}</pre>
          {marketCode !== "fr" && o.good_response_fr ? (
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 12, color: "var(--ls-text-muted)", cursor: "pointer" }}>🇫🇷 Traduction</summary>
              <pre style={{ ...SCRIPT_BODY, marginTop: 4 }}>{o.good_response_fr}</pre>
            </details>
          ) : null}
          {o.warning ? <div style={WARNING_BOX}>⚠️ {o.warning}</div> : null}
        </article>
      ))}
    </div>
  );
}

function FollowupsModule({ items, marketCode }: { items: ProspectionFollowup[]; marketCode: string }) {
  if (items.length === 0) return <Empty>Aucune séquence pour ce marché.</Empty>;
  const groups = [
    { kind: "post_call", label: "📞 Après un appel / Zoom" },
    { kind: "client_onboarding", label: "🎉 Suivi client (après achat)" },
    { kind: "reactivation_old", label: "🔁 Réactivation prospect ancien" },
  ] as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map(({ kind, label }) => {
        const list = items.filter((i) => i.kind === kind).sort((a, b) => a.day_offset - b.day_offset);
        if (list.length === 0) return null;
        return (
          <section key={kind}>
            <h4 style={H4}>{label}</h4>
            {list.map((f) => (
              <article key={f.id} style={INFO_CARD}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{f.title}</div>
                <pre style={SCRIPT_BODY}>{f.body}</pre>
                {marketCode !== "fr" && f.body_fr ? (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 12, color: "var(--ls-text-muted)", cursor: "pointer" }}>🇫🇷 Traduction</summary>
                    <pre style={{ ...SCRIPT_BODY, marginTop: 4 }}>{f.body_fr}</pre>
                  </details>
                ) : null}
                {f.warning ? <div style={WARNING_BOX}>⚠️ {f.warning}</div> : null}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function ClosingModule({ items, marketCode }: { items: ProspectionClosingBlock[]; marketCode: string }) {
  if (items.length === 0) return <Empty>Aucun closing pour ce marché.</Empty>;
  const signals = items.filter((i) => i.kind === "signal");
  const scripts = items.filter((i) => i.kind !== "signal");
  const scriptLabel: Record<string, string> = {
    propose: "Proposer le passage à l'achat",
    hesitation: "Si elle hésite",
    final_no: "Encaisser un non final",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {signals.length > 0 ? (
        <section>
          <h4 style={H4}>Signaux d'achat (elle est prête)</h4>
          {signals.map((s) => (
            <div key={s.id} style={INFO_CARD_TIGHT}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title ?? "Signal"}</div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{s.body}</div>
            </div>
          ))}
        </section>
      ) : null}
      <section>
        <h4 style={H4}>Scripts</h4>
        {scripts.map((s) => (
          <article key={s.id} style={INFO_CARD}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              {s.title ?? scriptLabel[s.kind] ?? s.kind}
            </div>
            <pre style={SCRIPT_BODY}>{s.body}</pre>
            {marketCode !== "fr" && s.body_fr ? (
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontSize: 12, color: "var(--ls-text-muted)", cursor: "pointer" }}>🇫🇷 Traduction</summary>
                <pre style={{ ...SCRIPT_BODY, marginTop: 4 }}>{s.body_fr}</pre>
              </details>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

function SpecialCasesModule({ items, marketCode }: { items: ProspectionSpecialCase[]; marketCode: string }) {
  if (items.length === 0) return <Empty>Aucun cas spécial pour ce marché.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((s) => (
        <article key={s.id} style={INFO_CARD}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{s.title}</div>
          <pre style={SCRIPT_BODY}>{s.body}</pre>
          {marketCode !== "fr" && s.body_fr ? (
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 12, color: "var(--ls-text-muted)", cursor: "pointer" }}>🇫🇷 Traduction</summary>
              <pre style={{ ...SCRIPT_BODY, marginTop: 4 }}>{s.body_fr}</pre>
            </details>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function StorytellingModule({ items }: { items: ProspectionStoryBlock[] }) {
  if (items.length === 0) return <Empty>Pas encore de storytelling pour ce profil sur ce marché.</Empty>;
  const structure = items.filter((i) => i.kind === "structure_step");
  const examples = items.filter((i) => i.kind === "example");
  const rules = items.filter((i) => i.kind === "rule");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {structure.length > 0 ? (
        <section>
          <h4 style={H4}>Structure en 4 temps</h4>
          {structure.map((s, idx) => (
            <div key={s.id} style={INFO_CARD_TIGHT}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{idx + 1}. {s.title}</div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{s.body}</div>
            </div>
          ))}
        </section>
      ) : null}
      {examples.length > 0 ? (
        <section>
          <h4 style={H4}>Exemples</h4>
          {examples.map((e) => (
            <article key={e.id} style={INFO_CARD}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{e.title}</div>
              <pre style={SCRIPT_BODY}>{e.body}</pre>
            </article>
          ))}
        </section>
      ) : null}
      {rules.length > 0 ? (
        <section>
          <h4 style={H4}>Règles pour ton storytelling</h4>
          {rules.map((r) => (
            <div key={r.id} style={INFO_CARD_TIGHT}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>• {r.title}</div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{r.body}</div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function RoutineModule({ items }: { items: ProspectionRoutineItem[] }) {
  if (items.length === 0) return <Empty>Aucune routine pour ce marché.</Empty>;
  const r30 = items.filter((i) => i.kind === "routine_30m");
  const r1h = items.filter((i) => i.kind === "routine_1h");
  const check = items.filter((i) => i.kind === "pre_send_checklist");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {r30.length > 0 ? (
        <section>
          <h4 style={H4}>Routine 30 minutes / jour (débutant)</h4>
          {r30.map((r) => (
            <div key={r.id} style={INFO_CARD_TIGHT}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>
                {r.duration_minutes ? <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>{r.duration_minutes} min</span> : null}
              </div>
              {r.detail ? <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{r.detail}</div> : null}
            </div>
          ))}
        </section>
      ) : null}
      {r1h.length > 0 ? (
        <section>
          <h4 style={H4}>Routine 1 heure / jour (intermédiaire)</h4>
          {r1h.map((r) => (
            <div key={r.id} style={INFO_CARD_TIGHT}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>
                {r.duration_minutes ? <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>{r.duration_minutes} min</span> : null}
              </div>
              {r.detail ? <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>{r.detail}</div> : null}
            </div>
          ))}
        </section>
      ) : null}
      {check.length > 0 ? (
        <section>
          <h4 style={H4}>Checklist avant d'envoyer un M1</h4>
          {check.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", cursor: "pointer" }}>
              <input type="checkbox" style={{ marginTop: 3 }} />
              <span style={{ fontSize: 13 }}>{c.title}</span>
            </label>
          ))}
        </section>
      ) : null}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatRange(min: number | null, max: number | null, unit: string | null): string {
  if (min == null && max == null) return "—";
  const u = unit ? ` ${unit}` : "";
  if (min != null && max != null && min !== max) return `${min} à ${max}${u}`;
  if (min != null) return `${min}${u}`;
  if (max != null) return `${max}${u}`;
  return "—";
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>
      {children}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const STICKY_BAR: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 10,
  background: "var(--ls-surface)",
  paddingBottom: 8,
  borderBottom: "1px solid var(--ls-border)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const PILL: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const PILL_ACTIVE: CSSProperties = {
  background: "color-mix(in srgb, var(--ls-gold) 18%, var(--ls-surface2))",
  borderColor: "var(--ls-gold)",
  color: "var(--ls-text)",
};

const MARKET_TIP_BANNER: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface2))",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const MODULES_GRID: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const MODULE_CARD: CSSProperties = {
  background: "var(--ls-surface2)",
  borderRadius: 14,
  border: "1px solid var(--ls-border)",
  overflow: "hidden",
};

const MODULE_CARD_OPEN: CSSProperties = {
  borderColor: "color-mix(in srgb, var(--ls-gold) 50%, var(--ls-border))",
  boxShadow: "0 4px 20px color-mix(in srgb, var(--ls-gold) 12%, transparent)",
};

const MODULE_HEADER_BTN: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  background: "transparent",
  border: "none",
  color: "var(--ls-text)",
  cursor: "pointer",
  textAlign: "left",
};

const MODULE_CHIP: CSSProperties = {
  padding: "2px 8px",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
  color: "var(--ls-gold)",
  fontSize: 11,
  fontWeight: 600,
  marginLeft: 8,
};

const MODULE_BODY: CSSProperties = {
  padding: "0 16px 16px",
  animation: "lsHubFadeIn 200ms ease",
};

const H4: CSSProperties = {
  fontFamily: "Syne, serif",
  fontSize: 14,
  fontWeight: 600,
  margin: "0 0 8px",
  color: "var(--ls-text)",
};

const INFO_CARD: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  marginBottom: 8,
};

const INFO_CARD_TIGHT: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  marginBottom: 6,
};

const ERROR_CARD: CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-coral, #e57373) 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-coral, #e57373) 30%, var(--ls-border))",
};

const GREEN_CARD: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "color-mix(in srgb, #4ade80 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, #4ade80 30%, var(--ls-border))",
};

const RED_CARD: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "color-mix(in srgb, #ef4444 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, #ef4444 30%, var(--ls-border))",
};

const SCRIPT_CARD: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
};

const SCRIPT_BODY: CSSProperties = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: 13,
  lineHeight: 1.5,
  margin: 0,
  padding: 10,
  background: "color-mix(in srgb, var(--ls-gold) 4%, var(--ls-surface2))",
  borderRadius: 8,
  whiteSpace: "pre-wrap",
  color: "var(--ls-text)",
};

const TIP_BOX: CSSProperties = {
  marginTop: 8,
  padding: "6px 10px",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--ls-teal) 8%, transparent)",
  fontSize: 12,
  color: "var(--ls-text-muted)",
};

const WARNING_BOX: CSSProperties = {
  marginTop: 8,
  padding: "8px 10px",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
  fontSize: 12,
};

const COPY_BTN: CSSProperties = {
  marginTop: 10,
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  cursor: "pointer",
  width: "100%",
};

const TAG: CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  border: "1px solid",
  fontSize: 12,
  background: "var(--ls-surface)",
};

const RESTART_BTN: CSSProperties = {
  alignSelf: "center",
  padding: "10px 18px",
  borderRadius: 999,
  border: "1px dashed var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  cursor: "pointer",
  marginTop: 16,
};

const HUB_KEYFRAMES = `
@keyframes lsHubFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
