import type { GovernmentAidRecord } from '@/types/governmentAid'

/** Placeholder filter criteria (expand when filter UI is implemented). */
export interface FilterCriteria {
  category?: string
  isOrganization?: boolean
}

/**
 * TODO: Open filter sheet / modal when filter UI is implemented.
 */
export function openFilter(): void {
  console.info('[filter] openFilter stub — filter UI not implemented yet')
}

/**
 * TODO: Apply real criteria from database / user selection.
 */
export function applyFilter(
  aids: GovernmentAidRecord[],
  _criteria: FilterCriteria = {},
): GovernmentAidRecord[] {
  return aids
}
