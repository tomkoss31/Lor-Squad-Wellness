// Chantier Academy pages démo (2026-04-28).
// Fiche client mockup pour les sections Academy "program" et "client-app".
// Cliente fictive "Sarah Martin", données seedées en const.
// Spotlights ciblables :
//   - data-tour-id="program-recommendations" sur la card Programme
//   - data-tour-id="client-send-access" sur le bouton gold
//   - data-tour-id="client-access-qr" + "client-access-share" dans la modale
//
// Aucun fetch DB, aucune persistance. Le bouton "Envoyer l'accès" ouvre
// une fake modale visuellement identique a ClientAccessModal.

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { DemoBanner } from "../../features/academy/components/DemoBanner";

const DEMO_CLIENT = {
  firstName: "Sarah",
  lastName: "Martin",
  age: 34,
  city: "Verdun",
  phone: "+33 6 12 34 56 78",
  lifecycleStatus: "active",
  initial: "SM",
  startedAt: "2026-03-15",
  weight: 68,
  weightDelta: -3.2,
  bodyFat: 24,
  bodyFatDelta: -2.1,
  muscleMass: 28,
  muscleMassDelta: +1.4,
  hydration: 56,
  hydrationDelta: +0.8,
  objective: "weight-loss" as const,
};

const DEMO_PRODUCTS = [
  { id: "f1-vanille", name: "Formula 1 Vanille", quantity: 2, pv: 23, price: 56, durationDays: 30, icon: "🥤" },
  { id: "the-concentre", name: "Thé Concentré 50g", quantity: 1, pv: 17, price: 42, durationDays: 60, icon: "🍵" },
  { id: "aloe", name: "Aloe Vera Original", quantity: 1, pv: 19, price: 48, durationDays: 30, icon: "🌿" },
  { id: "phyto", name: "Phyto Complete", quantity: 1, pv: 21, price: 52, durationDays: 30, icon: "🌱" },
];

const DEMO_FAKE_URL = "https://lor-squad-wellness.vercel.app/client/demo-academy-token-12345";

export function DemoFicheClient() {
  const [searchParams] = useSearchParams();
  const [accessModalOpen, setAccessModalOpen] = useState(
    searchParams.get("openAccessModal") === "true",
  );
  const [showQr, setShowQr] = useState(true);

  const totalPv = DEMO_PRODUCTS.reduce((acc, p) => acc + p.pv * p.quantity, 0);
  const totalPrice = DEMO_PRODUCTS.reduce((acc, p) => acc + p.price * p.quantity, 0);

  return (
    <div className="space-y-5" style={{ paddingBottom: 40 }}>
      <DemoBanner label="Fiche client démo — Sarah Martin (données fictives)" />

      {/* Header client */}
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #B8922A, #BA7517)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, serif",
              fontSize: 20,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {DEMO_CLIENT.initial}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontSize: 24,
                fontWeight: 500,
                color: "var(--ls-text)",
                margin: 0,
              }}
            >
              {DEMO_CLIENT.firstName} {DEMO_CLIENT.lastName}
            </h1>
            <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "4px 0 0" }}>
              {DEMO_CLIENT.age} ans · {DEMO_CLIENT.city} · {DEMO_CLIENT.phone}
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={() => setAccessModalOpen(true)}
              data-tour-id="client-send-access"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] px-4 py-2 text-sm font-semibold text-white transition"
              style={{
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                boxShadow: "0 2px 6px rgba(186,117,23,0.25)",
                fontFamily: "DM Sans, sans-serif",
                border: "none",
                cursor: "pointer",
              }}
            >
              🔗 Envoyer l&apos;accès à l&apos;app
            </button>
          </div>
        </div>
      </div>

      {/* Body scan évolution mockée */}
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          Évolution depuis le bilan initial
        </p>
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontSize: 18,
            fontWeight: 500,
            color: "var(--ls-text)",
            margin: "4px 0 16px",
          }}
        >
          6 semaines de suivi
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          <MetricTile
            label="Poids"
            value={`${DEMO_CLIENT.weight} kg`}
            delta={DEMO_CLIENT.weightDelta}
            color="#B8922A"
            icon="⚖️"
          />
          <MetricTile
            label="Masse grasse"
            value={`${DEMO_CLIENT.bodyFat} %`}
            delta={DEMO_CLIENT.bodyFatDelta}
            color="#D85A30"
            icon="🔥"
          />
          <MetricTile
            label="Masse musculaire"
            value={`${DEMO_CLIENT.muscleMass} kg`}
            delta={DEMO_CLIENT.muscleMassDelta}
            color="#1D9E75"
            icon="💪"
            higherIsBetter
          />
          <MetricTile
            label="Hydratation"
            value={`${DEMO_CLIENT.hydration} %`}
            delta={DEMO_CLIENT.hydrationDelta}
            color="#7F77DD"
            icon="💧"
            higherIsBetter
          />
        </div>
      </div>

      {/* Programme actuel (TARGET program-recommendations) */}
      <div
        data-tour-id="program-recommendations"
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                color: "var(--ls-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: 0,
              }}
            >
              Programme actuel
            </p>
            <h2
              style={{
                fontFamily: "Syne, serif",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--ls-text)",
                margin: "4px 0 0",
              }}
            >
              Produits du client
            </h2>
            <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: "4px 0 0" }}>
              Programme perte de poids — recommandation auto Lor&apos;Squad
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontFamily: "Syne, serif",
                fontSize: 22,
                fontWeight: 600,
                color: "#B8922A",
                margin: 0,
              }}
            >
              {totalPv} PV
            </p>
            <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: 0 }}>
              {totalPrice} €/mois
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DEMO_PRODUCTS.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                background: "var(--ls-surface2)",
                borderRadius: 10,
                border: "0.5px solid var(--ls-border)",
              }}
            >
              <span style={{ fontSize: 22 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ls-text)", margin: 0 }}>
                  {p.name} {p.quantity > 1 ? `× ${p.quantity}` : ""}
                </p>
                <p style={{ fontSize: 11, color: "var(--ls-text-muted)", margin: "2px 0 0" }}>
                  Renouvellement dans {p.durationDays} jours
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontFamily: "Syne, serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#B8922A",
                    margin: 0,
                  }}
                >
                  {p.pv * p.quantity} PV
                </p>
                <p style={{ fontSize: 11, color: "var(--ls-text-muted)", margin: 0 }}>
                  {p.price * p.quantity} €
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modale d'accès fake */}
      {accessModalOpen ? (
        <FakeAccessModal
          showQr={showQr}
          onToggleQr={() => setShowQr((v) => !v)}
          onClose={() => setAccessModalOpen(false)}
          firstName={DEMO_CLIENT.firstName}
          url={DEMO_FAKE_URL}
        />
      ) : null}
    </div>
  );
}

