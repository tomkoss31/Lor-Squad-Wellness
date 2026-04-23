// Chantier Partage public (2026-04-24).
// Bouton coach pour copier le lien /partage/:token de la fiche client —
// à partager sur Instagram / WhatsApp / réseaux pour showcase
// transformation avec CTA "Contacte-moi pour ton bilan gratuit".

import { useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast } from "../../context/ToastContext";

interface Props {
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  coachName: string;
}

export function SharePublicButton({ clientId, clientFirstName, clientLastName, coachName }: Props) {
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function copyLink() {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");

      // Chercher recap existant OU en créer un
      const { data: existing } = await sb
        .from("client_recaps")
        .select("token")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1);

      let token = (existing?.[0]?.token as string | undefined) ?? null;

      if (!token) {
        const { data: created, error } = await sb
          .from("client_recaps")
          .insert({
            client_id: clientId,
            coach_name: coachName,
            client_first_name: clientFirstName,
            client_last_name: clientLastName,
            assessment_date: new Date().toISOString(),
          })
          .select("token")
          .single();
        if (error) throw error;
        token = (created?.token as string | undefined) ?? null;
      }

      if (!token) throw new Error("Token introuvable.");

      const url = `${window.location.origin}/partage/${token}`;
      await navigator.clipboard.writeText(url);
      pushToast({
        tone: "success",
        title: "Lien copié !",
        message: `Colle-le sur Insta/WhatsApp/Story. Il redirige vers toi pour un bilan gratuit.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      pushToast({ tone: "error", title: "Copie impossible", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyLink()}
      disabled={loading}
      title="Copier un lien public pour partager la transformation sur les réseaux"
      className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] border border-[var(--ls-border2)] bg-[var(--ls-surface2)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
      style={{ cursor: loading ? "wait" : "pointer" }}
    >
      {loading ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
      {loading ? "Copie..." : "📣 Partage public"}
    </button>
  );
}
