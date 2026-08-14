// =============================================================================
// _shared/googleCalendar.ts — pose un événement sur un agenda Google.
//
// POURQUOI UN COMPTE DE SERVICE ET PAS OAUTH
// labaseverdun@gmail.com est un compte Gmail PERSONNEL, pas un Google Workspace.
// Le chemin OAuth classique imposerait un écran de consentement, une
// vérification d'application Google, et un refresh token à renouveler — pour un
// seul agenda, c'est disproportionné et fragile.
// Un compte de SERVICE a sa propre adresse email. Il suffit de PARTAGER
// l'agenda avec lui (« Modifier les événements »), exactement comme on
// partagerait avec un collègue. Ensuite il écrit avec sa clé, sans consentement
// ni token qui expire.
//
// CE QU'IL FAUT EN SECRET SUPABASE
//   GOOGLE_SERVICE_ACCOUNT_JSON  le fichier JSON de la clé, collé tel quel
//   GOOGLE_CALENDAR_ID           l'adresse de l'agenda (ex. labaseverdun@gmail.com)
// Sans l'un des deux, tout est inactif et silencieux : jamais bloquant.
//
// SÉCURITÉ : ce JSON contient une CLÉ PRIVÉE. Il ne doit jamais être écrit dans
// le dépôt, ni dans un commit, ni dans un log. Il vit uniquement en secret.
// =============================================================================

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlText(text: string): string {
  return b64url(new TextEncoder().encode(text));
}

/** PEM (PKCS#8) → DER binaire, ce qu'attend Web Crypto. */
function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Lit le secret. Retourne null si absent ou illisible — jamais d'exception. */
function readServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    // Collé depuis un .env, le "\n" de la clé arrive parfois échappé.
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

/** Échange un JWT signé contre un jeton d'accès Google (valable 1 h). */
async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64urlText(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { access_token?: string };
  return json.access_token ?? null;
}

export interface CalendarEventInput {
  summary: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  /** Fuseau des heures affichées dans l'agenda. */
  timeZone?: string;
}

export interface CalendarResult {
  ok: boolean;
  /** id de l'événement créé — à garder pour pouvoir l'annuler plus tard. */
  eventId?: string;
  /** Pourquoi ça n'a pas marché. Sert au log, jamais renvoyé au public. */
  reason?: string;
}

/**
 * Crée l'événement. NE THROW JAMAIS : une panne d'agenda ne doit pas faire
 * échouer une réservation déjà enregistrée. Retourne simplement ok:false.
 */
export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarResult> {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
  const sa = readServiceAccount();
  if (!calendarId || !sa) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const token = await getAccessToken(sa);
    if (!token) return { ok: false, reason: "token_failed" };

    const tz = input.timeZone ?? "Europe/Paris";
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: { dateTime: input.start.toISOString(), timeZone: tz },
          end: { dateTime: input.end.toISOString(), timeZone: tz },
          // Pas d'invité : on pose l'événement SUR l'agenda de l'équipe, on
          // n'invite personne — surtout pas le prospect, qui a déjà son mail.
          reminders: { useDefault: true },
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: `http_${res.status}: ${detail.slice(0, 200)}` };
    }
    const json = await res.json() as { id?: string };
    return { ok: true, eventId: json.id };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}

/** Supprime un événement — pour quand un prospect annule son rendez-vous. */
export async function deleteCalendarEvent(eventId: string): Promise<CalendarResult> {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
  const sa = readServiceAccount();
  if (!calendarId || !sa || !eventId) return { ok: false, reason: "not_configured" };

  try {
    const token = await getAccessToken(sa);
    if (!token) return { ok: false, reason: "token_failed" };
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    // 410 = déjà supprimé côté Google : c'est le résultat voulu, pas un échec.
    if (res.ok || res.status === 410) return { ok: true, eventId };
    return { ok: false, reason: `http_${res.status}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