function MetricTile({
  label,
  value,
  delta,
  color,
  icon,
  higherIsBetter,
}: {
  label: string;
  value: string;
  delta: number;
  color: string;
  icon: string;
  higherIsBetter?: boolean;
}) {
  const positive = higherIsBetter ? delta > 0 : delta < 0;
  const deltaColor = delta === 0 ? "#888" : positive ? "#1D9E75" : "#D85A30";
  const deltaSign = delta > 0 ? "+" : "";
  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontFamily: "Syne, serif",
          fontSize: 22,
          fontWeight: 600,
          color,
          margin: 0,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 12, color: deltaColor, fontWeight: 500, margin: "4px 0 0" }}>
        {deltaSign}
        {delta.toFixed(1)} {label === "Poids" || label === "Masse musculaire" ? "kg" : "%"}
      </p>
    </div>
  );
}

function FakeAccessModal({
  showQr,
  onToggleQr,
  onClose,
  firstName,
  url,
}: {
  showQr: boolean;
  onToggleQr: () => void;
  onClose: () => void;
  firstName: string;
  url: string;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: "white",
          borderRadius: 16,
          maxWidth: 440,
          width: "100%",
          padding: 22,
          fontFamily: "DM Sans, sans-serif",
          color: "#0B0D11",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ fontFamily: "Syne, serif", fontSize: 18, fontWeight: 500, margin: 0 }}>
              Envoyer l&apos;accès à {firstName}
            </h2>
            <p style={{ fontSize: 12, color: "#6b6f7a", margin: "4px 0 0" }}>
              Lien personnel valide 1 an
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              color: "#888",
              cursor: "pointer",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            background: "rgba(186,117,23,0.06)",
            border: "1px dashed rgba(186,117,23,0.3)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
            fontSize: 12,
            color: "#5C3A05",
          }}
        >
          🎓 Mode démo — aucun token réel n&apos;est généré.
        </div>

        {showQr ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: 16,
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E5DFCF",
              marginBottom: 12,
            }}
          >
            <div data-tour-id="client-access-qr">
              <QRCodeSVG
                value={url}
                size={180}
                level="M"
                includeMargin={false}
                fgColor="#0B0D11"
                bgColor="#FFFFFF"
              />
            </div>
            <div style={{ fontSize: 11, color: "#6b6f7a", textAlign: "center" }}>
              Scan par {firstName} pour ouvrir le lien directement
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggleQr}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 10,
            background: "transparent",
            border: "1px dashed #E5DFCF",
            color: "#888",
            cursor: "pointer",
            fontSize: 12,
            marginBottom: 10,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {showQr ? "Masquer le QR code" : "📱 Afficher le QR code (présentiel)"}
        </button>

        <div
          data-tour-id="client-access-share"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}
        >
          <button
            type="button"
            style={{
              padding: "11px 12px",
              borderRadius: 10,
              background: "#25D366",
              border: "none",
              color: "#FFFFFF",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            📱 WhatsApp
          </button>
          <button
            type="button"
            style={{
              padding: "11px 12px",
              borderRadius: 10,
              background: "rgba(45,212,191,0.12)",
              border: "1px solid rgba(45,212,191,0.3)",
              color: "#2DD4BF",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            💬 SMS
          </button>
        </div>

        <button
          type="button"
          style={{
            width: "100%",
            padding: "11px 12px",
            borderRadius: 10,
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            border: "none",
            color: "#FFFFFF",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          📋 Copier le lien
        </button>
      </div>
    </div>
  );
}
