import type { GovernmentAid } from '@/types/governmentAid'

/** Placeholder filter criteria (expand when filter UI is implemented). */
export interface FilterCriteria {
  classification?: string
  demographic?: string
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
  aids: GovernmentAid[],
  _criteria: FilterCriteria = {},
): GovernmentAid[] {
  return aids
}
