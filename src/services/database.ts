import { indigenousRecords } from '@/data/indigenousDataset'
import { applyFilter, type FilterCriteria } from '@/services/filter'
import type { GovernmentAidRecord } from '@/types/governmentAid'

/**
 * TODO: Connect to Cloudflare D1 or backend API when available.
 */
export async function fetchAllGovernmentAids(): Promise<GovernmentAidRecord[]> {
  return indigenousRecords
}

/** Filter and search over loaded indigenous records. */
export function queryGovernmentAids(criteria: FilterCriteria = {}): GovernmentAidRecord[] {
  return applyFilter(indigenousRecords, criteria)
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
