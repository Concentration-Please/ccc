import { mockGovernmentAids } from '@/data/mockGovernmentAids'
import type { GovernmentAidRecord } from '@/types/governmentAid'

/** Simulated latency for async fetch (replace with Workers + D1 / HTTP API). */
const MOCK_FETCH_MS = 200

/**
 * TODO: Connect to Cloudflare D1 or backend API when available.
 */
export async function fetchAllGovernmentAids(): Promise<GovernmentAidRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_FETCH_MS))
  return [...mockGovernmentAids]
}

export async function fetchGovernmentAidBySource(
  sourceUrl: string,
): Promise<GovernmentAidRecord | undefined> {
  const aids = await fetchAllGovernmentAids()
  return aids.find((aid) => aid.source_url === sourceUrl)
}
