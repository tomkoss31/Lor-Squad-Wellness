/**
 * Génère un lien Google Calendar pour ajouter un événement.
 * Ouvre Google Calendar dans un nouvel onglet avec les infos pré-remplies.
 */
export function createGoogleCalendarLink(params: {
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  location?: string
}): string {
  const { title, description, startDate, endDate, location } = params
  const formatDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = endDate ?? new Date(startDate.getTime() + 3600000) // +1h par défaut

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startDate)}/${formatDate(end)}`,
    ...(description && { details: description }),
    ...(location && { location }),
  })

  return `https://calendar.google.com/calendar/render?${query.toString()}`
}

/**
 * Génère un fichier .ics (iCalendar) en data URI — fonctionne sur
 * tous les agendas (Apple Calendar, Outlook, Google Calendar via
 * import). Pratique pour un lien téléchargeable côté client.
 */
export function createIcsDataUri(params: {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  uid?: string;
}): string {
  const { title, description, startDate, endDate, location, organizerName, organizerEmail, uid } = params;
  const end = endDate ?? new Date(startDate.getTime() + 45 * 60 * 1000); // +45 min par défaut (bilan/suivi)
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lor'Squad Wellness//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid ?? `ls-${now.getTime()}@lorsquad.com`}`,
    `DTSTAMP:${dt(now)}`,
    `DTSTART:${dt(startDate)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    ...(description ? [`DESCRIPTION:${escapeIcs(description)}`] : []),
    ...(location ? [`LOCATION:${escapeIcs(location)}`] : []),
    ...(organizerName && organizerEmail
      ? [`ORGANIZER;CN=${escapeIcs(organizerName)}:mailto:${organizerEmail}`]
      : []),
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
}

function escapeIcs(s: string): string {
  return s.replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

