import type { FilterOption } from '../types/filter'

/** category.json order, then any category used by records but absent from that list. */
export function subsidyCategories(defined: readonly string[], used: readonly string[]): string[] {
  const known = new Set(defined)
  const missing = [
    ...new Set(used.filter((category) => category.trim() !== '' && !known.has(category))),
  ]
  missing.sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  return [...defined, ...missing]
}

/** One 身份別 chip per label-key → display-name entry. */
export function identityFilterOptions(labels: object): FilterOption[] {
  return Object.entries(labels).flatMap(([key, value]) => {
    if (key === '' || typeof value !== 'string' || value.trim() === '') return []
    return [{ id: `label:${key}`, label: value }]
  })
}

/** Filter id for the 身份別 whose mapped name is `displayName`. */
export function identityFilterId(labels: object, displayName: string): string | null {
  const match = Object.entries(labels).find(([, value]) => value === displayName)
  return match ? `label:${match[0]}` : null
}
