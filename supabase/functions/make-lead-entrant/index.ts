// =============================================================================
// make-lead-entrant — le tuyau qui manquait entre Meta et l'app.
//
// Thomas, 08/09/2026 : « 7 leads arrivés en 24 h que personne n'a vus ». Les
// leads du formulaire Meta ne descendent nulle part tout seuls : quelqu'un doit
// penser à ouvrir le Centre de prospects et les recopier. Résultat mesuré ce
// jour-là : deux personnes arrivées à 23h01 et 23h27 sont restées invisibles
// jusqu'au lendemain 10h.
//
// Make appelle cette fonction une fois par heure, entre 8h et 20h, avec les
// leads qu'il vient de récupérer chez Facebook. Elle fait TOUT le reste — c'est
// volontaire : le compte Make est en palier gratuit (1 000 opérations par mois)
// et chaque module ajouté là-bas coûte une opération par lead. Ici, ça ne coûte
// rien. Donc dès qu'on est tenté d'ajouter un routeur ou un filtre dans Make,
// on le met ICI à la place.
//
// Ce qu'elle fait, dans l'ordre :
//   1. vérifie le secret partagé (elle est publique, le contrôle est ici)
//   2. normalise le téléphone — Meta rend parfois « +330662200988 », un +33
//      suivi d'un 0, qui n'est envoyable nulle part
//   3. refuse les doublons : Meta renvoie la même personne sous son pseudo
//      Facebook (vu le 08/09 : « javelot » = Jennifer Woillet)
//   4. crée la fiche avec l'heure RÉELLE de soumission, pas l'heure d'import —
//      sans ça on mesure la diligence de l'équipe, pas le comportement des gens
//   5. envoie le SMS de premier contact, mais seulement entre 8h et 20h
//
// ⚠️ L'expéditeur Twilio est à SENS UNIQUE : le message ne doit contenir aucune
// formule qui appelle une réponse. Le seul chemin d'action est le lien.
//
// Secrets requis : MAKE_LEAD_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//                  TWILIO_SENDER
//
// Deploy : supabase functions deploy make-lead-entrant --no-verify-jwt
// =============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cle-make",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/**
 * L'heure de Paris, sans dépendre du fuseau du serveur.
 *
 * 🪤 Piège vécu le 08/09/2026 : en locale « fr-FR », formater une heure SEULE
 * rend « 12 h » et non « 12 ». `Number("12 h")` vaut NaN, et `NaN >= 8` est
 * faux — la fenêtre d'envoi était donc TOUJOURS fermée et aucun SMS ne serait
 * jamais parti, sans la moindre erreur dans les journaux. On force la locale
 * « en-GB » et on ne garde que les chiffres.
 */
function heureParis(d = new Date()): number {
  const brut = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(d);
  const n = Number(brut.replace(/\D/g, ""));
  // En cas d'imprévu on préfère NE PAS envoyer plutôt qu'envoyer à 3 h du matin.
  return Number.isFinite(n) ? n : -1;
}

/**
 * Un numéro français en format national (0XXXXXXXXX), ou null.
 *
 * Le cas qui a coûté un SMS perdu le 07/09 : Meta rend « +330662200988 »,
 * c'est-à-dire l'indicatif +33 suivi du 0 national. Twilio refuse.
 */
function telNational(brut: string): string | null {
  let n = (brut ?? "").replace(/[^\d+]/g, "");
  if (n.startsWith("+330")) n = "+33" + n.slice(4);
  if (n.startsWith("0033")) n = "+33" + n.slice(4);
  if (n.startsWith("+33")) n = "0" + n.slice(3);
  if (n.startsWith("33") && n.length === 11) n = "0" + n.slice(2);
  n = n.replace(/\D/g, "");
  return /^0[1-9]\d{8}$/.test(n) ? n : null;
}

const e164 = (national: string) => "+33" + national.slice(1);

/**
 * Le prénom, ou "" si on n'est pas sûr.
 *
 * Meta pré-remplit avec le nom du profil Facebook : on récolte des pseudos
 * (« Foden Lespe », « La Lionne Moana Juju », « javelot »). Mieux vaut un
 * « Bonjour, » sec que d'appeler quelqu'un par un nom inventé.
 */
