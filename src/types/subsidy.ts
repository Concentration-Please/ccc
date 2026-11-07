export interface SubsidyRecord {
  category: string
  is_organization: boolean
  registration_months: number | null
  source_url: string
  name: string
  summary: string
  subsidy_target: string
  conditions: string[]
}

export interface SubsidiesFile {
  source: string
  generated_at: string
  updated_at: string
  complete: boolean
  records: SubsidyRecord[]
}
