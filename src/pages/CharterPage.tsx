// =============================================================================
// CharterPage — route /charte (perso du distri)
//
// Le distri voit sa charte personnelle, peut remplir pourquoi/objectif,
// signer via canvas, télécharger en PDF (commit 3). La signature coach est
// faite plus tard par le sponsor direct ou un admin via /distributeurs/:id/charte.
// =============================================================================

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { CharteDistributeur } from "../components/charter/CharteDistributeur";
import { SignatureCanvasModal } from "../components/charter/SignatureCanvasModal";
import { CharterTemplateSelector } from "../components/charter/CharterTemplateSelector";
import { useCharter } from "../hooks/useCharter";
import type { CharterPersonInfo, CharterTemplate } from "../types/charter";
import {
  downloadCertPdf,
  downloadCertPng,
  slugifyForFilename,
} from "../lib/certificateExport";

export function CharterPage() {
  const navigate = useNavigate();
  const { currentUser, users } = useAppContext();
  const userId = currentUser?.id ?? null;
  const { charter, loading, saving, updateField, setTemplate, signAsDistri } =
    useCharter(userId);
  const [signOpen, setSignOpen] = useState(false);
  const currentTemplate: CharterTemplate = charter?.preferred_template ?? "officielle";
  const [downloading, setDownloading] = useState<null | "pdf" | "png">(null);
  const charterRef = useRef<HTMLDivElement>(null);

  async function handleDownload(kind: "pdf" | "png") {
    const node = charterRef.current;
    if (!node) return;
    const slug = slugifyForFilename(currentUser?.name ?? "charte", "charte");
    const base = `charte-${currentTemplate}-${slug}`;
    setDownloading(kind);
    try {
      // Attendre que les fonts Google soient prêtes pour éviter fallback
      // dans le PDF.
      if (typeof document !== "undefined" && (document as Document).fonts) {
        await (document as Document).fonts.ready;
      }
      if (kind === "pdf") await downloadCertPdf(node, `${base}.pdf`, "a4");
      else await downloadCertPng(node, `${base}.png`);
    } catch (err) {
      console.warn("[CharterPage] download failed", err);
      alert("Téléchargement impossible. Réessaie.");
    } finally {
      setDownloading(null);
    }
  }

  // Déterminer le sponsor direct (cosigner pré-rempli)
  const sponsor = useMemo(() => {
    if (!currentUser?.sponsorId) return null;
    return users.find((u) => u.id === currentUser.sponsorId) ?? null;
  }, [currentUser?.sponsorId, users]);

  if (!currentUser) return null;

  const [firstName, ...lastParts] = (currentUser.name ?? "").split(/\s+/);
  const lastName = lastParts.join(" ");

  const distributeur: CharterPersonInfo = {
    firstName: firstName || "Distributeur",
    lastName: lastName || "",
    signedAt: charter?.signed_at ?? null,
    signatureDataUrl: charter?.signature_data_url ?? null,
  };

  // Cosigner = celui qui a déjà cosigné en DB, sinon le sponsor en preview.
  const cosignerName = charter?.cosigner_name
    ? charter.cosigner_name
    : sponsor?.name ?? "Mélanie & Thomas";
  const [cosignFirstName, ...cosignLastParts] = cosignerName.split(/\s+/);
  const cosigner: CharterPersonInfo = {
    firstName: cosignFirstName || "",
    lastName: cosignLastParts.join(" "),
    role: charter?.cosigner_role ?? (sponsor ? "Sponsor direct" : "Co-fondateurs"),
    signedAt: charter?.cosigned_at ?? null,
    signatureDataUrl: charter?.cosigner_signature_data_url ?? null,
  };

  const documentDate = charter?.signed_at
    ? new Date(charter.signed_at)
    : charter?.created_at
      ? new Date(charter.created_at)
      : new Date();

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--ls-text-muted)" }}>
        Chargement de ta charte…
      </div>
    );
  }

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
          onClick={() => navigate("/co-pilote")}
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
          ← Retour
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              color: "rgba(245, 222, 179, 0.7)",
              fontFamily: "'Cinzel', serif",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {saving ? "Sauvegarde…" : charter?.signed_at ? "✓ Signée" : "Brouillon"}
          </span>
          {currentTemplate === "story" ? (
            // Story = format vertical pensé partage Insta → PNG seul.
            <button
              type="button"
              onClick={() => void handleDownload("png")}
              disabled={downloading !== null}
              style={btnGold}
            >
              {downloading === "png" ? "⏳" : "📱"} Sauver en image
            </button>
          ) : (
            // Officielle / Manifeste = A4 imprimable → PDF + PNG.
            <>
              <button
                type="button"
                onClick={() => void handleDownload("pdf")}
                disabled={downloading !== null}
                style={btnGold}
              >
                {downloading === "pdf" ? "⏳" : "📥"} PDF
              </button>
              <button
                type="button"
                onClick={() => void handleDownload("png")}
                disabled={downloading !== null}
                style={btnGoldGhost}
              >
                {downloading === "png" ? "⏳" : "🖼️"} PNG
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sélecteur de template (3 thumbnails) */}
      <div style={{ maxWidth: 794, margin: "0 auto" }}>
        <CharterTemplateSelector
          current={currentTemplate}
          onChange={(t) => void setTemplate(t)}
        />
      </div>

      {/* Document */}
      <CharteDistributeur
        ref={charterRef}
        template={currentTemplate}
        distributeur={distributeur}
        cosigner={cosigner}
        pourquoiText={charter?.pourquoi_text ?? ""}
        objectif12Mois={charter?.objectif_12_mois ?? ""}
        documentDate={documentDate}
        mode="fillable"
        onPourquoiChange={(v) => updateField("pourquoi_text", v)}
        onObjectifChange={(v) => updateField("objectif_12_mois", v)}
        onSignClick={() => setSignOpen(true)}
      />

      {/* Modale signature */}
      <SignatureCanvasModal
        open={signOpen}
        title="Signe ta charte"
        onClose={() => setSignOpen(false)}
        onSave={async (dataUrl) => {
          await signAsDistri(dataUrl);
          setSignOpen(false);
        }}
      />
    </div>
  );
}

const btnGold: React.CSSProperties = {
  padding: "8px 14px",
  background: "linear-gradient(135deg, #B8922A, #8B6F1F)",
  color: "#FFF8E0",
  border: "none",
  borderRadius: 8,
  fontFamily: "'Cinzel', serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(184, 146, 42, 0.35)",
};

const btnGoldGhost: React.CSSProperties = {
  padding: "8px 14px",
  background: "rgba(184, 146, 42, 0.1)",
  border: "1px solid #B8922A",
  color: "#E5C476",
  borderRadius: 8,
  fontFamily: "'Cinzel', serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  cursor: "pointer",
};
