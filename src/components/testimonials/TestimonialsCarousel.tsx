// =============================================================================
// TestimonialsCarousel — Chantier #11 Sprint 2 (2026-05-18)
// =============================================================================
// Composant reutilisable pour afficher les temoignages clients approuves.
// 4 variants : welcome | business | newsletter | compact.
//
// Fetch directement client_testimonials where status='approved' via PostgREST
// (RLS policy testimonials_public_select_approved couvre l'acces anon).
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { PUBLIC_TOKENS, PUBLIC_FONTS, publicGradText } from "../../styles/public-tokens";
// Import du CSS pour que .public-shell-scope wrappers heritent des vars
// (var(--glass), var(--hair), etc.) meme sans PublicShell parent.
import "../../styles/public-shell.css";

export interface TestimonialPublic {
  id: string;
  content: string;
  rating: number;
  language: string;
  created_at: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_city: string | null;
  photo_url: string | null;
  photo_consent: boolean;
}

export type CarouselVariant = "welcome" | "business" | "newsletter" | "compact";

interface Props {
  variant?: CarouselVariant;
  language?: string;
  limit?: number;
  coachId?: string;
  // Notifie le parent du nombre d'avis chargés (0 = aucun) pour qu'il puisse
  // masquer un titre de section orphelin. Appelé une fois la requête résolue.
  onLoaded?: (count: number) => void;
}

function formatAuthor(t: TestimonialPublic): string {
  // Friendly (2026-07-09, Thomas) : JUSTE le prénom — plus d'initiale de nom
  // ni de ville (« ça fait amateur/débutant »). S'applique à tous les
  // témoignages affichés, anciens comme nouveaux.
  return (t.client_first_name ?? "").trim() || "Anonyme";
}

// V1.1 lien generique coach : les soumissions ont client_id=null et stockent
// "[FROM:firstName|city] " en debut de content. On parse pour reconstituer
// l'auteur et nettoyer la citation affichee.
const FROM_TAG_RE = /^\[FROM:([^|\]]+)(?:\|([^\]]+))?\]\s*/;
function parseFromTag(content: string): { firstName: string | null; city: string | null; clean: string } {
  const m = content.match(FROM_TAG_RE);
  if (!m) return { firstName: null, city: null, clean: content };
  return {
    firstName: m[1]?.trim() || null,
    city: m[2]?.trim() || null,
    clean: content.slice(m[0].length),
  };
}

