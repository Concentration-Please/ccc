import type { GovernmentAidRecord } from '@/types/governmentAid'

export type FilterableAid = Omit<GovernmentAidRecord, 'id'>

export interface FilterCriteria {
  searchQuery?: string
  selectedOptionIds?: string[]
}

function groupSelectedOptionIds(ids: string[]): Map<string, string[]> {
  const byGroup = new Map<string, string[]>()
  for (const optionId of ids) {
    const colon = optionId.indexOf(':')
    if (colon === -1) continue
    const field = optionId.slice(0, colon)
    const groupOptions = byGroup.get(field) ?? []
    groupOptions.push(optionId)
    byGroup.set(field, groupOptions)
  }
  return byGroup
}

function parseRegistrationMonthsOptionValue(raw: string): number | null {
  if (raw === 'null') return null
  const months = Number(raw)
  return Number.isFinite(months) ? months : null
}

/** Selected 身份別 labels combine with AND. Every other field combines with OR. */
const AND_FIELDS = new Set(['label'])

function matchesAge(aid: FilterableAid, raw: string): boolean {
  const age = Number(raw)
  if (!Number.isInteger(age)) return false
  const lower = typeof aid.age_lower === 'number' ? aid.age_lower : null
  const upper = typeof aid.age_upper === 'number' ? aid.age_upper : null
  if (lower !== null && age < lower) return false
  if (upper !== null && age > upper) return false
  return true
}

/** Whether a single aid matches one filter option id (`field:value`). */
export function recordMatchesFilterOption(
  aid: FilterableAid,
  optionId: string,
): boolean {
  const colon = optionId.indexOf(':')
  if (colon === -1) return false
  const field = optionId.slice(0, colon)
  const value = optionId.slice(colon + 1)

  switch (field) {
    case 'category':
      return aid.category === value
    case 'is_organization':
      return aid.is_organization === (value === 'true')
    case 'registration_months': {
      const months = parseRegistrationMonthsOptionValue(value)
      return aid.registration_months === months
    }
    case 'age':
      return matchesAge(aid, value)
    case 'label':
      return aid.label.includes(value)
    default:
      return false
  }
}

/**
 * Options sharing the same field prefix (filter header) use OR, except 身份別 (`label`),
 * which uses AND. Distinct fields combine with AND.
 */
export function recordMatchesFilterGroups(
  aid: FilterableAid,
  selectedOptionIds: string[] | undefined,
): boolean {
  if (!selectedOptionIds?.length) return true

  const byGroup = groupSelectedOptionIds(selectedOptionIds)
  for (const [field, optionIds] of byGroup) {
    const matchesGroup = AND_FIELDS.has(field)
      ? optionIds.every((optionId) => recordMatchesFilterOption(aid, optionId))
      : optionIds.some((optionId) => recordMatchesFilterOption(aid, optionId))
    if (!matchesGroup) return false
  }
  return true
}

function searchableText(aid: FilterableAid): string {
  return [aid.name, aid.summary, aid.subsidy_target, aid.category, ...aid.conditions, ...aid.application_method_or_documents]
    .join('\n')
    .toLowerCase()
}

/** Case-insensitive match; whitespace-separated terms must all appear (AND). */
export function recordMatchesSearch(
  aid: FilterableAid,
  searchQuery: string | undefined,
): boolean {
  const trimmed = searchQuery?.trim()
  if (!trimmed) return true

  const haystack = searchableText(aid)
  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  return terms.every((term) => haystack.includes(term))
}

export function applyFilter<T extends FilterableAid>(
  aids: T[],
  criteria: FilterCriteria = {},
): T[] {
  return aids.filter(
    (aid) =>
      recordMatchesSearch(aid, criteria.searchQuery) &&
      recordMatchesFilterGroups(aid, criteria.selectedOptionIds),
  )
}
