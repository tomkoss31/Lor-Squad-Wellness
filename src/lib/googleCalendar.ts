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