function prenomSur(v: string): string {
  const p = (v ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-zÀ-ÖØ-öø-ÿ'-]{2,20}$/.test(p) ? p : "";
}

/**
 * Le SMS de premier contact.
 *
 * ⚠️ AVEC les accents, contrairement au reste de nos SMS. Décision de Thomas
 * le 08/09/2026, après s'être mis à la place de la personne : elle a tapé un
 * bouton sur Facebook il y a une heure, elle reçoit un texto d'un numéro
 * inconnu. Sans accents, à 50 ans, ça ressemble à une arnaque. Les accents
 * font basculer en UCS-2 (67 caractères par segment au lieu de 153) : le
 * message passe de 2 à 4 segments, soit ~31 € de plus par mois à 7 leads/jour.
 * Assumé — un seul rendez-vous supplémentaire le rembourse largement.
 *
 * 👉 Conséquence : la longueur compte double. 268 caractères = 4 segments,
 * 269 = 5. Vérifier avant de toucher au texte.
 *
 * Ce qui est là pour une raison précise :
 *   · « sur Facebook » raccroche le message à son geste — sans ça, « votre
 *     demande » ne veut rien dire pour quelqu'un qui a tapé un bouton et
 *     est passé à autre chose
 *   · « sans engagement » lève le frein principal
 *   · l'adresse exacte n'y est PAS : elle part dans la confirmation de
 *     réservation, elle coûterait un segment ici pour rien
 *   · une signature, parce qu'un SMS anonyme d'un numéro inconnu fait peur —
 *     mais pas « Mélanie & Thomas » : un envoi automatique ne se fait pas
 *     passer pour un mot personnel
 *
 * ⚠️ Et toujours : AUCUNE formule qui appelle une réponse. L'expéditeur Twilio
 * ne reçoit rien.
 */
function messageBienvenue(prenom: string): string {
  const vocatif = prenom ? ` ${prenom}` : "";
  return (
    `Bonjour${vocatif}, vous venez de demander votre bilan découverte sur ` +
    `Facebook, merci ! Offert et sans engagement : 45 min au Breakfast Club à ` +
    `Verdun, body scan et boisson compris. Votre créneau : ` +
    `labase-nutrition.com/reserver — L'équipe du Breakfast Club`
  );
}

/** Les noms de champs varient selon la façon dont Make mappe le formulaire. */
function pioche(o: Record<string, unknown>, cles: string[]): string {
  for (const c of cles) {
    const v = o[c];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Cette fonction est déployée --no-verify-jwt (Make ne sait pas fabriquer un
  // JWT Supabase). Le contrôle d'accès, c'est CE secret — et rien d'autre.
  const SECRET = Deno.env.get("MAKE_LEAD_SECRET") ?? "";
  if (!SECRET) return json({ error: "secret_non_configure" }, 500);
  if ((req.headers.get("x-cle-make") ?? "") !== SECRET) {
    return json({ error: "non_autorise" }, 401);
  }

  let brut: unknown;
  try {
    brut = await req.json();
  } catch {
    return json({ error: "json_invalide" }, 400);
  }
  // Make envoie un lead par appel, mais on accepte un tableau : si un jour on
  // regroupe, rien ne casse.
  const lots = Array.isArray(brut) ? brut : [brut];

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const SENDER = Deno.env.get("TWILIO_SENDER") ?? "";
  const twilioPret = Boolean(ACCOUNT_SID && AUTH_TOKEN && SENDER);

  const h = heureParis();
  const heureCivile = h >= 8 && h < 20;

  const resultats: Record<string, unknown>[] = [];

  for (const item of lots) {
    const o = (item ?? {}) as Record<string, unknown>;

    const telBrut = pioche(o, ["phone_number", "phone", "telephone", "tel", "numero"]);
    const email = pioche(o, ["email", "mail", "e_mail"]).toLowerCase();
    const complet = pioche(o, ["full_name", "name", "nom_complet"]);
    let prenom = pioche(o, ["first_name", "prenom"]);
    let nom = pioche(o, ["last_name", "nom"]);
    if (!prenom && complet) {
      const bouts = complet.split(/\s+/);
      prenom = bouts[0] ?? "";
      nom = bouts.slice(1).join(" ");
    }
    const cree = pioche(o, ["created_time", "created_at", "date"]);
    const idMeta = pioche(o, ["id", "lead_id", "leadgen_id"]);

    const tel = telNational(telBrut);
    if (!tel && !email) {
      resultats.push({ statut: "ignore", raison: "ni_tel_ni_email", idMeta });
      continue;
    }

    // Doublon : Meta renvoie la même personne sous son pseudo Facebook.
    // On compare sur les 9 derniers chiffres, comme partout dans le CRM.
    let dejaLa = false;
    if (tel) {
      const { data } = await sb
        .from("prospect_leads")
        .select("id, phone")
        .like("phone", `%${tel.slice(-9)}`)
        .limit(1);
      dejaLa = Boolean(data && data.length);
    }
    if (!dejaLa && email) {
      const { data } = await sb
        .from("prospect_leads")
        .select("id")
        .ilike("email", email)
        .limit(1);
      dejaLa = Boolean(data && data.length);
    }
    if (dejaLa) {
      resultats.push({ statut: "doublon", nom: `${prenom} ${nom}`.trim(), idMeta });
      continue;
    }

    // L'heure de soumission chez Meta, pas l'heure où Make est passé. C'est la
    // seule qui dit quelque chose du comportement des gens.
    const arrivee = cree && !Number.isNaN(Date.parse(cree))
      ? new Date(cree).toISOString()
      : new Date().toISOString();

    const notes =
      `Lead formulaire Meta, arrive automatiquement via Make.` +
      (idMeta ? ` Identifiant Meta : ${idMeta}.` : "") +
      (telBrut && tel && telBrut.replace(/\D/g, "") !== tel.replace(/\D/g, "")
        ? ` NUMERO NORMALISE : Meta rendait « ${telBrut} ».`
        : "") +
      (prenom && !prenomSur(prenom)
        ? ` PRENOM DOUTEUX (« ${prenom} ») : pseudo Facebook probable, SMS envoye sans vocatif.`
        : "");

    const { data: cree_, error: errIns } = await sb
      .from("prospect_leads")
      .insert({
        first_name: prenom || null,
        last_name: nom || null,
        phone: tel,
        email: email || null,
        source: "meta-ads",
        status: "new",
        created_at: arrivee,
        notes,
      })
      .select("id")
      .single();

    if (errIns || !cree_) {
      resultats.push({ statut: "erreur_insert", detail: errIns?.message, idMeta });
      continue;
    }

    // Pas de téléphone, ou hors de la fenêtre 8h-20h : la fiche existe, le SMS
    // attendra. En pratique Make ne tourne qu'entre 8h et 20h, donc ce garde-fou
    // ne sert que si quelqu'un déclenche le scénario à la main.
    if (!tel || !heureCivile || !twilioPret) {
      resultats.push({
        statut: "cree_sans_sms",
        raison: !tel ? "pas_de_tel" : !heureCivile ? "hors_fenetre_8h_20h" : "twilio_non_configure",
        id: cree_.id,
        nom: `${prenom} ${nom}`.trim(),
      });
      continue;
    }

    const msg = messageBienvenue(prenomSur(prenom));
    const auth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
    const envoi = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: e164(tel), From: SENDER, Body: msg }).toString(),
      },
    );
    const rep = await envoi.json().catch(() => ({}));

    if (envoi.ok) {
      // Best-effort : le SMS est parti, ce serait absurde d'échouer parce que
      // la date n'a pas pu s'écrire.
      await sb
        .from("prospect_leads")
        .update({
          contacted_at: new Date().toISOString(),
          status: "contacted",
          notes:
            notes +
            ` | SMS de premier contact envoye automatiquement. Expediteur Twilio a` +
            ` sens unique : la personne ne peut PAS repondre par SMS, elle reserve` +
            ` via labase-nutrition.com/reserver.`,
        })
        .eq("id", cree_.id);
    }

    resultats.push({
      statut: envoi.ok ? "cree_et_sms" : "cree_sms_echoue",
      id: cree_.id,
      nom: `${prenom} ${nom}`.trim(),
      tel,
      sid: (rep as Record<string, unknown>)?.sid ?? null,
      erreurTwilio: envoi.ok ? null : (rep as Record<string, unknown>)?.message ?? null,
    });
  }

  return json({ recus: lots.length, resultats });
});
