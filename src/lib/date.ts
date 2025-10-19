const CAMBODIA_TIME_ZONE = 'Asia/Phnom_Penh'

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMBODIA_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const normalizeToDate = (value?: string | null) => {
  if (!value) return null

  const hasTimeZone = /[zZ]|([+-]\d{2}:?\d{2})$/.test(value)
  const isoValue = hasTimeZone || !value.includes('T') ? value : `${value}Z`
  const date = new Date(isoValue)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

export const formatCambodiaDateTime = (input?: string | null) => {
  const date = normalizeToDate(input)
  if (!date) return input || 'Unknown'
  return dateTimeFormatter.format(date)
}
