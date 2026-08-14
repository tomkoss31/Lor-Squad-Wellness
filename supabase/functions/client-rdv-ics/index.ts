// =============================================================================
// client-rdv-ics — le rendez-vous du client, en fichier .ics.
//
// Répond à un manque de la PWA : le bouton « Ajouter à mon agenda » n'ouvrait
// que Google Agenda. Ceux qui utilisent Apple Calendrier ou Outlook — la
// majorité sur iPhone — n'avaient aucun moyen d'y mettre leur RDV.
//
// ── POURQUOI UNE FONCTION SERVEUR, ET PAS UN `data:` URI ────────────────────
//
// Générer le .ics dans le navigateur serait plus simple : la PWA connaît déjà
// la date. Mais **iOS ignore l'attribut `download` sur un `data:` ou un
// `blob:`** — le fichier ne s'ouvre pas, ou s'affiche en texte brut, et c'est
// pire encore quand la PWA est installée sur l'écran d'accueil. Or c'est
// exactement le public visé.
//
// Servir le fichier depuis une vraie URL avec `Content-Type: text/calendar`
// est la seule méthode qu'iOS, Android et le bureau traitent tous pareil :
// le système reconnaît un événement et propose de l'ajouter.
//
// ── ET LA DATE VIENT DU SERVEUR ─────────────────────────────────────────────
//
// Le navigateur ne dit pas quel jour mettre dans le fichier : la fonction
// relit le rendez-vous en base à partir du jeton. Un RDV déplacé donne donc
// le bon fichier, même si l'onglet de la PWA est resté ouvert depuis la
// veille. C'est la règle du projet : l'app client ne lit jamais les tables
// sensibles en direct.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function horodate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Dans un .ics ces caractères sont structurants : il faut les échapper. */
function echappe(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return new Response("token manquant", { status: 400, headers: cors });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Même cascade que `client-app-data` : un client peut arriver par son
    // espace, par un récap de bilan ou par un rapport d'évolution.
    let clientId: string | null = null;
    for (const table of ["client_app_accounts", "client_recaps", "client_evolution_reports"]) {
      const { data } = await sb.from(table).select("client_id").eq("token", token).maybeSingle();
      if (data?.client_id) { clientId = String(data.client_id); break; }
    }
    if (!clientId) return new Response("lien invalide", { status: 404, headers: cors });

    const { data: client } = await sb
      .from("clients")
      .select("first_name, next_follow_up, distributor_id")
      .eq("id", clientId)
      .maybeSingle();

    // Le suivi programmé fait foi ; `clients.next_follow_up` sert de repli
    // (les deux existent, cf. l'incident des rappels du 14/08).
    const { data: fu } = await sb
      .from("follow_ups")
      .select("id, due_date")
      .eq("client_id", clientId)
      .eq("status", "scheduled")
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    const iso = (fu?.due_date as string | undefined) ?? (client?.next_follow_up as string | undefined);
    if (!iso) return new Response("aucun rendez-vous à venir", { status: 404, headers: cors });

    const debut = new Date(iso);
    if (Number.isNaN(debut.getTime())) {
      return new Response("date de rendez-vous illisible", { status: 500, headers: cors });
    }
    const fin = new Date(debut.getTime() + 45 * 60 * 1000);

    let coachNom = "ton coach";
    let lieu = "La Base 360";
    if (client?.distributor_id) {
      const { data: u } = await sb
        .from("users")
        .select("name, rdv_location, city")
        .eq("id", client.distributor_id as string)
        .maybeSingle();
      coachNom = String(u?.name ?? "").trim() || coachNom;
      lieu = String(u?.rdv_location ?? u?.city ?? "").trim() || lieu;
    }

    // METHOD:PUBLISH, pas REQUEST : ce n'est pas une invitation à accepter,
    // c'est le client qui range SON rendez-vous dans SON agenda. Avec REQUEST,
    // Apple Calendrier affiche des boutons « Accepter / Refuser » qui n'ont
    // aucun sens ici et qui tenteraient de répondre à l'organisateur.
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//La Base 360//RDV client//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      // UID stable : réimporter le fichier MET À JOUR l'événement au lieu
      // d'en créer un second. Sans ça, un client qui clique deux fois se
      // retrouve avec deux rendez-vous dans son agenda.
      `UID:rdv-${fu?.id ?? clientId}@labase360.fr`,
      `DTSTAMP:${horodate(new Date())}`,
      `DTSTART:${horodate(debut)}`,
      `DTEND:${horodate(fin)}`,
      `SUMMARY:${echappe(`RDV avec ${coachNom} · La Base 360`)}`,
      `DESCRIPTION:${echappe("Ton rendez-vous de suivi. À bientôt 🌿")}`,
      `LOCATION:${echappe(lieu)}`,
      "STATUS:CONFIRMED",
      // Un rappel 1 h avant, posé par l'agenda du client lui-même : il ne
      // dépend ni de nos e-mails ni de nos notifications.
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Rappel — RDV La Base 360 dans 1 h",
      "TRIGGER:-PT1H",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(ics, {
      headers: {
        ...cors,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rdv-la-base-360.ics"',
        // Un RDV peut être déplacé : ne pas laisser un vieux fichier en cache.
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.warn("[client-rdv-ics] échec :", e instanceof Error ? e.message : e);
    return new Response("erreur", { status: 500, headers: cors });
  }
});
