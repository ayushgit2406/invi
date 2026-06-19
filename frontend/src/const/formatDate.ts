import { APP_TIMEZONE } from './timezone'

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: APP_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function formatDateTime(
  value: string | number | Date | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return dateTimeFormatter
    .format(date)
    .replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase())
}
