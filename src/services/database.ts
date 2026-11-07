import subsidies from '../../data/subsidies.json'
import type { GovernmentAidDataset, GovernmentAidRecord } from '@/types/governmentAid'

const dataset = subsidies as GovernmentAidDataset

/**
 * TODO: Connect to Cloudflare D1 or backend API when available.
 */
export async function fetchAllGovernmentAids(): Promise<GovernmentAidRecord[]> {
  return dataset.records
}

export async function fetchGovernmentAidBySource(
  sourceUrl: string,
): Promise<GovernmentAidRecord | undefined> {
  const aids = await fetchAllGovernmentAids()
  return aids.find((aid) => aid.source_url === sourceUrl)
}
