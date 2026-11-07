import { governmentAidRecords } from '@/data/governmentAids'
import { applyFilter, type FilterCriteria } from '@/services/filter'
import type { AidDataset, GovernmentAidItem, GovernmentAidRecord } from '@/types/governmentAid'

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

export async function fetchGovernmentAidBySource(
  sourceUrl: string,
  name?: string,
): Promise<GovernmentAidRecord | undefined> {
  const aids = await fetchAllGovernmentAids()
  if (name) {
    return aids.find((aid) => aid.source_url === sourceUrl && aid.name === name)
  }
  return aids.find((aid) => aid.source_url === sourceUrl)
}
