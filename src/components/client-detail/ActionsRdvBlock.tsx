// Chantier Refonte onglet Actions — bloc RDV premium (2026-04-26).
// Composant unique qui gère les 5 priorités du hook useClientPriorityAction
// ET les 2 états du RDV (existe / n'existe pas). Matrice :
//
//   priority.type            | RDV       | Rendu
//   ─────────────────────────┼───────────┼───────────────────────────────
//   plan_rdv                 | absent    | Bloc beige "Planifier un RDV"
//   complete_initial         | absent    | PriorityBanner seul (gold)
//   send_followup            | absent    | PriorityBanner seul (gold)
//   request_share_consent    | absent    | PriorityBanner seul (gold)
//   ok                       | absent    | Fallback teal "Tout est à jour"
//   complete_initial         | existe    | PriorityBanner gold + RdvCompact
//   send_followup            | existe    | idem
//   request_share_consent    | existe    | idem
//   ok                       | existe    | RdvCardPremium (menu 4 options)
//
// Pas de librairie d'icônes : SVG inline. Couleurs via var(--ls-*) sauf
// logos tiers (Google bleu, WhatsApp #25D366) qui gardent leur identité.

import type { FollowUp } from "../../types/domain";
import type { PriorityAction } from "../../hooks/useClientPriorityAction";
import { createIcsDataUri, createGoogleCalendarLink } from "../../lib/googleCalendar";
import "./ActionsRdvBlock.css";

interface Props {
  priority: PriorityAction;
  activeFollowUp: FollowUp | null;
  clientFirstName: string;
  clientLastName: string;
  clientPhone?: string;
  onPriorityCta: () => void;
  onEditRdv: () => void;
}

