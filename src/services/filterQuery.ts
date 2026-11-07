import type { GovernmentAidRecord } from '@/types/governmentAid'

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

/** Whether a single aid matches one filter option id (`field:value`). */
export function recordMatchesFilterOption(
  aid: GovernmentAidRecord,
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
    default:
      return false
  }
}

/**
 * Options sharing the same field prefix (filter header) use OR; distinct fields combine with AND.
 */
export function recordMatchesFilterGroups(
  aid: GovernmentAidRecord,
  selectedOptionIds: string[] | undefined,
): boolean {
  if (!selectedOptionIds?.length) return true

  const byGroup = groupSelectedOptionIds(selectedOptionIds)
  for (const optionIds of byGroup.values()) {
    const matchesGroup = optionIds.some((optionId) => recordMatchesFilterOption(aid, optionId))
    if (!matchesGroup) return false
  }
  return true
}

function searchableText(aid: GovernmentAidRecord): string {
  return [aid.name, aid.summary, aid.subsidy_target, aid.category, ...aid.conditions, ...aid.application_method_or_documents]
    .join('\n')
    .toLowerCase()
}

/** Case-insensitive match; whitespace-separated terms must all appear (AND). */
export function recordMatchesSearch(
  aid: GovernmentAidRecord,
  searchQuery: string | undefined,
): boolean {
  const trimmed = searchQuery?.trim()
  if (!trimmed) return true

  const haystack = searchableText(aid)
  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  return terms.every((term) => haystack.includes(term))
}

export function applyFilter(
  aids: GovernmentAidRecord[],
  criteria: FilterCriteria = {},
): GovernmentAidRecord[] {
  return aids.filter(
    (aid) =>
      recordMatchesSearch(aid, criteria.searchQuery) &&
      recordMatchesFilterGroups(aid, criteria.selectedOptionIds),
  )
}
