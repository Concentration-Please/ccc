import { governmentAidRecords } from '@/data/governmentAids'
import { applyFilter, type FilterCriteria } from '@/services/filter'
import type { AidDataset, GovernmentAidItem } from '@/types/governmentAid'

/**
 * TODO: Connect to Cloudflare D1 or backend API when available.
 */
export async function fetchAllGovernmentAids(): Promise<GovernmentAidItem[]> {
  return governmentAidRecords
}

/** Filter and search over indigenous and youth aid plans. */
export function queryGovernmentAids(criteria: FilterCriteria = {}): GovernmentAidItem[] {
  return applyFilter(governmentAidRecords, criteria)
}

export async function fetchGovernmentAidById(
  dataset: AidDataset,
  id: number,
): Promise<GovernmentAidItem | undefined> {
  const aids = await fetchAllGovernmentAids()
  return aids.find((aid) => aid.dataset === dataset && aid.id === id)
}
