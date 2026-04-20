import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { Card } from "../components/ui/Card";
import { useToast } from "../context/ToastContext";
import {
  FOLLOW_UP_PROTOCOL,
  type FollowUpStep,
  type FollowUpStepId,
} from "../data/followUpProtocol";

/**
 * Chantier Protocole de suivi (2026-04-20) — Module 2 : page éducative
 * pour apprendre à accompagner un client de J+1 à J+14. Accordéon par
 * étape, deep link depuis la popup fiche client via `/guide-suivi#<stepId>`.
 */
export function FollowUpGuidePage() {
  const location = useLocation();
  const { push: pushToast } = useToast();
  const [openSteps, setOpenSteps] = useState<Set<FollowUpStepId>>(new Set());

  // Au montage : si hash ou ?step → ouvrir la card correspondante + scroll.
  useEffect(() => {
    const hash = (location.hash || "").replace(/^#/, "");
    const search = new URLSearchParams(location.search);
    const focused = (search.get("step") || hash || "").toLowerCase() as FollowUpStepId;
    if (["j1", "j3", "j7", "j10", "j14"].includes(focused)) {
      setOpenSteps((prev) => {
        const next = new Set(prev);
        next.add(focused);
        return next;
      });
      // Laisser le DOM monter avant de scroller
      setTimeout(() => {
        const el = document.getElementById(`step-${focused}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }, [location.hash, location.search]);

  function toggle(stepId: FollowUpStepId) {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }

  async function copyTypeMessage(step: FollowUpStep) {
    try {
      await navigator.clipboard.writeText(step.clientMessage);
      pushToast({ tone: "success", title: "Message type copié" });
    } catch {
      pushToast({ tone: "warning", title: "Copie impossible", message: "Ton navigateur bloque le presse-papier." });
    }
  }

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Guide"
        title="Guide suivi client"
        description="Apprends à accompagner tes clients de J+1 à J+14 : objectifs, actions, ajustements et messages types."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FOLLOW_UP_PROTOCOL.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            open={openSteps.has(step.id)}
            onToggle={() => toggle(step.id)}
            onCopy={() => void copyTypeMessage(step)}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({
  step,
  open,
  onToggle,
  onCopy,
}: {
  step: FollowUpStep;
  open: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const summary = useMemo(() => {
    // Récap court : premiers focus produits + 1er action clé
    const focus = step.coachGuide.productsFocus[0] ?? "";
    return [step.coachGuide.keyActions[0], focus].filter(Boolean).join(" · ");
  }, [step]);

  return (
    <Card id={`step-${step.id}`} className="space-y-0" style={{ padding: 0 }}>
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`step-${step.id}-content`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "color-mix(in srgb, var(--ls-gold) 10%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 18,
          }}
        >
          {step.iconEmoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>
            J+{step.dayOffset}
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-text)", marginTop: 2 }}>
            {step.title.split("·")[1]?.trim() ?? step.shortTitle}
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
            {summary}
          </div>
        </div>
        <div
          aria-hidden="true"
          style={{
            fontSize: 18,
            color: "var(--ls-text-muted)",
            flexShrink: 0,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 180ms ease",
          }}
        >
          ›
        </div>
      </button>

      {/* Contenu déployé */}
      {open && (
        <div
          id={`step-${step.id}-content`}
          style={{
            borderTop: "1px solid var(--ls-border)",
            padding: "18px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--ls-text)",
          }}
        >
          <Section icon="🎯" label="Objectif">
            <p style={{ margin: 0 }}>{step.coachGuide.objective}</p>
          </Section>

          <Section icon="✅" label="Actions clés">
            <BulletList items={step.coachGuide.keyActions} />
          </Section>

          <Section icon="🔧" label="Ajustements à proposer">
            <BulletList items={step.coachGuide.adjustments} />
          </Section>

          <Section icon="🥤" label="Focus produits">
            <BulletList items={step.coachGuide.productsFocus} />
          </Section>

          {step.coachGuide.sharingScript && (
            <Section icon="🗣️" label="Script de partage">
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "color-mix(in srgb, var(--ls-teal) 6%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--ls-teal) 18%, transparent)",
                  fontStyle: "italic",
                  color: "var(--ls-text)",
                }}
              >
                {step.coachGuide.sharingScript}
              </div>
            </Section>
          )}

          <Section icon="🧯" label="Notes distributeur">
            <BulletList items={step.coachGuide.distributorNotes} />
          </Section>

          <div style={{ height: 1, background: "var(--ls-border)", marginTop: 4 }} />

          <Section icon="💬" label={`Message type pour le client`}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "var(--ls-surface2)",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-text)",
                whiteSpace: "pre-wrap",
                marginBottom: 10,
              }}
            >
              {step.clientMessage}
            </div>
            <button
              type="button"
              onClick={onCopy}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              📋 Copier ce texte type
            </button>
          </Section>
        </div>
      )}
    </Card>
  );
}

function Section({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: 10,
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--ls-text)",
          }}
        >
          <span style={{ color: "var(--ls-gold)", flexShrink: 0, marginTop: 1 }} aria-hidden="true">
            •
          </span>
          <span style={{ flex: 1 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