export function ActionsRdvBlock({
  priority,
  activeFollowUp,
  clientFirstName,
  clientLastName,
  clientPhone,
  onPriorityCta,
  onEditRdv,
}: Props) {
  const hasRdv = Boolean(
    activeFollowUp && !Number.isNaN(new Date(activeFollowUp.dueDate).getTime()),
  );
  const isOkPriority = priority.type === "ok";
  const isPlanRdvPriority = priority.type === "plan_rdv";

  // ─── État prestige : RDV existe + aucune autre priorité ────────────
  if (hasRdv && isOkPriority) {
    return (
      <div className="arb-wrapper">
        <RdvCardPremium
          rdv={activeFollowUp!}
          clientFirstName={clientFirstName}
          clientLastName={clientLastName}
          clientPhone={clientPhone}
          onEditRdv={onEditRdv}
        />
      </div>
    );
  }

  // ─── Pas de RDV : soit Plan RDV beige, soit priority banner ──────
  if (!hasRdv) {
    if (isPlanRdvPriority) {
      return (
        <div className="arb-wrapper">
          <PlanRdvBeigeBanner priority={priority} onClick={onPriorityCta} />
        </div>
      );
    }
    return (
      <div className="arb-wrapper">
        <PriorityBanner priority={priority} onClick={onPriorityCta} />
      </div>
    );
  }

  // ─── RDV existe ET priorité non-ok : banner + card RDV compacte ───
  return (
    <div className="arb-wrapper">
      <PriorityBanner priority={priority} onClick={onPriorityCta} />
      <RdvCardCompact
        rdv={activeFollowUp!}
        clientFirstName={clientFirstName}
        clientLastName={clientLastName}
        clientPhone={clientPhone}
        onEditRdv={onEditRdv}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sous-composants
// ═══════════════════════════════════════════════════════════════════════

function PlanRdvBeigeBanner({
  priority,
  onClick,
}: {
  priority: PriorityAction;
  onClick: () => void;
}) {
  return (
    <div className="arb-empty">
      <div className="arb-empty__icon" aria-hidden="true">
        <CalendarIcon size={20} />
      </div>
      <div className="arb-empty__content">
        <div className="arb-empty__label">À FAIRE MAINTENANT</div>
        <div className="arb-empty__title">{priority.title}</div>
        <div className="arb-empty__hint">{priority.meta}</div>
      </div>
      <button type="button" onClick={onClick} className="arb-empty__cta">
        {priority.ctaLabel}
      </button>
    </div>
  );
}

function PriorityBanner({
  priority,
  onClick,
}: {
  priority: PriorityAction;
  onClick: () => void;
}) {
  const scheme = priority.colorScheme === "teal" ? "teal" : "gold";
  return (
    <div className={`arb-priority arb-priority--${scheme}`}>
      <div className="arb-priority__icon" aria-hidden="true">
        <span>{priority.icon}</span>
      </div>
      <div className="arb-priority__content">
        <div className="arb-priority__label">À FAIRE MAINTENANT</div>
        <div className="arb-priority__title">{priority.title}</div>
        <div className="arb-priority__hint">{priority.meta}</div>
      </div>
      <button type="button" onClick={onClick} className="arb-priority__cta">
        {priority.ctaLabel}
      </button>
    </div>
  );
}

// ─── Card "PROCHAIN RDV" premium (état prestige) ─────────────────────
function RdvCardPremium({
  rdv,
  clientFirstName,
  clientLastName,
  clientPhone,
  onEditRdv,
}: {
  rdv: FollowUp;
  clientFirstName: string;
  clientLastName: string;
  clientPhone?: string;
  onEditRdv: () => void;
}) {
  const rdvDate = new Date(rdv.dueDate);
  const dateLabel = formatFrenchDate(rdvDate);
  const countdown = formatCountdown(rdvDate);

  const googleUrl = createGoogleCalendarLink({
    title: `RDV Lor'Squad · ${clientFirstName} ${clientLastName}`,
    startDate: rdvDate,
    endDate: new Date(rdvDate.getTime() + 45 * 60 * 1000),
    description: rdv.type ? `Type : ${rdv.type}` : undefined,
    location: "La Base · Verdun",
  });

  const icsUri = createIcsDataUri({
    title: `RDV Lor'Squad · ${clientFirstName} ${clientLastName}`,
    startDate: rdvDate,
    endDate: new Date(rdvDate.getTime() + 45 * 60 * 1000),
    description: rdv.type ? `Type : ${rdv.type}` : undefined,
    location: "La Base · Verdun",
  });
  const icsFileName = `rdv-labase-${rdvDate.toISOString().slice(0, 10)}.ics`;

  const whatsAppHref = buildWhatsAppHref(clientPhone, clientFirstName, rdvDate);

  return (
    <div className="arb-rdv-card">
      <header className="arb-rdv-card__header">
        <div className="arb-rdv-card__badge">
          <span className="arb-rdv-card__badge-icon" aria-hidden="true">
            <CalendarIcon size={14} color="white" />
          </span>
          <span>PROCHAIN RDV</span>
        </div>
        <div className="arb-rdv-card__date-row">
          <span className="arb-rdv-card__date">{dateLabel}</span>
          <span className="arb-rdv-card__countdown">{countdown}</span>
        </div>
      </header>
      <div className="arb-rdv-card__menu">
        <div className="arb-rdv-card__menu-label">AJOUTER CE RDV</div>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="arb-rdv-card__menu-item"
        >
          <div
            className="arb-rdv-card__menu-icon arb-rdv-card__menu-icon--google"
            aria-hidden="true"
          >
            <GoogleLogo />
          </div>
          <div className="arb-rdv-card__menu-text">
            <div className="arb-rdv-card__menu-title">Google Agenda</div>
            <div className="arb-rdv-card__menu-hint">Ouvre dans un nouvel onglet</div>
          </div>
          <span className="arb-rdv-card__menu-chevron" aria-hidden="true">
            ›
          </span>
        </a>
        <a
          href={icsUri}
          download={icsFileName}
          className="arb-rdv-card__menu-item"
        >
          <div
            className="arb-rdv-card__menu-icon arb-rdv-card__menu-icon--apple"
            aria-hidden="true"
          >
            <CalendarIcon size={16} />
          </div>
          <div className="arb-rdv-card__menu-text">
            <div className="arb-rdv-card__menu-title">Apple / Outlook (.ics)</div>
            <div className="arb-rdv-card__menu-hint">Télécharge un fichier calendrier</div>
          </div>
          <span className="arb-rdv-card__menu-chevron" aria-hidden="true">
            ›
          </span>
        </a>
        <button type="button" onClick={onEditRdv} className="arb-rdv-card__menu-item">
          <div
            className="arb-rdv-card__menu-icon arb-rdv-card__menu-icon--edit"
            aria-hidden="true"
          >
            <PencilIcon />
          </div>
          <div className="arb-rdv-card__menu-text">
            <div className="arb-rdv-card__menu-title">Modifier le RDV</div>
            <div className="arb-rdv-card__menu-hint">Changer date ou heure</div>
          </div>
          <span className="arb-rdv-card__menu-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        {whatsAppHref ? (
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="arb-rdv-card__menu-item"
          >
            <div
              className="arb-rdv-card__menu-icon arb-rdv-card__menu-icon--whatsapp"
              aria-hidden="true"
            >
              <WhatsAppLogo />
            </div>
            <div className="arb-rdv-card__menu-text">
              <div className="arb-rdv-card__menu-title">Envoyer au client (WhatsApp)</div>
              <div className="arb-rdv-card__menu-hint">Rappel date et heure</div>
            </div>
            <span className="arb-rdv-card__menu-chevron" aria-hidden="true">
              ›
            </span>
          </a>
        ) : (
          <div className="arb-rdv-card__menu-item arb-rdv-card__menu-item--disabled">
            <div
              className="arb-rdv-card__menu-icon arb-rdv-card__menu-icon--whatsapp"
              aria-hidden="true"
            >
              <WhatsAppLogo />
            </div>
            <div className="arb-rdv-card__menu-text">
              <div className="arb-rdv-card__menu-title">WhatsApp client</div>
              <div className="arb-rdv-card__menu-hint">Numéro non renseigné</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card RDV compacte (sous une priorité non-RDV + RDV existe) ────
function RdvCardCompact({
  rdv,
  clientFirstName,
  clientLastName,
  clientPhone,
  onEditRdv,
}: {
  rdv: FollowUp;
  clientFirstName: string;
  clientLastName: string;
  clientPhone?: string;
  onEditRdv: () => void;
}) {
  const rdvDate = new Date(rdv.dueDate);
  const dateLabel = formatFrenchDate(rdvDate);
  const countdown = formatCountdown(rdvDate);

  const icsUri = createIcsDataUri({
    title: `RDV Lor'Squad · ${clientFirstName} ${clientLastName}`,
    startDate: rdvDate,
    endDate: new Date(rdvDate.getTime() + 45 * 60 * 1000),
    location: "La Base · Verdun",
  });
  const icsFileName = `rdv-labase-${rdvDate.toISOString().slice(0, 10)}.ics`;
  const googleUrl = createGoogleCalendarLink({
    title: `RDV Lor'Squad · ${clientFirstName} ${clientLastName}`,
    startDate: rdvDate,
    endDate: new Date(rdvDate.getTime() + 45 * 60 * 1000),
    location: "La Base · Verdun",
  });
  const whatsAppHref = buildWhatsAppHref(clientPhone, clientFirstName, rdvDate);

  return (
    <div className="arb-rdv-compact">
      <div className="arb-rdv-compact__main">
        <div className="arb-rdv-compact__badge" aria-hidden="true">
          <CalendarIcon size={16} />
        </div>
        <div className="arb-rdv-compact__text">
          <div className="arb-rdv-compact__label">PROCHAIN RDV</div>
          <div className="arb-rdv-compact__date">
            {dateLabel}
            <span className="arb-rdv-compact__countdown"> · {countdown}</span>
          </div>
        </div>
      </div>
      <div className="arb-rdv-compact__actions">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="arb-rdv-compact__btn"
          title="Google Agenda"
          aria-label="Ajouter à Google Agenda"
        >
          <GoogleLogo />
        </a>
        <a
          href={icsUri}
          download={icsFileName}
          className="arb-rdv-compact__btn"
          title="Télécharger .ics"
          aria-label="Télécharger le fichier .ics"
        >
          <CalendarIcon size={16} />
        </a>
        <button
          type="button"
          onClick={onEditRdv}
          className="arb-rdv-compact__btn"
          title="Modifier le RDV"
          aria-label="Modifier le RDV"
        >
          <PencilIcon />
        </button>
        {whatsAppHref ? (
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="arb-rdv-compact__btn"
            title="Rappel WhatsApp"
            aria-label="Envoyer un rappel WhatsApp"
          >
            <WhatsAppLogo />
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers date + URLs
// ═══════════════════════════════════════════════════════════════════════

function formatFrenchDate(d: Date): string {
  const date = d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function formatCountdown(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffMs < 0) return "Passé";
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Demain";
  return `Dans ${diffDays} j`;
}

function buildWhatsAppHref(
  phone: string | undefined,
  clientFirstName: string,
  rdvDate: Date,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const dateStr = rdvDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = rdvDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const msg = encodeURIComponent(
    `Bonjour ${clientFirstName}, je te rappelle notre RDV ${dateStr} à ${timeStr} chez Lor'Squad. À très vite ! 💪`,
  );
  return `https://wa.me/${digits}?text=${msg}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Icônes SVG inline (pas de lib externe)
// ═══════════════════════════════════════════════════════════════════════

function CalendarIcon({
  size = 18,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <line x1="3" y1="11" x2="21" y2="11" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

function WhatsAppLogo() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.304-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
