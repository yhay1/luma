const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && USER_ID.test(value)
}

export function boundedText(value: unknown, max: number) {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  return clean.length > 0 && clean.length <= max ? clean : null
}

export function isSafeImagePath(value: unknown, userId: string) {
  return typeof value === 'string' && value.startsWith(`${userId}/`) && value.length <= 300 && !value.includes('..')
}
