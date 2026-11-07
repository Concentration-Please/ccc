import indigenousFile from '@data/indigenous.json'
import type { GovernmentAidDataset, GovernmentAidRecord } from '@/types/governmentAid'

export const indigenousDataset = indigenousFile as GovernmentAidDataset

export const indigenousRecords: GovernmentAidRecord[] = indigenousDataset.records
