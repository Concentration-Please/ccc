import type { GovernmentAid } from '@/types/governmentAid'

export interface FilterOption {
  id: string
  label: string
}

export interface FilterGroup {
  id: string
  title: string
  options: FilterOption[]
}

/** Placeholder groups for filter UI — logic wiring comes later. */
export const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'classification',
    title: '補助類型',
    options: [
      { id: 'classification:現金資助', label: '現金資助' },
      { id: 'classification:津貼', label: '津貼' },
      { id: 'classification:服務', label: '服務' },
      { id: 'classification:優惠', label: '優惠' },
    ],
  },
  {
    id: 'demographic',
    title: '適用對象',
    options: [
      { id: 'demographic:長者', label: '長者' },
      { id: 'demographic:在職家庭', label: '在職家庭' },
      { id: 'demographic:學生', label: '學生' },
      { id: 'demographic:市民', label: '全港市民' },
      { id: 'demographic:住戶', label: '住戶' },
      { id: 'demographic:殘疾人士', label: '殘疾人士' },
    ],
  },
]

export interface AppliedFilterTag {
  id: string
  label: string
}

export interface FilterCriteria {
  searchQuery?: string
  selectedOptionIds?: string[]
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

/**
 * Apply filter criteria to aids (stub until filter columns / rules are defined).
 */
export function applyFilter(
  aids: GovernmentAid[],
  _criteria: FilterCriteria = {},
): GovernmentAid[] {
  return aids
}
