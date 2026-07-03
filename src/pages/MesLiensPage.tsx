// =============================================================================
// MesLiensPage — hub « Mes liens » (chantier audit 2026-06-12, maquette validée
// par Thomas). Regroupe en un seul endroit les 6 liens publics que le coach
// partage, avec Copier / QR / WhatsApp prêts à l'emploi. Fini de les chercher
// éparpillés (bilan dans le CRM, business dans la fiche client, etc.).
//
// Chaque lien injecte automatiquement le slug du coach (son prénom normalisé).
// =============================================================================

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { RdvAvailabilityCard } from "../components/settings/RdvAvailabilityCard";

interface LinkDef {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  desc: string;
  url: string;
  /** Message WhatsApp pré-rédigé (le lien est ajouté à la fin). */
  waIntro: string;
}

function coachSlug(name: string | undefined): string {
  return (name ?? "")
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function MesLiensPage() {
  const { currentUser } = useAppContext();
  const { push } = useToast();
  const [qr, setQr] = useState<LinkDef | null>(null);

  const slug = coachSlug(currentUser?.name);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const links: { section: string; items: LinkDef[] }[] = useMemo(() => {
    const ref = currentUser?.id ?? slug;
    return [
      {
        section: "🎯 Capter & convertir",
        items: [
          {
            id: "bilan",
            icon: "🌱",
            iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
            name: "Bilan online",
            desc: "Le questionnaire 2 min qui transforme un curieux en lead.",
            url: `${origin}/bilan-online/${slug}`,
            waIntro: "Salut 👋 Je te partage un petit bilan bien-être gratuit (2 min) pour voir ce qui te ferait du bien en ce moment 🌿",
          },
          {
            id: "business",
            icon: "💼",
            iconBg: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
            name: "Opportunité business",
            desc: "Présente l'opportunité La Base 360 à un prospect.",
            url: `${origin}/business?ref=${ref}`,
            waIntro: "Salut 👋 Je pense que ça pourrait t'intéresser — voilà comment fonctionne notre activité :",
          },
          {
            id: "rejoindre",
            icon: "🚪",
            iconBg: "color-mix(in srgb, var(--ls-coral) 16%, transparent)",
            name: "Rejoindre l'équipe",
            desc: "Le funnel de recrutement (questionnaire qualifiant).",
            url: `${origin}/rejoindre/${slug}`,
            waIntro: "Salut 👋 Si tu veux en savoir plus sur l'idée de bosser ensemble, réponds à ces quelques questions :",
          },
        ],
      },
      {
        section: "🌟 Crédibilité & preuve sociale",
        items: [
          {
            id: "coach",
            icon: "👤",
            iconBg: "color-mix(in srgb, var(--ls-purple) 18%, transparent)",
            name: "Ma fiche coach",
            desc: "Ta vitrine publique (bio, badges, témoignages).",
            url: `${origin}/coach/${slug}`,
            waIntro: "Voici ma page coach si tu veux en savoir plus sur mon accompagnement 🌿",
          },
          {
            id: "vip",
            icon: "👑",
            iconBg: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
            name: "Club VIP",
            desc: "La page des remises clients (15 → 35 %).",
            url: `${origin}/vip/${slug}`,
            waIntro: "Regarde, tu peux profiter de remises sur ta nutrition en devenant client privilégié 👑",
          },
          {
            id: "temoignage",
            icon: "💬",
            iconBg: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
            name: "Demander un témoignage",
            desc: "Le formulaire que tes clients remplissent en 30 s.",
            url: `${origin}/temoignage/coach/${slug}`,
            waIntro: "Est-ce que tu pourrais m'aider en partageant ton ressenti sur notre accompagnement ? Ça prend 30 s 🙏",
          },
        ],
      },
    ];
  }, [origin, slug, currentUser?.id]);

  function copy(link: LinkDef) {
    void navigator.clipboard?.writeText(link.url).then(() =>
      push({ tone: "success", title: "Lien copié", message: link.name }),
    );
  }
  // Prévisualiser/ouvrir la page publique dans un nouvel onglet (demande Thomas
  // 2026-06-13 : voir son bilan, sa page opportunité, sa fiche VIP avant de partager).
  function openLink(link: LinkDef) {
    window.open(link.url, "_blank", "noopener");
  }
  function whatsapp(link: LinkDef) {
    const text = `${link.waIntro}\n${link.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  if (!slug) {
    return (
      <div style={{ padding: "40px 22px", textAlign: "center", color: "var(--ls-text-muted)" }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🔗</div>
        Renseigne ton prénom dans les Paramètres pour générer tes liens.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 4px 60px" }}>
      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--ls-teal)" }}>
        Tout au même endroit
      </div>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: "clamp(26px,5vw,32px)", letterSpacing: "-0.5px", margin: "8px 0 4px", color: "var(--ls-text)" }}>
        Mes{" "}
        <span style={{ background: "linear-gradient(135deg,var(--ls-teal),var(--ls-purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          liens
        </span>
      </h1>
      <p style={{ color: "var(--ls-text-muted)", fontSize: 14, marginBottom: 22, fontFamily: "DM Sans, sans-serif" }}>
        Tous tes liens à partager, prêts à copier — fini de les chercher partout.
      </p>

      {links.map((grp) => (
        <div key={grp.section}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ls-text-muted)", margin: "22px 4px 10px" }}>
            {grp.section}
          </div>
          {grp.items.map((link) => (
            <div
              key={link.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                background: "var(--ls-surface)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 15,
                padding: "13px 15px",
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "0 0 auto", width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: link.iconBg }}>
                {link.icon}
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>{link.name}</div>
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 1 }}>{link.desc}</div>
                <div style={{ fontSize: 11, color: "var(--ls-teal)", fontFamily: "monospace", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {link.url.replace(/^https?:\/\//, "")}
                </div>
              </div>
              <div style={{ flex: "0 0 auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <ActionBtn onClick={() => openLink(link)}>👁 Ouvrir</ActionBtn>
                <ActionBtn onClick={() => copy(link)}>📋 Copier</ActionBtn>
                <ActionBtn onClick={() => setQr(link)}>⬚ QR</ActionBtn>
                <button
                  type="button"
                  onClick={() => whatsapp(link)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 11px", borderRadius: 9, border: "none", background: "#25D366", color: "#06241f", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 20, padding: "12px 15px", borderRadius: 13, background: "color-mix(in srgb, var(--ls-teal) 6%, transparent)", border: "0.5px solid color-mix(in srgb, var(--ls-teal) 22%, transparent)", fontSize: 12.5, color: "var(--ls-text-muted)" }}>
        💡 Chaque lien utilise <strong style={{ color: "var(--ls-text)" }}>ton slug</strong> ({slug}) automatiquement. <strong style={{ color: "var(--ls-text)" }}>QR</strong> = à scanner en présentiel · <strong style={{ color: "var(--ls-text)" }}>WhatsApp</strong> = message pré-rédigé.
      </div>

      {/* Disponibilités RDV (refonte Paramètres 2026-07-02) : accessibles ici
          car elles alimentent la réservation depuis le bilan online / le lien.
          Même composant que Paramètres → Disponibilités (édition synchronisée). */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ls-text-muted)", margin: "26px 4px 10px" }}>
        🗓️ Tes disponibilités RDV
      </div>
      <p style={{ color: "var(--ls-text-muted)", fontSize: 13, margin: "0 4px 12px", fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 }}>
        Déclare tes créneaux ici : les prospects qui terminent ton bilan online peuvent réserver dans ces plages
        (aussi éditable dans Paramètres → Disponibilités).
      </p>
      <RdvAvailabilityCard />

      {/* Modale QR */}
      {qr ? (
        <div
          onClick={() => setQr(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(11,13,17,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 18, padding: 22, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)", marginBottom: 4 }}>{qr.name}</div>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginBottom: 16 }}>Fais scanner ce code à ton prospect</div>
            <div style={{ background: "#fff", padding: 16, borderRadius: 14, display: "inline-block", boxShadow: "0 0 24px color-mix(in srgb, var(--ls-gold) 30%, transparent)" }}>
              <QRCodeSVG value={qr.url} size={200} />
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-teal)", fontFamily: "monospace", margin: "14px 0 16px", wordBreak: "break-all" }}>
              {qr.url.replace(/^https?:\/\//, "")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <ActionBtn onClick={() => copy(qr)} grow>📋 Copier le lien</ActionBtn>
              <button type="button" onClick={() => setQr(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "var(--ls-gold)", color: "#1a1407", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Syne, sans-serif" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn({ children, onClick, grow }: { children: React.ReactNode; onClick: () => void; grow?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: grow ? 1 : "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        padding: grow ? "10px 0" : "7px 11px",
        borderRadius: grow ? 10 : 9,
        border: "0.5px solid var(--ls-border2, var(--ls-border))",
        background: "var(--ls-surface2)",
        color: "var(--ls-text)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {children}
    </button>
  );
}
