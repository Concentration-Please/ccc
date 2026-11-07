export interface FilterOption {
  id: string
  label: string
}

export interface FilterGroup {
  id: string
  title: string
  options: FilterOption[]
}
