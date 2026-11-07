/** Single aid row from either subsidy JSON feed. */
export interface GovernmentAidRecord {
  id: number
  category: string
  label: string[]
  is_organization: boolean
  registration_months: number | null
  source_url: string
  name: string
  summary: string
  subsidy_target: string
  conditions: string[]
  application_method_or_documents: string[]
  age_lower?: number | null
  age_upper?: number | null
  isNative?: boolean | null
  /** Optional attachment or related pages in addition to source_url. */
  ref_urls?: string[]
}

export type AidDataset = 'indigenous' | 'youth'

export type GovernmentAidItem = GovernmentAidRecord & { dataset: AidDataset }

/** Failed page recorded by the subsidy parser. */
export interface GovernmentAidError {
  url: string
  error: string
}

/** Top-level document loaded from data/indigenous.json. */
export interface GovernmentAidDataset {
  source: string
  generated_at: string
  updated_at: string
  complete: boolean
  records: GovernmentAidRecord[]
  errors?: GovernmentAidError[]
}

/** One row from data/indigenous.json. */
export interface SubsidyAid {
  id: string
  title: string
  classification: string
  summary: string
  isOrganization: boolean
  registrationMonths: number | null
  ageLower: number | null
  ageUpper: number | null
  isNative: boolean | null
}
