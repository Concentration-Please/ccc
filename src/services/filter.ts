import { SUBSIDY_FILTER_GROUPS } from '@/data/subsidiesCatalog'
import type { FilterGroup, FilterOption } from '@/types/filter'

export type { FilterCriteria } from '@/services/filterQuery'
export {
  applyFilter,
  recordMatchesFilterGroups,
  recordMatchesFilterOption,
  recordMatchesSearch,
} from '@/services/filterQuery'

export type { FilterGroup, FilterOption }

export const FILTER_GROUPS: FilterGroup[] = SUBSIDY_FILTER_GROUPS

export interface AppliedFilterTag {
  id: string
  label: string
}

const optionLabelById = new Map(
  FILTER_GROUPS.flatMap((g) => g.options).map((o) => [o.id, o.label] as const),
)

export function tagsFromSelectedIds(ids: string[]): AppliedFilterTag[] {
  return ids
    .map((id) => {
      const label = optionLabelById.get(id)
      return label ? { id, label } : null
    })
    .filter((tag): tag is AppliedFilterTag => tag !== null)
}
