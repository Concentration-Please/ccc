/** Single aid row from the Taipei indigenous subsidy JSON feed. */
export interface GovernmentAidRecord {
  category: string
  is_organization: boolean
  registration_months: number | null
  source_url: string
  name: string
  summary: string
  subsidy_target: string
  conditions: string[]
}

/** Failed page recorded by the subsidy parser. */
export interface GovernmentAidError {
  url: string
  error: string
}

/** Top-level document loaded from data/subsidies.json. */
export interface GovernmentAidDataset {
  source: string
  generated_at: string
  updated_at: string
  complete: boolean
  records: GovernmentAidRecord[]
  errors?: GovernmentAidError[]
}
