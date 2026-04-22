// Chantier Polish Vue complète V2 (2026-04-24).
// Vue imprimable (window.print()) des notes coach d'un client.
// Masquée à l'écran (display:none), visible uniquement via @media print.
// Utilisée depuis CoachNotesBlock → clic "Exporter".

type NoteType = "followup" | "product_adjustment" | "feeling" | "free";

interface PrintNote {
  type: NoteType;
  content: string;
  created_at: string;
  author_name: string;
}

const TYPE_LABEL: Record<NoteType, string> = {
  followup: "Suivi",
  product_adjustment: "Ajustement produits",
  feeling: "Ressenti client",
  free: "Libre",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

interface Props {
  clientName: string;
  initialAssessmentNotes: string | null;
  initialAssessmentDate: string | null;
  notes: PrintNote[];
}

export function CoachNotesPrintView({
  clientName,
  initialAssessmentNotes,
  initialAssessmentDate,
  notes,
}: Props) {
  const exportedAt = new Date().toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  // Timeline la plus récente d'abord pour la lecture à l'écran, mais pour
  // l'impression coach pré-RDV, l'ordre chronologique ascendant est plus
  // naturel (on suit l'histoire du client).
  const sorted = [...notes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div
      id="coach-notes-print-view"
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -99999,
        top: 0,
        width: "210mm",
        background: "#FFFFFF",
        color: "#000000",
        fontFamily: "'Times New Roman', serif",
        padding: "16mm",
      }}
    >
      <style>
        {`
        @media print {
          body > *:not(#coach-notes-print-view-portal) {
            display: none !important;
          }
          #coach-notes-print-view {
            position: static !important;
            left: 0 !important;
          }
        }
        #coach-notes-print-view h1 {
          font-size: 20pt;
          margin: 0 0 4pt;
          letter-spacing: 0.02em;
        }
        #coach-notes-print-view h2 {
          font-size: 13pt;
          margin: 16pt 0 6pt;
          border-bottom: 1pt solid #BA7517;
          padding-bottom: 3pt;
          color: #BA7517;
        }
        #coach-notes-print-view .note {
          page-break-inside: avoid;
          margin-bottom: 10pt;
          padding: 8pt 10pt;
          border-left: 3pt solid #BA7517;
          background: #FAF7F2;
        }
        #coach-notes-print-view .note-meta {
          font-size: 9pt;
          color: #555;
          margin-bottom: 4pt;
        }
        #coach-notes-print-view .footer {
          margin-top: 20pt;
          padding-top: 8pt;
          border-top: 1pt solid #888;
          font-size: 9pt;
          color: #555;
          text-align: center;
        }
        `}
      </style>

      <header style={{ borderBottom: "2pt solid #0B0D11", paddingBottom: 6 }}>
        <h1>{clientName}</h1>
        <div style={{ fontSize: "10pt", color: "#444" }}>
          Notes coach · exporté le {exportedAt}
        </div>
      </header>

      {initialAssessmentNotes ? (
        <>
          <h2>Notes du bilan initial</h2>
          <div style={{ fontSize: "10pt", color: "#444", marginBottom: 6 }}>
            {initialAssessmentDate ? formatDate(initialAssessmentDate) : ""}
          </div>
          <div
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "11pt",
              lineHeight: 1.5,
              padding: "8pt 10pt",
              background: "#F4F1EC",
              borderLeft: "3pt solid #0F6E56",
            }}
          >
            {initialAssessmentNotes}
          </div>
        </>
      ) : null}

      <h2>Suivi ({sorted.length} note{sorted.length > 1 ? "s" : ""})</h2>
      {sorted.length === 0 ? (
        <div style={{ fontSize: "10pt", fontStyle: "italic", color: "#555" }}>
          Aucune note vivante pour ce client.
        </div>
      ) : (
        sorted.map((n, i) => (
          <div key={i} className="note">
            <div className="note-meta">
              <strong>{TYPE_LABEL[n.type]}</strong>
              {" — "}
              {formatDate(n.created_at)}
              {" · "}
              {n.author_name}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "11pt", lineHeight: 1.45 }}>
              {n.content}
            </div>
          </div>
        ))
      )}

      <div className="footer">Lor'Squad Wellness · Confidentiel</div>
    </div>
  );
}