export function TestimonialsCarousel({
  variant = "welcome",
  language = "fr",
  limit = 6,
  coachId,
  onLoaded,
}: Props) {
  const [items, setItems] = useState<TestimonialPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    // Applique le résultat + notifie le parent du compte (0 = aucun avis).
    const finish = (arr: TestimonialPublic[]) => {
      if (cancelled) return;
      setItems(arr);
      onLoadedRef.current?.(arr.length);
    };
    (async () => {
      setLoading(true);
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) {
            finish([]);
            setLoading(false);
          }
          return;
        }
        // Left join sur clients : V1.1 lien generique coach a client_id=null
        // (auteur recupere depuis tag [FROM:...] dans le content).
        const SELECT = "id, content, rating, language, created_at, photo_url, photo_consent, clients(first_name, last_name, city)";
        let query = sb
          .from("client_testimonials")
          .select(SELECT)
          .eq("status", "approved")
          .eq("language", language)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (coachId) {
          query = query.eq("coach_user_id", coachId);
        }
        const { data, error } = await query;
        if (cancelled) return;
        if (error || !data) {
          // Fallback langue : si pas de rows dans la langue demandee, retry en fr
          if (language !== "fr") {
            const { data: fallback } = await sb
              .from("client_testimonials")
              .select(SELECT)
              .eq("status", "approved")
              .eq("language", "fr")
              .order("created_at", { ascending: false })
              .limit(limit);
            if (!cancelled) {
              finish(fallback ? mapRows(fallback) : []);
            }
          } else {
            finish([]);
          }
        } else {
          finish(mapRows(data));
        }
      } catch {
        finish([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language, limit, coachId]);

  // Auto-rotation 6s (welcome variant only — les autres sont statiques)
  useEffect(() => {
    if (variant !== "welcome" || items.length < 2) return;
    intervalRef.current = window.setInterval(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [variant, items.length]);

  if (loading) return null; // Pas de skeleton bruyant — section disparaît silencieusement
  if (items.length === 0) return null;

  if (variant === "newsletter") {
    return <NewsletterStrip items={items.slice(0, 2)} />;
  }
  if (variant === "compact") {
    return <CompactList items={items.slice(0, 3)} />;
  }
  if (variant === "business") {
    return <BusinessGrid items={items.slice(0, 3)} />;
  }
  // welcome (default) : 1 card avec dots + auto-rotation
  return (
    <WelcomeCarousel items={items} active={active} onSelect={setActive} />
  );
}

function mapRows(data: unknown): TestimonialPublic[] {
  return (data as Array<TestimonialPublic & { clients: { first_name: string | null; last_name: string | null; city: string | null } | null }>).map((r) => {
    // Si pas de client lie (V1.1 lien coach generique), parser le tag [FROM:...]
    // pour recuperer prenom + ville et nettoyer le content.
    const tag = r.clients ? null : parseFromTag(r.content);
    return {
      ...r,
      content: tag ? tag.clean : r.content,
      client_first_name: r.clients?.first_name ?? tag?.firstName ?? null,
      client_last_name: r.clients?.last_name ?? null,
      client_city: r.clients?.city ?? tag?.city ?? null,
    };
  });
}

// ─── Welcome variant ──────────────────────────────────────────────────────────
function WelcomeCarousel({
  items, active, onSelect,
}: {
  items: TestimonialPublic[];
  active: number;
  onSelect: (i: number) => void;
}) {
  const t = items[active];
  return (
    <div
      aria-live="polite"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--hair)",
        borderRadius: 20,
        padding: "24px 22px",
        marginBottom: 28,
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ color: PUBLIC_TOKENS.gold, fontSize: 16 }}>
          {"★".repeat(t.rating)}
          <span style={{ opacity: 0.2 }}>{"★".repeat(5 - t.rating)}</span>
        </span>
        <span style={{
          fontFamily: PUBLIC_FONTS.mono, fontSize: 10,
          color: "var(--cream-hint)", letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Témoignage vérifié
        </span>
      </div>
      <blockquote style={{
        margin: 0,
        fontFamily: PUBLIC_FONTS.body,
        fontSize: 15, lineHeight: 1.6,
        color: "var(--cream-soft)",
        fontStyle: "italic",
      }}>
        « {t.content.slice(0, 220)}{t.content.length > 220 ? "…" : ""} »
      </blockquote>
      <div style={{
        marginTop: 14,
        fontFamily: PUBLIC_FONTS.display,
        fontSize: 13, fontWeight: 600,
        color: PUBLIC_TOKENS.teal,
      }}>
        — {formatAuthor(t)}
      </div>
      {items.length > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Voir témoignage ${i + 1}`}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                border: "none",
                background: i === active ? PUBLIC_TOKENS.teal : "var(--hair-strong)",
                cursor: "pointer",
                transition: "background 0.22s",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Business variant (3 cards juxtaposees) ──────────────────────────────────
function BusinessGrid({ items }: { items: TestimonialPublic[] }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 16,
      margin: "32px 0",
    }}>
      {items.map((t) => (
        <div key={t.id} style={{
          background: "var(--glass)",
          border: "1px solid var(--hair)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 16,
          padding: 18,
        }}>
          <div style={{ color: PUBLIC_TOKENS.gold, fontSize: 14, marginBottom: 10 }}>
            {"★".repeat(t.rating)}
            <span style={{ opacity: 0.2 }}>{"★".repeat(5 - t.rating)}</span>
          </div>
          <blockquote style={{
            margin: 0, fontFamily: PUBLIC_FONTS.body, fontSize: 14,
            lineHeight: 1.5, color: "var(--cream-soft)", fontStyle: "italic",
          }}>
            « {t.content.slice(0, 160)}{t.content.length > 160 ? "…" : ""} »
          </blockquote>
          <div style={{
            marginTop: 12, fontFamily: PUBLIC_FONTS.display,
            fontSize: 12, fontWeight: 600, color: PUBLIC_TOKENS.teal,
          }}>
            — {formatAuthor(t)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Newsletter variant (2 cards juxtaposees compactes) ──────────────────────
function NewsletterStrip({ items }: { items: TestimonialPublic[] }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: items.length === 2 ? "1fr 1fr" : "1fr",
      gap: 12, margin: "20px 0",
    }}>
      {items.map((t) => (
        <div key={t.id} style={{
          background: "var(--glass)",
          border: "1px solid var(--hair)",
          borderRadius: 12, padding: 14,
        }}>
          <div style={{
            fontFamily: PUBLIC_FONTS.body, fontSize: 13,
            lineHeight: 1.5, color: "var(--cream-soft)",
            fontStyle: "italic", marginBottom: 8,
          }}>
            « {t.content.slice(0, 100)}{t.content.length > 100 ? "…" : ""} »
          </div>
          <div style={{
            fontFamily: PUBLIC_FONTS.display, fontSize: 11,
            color: PUBLIC_TOKENS.teal, fontWeight: 600,
          }}>
            — {formatAuthor(t)} · {t.rating}/5
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Compact variant (mini citation + etoiles) ───────────────────────────────
function CompactList({ items }: { items: TestimonialPublic[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((t) => (
        <li key={t.id} style={{
          fontFamily: PUBLIC_FONTS.body, fontSize: 12,
          color: "var(--cream-soft)", lineHeight: 1.45,
        }}>
          <span style={{ color: PUBLIC_TOKENS.gold }}>{"★".repeat(t.rating)}</span>{" "}
          <em>« {t.content.slice(0, 80)}{t.content.length > 80 ? "…" : ""} »</em>{" "}
          <span style={{ ...publicGradText, fontStyle: "normal", fontWeight: 600 }}>
            — {formatAuthor(t)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default TestimonialsCarousel;
