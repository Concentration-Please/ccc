import type { GovernmentAidRecord } from '@/types/governmentAid'

/** Stable key when multiple subsidies share the same official page URL. */
export function aidRecordKey(aid: GovernmentAidRecord): string {
  return `${aid.source_url}::${aid.name}`
}

export function organizationLabel(isOrganization: boolean): string {
  return isOrganization ? '團體' : '個人'
}

export function registrationLabel(months: number | null): string {
  if (months === null) return '無設籍月數要求'
  return `設籍滿 ${months} 個月`
}
