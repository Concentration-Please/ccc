import type { Persona } from '@/services/matchSubscription'

const PREFS_KEY = 'ccc.subscription'
const NOTIFIED_KEY = 'ccc.notified'

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isPersona(value: unknown): value is Persona {
  if (!value || typeof value !== 'object') return false
  const persona = value as Partial<Persona>
  return (
    typeof persona.id === 'string' &&
    typeof persona.birthDate === 'string' &&
    typeof persona.identity === 'string' &&
    isStringList(persona.categoryIds) &&
    isStringList(persona.tagIds)
  )
}

/** Older single-criteria objects have no birth date and are treated as no personas. */
export function loadSubscription(): Persona[] {
  const raw = localStorage.getItem(PREFS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isPersona) : []
  } catch {
    return []
  }
}

export function saveSubscription(personas: Persona[]): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(personas))
}

export function loadNotifiedIds(): string[] {
  const raw = localStorage.getItem(NOTIFIED_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function markNotified(ids: string[]): void {
  const merged = new Set([...loadNotifiedIds(), ...ids])
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...merged]))
}

export interface NotificationItem {
  url: string
  title: string
}

/** Keeps the first item for each source URL and each title in one notification pass. */
export function uniqueNotifications<T extends NotificationItem>(items: T[]): T[] {
  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()
  const unique: T[] = []
  for (const item of items) {
    if (seenUrls.has(item.url) || seenTitles.has(item.title)) continue
    seenUrls.add(item.url)
    seenTitles.add(item.title)
    unique.push(item)
  }
  return unique
}
