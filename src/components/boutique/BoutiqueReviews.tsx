// =============================================================================
// BoutiqueReviews — avis clients de la boutique (catégorie « skin »).
//
// Réutilise l'infra témoignages existante (table client_testimonials + edge
// submit-testimonial + modération admin) via la catégorie 'skin'. Affiche les
// avis approuvés du distri, dans l'identité céladon de la boutique, et permet
// à une cliente de laisser son avis (soumis en pending → modéré par l'admin).
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

type Review = { id: string; content: string; rating: number; author: string };

// Les soumissions génériques stockent "[FROM:prénom|ville]" en tête du content.
const FROM_TAG_RE = /^\[FROM:([^|\]]+)(?:\|([^\]]*))?\]\s*/;
function parse(content: string): { author: string; clean: string } {
  const m = content.match(FROM_TAG_RE);
  if (!m) return { author: "Cliente vérifiée", clean: content };
  return { author: (m[1] ?? "").trim() || "Cliente vérifiée", clean: content.slice(m[0].length) };
}

export function BoutiqueReviews({
  coachSlug,
  coachUserId,
}: {
  coachSlug?: string;
  coachUserId?: string | null;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!coachUserId) return;
    let cancelled = false;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("client_testimonials")
        .select("id, content, rating")
        .eq("status", "approved")
        .eq("category", "skin")
        .eq("coach_user_id", coachUserId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (cancelled || !data) return;
      setReviews(
        data.map((r) => {
          const p = parse(r.content as string);
          return { id: r.id as string, content: p.clean, rating: r.rating as number, author: p.author };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [coachUserId]);

  const stars = (n: number) => "★".repeat(Math.max(1, Math.min(5, n)));

  return (
    <section className="bk-wrap bk-sec bk-reveal">
      <div className="bk-sec-head">
        <div>
          <div className="bk-eyebrow" style={{ marginBottom: 12 }}>
            Elles ont testé
          </div>
          <h2>La preuve sur vraie peau.</h2>
        </div>
        <p>De vrais avis de clientes. Tu as testé la routine ? Partage ton expérience.</p>
      </div>

      {reviews.length > 0 ? (
        <div className="bk-revs">
          {reviews.map((r) => (
            <div className="bk-rev" key={r.id}>
              <div className="bk-rt">
                <span className="bk-stars">{stars(r.rating)}</span>
                <span className="bk-ba">Achat vérifié</span>
              </div>
              <p>« {r.content.slice(0, 240)}{r.content.length > 240 ? "…" : ""} »</p>
              <div className="bk-who">
                <div className="bk-av">{(r.author[0] ?? "•").toUpperCase()}</div>
                <div>
                  <b>{r.author}</b>
                  <br />
                  <span>Cliente · achat vérifié</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bk-rev-empty">
          <p>Sois la première à partager ton avis sur la routine ✨</p>
        </div>
      )}

      <div style={{ marginTop: 22, textAlign: "center" }}>
        <button className="bk-btn bk-btn-ghost" onClick={() => setOpen(true)}>
          ✍️ Laisser mon avis
        </button>
      </div>

      {open && <ReviewForm coachSlug={coachSlug} onClose={() => setOpen(false)} />}
    </section>
  );
}

function ReviewForm({ coachSlug, onClose }: { coachSlug?: string; onClose: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  const canSend = firstName.trim().length >= 2 && content.trim().length >= 10 && state !== "sending";

  async function submit() {
    if (!canSend) return;
    setState("sending");
    setErr("");
    try {
      const sb = await getSupabaseClient();
      const { data, error } = await sb!.functions.invoke("submit-testimonial", {
        body: {
          coach_slug: coachSlug,
          category: "skin",
          first_name: firstName.trim(),
          city: city.trim(),
          content: content.trim(),
          rating,
        },
      });
      const res = data as { success?: boolean; error?: string } | null;
      if (error || !res?.success) {
        setErr(res?.error || "Une erreur est survenue. Réessaie.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErr("Une erreur est survenue. Réessaie.");
      setState("error");
    }
  }

  return (
    <div
      className="bk-qvm"
      role="dialog"
      aria-modal="true"
      aria-label="Laisser un avis"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bk-rev-form">
        <button className="bk-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        {state === "done" ? (
          <div style={{ textAlign: "center", padding: "10px 4px" }}>
            <div style={{ fontSize: 34 }}>🌿</div>
            <h3 style={{ margin: "8px 0" }}>Merci pour ton avis !</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              Il sera publié après une rapide vérification. À très vite ✨
            </p>
            <button className="bk-btn bk-btn-primary" style={{ marginTop: 16 }} onClick={onClose}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="bk-eyebrow" style={{ marginBottom: 6 }}>
              Ton avis
            </div>
            <h3 style={{ marginBottom: 14 }}>Partage ton expérience</h3>

            <label className="bk-rev-lbl">Ta note</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 26,
                    lineHeight: 1,
                    color: n <= rating ? "var(--star)" : "var(--hair-strong)",
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <label className="bk-rev-lbl">Prénom</label>
            <input
              className="bk-rev-in"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ton prénom"
              maxLength={40}
            />

            <label className="bk-rev-lbl">Ville (optionnel)</label>
            <input
              className="bk-rev-in"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ta ville"
              maxLength={60}
            />

            <label className="bk-rev-lbl">Ton avis</label>
            <textarea
              className="bk-rev-in"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Raconte ton expérience avec la routine…"
              rows={4}
              maxLength={1000}
            />

            {state === "error" && (
              <div style={{ color: "var(--blush)", fontSize: 13, marginTop: 8 }}>{err}</div>
            )}

            <button
              className="bk-btn bk-btn-primary"
              style={{ width: "100%", marginTop: 16, opacity: canSend ? 1 : 0.5 }}
              disabled={!canSend}
              onClick={() => void submit()}
            >
              {state === "sending" ? "Envoi…" : "Envoyer mon avis"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
