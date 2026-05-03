// =============================================================================
// AdminDistributorCharterPage — route /distributeurs/:id/charte
//
// Page consultée par :
//   - Le sponsor direct (parent_user_id = caller.id) pour co-signer
//   - Un admin (role='admin') pour valider à la place du sponsor
//
// Permet :
//   - Voir la charte du distri en preview (lecture seule pour pourquoi/objectif)
//   - Co-signer via canvas → set cosigner_* en DB
//   - Voir qui a déjà co-signé si c'est le cas (lecture seule)
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { CharteDistributeur } from "../components/charter/CharteDistributeur";
import { SignatureCanvasModal } from "../components/charter/SignatureCanvasModal";
import { CharterTemplateSelector } from "../components/charter/CharterTemplateSelector";
import { useCharter } from "../hooks/useCharter";
import type { CharterPersonInfo, CharterTemplate } from "../types/charter";

export function AdminDistributorCharterPage() {
  const navigate = useNavigate();
  const { id: targetUserId } = useParams<{ id: string }>();
  const { currentUser, users } = useAppContext();
  const { charter, loading, saving, cosign } = useCharter(targetUserId ?? null);
  const [signOpen, setSignOpen] = useState(false);
  // Le template affiché est celui choisi par le distri par défaut.
  // L'admin peut switcher en local pour preview (sans persister).
  const distriTemplate: CharterTemplate = charter?.preferred_template ?? "officielle";
  const [previewTemplate, setPreviewTemplate] = useState<CharterTemplate | null>(null);
  const currentTemplate: CharterTemplate = previewTemplate ?? distriTemplate;

  const targetUser = useMemo(
    () => (targetUserId ? users.find((u) => u.id === targetUserId) ?? null : null),
    [targetUserId, users],
  );

  // Le caller peut cosigner si :
  //   - il est admin, OU
  //   - il est le sponsor direct du target (target.sponsorId === caller.id)
  const canCosign = useMemo(() => {
    if (!currentUser || !targetUser) return false;
    if (currentUser.role === "admin") return true;
    return targetUser.sponsorId === currentUser.id;
  }, [currentUser, targetUser]);

  if (!targetUser) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--ls-text-muted)" }}>
        Distributeur introuvable.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--ls-text-muted)" }}>
        Chargement…
      </div>
    );
  }

  const [firstName, ...lastParts] = (targetUser.name ?? "").split(/\s+/);
  const distributeur: CharterPersonInfo = {
    firstName: firstName || "Distributeur",
    lastName: lastParts.join(" "),
    signedAt: charter?.signed_at ?? null,
    signatureDataUrl: charter?.signature_data_url ?? null,
  };

  // Cosigner = celui qui a déjà cosigné en DB, sinon le caller (proposé).
  const callerName = currentUser?.name ?? "";
  const cosignerName = charter?.cosigner_name ?? callerName;
  const [cosFirst, ...cosLast] = cosignerName.split(/\s+/);
  const cosignerRole =
    charter?.cosigner_role ??
    (currentUser?.role === "admin"
      ? "Admin Lor'Squad"
      : "Sponsor direct");

  const cosigner: CharterPersonInfo = {
    firstName: cosFirst || "",
    lastName: cosLast.join(" "),
    role: cosignerRole,
    signedAt: charter?.cosigned_at ?? null,
    signatureDataUrl: charter?.cosigner_signature_data_url ?? null,
  };

  const documentDate = charter?.signed_at
    ? new Date(charter.signed_at)
    : charter?.created_at
      ? new Date(charter.created_at)
      : new Date();

  const alreadyCosigned = !!charter?.cosigner_signature_data_url;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #3A2F1E 0%, #1A1410 60%, #0D0906 100%)",
        padding: "30px 16px 60px",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          maxWidth: 794,
          margin: "0 auto 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/distributors/${targetUser.id}`)}
          style={{
            background: "rgba(184, 146, 42, 0.1)",
            border: "1px solid rgba(184, 146, 42, 0.4)",
            color: "#E5C476",
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "'Cinzel', serif",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          ← Retour fiche {targetUser.name}
        </button>
        <div
          style={{
            fontSize: 11,
            color: "rgba(245, 222, 179, 0.7)",
            fontFamily: "'Cinzel', serif",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {saving
            ? "Sauvegarde…"
            : alreadyCosigned
              ? "✓ Co-signée"
              : charter?.signed_at
                ? "En attente de co-signature"
                : "Pas encore signée par le distri"}
        </div>
      </div>

      {/* Bandeau action si peut cosigner */}
      {canCosign && !alreadyCosigned && charter?.signed_at && (
        <div
          style={{
            maxWidth: 794,
            margin: "0 auto 14px",
            padding: "12px 18px",
            background: "rgba(29, 158, 117, 0.18)",
            border: "1px solid rgba(29, 158, 117, 0.5)",
            borderRadius: 10,
            color: "#C5F0DD",
            fontFamily: "'Cinzel', serif",
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{targetUser.name} a signé sa charte. À toi de co-signer pour valider.</span>
          <button
            type="button"
            onClick={() => setSignOpen(true)}
            style={{
              padding: "10px 22px",
              background: "linear-gradient(135deg, #1D9E75, #14704F)",
              color: "#FFF8E0",
              border: "none",
              borderRadius: 8,
              fontFamily: "'Cinzel', serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(29, 158, 117, 0.4)",
            }}
          >
            ✓ Co-signer
          </button>
        </div>
      )}

      {/* Sélecteur preview-only (ne persiste pas — c'est le choix du distri
          qui prime, l'admin switch juste pour visualiser). */}
      <div style={{ maxWidth: 794, margin: "0 auto" }}>
        <CharterTemplateSelector
          current={currentTemplate}
          onChange={(t) => setPreviewTemplate(t === distriTemplate ? null : t)}
        />
        {previewTemplate && previewTemplate !== distriTemplate && (
          <div
            style={{
              maxWidth: 794,
              margin: "0 auto 14px",
              padding: "8px 14px",
              background: "rgba(212, 169, 55, 0.12)",
              border: "0.5px dashed rgba(212, 169, 55, 0.45)",
              borderRadius: 8,
              color: "#E5C476",
              fontSize: 11,
              fontFamily: "DM Sans, sans-serif",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Preview admin : tu vois le template <strong>{previewTemplate}</strong>, mais le distri a choisi <strong>{distriTemplate}</strong> (pas modifié).
          </div>
        )}
      </div>

      {/* Document en preview (lecture seule pour les champs distri) */}
      <CharteDistributeur
        template={currentTemplate}
        distributeur={distributeur}
        cosigner={cosigner}
        pourquoiText={charter?.pourquoi_text ?? ""}
        objectif12Mois={charter?.objectif_12_mois ?? ""}
        documentDate={documentDate}
        mode="preview"
        onCosignClick={canCosign && !alreadyCosigned ? () => setSignOpen(true) : undefined}
      />

      {/* Modale co-signature */}
      <SignatureCanvasModal
        open={signOpen}
        title={`Co-signer la charte de ${targetUser.name}`}
        onClose={() => setSignOpen(false)}
        onSave={async (dataUrl) => {
          await cosign({
            signatureDataUrl: dataUrl,
            cosignerName: callerName,
            cosignerRole,
          });
          setSignOpen(false);
        }}
      />
    </div>
  );
}
