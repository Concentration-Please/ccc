import { recordMatchesFilterOption, type FilterableAid } from './filterQuery.js'

export interface Persona {
  id: string
  birthDate: string
  identity: string
  categoryIds: string[]
  tagIds: string[]
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

/** Full years from a YYYY-MM-DD birth date. Invalid dates return null. */
export function ageInYears(birthDate: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const birth = new Date(year, month - 1, day)
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return null
  }
  let age = today.getFullYear() - year
  const monthDelta = today.getMonth() - (month - 1)
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day)) age -= 1
  return age
}

function asFilterRecord(aid: MatchableAid): FilterableAid {
  return {
    category: aid.classification,
    label: [],
    is_organization: aid.isOrganization,
    registration_months: aid.registrationMonths,
    age_lower: aid.ageLower,
    age_upper: aid.ageUpper,
    isNative: aid.isNative,
    source_url: '',
    name: '',
    summary: '',
    subsidy_target: '',
    conditions: [],
    application_method_or_documents: [],
  }
}

function matchesPersona(aid: MatchableAid, persona: Persona, today: Date): boolean {
  if (persona.birthDate !== '') {
    const age = ageInYears(persona.birthDate, today)
    if (age == null || age < 0) return false
    if (aid.ageLower != null && age < aid.ageLower) return false
    if (aid.ageUpper != null && age > aid.ageUpper) return false
  }
  const record = asFilterRecord(aid)
  if (
    persona.categoryIds.length > 0 &&
    !persona.categoryIds.some((id) => recordMatchesFilterOption(record, id))
  ) {
    return false
  }
  if (persona.tagIds.length > 0 && !persona.tagIds.some((id) => recordMatchesFilterOption(record, id))) {
    return false
  }
  if (persona.identity !== '' && !recordMatchesFilterOption(record, persona.identity)) return false
  return true
}

/** An aid matches when any persona matches. An empty list matches nothing. */
export function matchesSubscription(aid: MatchableAid, personas: Persona[], today = new Date()): boolean {
  return personas.some((persona) => matchesPersona(aid, persona, today))
}

export type PersonaCriteria = Pick<Persona, 'birthDate' | 'identity' | 'categoryIds' | 'tagIds'>

function normalizeIdList(ids: string[]): string {
  return [...new Set(ids)].sort().join('\0')
}

export function personaCriteriaEqual(a: PersonaCriteria, b: PersonaCriteria): boolean {
  return (
    a.birthDate === b.birthDate &&
    a.identity === b.identity &&
    normalizeIdList(a.categoryIds) === normalizeIdList(b.categoryIds) &&
    normalizeIdList(a.tagIds) === normalizeIdList(b.tagIds)
  )
}

export function hasDuplicatePersona(personas: Persona[], candidate: PersonaCriteria): boolean {
  return personas.some((persona) => personaCriteriaEqual(persona, candidate))
}
