import type { SubscriptionCriteria } from '@/services/matchSubscription'

const PREFS_KEY = 'ccc.subscription'
const NOTIFIED_KEY = 'ccc.notified'

export function loadSubscription(): SubscriptionCriteria | null {
  const raw = localStorage.getItem(PREFS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SubscriptionCriteria
    if (typeof parsed.age !== 'number' || typeof parsed.registrationMonths !== 'number') return null
    if (!Array.isArray(parsed.categories)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSubscription(criteria: SubscriptionCriteria): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(criteria))
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
