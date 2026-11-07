import {
  emptyAnnouncementBatch,
  isAnnouncementRecord,
  type AnnouncementBatch,
} from '@/services/announcementDiff'

const SEEN_KEY = 'ccc.marqueeBatches'

export async function fetchAnnouncementBatch(): Promise<AnnouncementBatch> {
  try {
    const response = await fetch('/api/announcements')
    if (!response.ok) return emptyAnnouncementBatch
    const parsed = (await response.json()) as Partial<AnnouncementBatch>
    return {
      batchId: typeof parsed.batchId === 'string' ? parsed.batchId : null,
      items: Array.isArray(parsed.items) ? parsed.items.filter(isAnnouncementRecord) : [],
    }
  } catch {
    return emptyAnnouncementBatch
  }
}

function loadSeenBatches(): string[] {
  const raw = sessionStorage.getItem(SEEN_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function hasSeenBatch(batchId: string): boolean {
  return loadSeenBatches().includes(batchId)
}

export function markBatchSeen(batchId: string): void {
  const seen = new Set([...loadSeenBatches(), batchId])
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
}
