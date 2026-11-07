export interface AnnouncementRecord {
  id: string
  title: string
  summary: string
  classification: string
  isOrganization: boolean
  registrationMonths: number | null
  ageLower: number | null
  ageUpper: number | null
  isNative: boolean | null
  conditions: string[]
}

export interface AnnouncementBatch {
  batchId: string | null
  items: AnnouncementRecord[]
}

export const emptyAnnouncementBatch: AnnouncementBatch = { batchId: null, items: [] }

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

export function isAnnouncementRecord(value: unknown): value is AnnouncementRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<AnnouncementRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.summary === 'string' &&
    typeof record.classification === 'string' &&
    typeof record.isOrganization === 'boolean' &&
    isNullableNumber(record.registrationMonths) &&
    isNullableNumber(record.ageLower) &&
    isNullableNumber(record.ageUpper) &&
    (record.isNative === null || typeof record.isNative === 'boolean') &&
    Array.isArray(record.conditions) &&
    record.conditions.every((condition) => typeof condition === 'string')
  )
}

/** Records whose source_url was absent from the previous snapshot. A missing snapshot announces nothing. */
export function diffAnnouncements(
  previous: AnnouncementRecord[] | null,
  current: AnnouncementRecord[],
): AnnouncementRecord[] {
  if (previous == null) return []
  const knownIds = new Set(previous.map((record) => record.id))
  return current.filter((record) => !knownIds.has(record.id))
}
