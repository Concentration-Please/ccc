import youthFile from '@data/youth.json'
import { indigenousRecords } from '@/data/indigenousDataset'
import type { GovernmentAidItem, GovernmentAidRecord } from '@/types/governmentAid'

export const youthRecords = (youthFile as { records: GovernmentAidRecord[] }).records

/** Aid plans the webview searches: indigenous and youth sources together. */
export const governmentAidRecords: GovernmentAidItem[] = [
  ...indigenousRecords.map((record) => ({ ...record, dataset: 'indigenous' as const })),
  ...youthRecords.map((record) => ({ ...record, dataset: 'youth' as const })),
]
