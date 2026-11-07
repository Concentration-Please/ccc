export interface SubscriptionCriteria {
  age: number
  categories: string[]
  isNative: boolean
  isOrganization: boolean
  registrationMonths: number
}

export interface MatchableAid {
  classification: string
  isOrganization: boolean
  registrationMonths: number | null
  ageLower: number | null
  ageUpper: number | null
  isNative: boolean | null
}

export function toMatchableAid(record: {
  category: string
  is_organization: boolean
  registration_months: number | null
  age_lower?: number | null
  age_upper?: number | null
  isNative?: boolean | null
}): MatchableAid {
  return {
    classification: record.category,
    isOrganization: record.is_organization,
    registrationMonths: record.registration_months,
    ageLower: typeof record.age_lower === 'number' ? record.age_lower : null,
    ageUpper: typeof record.age_upper === 'number' ? record.age_upper : null,
    isNative: typeof record.isNative === 'boolean' ? record.isNative : null,
  }
}

export function matchesSubscription(aid: MatchableAid, criteria: SubscriptionCriteria): boolean {
  if (criteria.categories.length > 0 && !criteria.categories.includes(aid.classification)) {
    return false
  }
  if (aid.isOrganization !== criteria.isOrganization) return false
  if (aid.registrationMonths != null && criteria.registrationMonths < aid.registrationMonths) {
    return false
  }
  if (aid.ageLower != null && criteria.age < aid.ageLower) return false
  if (aid.ageUpper != null && criteria.age > aid.ageUpper) return false
  if (aid.isNative === true && !criteria.isNative) return false
  return true
}
